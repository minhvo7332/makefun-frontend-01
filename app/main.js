// The router and the bounty board (the first load). The other views load on
// demand with a literal import(), so they never enter the first-load bytes.
// window.__shotReady is false while a page loads and true once its data is on
// screen, so a screenshot script knows when to capture.

import { get, stats, onStats, bust } from './api.js';
import { esc, money, timeLeft } from './format.js';

const app = document.getElementById('app');
const net = document.getElementById('net');

function renderNet() {
  net.textContent =
    `${stats.requests} request${stats.requests === 1 ? '' : 's'}` +
    ` · ${stats.cached} from cache` +
    ` · ${(stats.bytes / 1024).toFixed(1)} KiB transferred`;
}
onStats(renderNet);
renderNet();

/** A bounty is open when its deadline is still ahead and its status says open. */
export function isOpen(b) {
  return b.status === 'open' && new Date(b.deadline).getTime() > Date.now();
}
/** The reward as it stands now: the live pot, falling back to the base reward. */
export function pot(b) {
  return money(b.potUsd ?? b.rewardAmount);
}
function statusBadge(b) {
  const ms = new Date(b.deadline).getTime() - Date.now();
  if (ms <= 0 || b.status !== 'open') return '<span class="badge ended">Ended</span>';
  if (ms < 86400000) return '<span class="badge soon">Closing soon</span>';
  return '<span class="badge open">Open</span>';
}

let boardItems = null;
let boardCursor = null;
let boardError = null;

const state = { q: '', filter: 'all', sort: 'soon' };

function visible(items) {
  const q = state.q.trim().toLowerCase();
  let list = items.filter((b) => {
    if (state.filter === 'open' && !isOpen(b)) return false;
    if (state.filter === 'soon' && !(isOpen(b) && new Date(b.deadline).getTime() - Date.now() < 86400000)) return false;
    if (state.filter === 'ended' && isOpen(b)) return false;
    if (!q) return true;
    const hay = `${b.title} ${b.category} ${b.slug} ${(b.skills ?? []).join(' ')}`.toLowerCase();
    return hay.includes(q);
  });
  const by = {
    // Open bounties first, soonest deadline first; ended ones last, so the
    // board opens on what can still be entered.
    soon: (a, b) => (isOpen(b) - isOpen(a)) || new Date(a.deadline) - new Date(b.deadline),
    pot: (a, b) => Number(b.potUsd ?? b.rewardAmount) - Number(a.potUsd ?? a.rewardAmount),
    entries: (a, b) => b.submissionCount - a.submissionCount,
    az: (a, b) => a.title.localeCompare(b.title),
  };
  return list.sort(by[state.sort] ?? by.soon);
}

function row(b) {
  const fee = b.entryFeeUsd ? `<span class="fee">${money(b.entryFeeUsd)} entry fee</span>` : '';
  const tags = (b.skills ?? []).slice(0, 4).map((s) => `<span class="tag">${esc(s)}</span>`).join('');
  return `<li class="row">
    <div>
      <h2><a href="#/bounty/${encodeURIComponent(b.slug)}">${esc(b.title)}</a></h2>
      <div class="meta">${esc(b.category)} · ${statusBadge(b)} · ${b.submissionCount} ${b.submissionCount === 1 ? 'entry' : 'entries'}</div>
      <div class="tags">${tags}</div>
    </div>
    <div class="pot"><b>${pot(b)}</b><span class="js-countdown" data-deadline="${esc(b.deadline)}">${timeLeft(b.deadline)}</span>${fee}</div>
  </li>`;
}

function paintRows() {
  const list = visible(boardItems ?? []);
  document.getElementById('rows').innerHTML = list.map(row).join('') || '<li class="empty">No bounties match.</li>';
  document.getElementById('count').textContent =
    `${list.length} of ${boardItems.length} bounties shown` + (boardCursor ? ' · more below' : '');
  for (const chip of document.querySelectorAll('.chip')) {
    chip.setAttribute('aria-pressed', String(chip.dataset.filter === state.filter));
  }
}

