export type Channel = "phone" | "web_chat" | "sms";

export type MessageRole = "user" | "assistant" | "system";

export interface Message {
  role: MessageRole;
  content: string;
  timestamp: string;
}

export interface Conversation {
  id: string;
  tenant_id: string;
  lead_id: string | null;
  channel: Channel;
  transcript: Message[];
  summary: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatRequest {
  message: string;
  conversation_id?: string;
}

export interface ChatStreamEvent {
  type: "message" | "done" | "error";
  content?: string;
  error?: string;
}
