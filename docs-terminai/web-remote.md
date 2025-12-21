# Web Remote Guide

Control your terminal from anywhere via web browser.

## Overview

Web Remote (via A2A Server) enables browser-based access to your local terminaI agent. Access your terminal from your phone, tablet, or any device with a browser.

**Status:** 🚧 POC Available in Stable Core v0.21

## Architecture

```
[Browser Client] ←→ [A2A Server] ←→ [Local terminaI Agent]
   (Anywhere)       (Port 41242)     (Your Machine)
```

## Setup

### 1. Start the A2A Server

```bash
cd termAI
npm run start:a2a-server
```

The server will start on `http://localhost:41242`.

### 2. Start the Web Client

```bash
cd packages/web-client
npm start
```

The web UI will open at `http://localhost:3000`.

### 3. Connect

The web client automatically connects to the A2A server. You can now send commands from the browser.

## Features

- **Remote Command Execution**: Run terminal commands from any device
- **Process Monitoring**: View running background processes
- **Session Management**: Start/stop/monitor long-running tasks
- **Real-time Updates**: Live streaming of command output

## Security

⚠️ **Current POC limitations**:
- Local network only (no internet exposure yet)
- No authentication (localhost only)
- No SSL/TLS encryption

**Future roadmap** (post-100 stars):
- QR code pairing
- End-to-end encryption
- Cloudflare Tunnel integration for remote access
- Read-only observer mode

## Troubleshooting

### Connection Failed

Ensure both the A2A server and web client are running:
```bash
# Terminal 1
npm run start:a2a-server

# Terminal 2
cd packages/web-client && npm start
```

### Port Already in Use

Change the A2A server port:
```bash
CODER_AGENT_PORT=8080 npm run start:a2a-server
```

For more help, see [Troubleshooting](../docs/troubleshooting.md).
