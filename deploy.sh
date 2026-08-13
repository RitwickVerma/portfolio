#!/bin/bash
# Deploy the portfolio to CT114 (ritwickverma.dev).
# Builds the Next.js standalone output on this machine, ships the tarball
# through the Proxmox host, and restarts the systemd service on CT114.
set -euo pipefail

cd "$(dirname "$0")"

echo "==> npm ci"
npm ci --prefer-offline

echo "==> build (standalone)"
npm run build

echo "==> assemble standalone tarball"
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public
tar czf /tmp/pf-deploy.tar.gz -C .next/standalone .

echo "==> ship to CT114 via proxmox (192.168.86.10)"
scp -q /tmp/pf-deploy.tar.gz root@192.168.86.10:/tmp/pf-deploy.tar.gz
ssh root@192.168.86.10 "pct push 114 /tmp/pf-deploy.tar.gz /tmp/pf-deploy.tar.gz && pct exec 114 -- bash -c '
  systemctl stop portfolio &&
  cd /opt/portfolio &&
  rm -rf .next public node_modules server.js package.json &&
  tar xzf /tmp/pf-deploy.tar.gz &&
  systemctl start portfolio &&
  sleep 3 &&
  curl -sk -o /dev/null -w \"%{http_code}\" http://localhost:3456/
'"

rm -f /tmp/pf-deploy.tar.gz
echo "==> done"
