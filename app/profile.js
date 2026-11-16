// An account's public profile: its picture and bio, its links, its record, its
// entries and its payouts. Loaded on demand, so it never enters the first load.

import { get, apiImage } from './api.js';
import { esc, money } from './format.js';
import { date, num } from './format2.js';

export async function profilePage(app, handle) {
  app.innerHTML = '<p class="empty">Loading profile…</p>';
  const p = await get(`/profiles/${encodeURIComponent(handle)}`);
  document.title = `${p.handle} | make.fun bounties`;
  const avatar = p.avatar?.url
    ? `<img class="avatar" src="${esc(apiImage(p.avatar.url))}" alt="${esc(p.handle)}" crossorigin="anonymous">`
    : `<span class="initials" aria-hidden="true">${esc((p.handle ?? '?').slice(0, 1).toUpperCase())}</span>`;
  const links = [];
  if (p.github_login) links.push(`<a href="https://github.com/${encodeURIComponent(p.github_login)}">GitHub · ${esc(p.github_login)}</a>`);
  if (p.discord) links.push(`<a href="https://discord.com/users/${encodeURIComponent(p.discord)}">Discord</a>`);
  if (p.x) links.push(`<a href="https://x.com/${encodeURIComponent(p.x)}">X · @${esc(p.x)}</a>`);
  if (p.wallet?.explorer_url) links.push(`<a href="${esc(p.wallet.explorer_url)}">Wallet ↗</a>`);
  const r = p.record ?? {};
  const solutions = (p.solutions ?? [])
    .map(
      (s) => `<tr>
        <td><a href="#/bounty/${encodeURIComponent(s.competition?.slug ?? '')}">${esc(s.competition?.title ?? s.competition?.slug ?? '')}</a><br><small>${esc(s.title ?? '')}</small></td>
        <td class="num">${s.placement ? `#${s.placement}` : '—'}</td>
        <td class="num">${s.prize_usd ? money(s.prize_usd) : '—'}</td>
        <td class="num">${date(s.entered_at)}</td>
      </tr>`,
    )
    .join('');
  const payouts = (p.payouts ?? [])
    .map(
      (w) => `<tr>
        <td><a href="#/bounty/${encodeURIComponent(w.competition?.slug ?? '')}">${esc(w.competition?.title ?? '')}</a></td>
        <td class="num">#${w.place}</td>
        <td class="num"><b>${money(w.amount_usd)}</b></td>
        <td class="num">${date(w.paid_at)}</td>
      </tr>`,
    )
    .join('');
  app.innerHTML = `
    <p class="crumbs"><a href="#/">All bounties</a></p>
    <div class="profile">
      ${avatar}
      <div>
        <h1>${esc(p.display_name ?? p.handle)}</h1>
        <p class="lede">@${esc(p.handle)} · joined ${date(p.joined_at)}</p>
        ${p.bio ? `<p class="bio">${esc(p.bio)}</p>` : ''}
        ${links.length ? `<div class="links">${links.join('')}</div>` : ''}
      </div>
    </div>
    <div class="stats">
      <div class="stat"><span>Entered</span><b>${num(r.competitions_entered)}</b><small>bounties</small></div>
      <div class="stat"><span>Placed</span><b>${num(r.competitions_placed)}</b><small>top finishes</small></div>
      <div class="stat"><span>Won</span><b>${num(r.competitions_won)}</b><small>1st places</small></div>
      <div class="stat"><span>Prize money</span><b class="green">${money(r.prize_usd)}</b><small>paid out</small></div>
    </div>
    <h2>Entries (${(p.solutions ?? []).length})</h2>
    ${solutions ? `<table><thead><tr><th>Bounty</th><th class="num">Place</th><th class="num">Prize</th><th class="num">Entered</th></tr></thead><tbody>${solutions}</tbody></table>` : '<p class="empty">No entries yet.</p>'}
    <h2>Payouts (${(p.payouts ?? []).length})</h2>
    ${payouts ? `<table><thead><tr><th>Bounty</th><th class="num">Place</th><th class="num">Amount</th><th class="num">Paid</th></tr></thead><tbody>${payouts}</tbody></table>` : '<p class="empty">No payouts yet.</p>'}`;
}
