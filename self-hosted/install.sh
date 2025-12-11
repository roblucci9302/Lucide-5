#!/bin/bash

# Lucide Self-Hosted Installation Script
# Automates the setup of Lucide on your own infrastructure
#
# Usage:
#   bash install.sh
#
# Requirements:
#   - Docker 20.10+ and Docker Compose 2.0+
#   - Valid SELF_HOSTED license
#   - 4GB+ RAM, 20GB+ disk space

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Banner
echo -e "${BLUE}"
cat << "EOF"
╔═══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║               LUCIDE SELF-HOSTED INSTALLER v1.0                   ║
║                                                                   ║
║        Enterprise AI Assistant - On-Premise Deployment           ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

# Check if running as root
if [ "$EUID" -eq 0 ]; then
   echo -e "${RED}❌ Please do not run this script as root${NC}"
   exit 1
fi

# Check prerequisites
echo -e "${BLUE}Checking prerequisites...${NC}"

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed${NC}"
    echo "   Install from: https://docs.docker.com/get-docker/"
    exit 1
fi
echo -e "${GREEN}✅ Docker $(docker --version | cut -d' ' -f3 | tr -d ',') installed${NC}"

# Check Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed${NC}"
    echo "   Install from: https://docs.docker.com/compose/install/"
    exit 1
fi
echo -e "${GREEN}✅ Docker Compose $(docker-compose --version | cut -d' ' -f4 | tr -d ',') installed${NC}"

# Check Docker daemon
if ! docker ps &> /dev/null; then
    echo -e "${RED}❌ Docker daemon is not running${NC}"
    echo "   Start with: sudo systemctl start docker"
    exit 1
fi
echo -e "${GREEN}✅ Docker daemon running${NC}"

echo ""
echo -e "${GREEN}All prerequisites met!${NC}"
echo ""

# Configuration wizard
echo -e "${BLUE}═══════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}                    CONFIGURATION WIZARD                           ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════════${NC}"
echo ""

# Check if .env exists
if [ -f ".env" ]; then
    echo -e "${YELLOW}⚠️  .env file already exists${NC}"
    read -p "Do you want to overwrite it? (y/N): " -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Using existing .env file..."
        USE_EXISTING_ENV=true
    else
        USE_EXISTING_ENV=false
    fi
else
    USE_EXISTING_ENV=false
fi

if [ "$USE_EXISTING_ENV" = false ]; then
    # Copy template
    cp .env.example .env

    echo "Please provide the following information:"
    echo ""

    # Domain
    read -p "Domain name (e.g., lucide.company.com) [localhost]: " DOMAIN
    DOMAIN=${DOMAIN:-localhost}
    sed -i "s/DOMAIN=.*/DOMAIN=$DOMAIN/" .env

    # PostgreSQL password
    echo ""
    echo "Generating secure passwords..."
    POSTGRES_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
    sed -i "s/POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$POSTGRES_PASSWORD/" .env
    echo -e "${GREEN}✅ PostgreSQL password generated${NC}"

    # JWT secrets
    JWT_SECRET=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
    GATEWAY_JWT_SECRET=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
    sed -i "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" .env
    sed -i "s/GATEWAY_JWT_SECRET=.*/GATEWAY_JWT_SECRET=$GATEWAY_JWT_SECRET/" .env
    echo -e "${GREEN}✅ JWT secrets generated${NC}"

    # Redis password
    REDIS_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
    sed -i "s/REDIS_PASSWORD=.*/REDIS_PASSWORD=$REDIS_PASSWORD/" .env
    echo -e "${GREEN}✅ Redis password generated${NC}"

    echo ""
    echo -e "${YELLOW}Optional: OpenAI API Key (for natural language queries)${NC}"
    read -p "OpenAI API Key (press Enter to skip): " OPENAI_KEY
    if [ ! -z "$OPENAI_KEY" ]; then
        sed -i "s/LLM_API_KEY=.*/LLM_API_KEY=$OPENAI_KEY/" .env
        echo -e "${GREEN}✅ OpenAI API key configured${NC}"
    fi

    echo ""
    echo -e "${GREEN}✅ Configuration saved to .env${NC}"
fi

