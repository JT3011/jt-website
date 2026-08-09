
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

const POSITION_GROUPS = {
  goalkeeper: "goalkeeper",
  "centre-back": "centre-back",
  "right-back": "full-back",
  "left-back": "full-back",
  "defensive-midfield": "defensive-midfield",
  "central-midfield": "central-midfield",
  "attacking-midfield": "attacking-midfield",
  "right-wing": "winger",
  "left-wing": "winger",
  striker: "striker",
  versatile: "versatile"
};

const DRILLS = {
  goalkeeper: [
    {
      title: "Quick Set Footwork",
      description: "Shuffle between two markers, plant, get balanced and hold a strong set position before the next movement.",
      equipment: "2–4 markers",
      focus: "Footwork + set position",
      tags: ["footwork", "speed", "defending"],
      base: "3 x 45 sec"
    },
    {
      title: "Wall Reaction Catch",
      description: "Throw a ball firmly against a wall from different angles and react late. Secure the catch before resetting.",
      equipment: "Ball + wall",
      focus: "Reactions + handling",
      tags: ["reactions", "handling", "speed"],
      base: "3 x 8 catches"
    },
    {
      title: "Low Scoop Series",
      description: "Roll or rebound the ball low off a wall, move your feet behind the line and collect with clean scoop technique.",
      equipment: "Ball + wall",
      focus: "Handling",
      tags: ["handling", "footwork"],
      base: "3 x 8 each side"
    },
    {
      title: "One-Touch Distribution",
      description: "Receive from a wall and play first time into alternating target gates with both feet.",
      equipment: "Ball + wall + 2 gates",
      focus: "Distribution",
      tags: ["passing", "first-touch", "weak-foot"],
      base: "4 x 60 sec"
    },
    {
      title: "Backpass Scan + Play",
      description: "Check both shoulders before the rebound arrives, open your body and play to a called or pre-selected target.",
      equipment: "Ball + wall + markers",
      focus: "Scanning + decisions",
      tags: ["passing", "scanning", "decision"],
      base: "3 x 10 reps"
    },
    {
      title: "Explosive Set To Dive",
      description: "Start relaxed, react to a visual cue, set quickly and push explosively to touch a cone placed either side.",
      equipment: "2 cones",
      focus: "Power + reactions",
      tags: ["speed", "reactions", "power"],
      base: "4 x 5 each side"
    },
    {
      title: "High-Ball Footwork Pattern",
      description: "Move around a small marker pattern, plant off the outside foot and reach strongly overhead as if claiming a cross.",
      equipment: "4 cones",
      focus: "Movement + timing",
      tags: ["footwork", "handling", "power"],
      base: "3 x 6 each side"
    },
    {
      title: "Keeper Passing Ladder",
      description: "Complete 10 short passes, 10 medium passes and 10 clipped or driven target passes, alternating feet.",
      equipment: "Ball + targets",
      focus: "Passing range",
      tags: ["passing", "weak-foot"],
      base: "3 rounds"
    }
  ],

  "centre-back": [
    {
      title: "Open-Hip Recovery",
      description: "Drop from a front-on stance, open your hips, recover five metres and finish side-on ready to defend forward.",
      equipment: "4 markers",
      focus: "Recovery defending",
      tags: ["defending", "speed", "footwork"],
      base: "4 x 5 reps"
    },
    {
      title: "First Contact Out Of Feet",
      description: "Pass into a wall, receive across your body and take the first touch outside the line of pressure before passing again.",
      equipment: "Ball + wall",
      focus: "First touch",
      tags: ["first-touch", "passing", "scanning"],
      base: "4 x 90 sec"
    },
    {
      title: "Two-Foot Centre-Back Passing",
      description: "Alternate firm passes through two target gates. Every fifth pass must be played with your weaker foot.",
      equipment: "Ball + wall/targets",
      focus: "Passing quality",
      tags: ["passing", "weak-foot"],
      base: "4 x 12 passes"
    },
    {
      title: "Jockey To Intercept",
      description: "Backpedal or jockey between markers, then explode forward on a cue to intercept a ball or touch a target.",
      equipment: "4 cones",
      focus: "Defensive footwork",
      tags: ["defending", "speed", "decision"],
      base: "4 x 6 reps"
    },
    {
      title: "Scan-Receive-Switch",
      description: "Shoulder-check before receiving from the wall, open out and play to an opposite target as if switching play.",
      equipment: "Ball + wall + gates",
      focus: "Scanning + switch",
      tags: ["scanning", "passing", "first-touch"],
      base: "3 x 8 each side"
    },
    {
      title: "Header Footwork Shadow",
      description: "Move forward, backwards and laterally before planting and performing a controlled shadow heading action.",
      equipment: "3 cones",
      focus: "Aerial positioning",
      tags: ["defending", "footwork"],
      base: "3 x 8"
    },
    {
      title: "Step-In Carry",
      description: "Receive, break the first line with a positive carry, then play a firm pass into a target before recovering your position.",
      equipment: "Ball + cones",
      focus: "Progressive play",
      tags: ["dribbling", "passing", "decision"],
      base: "4 x 6 reps"
    },
    {
      title: "Defender Weak-Foot Block",
      description: "Complete a full technical block using only the weaker foot: receive, set, pass and step into the next angle.",
      equipment: "Ball + wall",
      focus: "Weak-foot security",
      tags: ["weak-foot", "passing", "first-touch"],
      base: "5 min continuous"
    }
  ],

  "full-back": [
    {
      title: "Recovery Angle Sprint",
      description: "Sprint diagonally back towards goal, decelerate under control and finish side-on as if protecting the inside channel.",
      equipment: "4 cones",
      focus: "Recovery speed",
      tags: ["speed", "defending"],
      base: "5 x 12–15 m"
    },
    {
      title: "Inside-Outside First Touch",
      description: "Receive from a wall and alternate a first touch down the line with a first touch inside onto the opposite foot.",
      equipment: "Ball + wall",
      focus: "Receiving options",
      tags: ["first-touch", "dribbling", "weak-foot"],
      base: "4 x 60 sec"
    },
    {
      title: "Overlap Pattern",
      description: "Play into the wall, move around an overlap cone, receive into stride and finish with a driven pass into a target.",
      equipment: "Ball + wall + cones",
      focus: "Overlap timing",
      tags: ["passing", "speed", "crossing"],
      base: "4 x 6 each side"
    },
    {
      title: "1v1 Footwork Shadow",
      description: "Jockey a marker, protect the inside, then react to a left/right cue and accelerate to the next cone.",
      equipment: "3 cones",
      focus: "1v1 defending",
      tags: ["defending", "footwork", "speed"],
      base: "4 x 30 sec"
    },
    {
      title: "Crossing Target Reps",
      description: "From a short approach, practise low cut-backs, driven deliveries and clipped passes into marked target zones.",
      equipment: "Ball + targets",
      focus: "Delivery",
      tags: ["crossing", "passing"],
      base: "3 x 8 deliveries"
    },
    {
      title: "Underlap Carry",
      description: "Start wide, receive, drive diagonally inside through a gate and play a punch pass into a central target.",
      equipment: "Ball + cones",
      focus: "Inside movement",
      tags: ["dribbling", "passing", "decision"],
      base: "4 x 6 reps"
    },
    {
      title: "Press And Recover",
      description: "Accelerate forward to a press cone, brake, turn and recover quickly to the starting line with good body control.",
      equipment: "3 cones",
      focus: "Repeated movement",
      tags: ["speed", "defending", "footwork"],
      base: "4 x 5 reps"
    },
    {
      title: "Full-Back Weak Foot",
      description: "Use only your weaker foot for wall passes, first touches down the line and inside passes.",
      equipment: "Ball + wall",
      focus: "Two-foot confidence",
      tags: ["weak-foot", "passing", "first-touch"],
      base: "6 min block"
    }
  ],

  "defensive-midfield": [
    {
      title: "Shoulder-Check Rhythm",
      description: "Before every wall return, scan left and right, receive side-on and play the next pass within two touches.",
      equipment: "Ball + wall",
      focus: "Scanning",
      tags: ["scanning", "first-touch", "passing"],
      base: "4 x 75 sec"
    },
    {
      title: "Half-Turn Gate",
      description: "Receive on the back foot, turn through a gate and pass into a second target as if playing through pressure.",
      equipment: "Ball + wall + gates",
      focus: "Half-turn receiving",
      tags: ["first-touch", "passing", "scanning"],
      base: "4 x 8 reps"
    },
    {
      title: "Intercept And Release",
      description: "Start behind a cone, step quickly into an imagined passing lane, collect the ball and release it in two touches.",
      equipment: "Ball + cones",
      focus: "Interception",
      tags: ["defending", "decision", "passing"],
      base: "4 x 6 each side"
    },
    {
      title: "One-Touch Bounce Pass",
      description: "Play fast one-touch passes off a wall while changing your receiving angle every five contacts.",
      equipment: "Ball + wall",
      focus: "Tempo",
      tags: ["passing", "first-touch", "decision"],
      base: "5 x 45 sec"
    },
    {
      title: "Protect + Escape",
      description: "Receive with your body between the ball and an imaginary opponent, then use a turn to escape into a new gate.",
      equipment: "Ball + cones",
      focus: "Ball protection",
      tags: ["first-touch", "dribbling", "decision"],
      base: "4 x 6 reps"
    },
    {
      title: "Switch The Play",
      description: "Receive centrally, scan, then play alternately to wide left and right target gates with controlled weight.",
      equipment: "Ball + targets",
      focus: "Passing range",
      tags: ["passing", "scanning"],
      base: "4 x 10 passes"
    },
    {
      title: "Six-Yard Awareness Box",
      description: "Dribble inside a small square while scanning an object or number outside the area before each change of direction.",
      equipment: "Ball + 4 cones",
      focus: "Awareness",
      tags: ["scanning", "dribbling"],
      base: "4 x 60 sec"
    },
    {
      title: "Weak-Foot Pivot",
      description: "Receive, pivot and pass using only your weaker foot while keeping your body open to the pitch.",
      equipment: "Ball + wall",
      focus: "Weak-foot security",
      tags: ["weak-foot", "first-touch", "passing"],
      base: "5 min"
    }
  ],

  "central-midfield": [
    {
      title: "Three-Angle Receiving",
      description: "Use three target gates. Receive from the wall and play out through a different gate each repetition.",
      equipment: "Ball + wall + cones",
      focus: "Receiving angles",
      tags: ["first-touch", "scanning", "passing"],
      base: "4 x 8 reps"
    },
    {
      title: "Scan Every Pass",
      description: "Pass to a wall and force a shoulder check before every return. Vary one-touch and two-touch play.",
      equipment: "Ball + wall",
      focus: "Scanning habit",
      tags: ["scanning", "passing", "first-touch"],
      base: "4 x 75 sec"
    },
    {
      title: "Tempo Control",
      description: "Complete five quick passes, then take one longer touch to change the tempo before restarting the fast sequence.",
      equipment: "Ball + wall",
      focus: "Tempo changes",
      tags: ["passing", "decision", "first-touch"],
      base: "5 x 60 sec"
    },
    {
      title: "Receive + Carry + Release",
      description: "Receive on the half-turn, carry through a gate and play a firm pass into the next target.",
      equipment: "Ball + cones",
      focus: "Progression",
      tags: ["dribbling", "passing", "first-touch"],
      base: "4 x 6 reps"
    },
    {
      title: "Weak-Foot Passing Block",
      description: "Complete a technical block using only your weaker foot, keeping the pass crisp and the first touch clean.",
      equipment: "Ball + wall",
      focus: "Weak foot",
      tags: ["weak-foot", "passing"],
      base: "6 min"
    },
    {
      title: "Two-Touch Pressure",
      description: "Set a timer and complete as many clean two-touch receive-and-pass actions as possible without losing quality.",
      equipment: "Ball + wall",
      focus: "Speed of play",
      tags: ["passing", "first-touch", "decision"],
      base: "5 x 45 sec"
    },
    {
      title: "Turn Library",
      description: "Cycle through inside hook, outside hook, Cruyff and drag-back turns before accelerating into the next gate.",
      equipment: "Ball + cones",
      focus: "Turning",
      tags: ["dribbling", "first-touch"],
      base: "3 x 8 turns"
    },
    {
      title: "Late Box Arrival",
      description: "Pass, move away, accelerate into a marked box and meet the return with a controlled finish or target pass.",
      equipment: "Ball + wall + target",
      focus: "Third-man movement",
      tags: ["speed", "finishing", "decision"],
      base: "4 x 6 reps"
    }
  ],

  "attacking-midfield": [
    {
      title: "Between-Lines Half Turn",
      description: "Check away, move into a pocket, receive from a wall on the half-turn and attack a forward gate.",
      equipment: "Ball + wall + cones",
      focus: "Receive to attack",
      tags: ["first-touch", "scanning", "dribbling"],
      base: "4 x 8 reps"
    },
    {
      title: "Turn + Burst",
      description: "Use a different turn on every repetition, then accelerate for three to five metres with the ball under control.",
      equipment: "Ball + cones",
      focus: "Turning + acceleration",
      tags: ["dribbling", "speed", "first-touch"],
      base: "4 x 6 each side"
    },
    {
      title: "Disguised Pass",
      description: "Shape to play one direction, open your hips late and pass through a different target gate.",
      equipment: "Ball + 2 gates",
      focus: "Creativity",
      tags: ["passing", "decision"],
      base: "4 x 8 passes"
    },
    {
      title: "One-Touch Combination",
      description: "Bounce passes off a wall, change your angle after every contact and finish the sequence with a forward touch.",
      equipment: "Ball + wall",
      focus: "Combination play",
      tags: ["passing", "first-touch", "decision"],
      base: "5 x 45 sec"
    },
    {
      title: "Final-Ball Targets",
      description: "Attack a cone, lift your head and play through-ball, cut-back and disguised-pass variations into targets.",
      equipment: "Ball + cones + targets",
      focus: "Final pass",
      tags: ["passing", "decision", "scanning"],
      base: "3 x 9 actions"
    },
    {
      title: "Edge-Of-Box Finish",
      description: "Receive from the wall, shift the ball out of your feet and strike or pass accurately into a small target.",
      equipment: "Ball + wall/target",
      focus: "Finishing",
      tags: ["finishing", "first-touch"],
      base: "4 x 6 each foot"
    },
    {
      title: "Tight-Space Escape",
      description: "Dribble in a small square, use body feints and escape through a called or pre-chosen gate.",
      equipment: "Ball + 4 cones",
      focus: "Close control",
      tags: ["dribbling", "decision"],
      base: "4 x 60 sec"
    },
    {
      title: "Weak-Foot Creator",
      description: "Use only the weaker foot for receive, turn, pass and finish actions.",
      equipment: "Ball + wall",
      focus: "Weak-foot confidence",
      tags: ["weak-foot", "passing", "finishing"],
      base: "6 min"
    }
  ],

  winger: [
    {
      title: "First Touch To Attack",
      description: "Receive wide and take the first touch forwards into space, alternating inside and outside touches.",
      equipment: "Ball + wall",
      focus: "Positive first touch",
      tags: ["first-touch", "dribbling", "speed"],
      base: "4 x 8 each side"
    },
    {
      title: "1v1 Move Library",
      description: "Attack a cone and rotate scissors, step-over, body feint, inside-outside and stop-start moves.",
      equipment: "Ball + cone",
      focus: "1v1 skill",
      tags: ["dribbling", "speed"],
      base: "5 x 45 sec"
    },
    {
      title: "Change Of Pace",
      description: "Dribble slowly into a marker, perform a feint and accelerate explosively for five metres.",
      equipment: "Ball + cones",
      focus: "Explosive dribbling",
      tags: ["dribbling", "speed"],
      base: "5 x 5 reps"
    },
    {
      title: "Cut Inside + Finish",
      description: "Drive from a wide starting point, cut inside onto the opposite foot and finish into a target.",
      equipment: "Ball + cones + target",
      focus: "Inside threat",
      tags: ["finishing", "dribbling"],
      base: "4 x 6 reps"
    },
    {
      title: "Outside + Deliver",
      description: "Beat a marker on the outside and finish with a low cut-back or driven target pass.",
      equipment: "Ball + targets",
      focus: "Wide delivery",
      tags: ["crossing", "dribbling", "passing"],
      base: "4 x 6 reps"
    },
    {
      title: "Weak-Foot Wing Block",
      description: "Spend the entire block receiving, carrying and delivering with your weaker foot.",
      equipment: "Ball + cones",
      focus: "Weak foot",
      tags: ["weak-foot", "crossing", "dribbling"],
      base: "6 min"
    },
    {
      title: "Scan Before 1v1",
      description: "Before you attack the marker, scan inside as if checking support, then choose whether to go inside or outside.",
      equipment: "Ball + cones",
      focus: "Decision-making",
      tags: ["scanning", "decision", "dribbling"],
      base: "4 x 8 reps"
    },
    {
      title: "Back-Post Arrival",
      description: "Start outside the box, curve your run behind a marker and arrive late to meet a wall return or target ball.",
      equipment: "Ball + wall + cone",
      focus: "Off-ball movement",
      tags: ["speed", "finishing", "decision"],
      base: "4 x 6 reps"
    }
  ],

  striker: [
    {
      title: "Check + Spin",
      description: "Check towards the ball, set or bounce it off the wall, spin off the shoulder and accelerate into space.",
      equipment: "Ball + wall + cone",
      focus: "Striker movement",
      tags: ["speed", "first-touch", "decision"],
      base: "4 x 6 each side"
    },
    {
      title: "First-Touch Finish",
      description: "Receive from a wall and use the first touch to set the ball for an accurate second-touch finish into a target.",
      equipment: "Ball + wall/target",
      focus: "Finishing",
      tags: ["finishing", "first-touch"],
      base: "4 x 8 reps"
    },
    {
      title: "Near/Far Movement",
      description: "Alternate sharp near-post and curved far-post runs around markers, finishing each run with a composed action.",
      equipment: "3 cones + ball",
      focus: "Box movement",
      tags: ["speed", "finishing", "decision"],
      base: "4 x 6 runs"
    },
    {
      title: "Back-To-Goal Turn",
      description: "Receive with your back to an imaginary defender, protect the ball and turn off either shoulder into a finish.",
      equipment: "Ball + cone + target",
      focus: "Hold-up play",
      tags: ["first-touch", "finishing", "dribbling"],
      base: "4 x 6 each side"
    },
    {
      title: "One-Touch Finish Reps",
      description: "Use wall rebounds or self-serves to practise clean one-touch finishes into small target zones.",
      equipment: "Ball + wall/target",
      focus: "One-touch finishing",
      tags: ["finishing", "decision"],
      base: "5 x 6 finishes"
    },
    {
      title: "Weak-Foot Finishing Block",
      description: "Complete close-range target finishes using only your weaker foot, prioritising clean contact over power.",
      equipment: "Ball + target",
      focus: "Weak-foot finishing",
      tags: ["weak-foot", "finishing"],
      base: "5 min"
    },
    {
      title: "Double Movement",
      description: "Move away from the ball, check back, then explode into the opposite channel before receiving.",
      equipment: "3 cones + ball",
      focus: "Lose a defender",
      tags: ["speed", "decision"],
      base: "4 x 6 reps"
    },
    {
      title: "Finish After Fatigue",
      description: "Complete a short five-second movement burst, then immediately settle and finish accurately into a target.",
      equipment: "Ball + cones + target",
      focus: "Composure",
      tags: ["finishing", "speed", "decision"],
      base: "4 x 5 reps"
    }
  ],

  versatile: [
    {
      title: "Ball Mastery Circuit",
      description: "Rotate inside touches, outside touches, sole rolls, V-pulls and foundations in a small space.",
      equipment: "Ball",
      focus: "Ball mastery",
      tags: ["dribbling", "first-touch"],
      base: "5 x 45 sec"
    },
    {
      title: "Two-Foot Wall Passing",
      description: "Alternate feet every pass and vary one-touch, two-touch and receive-across-body actions.",
      equipment: "Ball + wall",
      focus: "Passing",
      tags: ["passing", "weak-foot", "first-touch"],
      base: "5 x 60 sec"
    },
    {
      title: "Four-Gate Dribble",
      description: "Dribble centrally and exit through a different gate each repetition using a turn or feint.",
      equipment: "Ball + 8 cones",
      focus: "Control + decisions",
      tags: ["dribbling", "decision"],
      base: "4 x 60 sec"
    },
    {
      title: "Acceleration With Ball",
      description: "Take three controlled touches, then push the ball into space and accelerate for five to ten metres.",
      equipment: "Ball + cones",
      focus: "Speed",
      tags: ["speed", "dribbling"],
      base: "5 x 5 reps"
    },
    {
      title: "Scan + Receive",
      description: "Check both shoulders before every return from a wall, then receive on the foot furthest from pressure.",
      equipment: "Ball + wall",
      focus: "Scanning",
      tags: ["scanning", "first-touch", "passing"],
      base: "4 x 75 sec"
    },
    {
      title: "Turn + Pass",
      description: "Receive, perform a different turn and play into a target gate before returning to the start.",
      equipment: "Ball + cones",
      focus: "Turning",
      tags: ["first-touch", "passing", "dribbling"],
      base: "4 x 8 reps"
    },
    {
      title: "Weak-Foot Only",
      description: "Use only your weaker foot for touches, passes and turns for the entire block.",
      equipment: "Ball",
      focus: "Weak foot",
      tags: ["weak-foot", "first-touch", "passing"],
      base: "6 min"
    },
    {
      title: "Control + Finish",
      description: "Receive from a wall or self-serve, shift the ball out of your feet and finish accurately into a target.",
      equipment: "Ball + target",
      focus: "End product",
      tags: ["finishing", "first-touch"],
      base: "4 x 8 reps"
    }
  ]
};

