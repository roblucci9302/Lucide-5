# Enterprise Deployment Guide 🏢

This guide provides step-by-step instructions for deploying the Lucide Enterprise Gateway in production environments.

---

## Table of Contents

1. [Deployment Options](#deployment-options)
2. [Prerequisites](#prerequisites)
3. [Security Checklist](#security-checklist)
4. [Docker Deployment](#docker-deployment)
5. [Kubernetes Deployment](#kubernetes-deployment)
6. [AWS Deployment](#aws-deployment)
7. [Azure Deployment](#azure-deployment)
8. [On-Premise Deployment](#on-premise-deployment)
9. [SSL/TLS Configuration](#ssltls-configuration)
10. [Monitoring & Logging](#monitoring--logging)
11. [Backup & Recovery](#backup--recovery)
12. [Troubleshooting](#troubleshooting)

---

## Deployment Options

Choose the deployment option that best fits your infrastructure:

| Option | Best For | Complexity | Scalability |
|--------|----------|------------|-------------|
| **Docker** | Quick deployment, dev/staging | Low | Medium |
| **Kubernetes** | High availability, auto-scaling | High | High |
| **AWS ECS/Fargate** | AWS-native, managed containers | Medium | High |
| **Azure Container Instances** | Azure-native, serverless | Low | Medium |
| **VM/Bare Metal** | Full control, on-premise | Medium | Low-Medium |

---

## Prerequisites

### Hardware Requirements

**Minimum (Development/Testing)**
- CPU: 2 cores
- RAM: 2 GB
- Storage: 10 GB
- Network: 100 Mbps

**Recommended (Production)**
- CPU: 4+ cores
- RAM: 8+ GB
- Storage: 50+ GB (for logs)
- Network: 1 Gbps

### Software Requirements

- **Node.js**: v18.x or higher
- **npm**: v9.x or higher
- **Database Access**: Network connectivity to enterprise databases
- **SSL Certificate**: For HTTPS (highly recommended)
- **Firewall Rules**: Allow inbound traffic on gateway port (3002)

### Network Requirements

- **Inbound**: Port 3002 (or your configured port)
- **Outbound**: Database ports (PostgreSQL: 5432, MySQL: 3306)
- **DNS**: Optional domain name for gateway (e.g., `gateway.company.com`)

---

## Security Checklist

Before deploying to production, ensure:

- [ ] Changed default JWT_SECRET to strong random value
- [ ] Enabled HTTPS/SSL (do not use HTTP in production)
- [ ] Configured firewall to restrict access to gateway
- [ ] Set up VPN or private network for database connections
- [ ] Enabled audit logging to persistent storage
- [ ] Configured rate limiting appropriate for your traffic
- [ ] Set read-only database users (not admin accounts)
- [ ] Reviewed and configured user permissions
- [ ] Enabled monitoring and alerting
- [ ] Set up backup strategy for logs and configuration
- [ ] Tested disaster recovery procedures

---

## Docker Deployment

### Step 1: Create Dockerfile

```dockerfile
# Dockerfile
FROM node:18-alpine

# Install production dependencies only
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY . .

# Create logs directory
RUN mkdir -p logs

# Non-root user for security
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port
EXPOSE 3002

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3002/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "src/index.js"]
```

### Step 2: Create docker-compose.yml

```yaml
version: '3.8'

services:
  lucide-gateway:
    build: .
    image: lucide-gateway:latest
    container_name: lucide-gateway
    restart: unless-stopped

    ports:
      - "3002:3002"

    environment:
      - NODE_ENV=production
      - PORT=3002

    env_file:
      - .env

    volumes:
      # Persist logs
      - ./logs:/app/logs

      # Mount config (optional)
      - ./config.js:/app/config.js:ro

    networks:
      - lucide-network

    # Resource limits
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G
        reservations:
          cpus: '1'
          memory: 2G

networks:
  lucide-network:
    driver: bridge
```

### Step 3: Deploy

```bash
# Build image
docker-compose build

# Start container
docker-compose up -d

# Check logs
docker-compose logs -f lucide-gateway

# Check health
curl http://localhost:3002/health
```

### Step 4: Manage

```bash
# Stop
docker-compose stop

# Restart
docker-compose restart

# Update (pull new version)
git pull
docker-compose build
docker-compose up -d

# View logs
docker-compose logs --tail=100 -f
```

---

## Kubernetes Deployment

### Step 1: Create Kubernetes Manifests

**deployment.yaml**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: lucide-gateway
  namespace: lucide
spec:
  replicas: 3
  selector:
    matchLabels:
      app: lucide-gateway
  template:
    metadata:
      labels:
        app: lucide-gateway
    spec:
      containers:
      - name: gateway
        image: your-registry/lucide-gateway:latest
        ports:
        - containerPort: 3002

        env:
        - name: NODE_ENV
          value: "production"
        - name: PORT
          value: "3002"
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: lucide-secrets
              key: jwt-secret

        envFrom:
        - configMapRef:
            name: lucide-config

        resources:
          requests:
            memory: "2Gi"
            cpu: "1"
          limits:
            memory: "4Gi"
            cpu: "2"

        livenessProbe:
          httpGet:
            path: /health
            port: 3002
          initialDelaySeconds: 30
          periodSeconds: 10

        readinessProbe:
          httpGet:
            path: /health
            port: 3002
          initialDelaySeconds: 5
          periodSeconds: 5

        volumeMounts:
        - name: logs
          mountPath: /app/logs

      volumes:
      - name: logs
        persistentVolumeClaim:
          claimName: lucide-logs-pvc
```

**service.yaml**
```yaml
apiVersion: v1
kind: Service
metadata:
  name: lucide-gateway
  namespace: lucide
spec:
  type: LoadBalancer
  selector:
    app: lucide-gateway
  ports:
  - protocol: TCP
    port: 443
    targetPort: 3002
```

**configmap.yaml**
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: lucide-config
  namespace: lucide
data:
  RATE_LIMIT_WINDOW_MS: "60000"
  RATE_LIMIT_MAX_REQUESTS: "100"
  AUDIT_LOG_ENABLED: "true"
  AUDIT_LOG_TO_FILE: "true"
```

**secrets.yaml**
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: lucide-secrets
  namespace: lucide
type: Opaque
data:
  # Base64 encoded values
  jwt-secret: <base64-encoded-secret>
  db-password: <base64-encoded-password>
```

### Step 2: Deploy to Kubernetes

```bash
# Create namespace
kubectl create namespace lucide

# Apply secrets (create secrets.yaml with your values)
kubectl apply -f secrets.yaml

# Apply configmap
kubectl apply -f configmap.yaml

# Apply deployment
kubectl apply -f deployment.yaml

# Apply service
kubectl apply -f service.yaml

# Check status
kubectl get pods -n lucide
kubectl get svc -n lucide

# View logs
kubectl logs -f deployment/lucide-gateway -n lucide
```

### Step 3: Configure Ingress (Optional)

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: lucide-gateway-ingress
  namespace: lucide
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  tls:
  - hosts:
    - gateway.company.com
    secretName: lucide-tls
  rules:
  - host: gateway.company.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: lucide-gateway
            port:
              number: 443
```

---

## AWS Deployment

### Option A: ECS Fargate (Recommended)

**1. Create Task Definition**

```json
{
  "family": "lucide-gateway",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "2048",
  "memory": "4096",
  "containerDefinitions": [
    {
      "name": "gateway",
      "image": "your-account.dkr.ecr.us-east-1.amazonaws.com/lucide-gateway:latest",
      "portMappings": [
        {
          "containerPort": 3002,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {"name": "NODE_ENV", "value": "production"},
        {"name": "PORT", "value": "3002"}
      ],
      "secrets": [
        {
          "name": "JWT_SECRET",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789:secret:lucide-jwt-secret"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/lucide-gateway",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

**2. Create ECS Service**

```bash
# Create cluster
aws ecs create-cluster --cluster-name lucide-cluster

# Register task definition
aws ecs register-task-definition --cli-input-json file://task-definition.json

# Create service
aws ecs create-service \
  --cluster lucide-cluster \
  --service-name lucide-gateway-service \
  --task-definition lucide-gateway \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=ENABLED}"
```

### Option B: EC2 with PM2

```bash
# SSH into EC2 instance
ssh -i your-key.pem ec2-user@your-instance-ip

# Install Node.js
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# Clone repository
git clone https://github.com/your-org/lucide.git
cd lucide/lucide-enterprise-gateway

# Install dependencies
npm ci --production

# Install PM2
npm install -g pm2

# Start application
pm2 start src/index.js --name lucide-gateway

# Configure startup script
pm2 startup
pm2 save

# Setup log rotation
pm2 install pm2-logrotate
```

---

## Azure Deployment

### Option A: Azure Container Instances

```bash
# Create resource group
az group create --name lucide-rg --location eastus

# Create container instance
az container create \
  --resource-group lucide-rg \
  --name lucide-gateway \
  --image your-registry.azurecr.io/lucide-gateway:latest \
  --cpu 2 --memory 4 \
  --ports 3002 \
  --dns-name-label lucide-gateway \
  --environment-variables \
    NODE_ENV=production \
    PORT=3002 \
  --secure-environment-variables \
    JWT_SECRET=your-secret-key
```

### Option B: Azure App Service

```bash
# Create App Service plan
az appservice plan create \
  --name lucide-plan \
  --resource-group lucide-rg \
  --is-linux \
  --sku P1V2

# Create web app
az webapp create \
  --name lucide-gateway \
  --resource-group lucide-rg \
  --plan lucide-plan \
  --runtime "NODE|18-lts"

# Configure environment variables
az webapp config appsettings set \
  --name lucide-gateway \
  --resource-group lucide-rg \
  --settings \
    NODE_ENV=production \
    JWT_SECRET=your-secret-key

# Deploy code
az webapp deployment source config-zip \
  --name lucide-gateway \
  --resource-group lucide-rg \
  --src lucide-gateway.zip
```

---

## On-Premise Deployment

### Step 1: Prepare Server

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install build tools
sudo apt install -y build-essential

# Create application user
sudo useradd -m -s /bin/bash lucide
sudo usermod -aG sudo lucide
```

### Step 2: Deploy Application

```bash
# Switch to application user
sudo su - lucide

# Clone repository
cd /opt
git clone https://github.com/your-org/lucide.git
cd lucide/lucide-enterprise-gateway

# Install dependencies
npm ci --production

# Create .env file
cp .env.example .env
nano .env  # Edit with your configuration
```

### Step 3: Setup Systemd Service

Create `/etc/systemd/system/lucide-gateway.service`:

```ini
[Unit]
Description=Lucide Enterprise Gateway
After=network.target

[Service]
Type=simple
User=lucide
WorkingDirectory=/opt/lucide/lucide-enterprise-gateway
ExecStart=/usr/bin/node src/index.js
Restart=on-failure
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=lucide-gateway

Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable lucide-gateway
sudo systemctl start lucide-gateway
sudo systemctl status lucide-gateway
```

---

## SSL/TLS Configuration

### Option 1: Nginx Reverse Proxy

**Install Nginx:**
```bash
sudo apt install nginx certbot python3-certbot-nginx
```

**Configure Nginx** (`/etc/nginx/sites-available/lucide-gateway`):
```nginx
server {
    listen 80;
    server_name gateway.company.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name gateway.company.com;

    ssl_certificate /etc/letsencrypt/live/gateway.company.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/gateway.company.com/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Enable and get certificate:**
```bash
sudo ln -s /etc/nginx/sites-available/lucide-gateway /etc/nginx/sites-enabled/
sudo certbot --nginx -d gateway.company.com
sudo systemctl restart nginx
```

---

## Monitoring & Logging

### Application Monitoring

**Setup PM2 Monitoring:**
```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 100M
pm2 set pm2-logrotate:retain 30

# View metrics
pm2 monit
```

### Log Aggregation

**Setup with ELK Stack:**
```bash
# Forward logs to Elasticsearch
# Configure in filebeat.yml
filebeat.inputs:
- type: log
  enabled: true
  paths:
    - /app/logs/audit.log
  fields:
    app: lucide-gateway
```

### Health Checks

**Setup automated monitoring:**
```bash
# Uptime monitoring with curl
*/5 * * * * curl -f http://localhost:3002/health || systemctl restart lucide-gateway
```

---

## Backup & Recovery

### Backup Strategy

**1. Configuration Backup:**
```bash
# Backup .env and config files daily
0 2 * * * tar -czf /backup/lucide-config-$(date +\%Y\%m\%d).tar.gz /opt/lucide/lucide-enterprise-gateway/.env /opt/lucide/lucide-enterprise-gateway/config.js
```

**2. Log Backup:**
```bash
# Backup audit logs weekly
0 3 * * 0 rsync -av /opt/lucide/lucide-enterprise-gateway/logs/ /backup/logs/
```

### Disaster Recovery

**Recovery Procedure:**
1. Restore configuration files from backup
2. Redeploy application using deployment method
3. Verify database connectivity
4. Test with health check endpoint
5. Restore audit logs if needed

---

## Troubleshooting

### Gateway Won't Start

**Check logs:**
```bash
# PM2
pm2 logs lucide-gateway

# Systemd
sudo journalctl -u lucide-gateway -f

# Docker
docker logs lucide-gateway
```

### Database Connection Issues

**Test connectivity:**
```bash
# PostgreSQL
psql -h your-host -U your-user -d your-database

# MySQL
mysql -h your-host -u your-user -p your-database
```

### Performance Issues

**Monitor resources:**
```bash
# CPU and memory
htop

# Network
netstat -tulpn

# Database connections
# Check connection pool status in logs
```

---

## Support

For deployment assistance, contact:
- **Email**: devops@company.com
- **Slack**: #lucide-support
- **Docs**: https://docs.lucide.com

---

**Last Updated**: 2024-11-11
