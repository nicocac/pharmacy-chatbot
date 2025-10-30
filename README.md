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

### Production AWS Architecture
- **Frontend**: React app served via S3 + CloudFront CDN
- **Backend**: NestJS API running on ECS Fargate with Auto Scaling
- **Load Balancer**: Application Load Balancer for high availability
- **Storage**: S3 for static assets, ECR for container images
- **Secrets**: AWS Secrets Manager for secure API key storage
- **Monitoring**: CloudWatch dashboards, alarms, and log aggregation
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
   cp .env.example .env
   # Edit .env with your OpenAI API key
   ```

3. **Start with Docker Compose**
   ```bash
   docker-compose up --build
   ```

4. **Or run manually**
   ```bash
   # Backend
   cd backend && npm install && npm run start:dev
   
   # Frontend (new terminal)
   cd frontend && npm install && npm start
   ```

5. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001

### AWS Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete deployment instructions.

**Quick Deploy:**
```bash
export OPENAI_API_KEY="your-openai-api-key"
./scripts/deploy.sh
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
- **ECS Service Metrics**: CPU/Memory utilization, task count
- **Load Balancer Metrics**: Request count, response times, error rates
- **CloudFront Metrics**: Cache hit ratio, origin requests
- **Application Logs**: Error rates and custom metrics
- **Automated Alerts**: For high resource usage, errors, and response times

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENAI_API_KEY` | OpenAI API key for chatbot | Required |
| `PHARMACY_API_URL` | External pharmacy API URL | Mock API |
| `NODE_ENV` | Node.js environment | development |
| `PORT` | Backend server port | 3001 |

### AWS Configuration

The infrastructure is defined using AWS CDK and includes:
- Auto-scaling ECS Fargate services
- CloudFront distribution with S3 origin
- Secrets Manager for secure key storage
- CloudWatch monitoring and alerting
- VPC with private subnets for security

## 📁 Project Structure

```
pharmacy-chatbot/
├── backend/                 # NestJS API server
│   ├── src/
│   │   ├── controllers/     # API endpoints
│   │   ├── services/        # Business logic
│   │   ├── dto/            # Data transfer objects
│   │   ├── interfaces/     # TypeScript interfaces
│   │   └── tests/          # Unit and integration tests
│   ├── Dockerfile          # Container configuration
│   └── package.json        # Dependencies
├── frontend/               # React application
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── services/       # API integration
│   │   └── types/          # TypeScript types
│   ├── Dockerfile          # Container configuration
│   └── package.json        # Dependencies
├── infrastructure/         # AWS CDK infrastructure
│   ├── lib/                # CDK stack definitions
│   └── bin/                # CDK entry point
├── .github/workflows/      # GitHub Actions CI/CD
├── scripts/                # Deployment scripts
├── docker-compose.yml      # Local development
├── DEPLOYMENT.md          # Deployment guide
└── README.md              # This file
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
- **Infrastructure Deployment**: CDK stack deployment
- **Application Deployment**: Container builds and ECS updates
- **Cache Management**: CloudFront cache invalidation

## 📈 Performance & Scaling

### Current Configuration
- **Backend**: 2 ECS Fargate tasks (0.5 vCPU, 1GB RAM each)
- **Auto Scaling**: 1-10 tasks based on CPU utilization
- **Load Balancer**: Application Load Balancer with health checks
- **CDN**: CloudFront with global edge locations

### Estimated Costs
- **Development**: ~$0 (local development)
- **Production**: ~$60-115/month (depending on usage)

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
- **Architecture**: Review CDK stacks in `/infrastructure` for AWS setup
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