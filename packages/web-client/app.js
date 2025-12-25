import { RelayClient } from './relay-client.js';

const chat = document.getElementById('chat');
const input = document.getElementById('input');
const sendButton = document.getElementById('send');
const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');

let activeTaskId = null;
let currentAssistantEl = null;

// Relay State
let relayClient = null;

// Check for Relay Params
const fragment = new URLSearchParams(window.location.hash.substring(1));
const relayUrl = fragment.get('relay');
const sessionId = fragment.get('session');
const keyBase64 = fragment.get('key');

// Strip fragment to prevent key leakage
if (relayUrl && sessionId && keyBase64) {
  history.replaceState(
    null,
    '',
    window.location.pathname + window.location.search,
  );
}

function setStatus(text, color = 'var(--muted)') {
  statusDot.style.background = color;
  statusText.textContent = text;
}

if (relayUrl && sessionId && keyBase64) {
  console.log('Using Cloud Relay Mode');
  relayClient = new RelayClient(
    relayUrl,
    sessionId,
    keyBase64,
    (msg) => handleA2aEvent(msg), // onMessage
    (text, color) => setStatus(text, color), // onStatus
    () => renderPairingPrompt(), // onPairingRequired
  );
  relayClient.connect();
  // Wait for handshake before allowing UI interactions
  setTimeout(() => {
    if (relayClient && relayClient.state !== 'READY') {
      setStatus('Waiting for handshake...', 'var(--muted)');
    }
  }, 1000);
}

function appendMessage(role, text) {
  const el = document.createElement('div');
  el.className = `message ${role}`;
  el.textContent = text;
  chat.appendChild(el);
  chat.scrollTop = chat.scrollHeight;
  return el;
}

function getToken() {
  // If using Relay, we don't need a token
  if (relayClient) return 'relay-mode';

  const url = new URL(window.location.href);
  const token = url.searchParams.get('token');
  if (token) {
    localStorage.setItem('termai_token', token);
    url.searchParams.delete('token');
    window.history.replaceState({}, '', url.toString());
    return token;
  }
  return localStorage.getItem('termai_token') || '';
}

async function sha256Hex(text) {
  const enc = new TextEncoder();
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(text));
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function hmacSha256Hex(key, payload) {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    cryptoKey,
    enc.encode(payload),
  );
  return [...new Uint8Array(signature)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function signedHeaders({ token, method, pathWithQuery, bodyString }) {
  const nonce = crypto.randomUUID();
  const bodyHash = await sha256Hex(bodyString);
  const payload = [method.toUpperCase(), pathWithQuery, bodyHash, nonce].join(
    '\n',
  );
  const signature = await hmacSha256Hex(token, payload);
  return {
    Authorization: `Bearer ${token}`,
    'X-Gemini-Nonce': nonce,
    'X-Gemini-Signature': signature,
  };
}

async function readSse(response, onEvent) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n\n');
    buffer = parts.pop() || '';
    for (const chunk of parts) {
      const lines = chunk.split('\n').filter((l) => l.startsWith('data:'));
      for (const line of lines) {
        const data = line.slice('data:'.length).trimStart();
        if (!data) continue;
        try {
          onEvent(JSON.parse(data));
        } catch {
          // ignore malformed event
        }
      }
    }
  }
}

function ensureAssistantMessage() {
  if (!currentAssistantEl) {
    currentAssistantEl = appendMessage('ai', '');
  }
  return currentAssistantEl;
}

function clearAssistantMessage() {
  currentAssistantEl = null;
}

