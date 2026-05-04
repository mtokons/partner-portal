#!/bin/bash

# 1. Create a 2GB Swap file (Critical for 1GB RAM machines)
echo "Creating 2GB Swap file..."
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/etc/fstab

# 2. Update and install Docker
echo "Installing Docker..."
sudo apt-get update
sudo apt-get install -y docker.io docker-compose

# 3. Start Docker and enable on boot
sudo systemctl start docker
sudo systemctl enable docker

# 4. Add current user to docker group
sudo usermod -aG docker $USER

echo "Setup complete! Please log out and log back in to apply docker group changes."
