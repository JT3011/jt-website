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

const REWARD_LADDER = [
  { days: 7, points: 50, label: "Consistency" },
  { days: 14, points: 100, label: "Momentum" },
  { days: 30, points: 250, label: "Elite Habit" },
  { days: 60, points: 400, label: "Performance Standard" },
  { days: 90, points: 600, label: "Elite Streak" }
];

function injectStyles() {
  if (document.getElementById("jtStreakStyles")) return;

  const style = document.createElement("style");
  style.id = "jtStreakStyles";
  style.textContent = `
    .jt-streak-journey {
      position: relative;
      overflow: hidden;
      margin-top: 14px;
      padding: 22px;
      border: 1px solid rgba(212, 175, 55, 0.22);
      border-radius: 24px;
      background:
        radial-gradient(circle at 92% 12%, rgba(212,175,55,.11), transparent 18rem),
        linear-gradient(145deg, rgba(255,255,255,.035), rgba(255,255,255,.008)),
        #0b0b0b;
    }

    .jt-streak-journey::after {
      content: "";
      position: absolute;
      width: 190px;
      height: 190px;
      right: -88px;
      top: -102px;
      border-radius: 50%;
      border: 1px solid rgba(212,175,55,.12);
      box-shadow:
        0 0 0 42px rgba(212,175,55,.018),
        0 0 0 84px rgba(212,175,55,.009);
      pointer-events: none;
    }

    .jt-streak-head,
    .jt-streak-meta,
    .jt-streak-reward-row,
    .jt-streak-actions {
      position: relative;
      z-index: 1;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
    }

    .jt-streak-kicker {
      color: #d4af37;
      font-size: .59rem;
      font-weight: 900;
      letter-spacing: 1.3px;
      text-transform: uppercase;
    }

    .jt-streak-title {
      margin-top: 6px;
      color: #f8f4e9;
      font-family: "Playfair Display", serif;
      font-size: clamp(1.8rem, 3vw, 2.65rem);
      line-height: .95;
    }

    .jt-streak-title strong {
      color: #f3dc8d;
    }

    .jt-streak-secured {
      min-height: 32px;
      padding: 0 12px;
      display: inline-flex;
      align-items: center;
      gap: 7px;
      border: 1px solid rgba(120, 217, 154, .28);
      border-radius: 999px;
      background: rgba(120, 217, 154, .07);
      color: #78d99a;
      font-size: .58rem;
      font-weight: 900;
      letter-spacing: .75px;
      text-transform: uppercase;
    }

    .jt-streak-secured::before {
      content: "✓";
      width: 18px;
      height: 18px;
      display: grid;
      place-items: center;
      border-radius: 50%;
      background: rgba(120,217,154,.12);
    }

    .jt-streak-reward-row {
      margin-top: 19px;
      color: #aaa69b;
      font-size: .68rem;
      font-weight: 800;
      letter-spacing: .55px;
      text-transform: uppercase;
    }

    .jt-streak-reward-row strong {
      color: #f3dc8d;
      font-size: .72rem;
    }

    .jt-streak-track {
      position: relative;
      z-index: 1;
      height: 12px;
      margin-top: 11px;
      overflow: hidden;
      border: 1px solid rgba(255,255,255,.055);
      border-radius: 999px;
      background: rgba(255,255,255,.055);
    }

    .jt-streak-fill {
      width: 0;
      height: 100%;
      border-radius: inherit;
      background: linear-gradient(90deg, #8b6b13, #d4af37 58%, #f3dc8d);
      box-shadow: 0 0 22px rgba(212,175,55,.18);
      transition: width 900ms cubic-bezier(.22,1,.36,1);
    }

    .jt-streak-meta {
      margin-top: 10px;
      color: #aaa69b;
      font-size: .62rem;
      font-weight: 700;
    }

    .jt-streak-meta strong {
      color: #f8f4e9;
    }

    .jt-streak-milestones {
      position: relative;
      z-index: 1;
      margin-top: 17px;
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 7px;
    }

    .jt-streak-milestone {
      min-width: 0;
      padding: 10px 8px;
      border: 1px solid rgba(255,255,255,.07);
      border-radius: 14px;
      background: rgba(255,255,255,.012);
      text-align: center;
      transition:
        transform .2s ease,
        border-color .2s ease,
        background .2s ease;
    }

    .jt-streak-milestone.reached {
      border-color: rgba(212,175,55,.35);
      background: rgba(212,175,55,.065);
    }

    .jt-streak-milestone.next {
      border-color: rgba(243,220,141,.48);
      box-shadow: inset 0 0 22px rgba(212,175,55,.05);
    }

    .jt-streak-milestone b,
    .jt-streak-milestone span {
      display: block;
    }

    .jt-streak-milestone b {
      color: #f8f4e9;
      font-family: "Playfair Display", serif;
      font-size: 1rem;
    }

    .jt-streak-milestone span {
      margin-top: 4px;
      color: #aaa69b;
      font-size: .5rem;
      font-weight: 800;
      letter-spacing: .45px;
      text-transform: uppercase;
    }

    .jt-streak-reward-flash {
      position: relative;
      z-index: 1;
      margin-top: 14px;
      padding: 12px 14px;
      border: 1px solid rgba(212,175,55,.34);
      border-radius: 15px;
      background: rgba(212,175,55,.09);
      color: #f3dc8d;
      font-size: .68rem;
      font-weight: 900;
      letter-spacing: .55px;
      text-transform: uppercase;
      animation: jtStreakReward 700ms ease both;
    }

    @keyframes jtStreakReward {
      from { transform: translateY(5px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    .jt-streak-actions {
      margin-top: 15px;
    }

    .jt-streak-toggle,
    .jt-streak-link {
      min-height: 35px;
      padding: 0 13px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 999px;
      font-size: .56rem;
      font-weight: 900;
      letter-spacing: .7px;
      text-transform: uppercase;
      text-decoration: none;
    }

    .jt-streak-toggle {
      border: 1px solid rgba(255,255,255,.09);
      background: rgba(255,255,255,.025);
      color: #d0cabd;
      cursor: pointer;
    }

    .jt-streak-link {
      border: 1px solid rgba(212,175,55,.25);
      background: rgba(212,175,55,.06);
      color: #f3dc8d;
    }

    .jt-streak-ladder {
      position: relative;
      z-index: 1;
      margin-top: 13px;
      padding-top: 13px;
      display: none;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 7px;
      border-top: 1px solid rgba(255,255,255,.06);
    }

    .jt-streak-ladder.open {
      display: grid;
    }

    .jt-streak-ladder-item {
      padding: 10px;
      border-radius: 13px;
      background: rgba(255,255,255,.018);
      color: #aaa69b;
      font-size: .54rem;
      line-height: 1.45;
    }

    .jt-streak-ladder-item b {
      display: block;
      margin-bottom: 4px;
      color: #f3dc8d;
      font-size: .61rem;
    }

    @media (hover: hover) and (pointer: fine) {
      .jt-streak-milestone:hover {
        transform: translateY(-2px);
        border-color: rgba(212,175,55,.28);
      }
    }

    @media (max-width: 760px) {
      .jt-streak-journey {
        padding: 18px;
      }

      .jt-streak-milestones,
      .jt-streak-ladder {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .jt-streak-fill,
      .jt-streak-reward-flash {
        transition: none;
        animation: none;
      }
    }
  `;

  document.head.appendChild(style);
}

