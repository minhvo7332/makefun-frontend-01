// A bounty's leaderboard: every judged entry, ranked by the judge's win rate,
// with its 90% interval, its size and its record. Searchable by handle or title.
// Loaded on demand, so it never enters the first load.

import { get, apiImage } from './api.js';
import { esc } from './format.js';
import { pct } from './format2.js';

export async function leaderboardPage(app, slug) {
  app.innerHTML = '<p class="empty">Loading leaderboard…</p>';
  const data = await get(`/competitions/${encodeURIComponent(slug)}/leaderboard`);
  const entries = data.entries ?? [];
  document.title = `Leaderboard — ${data.competition?.title ?? slug} | make.fun bounties`;
  const phase = data.phase;
  app.innerHTML = `
    <p class="crumbs"><a href="#/">All bounties</a> · <a href="#/bounty/${esc(slug)}">Bounty</a></p>
    <h1>${esc(data.competition?.title ?? slug)}</h1>
    <p class="lede">${esc(data.title ?? 'Leaderboard')} · ${esc(phase?.title ?? '')} phase${phase?.ends_at ? ` · ends ${esc(new Date(phase.ends_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }))} UTC` : ''} · ${entries.length} entries judged</p>
    <div class="controls">
      <input id="q" class="search" type="search" placeholder="Search handle or entry title…" aria-label="Search leaderboard">
    </div>
    <table>
      <thead><tr><th>#</th><th>Entrant</th><th class="num">Win rate</th><th class="num">Interval</th><th class="num">Size</th><th class="num">Games</th></tr></thead>
      <tbody id="rows"></tbody>
    </table>
    <p class="count" id="count"></p>`;

  const q = document.getElementById('q');
  const rowsEl = document.getElementById('rows');
  const countEl = document.getElementById('count');
  function paint() {
    const needle = q.value.trim().toLowerCase();
    const list = entries.filter(
      (e) => !needle || `${e.handle} ${e.title}`.toLowerCase().includes(needle),
    );
    rowsEl.innerHTML =
      list
        .map((e) => {
          const img = e.image
            ? `<img src="${esc(apiImage(e.image))}" alt="" crossorigin="anonymous" loading="lazy">`
            : '';
          const rate = Number(e.values?.judge ?? 0);
          const wins = e.judge?.wins ?? 0;
          const losses = e.judge?.losses ?? 0;
          return `<tr>
          <td>${e.rank}</td>
          <td><span class="who">${img}<span class="nick"><a href="#/u/${encodeURIComponent(e.handle)}">${esc(e.handle)}</a><small>${esc(e.title ?? '')}</small></span></span></td>
          <td class="num"><b>${pct(rate)}</b><span class="bar"><i style="width:${(rate / 10000).toFixed(1)}%"></i></span></td>
          <td class="num">${pct(e.values?.judge_low)}–${pct(e.values?.judge_high)}</td>
          <td class="num">${e.values?.bytes ? `${(e.values.bytes / 1024).toFixed(0)} KiB` : '—'}</td>
          <td class="num">${wins}–${losses}</td>
        </tr>`;
        })
        .join('') || '<tr><td colspan="6" class="empty">No entries match.</td></tr>';
    countEl.textContent = `${list.length} of ${entries.length} entries shown`;
  }
  let timer = 0;
  q.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(paint, 120);
  });
  paint();
}