function renderPairingPrompt() {
  // Remove any existing pairing prompt
  const existing = document.getElementById('pairing-prompt');
  if (existing) existing.remove();

  const wrapper = document.createElement('div');
  wrapper.id = 'pairing-prompt';
  wrapper.className = 'message ai';
  wrapper.style.maxWidth = '100%';

  const title = document.createElement('div');
  title.textContent = 'Pairing Required';
  title.style.fontWeight = '700';
  title.style.marginBottom = '6px';

  const body = document.createElement('div');
  body.textContent =
    'Enter the 6-digit pairing code shown on the host terminal:';
  body.style.marginBottom = '10px';

  const codeInput = document.createElement('input');
  codeInput.type = 'text';
  codeInput.placeholder = 'Enter code (6 digits)';
  codeInput.inputMode = 'numeric';
  codeInput.pattern = '\\d*';
  codeInput.maxLength = 6;
  codeInput.style.width = '100%';
  codeInput.style.marginBottom = '10px';
  codeInput.style.padding = '10px 12px';
  codeInput.style.borderRadius = '12px';
  codeInput.style.border = '1px solid var(--border)';
  codeInput.style.background = 'rgba(255,255,255,0.03)';
  codeInput.style.color = 'var(--text)';
  codeInput.style.fontSize = '18px';
  codeInput.style.textAlign = 'center';
  codeInput.style.letterSpacing = '0.3em';

  const submitBtn = document.createElement('button');
  submitBtn.textContent = 'Pair';
  submitBtn.style.width = '100%';
  submitBtn.disabled = true;

  const validateCode = () => {
    const val = (codeInput.value || '').replace(/\D/g, '');
    codeInput.value = val.slice(0, 6);
    return codeInput.value.length === 6;
  };

  codeInput.addEventListener('input', () => {
    submitBtn.disabled = !validateCode();
  });

  submitBtn.addEventListener('click', async () => {
    const code = codeInput.value.trim();
    if (code.length !== 6) return;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Pairing...';
    try {
      await relayClient.sendPairingCode(code);
      // Success will be handled by PAIR_ACK message
      wrapper.remove();
    } catch (e) {
      submitBtn.textContent = 'Pair';
      submitBtn.disabled = false;
      console.error('Pairing error:', e);
    }
  });

  // Allow Enter key to submit
  codeInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !submitBtn.disabled) {
      submitBtn.click();
    }
  });

  wrapper.appendChild(title);
  wrapper.appendChild(body);
  wrapper.appendChild(codeInput);
  wrapper.appendChild(submitBtn);
  chat.appendChild(wrapper);
  chat.scrollTop = chat.scrollHeight;
  codeInput.focus();
}

function renderConfirmation({ callId, prompt, requiresPin, pinLength }) {
  const wrapper = document.createElement('div');
  wrapper.className = 'message ai';
  wrapper.style.maxWidth = '100%';

  const title = document.createElement('div');
  title.textContent = 'Confirmation required';
  title.style.fontWeight = '700';
  title.style.marginBottom = '6px';

  const body = document.createElement('div');
  body.textContent = prompt;
  body.style.whiteSpace = 'pre-wrap';
  body.style.marginBottom = '10px';

  const pinInput = document.createElement('input');
  pinInput.type = 'password';
  pinInput.placeholder = requiresPin ? `PIN (${pinLength} digits)` : '';
  pinInput.inputMode = 'numeric';
  pinInput.pattern = '\\d*';
  pinInput.style.width = '100%';
  pinInput.style.marginBottom = '10px';
  pinInput.style.padding = '10px 12px';
  pinInput.style.borderRadius = '12px';
  pinInput.style.border = '1px solid var(--border)';
  pinInput.style.background = 'rgba(255,255,255,0.03)';
  pinInput.style.color = 'var(--text)';
  pinInput.style.display = requiresPin ? 'block' : 'none';

  const actions = document.createElement('div');
  actions.style.display = 'flex';
  actions.style.gap = '10px';

  const yes = document.createElement('button');
  yes.textContent = 'Yes, proceed';
  yes.style.flex = '1';

  const no = document.createElement('button');
  no.textContent = 'Cancel';
  no.style.flex = '1';
  no.style.background = 'rgba(255,255,255,0.08)';
  no.style.color = 'var(--text)';
  no.style.boxShadow = 'none';
  no.style.border = '1px solid var(--border)';

  const validatePin = () => {
    if (!requiresPin) return true;
    const val = (pinInput.value || '').replace(/\D/g, '');
    pinInput.value = val.slice(0, pinLength);
    return pinInput.value.length === pinLength;
  };

  pinInput.addEventListener('input', () => {
    validatePin();
    yes.disabled = requiresPin && !validatePin();
  });

  yes.disabled = requiresPin;

  yes.addEventListener('click', async () => {
    const pin = requiresPin
      ? (pinInput.value || '').replace(/\D/g, '')
      : undefined;
    if (requiresPin && (!pin || pin.length !== pinLength)) return;
    await sendToolConfirmation(callId, true, pin);
    wrapper.remove();
  });

  no.addEventListener('click', async () => {
    const pin = requiresPin
      ? (pinInput.value || '').replace(/\D/g, '')
      : undefined;
    await sendToolConfirmation(callId, false, pin);
    wrapper.remove();
  });

  actions.appendChild(yes);
  actions.appendChild(no);

  wrapper.appendChild(title);
  wrapper.appendChild(body);
  wrapper.appendChild(pinInput);
  wrapper.appendChild(actions);
  chat.appendChild(wrapper);
  chat.scrollTop = chat.scrollHeight;
}

