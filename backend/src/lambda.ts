import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import serverlessExpress from '@codegenie/serverless-express';
import { Context, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import express from 'express';

let server: any;

async function bootstrap() {
  const expressApp = express();
  const adapter = new ExpressAdapter(expressApp);
  
  const app = await NestFactory.create(AppModule, adapter);
  
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
  
  return serverlessExpress({ app: expressApp });
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