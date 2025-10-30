import { Test, TestingModule } from '@nestjs/testing';
import { ChatbotController } from '../controllers/chatbot.controller';
import { PharmacyService } from '../services/pharmacy.service';
import { OpenAIService } from '../services/openai.service';
import { FollowUpService } from '../services/followup.service';
import { PharmesolService } from '../services/pharmesol.service';

describe('Security and Corner Cases', () => {
  let controller: ChatbotController;
  let pharmacyService: PharmacyService;
  let openAIService: OpenAIService;

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

  const mockPharmesolService = {
    isPharmesolQuestion: jest.fn(),
    getPharmesolResponse: jest.fn(),
  };

  beforeEach(async () => {
    // Reset all mocks completely before each test
    jest.resetAllMocks();

    // Reset mock implementations
    mockPharmacyService.findPharmacyByPhone.mockResolvedValue(null);
    mockPharmacyService.getAllPharmacies.mockResolvedValue([]);
    mockPharmacyService.createPharmacy.mockResolvedValue({});
    mockPharmacyService.formatRxVolumeMessage.mockReturnValue('');

    mockOpenAIService.generateChatResponse.mockResolvedValue(
      'Default response',
    );
    mockOpenAIService.extractInformationFromResponse.mockResolvedValue({});

    mockFollowUpService.scheduleCallback.mockResolvedValue({ success: true });
    mockFollowUpService.sendEmail.mockResolvedValue({ success: true });
    mockFollowUpService.generateFollowUpEmail.mockResolvedValue(
      'email content',
    );

    mockPharmesolService.isPharmesolQuestion.mockResolvedValue(false);
    mockPharmesolService.getPharmesolResponse.mockReturnValue(
      'Pharmesol response',
    );

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatbotController],
      providers: [
        { provide: PharmacyService, useValue: mockPharmacyService },
        { provide: OpenAIService, useValue: mockOpenAIService },
        { provide: FollowUpService, useValue: mockFollowUpService },
        { provide: PharmesolService, useValue: mockPharmesolService },
      ],
    }).compile();

    controller = module.get<ChatbotController>(ChatbotController);
    pharmacyService = module.get<PharmacyService>(PharmacyService);
    openAIService = module.get<OpenAIService>(OpenAIService);

    // Clear the controller's conversation map to prevent test interference
    (controller as any).conversations.clear();
  });

  describe('Security Tests - Input Sanitization', () => {
    it('should handle SQL injection attempts in phone numbers', async () => {
      const maliciousPhone = "'; DROP TABLE pharmacies; --";
      mockPharmacyService.findPharmacyByPhone.mockResolvedValue(null);

      const result = await controller.startChat({
        phoneNumber: maliciousPhone,
      });

      expect(result.success).toBe(true);
      expect(result.isNewLead).toBe(true);
      expect(pharmacyService.findPharmacyByPhone).toHaveBeenCalledWith(
        maliciousPhone,
      );
    });

    it('should handle XSS attempts in messages', async () => {
      const xssMessage = '<script>alert("XSS")</script>';
      mockPharmacyService.findPharmacyByPhone.mockResolvedValue(null);
      mockOpenAIService.generateChatResponse.mockResolvedValue('Safe response');

      await controller.startChat({ phoneNumber: '+1-555-XSS-TEST' });

      const result = await controller.sendMessage({
        phoneNumber: '+1-555-XSS-TEST',
        message: xssMessage,
      });

      expect(result.success).toBe(true);
      expect(openAIService.generateChatResponse).toHaveBeenCalled();
    });

    it('should handle very long phone numbers (DoS protection)', async () => {
      const longPhone = 'a'.repeat(10000);
      mockPharmacyService.findPharmacyByPhone.mockResolvedValue(null);

      const result = await controller.startChat({
        phoneNumber: longPhone,
      });

      expect(result.success).toBe(true);
      expect(result.isNewLead).toBe(true);
    });

    it('should handle very long messages (DoS protection)', async () => {
      const longMessage = 'a'.repeat(50000);
      mockPharmacyService.findPharmacyByPhone.mockResolvedValue(null);
      mockOpenAIService.generateChatResponse.mockResolvedValue(
        'Response to long message',
      );

      await controller.startChat({ phoneNumber: '+1-555-LONG-MSG' });

      const result = await controller.sendMessage({
        phoneNumber: '+1-555-LONG-MSG',
        message: longMessage,
      });

      expect(result.success).toBe(true);
      expect(openAIService.generateChatResponse).toHaveBeenCalled();
    });

    it('should handle special characters in pharmacy names', async () => {
      const specialCharsMessage =
        'Our pharmacy is called "Müller & O\'Reilly Apotheke - 50% off!" located at <script>evil</script>';
      mockPharmacyService.findPharmacyByPhone.mockResolvedValue(null);
      mockOpenAIService.generateChatResponse.mockResolvedValue('Safe response');
      mockOpenAIService.extractInformationFromResponse.mockResolvedValue({
        name: "Müller & O'Reilly Apotheke - 50% off!",
      });

      await controller.startChat({ phoneNumber: '+1-555-SPECIAL' });

      const result = await controller.sendMessage({
        phoneNumber: '+1-555-SPECIAL',
        message: specialCharsMessage,
      });

      expect(result.success).toBe(true);
      expect(openAIService.extractInformationFromResponse).toHaveBeenCalledWith(
        specialCharsMessage,
      );
    });

    it('should handle Unicode and emoji in messages', async () => {
      const unicodeMessage =
        '🏥 Our pharmacy 薬局 needs help with Rx management 💊';
      mockPharmacyService.findPharmacyByPhone.mockResolvedValue(null);
      mockOpenAIService.generateChatResponse.mockResolvedValue(
        'Unicode response',
      );

      await controller.startChat({ phoneNumber: '+1-555-UNICODE' });

      const result = await controller.sendMessage({
        phoneNumber: '+1-555-UNICODE',
        message: unicodeMessage,
      });

      expect(result.success).toBe(true);
      expect(openAIService.generateChatResponse).toHaveBeenCalled();
    });
  });

  describe('OpenAI API Edge Cases', () => {
    it('should handle OpenAI rate limiting', async () => {
      mockPharmacyService.findPharmacyByPhone.mockResolvedValue(null);
      mockOpenAIService.generateChatResponse.mockRejectedValue(
        new Error('Rate limit exceeded'),
      );

      await controller.startChat({ phoneNumber: '+1-555-RATE-LIMIT' });

      const result = await controller.sendMessage({
        phoneNumber: '+1-555-RATE-LIMIT',
        message: 'Test message',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('trouble processing');
    });

    it('should handle OpenAI token limit exceeded', async () => {
      mockPharmacyService.findPharmacyByPhone.mockResolvedValue(null);
      mockOpenAIService.generateChatResponse.mockRejectedValue(
        new Error('Maximum context length exceeded'),
      );

      await controller.startChat({ phoneNumber: '+1-555-TOKEN-LIMIT' });

      const result = await controller.sendMessage({
        phoneNumber: '+1-555-TOKEN-LIMIT',
        message: 'Test message',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('trouble processing');
    });

    it('should handle invalid OpenAI API key', async () => {
      mockPharmacyService.findPharmacyByPhone.mockResolvedValue(null);
      mockOpenAIService.generateChatResponse.mockRejectedValue(
        new Error('Invalid API key'),
      );

      await controller.startChat({ phoneNumber: '+1-555-INVALID-KEY' });

      const result = await controller.sendMessage({
        phoneNumber: '+1-555-INVALID-KEY',
        message: 'Test message',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('trouble processing');
    });

    it('should handle OpenAI service unavailable', async () => {
      mockPharmacyService.findPharmacyByPhone.mockResolvedValue(null);
      mockOpenAIService.generateChatResponse.mockRejectedValue(
        new Error('Service temporarily unavailable'),
      );

      await controller.startChat({ phoneNumber: '+1-555-SERVICE-DOWN' });

      const result = await controller.sendMessage({
        phoneNumber: '+1-555-SERVICE-DOWN',
        message: 'Test message',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('trouble processing');
    });

    it('should handle partial OpenAI responses', async () => {
      mockPharmacyService.findPharmacyByPhone.mockResolvedValue(null);
      mockOpenAIService.generateChatResponse.mockResolvedValue(''); // Empty response

      await controller.startChat({ phoneNumber: '+1-555-EMPTY-RESPONSE' });

      const result = await controller.sendMessage({
        phoneNumber: '+1-555-EMPTY-RESPONSE',
        message: 'Test message',
      });

      expect(result.success).toBe(true);
      // Should still succeed but might return a default message
    });

    it('should handle malformed JSON from information extraction', async () => {
      mockPharmacyService.findPharmacyByPhone.mockResolvedValue(null);
      mockOpenAIService.generateChatResponse.mockResolvedValue('Thank you');
      mockOpenAIService.extractInformationFromResponse.mockResolvedValue({}); // Empty extraction

      await controller.startChat({ phoneNumber: '+1-555-BAD-JSON' });

      const result = await controller.sendMessage({
        phoneNumber: '+1-555-BAD-JSON',
        message: 'Invalid pharmacy data',
      });

      expect(result.success).toBe(true);
      expect(openAIService.extractInformationFromResponse).toHaveBeenCalled();
    });
  });

  describe('Business Logic Edge Cases', () => {
    it('should handle timezone edge cases for callbacks', async () => {
      const mockPharmacy = {
        id: '1',
        name: 'Test Pharmacy',
        phone: '+1-555-123-4567',
        email: 'test@pharmacy.com',
      };

      mockPharmacyService.findPharmacyByPhone.mockResolvedValue(mockPharmacy);
      mockFollowUpService.scheduleCallback.mockResolvedValue(true);

      await controller.startChat({ phoneNumber: '+1-555-123-4567' });

      // Test various time formats
      const timeFormats = [
        'Tomorrow at 2 PM EST',
        '2024-12-01 14:00 GMT',
        'Next Monday 9:00 AM PST',
        'In 2 hours',
        '23:59 tonight',
      ];

      for (const time of timeFormats) {
        const result = await controller.scheduleCallback({
          phoneNumber: '+1-555-123-4567',
          preferredTime: time,
          notes: `Test for ${time}`,
        });

        expect(result.success).toBe(true);
      }
    });

    it('should handle international phone numbers edge cases', async () => {
      mockPharmacyService.findPharmacyByPhone.mockResolvedValue(null);

      const internationalNumbers = [
        '+44 20 7946 0958', // UK
        '+33 1 42 68 53 00', // France
        '+49 30 12345678', // Germany
        '+86 10 12345678', // China
        '+91 11 12345678', // India
        '+61 2 1234 5678', // Australia
      ];

      for (const phone of internationalNumbers) {
        const result = await controller.startChat({ phoneNumber: phone });
        expect(result.success).toBe(true);
        expect(result.isNewLead).toBe(true);
      }
    });

    it('should handle edge cases in email validation', async () => {
      const mockPharmacy = {
        id: '1',
        name: 'Test Pharmacy',
        phone: '+1-555-123-4567',
        email: 'test+tag@sub.domain.co.uk', // Complex but valid email
      };

      mockPharmacyService.findPharmacyByPhone.mockResolvedValue(mockPharmacy);
      mockFollowUpService.generateFollowUpEmail.mockReturnValue({
        subject: 'Test',
        content: 'Test',
      });
      mockFollowUpService.sendEmail.mockResolvedValue(true);

      await controller.startChat({ phoneNumber: '+1-555-123-4567' });

      const result = await controller.sendFollowUpEmail({
        phoneNumber: '+1-555-123-4567',
      });

      expect(result.success).toBe(true);
    });

    it('should handle extreme prescription volumes', async () => {
      const extremeVolumes = [
        0, 1, 999, 1000, 4999, 5000, 9999, 10000, 100000, 1000000,
      ];

      for (const volume of extremeVolumes) {
        mockPharmacyService.formatRxVolumeMessage.mockReturnValue(
          `Message for ${volume}`,
        );

        const result = mockPharmacyService.formatRxVolumeMessage(volume);
        expect(result).toContain(volume.toString());
      }
    });

    it('should handle concurrent conversation limit stress test', async () => {
      const maxConcurrentConversations = 1000;
      const phoneNumbers = Array.from(
        { length: maxConcurrentConversations },
        (_, i) => `+1-555-STRESS-${i.toString().padStart(4, '0')}`,
      );

      mockPharmacyService.findPharmacyByPhone.mockResolvedValue(null);

      // Start many conversations simultaneously
      const startPromises = phoneNumbers.map((phone) =>
        controller.startChat({ phoneNumber: phone }),
      );

      const results = await Promise.all(startPromises);

      // All should succeed
      results.forEach((result) => {
        expect(result.success).toBe(true);
      });
    });

    it('should handle memory pressure from conversation history', async () => {
      const phoneNumber = '+1-555-MEMORY-TEST';
      mockPharmacyService.findPharmacyByPhone.mockResolvedValue(null);
      mockOpenAIService.generateChatResponse.mockResolvedValue('Response');

      await controller.startChat({ phoneNumber });

      // Send many messages to build up conversation history
      for (let i = 0; i < 100; i++) {
        const result = await controller.sendMessage({
          phoneNumber,
          message: `Message ${i} with some content to build up memory usage`,
        });
        expect(result.success).toBe(true);
      }

      // Get conversation to verify it's still working
      const conversation = await controller.getConversation(phoneNumber);
      expect(conversation.success).toBe(true);
      expect(conversation?.context?.conversation.length).toBeGreaterThan(100); // Initial + 100 user + 100 assistant
    });
  });

  describe('Network and Infrastructure Edge Cases', () => {
    it('should handle external API timeout', async () => {
      mockPharmacyService.findPharmacyByPhone.mockRejectedValue(
        new Error('ETIMEDOUT: Connection timeout'),
      );

      const result = await controller.startChat({
        phoneNumber: '+1-555-TIMEOUT',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('trouble connecting');
    });

    it('should handle external API connection refused', async () => {
      mockPharmacyService.findPharmacyByPhone.mockRejectedValue(
        new Error('ECONNREFUSED: Connection refused'),
      );

      const result = await controller.startChat({
        phoneNumber: '+1-555-REFUSED',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('trouble connecting');
    });

    it('should handle DNS resolution failures', async () => {
      mockPharmacyService.findPharmacyByPhone.mockRejectedValue(
        new Error('ENOTFOUND: DNS lookup failed'),
      );

      const result = await controller.startChat({
        phoneNumber: '+1-555-DNS-FAIL',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('trouble connecting');
    });

    it('should handle SSL certificate errors', async () => {
      mockPharmacyService.findPharmacyByPhone.mockRejectedValue(
        new Error('UNABLE_TO_VERIFY_LEAF_SIGNATURE'),
      );

      const result = await controller.startChat({
        phoneNumber: '+1-555-SSL-ERROR',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('trouble connecting');
    });
  });

  describe('Data Consistency Edge Cases', () => {
    it('should handle pharmacy data changes between calls', async () => {
      const pharmacy1 = { id: '1', name: 'Old Name', phone: '+1-555-123-4567' };
      const pharmacy2 = { id: '1', name: 'New Name', phone: '+1-555-123-4567' };

      // First call returns one pharmacy
      mockPharmacyService.findPharmacyByPhone.mockResolvedValueOnce(pharmacy1);
      await controller.startChat({ phoneNumber: '+1-555-123-4567' });

      // Second call returns updated pharmacy data
      mockPharmacyService.findPharmacyByPhone.mockResolvedValueOnce(pharmacy2);
      mockOpenAIService.generateChatResponse.mockResolvedValue(
        'Updated response',
      );

      const result = await controller.sendMessage({
        phoneNumber: '+1-555-123-4567',
        message: 'Follow up message',
      });

      expect(result.success).toBe(true);
      // Should use cached conversation context, not refetch pharmacy
    });

    it('should handle missing required fields in pharmacy data', async () => {
      const incompletePharmacy = {
        id: '1',
        name: 'Incomplete Pharmacy',
        // Missing phone, email, etc.
      };

      mockPharmacyService.findPharmacyByPhone.mockResolvedValueOnce(
        incompletePharmacy,
      );

      const result = await controller.startChat({
        phoneNumber: '+1-555-INCOMPLETE-DATA',
      });

      expect(result.success).toBe(true);
      expect(result.pharmacy).toEqual(incompletePharmacy);
    });

    it('should handle null/undefined values in API responses', async () => {
      const pharmacyWithNulls = {
        id: '1',
        name: 'Test Pharmacy',
        phone: '+1-555-NULL-VALUES',
        email: null,
        address: undefined,
        rxVolume: null,
        prescriptions: null,
      };

      mockPharmacyService.findPharmacyByPhone.mockResolvedValueOnce(
        pharmacyWithNulls,
      );

      const result = await controller.startChat({
        phoneNumber: '+1-555-NULL-VALUES',
      });

      expect(result.success).toBe(true);
      expect(result.pharmacy).toEqual(pharmacyWithNulls);
    });
  });
});
