// Finds a quoted excerpt in rendered content and highlights it, even when it spans formatting
// (bold labels, dialogue lines, list items) or differs in quotes, dashes or spacing.
// Used by the review screen (AI findings, anchored comments) and the creator's studio (reviewer comments).

const BLOCKY = 'p,li,h1,h2,h3,h4,h5,dd,dt,blockquote,figcaption,td,th,summary,section,aside,figure,label,div';
const SKIP = 'textarea,input,select,button,svg,script,style,.lh-anno__pin,[data-anchor-skip]';
const ACCEPT = 1, REJECT = 2;   // NodeFilter.FILTER_ACCEPT / FILTER_REJECT

// One character, folded for matching: '' (dropped), ' ' (any space), or a lower-case character (sometimes several).
function fold(ch) {
  if (/\s/.test(ch)) return ' ';
  if ('“”«»„"'.includes(ch)) return '"';
  if ('‘’‚\'`´'.includes(ch)) return "'";
  if ('–—‐‑−'.includes(ch)) return '-';
  if (ch === '…') return '...';
  if (ch === '*' || ch === '​') return '';
  return ch.toLowerCase();
}

export function normalize(s) {
  let out = '';
  for (const ch of String(s || '')) {
    for (const c of fold(ch)) {
      if (c === ' ' && (!out || out.endsWith(' '))) continue;
      out += c;
    }
  }
  return out.trim().replace(/^["']+|["']+$/g, '').trim();
}

// The folded text of `root` with, for each folded character, the text node and offset it came from.
function indexText(root) {
  const chars = [], map = [];
  let lastBlock = null;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: n => (n.parentElement?.closest(SKIP) ? REJECT : ACCEPT),
  });
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const block = n.parentElement.closest(BLOCKY);
    if (block !== lastBlock && chars.length && chars[chars.length - 1] !== ' ') { chars.push(' '); map.push(null); }
    lastBlock = block;
    const v = n.nodeValue;
    for (let i = 0; i < v.length; i++) {
      for (const c of fold(v[i])) {
        if (c === ' ' && (!chars.length || chars[chars.length - 1] === ' ')) continue;
        chars.push(c); map.push([n, i]);
      }
    }
  }
  return { text: chars.join(''), map };
}

// Where `quote` is in `root`: { start: [node, offset], end: [node, offset], exact } or null.
// Without an exact match, the longest run of consecutive words (at least 4) that does match.
export function findQuote(root, quote) {
  const q = normalize(quote);
  if (!root || q.length < 3) return null;
  const { text, map } = indexText(root);
  let at = text.indexOf(q), len = q.length, exact = true;
  if (at < 0) {
    exact = false;
    const words = q.split(' ');
    let best = null;
    for (let size = Math.min(words.length, 14); size >= Math.min(4, words.length) && !best; size--) {
      for (let i = 0; i + size <= words.length; i++) {
        const piece = words.slice(i, i + size).join(' ');
        if (piece.length < 14) continue;
        const k = text.indexOf(piece);
        if (k >= 0) { best = [k, piece.length]; break; }
      }
    }
    if (!best) return null;
    [at, len] = best;
  }
  let s = at; while (s < at + len && !map[s]) s++;
  let e = at + len - 1; while (e > s && !map[e]) e--;
  if (!map[s] || !map[e]) return null;
  return { start: map[s], end: [map[e][0], map[e][1] + 1], exact };
}

// Wraps the found range in one element per text node (make() creates each one). Returns the elements.
export function wrapRange(found, make) {
  const [sn, so] = found.start, [en, eo] = found.end;
  const range = document.createRange();
  range.setStart(sn, so); range.setEnd(en, eo);
  const pieces = [];
  if (sn === en) pieces.push([sn, so, eo]);
  else {
    const top = range.commonAncestorContainer.nodeType === 3 ? range.commonAncestorContainer.parentNode : range.commonAncestorContainer;
    const walker = document.createTreeWalker(top, NodeFilter.SHOW_TEXT, { acceptNode: n => (n.parentElement?.closest(SKIP) ? REJECT : ACCEPT) });
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (!range.intersectsNode(n)) continue;
      if (n === sn) pieces.push([n, so, n.nodeValue.length]);
      else if (n === en) pieces.push([n, 0, eo]);
      else if (n.nodeValue.trim()) pieces.push([n, 0, n.nodeValue.length]);
    }
  }
  const out = [];
  for (const [n, a, b] of pieces) {
    if (b <= a) continue;
    let node = n;
    if (a > 0) node = node.splitText(a);
    if (b - a < node.nodeValue.length) node.splitText(b - a);
    const el = make();
    node.parentNode.insertBefore(el, node);
    el.appendChild(node);
    out.push(el);
  }
  return out;
}

// Finds and wraps in one go. Returns the elements ([] when the quote is not found).
export function markQuote(root, quote, make) {
  const found = findQuote(root, quote);
  return found ? wrapRange(found, make) : [];
}

// Removes earlier highlights (matching `selector`) and the pins next to them.
export function clearMarks(root, selector) {
  root.querySelectorAll(selector).forEach(m => m.replaceWith(...m.childNodes));
  root.normalize();
}

// Opens the <details> around `el`, scrolls it to the middle of the screen and pulses it.
export function reveal(el, pulseEls = [el]) {
  if (!el) return;
  for (let d = el.closest('details'); d; d = d.parentElement?.closest('details')) d.open = true;
  // After opening, let the layout settle for a frame, then scroll the element to the middle of the screen.
  requestAnimationFrame(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  for (const m of pulseEls) { m.classList.remove('lh-pulse'); void m.offsetWidth; m.classList.add('lh-pulse'); }
}

// The block (data-bi) a node is in, for anchoring a selection: { block, blockType }.
export function blockOf(node) {
  const el = (node?.nodeType === 3 ? node.parentElement : node)?.closest('[data-bi]');
  return el ? { block: Number(el.dataset.bi), blockType: el.dataset.bt || null } : { block: null, blockType: null };
}
