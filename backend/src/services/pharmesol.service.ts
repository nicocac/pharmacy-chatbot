import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class PharmesolService {
  private readonly logger = new Logger(PharmesolService.name);
  private readonly openai: OpenAI;

  constructor(private configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY') || 
              process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Returns the standard response when users ask about Pharmesol
   */
  getPharmesolResponse(): string {
    // This text will be manually updated as needed
    return `Pharmesol is a comprehensive platform designed to support high-volume pharmacies with their daily operations. We provide innovative solutions to streamline prescription processing, inventory management, and customer service.

Our key services include:
- Advanced prescription management systems
- Inventory optimization tools
- Customer relationship management
- Compliance and reporting solutions
- 24/7 technical support

We specialize in helping pharmacies that process high volumes of prescriptions improve their efficiency and customer satisfaction. Would you like to learn more about how Pharmesol can specifically help your pharmacy?`;
  }

  /**
   * Checks if a message is asking about Pharmesol using AI
   */
  async isPharmesolQuestion(message: string): Promise<boolean> {
    try {
      const detectionPrompt = `
Analyze the following message and determine if the user is asking about "Pharmesol" or asking for services/features that Pharmesol provides.

Message: "${message}"

Consider these as Pharmesol questions:
- Direct questions about Pharmesol/Pharmasol (any spelling)
- Questions about what Pharmesol does or offers
- Questions about Pharmesol's services or products
- General company information requests about Pharmesol
- "Tell me about Pharmesol" type questions
- Questions about services, features, or solutions for pharmacies
- Questions about what services/features are available
- Questions about features, capabilities, or offerings
- Questions about tools, systems, or solutions for pharmacy operations
- Questions like "what services do you offer", "what features do you have", "what can you help with"
- Questions about pharmacy management solutions, inventory systems, or operational tools

Do NOT consider these as Pharmesol questions:
- General pharmacy-related questions about medications or prescriptions
- Questions about specific pharmacy operations not related to services/tools
- Questions about other companies or services
- General conversation not related to services or Pharmesol
- Technical support questions about existing systems

Respond with only "true" or "false" (no quotes, no other text).`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: detectionPrompt }],
        max_tokens: 10,
        temperature: 0.1,
      });

      const result = response.choices[0]?.message?.content?.trim().toLowerCase();
      return result === 'true';
    } catch (error) {
      this.logger.error(
        `Error detecting Pharmesol question: ${(error as Error).message}`,
      );
      // Fallback to keyword detection if AI fails
      return this.fallbackKeywordDetection(message);
    }
  }

  /**
   * Fallback keyword detection method
   */
  private fallbackKeywordDetection(message: string): boolean {
    const lowerMessage = message.toLowerCase();
    const pharmeSolKeywords = [
      'pharmesol',
      'pharmasol',
      'what is pharmesol',
      'tell me about pharmesol',
      'about pharmesol',
      'pharmesol company',
      'what does pharmesol do',
      'pharmesol services',
      'what services',
      'what features',
      'what do you offer',
      'what can you help',
      'services available',
      'features available',
      'pharmacy solutions',
      'pharmacy tools',
      'pharmacy systems',
      'inventory management',
      'prescription management',
      'what solutions',
      'what tools',
      'capabilities',
      'offerings',
    ];

    return pharmeSolKeywords.some(keyword => 
      lowerMessage.includes(keyword.toLowerCase())
    );
  }
}