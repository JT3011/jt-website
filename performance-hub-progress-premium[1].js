import {
  createClient
} from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL =
  "https://hunrekcnmtabowiivmrk.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_yfi5vW_HTltDcUPAqmqiyQ_qSnckDNJ";

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true
    }
  }
);

const CENTRES = {
  training: {
    title: "Add one quality training rep.",
    label: "Open Training →",
    href: "/performance-hub-training.html"
  },
  nutrition: {
    title: "Win your next fuel and hydration day.",
    label: "Open Nutrition →",
    href: "/performance-hub-nutrition.html"
  },
  mindset: {
    title: "Complete a short mindset reset.",
    label: "Open Mindset →",
    href: "/performance-hub-mindset.html"
  }
};

function addStyles() {
  if (document.getElementById("jtProgressPremiumStyles")) return;

  const style = document.createElement("style");
  style.id = "jtProgressPremiumStyles";
  style.textContent = `
    .progress-content {
      gap: 18px !important;
    }

    .hero {
      position: relative;
      min-height: 520px !important;
      border-color: rgba(212,175,55,.16) !important;
      background:
        radial-gradient(circle at 88% 2%, rgba(212,175,55,.17), transparent 28rem),
        linear-gradient(135deg, rgba(255,255,255,.045), rgba(255,255,255,.008)),
        #080808 !important;
      box-shadow: 0 34px 100px rgba(0,0,0,.48) !important;
    }

    .hero::after {
      content: "";
      position: absolute;
      width: 500px;
      height: 500px;
      right: -230px;
      top: -250px;
      border: 1px solid rgba(212,175,55,.11);
      border-radius: 50%;
      box-shadow:
        0 0 0 72px rgba(212,175,55,.017),
        0 0 0 145px rgba(212,175,55,.009);
      pointer-events: none;
    }

    .hero-copy,
    .score-card {
      position: relative;
      z-index: 2;
    }

    .hero h1 {
      max-width: 820px !important;
    }

    .score-card {
      min-height: 430px;
      align-items: center;
      text-align: center;
      background: rgba(4,4,4,.5) !important;
      backdrop-filter: blur(13px);
    }

    .score-card > div:first-child {
      width: 100%;
    }

    .jt-score-ring-wrap {
      --progress: 0;
      width: min(245px, 66vw);
      aspect-ratio: 1;
      margin: 22px auto 0;
      display: grid;
      place-items: center;
      border-radius: 50%;
      background:
        conic-gradient(
          var(--gold) calc(var(--progress) * 1%),
          rgba(255,255,255,.065) 0
        );
      box-shadow: 0 0 45px rgba(212,175,55,.07);
      position: relative;
    }

    .jt-score-ring-wrap::before {
      content: "";
      position: absolute;
      inset: 14px;
      border: 1px solid rgba(255,255,255,.055);
      border-radius: 50%;
      background:
        radial-gradient(circle at 50% 34%, rgba(212,175,55,.08), transparent 58%),
        #080808;
    }

    .jt-score-ring-wrap .score-number {
      position: relative;
      z-index: 2;
      margin: 0 !important;
      font-size: clamp(5rem, 8vw, 7.5rem) !important;
      color: var(--gold-light) !important;
    }

    .jt-week-summary {
      display: grid;
      grid-template-columns: repeat(4, minmax(0,1fr));
      gap: 12px;
    }

    .jt-summary-card,
    .jt-next-action {
      min-height: 132px;
      padding: 18px;
      border: 1px solid rgba(255,255,255,.07);
      border-radius: 21px;
      background: rgba(255,255,255,.018);
    }

    .jt-summary-card {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .jt-summary-card span,
    .jt-next-label {
      color: var(--muted);
      font-size: .58rem;
      font-weight: 900;
      letter-spacing: .85px;
      text-transform: uppercase;
    }

    .jt-summary-card strong {
      margin-top: 13px;
      color: var(--gold-light);
      font-family: "Playfair Display", serif;
      font-size: 2.8rem;
      line-height: .88;
    }

    .jt-summary-card strong small {
      color: var(--muted);
      font-family: "Montserrat", sans-serif;
      font-size: .55rem;
      letter-spacing: .6px;
      text-transform: uppercase;
    }

    .jt-next-action {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      border-color: rgba(212,175,55,.16);
      background:
        linear-gradient(135deg, rgba(212,175,55,.07), rgba(255,255,255,.012)),
        #0a0a0a;
    }

    .jt-next-label {
      color: var(--gold);
    }

    .jt-next-action strong {
      display: block;
      margin-top: 9px;
      font-family: "Playfair Display", serif;
      font-size: 1.55rem;
      line-height: .96;
    }

    .jt-next-action a {
      width: fit-content;
      margin-top: 13px;
      color: var(--gold-light);
      font-size: .61rem;
      font-weight: 900;
      letter-spacing: .7px;
      text-transform: uppercase;
    }

    .tracker-card {
      position: relative;
      overflow: hidden;
      min-height: 390px !important;
      border-color: rgba(255,255,255,.07) !important;
      background:
        radial-gradient(circle at 100% 0%, rgba(212,175,55,.08), transparent 18rem),
        linear-gradient(150deg, rgba(255,255,255,.035), rgba(255,255,255,.008)),
        #0b0b0b !important;
      transition:
        transform .28s cubic-bezier(.16,1,.3,1),
        border-color .28s ease;
    }

    .tracker-card:hover {
      transform: translateY(-4px);
      border-color: rgba(212,175,55,.27) !important;
    }

    .jt-step-label {
      margin-top: auto;
      padding-top: 24px;
      color: var(--muted);
      font-size: .56rem;
      font-weight: 800;
      letter-spacing: .75px;
      text-transform: uppercase;
    }

    .jt-step-row {
      margin-top: 10px;
      display: grid;
      grid-template-columns: repeat(7, minmax(0,1fr));
      gap: 6px;
    }

    .jt-step {
      height: 40px;
      display: grid;
      place-items: center;
      border: 1px solid rgba(255,255,255,.07);
      border-radius: 10px;
      background: rgba(255,255,255,.02);
      color: var(--muted);
      font-size: .61rem;
      font-weight: 900;
      transition:
        transform .18s cubic-bezier(.16,1,.3,1),
        border-color .18s ease,
        background .18s ease,
        color .18s ease;
    }

    .jt-step:hover {
      transform: translateY(-2px);
      border-color: rgba(212,175,55,.32);
      color: var(--gold);
    }

    .jt-step.active {
      border-color: rgba(212,175,55,.4);
      background: rgba(212,175,55,.1);
      color: var(--gold-light);
    }

    .counter {
      margin-top: 10px !important;
      grid-template-columns: 48px 1fr 48px !important;
    }

    .counter-button {
      width: 48px !important;
      height: 46px !important;
      border-radius: 13px !important;
    }

    .counter-value {
      font-size: 3.2rem !important;
    }

    .jt-momentum {
      display: grid;
      grid-template-columns: minmax(0,1.35fr) minmax(290px,.65fr);
      gap: 14px;
    }

    .jt-history-panel,
    .jt-milestone-panel {
      padding: 25px;
      border: 1px solid rgba(255,255,255,.07);
      border-radius: 25px;
      background: rgba(255,255,255,.018);
    }

    .jt-panel-kicker {
      color: var(--gold);
      font-size: .59rem;
      font-weight: 900;
      letter-spacing: 1.1px;
      text-transform: uppercase;
    }

    .jt-history-panel h3,
    .jt-milestone-panel h3 {
      margin-top: 9px;
      font-family: "Playfair Display", serif;
      font-size: clamp(2rem,3vw,3.2rem);
      line-height: .92;
      letter-spacing: -.045em;
    }

    .jt-chart {
      min-height: 250px;
      margin-top: 26px;
      display: flex;
      align-items: end;
      gap: 9px;
    }

    .jt-chart-empty {
      width: 100%;
      min-height: 220px;
      display: grid;
      place-items: center;
      color: var(--muted);
      text-align: center;
      font-size: .78rem;
      line-height: 1.6;
    }

    .jt-chart-column {
      min-width: 0;
      flex: 1;
      display: grid;
      gap: 7px;
      justify-items: center;
    }

    .jt-chart-value {
      color: var(--gold-light);
      font-size: .55rem;
      font-weight: 900;
    }

    .jt-chart-track {
      width: min(38px,100%);
      height: 185px;
      display: flex;
      align-items: end;
      overflow: hidden;
      border: 1px solid rgba(255,255,255,.07);
      border-radius: 999px;
      background: rgba(255,255,255,.025);
    }

    .jt-chart-bar {
      width: 100%;
      min-height: 4px;
      border-radius: inherit;
      background: linear-gradient(180deg,var(--gold-light),var(--gold));
      transform-origin: bottom;
      animation: jtGrow .7s cubic-bezier(.16,1,.3,1) both;
    }

    @keyframes jtGrow {
      from { transform: scaleY(0); }
      to { transform: scaleY(1); }
    }

    .jt-chart-label {
      color: var(--muted);
      font-size: .49rem;
      font-weight: 800;
      white-space: nowrap;
    }

    .jt-milestones {
      margin-top: 22px;
      display: grid;
      gap: 9px;
    }

    .jt-milestone {
      padding: 13px;
      display: grid;
      grid-template-columns: 36px 1fr auto;
      gap: 11px;
      align-items: center;
      border: 1px solid rgba(255,255,255,.07);
      border-radius: 14px;
      background: rgba(255,255,255,.015);
    }

    .jt-milestone-icon {
      width: 36px;
      height: 36px;
      display: grid;
      place-items: center;
      border: 1px solid rgba(255,255,255,.07);
      border-radius: 11px;
      color: var(--muted);
      font-size: .69rem;
      font-weight: 900;
    }

    .jt-milestone strong {
      display: block;
      color: var(--muted-light);
      font-size: .67rem;
      font-weight: 900;
      text-transform: uppercase;
    }

    .jt-milestone span {
      display: block;
      margin-top: 3px;
      color: var(--muted);
      font-size: .57rem;
      line-height: 1.35;
    }

    .jt-milestone-status {
      color: var(--muted);
      font-size: .52rem;
      font-weight: 900;
      text-transform: uppercase;
    }

    .jt-milestone.unlocked {
      border-color: rgba(212,175,55,.22);
      background: rgba(212,175,55,.035);
    }

    .jt-milestone.unlocked .jt-milestone-icon {
      border-color: rgba(212,175,55,.3);
      background: rgba(212,175,55,.08);
      color: var(--gold-light);
    }

    .jt-milestone.unlocked .jt-milestone-status {
      color: var(--gold);
    }

    .panel,
    .save-panel,
    .goal-box {
      border-color: rgba(255,255,255,.07) !important;
    }

    .jt-char-count {
      float: right;
      color: var(--muted);
      font-size: .53rem;
      font-weight: 700;
      letter-spacing: 0;
      text-transform: none;
    }

    .jt-confetti-layer {
      position: fixed;
      inset: 0;
      z-index: 100;
      pointer-events: none;
      overflow: hidden;
    }

    .jt-confetti {
      position: absolute;
      top: -20px;
      width: 7px;
      height: 14px;
      border-radius: 99px;
      background: var(--gold);
      animation: jtConfetti 1.45s ease-in forwards;
    }

    @keyframes jtConfetti {
      to {
        opacity: 0;
        transform: translate3d(var(--drift),105vh,0) rotate(680deg);
      }
    }

    @media (max-width: 1050px) {
      .jt-momentum {
        grid-template-columns: 1fr;
      }

      .jt-week-summary {
        grid-template-columns: repeat(2,minmax(0,1fr));
      }
    }

    @media (max-width: 780px) {
      .hero h1 {
        font-size: clamp(3.75rem,17vw,5.8rem) !important;
        line-height: .82 !important;
      }

      .section-heading h2 {
        font-size: clamp(2.8rem,13vw,4.7rem) !important;
      }

      .score-card {
        min-height: auto;
      }

      .jt-chart {
        gap: 6px;
      }
    }

    @media (max-width: 520px) {
      .jt-summary-card,
      .jt-next-action {
        min-height: 118px;
      }

      .jt-step-row {
        gap: 4px;
      }

      .jt-step {
        height: 37px;
        border-radius: 9px;
      }

      .jt-score-ring-wrap {
        width: min(220px,68vw);
      }

      .jt-chart-track {
        height: 155px;
      }
    }
  `;

  document.head.appendChild(style);
}

