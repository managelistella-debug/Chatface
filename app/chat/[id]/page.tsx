import { supabaseAdmin } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { SharedChat } from './SharedChat';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: agent } = await supabaseAdmin
    .from('agents')
    .select('name, widget_config')
    .eq('id', id)
    .single();

  const displayName = agent?.widget_config?.display_name || agent?.name || 'Chat';
  return {
    title: displayName,
    description: `Chat with ${displayName}`,
  };
}

export default async function SharedChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { data: agent } = await supabaseAdmin
    .from('agents')
    .select('id, name, widget_config')
    .eq('id', id)
    .single();

  if (!agent) notFound();

  return <SharedChat agentId={id} agent={agent} />;
}
