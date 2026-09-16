# Fiber World Operations Platform (FWCPL) - Production Deployment Guide

This guide provides step-by-step instructions for deploying the Branch & Operations Management System on an **Ubuntu Linux Server (22.04 / 24.04 LTS)**.

---

## Architecture Overview

```
[Internet / HTTPS Client]
         │
         ▼ (Port 443 / 80)
   [Nginx Ingress + Let's Encrypt SSL]
         │
    ┌────┴──────────────────────────┐
    ▼                               ▼
[Frontend Static SPA]       [Backend Express API]
 (Port 80 / Nginx)           (Port 5000 / Node.js)
                                    │
                                    ▼ (Port 5432)
                            [PostgreSQL 16 Engine]
                                    │
                             [Docker Volume]
```

---

## Method 1: Docker Compose Deployment (Recommended)

Docker Compose encapsulates the database, Node.js API, and Nginx web server into isolated, auto-restarting containers.

### Step 1: Prepare Server & Install Docker

```bash
# Update Ubuntu packages
sudo apt update && sudo apt upgrade -y

# Install Docker & Compose plugin
sudo apt install -y curl ca-certificates gnupg lsb-release
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Enable and start Docker
sudo systemctl enable --now docker
```

### Step 2: Clone Repository & Configure Environment

```bash
# Clone to /opt/fwcpl
sudo mkdir -p /opt/fwcpl
sudo chown -R $USER:$USER /opt/fwcpl
git clone <YOUR_GIT_REPO_URL> /opt/fwcpl
cd /opt/fwcpl

# Create production environment configuration
cp .env.example .env
nano .env
```

**Recommended `.env` values:**
```env
NODE_ENV=production
PORT=5000
DB_HOST=db
DB_PORT=5432
DB_NAME=fwcpl_operations
DB_USER=fwcpl_admin
DB_PASSWORD=YourStrongDatabasePassword123!
JWT_SECRET=ReplaceWithAStrong64CharRandomSecretKey!
JWT_EXPIRES_IN=7d
VITE_API_URL=/api
```

### Step 3: Build & Launch Containers

```bash
# Build images and launch in detached mode
docker compose up -d --build

# Verify container status
docker compose ps

# Seed demo data (optional for initial walkthrough)
docker compose exec backend npm run seed
```

---

## Method 2: Native Ubuntu Systemd + Nginx Deployment

### 1. Install Node.js 20 & PostgreSQL 16

```bash
# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs build-essential

# Install PostgreSQL 16
sudo apt install -y postgresql postgresql-contrib

# Configure PostgreSQL Database and User
sudo -u postgres psql
```

Inside PostgreSQL prompt:
```sql
CREATE DATABASE fwcpl_operations;
CREATE USER fwcpl_admin WITH ENCRYPTED PASSWORD 'YourStrongDatabasePassword123!';
GRANT ALL PRIVILEGES ON DATABASE fwcpl_operations TO fwcpl_admin;
\q
```

Initialize schema:
```bash
sudo -u postgres psql -d fwcpl_operations -f /opt/fwcpl/backend/src/models/schema.sql
```

### 2. Build Backend & Setup Systemd Service

```bash
cd /opt/fwcpl/backend
npm install
npm run build

# Create systemd service unit
sudo nano /etc/systemd/system/fwcpl-backend.service
```

Paste the following service configuration:
```ini
[Unit]
Description=Fiber World Operations Backend API
After=network.target postgresql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/fwcpl/backend
Environment=NODE_ENV=production
Environment=PORT=5000
Environment=DB_HOST=localhost
Environment=DB_PORT=5432
Environment=DB_NAME=fwcpl_operations
Environment=DB_USER=fwcpl_admin
Environment=DB_PASSWORD=YourStrongDatabasePassword123!
Environment=JWT_SECRET=YourProductionSecretKey123!
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start the service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now fwcpl-backend
sudo systemctl status fwcpl-backend
```

### 3. Build Frontend SPA

```bash
cd /opt/fwcpl/frontend
npm install
npm run build

# Copy build to web server root
sudo mkdir -p /var/www/fwcpl
sudo cp -r dist/* /var/www/fwcpl/
sudo chown -R www-data:www-data /var/www/fwcpl
```

### 4. Configure Nginx Reverse Proxy & SSL

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
sudo nano /etc/nginx/sites-available/fwcpl.conf
```

Configuration:
```nginx
server {
    listen 80;
    server_name operations.fwcpl.com.np; # Replace with your domain

    root /var/www/fwcpl;
    index index.html;

    location /api/ {
        proxy_pass http://localhost:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /uploads/ {
        proxy_pass http://localhost:5000/uploads/;
        proxy_set_header Host $host;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Enable site and activate SSL:
```bash
sudo ln -s /etc/nginx/sites-available/fwcpl.conf /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

# Install free SSL certificate via Let's Encrypt
sudo certbot --nginx -d operations.fwcpl.com.np
```

---

## Automated Backups via Cron

Add a daily automated backup cron job at 02:00 AM:

```bash
sudo crontab -e
```

Add line:
```cron
0 2 * * * /bin/bash /opt/fwcpl/scripts/backup-db.sh >> /var/log/fwcpl-backup.log 2>&1
```

---

## Firewall Hardening (UFW)

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https
sudo ufw enable
```
