# Pharmacy Chatbot Deployment Guide

This guide covers the deployment of the Pharmacy Chatbot application to AWS using SST (Serverless Stack).

## Prerequisites

- AWS Account with appropriate permissions
- AWS CLI installed and configured
- Node.js (version 18 or later)
- Git

## Architecture Overview

The application is deployed using the following AWS services:

- **AWS Lambda**: Runs the NestJS backend API (serverless)
- **Amazon S3**: Hosts the React frontend
- **Amazon CloudFront**: CDN for the frontend with optimized caching
- **AWS Secrets Manager**: Stores the OpenAI API key
- **API Gateway**: HTTP API for the Lambda function
- **IAM Roles**: Secure access management

## Why SST?

SST (Serverless Stack) provides several advantages over CDK:

- **Live Lambda Development**: Test your functions locally against real AWS resources
- **Better DX**: Simplified configuration and deployment
- **Cost Effective**: Pay only for what you use with serverless architecture
- **Faster Deployments**: Incremental deployments and hot swapping
- **Type Safety**: Full TypeScript support throughout

## Deployment Steps

### 1. Clone the Repository

```bash
git clone <repository-url>
cd pharmacy-chatbot
```

### 2. Install Dependencies

```bash
# Install root dependencies (includes SST)
npm install

# Install backend dependencies
cd backend
npm install
cd ..

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### 3. Configure AWS Credentials

```bash
aws configure
```

### 4. Deploy with SST

#### Development Deployment

```bash
# Deploy to development stage
npm run sst:dev

# Or use the deployment script
./scripts/deploy-sst.sh dev
```

#### Production Deployment

```bash
# Build and deploy to production
npm run deploy

# Or use the deployment script for production
./scripts/deploy-sst.sh production
```

This will:
1. Build the backend NestJS application
2. Build the React frontend
3. Deploy Lambda function for the API
4. Deploy frontend to S3 with CloudFront
5. Create necessary AWS resources
6. Output the deployment URLs

### 5. Set OpenAI API Key

After deployment, set your OpenAI API key as a secret:

```bash
# Set the secret value (replace with your actual key)
sst secret set OpenAIAPIKey "your-openai-api-key-here"
```

## Environment Variables

### Backend Environment Variables (Lambda)

- `NODE_ENV`: Set to 'production'
- `OPENAI_API_KEY`: Retrieved from SST Secret
- `PHARMACY_API_URL`: External API endpoint for pharmacy data

### Frontend Environment Variables

- `REACT_APP_API_URL`: Backend API URL (automatically configured by SST)

## Development with SST

### Live Lambda Development

SST's Live Lambda Development allows you to test your functions locally:

```bash
# Start live development
sst dev

# Your Lambda functions will run locally but connect to real AWS resources
```

### SST Console

Monitor your application with the SST Console:

```bash
# Open the SST console
sst console
```

The console provides:
- Real-time logs
- Function metrics
- Secret management
- Resource overview

## Monitoring and Logs

### CloudWatch Logs

Backend logs are available in CloudWatch at:
- Log Group: `/aws/lambda/pharmacy-chatbot-<stage>-PharmacyChatbotApi`

### Function Monitoring

Monitor through:
- SST Console (recommended)
- AWS Lambda Console
- CloudWatch Metrics

## Scaling

Lambda automatically scales based on demand:
- **Concurrent Executions**: Up to 1000 by default (can be increased)
- **Cold Start Optimization**: SST optimizes bundle size for faster cold starts
- **Auto Scaling**: No configuration needed, handles traffic spikes automatically

## Security

### Network Security
- Lambda functions run in AWS managed VPC by default
- API Gateway provides DDoS protection
- CloudFront provides additional security headers

### Secrets Management
- OpenAI API key stored as SST Secret (backed by AWS Secrets Manager)
- IAM roles with least privilege access
- No long-lived credentials in code

### HTTPS/SSL
- API Gateway provides HTTPS endpoints
- CloudFront enforces HTTPS for frontend
- Automatic SSL certificate management

## Cost Optimization

### Serverless Benefits
- **Pay per Request**: No idle costs
- **No Server Management**: No EC2 instances to manage
- **Automatic Scaling**: No over-provisioning needed

### Cost Monitoring
- Use AWS Cost Explorer
- Monitor Lambda invocations and duration
- CloudFront has generous free tier

## Troubleshooting

### Common Issues

1. **Lambda Function Errors**
   ```bash
   # View real-time logs
   sst dev
   
   # Or check CloudWatch logs
   aws logs tail /aws/lambda/pharmacy-chatbot-dev-PharmacyChatbotApi --follow
   ```

2. **Frontend Not Loading**
   - Check CloudFront distribution
   - Verify S3 bucket deployment
   - Ensure build completed successfully

3. **API Not Responding**
   - Check Lambda function logs
   - Verify API Gateway configuration
   - Check SST console for errors

### Useful Commands

```bash
# View deployment status
sst status

# View all resources
sst console

# Update a specific function
sst deploy --stage dev

# View logs
sst logs --stage dev

# Remove deployment
sst remove --stage dev
```

## Stage Management

SST supports multiple stages:

```bash
# Deploy to development
sst deploy --stage dev

# Deploy to staging
sst deploy --stage staging

# Deploy to production
sst deploy --stage production
```

Each stage is isolated with its own resources.

## Cleanup

To remove all AWS resources:

```bash
# Remove development stage
sst remove --stage dev

# Remove production stage
sst remove --stage production

# Or use the destroy script
./scripts/destroy-sst.sh <stage>
```

## Migration from CDK

The previous CDK infrastructure has been backed up to `infrastructure-cdk-backup/`. Key differences:

### Before (CDK + ECS)
- ECS Fargate containers
- Application Load Balancer
- Always-on infrastructure
- Complex networking setup

### After (SST + Lambda)
- Serverless Lambda functions
- API Gateway
- Pay-per-use pricing
- Simplified architecture

### Benefits of Migration
- **Lower Costs**: No always-on containers
- **Better DX**: Live development with SST
- **Faster Deployments**: Incremental updates
- **Easier Scaling**: Automatic Lambda scaling
- **Simpler Ops**: No container management

## Support

For deployment issues:
1. Check SST console first (`sst console`)
2. Review CloudWatch logs
3. Use `sst dev` for local debugging
4. Check SST documentation: https://docs.sst.dev/
5. Contact your AWS support team if needed

## Useful Resources

- [SST Documentation](https://docs.sst.dev/)
- [SST Examples](https://github.com/sst/sst/tree/master/examples)
- [AWS Lambda Best Practices](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)