const GOAL_TAGS = [
  ["acceleration", "speed"],
  ["speed", "speed"],
  ["explosive", "speed"],
  ["quick", "speed"],
  ["first touch", "first-touch"],
  ["touch", "first-touch"],
  ["passing", "passing"],
  ["pass", "passing"],
  ["weak foot", "weak-foot"],
  ["weaker foot", "weak-foot"],
  ["finishing", "finishing"],
  ["finish", "finishing"],
  ["shoot", "finishing"],
  ["dribbling", "dribbling"],
  ["dribble", "dribbling"],
  ["1v1", "dribbling"],
  ["defending", "defending"],
  ["defend", "defending"],
  ["crossing", "crossing"],
  ["cross", "crossing"],
  ["scan", "scanning"],
  ["awareness", "scanning"],
  ["decision", "decision"],
  ["movement", "decision"]
];

function formatValue(value) {
  return String(value || "")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function hashString(input) {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededShuffle(items, seedText) {
  const result = [...items];
  let seed = hashString(seedText) || 1;

  function random() {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return (seed >>> 0) / 4294967296;
  }

  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

function getIsoWeekKey(date = new Date()) {
  const utc = new Date(Date.UTC(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  ));

  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);

  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((utc - yearStart) / 86400000) + 1) / 7);

  return `${utc.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function getGoalTag(goal) {
  const text = String(goal || "").toLowerCase();
  const found = GOAL_TAGS.find(([keyword]) => text.includes(keyword));
  return found ? found[1] : null;
}

function getLoadGuidance(ageGroup, playingLevel) {
  const age = String(ageGroup || "");
  const level = String(playingLevel || "");

  let minutes = "25–35 min";
  let sets = "3 working sets";
  let rest = "45–60 sec between quality blocks";

  if (["under-9", "under-11"].includes(age)) {
    minutes = "18–25 min";
    sets = "2–3 short working sets";
    rest = "60 sec between blocks";
  } else if (["under-13", "under-15"].includes(age)) {
    minutes = "22–30 min";
    sets = "3 working sets";
  } else if (["under-18", "adult"].includes(age)) {
    minutes = "30–40 min";
    sets = "3–4 working sets";
  }

  let levelCue =
    "Quality first. Build the speed only when technique stays clean.";

  if (["academy-development", "semi-professional", "professional"].includes(level)) {
    levelCue =
      "Work at game-realistic speed. Add scanning, weaker-foot actions and tighter touch limits without sacrificing technique.";
  } else if (level === "beginner") {
    levelCue =
      "Keep the space comfortable and slow the drill down until every repetition is controlled.";
  }

  return { minutes, sets, rest, levelCue };
}

function pickPlan(profile, userId) {
  const primaryGroup =
    POSITION_GROUPS[profile.primary_position] || "versatile";

  const secondaryGroup =
    POSITION_GROUPS[profile.secondary_position] || null;

  const primaryBank =
    DRILLS[primaryGroup] || DRILLS.versatile;

  const goalTag =
    getGoalTag(profile.development_goal);

  const weekKey =
    getIsoWeekKey();

  const seedBase =
    `${userId}|${weekKey}|${primaryGroup}|${goalTag || "all"}`;

  const goalMatches =
    goalTag
      ? primaryBank.filter((drill) => drill.tags.includes(goalTag))
      : [];

  const rest =
    primaryBank.filter((drill) => !goalMatches.includes(drill));

  const ordered =
    [
      ...seededShuffle(goalMatches, `${seedBase}|goal`),
      ...seededShuffle(rest, `${seedBase}|rest`)
    ];

  const selected = [];
  for (const drill of ordered) {
    if (!selected.some((item) => item.title === drill.title)) {
      selected.push(drill);
    }
    if (selected.length >= 6) break;
  }

  if (
    secondaryGroup &&
    secondaryGroup !== primaryGroup &&
    DRILLS[secondaryGroup]
  ) {
    const secondaryPick =
      seededShuffle(
        DRILLS[secondaryGroup],
        `${seedBase}|secondary`
      )[0];

    selected[5] = {
      ...secondaryPick,
      secondary: true
    };
  }

  return {
    weekKey,
    goalTag,
    primaryGroup,
    selected
  };
}

function injectStyles() {
  if (document.getElementById("jtPersonalisedTrainingStyles")) return;

  const style = document.createElement("style");
  style.id = "jtPersonalisedTrainingStyles";
  style.textContent = `
    .jt-personal-plan {
      margin: 4px 0 12px;
      padding: clamp(24px, 4vw, 38px);
      border: 1px solid rgba(212,175,55,.25);
      border-radius: 30px;
      background:
        radial-gradient(circle at 94% 0%, rgba(212,175,55,.12), transparent 25rem),
        rgba(255,255,255,.025);
    }

    .jt-plan-top {
      display: flex;
      align-items: end;
      justify-content: space-between;
      gap: 24px;
      margin-bottom: 24px;
    }

    .jt-plan-kicker {
      color: #d4af37;
      text-transform: uppercase;
      letter-spacing: 2px;
      font-size: .64rem;
      font-weight: 900;
    }

    .jt-plan-title {
      margin-top: 10px;
      font-family: "Playfair Display", serif;
      font-size: clamp(2.7rem, 5vw, 5rem);
      line-height: .88;
      letter-spacing: -.05em;
      text-transform: uppercase;
    }

    .jt-plan-meta {
      max-width: 440px;
      color: #bfb7a5;
      font-size: .76rem;
      line-height: 1.6;
      text-align: right;
    }

    .jt-session-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 13px;
    }

    .jt-session {
      padding: 22px;
      border: 1px solid rgba(212,175,55,.14);
      border-radius: 22px;
      background: rgba(0,0,0,.24);
    }

    .jt-session-label {
      color: #d4af37;
      text-transform: uppercase;
      letter-spacing: 1.4px;
      font-size: .61rem;
      font-weight: 900;
    }

    .jt-session h3 {
      margin: 13px 0 7px;
      font-size: .83rem;
      text-transform: uppercase;
      letter-spacing: .8px;
    }

    .jt-session-purpose {
      min-height: 44px;
      color: #bfb7a5;
      font-size: .72rem;
      line-height: 1.55;
    }

    .jt-plan-drill {
      margin-top: 15px;
      padding-top: 15px;
      border-top: 1px solid rgba(212,175,55,.1);
    }

    .jt-plan-drill strong {
      display: block;
      color: #f8f3e7;
      font-size: .78rem;
      line-height: 1.45;
    }

    .jt-plan-drill span {
      display: block;
      margin-top: 5px;
      color: #bfb7a5;
      font-size: .67rem;
      line-height: 1.5;
    }

    .jt-plan-notes {
      margin-top: 16px;
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 8px;
    }

    .jt-plan-note {
      padding: 11px 12px;
      border-radius: 14px;
      border: 1px solid rgba(212,175,55,.11);
      color: #bfb7a5;
      font-size: .66rem;
      line-height: 1.45;
    }

    .jt-plan-note strong {
      color: #f5e6b3;
    }

    .jt-library {
      margin: 14px 0 30px;
    }

    .jt-library-heading {
      margin: 30px 0 17px;
      display: flex;
      align-items: end;
      justify-content: space-between;
      gap: 20px;
    }

    .jt-library-heading h3 {
      font-family: "Playfair Display", serif;
      font-size: clamp(2.5rem, 5vw, 4.5rem);
      line-height: .9;
      letter-spacing: -.05em;
      text-transform: uppercase;
    }

    .jt-library-heading p {
      max-width: 470px;
      color: #bfb7a5;
      font-size: .76rem;
      line-height: 1.6;
    }

    .jt-library-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
    }

    .jt-library-card {
      padding: 20px;
      min-height: 220px;
      border: 1px solid rgba(212,175,55,.13);
      border-radius: 20px;
      background: rgba(255,255,255,.02);
    }

    .jt-library-card .jt-library-tag {
      color: #d4af37;
      text-transform: uppercase;
      letter-spacing: 1.1px;
      font-size: .58rem;
      font-weight: 900;
    }

    .jt-library-card h4 {
      margin: 13px 0 9px;
      color: #f8f3e7;
      font-size: .86rem;
      line-height: 1.35;
      text-transform: uppercase;
      letter-spacing: .5px;
    }

    .jt-library-card p {
      color: #bfb7a5;
      font-size: .72rem;
      line-height: 1.55;
    }

    .jt-library-card small {
      display: block;
      margin-top: 14px;
      color: #f5e6b3;
      font-size: .62rem;
      line-height: 1.45;
    }

    @media (max-width: 1000px) {
      .jt-session-grid,
      .jt-library-grid {
        grid-template-columns: 1fr;
      }

      .jt-plan-notes {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (max-width: 700px) {
      .jt-plan-top,
      .jt-library-heading {
        display: block;
      }

      .jt-plan-meta {
        margin-top: 13px;
        text-align: left;
      }

      .jt-plan-notes {
        grid-template-columns: 1fr;
      }
    }
  `;

  document.head.appendChild(style);
}

function makeSessionCard(label, title, purpose, drills) {
  const items = drills.map((drill) => `
    <div class="jt-plan-drill">
      <strong>${drill.title}${drill.secondary ? " • Secondary position" : ""}</strong>
      <span>${drill.base} • ${drill.equipment}</span>
      <span>${drill.focus}</span>
    </div>
  `).join("");

  return `
    <article class="jt-session">
      <div class="jt-session-label">${label}</div>
      <h3>${title}</h3>
      <div class="jt-session-purpose">${purpose}</div>
      ${items}
    </article>
  `;
}

function renderPlan(profile, userId) {
  const hero = document.querySelector(".training-content .hero");
  const drillGrid = document.getElementById("drillGrid");

  if (!hero || !drillGrid || document.getElementById("jtPersonalisedPlan")) {
    return;
  }

  const { selected, weekKey, goalTag, primaryGroup } =
    pickPlan(profile, userId);

  const load =
    getLoadGuidance(profile.age_group, profile.playing_level);

  const plan = document.createElement("section");
  plan.className = "jt-personal-plan";
  plan.id = "jtPersonalisedPlan";

  const goalText =
    profile.development_goal ||
    "Become a more complete football player.";

  plan.innerHTML = `
    <div class="jt-plan-top">
      <div>
        <div class="jt-plan-kicker">Your Personalised Position Plan</div>
        <div class="jt-plan-title">${formatValue(profile.primary_position)} Week.</div>
      </div>

      <div class="jt-plan-meta">
        Built from your position, age group, playing level and development goal.
        Your selected drills rotate each training week so the programme stays fresh.
      </div>
    </div>

    <div class="jt-session-grid">
      ${makeSessionCard(
        "Session 01",
        "Technical Base",
        "Clean technique, first touch and position-specific repetition.",
        selected.slice(0, 2)
      )}

      ${makeSessionCard(
        "Session 02",
        "Position Actions",
        "Train the movements and decisions your position repeatedly demands.",
        selected.slice(2, 4)
      )}

      ${makeSessionCard(
        "Session 03",
        "Match Preparation",
        "Shorter, sharper work. Finish feeling confident rather than exhausted.",
        selected.slice(4, 6)
      )}
    </div>

    <div class="jt-plan-notes">
      <div class="jt-plan-note"><strong>Session length:</strong> ${load.minutes}</div>
      <div class="jt-plan-note"><strong>Volume:</strong> ${load.sets}</div>
      <div class="jt-plan-note"><strong>Rest:</strong> ${load.rest}</div>
      <div class="jt-plan-note"><strong>Current goal:</strong> ${goalText}</div>
    </div>

    <div class="jt-plan-note" style="margin-top:8px">
      <strong>Level cue:</strong> ${load.levelCue}
      ${goalTag ? ` Your plan is currently biased towards <strong>${formatValue(goalTag)}</strong> because it matches your development goal.` : ""}
      Use these home sessions around team training and matches rather than stacking every session together.
    </div>
  `;

  hero.insertAdjacentElement("afterend", plan);

  const firstHeading =
    document.querySelector(".training-content .section-heading h2");

  if (firstHeading) {
    firstHeading.textContent = "Core Position Drills.";
  }

  const primaryBank = DRILLS[primaryGroup] || DRILLS.versatile;
  const usedTitles = new Set(selected.map((item) => item.title));

  const extras =
    seededShuffle(
      primaryBank.filter((item) => !usedTitles.has(item.title)),
      `${userId}|${weekKey}|extras`
    ).slice(0, 6);

  const library = document.createElement("section");
  library.className = "jt-library";
  library.id = "jtHomeDrillLibrary";

  library.innerHTML = `
    <div class="jt-library-heading">
      <h3>More At-Home Options.</h3>
      <p>
        Use these as swaps when space, equipment or your schedule changes.
        Keep the personalised three-session plan as your main weekly structure.
      </p>
    </div>

    <div class="jt-library-grid">
      ${extras.map((drill) => `
        <article class="jt-library-card">
          <div class="jt-library-tag">${drill.focus}</div>
          <h4>${drill.title}</h4>
          <p>${drill.description}</p>
          <small>${drill.base} • ${drill.equipment}</small>
        </article>
      `).join("")}
    </div>
  `;

  drillGrid.insertAdjacentElement("afterend", library);
}

async function initialiseEnhancedTraining() {
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
        .select(
          "player_name,primary_position,secondary_position,playing_level,age_group,development_goal,onboarding_complete"
        )
        .eq("id", user.id)
        .maybeSingle();

    if (error || !profile?.onboarding_complete) return;

    const waitForPage = () => {
      const content =
        document.getElementById("trainingContent");

      if (
        content &&
        !content.classList.contains("hidden")
      ) {
        renderPlan(profile, user.id);
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
      "JT personalised training enhancement did not load:",
      error
    );
  }
}

initialiseEnhancedTraining();
