#!/bin/bash

# SCCG Partner Portal - Standalone Deployment Script
# This script syncs pre-built standalone artifacts to the VPS.

VPS_USER="ubuntu"
VPS_IP="158.180.45.36"
VPS_PATH="~/partner-portal"
SSH_KEY="./ssh-key-2026-05-02.key"

chmod 600 ${SSH_KEY}

echo "🚀 Starting optimized deployment to SCCG Oracle VPS ($VPS_IP)..."

# Ensure destination exists
ssh -i ${SSH_KEY} ${VPS_USER}@${VPS_IP} "mkdir -p ${VPS_PATH}/.next/standalone ${VPS_PATH}/.next/static"

# Prepare standalone directory with static assets before sync
echo "📦 Preparing standalone bundle assets..."
mkdir -p ./.next/standalone/.next/static ./.next/standalone/public
cp -r ./.next/static/* ./.next/standalone/.next/static/ 2>/dev/null || true
cp -r ./public/* ./.next/standalone/public/ 2>/dev/null || true

# 1. Sync standalone artifacts (the core server)
echo "📂 Syncing standalone production server..."
rsync -avz --delete -e "ssh -i ${SSH_KEY} -o StrictHostKeyChecking=no" \
           ./.next/standalone/ ${VPS_USER}@${VPS_IP}:${VPS_PATH}/.next/standalone/

# 2. Sync static and public assets
echo "📂 Syncing static assets..."
rsync -avz --delete -e "ssh -i ${SSH_KEY} -o StrictHostKeyChecking=no" \
           ./.next/static/ ${VPS_USER}@${VPS_IP}:${VPS_PATH}/.next/static/
rsync -avz --delete -e "ssh -i ${SSH_KEY} -o StrictHostKeyChecking=no" \
           ./public/ ${VPS_USER}@${VPS_IP}:${VPS_PATH}/public/

# 3. Sync Docker configuration and environment
echo "📂 Syncing Docker configuration..."
rsync -avz -e "ssh -i ${SSH_KEY} -o StrictHostKeyChecking=no" \
           ./docker-compose.yml ./Dockerfile ./Caddyfile ./.env.production \
           ${VPS_USER}@${VPS_IP}:${VPS_PATH}/

# 4. Restart Docker Stack on VPS
echo "🏗️  Restarting Docker containers on VPS..."
ssh -i ${SSH_KEY} ${VPS_USER}@${VPS_IP} << EOF
  cd ${VPS_PATH}
  
  # Ensure Docker is ready
  if ! command -v docker &> /dev/null; then
    sudo apt-get update
    sudo apt-get install -y docker.io docker-compose-v2
    sudo usermod -aG docker ${VPS_USER}
  fi

  sudo docker compose down --remove-orphans
  sudo docker compose up -d --build --force-recreate
  echo "✅ Deployment Successful!"
  sudo docker compose ps
EOF

echo "🌐 Your portal is now LIVE on https://portal.mysccg.de"
