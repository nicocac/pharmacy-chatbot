import { Controller, Post, Body, Get, Logger, Param } from '@nestjs/common';
import { PharmacyService } from '../services/pharmacy.service';
import { OpenAIService } from '../services/openai.service';
import { FollowUpService } from '../services/followup.service';
import {
  StartChatDto,
  SendMessageDto,
  ScheduleCallbackDto,
  SendFollowUpEmailDto,
} from '../dto/chat.dto';
import { ConversationContext } from '../interfaces/pharmacy.interface';

@Controller('api/chatbot')
export class ChatbotController {
  private readonly logger = new Logger(ChatbotController.name);
  private conversations = new Map<string, ConversationContext>();

  constructor(
    private pharmacyService: PharmacyService,
    private openAIService: OpenAIService,
    private followUpService: FollowUpService,
  ) {}

  @Post('start')
  async startChat(@Body() startChatDto: StartChatDto) {
    try {
      const { phoneNumber } = startChatDto;
      this.logger.log(`Starting chat for phone: ${phoneNumber}`);

      // Lookup pharmacy by phone number
      const pharmacy =
        await this.pharmacyService.findPharmacyByPhone(phoneNumber);

      const context: ConversationContext = {
        phoneNumber,
        pharmacy: pharmacy || undefined,
        isNewLead: !pharmacy,
        conversation: [],
        collectingInfo: !pharmacy,
        pendingInfo: !pharmacy ? {} : undefined,
      };

      this.conversations.set(phoneNumber, context);

      // Generate initial greeting
      let initialMessage: string;
      if (pharmacy) {
        initialMessage = `Hello! This is Pharmesol calling for ${pharmacy.name}. I see we're speaking with ${pharmacy.contactPerson}. How can I help you today?`;

        // Add pharmacy volume context
        const volumeMessage = this.pharmacyService.formatRxVolumeMessage(
          pharmacy.rxVolume,
        );
        initialMessage += ` ${volumeMessage}`;
      } else {
        initialMessage =
          "Hello! Thank you for calling Pharmesol. We specialize in supporting high prescription volume pharmacies. May I get your pharmacy's name to better assist you?";
      }

      context.conversation.push({
        role: 'assistant',
        content: initialMessage,
        timestamp: new Date(),
      });

      return {
        success: true,
        message: initialMessage,
        isNewLead: context.isNewLead,
        pharmacy: pharmacy || null,
      };
    } catch (error) {
      this.logger.error(`Error starting chat: ${(error as Error).message}`);
      return {
        success: false,
        message:
          "I apologize, but I'm having trouble connecting right now. Please try again.",
      };
    }
  }

  @Post('message')
  async sendMessage(@Body() sendMessageDto: SendMessageDto) {
    try {
      const { message, phoneNumber } = sendMessageDto;
      const context = this.conversations.get(phoneNumber);

      if (!context) {
        return {
          success: false,
          message: 'Please start a new conversation first.',
        };
      }

      // Add user message to conversation
      context.conversation.push({
        role: 'user',
        content: message,
        timestamp: new Date(),
      });

      // Extract information if collecting from new lead
      if (context.collectingInfo && context.pendingInfo) {
        const extractedInfo =
          await this.openAIService.extractInformationFromResponse(message);
        Object.assign(context.pendingInfo, extractedInfo);

        // Check if we have enough information
        const hasBasicInfo =
          context.pendingInfo.name &&
          context.pendingInfo.contactPerson &&
          context.pendingInfo.rxVolume;

        if (hasBasicInfo) {
          context.collectingInfo = false;
          // Create the new pharmacy record
          try {
            const newPharmacy = await this.pharmacyService.createPharmacy({
              ...context.pendingInfo,
              phone: phoneNumber,
            });
            context.pharmacy = newPharmacy;
            context.isNewLead = false;
          } catch (error) {
            this.logger.error(
              `Error creating pharmacy: ${(error as Error).message}`,
            );
          }
        }
      }

      // Generate AI response
      const aiResponse = await this.openAIService.generateChatResponse(context);

      // Add AI response to conversation
      context.conversation.push({
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date(),
      });

      return {
        success: true,
        message: aiResponse,
        collectingInfo: context.collectingInfo,
        pharmacy: context.pharmacy,
      };
    } catch (error) {
      this.logger.error(
        `Error processing message: ${(error as Error).message}`,
      );
      return {
        success: false,
        message:
          "I apologize, but I'm having trouble processing your message. Please try again.",
      };
    }
  }

