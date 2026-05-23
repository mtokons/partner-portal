#!/bin/bash

# SCCG Partner Portal - One-Click Deployment Script
# This script syncs the new stabilized code to your Oracle VPS and restarts the Docker stack.

VPS_USER="ubuntu"
VPS_IP="158.180.45.36"
VPS_PATH="~/partner-portal"
SSH_KEY="./ssh-key-2026-05-02.key"

# Fix key permissions (SSH requirement)
chmod 600 ${SSH_KEY}

echo "🚀 Starting deployment to SCCG Oracle VPS ($VPS_IP)..."

# Ensure destination exists
ssh -i ${SSH_KEY} ${VPS_USER}@${VPS_IP} "mkdir -p ${VPS_PATH}"

# 1. Sync code
echo "📂 Syncing cleaned code and production environment..."
rsync -avz -e "ssh -i ${SSH_KEY} -o StrictHostKeyChecking=no" \
           --exclude 'node_modules' \
           --exclude '.next/cache' \
           --exclude '.next/dev' \
           --exclude '.git' \
           --exclude '.env.local' \
           ./ ${VPS_USER}@${VPS_IP}:${VPS_PATH}

# 2. Restart Docker Stack on VPS
echo "🏗️  Rebuilding and restarting Docker containers on VPS..."
ssh -i ${SSH_KEY} ${VPS_USER}@${VPS_IP} << EOF
  cd ${VPS_PATH}
  
  # Install Docker if missing
  if ! command -v docker &> /dev/null; then
    echo "🐳 Docker not found. Installing..."
    sudo apt-get update
    sudo apt-get install -y docker.io docker-compose-v2
    sudo usermod -aG docker ${VPS_USER}
  fi

  # Create Swap file if missing (Required for 1GB RAM instances to build Next.js)
  if [ ! -f /swapfile ]; then
    echo "💾 Creating 2GB Swap file for build stability..."
    sudo fallocate -l 2G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
  fi

  sudo docker compose down
  sudo docker compose up -d --build
  echo "✅ Deployment Successful!"
  sudo docker compose ps
EOF

echo "🌐 Your portal is now LIVE on https://portal.mysccg.de"
