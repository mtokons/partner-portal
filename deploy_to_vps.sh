#!/bin/bash

# SCCG Partner Portal - Standalone Deployment Script
# Uses tar+scp (rsync not available on this machine)

VPS_USER="ubuntu"
VPS_IP="158.180.45.36"
VPS_PATH="~/partner-portal"
SSH_KEY="./ssh-key-2026-05-02.key"
SSH_OPTS="-i ${SSH_KEY} -o StrictHostKeyChecking=no"

chmod 600 ${SSH_KEY}

echo "🚀 Starting deployment to SCCG Oracle VPS ($VPS_IP)..."

# Ensure destination exists
ssh ${SSH_OPTS} ${VPS_USER}@${VPS_IP} "mkdir -p ${VPS_PATH}/.next/standalone ${VPS_PATH}/.next/static ${VPS_PATH}/public"

# Prepare standalone directory with static assets before sync
echo "📦 Preparing standalone bundle assets..."
mkdir -p ./.next/standalone/.next/static ./.next/standalone/public
cp -r ./.next/static/* ./.next/standalone/.next/static/ 2>/dev/null || true
cp -r ./public/* ./.next/standalone/public/ 2>/dev/null || true

# 1. Pack and transfer standalone artifacts
echo "📂 Packing & uploading standalone production server..."
tar czf /tmp/standalone.tar.gz -C ./.next standalone
scp ${SSH_OPTS} /tmp/standalone.tar.gz ${VPS_USER}@${VPS_IP}:/tmp/standalone.tar.gz
ssh ${SSH_OPTS} ${VPS_USER}@${VPS_IP} "rm -rf ${VPS_PATH}/.next/standalone && mkdir -p ${VPS_PATH}/.next && tar xzf /tmp/standalone.tar.gz -C ${VPS_PATH}/.next && rm /tmp/standalone.tar.gz"
rm -f /tmp/standalone.tar.gz

# 2. Transfer static assets
echo "📂 Packing & uploading static assets..."
tar czf /tmp/static.tar.gz -C ./.next static
scp ${SSH_OPTS} /tmp/static.tar.gz ${VPS_USER}@${VPS_IP}:/tmp/static.tar.gz
ssh ${SSH_OPTS} ${VPS_USER}@${VPS_IP} "rm -rf ${VPS_PATH}/.next/static && mkdir -p ${VPS_PATH}/.next && tar xzf /tmp/static.tar.gz -C ${VPS_PATH}/.next && rm /tmp/static.tar.gz"
rm -f /tmp/static.tar.gz

# 3. Transfer public assets
echo "📂 Uploading public assets..."
tar czf /tmp/public.tar.gz -C . public
scp ${SSH_OPTS} /tmp/public.tar.gz ${VPS_USER}@${VPS_IP}:/tmp/public.tar.gz
ssh ${SSH_OPTS} ${VPS_USER}@${VPS_IP} "rm -rf ${VPS_PATH}/public && tar xzf /tmp/public.tar.gz -C ${VPS_PATH} && rm /tmp/public.tar.gz"
rm -f /tmp/public.tar.gz

# 4. Transfer Docker config files
echo "📂 Uploading Docker configuration..."
[ -f ./.env.production ] && ENV_FILE="./.env.production" || ENV_FILE="./import.env"
scp ${SSH_OPTS} ./docker-compose.yml ./Dockerfile ./Caddyfile ${ENV_FILE} ${VPS_USER}@${VPS_IP}:${VPS_PATH}/.env.production

# 5. Transfer CV Tailor service
echo "📂 Uploading CV Tailor Python service..."
tar czf /tmp/cv-tailor.tar.gz -C . cv-tailor
scp ${SSH_OPTS} /tmp/cv-tailor.tar.gz ${VPS_USER}@${VPS_IP}:/tmp/cv-tailor.tar.gz
ssh ${SSH_OPTS} ${VPS_USER}@${VPS_IP} "rm -rf ${VPS_PATH}/cv-tailor && tar xzf /tmp/cv-tailor.tar.gz -C ${VPS_PATH} && rm /tmp/cv-tailor.tar.gz"
rm -f /tmp/cv-tailor.tar.gz

# 6. Transfer Model Test service
echo "📂 Uploading Model Test Python service..."
tar czf /tmp/model-test.tar.gz -C . model-test-system
scp ${SSH_OPTS} /tmp/model-test.tar.gz ${VPS_USER}@${VPS_IP}:/tmp/model-test.tar.gz
ssh ${SSH_OPTS} ${VPS_USER}@${VPS_IP} "rm -rf ${VPS_PATH}/model-test-system && tar xzf /tmp/model-test.tar.gz -C ${VPS_PATH} && rm /tmp/model-test.tar.gz"
rm -f /tmp/model-test.tar.gz

# 7. Restart Docker Stack on VPS
echo "🏗️  Rebuilding & restarting Docker containers on VPS..."
ssh ${SSH_OPTS} ${VPS_USER}@${VPS_IP} << EOF
  cd ${VPS_PATH}

  # Ensure Docker is ready
  if ! command -v docker &> /dev/null; then
    sudo apt-get update
    sudo apt-get install -y docker.io docker-compose-v2
    sudo usermod -aG docker ${VPS_USER}
  fi

  sudo docker compose down --remove-orphans
  sudo docker compose build --no-cache portal
  sudo docker compose up -d --force-recreate
  echo "✅ Deployment Successful!"
  sudo docker compose ps
EOF

echo "🌐 Your portal is now LIVE on https://portal.mysccg.de"