function renamePage() {
  document.title =
    "Progress | JT Performance Hub";

  const brandSub =
    document.querySelector(
      ".brand-copy span"
    );

  if (brandSub) {
    brandSub.textContent =
      "Progress";
  }

  const loadingTitle =
    document.querySelector(
      "#loadingState .state-title"
    );

  if (loadingTitle) {
    loadingTitle.textContent =
      "Building Your Progress.";
  }

  const eyebrow =
    document.querySelector(
      ".hero .eyebrow"
    );

  if (eyebrow) {
    eyebrow.textContent =
      "Your Development Evidence";
  }

  const heroTitle =
    document.querySelector(
      ".hero h1"
    );

  if (heroTitle) {
    heroTitle.innerHTML =
      'Make The <span class="gold-text">Work Visible.</span>';
  }

  const firstHeading =
    document.querySelectorAll(
      ".section-heading"
    )[0];

  if (firstHeading) {
    const title =
      firstHeading.querySelector("h2");

    const kick =
      firstHeading.querySelector(
        ".eyebrow"
      );

    const copy =
      firstHeading.querySelector("p");

    if (kick) {
      kick.textContent =
        "Interactive Weekly Tracker";
    }

    if (title) {
      title.textContent =
        "Build The Week.";
    }

    if (copy) {
      copy.textContent =
        "Tap the blocks to set your weekly total. Keep it accurate rather than perfect — the aim is to make your habits obvious enough to improve them.";
    }
  }

  const reflectionHeading =
    document.querySelectorAll(
      ".section-heading"
    )[1];

  if (reflectionHeading) {
    const title =
      reflectionHeading.querySelector("h2");

    const kick =
      reflectionHeading.querySelector(
        ".eyebrow"
      );

    if (kick) {
      kick.textContent =
        "Weekly Reflection";
    }

    if (title) {
      title.textContent =
        "Turn Work Into Learning.";
    }
  }
}

