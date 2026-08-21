import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://hunrekcnmtabowiivmrk.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_yfi5vW_HTltDcUPAqmqiyQ_qSnckDNJ";

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  { auth: { persistSession: true, autoRefreshToken: true } }
);

const $ = (id) => document.getElementById(id);

let currentUser = null;
let currentSession = null;
let todaySessions = [];

function toast(message, error = false) {
  const el = $("toast");
  el.textContent = message;
  el.style.borderColor = error
    ? "rgba(255,146,146,.4)"
    : "rgba(212,175,55,.25)";
  el.classList.remove("hidden");
  setTimeout(() => el.classList.add("hidden"), 3200);
}

function escapeHtml(value = "") {
  return String(value).replace(
    /[&<>"']/g,
    (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[c]
  );
}

function fmtTime(iso) {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(iso));
}

function fmtDateLong(date = new Date()) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long"
  }).format(date);
}

function localDateISO(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function setDefaultStart() {
  const now = new Date();
  now.setMinutes(Math.ceil(now.getMinutes() / 15) * 15, 0, 0);
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60000)
    .toISOString()
    .slice(0, 16);
  $("newStart").value = local;
}

async function load() {
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    location.href = "/performance-hub-login.html";
    return;
  }

  currentUser = user;

  const {
    data: staff,
    error: staffError
  } = await supabase.rpc("session_connect_get_staff_context");

  if (staffError || !staff?.length) {
    $("loading").textContent =
      "Coach access is not enabled for this account.";
    return;
  }

  $("coachName").textContent =
    staff[0].display_name || "JT Coach";
  $("todayLabel").textContent = fmtDateLong();

  $("loading").classList.add("hidden");
  $("app").classList.remove("hidden");

  setDefaultStart();

  await Promise.all([
    loadToday(),
    searchPlayers("")
  ]);
}

async function loadToday() {
  const {
    data,
    error
  } = await supabase.rpc(
    "session_connect_get_coach_dashboard",
    { p_day: localDateISO() }
  );

  if (error) {
    toast(error.message, true);
    return;
  }

  todaySessions = data || [];
  renderSessions();
}

function renderSessions() {
  $("sessionCount").textContent =
    todaySessions.length;

  $("completedCount").textContent =
    todaySessions.filter(
      (s) => s.status === "completed"
    ).length;

  $("mediaCount").textContent =
    todaySessions.reduce(
      (total, s) =>
        total + Number(s.media_count || 0),
      0
    );

  const wrap = $("sessionList");

  if (!todaySessions.length) {
    wrap.innerHTML = `
      <div class="empty">
        No sessions are connected for today yet.<br>
        Add one manually now; Calendly automation can plug
        into the same session table next.
      </div>
    `;
    return;
  }

  wrap.innerHTML = todaySessions
    .map(
      (s) => `
      <article class="session-card">
        <div class="session-time">
          <strong>${escapeHtml(fmtTime(s.start_at))}</strong>
          <span>${escapeHtml(s.session_type)}</span>
        </div>

        <div class="session-player">
          <h3>${escapeHtml(s.player_name)}</h3>

          <p>
            ${escapeHtml(s.primary_position)}
            · ${escapeHtml(s.playing_level)}
            ${s.venue ? ` · ${escapeHtml(s.venue)}` : ""}
          </p>

          <div class="tags">
            <span class="tag status ${
              s.status === "completed"
                ? "completed"
                : ""
            }">
              ${escapeHtml(s.status)}
            </span>

            ${
              s.focus
                ? `<span class="tag">${escapeHtml(
                    s.focus
                  )}</span>`
                : ""
            }

            ${
              Number(s.media_count || 0)
                ? `<span class="tag">${Number(
                    s.media_count
                  )} media</span>`
                : ""
            }
          </div>
        </div>

        <button
          class="open-session"
          data-session="${s.session_id}"
        >
          ${
            s.status === "completed"
              ? "Review / Update"
              : "Complete Session"
          }
        </button>
      </article>
    `
    )
    .join("");

  wrap
    .querySelectorAll("[data-session]")
    .forEach((button) =>
      button.addEventListener(
        "click",
        () => openSession(button.dataset.session)
      )
    );
}

