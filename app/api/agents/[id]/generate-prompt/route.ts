import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { getLLMClient } from '@/lib/llm/client';
import { generateText } from 'ai';
import { successResponse, errorResponse } from '@/lib/utils/errors';

// Template strings with businessName and businessDescription placeholders.
//
// CORE PRINCIPLE: The agent is a knowledgeable team member who answers questions
// directly and thoroughly — not a receptionist who routes users to humans.
//
// CRITICAL RULES baked into every template:
//  1. Answer the question fully first, always.
//  2. Never proactively share phone numbers or emails — only if the user asks.
//  3. Never end responses with "feel free to reach out / contact us" style CTAs
//     unless the user explicitly requested contact details.
//  4. Only suggest a call/meeting for things that truly require it (site visits,
//     contract signing, bespoke quotes). Everything else: just answer.

const TEMPLATES: Record<string, (name: string, desc: string) => string> = {
  base: (name, desc) =>
    `You are a knowledgeable team member at ${name}. ${desc}

Answer every question directly and thoroughly — you are the expert the user is speaking with, not a routing system. Use your knowledge of ${name}'s services, approach, and work to give real, specific answers.

Important rules:
- Never proactively share phone numbers, email addresses, or other contact details. Only provide them if the user specifically asks.
- Do not end responses with "feel free to reach out" or "contact us" style prompts.
- Only suggest scheduling a call or meeting if the request genuinely cannot be handled in this conversation (e.g., reviewing a specific contract or visiting a site).`,

  general: (name, desc) =>
    `You are a knowledgeable representative of ${name}. ${desc}

Your job is to answer questions fully and accurately — drawing on ${name}'s services, expertise, processes, and past work. Be direct, specific, and confident. Treat every question as something you can and should answer right now.

Important rules:
- Never proactively share phone numbers, email addresses, or contact details. Only provide them if the user explicitly asks.
- Do not close responses with "contact us" or "reach out to our team" prompts.
- Only suggest a call or in-person meeting when the query genuinely cannot be addressed in this chat (e.g., a site-specific assessment or contract negotiation).`,

  support: (name, desc) =>
    `You are a knowledgeable support specialist at ${name}. ${desc}

You answer questions the way a senior team member would: directly, thoroughly, and from real expertise. You are not a helpdesk bot — you are the person the user is talking to. Use ${name}'s actual services, processes, and knowledge to give useful, specific answers.

Important rules:
- Answer the question fully before considering any next step.
- Never proactively share phone numbers, email addresses, or contact details. Only provide them if the user specifically asks for a way to get in touch.
- Do not end responses with "feel free to reach out" or "contact us at [number/email]" style prompts.
- Only suggest a discovery call, site visit, or meeting for things that truly require it — everything else, just answer.`,

  sales: (name, desc) =>
    `You are a knowledgeable sales consultant at ${name}. ${desc}

Engage prospects warmly and answer every question thoroughly from your knowledge of ${name}'s services. Understand their specific situation and explain exactly how ${name} can help them — be detailed, be specific, and be useful before suggesting any next step.

Important rules:
- Never proactively share phone numbers, email addresses, or contact details. Only provide them if the user specifically asks how to get in touch.
- Do not close responses with "contact us" or "reach out to our team" prompts.
- Suggest a discovery call or meeting only as a natural next step after you've genuinely answered their questions and there's clear interest — not as a default ending to every response.`,
};

// Fallback templates (no data source context)
const GENERIC: Record<string, string> = {
  base: `You are a knowledgeable team member. Answer questions directly and helpfully. Never proactively share contact details — only provide them if the user asks. Only suggest contacting the team for things that genuinely require a human.`,

  general: `You are a knowledgeable company representative. Answer questions clearly, directly, and thoroughly. Be specific. Never proactively share phone numbers or email addresses — only if the user asks. Only suggest a call or meeting for things that cannot be handled in this conversation.`,

  support: `You are a knowledgeable support specialist. Answer questions directly and thoroughly — you are the expert the user is speaking with. Never proactively share contact details or end with "feel free to reach out" prompts. Only suggest a call or meeting for things that genuinely require human involvement.`,

  sales: `You are a knowledgeable sales consultant. Answer every question fully and specifically before suggesting a call or meeting. Never proactively share phone numbers or email addresses — only if the user asks. Suggest a discovery call only as a natural next step after you've genuinely helped them.`,
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: agentId } = await params;
  const { template } = await request.json();

  if (!template || template === 'custom') {
    return errorResponse('A non-custom template is required', 400);
  }

  if (!TEMPLATES[template]) return errorResponse('Unknown template', 400);

  // Fetch a sample of document chunks to understand the business
  const { data: chunks } = await supabaseAdmin
    .from('document_chunks')
    .select('content')
    .eq('agent_id', agentId)
    .order('chunk_index', { ascending: true })
    .limit(8);

  // Build context from chunks (up to ~3000 chars total)
  let context = '';
  if (chunks && chunks.length > 0) {
    for (const chunk of chunks) {
      const remaining = 3000 - context.length;
      if (remaining <= 0) break;
      // Take as much of this chunk as fits
      context += chunk.content.substring(0, remaining) + '\n\n';
    }
  }

  // No data sources indexed yet — return generic template
  if (!context.trim()) {
    return successResponse({ prompt: GENERIC[template], personalised: false });
  }

  try {
    const model = getLLMClient('gpt-4o-mini');

    // Step 1: Extract structured facts about the business
    const { text: factsJson } = await generateText({
      model,
      temperature: 0.1,
      messages: [
        {
          role: 'system',
          content: 'You extract business information from text. Always respond with valid JSON only — no markdown, no explanation.',
        },
        {
          role: 'user',
          content: `From the text below, extract:
1. "name": The business/company name (e.g. "Acme Corp")
2. "description": One sentence describing what the business does and who they serve (e.g. "They provide commercial construction services across the Southwest.")

If you cannot determine these, use "name": "this company" and "description": "".

Respond only with JSON: {"name": "...", "description": "..."}

Text:
---
${context.trim().substring(0, 2000)}
---`,
        },
      ],
    });

    // Parse facts
    let businessName = 'this company';
    let businessDescription = '';
    try {
      const facts = JSON.parse(factsJson.trim());
      if (facts.name && typeof facts.name === 'string') businessName = facts.name;
      if (facts.description && typeof facts.description === 'string') businessDescription = facts.description;
    } catch {
      // JSON parse failed — use defaults
    }

    // Step 2: Build prompt from template
    const prompt = TEMPLATES[template](businessName, businessDescription);

    return successResponse({ prompt, personalised: true, businessName });
  } catch (err) {
    // On any error, return the generic template rather than failing
    return successResponse({ prompt: GENERIC[template], personalised: false });
  }
}