function getValue(key) {
  const element =
    document.getElementById(
      `${key}Value`
    );

  return Math.max(
    0,
    Math.min(
      7,
      Number(
        element?.textContent || 0
      )
    )
  );
}

function getValues() {
  return {
    training: getValue("training"),
    nutrition: getValue("nutrition"),
    mindset: getValue("mindset")
  };
}

function getPercentage() {
  const values =
    getValues();

  return Math.round(
    (
      values.training +
      values.nutrition +
      values.mindset
    ) / 21 * 100
  );
}

function enhanceScoreCard() {
  const scoreNumber =
    document.querySelector(
      ".score-number"
    );

  if (
    !scoreNumber ||
    document.querySelector(
      ".jt-score-ring-wrap"
    )
  ) {
    return;
  }

  const ring =
    document.createElement("div");

  ring.className =
    "jt-score-ring-wrap";

  scoreNumber.parentNode.insertBefore(
    ring,
    scoreNumber
  );

  ring.appendChild(
    scoreNumber
  );
}

function makeSummary() {
  const hero =
    document.querySelector(
      ".hero"
    );

  if (
    !hero ||
    document.querySelector(
      ".jt-week-summary"
    )
  ) {
    return;
  }

  const summary =
    document.createElement("section");

  summary.className =
    "jt-week-summary";

  summary.innerHTML = `
    <article class="jt-summary-card">
      <span>Training</span>
      <strong><b id="jtTrainingSummary">0</b><small> / 7</small></strong>
    </article>

    <article class="jt-summary-card">
      <span>Nutrition</span>
      <strong><b id="jtNutritionSummary">0</b><small> / 7</small></strong>
    </article>

    <article class="jt-summary-card">
      <span>Mindset</span>
      <strong><b id="jtMindsetSummary">0</b><small> / 7</small></strong>
    </article>

    <article class="jt-next-action">
      <div>
        <span class="jt-next-label">Next Best Action</span>
        <strong id="jtNextActionTitle">Build your week.</strong>
      </div>

      <a
        id="jtNextActionLink"
        href="/performance-hub-training.html"
      >
        Open Training →
      </a>
    </article>
  `;

  hero.insertAdjacentElement(
    "afterend",
    summary
  );
}

