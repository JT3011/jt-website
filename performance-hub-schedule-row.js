/* Render only the booking and credit data already authorised by the schedule API. */
import {creditSummary,formatCreditBalance} from './performance-hub-credit-model.js';
export {creditSummary};
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ukDate=(value,options)=>new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',...options}).format(new Date(value));
const sessionDay=value=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));
const arrow='<svg class="cal-action-arrow" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 12h15m-6-6 6 6-6 6"/></svg>';
const chevron='<svg class="cal-credit-chevron" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m7 10 5 5 5-5"/></svg>';

function creditControl(event){
  if(event.can_view_credits!==true)return '';
  const e=escapeHtml;
  if(event.group_players?.length){
    const people=event.group_players.map(member=>{
      const {balances}=creditSummary({credit:member.credit});
      const rows=balances.map(b=>`<div class="cal-credit-service"><span>${e(b.label)}</span><strong>${b.unknown?'Under review':e(formatCreditBalance(b.remaining,b.display_precision))+' left'}</strong></div>`).join('');
      return `<div class="cal-group-credit"><strong>${e(member.name)}</strong>${rows||'<p>Balance pending</p>'}</div>`;
    }).join('');
    return `<details class="cal-credit-details"><summary><span>Session credits</span><strong>By player</strong>${chevron}</summary><div class="cal-credit-body">${people}<p>Balances come from Airtable Payments. Shared balances are labelled. Bookings do not deduct credits.</p></div></details>`;
  }
  const {balances,label}=creditSummary(event);
  const profile=event.player_id?`/performance-hub-portal.html?player=${encodeURIComponent(event.player_id)}`:null;
  const rows=balances.map(b=>`<div class="cal-credit-service"><span>${e(b.label)}</span><strong>${b.unknown?'Under review':e(formatCreditBalance(b.remaining,b.display_precision))+' left'}</strong></div>`).join('');
  const updated=event.credit?.synced_at&&Number.isFinite(Date.parse(event.credit.synced_at))?
    `<p>Saved balance · ${e(ukDate(event.credit.synced_at,{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}))} UK time</p>`:'';
  const empty=event.credit||event.account_pending?'Player matched. No confirmed payment balance is linked in Airtable yet.':event.player_id?'A credit balance has not been connected yet. Ask JT to confirm the remaining sessions.':'Link this booking to the correct player to show their session credit.';
  return `<details class="cal-credit-details"><summary><span>Session credits</span><strong>${e(label)}</strong>${chevron}</summary><div class="cal-credit-body">${rows||`<p>${e(empty)}</p>`}${updated}${balances.length?'<p>Bookings do not deduct credits. JT updates the balance after delivery.</p>':''}${profile?`<a class="cal-credit-profile" href="${e(profile)}">View player &amp; credits ${arrow}</a>`:''}</div></details>`;
}

export function renderCoachSessionRow(event){
  const e=escapeHtml,cancelled=['cancelled','canceled'].includes(event.status);
  const plan=event.source==='Calendly'?`booking=${encodeURIComponent(event.id)}`:event.session_id?`session=${encodeURIComponent(event.session_id)}`:null;
  const log=event.session_id?`/performance-hub-coach-dashboard.html?day=${sessionDay(event.start)}&session=${encodeURIComponent(event.session_id)}`:null;
  const player=event.player_id?`/performance-hub-portal.html?player=${encodeURIComponent(event.player_id)}`:null;
  const name=e(event.players?.join(' & ')||event.name||'Player');
  const reason=event.group_players?.length?'Connect each player’s Hub account before adding feedback or clips to their individual session logs.':event.account_pending?'Connect this player’s Hub account before adding feedback or clips to their session log.':
    event.player_id?'This booking needs to be connected to its Hub session before it can be logged. Ask JT to review the booking.':'Link this booking to the correct player before adding feedback or clips to their session log.';
  return `<article class="cal-row cal-player-row ${cancelled?'cal-cancelled':''}" data-cal-row="${e(event.id)}">
    <time datetime="${e(event.start)}">${e(ukDate(event.start,{hour:'2-digit',minute:'2-digit'}))}<small>to ${e(ukDate(event.end,{hour:'2-digit',minute:'2-digit'}))}</small></time>
    <div class="cal-detail"><div class="cal-row-top"><strong>${player?`<a class="cal-player-name" href="${e(player)}">${name}</a>`:name}</strong><span class="cal-tag">${cancelled?'Cancelled':event.needs_link?'JT review':event.group_players?.length?'Group':event.account_pending?'Matched':e(String(event.status||'scheduled').replaceAll('_',' '))}</span></div><p>${e(event.name)}</p><p>${e(event.coach)}${event.venue?` · ${e(event.venue)}`:''}</p>
    <div class="cal-session-controls">
      <div class="cal-session-buttons">
        ${plan?`<a class="cal-session-action cal-plan-link" href="/performance-hub-plans.html?${plan}"><span>Session plan</span>${arrow}</a>`:'<button class="cal-session-action" type="button" disabled>Session plan</button>'}
        ${log?`<a class="cal-session-action cal-log-link" href="${e(log)}"><span>Session log</span>${arrow}</a>`:`<button class="cal-session-action cal-log-link" type="button" data-cal-log-pending aria-expanded="false"><span>Session log</span>${arrow}</button>`}
      </div>
      ${!log?`<p class="cal-log-help" data-cal-log-help role="status" hidden>${e(reason)}</p>`:''}
      ${creditControl(event)}
    </div>
    </div>
  </article>`;
}

export function wireSessionActions(root){
  const onClick=event=>{
    const button=event.target.closest('[data-cal-log-pending]');
    if(!button||!root.contains(button))return;
    const help=button.closest('.cal-session-controls').querySelector('[data-cal-log-help]');
    help.hidden=!help.hidden;
    button.setAttribute('aria-expanded',String(!help.hidden));
  };
  root.addEventListener('click',onClick);
  return()=>root.removeEventListener('click',onClick);
}
