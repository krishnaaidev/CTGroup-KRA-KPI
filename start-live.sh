#!/bin/bash
# CT Group KRA & KPI - Background Live Service Launcher

cd /Users/sumankrishna/Desktop/CTGroup/web

echo "Stopping any existing servers..."
pkill -f "next-server" 2>/dev/null || true
pkill -f "next start" 2>/dev/null || true
pkill -f "cloudflared tunnel" 2>/dev/null || true
sleep 1

echo "Starting Next.js production server on port 3000..."
nohup ./node_modules/.bin/next start -p 3000 > /tmp/ctgroup_nextjs.log 2>&1 &
sleep 2

echo "Starting Cloudflare live tunnel..."
nohup /tmp/cloudflared tunnel --url http://localhost:3000 > /tmp/ctgroup_tunnel.log 2>&1 &
sleep 5

TUNNEL_URL=$(grep -o 'https://[a-zA-Z0-9-]*\.trycloudflare\.com' /tmp/ctgroup_tunnel.log | head -n 1)

echo "========================================================"
echo "CT Group KRA & KPI Portal is LIVE!"
echo "Public URL: $TUNNEL_URL"
echo "APK URL:    $TUNNEL_URL/CTGroup_KRA_KPI.apk"
echo "========================================================"
