import { Test, TestingModule } from '@nestjs/testing';
import { OpenAIService } from '../services/openai.service';
import { PharmesolService } from '../services/pharmesol.service';
import OpenAI from 'openai';

// Mock OpenAI
jest.mock('openai');
const MockedOpenAI = OpenAI as jest.MockedClass<typeof OpenAI>;

describe('OpenAIService Edge Cases', () => {
  let service: OpenAIService;
  let pharmesolService: PharmesolService;
  let mockOpenAI: jest.Mocked<OpenAI>;

  const mockPharmesolService = {
    isPharmesolQuestion: jest.fn(),
    getPharmesolResponse: jest.fn(),
  };

  beforeEach(async () => {
    // Set up environment
    process.env.OPENAI_API_KEY = 'test-api-key';

    // Create mock OpenAI instance
    mockOpenAI = {
      chat: {
        completions: {
          create: jest.fn(),
        },
      },
    } as any;

    MockedOpenAI.mockImplementation(() => mockOpenAI);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpenAIService,
        { provide: PharmesolService, useValue: mockPharmesolService },
      ],
    }).compile();

    service = module.get<OpenAIService>(OpenAIService);
    pharmesolService = module.get<PharmesolService>(PharmesolService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateChatResponse', () => {
    const mockContext = {
      phoneNumber: '+1-555-123-4567',
      pharmacy: {
        id: '1',
        name: 'Test Pharmacy',
        phone: '+1-555-123-4567',
        rxVolume: 5000,
        contactPerson: 'John Doe',
        email: 'john@test.com',
      },
      isNewLead: false,
      conversation: [
        { role: 'user' as const, content: 'Hello', timestamp: new Date() }
      ],
      collectingInfo: false,
    };

    it('should handle OpenAI API rate limiting gracefully', async () => {
      mockPharmesolService.isPharmesolQuestion.mockResolvedValue(false);
      mockOpenAI.chat.completions.create.mockRejectedValue(
        new Error('Rate limit exceeded. Please try again later.')
      );

      const result = await service.generateChatResponse(mockContext);

      expect(result).toContain('technical difficulties');
      expect(result).toContain('try again');
    });

    it('should handle token limit exceeded errors', async () => {
      mockPharmesolService.isPharmesolQuestion.mockResolvedValue(false);
      mockOpenAI.chat.completions.create.mockRejectedValue(
        new Error('This model\'s maximum context length is 4097 tokens')
      );

      const result = await service.generateChatResponse(mockContext);

      expect(result).toContain('technical difficulties');
    });

    it('should handle invalid API key errors', async () => {
      mockPharmesolService.isPharmesolQuestion.mockResolvedValue(false);
      mockOpenAI.chat.completions.create.mockRejectedValue(
        new Error('Incorrect API key provided')
      );

      const result = await service.generateChatResponse(mockContext);

      expect(result).toContain('technical difficulties');
    });

    it('should handle network timeout errors', async () => {
      mockPharmesolService.isPharmesolQuestion.mockResolvedValue(false);
      mockOpenAI.chat.completions.create.mockRejectedValue(
        new Error('ETIMEDOUT')
      );

      const result = await service.generateChatResponse(mockContext);

      expect(result).toContain('technical difficulties');
    });

    it('should handle empty responses from OpenAI', async () => {
      mockPharmesolService.isPharmesolQuestion.mockResolvedValue(false);
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: '' } }]
      } as any);

      const result = await service.generateChatResponse(mockContext);

      expect(result).toContain('trouble responding');
    });

    it('should handle malformed responses from OpenAI', async () => {
      mockPharmesolService.isPharmesolQuestion.mockResolvedValue(false);
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: []
      } as any);

      const result = await service.generateChatResponse(mockContext);

      expect(result).toContain('trouble responding');
    });

    it('should handle very long conversation histories', async () => {
      const longContext = {
        ...mockContext,
        conversation: Array.from({ length: 1000 }, (_, i) => ({
          role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
          content: `Message ${i} with some content to make it longer and test token limits`,
          timestamp: new Date(),
        })),
      };

      mockPharmesolService.isPharmesolQuestion.mockResolvedValue(false);
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: 'Response to long conversation' } }]
      } as any);

      const result = await service.generateChatResponse(longContext);

      expect(result).toBe('Response to long conversation');
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalled();
    });

    it('should handle special characters and unicode in conversation', async () => {
      const unicodeContext = {
        ...mockContext,
        conversation: [
          { 
            role: 'user' as const, 
            content: '🏥 Müller & O\'Reilly Pharmacy needs help with 薬局 management 💊', 
            timestamp: new Date() 
          }
        ],
      };

      mockPharmesolService.isPharmesolQuestion.mockResolvedValue(false);
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: 'Unicode response handled' } }]
      } as any);

      const result = await service.generateChatResponse(unicodeContext);

      expect(result).toBe('Unicode response handled');
    });

    it('should prioritize Pharmesol responses over OpenAI', async () => {
      mockPharmesolService.isPharmesolQuestion.mockResolvedValue(true);
      mockPharmesolService.getPharmesolResponse.mockReturnValue('Pharmesol response');

      const result = await service.generateChatResponse(mockContext);

      expect(result).toBe('Pharmesol response');
      expect(mockOpenAI.chat.completions.create).not.toHaveBeenCalled();
    });
  });

  describe('extractInformationFromResponse', () => {
    it('should handle valid JSON extraction', async () => {
      const validJson = '{"name": "Test Pharmacy", "contactPerson": "John Doe", "rxVolume": 5000}';
      
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: validJson } }]
      } as any);

      const result = await service.extractInformationFromResponse('Test message');

      expect(result).toEqual({
        name: 'Test Pharmacy',
        contactPerson: 'John Doe',
        rxVolume: 5000,
      });
    });

    it('should handle malformed JSON gracefully', async () => {
      const invalidJson = '{"name": "Test Pharmacy", "contactPerson": "John Doe"'; // Missing closing brace
      
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: invalidJson } }]
      } as any);

      const result = await service.extractInformationFromResponse('Test message');

      expect(result).toEqual({});
    });

    it('should handle empty extraction response', async () => {
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: '{}' } }]
      } as any);

      const result = await service.extractInformationFromResponse('Test message');

      expect(result).toEqual({});
    });

    it('should handle OpenAI extraction errors', async () => {
      mockOpenAI.chat.completions.create.mockRejectedValue(
        new Error('API Error')
      );

      const result = await service.extractInformationFromResponse('Test message');

      expect(result).toEqual({});
    });

    it('should handle non-JSON response from OpenAI', async () => {
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: 'This is not JSON' } }]
      } as any);

      const result = await service.extractInformationFromResponse('Test message');

      expect(result).toEqual({});
    });

    it('should handle extraction with special characters', async () => {
      const jsonWithSpecialChars = '{"name": "Müller & O\'Reilly Pharmacy", "email": "test+tag@domain.co.uk"}';
      
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: jsonWithSpecialChars } }]
      } as any);

      const result = await service.extractInformationFromResponse('Special chars message');

      expect(result).toEqual({
        name: 'Müller & O\'Reilly Pharmacy',
        email: 'test+tag@domain.co.uk',
      });
    });

    it('should handle very long extraction input', async () => {
      const longMessage = 'a'.repeat(10000);
      
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: '{"name": "Long Message Pharmacy"}' } }]
      } as any);

      const result = await service.extractInformationFromResponse(longMessage);

      expect(result).toEqual({ name: 'Long Message Pharmacy' });
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should recover from transient API errors', async () => {
      const context = {
        phoneNumber: '+1-555-123-4567',
        pharmacy: null,
        isNewLead: true,
        conversation: [
          { role: 'user' as const, content: 'Hello', timestamp: new Date() }
        ],
        collectingInfo: true,
      };

      mockPharmesolService.isPharmesolQuestion.mockResolvedValue(false);
      
      // First call fails
      mockOpenAI.chat.completions.create.mockRejectedValueOnce(
        new Error('Temporary failure')
      );
      
      let result = await service.generateChatResponse(context);
      expect(result).toContain('technical difficulties');

      // Second call succeeds
      mockOpenAI.chat.completions.create.mockResolvedValueOnce({
        choices: [{ message: { content: 'Recovery successful' } }]
      } as any);

      result = await service.generateChatResponse(context);
      expect(result).toBe('Recovery successful');
    });

    it('should handle partial service degradation', async () => {
      const context = {
        phoneNumber: '+1-555-123-4567',
        pharmacy: null,
        isNewLead: true,
        conversation: [
          { role: 'user' as const, content: 'Test message', timestamp: new Date() }
        ],
        collectingInfo: true,
      };

      // Chat completion works but extraction fails
      mockPharmesolService.isPharmesolQuestion.mockResolvedValue(false);
      mockOpenAI.chat.completions.create
        .mockResolvedValueOnce({
          choices: [{ message: { content: 'Chat response works' } }]
        } as any)
        .mockRejectedValueOnce(new Error('Extraction service down'));

      const chatResult = await service.generateChatResponse(context);
      expect(chatResult).toBe('Chat response works');

      const extractResult = await service.extractInformationFromResponse('Test');
      expect(extractResult).toEqual({});
    });
  });
});