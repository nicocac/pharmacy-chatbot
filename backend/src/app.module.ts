import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ChatbotController } from './controllers/chatbot.controller';
import { PharmacyService } from './services/pharmacy.service';
import { OpenAIService } from './services/openai.service';
import { FollowUpService } from './services/followup.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
  controllers: [AppController, ChatbotController],
  providers: [AppService, PharmacyService, OpenAIService, FollowUpService],
})
export class AppModule {}
