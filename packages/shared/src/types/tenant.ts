export interface BusinessHours {
  [day: string]: {
    open: string;
    close: string;
    closed?: boolean;
  };
}

export interface TenantSettings {
  greeting_message?: string;
  notification_email?: string;
  notification_phone?: string;
  auto_reply_enabled?: boolean;
  follow_up_delay_hours?: number;
}

export interface Tenant {
  id: string;
  clerk_org_id: string;
  name: string;
  phone_number: string | null;
  retell_agent_id: string | null;
  business_hours: BusinessHours | null;
  settings: TenantSettings | null;
  created_at: string;
  updated_at: string;
}
