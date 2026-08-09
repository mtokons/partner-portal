#!/bin/bash
# Promote the freshly-built partner-portal-portal:latest image into the LIVE
# compose project (partner-portal-main) and clean up the stray failed projects.
set +e
cd ~/partner-portal || exit 1

echo "=== BEFORE ==="
sudo docker ps -a --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}'

# 1. Tear down the stray failed deploy project (default name: partner-portal)
echo "=== Removing stray 'partner-portal' project ==="
sudo docker compose -p partner-portal down --remove-orphans

# 2. Remove leftover dead containers that block name reuse
echo "=== Pruning dead containers ==="
sudo docker container prune -f

# 3. Recreate ONLY the portal service in the live project with the new image.
#    Caddy/cv-tailor/model-test stay running; caddy keeps owning 80/443.
echo "=== Recreating portal in live project (partner-portal-main) ==="
sudo docker compose -p partner-portal-main up -d --no-build --force-recreate portal

echo "=== AFTER ==="
sudo docker compose -p partner-portal-main ps
echo "=== portal image id ==="
sudo docker inspect --format '{{.Config.Image}} {{.Image}}' partner-portal-main-portal-1
