// Thin fetch wrapper: JSON in, JSON out, errors as exceptions with the server's message.

export async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(path, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'same-origin',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.status = res.status;
    err.code = data.code;
    throw err;
  }
  return data;
}

// POSTs JSON and reads an NDJSON stream: calls onEvent for each line, returns the final {done: true, ...} line.
export async function streamNdjson(path, body, onEvent) {
  const res = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), credentials: 'same-origin' });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const err = new Error(data.error || `HTTP ${res.status}`); err.status = res.status; err.code = data.code; throw err;
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '', last = null;
  const handle = line => {
    if (!line.trim()) return;
    const msg = JSON.parse(line);
    if (msg.error) throw new Error(msg.error);
    if (msg.done) last = msg; else onEvent(msg);
  };
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let nl;
    while ((nl = buf.indexOf('\n')) >= 0) { handle(buf.slice(0, nl)); buf = buf.slice(nl + 1); }
  }
  handle(buf);
  if (!last) throw new Error('The connection closed before the assistant finished. Please try again.');
  return last;
}
