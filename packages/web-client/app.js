const chat = document.getElementById('chat');
const input = document.getElementById('input');
const sendButton = document.getElementById('send');
const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');

function setStatus(text, color = 'var(--muted)') {
  statusDot.style.background = color;
  statusText.textContent = text;
}

function appendMessage(role, text) {
  const el = document.createElement('div');
  el.className = `message ${role}`;
  el.textContent = text;
  chat.appendChild(el);
  chat.scrollTop = chat.scrollHeight;
}

async function sendMessage() {
  const value = input.value.trim();
  if (!value) return;
  appendMessage('user', value);
  input.value = '';
  setStatus('Sending…', 'var(--accent)');

  try {
    const response = await fetch('/executeCommand', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        command: 'prompt',
        args: [value],
      }),
    });
    const data = await response.json();
    const reply =
      data?.result?.message ||
      data?.response ||
      data?.message ||
      JSON.stringify(data, null, 2);
    appendMessage('ai', reply || 'No response received.');
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

setStatus('Ready', 'var(--accent)');