async function board() {
  document.title = 'make.fun bounties — live board';
  app.innerHTML = `<h1>Open bounties</h1>
    <p class="lede">Every live bounty on make.fun, with its reward as it stands now — the prize plus the entry fees paid into it. Press <kbd>/</kbd> to search.</p>
    <div class="controls">
      <input id="q" class="search" type="search" placeholder="Search bounties, categories, skills…" aria-label="Search bounties" value="${esc(state.q)}">
      <div class="chips" role="group" aria-label="Filter by status">
        <button class="chip" data-filter="all">All</button>
        <button class="chip" data-filter="open">Open</button>
        <button class="chip" data-filter="soon">Closing soon</button>
        <button class="chip" data-filter="ended">Ended</button>
      </div>
      <select id="sort" class="sort" aria-label="Sort bounties">
        <option value="soon">Closing soon first</option>
        <option value="pot">Biggest pot</option>
        <option value="entries">Most entries</option>
        <option value="az">Title A–Z</option>
      </select>
    </div>
    <p class="count" id="count"></p>
    <ul class="board" id="rows"></ul>
    <div id="more"></div>`;
  document.getElementById('sort').value = state.sort;
  const q = document.getElementById('q');
  let timer = 0;
  q.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      state.q = q.value;
      paintRows();
    }, 120);
  });
  for (const chip of document.querySelectorAll('.chip')) {
    chip.addEventListener('click', () => {
      state.filter = chip.dataset.filter;
      paintRows();
    });
  }
  document.getElementById('sort').addEventListener('change', (e) => {
    state.sort = e.target.value;
    paintRows();
  });
  if (boardError) {
    document.getElementById('rows').innerHTML = `<li class="error">${esc(boardError)} <button class="chip" id="retry">Retry</button></li>`;
    document.getElementById('retry').addEventListener('click', () => {
      boardError = null;
      bust('/competitions?status=open&activity=times');
      render();
    });
    return;
  }
  if (!boardItems) {
    document.getElementById('rows').innerHTML = '<li class="empty">Loading live bounties…</li>';
    try {
      const page = await get('/competitions?status=open&activity=times');
      boardItems = page.items ?? [];
      boardCursor = page.next_cursor ?? null;
    } catch (err) {
      boardError = `Could not load the board: ${err.message}`;
      return render();
    }
  }
  paintRows();
  const more = document.getElementById('more');
  if (boardCursor) {
    more.innerHTML = '<button class="more" id="load-more">Load more bounties</button>';
    document.getElementById('load-more').addEventListener('click', async (e) => {
      e.target.disabled = true;
      e.target.textContent = 'Loading…';
      const page = await get(`/competitions?status=open&activity=times&cursor=${encodeURIComponent(boardCursor)}`);
      boardItems.push(...(page.items ?? []));
      boardCursor = page.next_cursor ?? null;
      paintRows();
      if (!boardCursor) more.innerHTML = '';
      else {
        e.target.disabled = false;
        e.target.textContent = 'Load more bounties';
      }
    });
  }
}

/** The countdowns on screen tick every 30 s without a reload. */
setInterval(() => {
  for (const el of document.querySelectorAll('.js-countdown')) {
    el.textContent = timeLeft(el.dataset.deadline);
  }
}, 30000);

/** '/' focuses the board search wherever it is. */
document.addEventListener('keydown', (e) => {
  if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'SELECT') {
    const q = document.getElementById('q');
    if (q) {
      e.preventDefault();
      q.focus();
    }
  }
});

async function render() {
  window.__shotReady = false;
  const hash = location.hash || '#/';
  try {
    const bounty = hash.match(/^#\/bounty\/([^/]+)\/leaderboard$/);
    const single = hash.match(/^#\/bounty\/([^/]+)$/);
    const profile = hash.match(/^#\/u\/([^/]+)$/);
    if (bounty) {
      const { leaderboardPage } = await import('./leaderboard.js');
      await leaderboardPage(app, decodeURIComponent(bounty[1]));
    } else if (single) {
      const { bountyPage } = await import('./bounty.js');
      await bountyPage(app, decodeURIComponent(single[1]));
    } else if (profile) {
      const { profilePage } = await import('./profile.js');
      await profilePage(app, decodeURIComponent(profile[1]));
    } else {
      await board();
    }
  } catch (err) {
    app.innerHTML = `<p class="error">Something went wrong: ${esc(err.message)}</p><p><a href="#/">Back to the board</a></p>`;
  }
  window.scrollTo(0, 0);
  window.__shotReady = true;
}

window.addEventListener('hashchange', render);
render();
