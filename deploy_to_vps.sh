#!/bin/bash

# SCCG Partner Portal - Standalone Deployment Script
# Uses tar+scp (rsync not available on this machine)

set -e

VPS_USER="ubuntu"
VPS_IP="158.180.45.36"
VPS_PATH="~/partner-portal"
SSH_KEY="./ssh-key-2026-05-02.key"
SSH_OPTS="-i ${SSH_KEY} -o StrictHostKeyChecking=no"
# Stage build artifacts outside the OneDrive-synced working directory. OneDrive's
# sync engine can lock/rename freshly-written files while tar is reading them,
# causing intermittent "file removed"/"cannot stat" errors and silently-broken
# uploads. Staging to a local, non-synced temp dir avoids that race.
STAGE_DIR="${TMPDIR:-/tmp}/partner-portal-deploy-stage-$$"
GENERATED_ENV_FILE=""

cleanup_generated_env() {
  if [ -n "${GENERATED_ENV_FILE}" ]; then
    rm -f "${GENERATED_ENV_FILE}"
  fi
}
trap cleanup_generated_env EXIT

chmod 600 ${SSH_KEY}

echo "🚀 Starting deployment to SCCG Oracle VPS ($VPS_IP)..."

# User management, authentication, and menu overrides require Firebase Admin.
# Stop before staging/uploading if the selected env file cannot initialize the
# Admin SDK. Never print credential values.
[ -f ./.env.production ] && ENV_FILE="./.env.production" || ENV_FILE="./import.env"

# If the public import file is being used, derive Admin SDK variables from the
# local Firebase service-account JSON. The generated file is temporary and is
# removed on exit; the JSON is never uploaded.
FIREBASE_SERVICE_ACCOUNT_JSON="./SCCGFirebase.json"
[ ! -f "${FIREBASE_SERVICE_ACCOUNT_JSON}" ] && FIREBASE_SERVICE_ACCOUNT_JSON="./FirebaseDetails/sccgport-firebase-adminsdk-fbsvc-269e2c4da4.json"
if [ "${ENV_FILE}" = "./import.env" ] && [ -f "${FIREBASE_SERVICE_ACCOUNT_JSON}" ] && \
   ! grep -Eq '^FIREBASE_CLIENT_EMAIL=.+$' "${ENV_FILE}"; then
  GENERATED_ENV_FILE="${TMPDIR:-/tmp}/partner-portal-production-env-$$"
  cp "${ENV_FILE}" "${GENERATED_ENV_FILE}"
  node scripts/extract-firebase-env.mjs "${FIREBASE_SERVICE_ACCOUNT_JSON}" "${GENERATED_ENV_FILE}"
  ENV_FILE="${GENERATED_ENV_FILE}"
  chmod 600 "${ENV_FILE}"
  echo "🔐 Firebase Admin configuration loaded from local service-account JSON (private key hidden)."
fi

if ! grep -Eq '^((FIREBASE_PROJECT_ID|NEXT_PUBLIC_FIREBASE_PROJECT_ID)=.+)$' "${ENV_FILE}" || \
   ! grep -Eq '^FIREBASE_CLIENT_EMAIL=.+$' "${ENV_FILE}" || \
   ! grep -Eq '^FIREBASE_(PRIVATE_KEY|PRIVATE_KEY_BASE64)=.+$' "${ENV_FILE}"; then
  if ! grep -Eq '^GOOGLE_APPLICATION_CREDENTIALS=.+$' "${ENV_FILE}"; then
    echo "❌ Firebase Admin configuration is missing from ${ENV_FILE}."
    echo "   Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY (or FIREBASE_PRIVATE_KEY_BASE64),"
    echo "   or configure GOOGLE_APPLICATION_CREDENTIALS on the VPS before deploying."
    exit 1
  fi
fi

# NEXT_PUBLIC_* values are compiled into the browser bundle during `next build`.
# The VPS runtime env_file alone cannot configure Firebase in an already-built
# bundle, so load only the public Firebase settings before building locally.
export NEXT_PUBLIC_FIREBASE_API_KEY="$(sed -n 's/^NEXT_PUBLIC_FIREBASE_API_KEY=//p' "${ENV_FILE}")"
export NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="$(sed -n 's/^NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=//p' "${ENV_FILE}")"
export NEXT_PUBLIC_FIREBASE_PROJECT_ID="$(sed -n 's/^NEXT_PUBLIC_FIREBASE_PROJECT_ID=//p' "${ENV_FILE}")"
export NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="$(sed -n 's/^NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=//p' "${ENV_FILE}")"
export NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="$(sed -n 's/^NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=//p' "${ENV_FILE}")"
export NEXT_PUBLIC_FIREBASE_APP_ID="$(sed -n 's/^NEXT_PUBLIC_FIREBASE_APP_ID=//p' "${ENV_FILE}")"

if [ -z "${NEXT_PUBLIC_FIREBASE_API_KEY}" ] || [ -z "${NEXT_PUBLIC_FIREBASE_PROJECT_ID}" ] || \
   [ -z "${NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN}" ] || [ -z "${NEXT_PUBLIC_FIREBASE_APP_ID}" ]; then
  echo "❌ Public Firebase web configuration is missing from ${ENV_FILE}."
  exit 1
