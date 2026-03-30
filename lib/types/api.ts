import {
  Agent,
  DataSource,
  Conversation,
  Message,
  WidgetConfig,
  QAPair,
  AIAction,
  AIActionType,
  AIActionConfig,
  Lead,
  AnalyticsEvent,
  HelpPage,
  HelpPageConfig,
} from './database';

// ============================================================================
// Agent API
// ============================================================================

export interface CreateAgentRequest {
  name: string;
  system_prompt?: string;
  model?: Agent['model'];
  temperature?: number;
  widget_config?: Partial<WidgetConfig>;
}

export interface UpdateAgentRequest extends Partial<CreateAgentRequest> {}

// ============================================================================
// Data Source API
// ============================================================================

export interface CreateTextDataSourceRequest {
  agent_id: string;
  name: string;
  content: string;
}

export interface CrawlUrlDataSourceRequest {
  agent_id: string;
  url: string;
}

// ============================================================================
// Q&A Pair API
// ============================================================================

export interface CreateQAPairRequest {
  agent_id: string;
  question: string;
  answer: string;
}

export interface UpdateQAPairRequest {
  question?: string;
  answer?: string;
}

// ============================================================================
// AI Action API
// ============================================================================

export interface CreateAIActionRequest {
  agent_id: string;
  type: AIActionType;
  name: string;
  description: string;
  is_enabled?: boolean;
  config: AIActionConfig;
}

export interface UpdateAIActionRequest {
  name?: string;
  description?: string;
  is_enabled?: boolean;
  config?: AIActionConfig;
}

// ============================================================================
// Chat API
// ============================================================================

export interface ChatRequest {
  agent_id: string;
  message: string;
  conversation_id?: string;
}

export interface ChatWidgetRequest extends ChatRequest {
  visitor_metadata: Record<string, unknown>;
}

// ============================================================================
// Feedback API
// ============================================================================

export interface FeedbackRequest {
  message_id: string;
  feedback: 'thumbs_up' | 'thumbs_down';
  feedback_text?: string;
}

// ============================================================================
// Help Page API
// ============================================================================

export interface CreateHelpPageRequest {
  agent_id: string;
  slug: string;
  is_published?: boolean;
  config: HelpPageConfig;
}

// ============================================================================
// Analytics API
// ============================================================================

export interface AnalyticsQueryParams {
  agent_id: string;
  start_date: string;
  end_date: string;
  event_type?: string;
}

// ============================================================================
// API Responses
// ============================================================================

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

export type AgentResponse = ApiResponse<Agent>;
export type AgentsListResponse = ApiResponse<Agent[]>;
export type DataSourceResponse = ApiResponse<DataSource>;
export type DataSourcesListResponse = ApiResponse<DataSource[]>;
export type ConversationResponse = ApiResponse<Conversation & { messages: Message[] }>;
export type ConversationsListResponse = ApiResponse<Conversation[]>;
export type QAPairResponse = ApiResponse<QAPair>;
export type QAPairsListResponse = ApiResponse<QAPair[]>;
export type AIActionResponse = ApiResponse<AIAction>;
export type AIActionsListResponse = ApiResponse<AIAction[]>;
export type LeadResponse = ApiResponse<Lead>;
export type LeadsListResponse = ApiResponse<Lead[]>;
export type AnalyticsEventsResponse = ApiResponse<AnalyticsEvent[]>;
export type HelpPageResponse = ApiResponse<HelpPage>;