function makeStepControls() {
  const keys = [
    "training",
    "nutrition",
    "mindset"
  ];

  keys.forEach((key) => {
    const valueElement =
      document.getElementById(
        `${key}Value`
      );

    const card =
      valueElement?.closest(
        ".tracker-card"
      );

    if (
      !card ||
      card.querySelector(
        ".jt-step-row"
      )
    ) {
      return;
    }

    const counter =
      card.querySelector(
        ".counter"
      );

    if (!counter) return;

    const label =
      document.createElement("div");

    label.className =
      "jt-step-label";

    label.textContent =
      "Tap to set your total";

    const row =
      document.createElement("div");

    row.className =
      "jt-step-row";

    row.dataset.key =
      key;

    for (
      let value = 1;
      value <= 7;
      value += 1
    ) {
      const button =
        document.createElement("button");

      button.type =
        "button";

      button.className =
        "jt-step";

      button.dataset.value =
        String(value);

      button.textContent =
        String(value);

      button.setAttribute(
        "aria-label",
        `Set ${key} total to ${value}`
      );

      button.addEventListener(
        "click",
        () => {
          setExistingCounter(
            key,
            value
          );
        }
      );

      row.appendChild(
        button
      );
    }

    counter.insertAdjacentElement(
      "beforebegin",
      label
    );

    counter.insertAdjacentElement(
      "beforebegin",
      row
    );
  });
}

