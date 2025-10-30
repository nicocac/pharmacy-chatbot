# Pharmacy Sales Chatbot

A sophisticated inbound sales chatbot for Pharmesol that handles calls from pharmacies, recognizes returning customers, collects information from new leads, and showcases how Pharmesol can support high prescription volume pharmacies.

## ✨ Features

- **🔍 Caller Recognition**: Automatically identifies returning pharmacies using phone number lookup
- **🔌 External API Integration**: Fetches pharmacy details from external API
- **📝 New Lead Management**: Collects information from unrecognized callers
- **🤖 AI-Powered Conversations**: Uses OpenAI GPT-4 for natural, context-aware responses
- **📧 Follow-up Actions**: Mock email sending and callback scheduling
- **📊 High-Volume Focus**: Tailors messaging based on pharmacy prescription volume
- **💻 Modern UI**: React-based testing interface with real-time chat
- **☁️ Cloud Ready**: Full AWS deployment with auto-scaling and monitoring

## 🏗️ Architecture

### Production AWS Architecture (SST)
- **Frontend**: React app served via S3 + CloudFront CDN
- **Backend**: NestJS API running on AWS Lambda (serverless)
- **API Gateway**: HTTP API for Lambda function access
- **Storage**: S3 for static assets
- **Secrets**: AWS Secrets Manager for secure API key storage
- **Monitoring**: CloudWatch logs and SST Console
- **CI/CD**: GitHub Actions for automated deployments

### Application Components

#### Backend (NestJS)
- **PharmacyService**: Handles external API integration for pharmacy lookup
- **OpenAIService**: Manages AI-powered conversation generation
- **FollowUpService**: Handles mock email and callback scheduling
- **ChatbotController**: Orchestrates conversation flow and state management

#### Frontend (React + TypeScript)
- **ChatInterface**: Real-time chat simulation with typing indicators
- **PharmacyList**: Directory of test pharmacies with one-click calling
- **API Integration**: Seamless communication with backend services

## 🚀 Quick Start

### Local Development

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd pharmacy-chatbot
   ```

2. **Set up environment variables**
   ```bash
   # Backend
   cp backend/.env.example backend/.env
   # Edit backend/.env (set OPENAI_API_KEY and other values as needed)

   # Frontend (optional)
   # Create frontend/.env.local if you need to override defaults
   echo "REACT_APP_API_URL=http://localhost:3001" > frontend/.env.local
   ```

3. **Start with Docker Compose**
   ```bash
   docker-compose up --build
   ```

4. **Or run locally (without Docker)**
   ```bash
   # From repo root
   npm run start        # runs ./run-local.sh (backend hot + frontend dev)
   ```

   Advanced:
   ```bash
   # Run services individually (from separate terminals)
   npm run backend:dev  # NestJS with hot reload on :3001
   npm run frontend:dev # React dev server on :3000
   ```

5. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001

### AWS Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete deployment instructions.

**Quick Deploy:**
```bash
# Set up your OpenAI API key
export OPENAI_API_KEY="your-openai-api-key"

# Deploy with SST
npm run deploy

# Or use the deployment script
./scripts/deploy-sst.sh production
```

## 🧪 Testing

### Test Scenarios
- **Existing Pharmacy**: Use any pharmacy from the directory (e.g., HealthFirst Pharmacy: +1-555-123-4567)
- **New Lead**: Use phone number `+1-555-NEW-LEAD`
- **Error Handling**: Use phone number `+1-555-INVALID`

### Running Tests
```bash
# Backend tests
cd backend
npm run test        # Unit tests
npm run test:e2e    # Integration tests
npm run test:cov    # Coverage report

