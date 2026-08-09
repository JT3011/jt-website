
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://hunrekcnmtabowiivmrk.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_yfi5vW_HTltDcUPAqmqiyQ_qSnckDNJ";

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

const BREATHWORK = [
  {
    title: "Long-Exhale Reset",
    use: "Before training, after a mistake or when you feel rushed",
    description: "Use a slightly longer exhale to reduce unnecessary tension without trying to force yourself to feel completely calm.",
    steps: ["Inhale gently for 4", "Exhale slowly for 6", "Repeat for 5 cycles"]
  },
  {
    title: "Simple 4–4 Rhythm",
    use: "Pre-match focus",
    description: "A balanced breathing rhythm that gives your attention one simple job before competition.",
    steps: ["Inhale for 4", "Exhale for 4", "Continue for 60–90 seconds"]
  },
  {
    title: "Reset Exhale",
    use: "During stoppages",
    description: "A fast in-game reset that does not require counting or closing your eyes.",
    steps: ["Relax your jaw and shoulders", "Take one normal breath in", "Make the exhale slow and complete"]
  },
  {
    title: "Two-Part Sigh",
    use: "When tension suddenly spikes",
    description: "Use one or two gentle double-inhale sighs, then return to normal breathing.",
    steps: ["Breathe in through the nose", "Add a small second sip of air", "Long relaxed exhale"]
  },
  {
    title: "Grounded Breathing",
    use: "When your thoughts are racing",
    description: "Pair breathing with physical awareness so attention returns to the present environment.",
    steps: ["Feel both feet on the floor", "Inhale normally", "Slow the exhale and notice your shoulders soften"]
  },
  {
    title: "Three-Breath Arrival",
    use: "Walking onto the pitch",
    description: "Three deliberate breaths to mark the transition from everything else into football.",
    steps: ["Breath 1: release tension", "Breath 2: notice the pitch", "Breath 3: choose your first action"]
  },
  {
    title: "Recovery Breathing",
    use: "After a hard physical block",
    description: "Allow breathing to settle naturally while keeping posture open and relaxed.",
    steps: ["Stand tall or walk slowly", "Breathe naturally through nose or mouth", "Lengthen the exhale only if it feels comfortable"]
  },
  {
    title: "Sleep Wind-Down Breathing",
    use: "Evening recovery",
    description: "Keep the breathing easy and unforced. The aim is to reduce stimulation, not chase a perfect number.",
    steps: ["Inhale comfortably", "Exhale a little longer", "Continue for 2–3 relaxed minutes"]
  }
];

const FOCUS = [
  {
    title: "Three Controllables",
    use: "Before a match",
    description: "Choose three behaviours you can control regardless of the score, referee or opposition.",
    steps: ["Example: scan", "Example: communicate", "Example: react quickly"]
  },
  {
    title: "Next-Action Cue",
    use: "After mistakes",
    description: "Replace analysis during the game with one short cue that points attention at the next useful behaviour.",
    steps: ["Notice the mistake", "Say: Next action", "Move immediately into position"]
  },
  {
    title: "First Five Minutes",
    use: "Pre-match",
    description: "Decide what a strong first five minutes looks like before kick-off.",
    steps: ["Choose one simple action", "Choose one communication target", "Choose one movement habit"]
  },
  {
    title: "External Focus",
    use: "When overthinking technique",
    description: "Move attention away from your body and onto the outcome or target of the action.",
    steps: ["Pick the target", "See the space", "Commit to the action"]
  },
  {
    title: "Scan-Cue-Play",
    use: "For decision-heavy positions",
    description: "Use the same mental sequence repeatedly so decisions feel simpler under pressure.",
    steps: ["Scan before receiving", "Name the best option", "Play and move again"]
  },
  {
    title: "One Job At A Time",
    use: "When the game feels chaotic",
    description: "Shrink your focus to the single job the current phase needs from you.",
    steps: ["What phase are we in?", "What is my job?", "Do that job fully"]
  },
  {
    title: "Reset At Dead Balls",
    use: "Corners, throw-ins and stoppages",
    description: "Use natural breaks in play as automatic attention-reset moments.",
    steps: ["One slow exhale", "Check position", "Scan teammates and opponents"]
  },
  {
    title: "Performance Word",
    use: "All match",
    description: "Choose one short word that captures how you want to play, rather than what result you want.",
    steps: ["Examples: Brave / Sharp / Calm", "Say it before kick-off", "Return to it after distractions"]
  }
];