fi

echo "🏗️  Building the Next.js bundle with Firebase web configuration..."
npm run build

# Ensure destination exists
ssh ${SSH_OPTS} ${VPS_USER}@${VPS_IP} "mkdir -p ${VPS_PATH}/.next/standalone ${VPS_PATH}/.next/static ${VPS_PATH}/public"

# Stage build artifacts to a non-OneDrive temp directory
echo "📦 Staging build artifacts to ${STAGE_DIR}..."
rm -rf "${STAGE_DIR}"
mkdir -p "${STAGE_DIR}/standalone" "${STAGE_DIR}/static" "${STAGE_DIR}/public"
cp -r ./.next/standalone/. "${STAGE_DIR}/standalone/"
cp -r ./.next/static/. "${STAGE_DIR}/static/"
cp -r ./public/. "${STAGE_DIR}/public/"

# Prepare standalone directory with static assets before sync
echo "📦 Preparing standalone bundle assets..."
mkdir -p "${STAGE_DIR}/standalone/.next/static" "${STAGE_DIR}/standalone/public"
cp -r "${STAGE_DIR}/static/." "${STAGE_DIR}/standalone/.next/static/"
cp -r "${STAGE_DIR}/public/." "${STAGE_DIR}/standalone/public/"

# 1. Pack and transfer standalone artifacts
echo "📂 Packing & uploading standalone production server..."
tar -czf "${STAGE_DIR}/standalone.tar.gz" -C "${STAGE_DIR}" standalone
scp ${SSH_OPTS} "${STAGE_DIR}/standalone.tar.gz" ${VPS_USER}@${VPS_IP}:/tmp/standalone.tar.gz
ssh ${SSH_OPTS} ${VPS_USER}@${VPS_IP} "rm -rf ${VPS_PATH}/.next/standalone && mkdir -p ${VPS_PATH}/.next && tar xzf /tmp/standalone.tar.gz -C ${VPS_PATH}/.next && rm /tmp/standalone.tar.gz"
rm -f /tmp/standalone.tar.gz

# 2. Transfer static assets
echo "📂 Packing & uploading static assets..."
tar -czf "${STAGE_DIR}/static.tar.gz" -C "${STAGE_DIR}" static
scp ${SSH_OPTS} "${STAGE_DIR}/static.tar.gz" ${VPS_USER}@${VPS_IP}:/tmp/static.tar.gz
ssh ${SSH_OPTS} ${VPS_USER}@${VPS_IP} "rm -rf ${VPS_PATH}/.next/static && mkdir -p ${VPS_PATH}/.next && tar xzf /tmp/static.tar.gz -C ${VPS_PATH}/.next && rm /tmp/static.tar.gz"

# 3. Transfer public assets
echo "📂 Uploading public assets..."
tar -czf "${STAGE_DIR}/public.tar.gz" -C "${STAGE_DIR}" public
scp ${SSH_OPTS} "${STAGE_DIR}/public.tar.gz" ${VPS_USER}@${VPS_IP}:/tmp/public.tar.gz
ssh ${SSH_OPTS} ${VPS_USER}@${VPS_IP} "rm -rf ${VPS_PATH}/public && tar xzf /tmp/public.tar.gz -C ${VPS_PATH} && rm /tmp/public.tar.gz"

# Clean up local stage dir
rm -rf "${STAGE_DIR}"

# 4. Transfer Docker config files
echo "📂 Uploading Docker configuration..."
scp ${SSH_OPTS} ./docker-compose.yml ./Dockerfile ./Caddyfile ${VPS_USER}@${VPS_IP}:${VPS_PATH}/
scp ${SSH_OPTS} ${ENV_FILE} ${VPS_USER}@${VPS_IP}:${VPS_PATH}/.env.production

# 5. Transfer CV Tailor service
echo "📂 Uploading CV Tailor Python service..."
tar czf /tmp/cv-tailor.tar.gz --exclude='.venv' --exclude='__pycache__' -C . cv-tailor
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
# NOTE: production runs under the compose project name "partner-portal-main"
# (its caddy owns ports 80/443). We must target that exact project or the new
# stack collides on ports and fails to start, leaving stale/dead containers.
ssh ${SSH_OPTS} ${VPS_USER}@${VPS_IP} << EOF
  cd ${VPS_PATH}
  export COMPOSE_PROJECT_NAME=partner-portal-main

  # Ensure Docker is ready
  if ! command -v docker &> /dev/null; then
    sudo apt-get update
    sudo apt-get install -y docker.io docker-compose-v2
    sudo usermod -aG docker ${VPS_USER}
  fi

  sudo docker compose -p partner-portal-main build --no-cache portal
  sudo docker compose -p partner-portal-main up -d --force-recreate
  echo "✅ Deployment Successful!"
  sudo docker compose -p partner-portal-main ps
EOF

echo "🌐 Your portal is now LIVE on https://portal.mysccg.de"