# Frontend tests
cd frontend
npm test
```

## 📊 Monitoring (Production)

The AWS deployment includes comprehensive monitoring:
- **Lambda Metrics**: Invocations, duration, error rates
- **API Gateway Metrics**: Request count, response times, error rates
- **CloudFront Metrics**: Cache hit ratio, origin requests
- **Application Logs**: Error rates and custom metrics
- **Automated Alerts**: For high resource usage, errors, and response times

## 🔧 Configuration

### Environment Variables

Backend (backend/.env or backend/.env.example):
- OPENAI_API_KEY: Your OpenAI API key (required)
- PHARMACY_API_URL: External pharmacy API base URL (optional for mocks)
- PORT: Backend server port (default: 3001)
- NODE_ENV: Node.js environment (default: development)

Frontend (frontend/.env.local):
- REACT_APP_API_URL: Backend API base URL for the frontend (default: http://localhost:3001)

### AWS Configuration

The production infrastructure is defined with SST (Serverless Stack) and includes:
- AWS Lambda for the backend API (NestJS handler)
- API Gateway (HTTP API) routing to Lambda
- S3 + CloudFront for hosting the React frontend
- AWS Secrets Manager for secure key storage (OpenAI API key, etc.)
- CloudWatch logging and metrics; SST Console for live debugging
- Optional custom domains and CI/CD via GitHub Actions

## 📁 Project Structure

```
pharmacy-chatbot/
├── backend/                   # NestJS API server
│   ├── src/
│   │   ├── controllers/       # API endpoints
│   │   ├── services/          # Business logic (OpenAI, pharmacy, etc.)
│   │   └── tests/             # Unit and integration tests
│   ├── .env.example           # Backend env vars template
│   ├── Dockerfile             # Container configuration
│   └── package.json           # Dependencies & scripts
├── frontend/                  # React application
│   ├── src/
│   │   ├── components/        # UI components
│   │   ├── services/          # API integration
│   │   └── types/             # TypeScript types
│   ├── .env.local             # Frontend local env overrides
│   ├── Dockerfile             # Container configuration
│   └── package.json           # Dependencies & scripts
├── scripts/                   # Helper/deployment scripts
├── docker-compose.yml         # Local multi-service setup
├── run-local.sh               # Local dev runner (backend + frontend)
├── sst.config.ts              # SST app configuration
├── sst-env.d.ts               # SST typings
├── DEPLOYMENT.md              # Deployment guide
├── package.json               # Root scripts (start/dev/deploy)
└── README.md                  # This file
```

## 🚢 Deployment Options

### 1. Local Development
- Docker Compose for full local stack
- Individual service development mode
- Hot reload and debugging enabled

### 2. AWS Production
- Fully managed, auto-scaling infrastructure
- CI/CD pipeline with GitHub Actions
- Monitoring and alerting included
- Production-ready security and performance

### 3. Manual AWS Deployment
- Step-by-step deployment using AWS CLI
- Infrastructure as Code with CDK
- Custom configuration options

## 🔒 Security Features

- **Secrets Management**: OpenAI API key stored in AWS Secrets Manager
- **Network Security**: VPC with private subnets for backend services
- **HTTPS Only**: CloudFront enforces HTTPS for all requests
- **Container Security**: Non-root user, minimal attack surface
- **Access Control**: IAM roles with least privilege principle

## 💡 Key Capabilities

### AI-Powered Conversations
- Context-aware responses using OpenAI GPT-4
- Dynamic conversation flow based on caller type
- Automatic information extraction from natural language
- Prescription volume-based messaging

### Smart Data Handling
- Phone number normalization (handles various formats)
- External API integration with error handling
- Automatic pharmacy record creation for new leads
- Real-time conversation state management

### Production Ready
- Auto-scaling based on demand
- Health checks and circuit breakers
- Comprehensive logging and monitoring
- Zero-downtime deployments

## 🔄 CI/CD Pipeline

The GitHub Actions workflow includes:
- **Automated Testing**: Unit tests, integration tests, linting
- **Security Scanning**: Container vulnerability scanning
- **Infrastructure Deployment**: SST stack deployment
- **Application Deployment**: Lambda function updates
- **Cache Management**: CloudFront cache invalidation

## 📈 Performance & Scaling

### Current Configuration
- **Backend**: 2 ECS Fargate tasks (0.5 vCPU, 1GB RAM each)
- **Auto Scaling**: 1-10 tasks based on CPU utilization
- **Load Balancer**: Application Load Balancer with health checks
- **CDN**: CloudFront with global edge locations

## 🛠️ Development

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- AWS CLI (for deployment)
- OpenAI API Key

### Getting Started
1. Clone the repository
2. Copy `.env.example` to `.env` and configure
3. Run `docker-compose up` for full local development
4. Access frontend at http://localhost:3000

### Adding Features
- Backend changes: Modify NestJS services/controllers
- Frontend changes: Update React components
- Infrastructure changes: Update CDK stacks
- Tests: Add unit/integration tests for new features

## 📞 Support & Contributing

- **Issues**: Report bugs or request features via GitHub Issues
- **Documentation**: See [DEPLOYMENT.md](./DEPLOYMENT.md) for deployment details
- **Architecture**: Review SST configuration in `sst.config.ts` and `/sst` folder for AWS setup
- **Testing**: Run test suites before submitting pull requests

## 🔮 Future Enhancements

- Real voice integration with telephony APIs
- Advanced conversation analytics and reporting
- CRM system integration (Salesforce, HubSpot)
- Multi-language support and localization
- Advanced lead scoring and qualification
- Integration with email marketing platforms
- Conversation recording and analysis
- A/B testing for conversation flows

---

**Built with ❤️ for Pharmesol** - Demonstrating modern AI-powered customer engagement solutions.