function setExistingCounter(
  key,
  target
) {
  const valueElement =
    document.getElementById(
      `${key}Value`
    );

  if (!valueElement) return;

  const current =
    Number(
      valueElement.textContent || 0
    );

  const change =
    target - current;

  if (change === 0) return;

  const button =
    document.querySelector(
      `[data-counter="${key}"][data-change="${change > 0 ? "1" : "-1"}"]`
    );

  if (!button) return;

  for (
    let i = 0;
    i < Math.abs(change);
    i += 1
  ) {
    button.click();
  }
}

function makeMomentum() {
  const headings =
    document.querySelectorAll(
      ".section-heading"
    );

  const reflectionHeading =
    headings[1];

  if (
    !reflectionHeading ||
    document.querySelector(
      ".jt-momentum"
    )
  ) {
    return;
  }

  const wrapper =
    document.createElement("section");

  wrapper.className =
    "jt-momentum";

  wrapper.innerHTML = `
    <article class="jt-history-panel">
      <div class="jt-panel-kicker">
        Recent Weeks
      </div>

      <h3>Your Momentum.</h3>

      <div
        class="jt-chart"
        id="jtHistoryChart"
      >
        <div class="jt-chart-empty">
          Your recent weeks will appear here as you build history.
        </div>
      </div>
    </article>

    <article class="jt-milestone-panel">
      <div class="jt-panel-kicker">
        This Week
      </div>

      <h3>Progress Milestones.</h3>

      <div class="jt-milestones">
        ${[
          [25, "Started", "You have got the week moving."],
          [50, "Momentum", "Your standards are building."],
          [75, "Strong Week", "Consistency is becoming visible."],
          [100, "Complete", "All three areas hit the weekly target."]
        ].map(
          ([value, title, copy]) => `
            <div
              class="jt-milestone"
              data-jt-milestone="${value}"
            >
              <div class="jt-milestone-icon">
                ${value}
              </div>

              <div>
                <strong>${title}</strong>
                <span>${copy}</span>
              </div>

              <div class="jt-milestone-status">
                Locked
              </div>
            </div>
          `
        ).join("")}
      </div>
    </article>
  `;

  reflectionHeading.insertAdjacentElement(
    "beforebegin",
    wrapper
  );

  const heading =
    document.createElement("div");

  heading.className =
    "section-heading";

  heading.innerHTML = `
    <div>
      <div class="eyebrow">
        Momentum
      </div>

      <h2>
        See The Pattern.
      </h2>
    </div>

    <p>
      One week never tells the full story. Your recent history shows whether your standards are becoming more consistent over time.
    </p>
  `;

  wrapper.insertAdjacentElement(
    "beforebegin",
    heading
  );
}

