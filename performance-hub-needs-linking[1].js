import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://hunrekcnmtabowiivmrk.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_yfi5vW_HTltDcUPAqmqiyQ_qSnckDNJ";

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  { auth: { persistSession: true, autoRefreshToken: true } }
);

const state = {
  bookings: [],
  currentBooking: null,
  selectedPlayer: null,
  searchTimer: null
};

function esc(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function formatWhen(iso) {
  const date = new Date(iso);
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function injectStyles() {
  if (document.getElementById("needsLinkingStyles")) return;

  const style = document.createElement("style");
  style.id = "needsLinkingStyles";
  style.textContent = `
    .linking-head{display:flex;align-items:flex-end;justify-content:space-between;gap:18px;margin:34px 0 16px}
    .linking-head h2{margin:6px 0 0;font-family:"Playfair Display",serif;font-size:clamp(2rem,4vw,3.8rem);line-height:.9}
    .linking-count{min-width:42px;height:42px;padding:0 12px;border-radius:999px;border:1px solid rgba(212,175,55,.35);display:grid;place-items:center;background:rgba(212,175,55,.08);color:#f5e6b3;font-weight:900}
    .linking-list{display:grid;gap:10px}
    .linking-card{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:18px;align-items:center;padding:18px;border:1px solid rgba(255,255,255,.075);border-radius:20px;background:linear-gradient(120deg,rgba(212,175,55,.035),rgba(255,255,255,.012)),#0b0b0b}
    .linking-card h3{margin:0;font-family:"Playfair Display",serif;font-size:1.45rem}
    .linking-card p{margin:7px 0 0;color:#aaa69b;font-size:.7rem;line-height:1.55}
    .linking-tags{display:flex;gap:6px;flex-wrap:wrap;margin-top:9px}
    .linking-tag{padding:6px 9px;border:1px solid rgba(255,255,255,.075);border-radius:999px;color:#cfc8b8;font-size:.54rem;font-weight:800;text-transform:uppercase;letter-spacing:.6px}
    .linking-button{min-height:42px;padding:0 15px;border-radius:999px;border:1px solid rgba(212,175,55,.3);background:rgba(212,175,55,.07);color:#f5e6b3;font-weight:900;font-size:.59rem;text-transform:uppercase;letter-spacing:.7px;cursor:pointer}
    .linking-empty{padding:27px;border:1px dashed rgba(212,175,55,.2);border-radius:20px;color:#aaa69b;text-align:center;line-height:1.65}
    .linking-modal-backdrop{position:fixed;inset:0;z-index:85;background:rgba(0,0,0,.84);backdrop-filter:blur(12px);display:grid;place-items:center;padding:18px}
    .linking-modal{width:min(760px,100%);max-height:92vh;overflow:auto;padding:24px;border:1px solid rgba(212,175,55,.25);border-radius:27px;background:#090909;box-shadow:0 40px 120px rgba(0,0,0,.8)}
    .linking-modal-head{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;margin-bottom:18px}
    .linking-modal-head h2{margin:5px 0 0;font-family:"Playfair Display",serif;font-size:2.4rem;line-height:.9}
    .linking-close{width:42px;height:42px;border-radius:50%;border:1px solid rgba(255,255,255,.075);background:#111;color:#f8f3e7;cursor:pointer}
    .linking-summary{padding:15px;border:1px solid rgba(255,255,255,.075);border-radius:16px;background:#0c0c0c;color:#aaa69b;font-size:.72rem;line-height:1.7}
    .linking-search{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:9px;margin-top:14px}
    .linking-search input{width:100%;border:1px solid rgba(255,255,255,.075);border-radius:14px;background:#0e0e0e;color:#f8f3e7;outline:none;padding:13px 14px}
    .linking-results{display:grid;gap:8px;margin-top:10px}
    .linking-player{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:13px;border:1px solid rgba(255,255,255,.075);border-radius:15px;background:#0c0c0c}
    .linking-player strong{display:block}.linking-player span{display:block;margin-top:5px;color:#aaa69b;font-size:.65rem}
    .linking-select{border:0;background:none;color:#d4af37;font-weight:900;cursor:pointer;text-transform:uppercase;font-size:.58rem}
    .linking-selected{margin-top:13px;padding:14px;border:1px solid rgba(212,175,55,.28);border-radius:15px;background:rgba(212,175,55,.055);color:#f5e6b3;font-size:.72rem;font-weight:800}
    .linking-remember{display:flex;gap:10px;align-items:flex-start;margin-top:15px;padding:14px;border:1px solid rgba(255,255,255,.075);border-radius:15px;color:#cfc8b8;font-size:.68rem;line-height:1.55}
    .linking-remember input{width:auto;margin-top:2px;accent-color:#d4af37}
    .linking-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:17px;flex-wrap:wrap}
    .linking-secondary,.linking-primary{min-height:44px;padding:0 17px;border-radius:999px;font-weight:900;text-transform:uppercase;font-size:.6rem;letter-spacing:.7px;cursor:pointer}
    .linking-secondary{border:1px solid rgba(255,255,255,.075);background:#101010;color:#f8f3e7}
    .linking-primary{border:0;background:linear-gradient(90deg,#d4af37,#f5e6b3);color:#050505}
    .linking-primary:disabled{opacity:.55;cursor:not-allowed}
    .linking-hidden{display:none!important}
    @media(max-width:700px){.linking-card{grid-template-columns:1fr}.linking-button{width:100%}.linking-search{grid-template-columns:1fr}.linking-modal{padding:19px}}
  `;
  document.head.appendChild(style);
}

function buildUI() {
  if (document.getElementById("needsLinkingSection")) return;

  const sessionList = document.getElementById("sessionList");
  if (!sessionList) return;

  const section = document.createElement("section");
  section.id = "needsLinkingSection";
  section.innerHTML = `
    <div class="linking-head">
      <div>
        <div class="eyebrow">Calendly</div>
        <h2>Needs Linking.</h2>
      </div>
      <div class="linking-count" id="needsLinkingCount">0</div>
    </div>
    <div class="linking-list" id="needsLinkingList"></div>
  `;

  sessionList.insertAdjacentElement("afterend", section);

  const modal = document.createElement("div");
  modal.id = "needsLinkingModal";
  modal.className = "linking-modal-backdrop linking-hidden";
  modal.innerHTML = `
    <div class="linking-modal">
      <div class="linking-modal-head">
        <div>
          <div class="eyebrow">Connect Booking</div>
          <h2 id="linkingBookingName">Booking.</h2>
        </div>
        <button class="linking-close" id="closeLinkingModal" type="button">×</button>
      </div>

      <div class="linking-summary" id="linkingSummary"></div>

      <div class="linking-search">
        <input id="linkingPlayerSearch" placeholder="Search the correct player">
        <button class="linking-button" id="linkingSearchButton" type="button">Search</button>
      </div>
      <div class="linking-results" id="linkingPlayerResults"></div>
      <div class="linking-selected linking-hidden" id="linkingSelectedPlayer"></div>

      <label class="linking-remember">
        <input id="linkingRememberContact" type="checkbox" checked>
        <span><strong>Remember this booking contact for future sessions.</strong><br>Turn this off if the same email or phone is shared between siblings who both train with JT.</span>
      </label>

      <div class="linking-actions">
        <button class="linking-secondary" id="cancelLinking" type="button">Cancel</button>
        <button class="linking-primary" id="confirmLinking" type="button" disabled>Link Booking</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  document.getElementById("closeLinkingModal").addEventListener("click", closeModal);
  document.getElementById("cancelLinking").addEventListener("click", closeModal);
  document.getElementById("linkingSearchButton").addEventListener("click", () => {
    searchPlayers(document.getElementById("linkingPlayerSearch").value);
  });
  document.getElementById("linkingPlayerSearch").addEventListener("input", (event) => {
    clearTimeout(state.searchTimer);
    state.searchTimer = setTimeout(() => searchPlayers(event.target.value), 220);
  });
  document.getElementById("linkingPlayerSearch").addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      searchPlayers(event.currentTarget.value);
    }
  });
  document.getElementById("confirmLinking").addEventListener("click", confirmLink);
}

function renderBookings() {
  const count = document.getElementById("needsLinkingCount");
  const wrap = document.getElementById("needsLinkingList");
  if (!count || !wrap) return;

  count.textContent = state.bookings.length;

  if (!state.bookings.length) {
    wrap.innerHTML = `<div class="linking-empty">Every recent Calendly coaching booking is linked to a player profile.</div>`;
    return;
  }

  wrap.innerHTML = state.bookings.map((booking) => `
    <article class="linking-card">
      <div>
        <h3>${esc(booking.invitee_name)}</h3>
        <p>${esc(booking.invitee_email || "No email")} · ${esc(formatWhen(booking.start_at))}</p>
        <div class="linking-tags">
          <span class="linking-tag">${esc(booking.event_name)}</span>
          <span class="linking-tag">${esc(booking.coach_name || "JT Coach")}</span>
          ${booking.venue ? `<span class="linking-tag">${esc(booking.venue)}</span>` : ""}
        </div>
      </div>
      <button class="linking-button" type="button" data-link-booking="${booking.queue_id}">Select Player → Link</button>
    </article>
  `).join("");

  wrap.querySelectorAll("[data-link-booking]").forEach((button) => {
    button.addEventListener("click", () => openModal(button.dataset.linkBooking));
  });
}

async function loadBookings() {
  const { data, error } = await supabase.rpc(
    "session_connect_get_unresolved_bookings",
    { p_limit: 50 }
  );

  if (error) {
    if (/manager access required/i.test(error.message || "")) {
      document.getElementById("needsLinkingSection")?.remove();
      return;
    }
    console.error("Needs Linking queue error:", error);
    return;
  }

  state.bookings = data || [];
  renderBookings();
}

function openModal(queueId) {
  const booking = state.bookings.find((item) => item.queue_id === queueId);
  if (!booking) return;

  state.currentBooking = booking;
  state.selectedPlayer = null;

  document.getElementById("linkingBookingName").textContent =
    booking.invitee_name || "Booking";

  document.getElementById("linkingSummary").innerHTML = `
    <strong>${esc(booking.event_name)}</strong><br>
    ${esc(formatWhen(booking.start_at))} · Coach: ${esc(booking.coach_name || "JT Coach")}<br>
    ${esc(booking.invitee_email || "No booking email")}${booking.invitee_phone ? ` · ${esc(booking.invitee_phone)}` : ""}
  `;

  document.getElementById("linkingPlayerSearch").value =
    booking.invitee_name || "";

  document.getElementById("linkingPlayerResults").innerHTML = "";
  document.getElementById("linkingSelectedPlayer").textContent = "";
  document.getElementById("linkingSelectedPlayer").classList.add("linking-hidden");
  document.getElementById("linkingRememberContact").checked = true;
  document.getElementById("confirmLinking").disabled = true;
  document.getElementById("needsLinkingModal").classList.remove("linking-hidden");

  searchPlayers(booking.invitee_name || "");
}

function closeModal() {
  document.getElementById("needsLinkingModal")?.classList.add("linking-hidden");
  state.currentBooking = null;
  state.selectedPlayer = null;
}

async function searchPlayers(query = "") {
  const wrap = document.getElementById("linkingPlayerResults");
  if (!wrap) return;

  wrap.innerHTML = `<div class="linking-empty">Searching players…</div>`;

  const { data, error } = await supabase.rpc(
    "session_connect_search_players",
    { p_query: query || "" }
  );

  if (error) {
    wrap.innerHTML = `<div class="linking-empty">Could not search players.</div>`;
    return;
  }

  const players = data || [];

  if (!players.length) {
    wrap.innerHTML = `<div class="linking-empty">No matching Hub players found.</div>`;
    return;
  }

  wrap.innerHTML = players.map((player) => `
    <div class="linking-player">
      <div>
        <strong>${esc(player.player_name)}</strong>
        <span>${esc(player.primary_position)} · ${esc(player.playing_level)}</span>
      </div>
      <button
        class="linking-select"
        type="button"
        data-link-player="${player.player_user_id}"
        data-player-name="${esc(player.player_name)}"
      >Choose</button>
    </div>
  `).join("");

  wrap.querySelectorAll("[data-link-player]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedPlayer = {
        id: button.dataset.linkPlayer,
        name: button.dataset.playerName
      };

      const selected = document.getElementById("linkingSelectedPlayer");
      selected.textContent = `Selected: ${state.selectedPlayer.name}`;
      selected.classList.remove("linking-hidden");
      document.getElementById("confirmLinking").disabled = false;
    });
  });
}

async function confirmLink() {
  if (!state.currentBooking || !state.selectedPlayer) return;

  const button = document.getElementById("confirmLinking");
  const remember =
    document.getElementById("linkingRememberContact").checked;

  button.disabled = true;
  button.textContent = "Linking…";

  const { error } = await supabase.rpc(
    "session_connect_link_booking",
    {
      p_queue_id: state.currentBooking.queue_id,
      p_player_user_id: state.selectedPlayer.id,
      p_remember_contact: remember
    }
  );

  if (error) {
    alert(error.message || "Could not link this booking.");
    button.disabled = false;
    button.textContent = "Link Booking";
    return;
  }

  button.textContent = "Linked ✓";
  setTimeout(() => window.location.reload(), 500);
}

async function init() {
  const app = document.getElementById("app");
  if (!app) return;

  injectStyles();
  buildUI();
  await loadBookings();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}
