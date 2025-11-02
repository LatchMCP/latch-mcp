# Latch - Open Payment Layer for MCP Servers

> **Where compute meets commerce.** The open payment layer for MCPs (Model Context Protocol), x402 apps, and intelligent systems. Instant, verifiable, machine-to-machine payments.

[![Next.js](https://img.shields.io/badge/Next.js-15.4-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

## 🚀 Overview

Latch is a platform that enables monetization of MCP (Model Context Protocol) servers through blockchain payments. It provides a complete infrastructure for:

- **MCP Server Registration** - Register and discover MCP servers
- **Payment Integration** - x402 protocol support for EVM and Solana blockchains
- **Wallet Management** - Multi-chain wallet support (Ethereum, Solana, Base, Sei, etc.)
- **Analytics & Analytics** - Real-time analytics with Redis caching
- **Server Discovery** - Browse and explore registered MCP servers
- **Deployment Tools** - One-click deployment to Vercel/GitHub

## ✨ Features

### Core Features

- 🔐 **Multi-Authentication** - GitHub OAuth and email/password authentication via better-auth
- 💰 **Payment Processing** - x402 payment protocol integration with multiple payment strategies
- 🔗 **Multi-Blockchain Support** - EVM (Base, Ethereum) and Solana architectures
- 💼 **Wallet Management** - Multiple wallet support per user (external, managed, custodial)
- 📊 **Analytics Dashboard** - Server usage, revenue tracking, and reputation system
- 🔍 **Server Discovery** - Browse trending servers with tool previews
- 🛠️ **MCP Tool Inspection** - Auto-detect tools from MCP server URLs
- 🚀 **Deployment Integration** - Direct deployment to Vercel from codebase

### Payment Features

- **x402 Protocol** - Full support for x402 payment specification
- **Multiple Payment Strategies** - CDP, Privy, Magic, and manual payment flows
- **Smart Account Support** - Optional smart contract wallets for gasless transactions
- **Payment Verification** - Cryptographic verification of payments
- **Multi-Currency Support** - USDC and other stablecoins across networks

### Developer Features

- **API Key Management** - Generate and manage API keys for programmatic access
- **Webhook Support** - Server events and notifications
- **VLayer Integration** - Execution verification and proof generation
- **Analytics API** - Comprehensive analytics endpoints
- **RESTful API** - Complete API for all platform operations

## 🏗️ Architecture

### Tech Stack

- **Frontend**: Next.js 15.4, React 19, TypeScript
- **Backend**: Next.js API Routes, Hono framework
- **Database**: PostgreSQL with Drizzle ORM
- **Caching**: Redis (Vercel KV)
- **Authentication**: better-auth
- **Payments**: x402 SDK, viem, wagmi
- **Blockchain**: EVM (viem), Solana (@solana/kit)
- **Testing**: Playwright, Testcontainers
- **Styling**: Tailwind CSS 4, Radix UI
- **Deployment**: Vercel

### Project Structure

```
latch/
├── src/
│   ├── app/                    # Next.js app router
│   │   ├── (server)/           # Server-side routes
│   │   │   ├── api/           # API endpoints
│   │   │   ├── mcp/           # MCP proxy routes
│   │   │   └── ping/          # Health check routes
│   │   ├── register/          # Server registration UI
│   │   ├── servers/           # Server browser
│   │   └── explorer/          # Tool explorer
│   ├── components/            # React components
│   │   ├── custom-ui/         # Custom components
│   │   ├── ui/                # shadcn/ui components
│   │   └── providers/         # Context providers
│   ├── lib/
│   │   ├── gateway/           # Backend logic
│   │   │   ├── db/            # Database schema & actions
│   │   │   ├── payments/     # Payment strategies
│   │   │   ├── auth.ts        # Authentication
│   │   │   └── analytics.ts   # Analytics computation
│   │   ├── commons/           # Shared utilities
│   │   └── client/            # Client-side utilities
│   └── types/                 # TypeScript types
├── drizzle/                   # Database migrations
├── tests/                     # E2E tests
└── public/                    # Static assets
```

## 🚦 Getting Started

### Prerequisites

- Node.js 18+ or Bun
- PostgreSQL database
- Redis (Vercel KV or self-hosted)
- GitHub OAuth app (for authentication)
- CDP API credentials (for managed wallets)

### Environment Variables

Create a `.env.local` file with the following variables:

```bash
# Node Environment
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/latch

# Authentication
BETTER_AUTH_SECRET=your-secret-key
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# Payment Facilitators
FACILITATOR_URL=https://x402.org/facilitator
BASE_FACILITATOR_URL=https://facilitator.x402.rs
BASE_SEPOLIA_FACILITATOR_URL=https://x402.org/facilitator
SEI_TESTNET_FACILITATOR_URL=https://6y3cdqj5s3.execute-api.us-west-2.amazonaws.com/prod
FACILITATOR_EVM_PRIVATE_KEY=your-private-key

# CDP (Coinbase Developer Platform)
CDP_API_KEY=your-cdp-api-key
CDP_API_SECRET=your-cdp-api-secret
CDP_WALLET_SECRET=your-cdp-wallet-secret

# Vercel KV (Redis)
KV_REST_API_URL=your-kv-url
KV_REST_API_TOKEN=your-kv-token

# Payment Strategy Configuration
PAYMENT_STRATEGY_ENABLED=true
CDP_STRATEGY_ENABLED=true
PRIVY_STRATEGY_ENABLED=true
CDP_PREFER_SMART_ACCOUNTS=true
```

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/your-org/latch.git
cd latch
```

2. **Install dependencies**

```bash
bun install
# or
npm install
```

3. **Set up the database**

```bash
# Generate migrations
bun run db:generate-migrations

# Apply migrations
bun run db:migrate
# or
bun run migrate
```

4. **Start the development server**

```bash
bun run dev
# or
npm run dev
```

The application will be available at `http://localhost:3000`.

## 📚 Usage

### Registering an MCP Server

1. Navigate to `/register`
2. Connect your wallet (or sign in with GitHub)
3. Enter your MCP server URL (must support Streamable HTTP transport)
4. Configure tool pricing for each detected tool
5. Select payment network and token
6. Submit registration

### Using the API

#### Register a Server

```bash
curl -X POST https://your-domain.com/api/servers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "mcpOrigin": "https://your-mcp-server.com",
    "receiverAddress": "0x...",
    "name": "My MCP Server",
    "description": "Server description",
    "tools": [
      {
        "name": "tool-name",
        "pricing": [{
          "maxAmountRequiredRaw": "1000000",
          "assetAddress": "0x...",
          "network": "base-sepolia",
          "tokenDecimals": 6
        }]
      }
    ]
  }'
```

#### Get Servers

```bash
curl https://your-domain.com/api/servers?limit=10&offset=0&type=trending
```

#### Get Server Details

```bash
curl https://your-domain.com/api/servers/:serverId
```

### Wallet Management

The platform supports multiple wallet types:

- **External Wallets**: MetaMask, Phantom, WalletConnect
- **Managed Wallets**: Coinbase CDP, Privy, Magic
- **Custodial Wallets**: Platform-managed wallets

```bash
# Get user wallets
curl https://your-domain.com/api/users/:userId/wallets

# Add external wallet
curl -X POST https://your-domain.com/api/users/:userId/wallets \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "walletAddress": "0x...",
    "blockchain": "ethereum",
    "architecture": "evm",
    "walletType": "external",
    "provider": "metamask"
  }'
```

### Payment Integration

The platform uses the x402 payment protocol. When a tool requires payment:

1. The client receives a `402 Payment Required` response
2. Response includes `accepts` array with payment requirements
3. Client creates payment using x402 SDK
4. Payment is included in `X-PAYMENT` header
5. Server verifies payment and processes request

Example payment flow:

```typescript
import { createPayment } from "x402";

const paymentRequirements = response.accepts;
const payment = await createPayment(wallet, 1, paymentRequirements);
const paymentHeader = encodePayment(payment);

// Retry request with payment header
fetch(url, {
  headers: {
    "X-PAYMENT": paymentHeader,
  },
});
```

## 🧪 Testing

The project includes comprehensive E2E tests using Playwright and Testcontainers.

### Setup Test Environment

```bash
# Install Playwright browsers
bun run e2e:install
```

### Run Tests

```bash
# Run all tests
bun run e2e:test

# Run with UI
bun run e2e:ui

# Show test report
bun run e2e:show-report
```

### Test Coverage

- Authentication flows (GitHub OAuth, email/password)
- Wallet management (add, remove, set primary)
- MCP server registration and discovery
- Payment processing and verification
- Analytics computation
- API key management

## 📊 Database Schema

### Key Tables

- **users** - User accounts with authentication
- **user_wallets** - Multi-chain wallet management
- **mcp_servers** - Registered MCP servers
- **mcp_tools** - Tools within each server with pricing
- **payments** - Payment records with blockchain verification
- **tool_usage** - Usage analytics and tracking
- **api_keys** - API key management
- **proofs** - VLayer execution proofs
- **server_ownership** - Server access control

All monetary amounts are stored as base units (NUMERIC) to avoid floating-point precision issues.

## 🔧 Development

### Available Scripts

```bash
# Development
bun run dev              # Start dev server with Turbopack
bun run dev:no-turbo     # Start dev server without Turbopack

# Database
bun run db:apply-changes       # Push schema changes
bun run db:generate-migrations # Generate migration files
bun run db:migrate             # Run migrations
bun run db:studio              # Open Drizzle Studio

# Testing
bun run e2e:test         # Run E2E tests
bun run e2e:ui           # Run tests with UI
bun run e2e:codegen      # Generate Playwright tests

# Build
bun run build            # Build for production
bun run start            # Start production server

# Utilities
bun run account:generate # Generate test accounts
```

### Code Style

- TypeScript strict mode enabled
- ESLint for linting
- Prettier for formatting (via ESLint)
- Component-based architecture

### Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🔐 Security

- All sensitive data (private keys, secrets) are never stored in the database
- API keys are hashed before storage
- Payment verification uses cryptographic signatures
- CSRF protection via better-auth
- Rate limiting on API endpoints
- Input validation via Zod schemas

## 🌐 Supported Networks

### Mainnet

- **Base** - Base mainnet
- **Ethereum** - Ethereum mainnet
- **Sei** - Sei mainnet

### Testnet

- **Base Sepolia** - Base testnet
- **Sei Testnet** - Sei testnet

### Supported Tokens

- USDC on all supported networks
- Native tokens (ETH, SOL, etc.)

## 📖 API Documentation

### Authentication

Most endpoints require authentication via:

- Session cookie (browser)
- API key header: `Authorization: Bearer <api-key>`

### Endpoints

Full API documentation is available in the codebase at `src/app/(server)/api/[[...route]]/route.ts`. Key endpoints:

- `GET /api/health` - Health check
- `GET /api/servers` - List servers
- `POST /api/servers` - Register server
- `GET /api/servers/:id` - Get server details
- `GET /api/users/:userId/wallets` - Get user wallets
- `POST /api/users/:userId/wallets` - Add wallet
- `GET /api/analytics/usage` - Get analytics
- `GET /api/proofs` - Get execution proofs

## 🤝 Integrations

### Third-Party Services

- **Coinbase Developer Platform (CDP)** - Managed wallet infrastructure
- **Vercel KV** - Redis caching
- **VLayer** - Execution verification
- **GitHub** - OAuth and deployment
- **Vercel** - Deployment platform

### Payment Facilitators

- **x402.org** - Payment facilitator service
- Multiple network-specific facilitators

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- [Model Context Protocol](https://modelcontextprotocol.io/) - MCP specification
- [x402](https://x402.org/) - Payment protocol
- [Vercel](https://vercel.com/) - Deployment infrastructure
- [Drizzle ORM](https://orm.drizzle.team/) - Database toolkit

## 📧 Contact

For questions, issues, or contributions, please open an issue on GitHub.

---

**Built with ❤️ for the MCP ecosystem**
