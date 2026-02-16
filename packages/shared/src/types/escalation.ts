export type EscalationStatus = "pending" | "in_progress" | "resolved";

export type EscalationReason =
  | "medical_question"
  | "complaint"
  | "emergency"
  | "ai_unsure"
  | "patient_request";

export interface Escalation {
  id: string;
  tenant_id: string;
  conversation_id: string;
  reason: EscalationReason;
  status: EscalationStatus;
  notes: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
}

export interface EscalationCreate {
  conversation_id: string;
  reason: EscalationReason;
  notes?: string;
}

export interface EscalationUpdate {
  status?: EscalationStatus;
  notes?: string;
  assigned_to?: string;
}