async function postStream(body) {
  // If Relay Mode
  if (relayClient) {
    await relayClient.send(body);
    return { ok: true, relayMode: true };
  }

  const token = getToken();
  if (!token) {
    setStatus('Missing token (open /ui?token=...)', 'var(--danger)');
    appendMessage(
      'error',
      'Missing token. Start web-remote and open the URL with ?token=...',
    );
    throw new Error('Missing token');
  }

  const bodyString = JSON.stringify(body);
  const headers = await signedHeaders({
    token,
    method: 'POST',
    pathWithQuery: '/',
    bodyString,
  });

  return fetch('/', {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: bodyString,
  });
}

async function sendToolConfirmation(callId, approved, pin) {
  if (!activeTaskId) {
    appendMessage('error', 'No active task. Send a message first.');
    return;
  }
  setStatus('Confirming…', 'var(--accent)');
  clearAssistantMessage();

  const body = {
    jsonrpc: '2.0',
    id: '1',
    method: 'message/stream',
    params: {
      message: {
        kind: 'message',
        role: 'user',
        parts: [
          {
            kind: 'data',
            data: {
              callId,
              outcome: approved ? 'proceed_once' : 'cancel',
              ...(pin ? { pin } : {}),
            },
          },
        ],
        messageId: crypto.randomUUID(),
      },
      metadata: {
        coderAgent: { kind: 'agent-settings', workspacePath: '/tmp' },
      },
      taskId: activeTaskId,
    },
  };

  const response = await postStream(body);
  if (response.relayMode) return;

  if (!response.ok || !response.body) {
    appendMessage(
      'error',
      `Confirmation failed: ${response.status} ${response.statusText}`,
    );
    setStatus('Offline', 'var(--danger)');
    return;
  }

  await readSse(response, handleA2aEvent);
  setStatus('Connected', 'var(--accent)');
}

function handleA2aEvent(evt) {
  if (!evt || !evt.result) return;
  const result = evt.result;

  if (result.kind === 'task' && typeof result.id === 'string') {
    activeTaskId = result.id;
    return;
  }

  if (result.kind !== 'status-update') return;

  const coder = result.metadata?.coderAgent;
  const kind = coder?.kind;

  if (kind === 'text-content') {
    const parts = result.status?.message?.parts || [];
    for (const part of parts) {
      if (part?.kind === 'text' && typeof part.text === 'string') {
        const el = ensureAssistantMessage();
        el.textContent += part.text;
        chat.scrollTop = chat.scrollHeight;
      }
    }
  }

  if (kind === 'tool-call-confirmation') {
    const part = (result.status?.message?.parts || []).find(
      (p) => p?.kind === 'data' && p.data,
    );
    const tool = part?.data || {};
    const callId = tool?.request?.callId;
    const prompt =
      tool?.confirmationDetails?.prompt ||
      tool?.confirmationDetails?.command ||
      'Confirm tool execution';
    const requiresPin = tool?.confirmationDetails?.requiresPin === true;
    const pinLength =
      typeof tool?.confirmationDetails?.pinLength === 'number'
        ? tool.confirmationDetails.pinLength
        : 6;
    if (callId) {
      renderConfirmation({ callId, prompt, requiresPin, pinLength });
    }
  }

  if (result.final === true) {
    setStatus('Connected', 'var(--accent)');
    clearAssistantMessage();
    // Re-enable send button if disabled?
  }
}

async function sendMessage() {
  const value = input.value.trim();
  if (!value) return;
  appendMessage('user', value);
  input.value = '';
  clearAssistantMessage();
  setStatus('Sending…', 'var(--accent)');

  const body = {
    jsonrpc: '2.0',
    id: '1',
    method: 'message/stream',
    params: {
      message: {
        kind: 'message',
        role: 'user',
        parts: [{ kind: 'text', text: value }],
        messageId: crypto.randomUUID(),
      },
      metadata: {
        coderAgent: { kind: 'agent-settings', workspacePath: '/tmp' },
      },
      ...(activeTaskId ? { taskId: activeTaskId } : {}),
    },
  };

  try {
    const response = await postStream(body);
    if (response.relayMode) return;

    if (!response.ok || !response.body) {
      appendMessage(
        'error',
        `Request failed: ${response.status} ${response.statusText}`,
      );
      setStatus('Offline', 'var(--danger)');
      return;
    }
    await readSse(response, handleA2aEvent);
    setStatus('Connected', 'var(--accent)');
  } catch (error) {
    appendMessage('error', error?.message || 'Failed to reach server.');
    setStatus('Offline', 'var(--danger)');
  }
}

sendButton.addEventListener('click', () => {
  void sendMessage();
});

input.addEventListener('keydown', (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
    event.preventDefault();
    void sendMessage();
  }
});

setStatus(
  getToken() ? 'Ready' : 'Missing token',
  getToken() ? 'var(--accent)' : 'var(--danger)',
);
