#!/bin/bash

# Development Setup Script for Pharmacy Chatbot
# Sets up hot reload environment for optimal development experience

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔧 Setting up Development Environment with Hot Reload${NC}"

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

echo -e "${GREEN}✅ Prerequisites check passed${NC}"

# Install dependencies
echo -e "${YELLOW}📦 Installing dependencies...${NC}"

# Backend dependencies
echo -e "${BLUE}Installing backend dependencies...${NC}"
cd backend
npm install

# Frontend dependencies
echo -e "${BLUE}Installing frontend dependencies...${NC}"
cd ../frontend
npm install

echo -e "${GREEN}✅ All dependencies installed${NC}"

# Setup environment files
echo -e "${YELLOW}⚙️ Setting up environment configuration...${NC}"

# Create .env.local from example if it doesn't exist
if [ ! -f ".env.local" ]; then
    cp .env.local.example .env.local
    echo -e "${GREEN}✅ Created .env.local from example${NC}"
    echo -e "${YELLOW}💡 You can modify .env.local to customize your local development environment${NC}"
else
    echo -e "${BLUE}ℹ️ .env.local already exists${NC}"
fi

cd ..

echo -e "${GREEN}🎉 Development environment setup complete!${NC}"
echo -e "${YELLOW}📝 Available commands:${NC}"
echo -e "${BLUE}  ./run-local.sh           - Run both services with hot reload${NC}"
echo -e "${BLUE}  cd backend && npm run start:hot  - Run only backend with hot reload${NC}"
echo -e "${BLUE}  cd frontend && npm run start:dev - Run only frontend with hot reload${NC}"
echo -e "${BLUE}  npm run sst:dev          - Run SST in development mode${NC}"
echo -e "${BLUE}  npm run sst:console      - Open SST console for monitoring${NC}"
echo ""
echo -e "${GREEN}🚀 Run './run-local.sh' to start development servers${NC}"
echo -e "${GREEN}☁️ Run 'npm run sst:dev' for serverless development with AWS${NC}"