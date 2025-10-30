#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { PharmacyChatbotStack } from '../lib/pharmacy-chatbot-stack';

const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
};

new PharmacyChatbotStack(app, 'PharmacyChatbotStack', {
  env,
  description: 'Pharmacy Chatbot Infrastructure - NestJS Backend + React Frontend',
});