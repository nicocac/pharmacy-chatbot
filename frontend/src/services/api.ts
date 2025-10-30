import axios from 'axios';
import { ApiResponse, Pharmacy } from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const chatbotAPI = {
  startChat: async (phoneNumber: string): Promise<ApiResponse> => {
    const response = await api.post('/chatbot/start', { phoneNumber });
    return response.data;
  },

  sendMessage: async (phoneNumber: string, message: string): Promise<ApiResponse> => {
    const response = await api.post('/chatbot/message', { phoneNumber, message });
    return response.data;
  },

  scheduleCallback: async (phoneNumber: string, preferredTime: string, notes?: string): Promise<ApiResponse> => {
    const response = await api.post('/chatbot/schedule-callback', {
      phoneNumber,
      preferredTime,
      notes,
    });
    return response.data;
  },

  sendFollowUpEmail: async (phoneNumber: string): Promise<ApiResponse> => {
    const response = await api.post('/chatbot/send-email', { phoneNumber });
    return response.data;
  },

  getConversation: async (phoneNumber: string) => {
    const response = await api.get(`/chatbot/conversation/${phoneNumber}`);
    return response.data;
  },

  getAllPharmacies: async (): Promise<{ success: boolean; pharmacies: Pharmacy[] }> => {
    const response = await api.get('/chatbot/pharmacies');
    return response.data;
  },
};