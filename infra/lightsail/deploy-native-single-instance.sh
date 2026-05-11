#!/usr/bin/env bash
set -euo pipefail

RELEASE_SHA="${1:-}"
REPO_URL="${REPO_URL:-https://github.com/AnthonyCongHieu/EatFitAI_v1.git}"
BRANCH="${BRANCH:-hieu_deploy/production}"
APP_ROOT="${APP_ROOT:-/opt/eatfitai}"
PRIVATE_IP="${PRIVATE_IP:-}"

if [ -z "${RELEASE_SHA}" ]; then
  echo "Usage: $0 <release-sha>" >&2
  exit 2
fi

if [ -z "${PRIVATE_IP}" ]; then
  PRIVATE_IP="$(hostname -I | awk '{print $1}')"
fi

sudo install -d -m 0755 "${APP_ROOT}"
sudo chown "${SUDO_USER:-$USER}:${SUDO_USER:-$USER}" "${APP_ROOT}"

if [ ! -d "${APP_ROOT}/repo/.git" ]; then
  git clone --branch "${BRANCH}" "${REPO_URL}" "${APP_ROOT}/repo"
fi

cd "${APP_ROOT}/repo"
git fetch origin "${BRANCH}"
git checkout "${BRANCH}"
git reset --hard "${RELEASE_SHA}"

cd "${APP_ROOT}/repo/ai-provider"
python3 -m venv venv
./venv/bin/python -m pip install --upgrade pip
./venv/bin/pip install -r requirements.txt

sudo tee /etc/systemd/system/eatfitai-ai.service >/dev/null <<EOF
[Unit]
Description=EatFitAI AI Provider
After=network-online.target
Wants=network-online.target

[Service]
User=${SUDO_USER:-$USER}
WorkingDirectory=${APP_ROOT}/repo/ai-provider
EnvironmentFile=${APP_ROOT}/ai-provider.env
Restart=always
RestartSec=5
ExecStart=${APP_ROOT}/repo/ai-provider/venv/bin/gunicorn -c gunicorn.conf.py app:app

[Install]
WantedBy=multi-user.target
EOF

cd "${APP_ROOT}/repo/eatfitai-backend"
dotnet publish EatFitAI.API.csproj -c Release -o "${APP_ROOT}/backend-publish" --nologo

sudo tee /etc/systemd/system/eatfitai-backend.service >/dev/null <<EOF
[Unit]
Description=EatFitAI Backend Test
After=network-online.target eatfitai-ai.service
Wants=network-online.target

[Service]
User=${SUDO_USER:-$USER}
WorkingDirectory=${APP_ROOT}/backend-publish
EnvironmentFile=${APP_ROOT}/backend.env
Restart=always
RestartSec=5
ExecStart=/usr/bin/dotnet ${APP_ROOT}/backend-publish/EatFitAI.API.dll

[Install]
WantedBy=multi-user.target
EOF

sudo tee /etc/caddy/Caddyfile >/dev/null <<EOF
ai-provider.eatfitai.com {
  reverse_proxy ${PRIVATE_IP}:5050
}

api-ls.eatfitai.com {
  reverse_proxy 127.0.0.1:10000
}
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now eatfitai-ai
sudo systemctl enable eatfitai-backend
sudo systemctl reload caddy || sudo systemctl restart caddy

sleep 3
systemctl is-active eatfitai-ai
curl -fsS "http://${PRIVATE_IP}:5050/healthz" >/dev/null

echo "AI provider deployed for ${RELEASE_SHA}."
echo "Start backend test with: sudo systemctl restart eatfitai-backend"
