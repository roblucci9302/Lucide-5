# Lucide Enterprise Gateway 🏢

**Secure API Gateway for Enterprise Database Integration**

The Lucide Enterprise Gateway is a secure intermediary that allows Lucide AI Assistant to connect to your company's databases safely. It provides:

- 🔒 **Secure Access**: JWT authentication + rate limiting
- 🤖 **Natural Language Queries**: Ask questions, get SQL automatically
- 🛡️ **Query Validation**: Prevent SQL injection and unsafe operations
- 📊 **Audit Logging**: Complete compliance tracking
- 🔌 **Multi-Database**: PostgreSQL, MySQL, REST APIs
- ⚡ **High Performance**: Connection pooling + caching

---

## Table of Contents

- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [Installation](#installation)
- [Configuration](#configuration)
- [API Reference](#api-reference)
- [Security](#security)
- [Deployment](#deployment)
- [Examples](#examples)

---

## Quick Start

### 1. Install Dependencies

```bash
cd lucide-enterprise-gateway
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your database credentials
```

### 3. Start Gateway

```bash
npm start
```

### 4. Test Connection

```bash
curl -X POST http://localhost:3002/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your-password"}'
```

---

## Architecture

```
┌─────────────────┐         ┌──────────────────────┐         ┌─────────────────┐
│  Lucide Client  │────────>│  Enterprise Gateway  │────────>│  PostgreSQL DB  │
│  (Electron App) │  HTTPS  │                      │  SQL    │                 │
└─────────────────┘         │  - JWT Auth          │         └─────────────────┘
                            │  - Query Validator   │
                            │  - Audit Logger      │         ┌─────────────────┐
                            │  - Rate Limiter      │────────>│  MySQL DB       │
                            │  - LLM Converter     │  SQL    │                 │
                            └──────────────────────┘         └─────────────────┘
                                     │
                                     │ HTTP          ┌─────────────────┐
                                     └──────────────>│  REST API       │
                                                     │  (CRM, etc.)    │
                                                     └─────────────────┘
```

### Key Components

1. **Gateway Server** (`src/index.js`)
   - Express.js server with security middleware
   - Route handlers for queries, schema, authentication
   - Natural language to SQL conversion using LLM

2. **Database Connectors** (`src/connectors/`)
   - PostgreSQL, MySQL, REST API adapters
   - Connection pooling and error handling
   - Schema introspection

3. **Query Validator** (`src/validators/`)
   - SQL injection prevention
   - Dangerous keyword detection
   - Read-only enforcement

4. **Audit Logger** (`src/audit.js`)
   - Comprehensive activity logging
   - File and console output
   - Query and statistics API

---

## Installation

### Prerequisites

- **Node.js**: v16+ (v18+ recommended)
- **npm** or **yarn**
- **Database access**: Credentials for your enterprise databases

### Install

```bash
# Clone the repository
git clone https://github.com/your-org/lucide.git
cd lucide/lucide-enterprise-gateway

# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env
```

---

## Configuration

### Environment Variables (.env)

```bash
# Server
PORT=3002
NODE_ENV=production

# JWT Authentication
JWT_SECRET=your-super-secret-key-change-this
JWT_EXPIRY=24h

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Audit Logging
AUDIT_LOG_ENABLED=true
AUDIT_LOG_TO_FILE=true
AUDIT_LOG_FILE_PATH=./logs/audit.log

# Database: PostgreSQL Production
DB_POSTGRES_PROD_TYPE=postgresql
DB_POSTGRES_PROD_HOST=your-postgres-host.com
DB_POSTGRES_PROD_PORT=5432
DB_POSTGRES_PROD_DATABASE=your_database
DB_POSTGRES_PROD_USER=readonly_user
DB_POSTGRES_PROD_PASSWORD=your_password
DB_POSTGRES_PROD_SSL=true
DB_POSTGRES_PROD_READ_ONLY=true

# LLM Configuration
LLM_PROVIDER=openai
LLM_API_KEY=your-openai-api-key
LLM_MODEL=gpt-4o-mini
```

### Programmatic Configuration (config.js)

For advanced configuration, use `config.example.js` as a template:

```javascript
const config = require('./config.example.js');

// Customize settings
config.databases['my-db'] = {
    type: 'postgresql',
    host: 'db.company.com',
    port: 5432,
    database: 'mydb',
    user: 'readonly',
    password: process.env.MY_DB_PASSWORD,
    readOnly: true
};

// Set permissions
config.permissions['data-analysts'] = ['my-db'];
```

---

## API Reference

### Authentication

#### POST `/api/v1/auth/login`

Login and receive JWT token.

**Request:**
```json
{
  "username": "user@company.com",
  "password": "secure-password"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": "24h"
}
```

### Queries

#### POST `/api/v1/query`

Execute SQL query directly.

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "database": "postgres-prod",
  "query": "SELECT * FROM users WHERE department = ?",
  "params": ["Engineering"]
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {"id": 1, "name": "Alice", "department": "Engineering"},
    {"id": 2, "name": "Bob", "department": "Engineering"}
  ],
  "rowCount": 2,
  "executionTime": 45
}
```

#### POST `/api/v1/query/ask`

Ask question in natural language (LLM converts to SQL).

**Request:**
```json
{
  "database": "postgres-prod",
  "question": "How many employees are in the Engineering department?"
}
```

**Response:**
```json
{
  "success": true,
  "sql": "SELECT COUNT(*) as count FROM users WHERE department = 'Engineering'",
  "data": [{"count": 152}],
  "rowCount": 1,
  "executionTime": 78
}
```

### Schema

#### GET `/api/v1/schema/:database`

Get database schema (tables, columns, types).

**Response:**
```json
{
  "database": "postgres-prod",
  "tables": {
    "users": {
      "columns": [
        {"name": "id", "type": "integer", "nullable": false},
        {"name": "name", "type": "varchar", "nullable": false},
        {"name": "email", "type": "varchar", "nullable": true}
      ]
    }
  }
}
```

#### GET `/api/v1/databases`

List available databases.

**Response:**
```json
{
  "databases": ["postgres-prod", "mysql-hr", "rest-crm"]
}
```

---

## Security

### Authentication

- **JWT Tokens**: All requests require valid JWT token
- **Token Expiry**: Tokens expire after configured time (default: 24h)
- **Refresh**: Implement token refresh in your client

### Authorization

- **User Permissions**: Configure which users can access which databases
- **Role-Based Access**: Define roles in `config.permissions`

### Query Validation

- **SQL Injection Prevention**: All queries validated before execution
- **Read-Only Enforcement**: Only SELECT queries allowed (configurable)
- **Dangerous Keywords Blocked**: DROP, DELETE, TRUNCATE, etc.
- **Multiple Statement Prevention**: Only single statements allowed

### Rate Limiting

- **Default**: 100 requests per minute per IP
- **Customizable**: Configure in .env or config.js
- **DDoS Protection**: Automatic request throttling

### Audit Logging

- **Every Query Logged**: User, database, query, result, timestamp
- **File Storage**: Persistent logs in `./logs/audit.log`
- **Compliance Ready**: Meet regulatory requirements

---

## Deployment

### Option 1: Docker (Recommended)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3002
CMD ["npm", "start"]
```

Build and run:
```bash
docker build -t lucide-gateway .
docker run -p 3002:3002 --env-file .env lucide-gateway
```

### Option 2: PM2 (Process Manager)

```bash
# Install PM2
npm install -g pm2

# Start gateway
pm2 start src/index.js --name lucide-gateway

# Enable startup script
pm2 startup
pm2 save
```

### Option 3: Kubernetes

See `docs/deployment-kubernetes.md` for Kubernetes deployment guide.

### Option 4: Cloud Platforms

- **AWS**: Deploy on EC2, ECS, or Lambda
- **Azure**: Deploy on App Service or Container Instances
- **GCP**: Deploy on Cloud Run or Compute Engine

---

## Examples

### Example 1: Basic Query

```javascript
const fetch = require('node-fetch');

// Login
const loginRes = await fetch('http://localhost:3002/api/v1/auth/login', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({username: 'admin', password: 'password'})
});
const {token} = await loginRes.json();

// Execute query
const queryRes = await fetch('http://localhost:3002/api/v1/query', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    database: 'postgres-prod',
    query: 'SELECT * FROM users LIMIT 10'
  })
});

const result = await queryRes.json();
console.log(result.data);
```

### Example 2: Natural Language Query

```javascript
// Ask question
const askRes = await fetch('http://localhost:3002/api/v1/query/ask', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    database: 'postgres-prod',
    question: 'What is the average salary by department?'
  })
});

const result = await askRes.json();
console.log('Generated SQL:', result.sql);
console.log('Results:', result.data);
```

### Example 3: Schema Introspection

```javascript
// Get schema
const schemaRes = await fetch('http://localhost:3002/api/v1/schema/postgres-prod', {
  headers: {'Authorization': `Bearer ${token}`}
});

const schema = await schemaRes.json();
console.log('Tables:', Object.keys(schema.tables));
```

### Example 4: Using Client Service (Lucide App)

```javascript
const enterpriseDataService = require('./src/features/common/services/enterpriseDataService');

// Connect to gateway
await enterpriseDataService.connect(gatewayToken);

// Ask question
const result = await enterpriseDataService.askQuestion(
  'How many sales were made last month?',
  'postgres-prod'
);

console.log(result.data);
console.log('Generated SQL:', result.generatedSQL);
```

---

## Troubleshooting

### Connection Issues

**Problem**: Cannot connect to gateway
- Check gateway is running: `curl http://localhost:3002/health`
- Verify firewall rules allow traffic on port 3002
- Check logs: `cat logs/audit.log`

### Authentication Errors

**Problem**: 401 Unauthorized
- Verify JWT token is valid and not expired
- Check token is passed in Authorization header
- Confirm user has permissions for requested database

### Query Validation Errors

**Problem**: Query rejected as unsafe
- Ensure query is read-only (SELECT only)
- Remove dangerous keywords (DROP, DELETE, etc.)
- Use single statements only (no semicolons)

### Performance Issues

**Problem**: Slow queries
- Check database connection pooling is enabled
- Review query complexity and indexes
- Monitor logs for slow query warnings (>5s)

---

## Support

- **Documentation**: See `/docs` folder
- **Issues**: https://github.com/your-org/lucide/issues
- **Email**: support@lucide.ai

---

## License

Proprietary - Internal Enterprise Use Only

© 2024 Lucide. All rights reserved.