async function searchPlayers(
  query,
  target = "playerResults"
) {
  const {
    data,
    error
  } = await supabase.rpc(
    "session_connect_search_players",
    { p_query: query || "" }
  );

  if (error) {
    toast(error.message, true);
    return [];
  }

  renderPlayerResults(data || [], target);
  return data || [];
}

function renderPlayerResults(players, target) {
  const wrap = $(target);

  if (!players.length) {
    wrap.innerHTML = `
      <div class="empty">
        No matching players found.
      </div>
    `;
    return;
  }

  wrap.innerHTML = players
    .map(
      (p) => `
      <div class="player-result">
        <div>
          <strong>${escapeHtml(p.player_name)}</strong>
          <span>
            ${escapeHtml(p.primary_position)}
            · ${escapeHtml(p.playing_level)}
            ${
              p.development_goal
                ? ` · ${escapeHtml(
                    p.development_goal
                  )}`
                : ""
            }
          </span>
        </div>

        <button
          class="select-player"
          data-player="${p.player_user_id}"
          data-name="${escapeHtml(p.player_name)}"
        >
          ${
            target === "newPlayerResults"
              ? "Choose"
              : "View Sessions"
          }
        </button>
      </div>
    `
    )
    .join("");

  wrap
    .querySelectorAll("[data-player]")
    .forEach((button) =>
      button.addEventListener(
        "click",
        () => {
          if (target === "newPlayerResults") {
            $("newPlayerId").value =
              button.dataset.player;

            $("newPlayerName").value =
              button.dataset.name;

            $("newPlayerResults").innerHTML = "";
          } else {
            window.open(
              `/performance-hub-sessions.html?player=${encodeURIComponent(
                button.dataset.player
              )}`,
              "_blank"
            );
          }
        }
      )
    );
}

async function openSession(id) {
  const session = todaySessions.find(
    (s) => s.session_id === id
  );

  if (!session) return;

  currentSession = session;

  $("modalPlayerName").textContent =
    session.player_name;

  $("focus").value =
    session.focus || "";

  $("coachFeedback").value =
    session.coach_feedback || "";

  $("nextFocus").value =
    session.next_focus || "";

  $("homework").value =
    session.homework || "";

  const ratings =
    session.ratings || {};

  $("ratingTechnical").value =
    ratings.technical || "";

  $("ratingDecision").value =
    ratings.decision_making || "";

  $("ratingIntensity").value =
    ratings.intensity || "";

  $("ratingConfidence").value =
    ratings.confidence || "";

  $("sessionMedia").value = "";
  $("mediaStatus").textContent = "";

  await loadSessionMedia(id);

  $("sessionModal").classList.remove("hidden");
}

async function loadSessionMedia(sessionId) {
  const {
    data,
    error
  } = await supabase
    .from("session_connect_media")
    .select(
      "id,original_name,media_type,storage_path,created_at"
    )
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false });

  if (error) {
    $("mediaList").innerHTML = "";
    return;
  }

  $("mediaList").innerHTML =
    (data || [])
      .map(
        (m) => `
        <div class="media-item">
          <span>
            ${escapeHtml(
              m.original_name || m.media_type
            )}
          </span>
          <span>${escapeHtml(m.media_type)}</span>
        </div>
      `
      )
      .join("");
}

async function saveSession() {
  if (!currentSession) return;

  const button = $("saveSession");

  button.disabled = true;
  button.textContent = "Saving…";

  const ratings = {
    technical:
      $("ratingTechnical").value || null,

    decision_making:
      $("ratingDecision").value || null,

    intensity:
      $("ratingIntensity").value || null,

    confidence:
      $("ratingConfidence").value || null
  };

  const {
    error
  } = await supabase.rpc(
    "session_connect_complete_session",
    {
      p_session_id:
        currentSession.session_id,

      p_focus:
        $("focus").value,

      p_coach_feedback:
        $("coachFeedback").value,

      p_next_focus:
        $("nextFocus").value,

      p_homework:
        $("homework").value,

      p_ratings:
        ratings
    }
  );

  if (error) {
    toast(error.message, true);
    button.disabled = false;
    button.textContent = "Save Session";
    return;
  }

  const files =
    [...$("sessionMedia").files];

  if (files.length) {
    await uploadMedia(
      files,
      currentSession
    );
  }

  toast(
    "Session saved. Player/parent timeline updated."
  );

  button.disabled = false;
  button.textContent = "Save Session";

  $("sessionModal")
    .classList
    .add("hidden");

  await loadToday();
}

