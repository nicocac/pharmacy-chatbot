#!/bin/bash

# SST Destroy Script for Pharmacy Chatbot
# This script removes all AWS resources created by SST

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${RED}🗑️  SST Destroy Script for Pharmacy Chatbot${NC}"

# Set stage (default to dev if not provided)
STAGE=${1:-dev}
echo -e "${YELLOW}⚠️ This will destroy all resources for stage: ${STAGE}${NC}"

# Confirmation prompt
read -p "Are you sure you want to continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}❌ Destruction cancelled${NC}"
    exit 1
fi

echo -e "${YELLOW}🔧 Removing SST resources...${NC}"

# Remove with SST
if [ "$STAGE" = "production" ]; then
    npx sst remove --stage production
else
    npx sst remove --stage $STAGE
fi

echo -e "${GREEN}✅ All resources have been removed successfully!${NC}"
echo -e "${BLUE}💡 Your AWS account is now clean of Pharmacy Chatbot resources${NC}"