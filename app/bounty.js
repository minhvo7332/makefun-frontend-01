// One bounty's page: its live pot and rewards table, its dates and status, its
// description and rules, and a link to its leaderboard. Loaded on demand, so it
// never enters the first load.

import { get } from './api.js';
import { esc, money, timeLeft } from './format.js';
import { usd, date, md } from './format2.js';
import { pot, isOpen } from './main.js';

function rewardsTable(b) {
  const now = b.rewardsNow ?? [];
  const rows = now.length
    ? now.map(
        (r) => `<tr><td>${r.place}</td><td class="num">${usd(r.baseUsd)}</td><td class="num">${usd(r.feeShareUsd)}</td><td class="num"><b>${usd(r.amountUsd)}</b></td></tr>`,
      )
    : Object.entries(b.rewards ?? {}).map(
        ([place, amount]) => `<tr><td>${place}</td><td class="num">${usd(amount)}</td><td class="num">—</td><td class="num"><b>${usd(amount)}</b></td></tr>`,
      );
  return `<h2>Rewards</h2>
  <table>
    <thead><tr><th>Place</th><th class="num">Prize</th><th class="num">Fee share</th><th class="num">Total now</th></tr></thead>
    <tbody>${rows.join('')}</tbody>
  </table>
  <p class="lede">The pot grows with every entry fee paid: ${money(b.entryFeesUsd ?? 0)} in fees from ${b.entryFeePayers ?? 0} payers so far.</p>`;
}

export async function bountyPage(app, slug) {
  app.innerHTML = '<p class="empty">Loading bounty…</p>';
  const b = await get(`/competitions/${encodeURIComponent(slug)}`);
  document.title = `${b.title} | make.fun bounties`;
  const open = isOpen(b);
  const badge = open
    ? new Date(b.deadline).getTime() - Date.now() < 86400000
      ? '<span class="badge soon">Closing soon</span>'
      : '<span class="badge open">Open</span>'
    : '<span class="badge ended">Ended</span>';
  const sponsor = b.sponsor ? `<p class="lede">By ${esc(b.sponsor.name)}${b.sponsor.isVerified ? ' · verified' : ''} · ${esc(b.category)}</p>` : '';
  const skills = (b.skills ?? []).map((s) => `<span class="tag">${esc(s)}</span>`).join('');
  app.innerHTML = `
    <p class="crumbs"><a href="#/">All bounties</a> · <a href="#/bounty/${esc(b.slug)}/leaderboard">Leaderboard</a></p>
    <h1>${esc(b.title)}</h1>
    ${sponsor}
    <p>${badge} <span class="tags">${skills}</span></p>
    <div class="stats">
      <div class="stat"><span>Live pot</span><b class="green">${pot(b)}</b><small>prize + entry fees</small></div>
      <div class="stat"><span>Entry fee</span><b>${b.entryFeeUsd ? money(b.entryFeeUsd) : 'Free'}</b><small>${b.entryFeePayers ? `${b.entryFeePayers} paid` : 'no fee'}</small></div>
      <div class="stat"><span>Entries</span><b>${b.submissionCount}</b><small>submissions</small></div>
      <div class="stat"><span>Time left</span><b class="js-countdown" data-deadline="${esc(b.deadline)}">${timeLeft(b.deadline)}</b><small>${date(b.deadline)}</small></div>
    </div>
    <p class="lede">${esc(b.summary ?? '')}</p>
    ${rewardsTable(b)}
    <h2>Description</h2>
    <div class="description">${md(b.description ?? '')}</div>
    <p class="lede">Published ${date(b.publishedAt)} · <a href="https://make.fun/bounty/${esc(b.slug)}">View on make.fun ↗</a></p>`;
}
