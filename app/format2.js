// Helpers the lazy views use: Markdown, tables and counts. Kept out of the
// first load on purpose — only the board's format.js ships with index.html.

/** A dollar amount always with cents, for tables ('$130.96'). */
export function usd(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });
}

/** A deadline as a short date in UTC. */
export function date(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' })} UTC`;
}

/** A judge win rate in micro units (950587) as '95.06%'. */
export function pct(micro) {
  const n = Number(micro);
  if (!Number.isFinite(n)) return '—';
  return `${(n / 10000).toFixed(2)}%`;
}

/** A count with thousands separators. */
export function num(n) {
  return Number(n ?? 0).toLocaleString('en-US');
}

/** Text made safe to put inside HTML (shared with format.js's esc). */
export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** A tiny Markdown renderer for bounty descriptions: escaped text, ## headings,
// - lists, **bold**, `code` and paragraphs. No raw HTML ever passes through. */
export function md(src) {
  const lines = String(src ?? '').split('\n');
  let out = '';
  let list = false;
  const inline = (s) =>
    esc(s)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  const closeList = () => {
    if (list) {
      out += '</ul>';
      list = false;
    }
  };
  for (const line of lines) {
    const h = line.match(/^#{1,3}\s+(.*)$/);
    const item = line.match(/^[-*]\s+(.*)$/);
    if (h) {
      closeList();
      out += `<h2>${inline(h[1])}</h2>`;
    } else if (item) {
      if (!list) {
        out += '<ul>';
        list = true;
      }
      out += `<li>${inline(item[1])}</li>`;
    } else if (line.trim() === '') {
      closeList();
    } else {
      closeList();
      out += `<p>${inline(line)}</p>`;
    }
  }
  closeList();
  return out;
}

/** Drop images that fail to load (a dead avatar URL) instead of showing a
    broken frame; images that load are untouched. */
export function hideBrokenImages(root) {
  for (const img of root.querySelectorAll('img')) {
    if (img.complete && img.naturalWidth === 0) img.remove();
    else img.addEventListener('error', () => img.remove());
  }
}

// --- Styles the lazy views bring with them ---------------------------------
// The shared stylesheet stays small by keeping view-only rules out of the
// first load: each lazy view injects the CSS it needs, once, as an inline
// <style> of its own text. Nothing here comes from another origin.

const injected = new Set();
/** Inject a stylesheet once, by key, from the view's own text. */
export function cssOnce(key, text) {
  if (injected.has(key)) return;
  injected.add(key);
  const s = document.createElement('style');
  s.textContent = text;
  document.head.appendChild(s);
}

/** Tables (rewards, leaderboard, entries, payouts), with a phone layout. */
export const tableCss = `table{width:100%;border-collapse:collapse;background:var(--card);border:1px solid var(--line);border-radius:10px;overflow:hidden;font-size:14.5px}th,td{padding:9px 12px;text-align:left;border-bottom:1px solid var(--line)}th{font-size:12.5px;text-transform:uppercase;letter-spacing:.04em;color:var(--muted);background:var(--wash)}tr:last-child td{border-bottom:none}td.num,th.num{text-align:right;font-variant-numeric:tabular-nums}@media(max-width:720px){table{display:block;max-width:100%;overflow-x:auto;font-size:13.5px}th,td{padding:8px}}`;

/** The four stat cards on bounty and profile pages. */
export const statsCss = `.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:16px 0}.stat{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:12px 14px}.stat span{display:block;font-size:12.5px;color:var(--muted);text-transform:uppercase;letter-spacing:.04em}.stat b{font-size:21px;letter-spacing:-.02em}.stat b.green{color:var(--good)}.stat small{display:block;color:var(--muted);font-size:13px;font-weight:400}@media(max-width:720px){.stats{grid-template-columns:repeat(2,1fr)}}`;