const CONFIDENCE = [
  {
    title: "Evidence List",
    use: "The night before a match",
    description: "Confidence becomes more stable when it is linked to real preparation rather than a mood.",
    steps: ["Write 3 things you have trained well", "Write 1 recent strong action", "Choose 1 strength to trust"]
  },
  {
    title: "Useful Self-Talk",
    use: "When confidence dips",
    description: "Use instructional language that helps performance instead of trying to hype yourself up.",
    steps: ["Replace: Don't mess up", "With: Set early / scan / attack space", "Keep the cue short"]
  },
  {
    title: "Brave Action Target",
    use: "For attacking players",
    description: "Measure courage by actions attempted, not only whether every action succeeds.",
    steps: ["Pick one brave behaviour", "Attempt it early", "Reset quickly if it fails"]
  },
  {
    title: "Strength Replay",
    use: "Pre-match visualisation",
    description: "Replay a real moment where you performed one of your strengths well.",
    steps: ["See the situation", "Notice your decision", "Rehearse the same quality again"]
  },
  {
    title: "Preparation Score",
    use: "Before judging confidence",
    description: "Ask whether you prepared well before deciding that a nervous feeling means you are not ready.",
    steps: ["Training completed?", "Recovery respected?", "Match plan clear?"]
  },
  {
    title: "Post-Session Win",
    use: "After training",
    description: "Bank one piece of evidence every session so confidence has something factual to draw from.",
    steps: ["One technical win", "One behaviour win", "One next improvement"]
  },
  {
    title: "Neutral Reframe",
    use: "After a poor action",
    description: "Describe what happened without turning one action into a judgement about yourself.",
    steps: ["State the action", "State the adjustment", "Return to the game"]
  },
  {
    title: "Pressure Means It Matters",
    use: "Before important games",
    description: "Nerves can exist alongside readiness. You do not have to eliminate them before you perform.",
    steps: ["Notice the feeling", "Name the next task", "Act with the nerves present"]
  }
];

const RECOVERY = [
  {
    title: "90-Second Decompress",
    use: "After training or a match",
    description: "Give the nervous system a short transition before analysing performance.",
    steps: ["Walk slowly", "Let breathing settle", "Delay judgement for 90 seconds"]
  },
  {
    title: "One Win, One Lesson",
    use: "Post-match",
    description: "Keep reflection short enough that it becomes useful rather than repetitive.",
    steps: ["One thing done well", "One learning point", "One action for next time"]
  },
  {
    title: "Body Tension Scan",
    use: "Before sleep or recovery",
    description: "Notice where you are holding unnecessary tension and soften those areas without forcing relaxation.",
    steps: ["Check jaw", "Check shoulders", "Check hands and legs"]
  },
  {
    title: "Switch-Off Boundary",
    use: "After football",
    description: "Choose a clear point when useful reflection ends and normal life resumes.",
    steps: ["Complete your reflection", "Write the next action", "Stop replaying the session"]
  },
  {
    title: "Control / No Control",
    use: "After frustrating games",
    description: "Separate what you can influence from what you cannot.",
    steps: ["List what you controlled", "List what you did not", "Take action only on the first list"]
  },
  {
    title: "Sleep Thought Park",
    use: "When football thoughts keep looping",
    description: "Write the thought down with a time to revisit it, rather than solving it in bed.",
    steps: ["Write the concern", "Write tomorrow's action", "Return attention to rest"]
  },
  {
    title: "Emotion To Information",
    use: "After disappointment",
    description: "Treat emotion as information about what mattered, then decide the practical response.",
    steps: ["Name the emotion", "What triggered it?", "What useful action follows?"]
  },
  {
    title: "Reset Tomorrow",
    use: "After a difficult performance",
    description: "Avoid trying to fix everything immediately. Choose one small behaviour for the next day.",
    steps: ["Recover first", "Choose one improvement", "Return to normal training"]
  }
];

