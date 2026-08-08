import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const supabase = createClient(
  "https://hunrekcnmtabowiivmrk.supabase.co",
  "sb_publishable_yfi5vW_HTltDcUPAqmqiyQ_qSnckDNJ",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true
    }
  }
);

const STATE_LABELS = {
  match_ready: "Match Ready",
  energised: "Energised",
  fresh: "Fresh",
  low_focus: "Low Focus",
  tired: "Tired",
  fatigued: "Fatigued"
};

function injectStyles() {
  if (document.getElementById("jtReadinessJournalStyles")) return;

  const style = document.createElement("style");
  style.id = "jtReadinessJournalStyles";
  style.textContent = `
    .jt-readiness-journal {
      width: min(1380px, calc(100% - 34px));
      margin: 34px auto;
      padding: clamp(22px, 4vw, 38px);
      border: 1px solid rgba(212,175,55,.18);
      border-radius: 28px;
      background:
        radial-gradient(circle at 92% 8%, rgba(212,175,55,.08), transparent 18rem),
        linear-gradient(145deg, rgba(255,255,255,.028), rgba(255,255,255,.007)),
        #080808;
      color: #f8f3e8;
      font-family: Montserrat, sans-serif;
      box-shadow: 0 34px 100px rgba(0,0,0,.4);
    }

    .jt-rj-head {
      display: flex;
      justify-content: space-between;
      gap: 22px;
      align-items: flex-end;
      flex-wrap: wrap;
      padding-bottom: 22px;
      border-bottom: 1px solid rgba(255,255,255,.08);
    }

    .jt-rj-kicker {
      color: #d4af37;
      font-size: .62rem;
      font-weight: 900;
      letter-spacing: 1.5px;
      text-transform: uppercase;
    }

    .jt-rj-title {
      margin: 8px 0 0;
      color: #f8f3e8;
      font-family: "Playfair Display", serif;
      font-size: clamp(2rem, 4vw, 3.7rem);
      line-height: .94;
      letter-spacing: -.04em;
    }

    .jt-rj-title span { color: #d4af37; }

    .jt-rj-sub {
      margin-top: 8px;
      color: #9f998d;
      font-size: .66rem;
      line-height: 1.6;
    }

    .jt-rj-summary {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .jt-rj-chip {
      padding: 9px 11px;
      border: 1px solid rgba(255,255,255,.09);
      border-radius: 999px;
      background: rgba(255,255,255,.018);
      color: #cec6b7;
      font-size: .54rem;
      font-weight: 800;
      letter-spacing: .55px;
      text-transform: uppercase;
    }

    .jt-rj-list {
      margin-top: 20px;
      display: grid;
      gap: 10px;
    }

    .jt-rj-entry {
      display: grid;
      grid-template-columns: minmax(140px,.75fr) minmax(110px,.45fr) minmax(0,1.8fr) auto;
      gap: 16px;
      align-items: center;
      padding: 16px;
      border: 1px solid rgba(255,255,255,.075);
      border-radius: 18px;
      background: rgba(255,255,255,.014);
    }

    .jt-rj-date b,
    .jt-rj-state b {
      display: block;
      color: #f5e6ad;
      font-size: .62rem;
      letter-spacing: .7px;
      text-transform: uppercase;
    }

    .jt-rj-date span,
    .jt-rj-state span {
      display: block;
      margin-top: 5px;
      color: #8f897e;
      font-size: .55rem;
    }

    .jt-rj-score {
      color: #d4af37;
      font-family: "Playfair Display", serif;
      font-size: 2.25rem;
      font-weight: 900;
      line-height: .85;
    }

    .jt-rj-score small {
      color: #7f796e;
      font-family: Montserrat, sans-serif;
      font-size: .48rem;
      letter-spacing: .5px;
      text-transform: uppercase;
    }

    .jt-rj-metrics {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }

    .jt-rj-metric {
      padding: 7px 9px;
      border-radius: 10px;
      background: rgba(255,255,255,.025);
      color: #b9b2a5;
      font-size: .5rem;
      white-space: nowrap;
    }

    .jt-rj-points {
      min-width: 88px;
      text-align: right;
      color: #d4af37;
      font-size: .58rem;
      font-weight: 900;
      letter-spacing: .55px;
      text-transform: uppercase;
    }

    .jt-rj-empty,
    .jt-rj-error {
      margin-top: 20px;
      padding: 20px;
      border: 1px solid rgba(255,255,255,.075);
      border-radius: 16px;
      color: #aaa396;
      font-size: .65rem;
      line-height: 1.6;
    }

    .jt-rj-error { color: #ff9b9b; }

    @media (max-width: 860px) {
      .jt-rj-entry {
        grid-template-columns: 1fr auto;
      }

      .jt-rj-metrics {
        grid-column: 1 / -1;
      }

      .jt-rj-points {
        text-align: left;
      }
    }
  `;

  document.head.appendChild(style);
}

