import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import serverlessExpress from '@codegenie/serverless-express';
import { Context, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

let server: any;

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn'],
    abortOnError: false,
  });
  
  // Enable CORS
  app.enableCors({
    origin: true,
    credentials: true,
  });
  
  // Enable validation
  app.useGlobalPipes(new ValidationPipe());
  
  // Set global prefix
  app.setGlobalPrefix('api');
  
  await app.init();
  
  return serverlessExpress({ app: app.getHttpAdapter().getInstance() });
}

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context,
): Promise<APIGatewayProxyResult> => {
  if (!server) {
    server = await bootstrap();
  }
  
  return server(event, context);
};