# License check
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}                      LICENSE VALIDATION                           ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════════${NC}"
echo ""

if [ -f "license.json" ]; then
    echo -e "${GREEN}✅ License file found: license.json${NC}"
else
    echo -e "${YELLOW}⚠️  No license file found${NC}"
    echo ""
    echo "A SELF_HOSTED license is required to run Lucide on-premise."
    echo "You can:"
    echo "  1. Place your license.json in this directory"
    echo "  2. Import license later via Lucide app"
    echo "  3. Contact sales: sales@lucide.ai"
    echo ""
    read -p "Do you have a license key to import now? (y/N): " -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -p "Enter your license key (Base64): " LICENSE_KEY
        # Decode and save
        echo "$LICENSE_KEY" | base64 -d > license.json 2>/dev/null
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ License imported successfully${NC}"
        else
            echo -e "${RED}❌ Invalid license key format${NC}"
            rm -f license.json
        fi
    fi
fi

# Build and start services
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}                    BUILDING DOCKER IMAGES                         ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════════${NC}"
echo ""

echo "Building Docker images (this may take a few minutes)..."
docker-compose build --no-cache

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Docker build failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker images built successfully${NC}"

# Start services
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}                     STARTING SERVICES                             ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════════${NC}"
echo ""

echo "Starting Lucide services..."
docker-compose up -d

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to start services${NC}"
    exit 1
fi

echo ""
echo "Waiting for services to be ready..."
sleep 10

# Check service health
echo ""
echo "Checking service health..."

# Backend health
for i in {1..30}; do
    if curl -sf http://localhost:3001/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend API is healthy${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}❌ Backend API failed to start${NC}"
        echo "Check logs: docker-compose logs backend"
    fi
    sleep 2
done

# Gateway health
for i in {1..30}; do
    if curl -sf http://localhost:3002/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Enterprise Gateway is healthy${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}❌ Enterprise Gateway failed to start${NC}"
        echo "Check logs: docker-compose logs gateway"
    fi
    sleep 2
done

# Success!
echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                                                   ║${NC}"
echo -e "${GREEN}║              ✅ LUCIDE INSTALLED SUCCESSFULLY! ✅                 ║${NC}"
echo -e "${GREEN}║                                                                   ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${BLUE}📋 Installation Summary:${NC}"
echo "─────────────────────────────────────────────────────────────────────"
echo "  Domain:              $DOMAIN"
echo "  Backend API:         http://localhost:3001"
echo "  Enterprise Gateway:  http://localhost:3002"
if [ "$DOMAIN" != "localhost" ]; then
    echo "  Public URL:          https://$DOMAIN"
fi
echo ""

echo -e "${BLUE}📚 Next Steps:${NC}"
echo "─────────────────────────────────────────────────────────────────────"
echo "  1. Configure your desktop Lucide app to connect to:"
echo "     Backend: http://localhost:3001 (or https://$DOMAIN/api)"
echo ""
echo "  2. Import your license (if not done already):"
echo "     Settings → License → Import License"
echo ""
echo "  3. Configure HTTPS (recommended for production):"
echo "     See: docs/SELF_HOSTED.md#ssl-setup"
echo ""
echo "  4. Set up backups:"
echo "     See: docs/SELF_HOSTED.md#backups"
echo ""

echo -e "${BLUE}🔧 Useful Commands:${NC}"
echo "─────────────────────────────────────────────────────────────────────"
echo "  View logs:           docker-compose logs -f"
echo "  Stop services:       docker-compose stop"
echo "  Start services:      docker-compose start"
echo "  Restart services:    docker-compose restart"
echo "  Update Lucide:       git pull && docker-compose up -d --build"
echo "  Backup database:     docker-compose exec postgres pg_dump -U lucide lucide > backup.sql"
echo ""

echo -e "${BLUE}📖 Documentation:${NC}"
echo "─────────────────────────────────────────────────────────────────────"
echo "  README:              docs/SELF_HOSTED.md"
echo "  Troubleshooting:     docs/TROUBLESHOOTING.md"
echo "  Support:             support@lucide.ai"
echo ""

echo -e "${GREEN}Thank you for choosing Lucide! 🚀${NC}"
echo ""
