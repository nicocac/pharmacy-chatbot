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
  pendingInfo?: {
    name?: string;
    address?: string;
    contactPerson?: string;
    email?: string;
    rxVolume?: number;
  };
}
