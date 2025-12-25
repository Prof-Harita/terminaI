# Cloud Relay Deployment Guide

This guide walks you through deploying the TerminaI Cloud Relay to Google Cloud
Run. The relay enables secure remote access to your desktop agent from anywhere,
without port forwarding.

## Overview

```
┌─────────────────┐          ┌─────────────────┐          ┌─────────────────┐
│  Desktop Agent  │◀────────▶│  Cloud Relay    │◀────────▶│  Web Browser    │
│  (your laptop)  │   E2E    │  (Cloud Run)    │   E2E    │  (phone/tablet) │
│                 │ encrypted│                 │ encrypted│                 │
└─────────────────┘          └─────────────────┘          └─────────────────┘
```

**Key Features:**

- 🔐 **End-to-End Encrypted** — Relay never sees your data
- 🚀 **Zero Config** — No account required
- 💰 **Cheap** — ~$3-15/month in practice
- ⚡ **Fast** — WebSocket-based, low latency

---

## Prerequisites

1. **Google Cloud Account** with billing enabled
2. **gcloud CLI** installed and authenticated
3. **Docker** (optional, for local testing)

---

## Step 1: Set Up Google Cloud Project

```bash
# Create a new project (or use existing)
gcloud projects create terminai-relay --name="TerminaI Relay"

# Set as active project
gcloud config set project terminai-relay

# Enable required APIs
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
```

---

## Step 2: Deploy to Cloud Run

### Option A: Deploy from Source (Recommended)

```bash
# Clone the repository
git clone https://github.com/Prof-Harita/terminaI.git
cd terminaI/packages/cloud-relay

# Deploy directly from source
gcloud run deploy terminai-relay \
  --source . \
  --port 8080 \
  --allow-unauthenticated \
  --region us-central1 \
  --cpu 1 \
  --memory 512Mi \
  --min-instances 0 \
  --max-instances 10 \
  --timeout 3600 \
  --session-affinity
```

### Option B: Deploy Pre-built Container

```bash
# Build and push to Google Container Registry
gcloud builds submit --tag gcr.io/terminai-relay/cloud-relay

# Deploy the container
gcloud run deploy terminai-relay \
  --image gcr.io/terminai-relay/cloud-relay \
  --port 8080 \
  --allow-unauthenticated \
  --region us-central1 \
  --cpu 1 \
  --memory 512Mi \
  --min-instances 0 \
  --max-instances 10 \
  --timeout 3600 \
  --session-affinity
```

> **Important flags explained:**
>
> - `--allow-unauthenticated`: Allows public WebSocket connections
> - `--timeout 3600`: 1-hour max connection time (WebSocket sessions)
> - `--session-affinity`: Keeps client connected to same instance
> - `--min-instances 0`: Scale to zero when idle (saves money)

---

## Step 3: Get Your Relay URL

After deployment, Cloud Run will output a URL like:

```
https://terminai-relay-XXXXX-uc.a.run.app
```

For WebSocket connections, use:

```
wss://terminai-relay-XXXXX-uc.a.run.app
```

---

## Step 4: Configure Custom Domain (Optional)

To use a custom domain like `relay.terminai.org`:

```bash
# Map custom domain
gcloud run domain-mappings create \
  --service terminai-relay \
  --domain relay.terminai.org \
  --region us-central1
```

Then add the DNS records shown to your Cloudflare dashboard.

---

## Step 5: Verify Deployment

### Health Check

```bash
curl https://terminai-relay-XXXXX-uc.a.run.app/health
```

Expected response:

```json
{
  "status": "ok",
  "sessions": 0,
  "connections": 0
}
```

### Test WebSocket Connection

```bash
# Install wscat if needed
npm install -g wscat

# Test connection (should fail with "Invalid params" - that's expected!)
wscat -c "wss://terminai-relay-XXXXX-uc.a.run.app"
```

---

## Step 6: Use with TerminaI

### On Your Desktop

```bash
# Set the relay URL and start the agent
export WEB_REMOTE_RELAY_URL=wss://relay.terminai.org
terminai start
```

The agent will output a secure URL:

```
[Relay] Remote Access URL: https://terminai.org/remote#session=abc123&key=xyz...
```

### On Your Phone/Browser

Open the URL from your desktop. The key stays in the URL fragment (never sent to
server).

---

## Configuration

### Environment Variables

| Variable | Default | Description         |
| -------- | ------- | ------------------- |
| `PORT`   | `8080`  | HTTP/WebSocket port |

### Built-in Limits

| Limit              | Value     | Purpose                         |
| ------------------ | --------- | ------------------------------- |
| Max sessions       | 1000      | Prevents resource exhaustion    |
| Max connections/IP | 10        | Prevents single-IP abuse        |
| Rate limit         | 30/min/IP | Prevents connection spam        |
| Heartbeat          | 30s ping  | Detects dead connections        |
| Timeout            | 60s       | Closes unresponsive connections |

---

## Monitoring

### View Logs

```bash
gcloud run logs read --service terminai-relay --region us-central1
```

### Common Log Messages

```
[abc123] Host connected from 1.2.3.4       # Desktop agent connected
[abc123] Client connected from 5.6.7.8     # Browser connected
[abc123] Host disconnected                  # Desktop agent left
[Heartbeat] Terminating unresponsive...     # Dead connection cleaned up
[RateLimit] IP 1.2.3.4 exceeded...         # Rate limit triggered
```

---

## Cost Estimation

| Usage Level                | Monthly Cost |
| -------------------------- | ------------ |
| Idle (scale to zero)       | ~$0          |
| Light (5% utilization)     | ~$3          |
| Moderate (20% utilization) | ~$13         |
| Full capacity 24/7         | ~$66         |

---

## Troubleshooting

### "Server at capacity"

The relay hit 1000 concurrent sessions. Consider:

- Deploying multiple instances
- Increasing `--max-instances`

### "Too many connections from this IP"

Single IP exceeded 10 connections. This is usually:

- A corporate NAT with many users (increase limit if needed)
- An abuse attempt (working as intended)

### "Rate limit exceeded"

IP made >30 connections in 1 minute. Wait 60 seconds.

### WebSocket closes immediately

Check that `--timeout` is set to 3600 (1 hour) in deployment.

---

## Security Notes

1. **No authentication required** — The relay is intentionally open
2. **E2E encryption** — All traffic is AES-256-GCM encrypted client-to-agent
3. **Key never sent to server** — The encryption key is in the URL fragment
   (`#key=...`)
4. **Rate limiting** — Built-in protection against abuse
5. **No data storage** — Relay is stateless, messages pass through only

---

## Next Steps

- [Configure Web Client](/docs/web-client) — Set up the browser interface
- [CLI Remote Access](/docs/cli/web-remote) — Desktop agent configuration
- [Architecture Overview](/docs/architecture) — How the relay fits in