function createJourneyMarkup(data) {
  const streak = Math.max(0, Number(data.current_streak || 0));
  const best = Math.max(streak, Number(data.best_streak || 0));
  const nextMilestone = Number(data.next_milestone || 7);
  const nextReward = Number(data.next_reward || 50);
  const daysRemaining = Math.max(0, nextMilestone - streak);
  const progress = nextMilestone > 0
    ? Math.min(100, Math.max(0, (streak / nextMilestone) * 100))
    : 100;


  const ladderHtml = REWARD_LADDER.map((item) => `
    <div class="jt-streak-ladder-item">
      <b>${item.days} days · +${item.points} pts</b>
      ${item.label}
    </div>
  `).join("");

  const rewardFlash = Number(data.reward_points || 0) > 0
    ? `
      <div class="jt-streak-reward-flash">
        Milestone unlocked · +${Number(data.reward_points)}
        performance points added
      </div>
    `
    : "";

  return `
    <div class="jt-streak-head">
      <div>
        <div class="jt-streak-kicker">
          Daily Consistency Journey
        </div>

        <div class="jt-streak-title">
          <strong>${streak}</strong> day streak
        </div>
      </div>

      <div class="jt-streak-secured">
        Today secured
      </div>
    </div>

    <div class="jt-streak-reward-row">
      <span>Next performance reward</span>

      <strong>
        ${nextMilestone} days · +${nextReward} points
      </strong>
    </div>

    <div
      class="jt-streak-track"
      role="progressbar"
      aria-label="Streak progress to next reward"
      aria-valuemin="0"
      aria-valuemax="${nextMilestone}"
      aria-valuenow="${Math.min(streak, nextMilestone)}"
    >
      <div
        class="jt-streak-fill"
        data-progress="${progress.toFixed(2)}"
      ></div>
    </div>

    <div class="jt-streak-meta">
      <span>
        <strong>${streak}</strong> / ${nextMilestone} days
      </span>

      <span>
        ${
          daysRemaining === 0
            ? "Reward reached"
            : `${daysRemaining} day${daysRemaining === 1 ? "" : "s"} to reward`
        }
        · Best: <strong>${best}</strong>
      </span>
    </div>


    ${rewardFlash}

    <div class="jt-streak-actions">
      <button
        type="button"
        class="jt-streak-toggle"
        aria-expanded="false"
      >
        View reward ladder
      </button>

      <a
        class="jt-streak-link"
        href="/performance-hub-challenges.html"
      >
        Earn more points →
      </a>
    </div>

    <div
      class="jt-streak-ladder"
      aria-hidden="true"
    >
      ${ladderHtml}
    </div>
  `;
}

