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
