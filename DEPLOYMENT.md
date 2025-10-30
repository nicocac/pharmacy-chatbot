# Pharmacy Chatbot - AWS Deployment Guide

This guide provides comprehensive instructions for deploying the Pharmacy Chatbot application to AWS.

## 🏗️ Architecture Overview

The application is deployed using a modern, scalable AWS architecture:

- **Frontend**: React app served via S3 + CloudFront CDN
- **Backend**: NestJS API running on ECS Fargate with Auto Scaling
- **Load Balancer**: Application Load Balancer for high availability
- **Storage**: S3 for static assets, ECR for container images
- **Secrets**: AWS Secrets Manager for secure API key storage
- **Monitoring**: CloudWatch dashboards, alarms, and log aggregation
- **CI/CD**: GitHub Actions for automated deployments

## 📋 Prerequisites

Before deploying, ensure you have:

1. **AWS Account** with appropriate permissions
2. **AWS CLI** installed and configured
3. **Docker** installed for local testing
4. **Node.js 18+** installed
5. **OpenAI API Key** for the chatbot functionality

## 🚀 Quick Deployment

### Option 1: Automated Script (Recommended)

```bash
# Clone the repository
git clone <your-repo-url>
cd pharmacy-chatbot

# Set up environment variables
export OPENAI_API_KEY="your-openai-api-key"
export AWS_REGION="us-east-1"  # Optional, defaults to us-east-1

# Run the deployment script
./scripts/deploy.sh
```

### Option 2: Manual Deployment

#### Step 1: Deploy Infrastructure

```bash
cd infrastructure
npm install

# Bootstrap CDK (first time only)
npx cdk bootstrap --region us-east-1

# Deploy the stack
npx cdk deploy --require-approval never
```

#### Step 2: Update OpenAI API Key

```bash
# Get the secret ARN from CDK outputs
SECRET_ARN=$(aws cloudformation describe-stacks \
  --stack-name PharmacyChatbotStack \
  --query 'Stacks[0].Outputs[?OutputKey==`OpenAISecretArn`].OutputValue' \
  --output text)

# Update the secret
aws secretsmanager update-secret \
  --secret-id $SECRET_ARN \
  --secret-string '{"openai_api_key":"your-openai-api-key"}'
```

#### Step 3: Build and Push Backend

```bash
# Get ECR repository URI
BACKEND_REPO=$(aws cloudformation describe-stacks \
  --stack-name PharmacyChatbotStack \
  --query 'Stacks[0].Outputs[?OutputKey==`BackendRepositoryUri`].OutputValue' \
  --output text)

# Login to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin $BACKEND_REPO

# Build and push
cd backend
docker build -t $BACKEND_REPO:latest .
docker push $BACKEND_REPO:latest
```

#### Step 4: Deploy Frontend

```bash
# Get CloudFront distribution domain
CLOUDFRONT_DOMAIN=$(aws cloudformation describe-stacks \
  --stack-name PharmacyChatbotStack \
  --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDistributionDomain`].OutputValue' \
  --output text)

# Build frontend
cd frontend
REACT_APP_API_URL="https://$CLOUDFRONT_DOMAIN" npm run build

# Deploy to S3
BUCKET_NAME=$(aws cloudformation describe-stacks \
  --stack-name PharmacyChatbotStack \
  --query 'Stacks[0].Outputs[?OutputKey==`FrontendBucketName`].OutputValue' \
  --output text)

aws s3 sync build/ s3://$BUCKET_NAME --delete