const POSITION_CUES = {
  goalkeeper: [
    "Set early. See the ball. Next action.",
    "Communicate before the danger arrives.",
    "A mistake is finished when the next phase starts."
  ],
  defender: [
    "Protect the middle first. Stay patient.",
    "Communicate early and make the next picture clear.",
    "Defend forward when the moment is right."
  ],
  midfielder: [
    "Scan early. Receive open. Play the next picture.",
    "You do not need to solve the whole game at once.",
    "Create the next angle after every pass."
  ],
  winger: [
    "Be brave enough to try again.",
    "Attack the space, not the fear of losing it.",
    "One failed 1v1 does not cancel the next opportunity."
  ],
  striker: [
    "Stay alive for the next chance.",
    "Missed chance: exhale, move, arrive again.",
    "Judge your movement and decisions as well as goals."
  ],
  versatile: [
    "Control the controllables.",
    "Play the next action, not the last one.",
    "Preparation gives confidence somewhere to stand."
  ]
};

function getPositionGroup(position) {
  const value = String(position || "").toLowerCase();

  if (value === "goalkeeper") return "goalkeeper";
  if (value.includes("back") || value.includes("defensive")) return "defender";
  if (value.includes("midfield")) return "midfielder";
  if (value.includes("wing")) return "winger";
  if (value === "striker") return "striker";

  return "versatile";
}

function secureRandomIndex(max) {
  if (max <= 1) return 0;

  if (window.crypto?.getRandomValues) {
    const array = new Uint32Array(1);
    window.crypto.getRandomValues(array);
    return array[0] % max;
  }

  return Math.floor(Math.random() * max);
}

function pickOne(items) {
  return items[secureRandomIndex(items.length)];
}

function injectStyles() {
  if (document.getElementById("jtMindsetRotationStyles")) return;

  const style = document.createElement("style");
  style.id = "jtMindsetRotationStyles";

  style.textContent = `
    .jt-mindset-rotation {
      margin: 16px 0 32px;
      padding: clamp(24px, 4vw, 38px);
      border: 1px solid rgba(212,175,55,.2);
      border-radius: 30px;
      background:
        radial-gradient(circle at 92% 5%, rgba(191,166,239,.13), transparent 24rem),
        rgba(255,255,255,.024);
    }

    .jt-rotation-head {
      display: flex;
      align-items: end;
      justify-content: space-between;
      gap: 22px;
      margin-bottom: 22px;
    }

    .jt-rotation-kicker {
      color: #d4af37;
      text-transform: uppercase;
      letter-spacing: 2px;
      font-size: .63rem;
      font-weight: 900;
    }

    .jt-rotation-head h3 {
      margin-top: 10px;
      font-family: "Playfair Display", serif;
      font-size: clamp(2.8rem, 5vw, 5rem);
      line-height: .88;
      letter-spacing: -.05em;
      text-transform: uppercase;
    }

    .jt-rotation-head p {
      max-width: 470px;
      color: #bfb7a5;
      font-size: .75rem;
      line-height: 1.6;
      text-align: right;
    }

    .jt-rotation-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 13px;
    }

    .jt-rotation-card {
      min-height: 285px;
      padding: 22px;
      border: 1px solid rgba(212,175,55,.14);
      border-radius: 22px;
      background: rgba(0,0,0,.23);
    }

    .jt-rotation-type {
      color: #d4af37;
      text-transform: uppercase;
      letter-spacing: 1.35px;
      font-size: .58rem;
      font-weight: 900;
    }

    .jt-rotation-card h4 {
      margin: 14px 0 8px;
      color: #f8f3e7;
      font-size: .9rem;
      line-height: 1.35;
      text-transform: uppercase;
      letter-spacing: .55px;
    }

    .jt-rotation-use {
      color: #bfa6ef;
      font-size: .64rem;
      font-weight: 800;
      line-height: 1.45;
    }

    .jt-rotation-card p {
      margin-top: 11px;
      color: #bfb7a5;
      font-size: .72rem;
      line-height: 1.58;
    }

    .jt-rotation-steps {
      margin-top: 14px;
      display: grid;
      gap: 6px;
    }

    .jt-rotation-step {
      padding: 8px 10px;
      border: 1px solid rgba(212,175,55,.1);
      border-radius: 11px;
      color: #f5e6b3;
      font-size: .66rem;
      line-height: 1.4;
    }

    .jt-position-cue {
      margin-top: 13px;
      padding: 17px 18px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 18px;
      border-left: 3px solid #d4af37;
      border-radius: 0 16px 16px 0;
      background: rgba(0,0,0,.25);
    }

    .jt-position-cue span {
      color: #d4af37;
      text-transform: uppercase;
      letter-spacing: 1.2px;
      font-size: .6rem;
      font-weight: 900;
    }

    .jt-position-cue strong {
      color: #f8f3e7;
      font-size: .76rem;
      line-height: 1.5;
      text-align: right;
    }

    .jt-breath-safety {
      margin-top: 13px;
      color: #91c7eb;
      font-size: .63rem;
      line-height: 1.55;
    }

    @media (max-width: 1000px) {
      .jt-rotation-grid {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 700px) {
      .jt-rotation-head,
      .jt-position-cue {
        display: block;
      }

      .jt-rotation-head p,
      .jt-position-cue strong {
        display: block;
        margin-top: 10px;
        text-align: left;
      }
    }
  `;

  document.head.appendChild(style);
}

