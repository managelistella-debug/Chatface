import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse } from '@/lib/utils/errors';
import { getUserFromRequest } from '@/lib/supabase/get-user';
import { CreateAgentRequest } from '@/lib/types/api';

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) return errorResponse('Unauthorized', 401);

  const { data, error } = await supabaseAdmin
    .from('agents')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) return errorResponse(error.message);
  return successResponse(data);
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) return errorResponse('Unauthorized', 401);

  const body: CreateAgentRequest = await request.json();

  if (!body.name?.trim()) {
    return errorResponse('Name is required', 400);
  }

  const { data, error } = await supabaseAdmin
    .from('agents')
    .insert({
      name: body.name.trim(),
      system_prompt: body.system_prompt || 'You are a helpful assistant.',
      model: body.model || 'gpt-4o-mini',
      temperature: body.temperature ?? 0.7,
      widget_config: body.widget_config || {},
      user_id: user.id,
      guardrails: {
        confidentiality: 'moderate',
        restrict_topics: true,
        fallback_message: "I don't have specific details on that in my knowledge base right now. For the most accurate answer, it's best to speak directly with our team — feel free to reach out and we'll get you sorted.",
        off_topic_message: "That's a bit outside what I can help with here — I'm focused on questions about our company and services. Is there something along those lines I can help you with?",
      },
    })
    .select()
    .single();

  if (error) return errorResponse(error.message);
  return successResponse(data, 201);
}