  @Post('schedule-callback')
  async scheduleCallback(@Body() scheduleCallbackDto: ScheduleCallbackDto) {
    try {
      const { phoneNumber, preferredTime, notes } = scheduleCallbackDto;
      const context = this.conversations.get(phoneNumber);

      if (!context) {
        return {
          success: false,
          message: 'Conversation not found.',
        };
      }

      const pharmacy = context.pharmacy || context.pendingInfo;
      const success = await this.followUpService.scheduleCallback(
        { ...pharmacy, phone: phoneNumber },
        preferredTime,
        notes,
      );

      if (success) {
        return {
          success: true,
          message: `Perfect! I've scheduled a callback for ${preferredTime}. One of our specialists will call you at ${phoneNumber}. Thank you for your time today!`,
        };
      } else {
        return {
          success: false,
          message:
            'I apologize, but there was an issue scheduling the callback. Please try again or contact us directly.',
        };
      }
    } catch (error) {
      this.logger.error(
        `Error scheduling callback: ${(error as Error).message}`,
      );
      return {
        success: false,
        message:
          'Sorry, there was an error scheduling the callback. Please try again.',
      };
    }
  }

  @Post('send-email')
  async sendFollowUpEmail(@Body() sendFollowUpEmailDto: SendFollowUpEmailDto) {
    try {
      const { phoneNumber } = sendFollowUpEmailDto;
      const context = this.conversations.get(phoneNumber);

      if (!context) {
        return {
          success: false,
          message: 'Conversation not found.',
        };
      }

      const pharmacy = context.pharmacy || context.pendingInfo;

      if (!pharmacy?.email) {
        return {
          success: false,
          message:
            'Email address not available. Please provide an email address first.',
        };
      }

      const { subject, content } =
        this.followUpService.generateFollowUpEmail(pharmacy);
      const success = await this.followUpService.sendEmail(
        pharmacy,
        subject,
        content,
      );

      if (success) {
        return {
          success: true,
          message: `Great! I've sent a follow-up email to ${pharmacy.email} with detailed information about how Pharmesol can help ${pharmacy.name}. You should receive it within a few minutes.`,
        };
      } else {
        return {
          success: false,
          message:
            'I apologize, but there was an issue sending the email. Please try again or contact us directly.',
        };
      }
    } catch (error) {
      this.logger.error(
        `Error sending follow-up email: ${(error as Error).message}`,
      );
      return {
        success: false,
        message:
          'Sorry, there was an error sending the email. Please try again.',
      };
    }
  }

  @Get('conversation/:phoneNumber')
  getConversation(@Param('phoneNumber') phoneNumber: string) {
    const context = this.conversations.get(phoneNumber);

    if (!context) {
      return {
        success: false,
        message: 'Conversation not found.',
      };
    }

    return {
      success: true,
      context,
    };
  }

  @Get('pharmacies')
  async getAllPharmacies() {
    try {
      const pharmacies = await this.pharmacyService.getAllPharmacies();
      return {
        success: true,
        pharmacies,
      };
    } catch (error) {
      this.logger.error(
        `Error fetching pharmacies: ${(error as Error).message}`,
      );
      return {
        success: false,
        message: 'Failed to fetch pharmacy data.',
      };
    }
  }
}
