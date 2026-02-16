export type LeadSource = "phone" | "web_chat" | "sms";

export type LeadStatus = "new" | "contacted" | "qualified" | "booked" | "lost";

export type LeadIntent =
  | "appointment"
  | "pricing"
  | "treatment_info"
  | "complaint"
  | "general"
  | "emergency";

export interface Lead {
  id: string;
  tenant_id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  source: LeadSource;
  status: LeadStatus;
  intent: LeadIntent | null;
  summary: string | null;
  urgency: number;
  created_at: string;
  updated_at: string;
}

export interface LeadCreate {
  name?: string;
  phone?: string;
  email?: string;
  source: LeadSource;
  intent?: LeadIntent;
  summary?: string;
}

export interface LeadUpdate {
  name?: string;
  phone?: string;
  email?: string;
  status?: LeadStatus;
  intent?: LeadIntent;
  summary?: string;
  urgency?: number;
}
