import { supabaseAdmin } from '@/lib/supabase/server';
import { HelpPageChat } from '@/components/help/HelpPageChat';
import { notFound } from 'next/navigation';

export default async function HelpPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const { data: helpPage } = await supabaseAdmin
    .from('help_pages')
    .select('*')
    .eq('slug', slug)
    .eq('is_published', true)
    .single();

  if (!helpPage) notFound();

  const { data: agent } = await supabaseAdmin
    .from('agents')
    .select('id, name, widget_config, system_prompt')
    .eq('id', helpPage.agent_id)
    .single();

  if (!agent) notFound();

  const config = helpPage.config || {};
  const widgetConfig = agent.widget_config || {};

  return (
    <HelpPageChat
      agentId={agent.id}
      agentName={agent.name}
      primaryColor={widgetConfig.primary_color || '#6366f1'}
      profilePicture={widgetConfig.profile_picture_url}
      welcomeTitle={config.welcome_title || 'How can we help?'}
      welcomeDescription={config.welcome_description || ''}
      backgroundColor={config.background_color || '#ffffff'}
      textColor={config.text_color || '#1a1a1a'}
    />
  );
}