function addCharacterCounts() {
  [
    ["weeklyWin", "jtWeeklyWinCount"],
    ["nextFocus", "jtNextFocusCount"]
  ].forEach(
    ([textareaId, countId]) => {
      const textarea =
        document.getElementById(
          textareaId
        );

      const label =
        textarea
          ?.closest(".field")
          ?.querySelector("label");

      if (
        !textarea ||
        !label ||
        document.getElementById(
          countId
        )
      ) {
        return;
      }

      const count =
        document.createElement("span");

      count.className =
        "jt-char-count";

      count.id =
        countId;

      label.appendChild(
        count
      );

      const update =
        () => {
          count.textContent =
            `${textarea.value.length} / 1000`;
        };

      textarea.addEventListener(
        "input",
        update
      );

      update();
    }
  );
}

function updatePremiumUI() {
  const values =
    getValues();

  const percentage =
    getPercentage();

  const ring =
    document.querySelector(
      ".jt-score-ring-wrap"
    );

  if (ring) {
    ring.style.setProperty(
      "--progress",
      String(percentage)
    );
  }

  const mappings = [
    [
      "jtTrainingSummary",
      values.training
    ],
    [
      "jtNutritionSummary",
      values.nutrition
    ],
    [
      "jtMindsetSummary",
      values.mindset
    ]
  ];

  mappings.forEach(
    ([id, value]) => {
      const element =
        document.getElementById(
          id
        );

      if (element) {
        element.textContent =
          String(value);
      }
    }
  );

  document
    .querySelectorAll(
      ".jt-step-row"
    )
    .forEach((row) => {
      const key =
        row.dataset.key;

      const current =
        values[key];

      row
        .querySelectorAll(
          ".jt-step"
        )
        .forEach((button) => {
          const step =
            Number(
              button.dataset.value
            );

          button.classList.toggle(
            "active",
            step <= current
          );
        });
    });

  document
    .querySelectorAll(
      "[data-jt-milestone]"
    )
    .forEach((item) => {
      const target =
        Number(
          item.dataset.jtMilestone
        );

      const unlocked =
        percentage >= target;

      item.classList.toggle(
        "unlocked",
        unlocked
      );

      const status =
        item.querySelector(
          ".jt-milestone-status"
        );

      if (status) {
        status.textContent =
          unlocked
            ? "Reached"
            : "Locked";
      }
    });

  const title =
    document.getElementById(
      "jtNextActionTitle"
    );

  const link =
    document.getElementById(
      "jtNextActionLink"
    );

  if (title && link) {
    if (
      values.training === 7 &&
      values.nutrition === 7 &&
      values.mindset === 7
    ) {
      title.textContent =
        "Reflect, save and carry it forward.";

      link.textContent =
        "Finish Reflection →";

      link.href =
        "#weeklyWin";
    } else {
      const weakest =
        Object.entries(values)
          .sort(
            (a, b) =>
              a[1] - b[1]
          )[0][0];

      const action =
        CENTRES[weakest];

      title.textContent =
        action.title;

      link.textContent =
        action.label;

      link.href =
        action.href;
    }
  }
}

function formatWeekShort(value) {
  const date =
    new Date(
      `${value}T12:00:00Z`
    );

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day: "numeric",
      month: "short",
      timeZone: "UTC"
    }
  ).format(date);
}

function rowPercentage(row) {
  const total =
    Number(
      row.training_sessions || 0
    ) +
    Number(
      row.nutrition_habits || 0
    ) +
    Number(
      row.mindset_sessions || 0
    );

  return Math.max(
    0,
    Math.min(
      100,
      Math.round(
        total / 21 * 100
      )
    )
  );
}

