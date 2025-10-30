import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import {
  ChatMessage,
  ConversationContext,
  Pharmacy,
} from '../interfaces/pharmacy.interface';

@Injectable()
export class OpenAIService {
  private readonly logger = new Logger(OpenAIService.name);
  private readonly openai: OpenAI;

  constructor(private configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  async generateChatResponse(context: ConversationContext): Promise<string> {
    try {
      const systemPrompt = this.buildSystemPrompt(context);
      const messages = [
        { role: 'system' as const, content: systemPrompt },
        ...context.conversation.map((msg) => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        })),
      ];

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: messages,
        max_tokens: 500,
        temperature: 0.7,
      });

      return (
        response.choices[0]?.message?.content ||
        "I apologize, but I'm having trouble responding right now. Please try again."
      );
    } catch (error) {
      this.logger.error(`Error generating chat response: ${error.message}`);
      return "I apologize, but I'm experiencing technical difficulties. Please try again in a moment.";
    }
  }

  private buildSystemPrompt(context: ConversationContext): string {
    const basePrompt = `You are a professional sales assistant for Pharmesol, a company that supports high prescription volume pharmacies. You are handling an inbound call from a pharmacy.

Key guidelines:
- Be professional, friendly, and helpful
- Focus on how Pharmesol can support high Rx volume pharmacies
- Ask relevant follow-up questions to understand their needs
- Keep responses concise and conversational
- Always offer follow-up options like email or callback scheduling

`;

    if (context.pharmacy) {
      return (
        basePrompt +
        `
CALLER INFORMATION:
- Pharmacy: ${context.pharmacy.name}
- Location: ${context.pharmacy.address}
- Contact Person: ${context.pharmacy.contactPerson}
- Monthly Rx Volume: ${context.pharmacy.rxVolume.toLocaleString()}
- Email: ${context.pharmacy.email}

Since this is a returning client, greet them by name and reference their pharmacy details. Emphasize how Pharmesol can specifically help with their ${context.pharmacy.rxVolume.toLocaleString()} monthly prescription volume.`
      );
    } else {
      return (
        basePrompt +
        `
This appears to be a NEW CALLER. Your goals:
1. Warmly greet them and introduce Pharmesol
2. Gather basic information: pharmacy name, location, contact person, email, monthly Rx volume
3. Explain how Pharmesol specifically helps high-volume pharmacies
4. Offer follow-up via email or callback scheduling

${context.collectingInfo ? 'You are currently collecting basic information from this new caller. Ask for one piece of information at a time.' : ''}`
      );
    }
  }

  async extractInformationFromResponse(
    userMessage: string,
    context: ConversationContext,
  ): Promise<Partial<Pharmacy>> {
    try {
      const extractionPrompt = `
Extract pharmacy information from this message: "${userMessage}"

Look for:
- Pharmacy name
- Address/location
- Contact person name
- Email address
- Monthly Rx volume (number of prescriptions)

Return as JSON with only the fields found. Use null for missing fields.
Example: {"name": "ABC Pharmacy", "address": "123 Main St", "contactPerson": "John Doe", "email": "john@abc.com", "rxVolume": 5000}`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: extractionPrompt }],
        max_tokens: 200,
        temperature: 0.1,
      });

      const extracted = JSON.parse(
        response.choices[0]?.message?.content || '{}',
      );
      return extracted;
    } catch (error) {
      this.logger.error(`Error extracting information: ${error.message}`);
      return {};
    }
  }
}
