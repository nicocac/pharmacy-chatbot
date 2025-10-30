#!/bin/bash

# SST Deployment Script for Pharmacy Chatbot
# This script deploys the application using SST to AWS

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting SST Deployment for Pharmacy Chatbot${NC}"

# Check prerequisites
echo -e "${YELLOW}📋 Checking prerequisites...${NC}"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install it first.${NC}"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed. Please install it first.${NC}"
    exit 1
fi

# Check if AWS CLI is configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}❌ AWS CLI is not configured. Please run 'aws configure' first.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites check passed${NC}"

# Check if SST is available (via npx)
if ! npx sst version &> /dev/null; then
    echo -e "${RED}❌ SST is not available. Please run 'npm install' first.${NC}"
    exit 1
fi

# Set stage (default to dev if not provided)
STAGE=${1:-dev}
echo -e "${BLUE}📦 Deploying to stage: ${STAGE}${NC}"

# Build backend
echo -e "${YELLOW}🔧 Building backend...${NC}"
cd backend
npm install
npm run build
cd ..

# Build frontend
echo -e "${YELLOW}🎨 Building frontend...${NC}"
cd frontend
npm install
npm run build
cd ..

# Deploy with SST
echo -e "${YELLOW}☁️ Deploying to AWS with SST...${NC}"
if [ "$STAGE" = "production" ]; then
    npx sst deploy --stage production
else
    npx sst deploy --stage $STAGE
fi

echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo -e "${BLUE}💡 You can monitor your deployment with: npx sst console${NC}"
echo -e "${BLUE}🔗 Check the deployed URLs in the SST console${NC}"