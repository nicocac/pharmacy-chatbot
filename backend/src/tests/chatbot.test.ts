import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ChatbotController } from '../controllers/chatbot.controller';
import { PharmacyService } from '../services/pharmacy.service';
import { OpenAIService } from '../services/openai.service';
import { FollowUpService } from '../services/followup.service';

describe('ChatbotController', () => {
  let controller: ChatbotController;
  let pharmacyService: PharmacyService;
  let openAIService: OpenAIService;
  let followUpService: FollowUpService;

  const mockPharmacy = {
    id: '1',
    name: 'Test Pharmacy',
    phone: '+1-555-123-4567',
    address: '123 Main St, Test City, TC 12345',
    rxVolume: 5000,
    contactPerson: 'John Doe',
    email: 'john@testpharmacy.com',
  };

  const mockPharmacyService = {
    findPharmacyByPhone: jest.fn(),
    getAllPharmacies: jest.fn(),
    createPharmacy: jest.fn(),
    formatRxVolumeMessage: jest.fn(),
  };

  const mockOpenAIService = {
    generateChatResponse: jest.fn(),
    extractInformationFromResponse: jest.fn(),
  };

  const mockFollowUpService = {
    scheduleCallback: jest.fn(),
    sendEmail: jest.fn(),
    generateFollowUpEmail: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string) => {
      const config = {
        OPENAI_API_KEY: 'test-key',
        PHARMACY_API_URL: 'http://test-api.com',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatbotController],
      providers: [
        { provide: PharmacyService, useValue: mockPharmacyService },
        { provide: OpenAIService, useValue: mockOpenAIService },
        { provide: FollowUpService, useValue: mockFollowUpService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    controller = module.get<ChatbotController>(ChatbotController);
    pharmacyService = module.get<PharmacyService>(PharmacyService);
    openAIService = module.get<OpenAIService>(OpenAIService);
    followUpService = module.get<FollowUpService>(FollowUpService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('startChat', () => {
    it('should start chat with existing pharmacy', async () => {
      mockPharmacyService.findPharmacyByPhone.mockResolvedValue(mockPharmacy);
      mockPharmacyService.formatRxVolumeMessage.mockReturnValue(
        'Volume message',
      );

      const result = await controller.startChat({
        phoneNumber: '+1-555-123-4567',
      });

      expect(result.success).toBe(true);
      expect(result.isNewLead).toBe(false);
      expect(result.pharmacy).toEqual(mockPharmacy);
      expect(result.message).toContain('Test Pharmacy');
      expect(pharmacyService.findPharmacyByPhone).toHaveBeenCalledWith(
        '+1-555-123-4567',
      );
    });

    it('should start chat with new lead (unknown phone)', async () => {
      mockPharmacyService.findPharmacyByPhone.mockResolvedValue(null);

      const result = await controller.startChat({
        phoneNumber: '+1-555-NEW-LEAD',
      });

      expect(result.success).toBe(true);
      expect(result.isNewLead).toBe(true);
      expect(result.pharmacy).toBeNull();
      expect(result.message).toContain('Pharmesol');
      expect(pharmacyService.findPharmacyByPhone).toHaveBeenCalledWith(
        '+1-555-NEW-LEAD',
      );
    });

    it('should handle API errors gracefully', async () => {
      mockPharmacyService.findPharmacyByPhone.mockRejectedValue(
        new Error('API Error'),
      );

      const result = await controller.startChat({
        phoneNumber: '+1-555-ERROR',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('trouble connecting');
    });
  });

  describe('sendMessage', () => {
    beforeEach(async () => {
      // Set up a conversation context
      await controller.startChat({ phoneNumber: '+1-555-123-4567' });
    });

    it('should process message for existing pharmacy', async () => {
      mockPharmacyService.findPharmacyByPhone.mockResolvedValue(mockPharmacy);
      mockOpenAIService.generateChatResponse.mockResolvedValue('AI response');

      // Start chat first
      await controller.startChat({ phoneNumber: '+1-555-123-4567' });

      const result = await controller.sendMessage({
        phoneNumber: '+1-555-123-4567',
        message: 'Hello, I need help with my prescriptions',
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe('AI response');
      expect(openAIService.generateChatResponse).toHaveBeenCalled();
    });

    it('should handle conversation not found', async () => {
      const result = await controller.sendMessage({
        phoneNumber: '+1-555-UNKNOWN',
        message: 'Hello',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('start a new conversation');
    });

    it('should extract information from new lead responses', async () => {
      mockPharmacyService.findPharmacyByPhone.mockResolvedValue(null);
      mockOpenAIService.generateChatResponse.mockResolvedValue(
        'Thank you for that information',
      );
      mockOpenAIService.extractInformationFromResponse.mockResolvedValue({
        name: 'New Pharmacy',
        contactPerson: 'Jane Smith',
        rxVolume: 3000,
      });
      mockPharmacyService.createPharmacy.mockResolvedValue({
        ...mockPharmacy,
        name: 'New Pharmacy',
        contactPerson: 'Jane Smith',
        rxVolume: 3000,
      });

      // Start as new lead
      await controller.startChat({ phoneNumber: '+1-555-NEW-LEAD' });

      const result = await controller.sendMessage({
        phoneNumber: '+1-555-NEW-LEAD',
        message:
          'Our pharmacy is called New Pharmacy, I am Jane Smith, and we process about 3000 prescriptions per month',
      });

      expect(result.success).toBe(true);
      expect(openAIService.extractInformationFromResponse).toHaveBeenCalled();
    });
  });

  describe('scheduleCallback', () => {
    beforeEach(async () => {
      mockPharmacyService.findPharmacyByPhone.mockResolvedValue(mockPharmacy);
      await controller.startChat({ phoneNumber: '+1-555-123-4567' });
    });

    it('should schedule callback successfully', async () => {
      mockFollowUpService.scheduleCallback.mockResolvedValue(true);

      const result = await controller.scheduleCallback({
        phoneNumber: '+1-555-123-4567',
        preferredTime: 'Tomorrow at 2 PM',
        notes: 'Discuss pricing options',
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('callback for Tomorrow at 2 PM');
      expect(followUpService.scheduleCallback).toHaveBeenCalledWith(
        expect.objectContaining({ phone: '+1-555-123-4567' }),
        'Tomorrow at 2 PM',
        'Discuss pricing options',
      );
    });

    it('should handle callback scheduling failure', async () => {
      mockFollowUpService.scheduleCallback.mockResolvedValue(false);

      const result = await controller.scheduleCallback({
        phoneNumber: '+1-555-123-4567',
        preferredTime: 'Tomorrow at 2 PM',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('issue scheduling');
    });
  });

  describe('sendFollowUpEmail', () => {
    beforeEach(async () => {
      mockPharmacyService.findPharmacyByPhone.mockResolvedValue(mockPharmacy);
      await controller.startChat({ phoneNumber: '+1-555-123-4567' });
    });

    it('should send follow-up email successfully', async () => {
      mockFollowUpService.generateFollowUpEmail.mockReturnValue({
        subject: 'Test Subject',
        content: 'Test Content',
      });
      mockFollowUpService.sendEmail.mockResolvedValue(true);

      const result = await controller.sendFollowUpEmail({
        phoneNumber: '+1-555-123-4567',
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('follow-up email');
      expect(followUpService.sendEmail).toHaveBeenCalled();
    });

    it('should handle missing email address', async () => {
      // Start with a pharmacy that has no email
      const pharmacyWithoutEmail = { ...mockPharmacy, email: '' };
      mockPharmacyService.findPharmacyByPhone.mockResolvedValue(
        pharmacyWithoutEmail,
      );

      // Reset conversation
      await controller.startChat({ phoneNumber: '+1-555-NO-EMAIL' });

      const result = await controller.sendFollowUpEmail({
        phoneNumber: '+1-555-NO-EMAIL',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Email address not available');
    });
  });

  describe('Edge Cases', () => {
    it('should handle malformed phone numbers', async () => {
      mockPharmacyService.findPharmacyByPhone.mockResolvedValue(null);

      const result = await controller.startChat({
        phoneNumber: 'invalid-phone',
      });

      expect(result.success).toBe(true); // Still succeeds as new lead
      expect(result.isNewLead).toBe(true);
    });

    it('should handle OpenAI service errors', async () => {
      mockPharmacyService.findPharmacyByPhone.mockResolvedValue(mockPharmacy);
      mockOpenAIService.generateChatResponse.mockRejectedValue(
        new Error('OpenAI Error'),
      );

      await controller.startChat({ phoneNumber: '+1-555-123-4567' });

      const result = await controller.sendMessage({
        phoneNumber: '+1-555-123-4567',
        message: 'Test message',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('trouble processing');
    });

    it('should handle empty or whitespace-only messages', async () => {
      mockPharmacyService.findPharmacyByPhone.mockResolvedValue(mockPharmacy);
      await controller.startChat({ phoneNumber: '+1-555-123-4567' });

      const result = await controller.sendMessage({
        phoneNumber: '+1-555-123-4567',
        message: '   ',
      });

      // Should still process the message (OpenAI handles empty content)
      expect(openAIService.generateChatResponse).toHaveBeenCalled();
    });

    it('should handle very high prescription volumes', async () => {
      const highVolumePharmacy = { ...mockPharmacy, rxVolume: 50000 };
      mockPharmacyService.findPharmacyByPhone.mockResolvedValue(
        highVolumePharmacy,
      );
      mockPharmacyService.formatRxVolumeMessage.mockReturnValue(
        'High volume message',
      );

      const result = await controller.startChat({
        phoneNumber: '+1-555-HIGH-VOL',
      });

      expect(result.success).toBe(true);
      expect(result.pharmacy?.rxVolume).toBe(50000);
      expect(pharmacyService.formatRxVolumeMessage).toHaveBeenCalledWith(50000);
    });
  });

  describe('getAllPharmacies', () => {
    it('should return all pharmacies', async () => {
      const mockPharmacies = [
        mockPharmacy,
        { ...mockPharmacy, id: '2', name: 'Another Pharmacy' },
      ];
      mockPharmacyService.getAllPharmacies.mockResolvedValue(mockPharmacies);

      const result = await controller.getAllPharmacies();

      expect(result.success).toBe(true);
      expect(result.pharmacies).toEqual(mockPharmacies);
    });

    it('should handle errors when fetching pharmacies', async () => {
      mockPharmacyService.getAllPharmacies.mockRejectedValue(
        new Error('Fetch error'),
      );

      const result = await controller.getAllPharmacies();

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to fetch');
    });
  });
});