function cardMarkup(type, item) {
  return `
    <article class="jt-rotation-card">
      <div class="jt-rotation-type">${type}</div>
      <h4>${item.title}</h4>
      <div class="jt-rotation-use">${item.use}</div>
      <p>${item.description}</p>

      <div class="jt-rotation-steps">
        ${item.steps.map(
          (step) => `<div class="jt-rotation-step">${step}</div>`
        ).join("")}
      </div>
    </article>
  `;
}

function renderRotation(profile) {
  if (document.getElementById("jtMindsetRotation")) return;

  const exerciseGrid =
    document.getElementById("exerciseGrid");

  if (!exerciseGrid) return;

  const breath =
    pickOne(BREATHWORK);

  const pools =
    [
      ["Focus", FOCUS],
      ["Confidence", CONFIDENCE],
      ["Recovery + Reset", RECOVERY]
    ];

  const firstPoolIndex =
    secureRandomIndex(pools.length);

  const secondPoolIndex =
    (firstPoolIndex + 1 + secureRandomIndex(pools.length - 1)) %
    pools.length;

  const first =
    pools[firstPoolIndex];

  const second =
    pools[secondPoolIndex];

  const group =
    getPositionGroup(profile.primary_position);

  const cue =
    pickOne(
      POSITION_CUES[group] ||
      POSITION_CUES.versatile
    );

  const section =
    document.createElement("section");

  section.className = "jt-mindset-rotation";
  section.id = "jtMindsetRotation";

  section.innerHTML = `
    <div class="jt-rotation-head">
      <div>
        <div class="jt-rotation-kicker">Today’s Mindset Rotation</div>
        <h3>Fresh Tools Each Visit.</h3>
      </div>

      <p>
        These suggestions change whenever you enter the Mindset Centre.
        Use the one that best matches what you need today rather than trying to complete everything.
      </p>
    </div>

    <div class="jt-rotation-grid">
      ${cardMarkup("Breathwork", breath)}
      ${cardMarkup(first[0], pickOne(first[1]))}
      ${cardMarkup(second[0], pickOne(second[1]))}
    </div>

    <div class="jt-position-cue">
      <span>${String(profile.primary_position || "Player").replaceAll("-", " ")} cue</span>
      <strong>${cue}</strong>
    </div>

    <div class="jt-breath-safety">
      Breathwork should feel comfortable and controlled. Never force a breath hold.
      If you feel dizzy, light-headed, unwell or uncomfortable, stop and return to normal breathing.
      Young players should use these techniques with sensible adult support.
    </div>
  `;

  exerciseGrid.insertAdjacentElement("afterend", section);
}

async function initialiseMindsetRotation() {
  try {
    injectStyles();

    const { data: sessionData } =
      await supabase.auth.getSession();

    const user =
      sessionData?.session?.user;

    if (!user) return;

    const { data: profile, error } =
      await supabase
        .from("profiles")
        .select("primary_position,onboarding_complete")
        .eq("id", user.id)
        .maybeSingle();

    if (error || !profile?.onboarding_complete) return;

    const waitForPage = () => {
      const content =
        document.getElementById("mindsetContent");

      if (
        content &&
        !content.classList.contains("hidden")
      ) {
        renderRotation(profile);
        return true;
      }

      return false;
    };

    if (waitForPage()) return;

    const observer =
      new MutationObserver(() => {
        if (waitForPage()) {
          observer.disconnect();
        }
      });

    observer.observe(
      document.body,
      {
        subtree: true,
        attributes: true,
        attributeFilter: ["class"]
      }
    );

    setTimeout(() => {
      waitForPage();
      observer.disconnect();
    }, 6000);
  } catch (error) {
    console.warn(
      "JT mindset rotation enhancement did not load:",
      error
    );
  }
}

initialiseMindsetRotation();
