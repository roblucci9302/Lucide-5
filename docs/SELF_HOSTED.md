# Lucide Self-Hosted Deployment Guide 🏢

Complete guide for deploying Lucide on your own infrastructure.

---

## Table of Contents

1. [Overview](#overview)
2. [Requirements](#requirements)
3. [Quick Start](#quick-start)
4. [Architecture](#architecture)
5. [Installation](#installation)
6. [Configuration](#configuration)
7. [SSL/HTTPS Setup](#sslhttps-setup)
8. [License Management](#license-management)
9. [Backups](#backups)
10. [Monitoring](#monitoring)
11. [Upgrading](#upgrading)
12. [Troubleshooting](#troubleshooting)

---

## Overview

Lucide Self-Hosted allows you to run the complete Lucide stack on your own infrastructure:

- **Full Data Control**: All data stays on your servers
- **Custom Domain**: Use your own domain (lucide.company.com)
- **Enterprise Features**: All features unlocked
- **Air-Gapped Support**: Can run without internet access
- **White Label**: Custom branding options

**What's Included:**
- Backend API server
- Enterprise Gateway
- PostgreSQL database
- Nginx reverse proxy
- Redis cache (optional)
- Automated backups

---

## Requirements

### Hardware

**Minimum (Up to 50 users)**
- CPU: 4 cores
- RAM: 8 GB
- Storage: 50 GB SSD
- Network: 100 Mbps

**Recommended (100+ users)**
- CPU: 8+ cores
- RAM: 16+ GB
- Storage: 200+ GB SSD (NVMe preferred)
- Network: 1 Gbps

### Software

- **OS**: Ubuntu 22.04 LTS, Debian 11+, RHEL 8+, or similar
- **Docker**: 20.10 or later
- **Docker Compose**: 2.0 or later
- **Domain**: Optional but recommended for HTTPS

### License

- Valid **SELF_HOSTED** license required
- Contact sales: sales@lucide.ai
- Trial licenses available for evaluation

---

## Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/your-org/lucide.git
cd lucide/self-hosted
```

### 2. Run Installer

```bash
chmod +x install.sh
./install.sh
```

The installer will:
- Check prerequisites
- Generate secure passwords
- Configure services
- Build Docker images
- Start all services

### 3. Import License

Once installed, import your license:

**Option A: Via Lucide App**
1. Open Lucide desktop app
2. Go to Settings → License
3. Click "Import License"
4. Paste your license key

**Option B: Manual**
```bash
# Save license to file
echo "YOUR_LICENSE_KEY" | base64 -d > ~/.lucide/license.json
```

### 4. Access Lucide

- Backend API: `http://localhost:3001`
- Enterprise Gateway: `http://localhost:3002`
- Configure your Lucide desktop app to use these URLs

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Internet                                │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
                   ┌──────────┐
                   │  Nginx   │ :80, :443
                   │  Proxy   │ (HTTPS, Load Balancing)
                   └─────┬────┘
                         │
         ┌───────────────┴───────────────┐
         │                               │
         ▼                               ▼
   ┌──────────┐                    ┌──────────┐
   │ Backend  │ :3001              │ Gateway  │ :3002
   │   API    │                    │   API    │
   └────┬─────┘                    └────┬─────┘
        │                               │
        │                               │
        ▼                               ▼
   ┌──────────┐                    ┌──────────┐
   │PostgreSQL│ :5432              │Enterprise│
   │ Database │                    │Databases │
   └──────────┘                    └──────────┘
        │
        ▼
   ┌──────────┐
   │  Redis   │ :6379 (optional)
   │  Cache   │
   └──────────┘
```

**Components:**

1. **Nginx**: Reverse proxy, HTTPS termination, static files
2. **Backend API**: User management, sync, authentication
3. **Enterprise Gateway**: Secure database access proxy
4. **PostgreSQL**: Main database for user data
5. **Redis**: Caching and session storage (optional)

---

## Installation

### Manual Installation

If you prefer not to use the installer:

#### 1. Prepare Environment

```bash
cd self-hosted
cp .env.example .env
```

#### 2. Edit Configuration

```bash
nano .env
```

**Required settings:**
- `DOMAIN`: Your domain name
- `POSTGRES_PASSWORD`: Database password
- `JWT_SECRET`: Random 32+ character string
- `LLM_API_KEY`: OpenAI API key (optional)

Generate secure secrets:
```bash
openssl rand -base64 32
```

#### 3. Build Images

```bash
docker-compose build
```

#### 4. Start Services

```bash
docker-compose up -d
```

#### 5. Verify Installation

```bash
# Check all services are running
docker-compose ps

# Check backend health
curl http://localhost:3001/health

# Check gateway health
curl http://localhost:3002/health

# View logs
docker-compose logs -f
```

---

## Configuration

### Environment Variables

Edit `.env` file to customize configuration.

**Essential Settings:**

```bash
# Domain
DOMAIN=lucide.company.com

# Database
POSTGRES_PASSWORD=your-secure-password

# JWT Authentication
JWT_SECRET=your-jwt-secret-here
GATEWAY_JWT_SECRET=gateway-jwt-secret

# LLM (for natural language queries)
LLM_API_KEY=sk-your-openai-api-key
```

**Advanced Settings:**

```bash
# Rate limiting
RATE_LIMIT_MAX_REQUESTS=100

# Security
ALLOW_WRITE_QUERIES=false

# Logging
LOG_LEVEL=info
AUDIT_LOG_ENABLED=true

# Performance
DB_POOL_MAX=10
QUERY_TIMEOUT=30000
```

### Gateway Database Configuration

Configure enterprise databases in `gateway-config.js`:

```javascript
module.exports = {
    databases: {
        'company-db': {
            type: 'postgresql',
            host: 'db.company.internal',
            port: 5432,
            database: 'company_db',
            user: 'readonly',
            password: process.env.COMPANY_DB_PASSWORD,
            readOnly: true
        },

        'hr-db': {
            type: 'mysql',
            host: 'hr-mysql.internal',
            port: 3306,
            database: 'hr',
            user: 'hr_readonly',
            password: process.env.HR_DB_PASSWORD,
            readOnly: true
        }
    },

    permissions: {
        'admin': ['*'],
        'hr-team': ['hr-db'],
        'developers': ['company-db']
    }
};
```

---

## SSL/HTTPS Setup

### Option 1: Let's Encrypt (Recommended)

Automatic free SSL certificates:

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d lucide.company.com

# Auto-renewal (already configured)
sudo certbot renew --dry-run
```

### Option 2: Custom Certificate

If you have your own certificate:

```bash
# Copy certificates
cp your-cert.pem self-hosted/nginx/ssl/cert.pem
cp your-key.pem self-hosted/nginx/ssl/key.pem

# Update nginx config
# Edit self-hosted/nginx/nginx.conf
```

### Option 3: Self-Signed (Development)

For testing only:

```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout self-hosted/nginx/ssl/key.pem \
  -out self-hosted/nginx/ssl/cert.pem
```

---

## License Management

### License Tiers

| Feature | Starter | Professional | Enterprise | Self-Hosted |
|---------|---------|--------------|------------|-------------|
| Price | Free | $29/mo | $299/mo | Custom |
| Devices | 1 | 5 | Unlimited | Unlimited |
| Cloud Sync | ❌ | ✅ | ✅ | ✅ |
| Enterprise Gateway | ❌ | ❌ | ✅ | ✅ |
| Custom Domain | ❌ | ❌ | ❌ | ✅ |
| White Label | ❌ | ❌ | ❌ | ✅ |
| Support | Community | Email | Priority | Dedicated |

### Obtaining a License

1. **Contact Sales**: sales@lucide.ai
2. **Provide Information**:
   - Company name
   - Number of users
   - Domain name
   - Deployment type
3. **Receive License**: Base64 encoded license key
4. **Import License**: See below

### Importing License

**Via Lucide App:**
1. Settings → License
2. Click "Import License"
3. Paste license key
4. Click "Activate"

**Via Command Line:**
```bash
# Save license
echo "YOUR_LICENSE_KEY_BASE64" | base64 -d > license.json

# Move to Docker volume
docker cp license.json lucide-backend:/app/license.json

# Restart backend
docker-compose restart backend
```

### Verifying License

```bash
# Check license info in logs
docker-compose logs backend | grep License

# Should see:
# [License] ✅ Valid SELF_HOSTED license
# [License] Licensed to: Your Company
# [License] Expires: 2025-12-31
```

### License Renewal

Before expiration:
1. Contact sales for renewal
2. Receive new license key
3. Import new license (keeps existing data)
4. No downtime required

After expiration:
- 7-day grace period
- Features continue to work
- Warning messages shown
- After grace period: Downgrade to STARTER features

---

## Backups

### Automated Backups

**PostgreSQL Database:**

```bash
# Create backup script
cat > backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/backups/lucide"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

docker-compose exec -T postgres pg_dump -U lucide lucide | \
  gzip > $BACKUP_DIR/lucide_$DATE.sql.gz

# Keep last 30 days
find $BACKUP_DIR -name "lucide_*.sql.gz" -mtime +30 -delete
EOF

chmod +x backup.sh

# Schedule daily backups (cron)
crontab -e
# Add: 0 2 * * * /path/to/backup.sh
```

**Docker Volumes:**

```bash
# Backup all volumes
docker run --rm \
  -v lucide_postgres_data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/postgres_data_backup.tar.gz /data
```

### Restore from Backup

**PostgreSQL:**

```bash
# Stop services
docker-compose stop backend gateway

# Restore database
gunzip < lucide_20241115.sql.gz | \
  docker-compose exec -T postgres psql -U lucide lucide

# Start services
docker-compose start backend gateway
```

**Volumes:**

```bash
# Stop services
docker-compose down

# Restore volume
docker run --rm \
  -v lucide_postgres_data:/data \
  -v $(pwd):/backup \
  alpine sh -c "cd /data && tar xzf /backup/postgres_data_backup.tar.gz --strip 1"

# Start services
docker-compose up -d
```

### Offsite Backups

**To S3:**

```bash
# Install AWS CLI
apt install awscli

# Configure
aws configure

# Upload backup
aws s3 cp lucide_backup.sql.gz s3://your-bucket/lucide-backups/
```

**To Rsync:**

```bash
rsync -avz /backups/lucide/ backup-server:/backups/lucide/
```

---

## Monitoring

### Health Checks

```bash
# Backend API
curl http://localhost:3001/health

# Enterprise Gateway
curl http://localhost:3002/health

# PostgreSQL
docker-compose exec postgres pg_isready -U lucide
```

### Viewing Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f gateway
docker-compose logs -f postgres

# Last 100 lines
docker-compose logs --tail=100 backend
```

### Resource Usage

```bash
# Container stats
docker stats

# Disk usage
df -h
docker system df

# Database size
docker-compose exec postgres psql -U lucide -c "\l+"
```

### Prometheus + Grafana (Optional)

Add monitoring stack:

```yaml
# docker-compose.monitoring.yml
version: '3.8'
services:
  prometheus:
    image: prom/prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana
    ports:
      - "3000:3000"
```

---

## Upgrading

### Minor Updates

```bash
# Pull latest code
git pull origin main

# Rebuild images
docker-compose build

# Restart with new images
docker-compose up -d

# Check logs
docker-compose logs -f
```

### Major Upgrades

1. **Backup everything** (database + volumes)
2. **Read release notes** for breaking changes
3. **Test in staging** environment first
4. **Schedule maintenance window**
5. **Upgrade:**

```bash
# Stop services
docker-compose down

# Pull latest
git pull

# Rebuild
docker-compose build --no-cache

# Start
docker-compose up -d

# Verify
docker-compose ps
docker-compose logs -f
```

6. **Verify functionality**
7. **Monitor for issues**

### Rollback

If upgrade fails:

```bash
# Stop services
docker-compose down

# Checkout previous version
git checkout <previous-tag>

# Restore database backup
gunzip < backup.sql.gz | docker-compose exec -T postgres psql -U lucide

# Start services
docker-compose up -d
```

---

## Troubleshooting

### Services Won't Start

**Check logs:**
```bash
docker-compose logs backend
docker-compose logs postgres
```

**Common issues:**
- Port already in use: Change ports in .env
- Permission denied: Check file permissions
- Database connection failed: Verify DATABASE_URL in .env

### Cannot Connect to Backend

**Check if service is running:**
```bash
docker-compose ps
curl http://localhost:3001/health
```

**Check firewall:**
```bash
sudo ufw status
sudo ufw allow 3001
```

**Check Docker network:**
```bash
docker network ls
docker network inspect lucide-network
```

### License Not Working

**Verify license file:**
```bash
docker-compose exec backend ls -la /app/license.json
docker-compose logs backend | grep License
```

**Re-import license:**
```bash
# Copy license to container
docker cp license.json lucide-backend:/app/license.json

# Restart
docker-compose restart backend
```

### Performance Issues

**Check resources:**
```bash
docker stats
htop
```

**Optimize PostgreSQL:**
```bash
# Edit postgresql.conf in container
docker-compose exec postgres vi /var/lib/postgresql/data/postgresql.conf

# Increase shared_buffers, effective_cache_size
# Restart postgres
docker-compose restart postgres
```

**Enable caching:**
```bash
# Start Redis
docker-compose --profile with-redis up -d redis
```

### Database Connection Errors

**Check PostgreSQL is running:**
```bash
docker-compose exec postgres pg_isready
```

**Check connection string:**
```bash
docker-compose exec backend env | grep DATABASE_URL
```

**Reset database (⚠️ deletes all data):**
```bash
docker-compose down -v
docker-compose up -d
```

---

## Support

### Documentation
- Self-Hosted Guide: This file
- API Reference: `/lucide-backend/README.md`
- Gateway Guide: `/lucide-enterprise-gateway/README.md`

### Getting Help
- **Email**: support@lucide.ai
- **Documentation**: https://docs.lucide.ai
- **Issue Tracker**: https://github.com/your-org/lucide/issues

### Enterprise Support
SELF_HOSTED license includes:
- Dedicated support channel
- Priority response (< 4 hours)
- Phone support available
- Custom integration assistance

Contact: enterprise-support@lucide.ai

---

## Security

### Best Practices

1. **Always use HTTPS** in production
2. **Strong passwords** for all services
3. **Regular updates** - apply security patches
4. **Firewall rules** - restrict access to necessary ports
5. **Backup encryption** - encrypt backups at rest
6. **Audit logs** - review regularly
7. **Least privilege** - use read-only database users
8. **Network isolation** - use Docker networks

### Security Checklist

- [ ] HTTPS enabled with valid certificate
- [ ] Strong JWT secrets configured
- [ ] Database passwords changed from defaults
- [ ] Firewall configured (only necessary ports open)
- [ ] Regular backups enabled and tested
- [ ] Audit logging enabled
- [ ] Read-only database users for gateway
- [ ] Latest security updates applied
- [ ] Monitoring and alerting configured

---

**Last Updated**: 2024-11-11
**Version**: 1.0.0