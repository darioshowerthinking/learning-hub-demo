// Best-effort parse of a JSON document that is still being streamed: closes the open string,
// drops a dangling key or partial literal, closes open objects/arrays. Returns null if it can't.
export function parsePartial(text) {
  const stack = [];
  let inStr = false, esc = false;
  for (const ch of text) {
    if (inStr) {
      if (esc) esc = false; else if (ch === '\\') esc = true; else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === '{' || ch === '[') stack.push(ch);
    else if (ch === '}' || ch === ']') stack.pop();
  }
  let s = text;
  if (inStr) s = (esc ? s.slice(0, -1) : s) + '"';
  const close = () => stack.slice().reverse().map(c => (c === '{' ? '}' : ']')).join('');
  for (let i = 0; i < 4; i++) {
    try { return JSON.parse(s + close()); } catch { /* trim and retry */ }
    const before = s;
    s = s.replace(/\s+$/, '')
      .replace(/,$/, '')
      .replace(/(^|[{,])\s*"(?:[^"\\]|\\.)*"\s*:?\s*$/, '$1')   // dangling key (with or without colon)
      .replace(/:\s*[a-z]*$/, ':null')                          // partial true/false/null
      .replace(/,$/, '');
    if (s === before) break;
  }
  return null;
}
