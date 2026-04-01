// ============================================================================
// Agent
// ============================================================================

export type OnboardingSteps = Record<
  | 'add_data_source'
  | 'customize_instructions'
  | 'test_playground'
  | 'configure_widget'
  | 'deploy_widget',
  boolean
>;

export interface AgentGuardrails {
  /** 'strict' = data sources only | 'moderate' = prefer data, can supplement | 'off' = full general knowledge */
  confidentiality: 'strict' | 'moderate' | 'off';
  /** Message to send when the agent cannot find an answer */
  fallback_message: string;
  /** When true, agent refuses questions unrelated to the business */
  restrict_topics: boolean;
  /** Message to send for off-topic questions (used when restrict_topics is true) */
  off_topic_message: string;
}

export interface Agent {
  id: string;
  name: string;
  system_prompt: string;
  model: 'gpt-4o-mini' | 'gpt-4o' | 'claude-sonnet' | 'claude-haiku';
  temperature: number;
  widget_config: WidgetConfig;
  guardrails?: AgentGuardrails;
  lead_capture?: LeadCaptureConfig;
  profile_picture_url?: string;
  chat_icon_url?: string;
  last_trained_at?: string;
  total_data_size: number;
  onboarding_steps: OnboardingSteps;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Widget Config
// ============================================================================

export interface WidgetConfig {
  // Content tab
  display_name?: string;
  initial_message?: string;
  suggested_messages?: string[];
  keep_suggestions_after_first?: boolean;
  message_placeholder?: string;
  collect_user_feedback?: boolean;
  copy_messages?: boolean;
  dismissible_notice?: string;
  footer_text?: string;
  auto_show_delay?: number; // seconds, 0 = disabled
  voice_to_text?: boolean;

  // Proactive message — floating speech bubble shown above the chat button
  proactive_message?: string;
  proactive_message_delay?: number; // seconds before appearing, default 3

  // Branding
  hide_branding?: boolean;

  // Style tab
  theme?: 'light' | 'dark';
  primary_color?: string;
  use_primary_for_header?: boolean;
  bubble_color?: string;
  bubble_alignment?: 'left' | 'right';
  profile_picture_url?: string;
  chat_icon_url?: string;

  // AI tab
  sync_base_instructions?: boolean;
  widget_instructions?: string;
  instruction_template?: string;

  // Embed tab
  allowed_domains?: string[];
  embed_type?: 'widget' | 'iframe';
}

// ============================================================================
// Lead Capture
// ============================================================================

export interface LeadCaptureConfig {
  enabled: boolean;
  /** 'start' = show before first message | 'after_messages' = show after N user messages */
  timing: 'start' | 'after_messages';
  /** How many user messages before showing the form (only used when timing = 'after_messages') */
  after_messages_count: number;
  /** true = visitor can skip the form | false = must fill in to continue */
  allow_bypass: boolean;
  fields: {
    name: boolean;
    email: boolean;
    phone: boolean;
  };
}

// ============================================================================
// Data Sources
// ============================================================================

export interface DataSource {
  id: string;
  agent_id: string;
  type: 'text' | 'url' | 'pdf' | 'docx' | 'txt';
  name: string;
  status: 'pending' | 'processing' | 'embedding' | 'completed' | 'failed';
  crawl_queue?: string[];
  crawled_urls?: string[];
  crawl_chars?: number;
  char_limit?: number;
  pages_crawled?: number;
  file_path?: string;
  url?: string;
  total_chunks: number;
  total_tokens: number;
  error_message?: string;
  auto_sync?: boolean;
  sync_interval_hours?: number;
  last_synced_at?: string;
  next_sync_at?: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentChunk {
  id: string;
  agent_id: string;
  data_source_id: string;
  chunk_index: number;
  content: string;
  token_count: number;
  embedding: number[];
  metadata: Record<string, unknown>;
  created_at: string;
}

// ============================================================================
// Q&A Pairs
// ============================================================================

export interface QAPair {
  id: string;
  agent_id: string;
  question: string;
  answer: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// AI Actions
// ============================================================================

export interface LeadCollectionConfig {
  fields: { name: string; type: string; required: boolean }[];
  webhook_url?: string;
}

export interface WebSearchConfig {
  max_results: number;
}

export interface CustomFormConfig {
  fields: { name: string; type: string; label: string; required: boolean }[];
  submit_label: string;
}

export type AIActionType = 'lead_collection' | 'web_search' | 'custom_form';

export type AIActionConfig =
  | LeadCollectionConfig
  | WebSearchConfig
  | CustomFormConfig;

export interface AIAction {
  id: string;
  agent_id: string;
  type: AIActionType;
  name: string;
  description: string;
  is_enabled: boolean;
  config: AIActionConfig;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Leads
// ============================================================================

export interface Lead {
  id: string;
  agent_id: string;
  conversation_id: string;
  name?: string;
  email?: string;
  phone?: string;
  custom_fields: Record<string, unknown>;
  created_at: string;
}

// ============================================================================
// Conversations & Messages
// ============================================================================

export interface Conversation {
  id: string;
  agent_id: string;
  title: string;
  is_human_takeover: boolean;
  human_takeover_at?: string;
  metadata: Record<string, unknown>;
  sentiment?: string;
  confidence_score?: number;
  user_identifier?: string;
  created_at: string;
  updated_at: string;
}

export interface MessageAttachment {
  type: 'image' | 'document';
  name: string;
  mime_type: string;
  content: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  sources: ChunkSource[];
  feedback: 'thumbs_up' | 'thumbs_down' | null;
  feedback_text?: string;
  attachments?: MessageAttachment[];
  is_corrected?: boolean;
  created_at: string;
}

// ============================================================================
// Contacts
// ============================================================================

export interface Contact {
  id: string;
  agent_id: string;
  user_identifier: string;
  name?: string;
  email?: string;
  metadata: Record<string, unknown>;
  first_seen_at: string;
  last_seen_at: string;
  conversation_count: number;
  message_count: number;
}

export interface ChunkSource {
  chunk_id: string;
  data_source_name: string;
  content_preview: string;
  similarity: number;
}

// ============================================================================
// Analytics
// ============================================================================

export interface AnalyticsEvent {
  id: string;
  agent_id: string;
  event_type: string;
  event_data: Record<string, unknown>;
  created_at: string;
}

// ============================================================================
// Help Pages
// ============================================================================

export interface HelpPageConfig {
  welcome_title: string;
  welcome_description: string;
  background_color: string;
  text_color: string;
}

export interface HelpPage {
  id: string;
  agent_id: string;
  slug: string;
  is_published: boolean;
  config: HelpPageConfig;
  created_at: string;
  updated_at: string;
}
