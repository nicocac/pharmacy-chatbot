import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import request from 'supertest';
import { AppModule } from '../app.module';

describe('Pharmacy Chatbot Integration Tests', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        AppModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Enable CORS and validation like in main.ts
    app.enableCors({
      origin: ['http://localhost:3000', 'http://localhost:5173'],
      credentials: true,
    });

    // Enable validation pipes
    app.useGlobalPipes(new ValidationPipe());

    // Set global prefix to match main.ts
    app.setGlobalPrefix('api');

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Full Conversation Flow - Existing Pharmacy', () => {
    const phoneNumber = '+1-555-TEST-EXISTING';

    it('should complete a full conversation with an existing pharmacy', async () => {
      // Step 1: Start chat
      const startResponse = await request(app.getHttpServer())
        .post('/api/chatbot/start')
        .send({ phoneNumber })
        .expect(201);

      expect(startResponse.body.success).toBe(true);
      expect(startResponse.body.message).toContain('Pharmesol');

      // Step 2: Send a message
      const messageResponse = await request(app.getHttpServer())
        .post('/api/chatbot/message')
        .send({
          phoneNumber,
          message:
            'I want to learn more about your services for high-volume pharmacies',
        })
        .expect(201);

      expect(messageResponse.body.success).toBe(true);
      expect(messageResponse.body.message).toBeTruthy();

      // Step 3: Schedule callback
      const callbackResponse = await request(app.getHttpServer())
        .post('/api/chatbot/schedule-callback')
        .send({
          phoneNumber,
          preferredTime: 'Tomorrow at 2 PM',
          notes: 'Discuss pricing and implementation',
        })
        .expect(201);

      expect(callbackResponse.body.success).toBe(true);
      expect(callbackResponse.body.message).toContain('callback');

      // Step 4: Send follow-up email
      const emailResponse = await request(app.getHttpServer())
        .post('/api/chatbot/send-email')
        .send({ phoneNumber })
        .expect(201);

      // This might fail if no email is available, which is expected for some test cases
      expect(emailResponse.body.success).toBeDefined();
    });
  });

  describe('Full Conversation Flow - New Lead', () => {
    const phoneNumber = '+1-800-TRULY-NEW-LEAD-' + Date.now().toString().slice(-5);

    it('should complete a full conversation with a new lead', async () => {
      // Step 1: Start chat (should be recognized as new lead)
      const startResponse = await request(app.getHttpServer())
        .post('/api/chatbot/start')
        .send({ phoneNumber })
        .expect(201);

      expect(startResponse.body.success).toBe(true);
      expect(startResponse.body.isNewLead).toBe(true);
      expect(startResponse.body.message).toContain('Pharmesol');

      // Step 2: Provide pharmacy information
      const infoResponse = await request(app.getHttpServer())
        .post('/api/chatbot/message')
        .send({
          phoneNumber,
          message:
            'Our pharmacy is called Test New Pharmacy, I am the manager Sarah Wilson, we are located at 123 Test Street, and we process about 4000 prescriptions per month. My email is sarah@testnewpharmacy.com',
        })
        .expect(201);

      expect(infoResponse.body.success).toBe(true);

      // Step 3: Continue conversation
      const followUpResponse = await request(app.getHttpServer())
        .post('/api/chatbot/message')
        .send({
          phoneNumber,
          message:
            'We are interested in reducing our operational costs. Can you help?',
        })
        .expect(201);

      expect(followUpResponse.body.success).toBe(true);

      // Step 4: Schedule callback
      const callbackResponse = await request(app.getHttpServer())
        .post('/api/chatbot/schedule-callback')
        .send({
          phoneNumber,
          preferredTime: 'Next week, Tuesday morning',
          notes: 'New lead interested in cost reduction',
        })
        .expect(201);

      expect(callbackResponse.body.success).toBe(true);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid phone number format', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/chatbot/start')
        .send({ phoneNumber: 'invalid-phone' })
        .expect(201);

      // Should still work as a new lead
      expect(response.body.success).toBe(true);
      expect(response.body.isNewLead).toBe(true);
    });

    it('should handle empty phone number', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/chatbot/start')
        .send({ phoneNumber: '' })
        .expect(400); // Should fail validation

      // Note: This test depends on validation being properly set up
    });

    it('should handle message without starting chat', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/chatbot/message')
        .send({
          phoneNumber: '+1-999-NEVER-STARTED-98765',
          message: 'Hello',
        })
        .expect(201);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('start a new conversation');
    });

    it('should handle callback scheduling without conversation', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/chatbot/schedule-callback')
        .send({
          phoneNumber: '+1-999-NO-CONVERSATION-54321',
          preferredTime: 'Tomorrow',
        })
        .expect(201);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    it('should handle email sending without conversation', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/chatbot/send-email')
        .send({ phoneNumber: '+1-999-NO-CONVERSATION-54321' })
        .expect(201);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });
  });

  describe('API Endpoints', () => {
    it('should get all pharmacies', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/chatbot/pharmacies')
        .expect(200);

      expect(response.body.success).toBeDefined();
      // The actual result depends on the mock API
    });

    it('should get conversation history', async () => {
      const phoneNumber = '+1-555-HISTORY-TEST';

      // First start a conversation
      await request(app.getHttpServer())
        .post('/api/chatbot/start')
        .send({ phoneNumber })
        .expect(201);

      // Then get the conversation
      const response = await request(app.getHttpServer())
        .get(`/api/chatbot/conversation/${phoneNumber}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.context).toBeDefined();
      expect(response.body.context.conversation).toBeDefined();
    });

    it('should handle getting non-existent conversation', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/chatbot/conversation/+1-555-NONEXISTENT')
        .expect(200);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });
  });

  describe('Stress Testing', () => {
    it('should handle multiple concurrent conversations', async () => {
      const phoneNumbers = [
        '+1-555-CONCURRENT-1',
        '+1-555-CONCURRENT-2',
        '+1-555-CONCURRENT-3',
        '+1-555-CONCURRENT-4',
        '+1-555-CONCURRENT-5',
      ];

      // Start multiple conversations concurrently
      const startPromises = phoneNumbers.map((phone) =>
        request(app.getHttpServer())
          .post('/api/chatbot/start')
          .send({ phoneNumber: phone }),
      );

      const startResponses = await Promise.all(startPromises);

      // All should succeed
      startResponses.forEach((response) => {
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
      });

      // Send messages concurrently
      const messagePromises = phoneNumbers.map((phone) =>
        request(app.getHttpServer()).post('/api/chatbot/message').send({
          phoneNumber: phone,
          message: 'Hello, I need help with my pharmacy operations',
        }),
      );

      const messageResponses = await Promise.all(messagePromises);

      // All should succeed
      messageResponses.forEach((response) => {
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
      });
    });

    it('should handle rapid sequential messages', async () => {
      const phoneNumber = '+1-555-RAPID-TEST';

      // Start conversation
      await request(app.getHttpServer())
        .post('/api/chatbot/start')
        .send({ phoneNumber })
        .expect(201);

      // Send multiple messages rapidly
      const messages = [
        'Hello',
        'I need help',
        'What services do you offer?',
        'How much does it cost?',
        'When can we start?',
      ];

      for (const message of messages) {
        const response = await request(app.getHttpServer())
          .post('/api/chatbot/message')
          .send({ phoneNumber, message })
          .expect(201);

        expect(response.body.success).toBe(true);
      }
    }, 10000);
  });

  describe('Data Validation', () => {
    it('should validate required fields for start chat', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/chatbot/start')
        .send({}) // Missing phoneNumber
        .expect(400);

      // Should fail validation
      expect(response.body.message).toBeDefined();
    });

    it('should validate required fields for send message', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/chatbot/message')
        .send({ phoneNumber: '+1-555-TEST' }) // Missing message
        .expect(400);

      // Should fail validation
      expect(response.body.message).toBeDefined();
    });

    it('should validate required fields for callback scheduling', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/chatbot/schedule-callback')
        .send({ phoneNumber: '+1-555-TEST' }) // Missing preferredTime
        .expect(400);

      // Should fail validation
      expect(response.body.message).toBeDefined();
    });
  });
});