function renderJourney(data) {
  injectStyles();

  const currentStreak =
    document.getElementById("currentStreak");

  const pointsBalance =
    document.getElementById("pointsBalance");

  const lifetimePoints =
    document.getElementById("lifetimePoints");

  const metrics =
    currentStreak?.closest(".metrics");

  if (!currentStreak || !metrics) {
    return;
  }

  currentStreak.textContent =
    String(data.current_streak || 0);

  if (
    pointsBalance &&
    Number.isFinite(Number(data.points_balance))
  ) {
    pointsBalance.textContent =
      String(Number(data.points_balance));
  }

  if (
    lifetimePoints &&
    Number.isFinite(Number(data.lifetime_points))
  ) {
    lifetimePoints.textContent =
      String(Number(data.lifetime_points));
  }

  let journey =
    document.getElementById("jtStreakJourney");

  if (!journey) {
    journey = document.createElement("section");
    journey.id = "jtStreakJourney";
    journey.className = "jt-streak-journey";
    journey.setAttribute(
      "aria-label",
      "Daily streak progress and rewards"
    );

    metrics.insertAdjacentElement(
      "afterend",
      journey
    );
  }

  journey.innerHTML =
    createJourneyMarkup(data);

  const fill =
    journey.querySelector(".jt-streak-fill");

  const target =
    Number(fill?.dataset.progress || 0);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (fill) {
        fill.style.width = `${target}%`;
      }
    });
  });

  const toggle =
    journey.querySelector(".jt-streak-toggle");

  const ladder =
    journey.querySelector(".jt-streak-ladder");

  toggle?.addEventListener("click", () => {
    const isOpen =
      ladder.classList.toggle("open");

    ladder.setAttribute(
      "aria-hidden",
      String(!isOpen)
    );

    toggle.setAttribute(
      "aria-expanded",
      String(isOpen)
    );

    toggle.textContent =
      isOpen
        ? "Hide reward ladder"
        : "View reward ladder";
  });
}

async function registerLoginAndRender() {
  try {
    const {
      data: sessionData,
      error: sessionError
    } = await supabase.auth.getSession();

    if (sessionError) {
      throw sessionError;
    }

    if (!sessionData?.session?.user) {
      return;
    }

    const {
      data,
      error
    } = await supabase.rpc(
      "register_daily_login"
    );

    if (error) {
      throw error;
    }

    const result =
      Array.isArray(data)
        ? data[0]
        : data;

    if (!result) {
      return;
    }

    renderJourney(result);
  } catch (error) {
    console.warn(
      "JT daily streak could not be updated",
      error
    );
  }
}

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    registerLoginAndRender,
    { once: true }
  );
} else {
  registerLoginAndRender();
}
