#!/bin/bash

# Pharmacy Chatbot Deployment Script
# This script deploys the application to AWS

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
AWS_REGION=${AWS_REGION:-us-east-1}
STACK_NAME=${STACK_NAME:-PharmacyChatbotStack}

echo -e "${GREEN}🚀 Starting Pharmacy Chatbot Deployment${NC}"

# Check prerequisites
echo -e "${YELLOW}📋 Checking prerequisites...${NC}"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI is not installed. Please install it first.${NC}"
    exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed. Please install it first.${NC}"
    exit 1
fi

# Check if CDK is installed
if ! command -v cdk &> /dev/null; then
    echo -e "${RED}❌ AWS CDK is not installed. Installing it now...${NC}"
    npm install -g aws-cdk
fi

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}❌ AWS credentials not configured. Please run 'aws configure' first.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites check passed${NC}"

# Deploy infrastructure
echo -e "${YELLOW}🏗️  Deploying infrastructure...${NC}"
cd infrastructure
npm install

# Bootstrap CDK if needed
echo -e "${YELLOW}🔧 Bootstrapping CDK...${NC}"
cdk bootstrap --region $AWS_REGION

# Deploy the stack
echo -e "${YELLOW}📦 Deploying CloudFormation stack...${NC}"
cdk deploy --require-approval never --outputs-file outputs.json

if [ ! -f outputs.json ]; then
    echo -e "${RED}❌ Deployment failed - outputs.json not found${NC}"
    exit 1
fi

# Extract outputs
BACKEND_REPO=$(jq -r '.PharmacyChatbotStack.BackendRepositoryUri' outputs.json)
FRONTEND_BUCKET=$(jq -r '.PharmacyChatbotStack.FrontendBucketName' outputs.json)
CLOUDFRONT_ID=$(jq -r '.PharmacyChatbotStack.CloudFrontDistributionId' outputs.json)
CLOUDFRONT_DOMAIN=$(jq -r '.PharmacyChatbotStack.CloudFrontDistributionDomain' outputs.json)
BACKEND_SERVICE=$(jq -r '.PharmacyChatbotStack.BackendServiceName' outputs.json)
CLUSTER_NAME=$(jq -r '.PharmacyChatbotStack.ECSClusterName' outputs.json)
OPENAI_SECRET_ARN=$(jq -r '.PharmacyChatbotStack.OpenAISecretArn' outputs.json)

echo -e "${GREEN}✅ Infrastructure deployed successfully${NC}"

cd ..

# Update OpenAI API Key in Secrets Manager
if [ -n "$OPENAI_API_KEY" ]; then
    echo -e "${YELLOW}🔑 Updating OpenAI API Key in Secrets Manager...${NC}"
    aws secretsmanager update-secret \
        --secret-id "$OPENAI_SECRET_ARN" \
        --secret-string "{\"openai_api_key\":\"$OPENAI_API_KEY\"}" \
        --region $AWS_REGION
    echo -e "${GREEN}✅ OpenAI API Key updated${NC}"
else
    echo -e "${YELLOW}⚠️  OPENAI_API_KEY environment variable not set. Please update it manually in AWS Secrets Manager.${NC}"
fi

# Build and push backend
echo -e "${YELLOW}🐳 Building and pushing backend Docker image...${NC}"
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $BACKEND_REPO

cd backend
docker build -t $BACKEND_REPO:latest .
docker push $BACKEND_REPO:latest
cd ..

echo -e "${GREEN}✅ Backend image pushed successfully${NC}"

# Force ECS service update
echo -e "${YELLOW}🔄 Updating ECS service...${NC}"
aws ecs update-service \
    --cluster $CLUSTER_NAME \
    --service $BACKEND_SERVICE \
    --force-new-deployment \
    --region $AWS_REGION

echo -e "${YELLOW}⏳ Waiting for ECS service to stabilize...${NC}"
aws ecs wait services-stable \
    --cluster $CLUSTER_NAME \
    --services $BACKEND_SERVICE \
    --region $AWS_REGION

echo -e "${GREEN}✅ Backend service updated successfully${NC}"

# Build and deploy frontend
echo -e "${YELLOW}⚛️  Building and deploying frontend...${NC}"
cd frontend
npm install

# Build with API URL pointing to CloudFront
REACT_APP_API_URL="https://$CLOUDFRONT_DOMAIN" npm run build

# Deploy to S3
aws s3 sync build/ s3://$FRONTEND_BUCKET --delete --region $AWS_REGION

# Invalidate CloudFront cache
echo -e "${YELLOW}🌐 Invalidating CloudFront cache...${NC}"
INVALIDATION_ID=$(aws cloudfront create-invalidation \
    --distribution-id $CLOUDFRONT_ID \
    --paths "/*" \
    --query 'Invalidation.Id' \
    --output text)

echo -e "${YELLOW}⏳ Waiting for CloudFront invalidation to complete...${NC}"
aws cloudfront wait invalidation-completed \
    --distribution-id $CLOUDFRONT_ID \
    --id $INVALIDATION_ID

cd ..

echo -e "${GREEN}✅ Frontend deployed successfully${NC}"

# Test the deployment
echo -e "${YELLOW}🧪 Testing deployment...${NC}"

# Wait a bit for everything to be ready
sleep 30

# Test backend API
echo "Testing backend API..."
if curl -f -s "https://$CLOUDFRONT_DOMAIN/api/chatbot/pharmacies" > /dev/null; then
    echo -e "${GREEN}✅ Backend API is responding${NC}"
else
    echo -e "${YELLOW}⚠️  Backend API test failed (may take a few minutes to be ready)${NC}"
fi

# Test frontend
echo "Testing frontend..."
if curl -f -s "https://$CLOUDFRONT_DOMAIN" > /dev/null; then
    echo -e "${GREEN}✅ Frontend is responding${NC}"
else
    echo -e "${YELLOW}⚠️  Frontend test failed (may take a few minutes to be ready)${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo ""
echo -e "${YELLOW}📋 Deployment Summary:${NC}"
echo "  • Frontend URL: https://$CLOUDFRONT_DOMAIN"
echo "  • Backend API: https://$CLOUDFRONT_DOMAIN/api"
echo "  • CloudFront Distribution ID: $CLOUDFRONT_ID"
echo "  • ECS Cluster: $CLUSTER_NAME"
echo "  • ECS Service: $BACKEND_SERVICE"
echo ""
echo -e "${YELLOW}🔧 Next steps:${NC}"
echo "  1. Update the OpenAI API key in AWS Secrets Manager if not done already"
echo "  2. Test the application functionality"
echo "  3. Set up monitoring and alerts"
echo ""
echo -e "${GREEN}Happy chatting! 🤖💬${NC}"