# Invalidate CloudFront cache
DISTRIBUTION_ID=$(aws cloudformation describe-stacks \
  --stack-name PharmacyChatbotStack \
  --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDistributionId`].OutputValue' \
  --output text)

aws cloudfront create-invalidation \
  --distribution-id $DISTRIBUTION_ID \
  --paths "/*"
```

## 🔄 CI/CD with GitHub Actions

### Setup

1. **Fork/Clone** the repository to your GitHub account

2. **Configure GitHub Secrets**:
   - `AWS_ACCESS_KEY_ID`: Your AWS access key
   - `AWS_SECRET_ACCESS_KEY`: Your AWS secret access key
   - `OPENAI_API_KEY`: Your OpenAI API key

3. **Push to main branch** to trigger automatic deployment

### Workflow Features

- **Automated Testing**: Runs unit tests and linting on every push
- **Infrastructure as Code**: Deploys AWS resources using CDK
- **Container Builds**: Builds and pushes Docker images to ECR
- **Zero-Downtime Deployments**: Updates ECS services with rolling updates
- **Cache Invalidation**: Automatically invalidates CloudFront cache

## 📊 Monitoring and Observability

### CloudWatch Dashboard

The deployment includes a comprehensive monitoring dashboard with:

- **ECS Service Metrics**: CPU/Memory utilization, task count
- **Load Balancer Metrics**: Request count, response times, error rates
- **CloudFront Metrics**: Cache hit ratio, origin requests
- **Application Logs**: Error rates and custom metrics

### Alerts

Automated alerts are configured for:

- High CPU/Memory usage (>80%)
- High response times (>2 seconds)
- HTTP 5xx errors
- Application error logs

### Accessing Monitoring

```bash
# Get dashboard URL from outputs
aws cloudformation describe-stacks \
  --stack-name PharmacyChatbotStack \
  --query 'Stacks[0].Outputs[?OutputKey==`DashboardUrl`].OutputValue' \
  --output text
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENAI_API_KEY` | OpenAI API key for chatbot | Required |
| `PHARMACY_API_URL` | External pharmacy API URL | Mock API |
| `NODE_ENV` | Node.js environment | production |
| `PORT` | Backend server port | 3001 |

### Scaling Configuration

The ECS service is configured with:
- **Min Capacity**: 1 task
- **Max Capacity**: 10 tasks
- **CPU Target**: 70% utilization
- **Scale Out/In Cooldown**: 5 minutes

## 🧪 Testing the Deployment

### Automated Tests

```bash
# Run full test suite
npm test

# Test Docker builds
docker-compose config
```

### Manual Testing

1. **Frontend**: Visit the CloudFront URL
2. **Backend API**: Test `/api/chatbot/pharmacies` endpoint
3. **Chat Flow**: Test conversation with existing pharmacy
4. **New Lead Flow**: Test with unknown phone number

### Health Checks

Both services include health check endpoints:
- **Backend**: `GET /` (returns 200 for healthy service)
- **Frontend**: `GET /health` (nginx health endpoint)

## 🔄 Updates and Maintenance

### Updating the Application

```bash
# For code changes
git push origin main  # Triggers CI/CD

# For infrastructure changes
cd infrastructure
npx cdk diff    # Preview changes
npx cdk deploy  # Apply changes
```

### Scaling the Service

```bash
# Manual scaling
aws ecs update-service \
  --cluster PharmacyChatbotCluster \
  --service PharmacyChatbotBackend \
  --desired-count 5
```

### Viewing Logs

```bash
# Backend logs
aws logs tail /aws/ecs/pharmacy-chatbot-backend --follow

# ECS service events
aws ecs describe-services \
  --cluster PharmacyChatbotCluster \
  --services PharmacyChatbotBackend
```

## 🔥 Troubleshooting

### Common Issues

1. **ECS Service Won't Start**
   - Check CloudWatch logs for container errors
   - Verify environment variables and secrets
   - Ensure Docker image is valid

2. **Frontend Not Loading**
   - Check S3 bucket contents
   - Verify CloudFront distribution status
   - Check browser network tab for errors

3. **API Errors**
   - Verify OpenAI API key is set correctly
   - Check external pharmacy API availability
   - Review backend application logs

### Recovery Procedures

```bash
# Restart ECS service
aws ecs update-service \
  --cluster PharmacyChatbotCluster \
  --service PharmacyChatbotBackend \
  --force-new-deployment

# Rebuild and redeploy
./scripts/deploy.sh

# Emergency rollback (if needed)
aws ecs update-service \
  --cluster PharmacyChatbotCluster \
  --service PharmacyChatbotBackend \
  --task-definition previous-task-definition-arn
```

## 💰 Cost Optimization

### Cost Breakdown (Estimated Monthly)

- **ECS Fargate**: ~$30-60 (2 tasks, 0.5 vCPU, 1GB RAM)
- **Application Load Balancer**: ~$20
- **CloudFront**: ~$5-15 (depending on traffic)
- **S3**: ~$1-5
- **ECR**: ~$1-3
- **Secrets Manager**: ~$1
- **CloudWatch**: ~$5-10

**Total**: ~$60-115/month (varies with usage)

### Cost Saving Tips

1. Use **Spot instances** for non-production environments
2. Set up **auto-scaling** to minimize idle resources
3. Enable **S3 lifecycle policies** for log archival
4. Use **CloudFront** caching to reduce origin requests

## 🗑️ Cleanup

To avoid ongoing charges, destroy the resources when no longer needed:

```bash
# Automated cleanup
./scripts/destroy.sh

# Manual cleanup
cd infrastructure
npx cdk destroy --force
```

## 🛡️ Security Best Practices

### Implemented Security Measures

- **Secrets Management**: API keys stored in AWS Secrets Manager
- **Network Security**: VPC with private subnets for ECS tasks
- **HTTPS Only**: CloudFront redirects HTTP to HTTPS
- **Container Security**: Non-root user, minimal base image
- **Access Control**: IAM roles with least privilege

### Additional Recommendations

1. **Enable AWS WAF** for additional protection
2. **Set up AWS Config** for compliance monitoring
3. **Use AWS Systems Manager** for secure parameter storage
4. **Enable VPC Flow Logs** for network monitoring

## 📞 Support

For issues or questions:

1. Check the **troubleshooting section** above
2. Review **CloudWatch logs** for errors
3. Check **GitHub Issues** for known problems
4. Create a **new issue** with detailed information

---

Happy deploying! 🚀