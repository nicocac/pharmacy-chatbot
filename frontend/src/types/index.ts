export interface Pharmacy {
  id: string;
  name: string;
  phone: string;
  address?: string;
  city?: string;
  state?: string;
  rxVolume: number;
  contactPerson?: string;
  email: string | null;
  lastContact?: string;
  prescriptions?: Array<{
    drug: string;
    count: number;
  }>;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
}

export interface ConversationContext {
  phoneNumber: string;
  pharmacy?: Pharmacy;
  isNewLead: boolean;
  conversation: ChatMessage[];
  collectingInfo?: boolean;
}

export interface ApiResponse {
  success: boolean;
  message: string;
  isNewLead?: boolean;
  pharmacy?: Pharmacy;
  collectingInfo?: boolean;
}