async function uploadMedia(
  files,
  session
) {
  let completed = 0;

  for (const file of files) {
    if (file.size > 262144000) {
      toast(
        `${file.name} is over 250MB.`,
        true
      );
      continue;
    }

    if (
      !file.type.startsWith("video/") &&
      !file.type.startsWith("image/")
    ) {
      continue;
    }

    const safeName =
      file.name.replace(
        /[^a-zA-Z0-9._-]/g,
        "-"
      );

    const path =
      `${session.player_user_id}/` +
      `${session.session_id}/` +
      `${crypto.randomUUID()}-${safeName}`;

    $("mediaStatus").textContent =
      `Uploading ${
        completed + 1
      } of ${files.length}…`;

    const {
      error: uploadError
    } = await supabase
      .storage
      .from("session-media")
      .upload(
        path,
        file,
        {
          upsert: false,
          contentType: file.type
        }
      );

    if (uploadError) {
      toast(
        `Upload failed: ${file.name}`,
        true
      );
      continue;
    }

    const {
      error: metadataError
    } = await supabase
      .from("session_connect_media")
      .insert({
        session_id:
          session.session_id,

        player_user_id:
          session.player_user_id,

        coach_user_id:
          currentUser.id,

        media_type:
          file.type.startsWith("video/")
            ? "video"
            : "image",

        storage_path:
          path,

        original_name:
          file.name,

        mime_type:
          file.type,

        file_size:
          file.size,

        visibility:
          "player_parent"
      });

    if (metadataError) {
      toast(
        `Saved file but could not link ${file.name}.`,
        true
      );
      continue;
    }

    completed += 1;
  }

  $("mediaStatus").textContent =
    completed
      ? `${completed} file${
          completed === 1
            ? ""
            : "s"
        } uploaded.`
      : "";
}

$("searchPlayers")
  .addEventListener(
    "click",
    () =>
      searchPlayers(
        $("playerSearch").value
      )
  );

$("playerSearch")
  .addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Enter") {
        searchPlayers(
          event.currentTarget.value
        );
      }
    }
  );

$("addSession")
  .addEventListener(
    "click",
    () => {
      $("addModal")
        .classList
        .remove("hidden");

      searchPlayers(
        "",
        "newPlayerResults"
      );
    }
  );

$("newPlayerSearch")
  .addEventListener(
    "input",
    (event) => {
      clearTimeout(
        window.__newPlayerTimer
      );

      window.__newPlayerTimer =
        setTimeout(
          () =>
            searchPlayers(
              event.target.value,
              "newPlayerResults"
            ),
          250
        );
    }
  );

$("createSession")
  .addEventListener(
    "click",
    async () => {
      const player =
        $("newPlayerId").value;

      if (
        !player ||
        !$("newStart").value
      ) {
        toast(
          "Choose a player and session time.",
          true
        );
        return;
      }

      const start =
        new Date(
          $("newStart").value
        ).toISOString();

      const {
        error
      } = await supabase.rpc(
        "session_connect_create_session",
        {
          p_player_user_id:
            player,

          p_start_at:
            start,

          p_duration_minutes:
            Number(
              $("newDuration").value
            ),

          p_session_type:
            $("newType").value,

          p_venue:
            $("newVenue").value
        }
      );

      if (error) {
        toast(
          error.message,
          true
        );
        return;
      }

      toast("Session connected.");

      $("addModal")
        .classList
        .add("hidden");

      $("newPlayerId").value = "";
      $("newPlayerName").value = "";

      await loadToday();
    }
  );

$("saveSession")
  .addEventListener(
    "click",
    saveSession
  );

document
  .querySelectorAll("[data-close]")
  .forEach((button) =>
    button.addEventListener(
      "click",
      () =>
        $(button.dataset.close)
          .classList
          .add("hidden")
    )
  );

$("signOut")
  .addEventListener(
    "click",
    async () => {
      await supabase.auth.signOut();
      location.href =
        "/performance-hub-login.html";
    }
  );

load().catch((error) => {
  $("loading").textContent =
    error.message ||
    "Could not load Session Connect.";

  console.error(error);
});
