#!/bin/bash

# Pharmacy Chatbot Destruction Script
# This script destroys the AWS resources

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}⚠️  This will destroy all AWS resources for the Pharmacy Chatbot${NC}"
read -p "Are you sure you want to continue? (yes/no): " -r
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo -e "${GREEN}Aborted${NC}"
    exit 0
fi

echo -e "${RED}🗑️  Starting destruction process...${NC}"

cd infrastructure

# Get outputs before destroying
if [ -f outputs.json ]; then
    FRONTEND_BUCKET=$(jq -r '.PharmacyChatbotStack.FrontendBucketName' outputs.json)
    
    # Empty S3 bucket first
    if [ "$FRONTEND_BUCKET" != "null" ]; then
        echo -e "${YELLOW}🪣 Emptying S3 bucket...${NC}"
        aws s3 rm s3://$FRONTEND_BUCKET --recursive || true
    fi
fi

# Destroy the stack
echo -e "${YELLOW}💥 Destroying CloudFormation stack...${NC}"
cdk destroy --force

echo -e "${GREEN}✅ Resources destroyed successfully${NC}"