function formatDate(value) {
  const date = new Date(`${value}T12:00:00Z`);
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(date);
}

function stateLabel(value) {
  return STATE_LABELS[value] || String(value || "Readiness");
}

function metric(label, value) {
  return `<span class="jt-rj-metric">${label} ${Number(value)}/10</span>`;
}

function createMount() {
  let mount = document.getElementById("jtReadinessJournal");

  if (mount) return mount;

  mount = document.createElement("section");
  mount.id = "jtReadinessJournal";
  mount.className = "jt-readiness-journal";
  mount.setAttribute("aria-label", "Daily readiness journal history");

  const main = document.querySelector("main");
  const footer = document.querySelector("footer");

  if (main) {
    main.insertAdjacentElement("afterend", mount);
  } else if (footer) {
    footer.insertAdjacentElement("beforebegin", mount);
  } else {
    document.body.appendChild(mount);
  }

  return mount;
}

function render(rows) {
  injectStyles();
  const mount = createMount();

  if (!rows.length) {
    mount.innerHTML = `
      <div class="jt-rj-head">
        <div>
          <div class="jt-rj-kicker">Daily Athlete Monitoring</div>
          <h2 class="jt-rj-title">Readiness <span>Journal.</span></h2>
          <div class="jt-rj-sub">Every submitted readiness check-in will appear here automatically.</div>
        </div>
      </div>
      <div class="jt-rj-empty">No readiness check-ins have been submitted yet.</div>
    `;
    return;
  }

  const latest = rows[0];
  const average = Math.round(
    rows.reduce((sum, row) => sum + Number(row.readiness_score || 0), 0) / rows.length
  );

  mount.innerHTML = `
    <div class="jt-rj-head">
      <div>
        <div class="jt-rj-kicker">Daily Athlete Monitoring</div>
        <h2 class="jt-rj-title">Readiness <span>Journal.</span></h2>
        <div class="jt-rj-sub">
          ${latest.player_name || "JT Player"} · Every submitted check-in is stored as part of the athlete timeline.
        </div>
      </div>

      <div class="jt-rj-summary">
        <span class="jt-rj-chip">Latest ${Number(latest.readiness_score)}/100</span>
        <span class="jt-rj-chip">${Number(latest.readiness_streak || 1)} Day Readiness Streak</span>
        <span class="jt-rj-chip">${rows.length} Entries · Avg ${average}</span>
      </div>
    </div>

    <div class="jt-rj-list">
      ${rows.map((row) => `
        <article class="jt-rj-entry">
          <div class="jt-rj-date">
            <b>${formatDate(row.checkin_date)}</b>
            <span>${Number(row.readiness_streak || 1)} day readiness streak</span>
          </div>

          <div class="jt-rj-state">
            <div class="jt-rj-score">${Number(row.readiness_score)} <small>/ 100</small></div>
            <span>${stateLabel(row.readiness_state)}</span>
          </div>

          <div class="jt-rj-metrics">
            ${metric("Sleep", row.sleep_quality)}
            ${metric("Hydration", row.hydration)}
            ${metric("Energy", row.energy)}
            ${metric("Soreness", row.muscle_soreness)}
            ${metric("Mood", row.mood)}
            ${metric("Focus", row.focus)}
            ${metric("Stress", row.stress_load)}
            ${metric("Illness", row.illness_symptoms)}
          </div>

          <div class="jt-rj-points">+${Number(row.points_awarded || 0)} pts</div>
        </article>
      `).join("")}
    </div>
  `;
}

function renderError(message) {
  injectStyles();
  const mount = createMount();
  mount.innerHTML = `
    <div class="jt-rj-head">
      <div>
        <div class="jt-rj-kicker">Daily Athlete Monitoring</div>
        <h2 class="jt-rj-title">Readiness <span>Journal.</span></h2>
      </div>
    </div>
    <div class="jt-rj-error">${message}</div>
  `;
}

async function loadReadinessJournal() {
  try {
    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();

    if (sessionError) throw sessionError;

    if (!sessionData?.session?.user) {
      renderError("Sign in to your JT Performance Hub account to view readiness history.");
      return;
    }

    // Coaches/owners can securely pass ?player=SUPABASE_USER_UUID.
    // Ordinary players can only read their own UUID through the RPC.
    const params = new URLSearchParams(window.location.search);
    const requestedPlayer = params.get("player");

    const { data, error } = await supabase.rpc(
      "get_readiness_journal",
      {
        p_user_id: requestedPlayer || null,
        p_limit: 60
      }
    );

    if (error) throw error;

    render(Array.isArray(data) ? data : []);
  } catch (error) {
    console.error("JT readiness journal error:", error);
    renderError(
      error?.message ||
      "Readiness history could not be loaded. Run the readiness Supabase setup and try again."
    );
  }
}

window.jtLoadReadinessHistory = loadReadinessJournal;

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", loadReadinessJournal, { once: true });
} else {
  loadReadinessJournal();
}
