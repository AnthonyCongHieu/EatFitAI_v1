#!/usr/bin/env bash
set -euo pipefail

sudo apt-get update
sudo apt-get install -y ca-certificates curl git gnupg ufw fail2ban python3-venv python3-pip

if [ ! -f /etc/apt/keyrings/packages-microsoft-prod.gpg ]; then
  curl -fsSL https://packages.microsoft.com/keys/microsoft.asc \
    | gpg --dearmor \
    | sudo tee /etc/apt/keyrings/packages-microsoft-prod.gpg >/dev/null
fi

source /etc/os-release
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/packages-microsoft-prod.gpg] https://packages.microsoft.com/ubuntu/${VERSION_ID}/prod ${VERSION_CODENAME} main" \
  | sudo tee /etc/apt/sources.list.d/microsoft-prod.list >/dev/null

sudo apt-get update
sudo apt-get install -y dotnet-sdk-9.0 aspnetcore-runtime-9.0 caddy

if [ ! -f /swapfile ]; then
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
fi
sudo swapon --show | grep -q /swapfile || sudo swapon /swapfile

sudo install -d -m 0755 /opt/eatfitai
sudo chown "${SUDO_USER:-$USER}:${SUDO_USER:-$USER}" /opt/eatfitai

sudo sed -i 's/^#SystemMaxUse=.*/SystemMaxUse=100M/' /etc/systemd/journald.conf
sudo systemctl restart systemd-journald

sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

echo "Bootstrap complete. Create /opt/eatfitai/ai-provider.env and /opt/eatfitai/backend.env before deploy."