async function loadHistory() {
  const chart =
    document.getElementById(
      "jtHistoryChart"
    );

  if (!chart) return;

  try {
    const {
      data: sessionData
    } =
      await supabase.auth.getSession();

    const user =
      sessionData?.session?.user;

    if (!user) return;

    const {
      data,
      error
    } = await supabase
      .from(
        "player_progress"
      )
      .select(
        "week_start,training_sessions,nutrition_habits,mindset_sessions"
      )
      .eq(
        "user_id",
        user.id
      )
      .order(
        "week_start",
        { ascending: false }
      )
      .limit(8);

    if (error) {
      throw error;
    }

    const rows =
      [...(data || [])]
        .sort(
          (a, b) =>
            String(
              a.week_start
            ).localeCompare(
              String(
                b.week_start
              )
            )
        );

    if (!rows.length) return;

    chart.innerHTML = "";

    rows.forEach((row) => {
      const percentage =
        rowPercentage(row);

      const column =
        document.createElement("div");

      column.className =
        "jt-chart-column";

      column.innerHTML = `
        <div class="jt-chart-value">
          ${percentage}%
        </div>

        <div class="jt-chart-track">
          <div
            class="jt-chart-bar"
            style="height:${Math.max(4, percentage)}%"
          ></div>
        </div>

        <div class="jt-chart-label">
          ${formatWeekShort(row.week_start)}
        </div>
      `;

      chart.appendChild(
        column
      );
    });
  } catch (error) {
    console.warn(
      "Premium progress history unavailable:",
      error
    );
  }
}

function celebrateIfComplete() {
  if (
    getPercentage() < 100 ||
    window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches
  ) {
    return;
  }

  const layer =
    document.createElement("div");

  layer.className =
    "jt-confetti-layer";

  for (
    let i = 0;
    i < 30;
    i += 1
  ) {
    const piece =
      document.createElement("span");

    piece.className =
      "jt-confetti";

    piece.style.left =
      `${Math.random() * 100}%`;

    piece.style.animationDelay =
      `${Math.random() * .25}s`;

    piece.style.setProperty(
      "--drift",
      `${-90 + Math.random() * 180}px`
    );

    layer.appendChild(
      piece
    );
  }

  document.body.appendChild(
    layer
  );

  setTimeout(
    () => layer.remove(),
    1900
  );
}

function observeExistingProgress() {
  [
    "trainingValue",
    "nutritionValue",
    "mindsetValue",
    "completionScore"
  ].forEach((id) => {
    const element =
      document.getElementById(id);

    if (!element) return;

    new MutationObserver(
      updatePremiumUI
    ).observe(
      element,
      {
        childList: true,
        characterData: true,
        subtree: true
      }
    );
  });

  const saveMessage =
    document.getElementById(
      "saveMessage"
    );

  if (saveMessage) {
    let lastText =
      saveMessage.textContent;

    new MutationObserver(
      () => {
        const current =
          saveMessage.textContent;

        if (
          current !== lastText &&
          saveMessage.classList.contains(
            "success"
          )
        ) {
          lastText =
            current;

          celebrateIfComplete();
          loadHistory();
        }
      }
    ).observe(
      saveMessage,
      {
        childList: true,
        characterData: true,
        subtree: true,
        attributes: true,
        attributeFilter: [
          "class"
        ]
      }
    );
  }
}

function initialise() {
  if (
    document.getElementById(
      "jtProgressPremiumLoaded"
    )
  ) {
    return;
  }

  const marker =
    document.createElement("div");

  marker.id =
    "jtProgressPremiumLoaded";

  marker.hidden =
    true;

  document.body.appendChild(
    marker
  );

  addStyles();
  renamePage();
  enhanceScoreCard();
  makeSummary();
  makeStepControls();
  makeMomentum();
  addCharacterCounts();
  observeExistingProgress();

  setTimeout(
    () => {
      updatePremiumUI();
      loadHistory();
    },
    650
  );
}

if (
  document.readyState ===
  "loading"
) {
  document.addEventListener(
    "DOMContentLoaded",
    initialise,
    { once: true }
  );
} else {
  initialise();
}
