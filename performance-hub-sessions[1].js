import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const supabase = createClient(
  "https://hunrekcnmtabowiivmrk.supabase.co",
  "sb_publishable_yfi5vW_HTltDcUPAqmqiyQ_qSnckDNJ",
  { auth: { persistSession: true, autoRefreshToken: true } }
);

const $ = (id) => document.getElementById(id);

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

function dateLabel(iso) {
  return new Intl.DateTimeFormat(
    "en-GB",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }
  ).format(new Date(iso));
}

function ratingsHtml(ratings = {}) {
  const items = [
    ["Technical", ratings.technical],
    ["Decision Making", ratings.decision_making],
    ["Intensity", ratings.intensity],
    ["Confidence", ratings.confidence]
  ].filter((item) => item[1]);

  if (!items.length) return "";

  return `
    <div class="ratings">
      ${items
        .map(
          ([name, value]) => `
          <span class="rating">
            ${escapeHtml(name)}
            <b>${escapeHtml(value)}/5</b>
          </span>
        `
        )
        .join("")}
    </div>
  `;
}

async function mediaHtml(session) {
  if (!Number(session.media_count || 0)) {
    return "";
  }

  const {
    data,
    error
  } = await supabase
    .from("session_connect_media")
    .select(
      "id,media_type,storage_path,original_name,caption"
    )
    .eq(
      "session_id",
      session.session_id
    )
    .eq(
      "visibility",
      "player_parent"
    )
    .order(
      "created_at",
      { ascending: true }
    );

  if (
    error ||
    !data?.length
  ) {
    return "";
  }

  const items = [];

  for (const media of data) {
    const {
      data: signed,
      error: signError
    } = await supabase
      .storage
      .from("session-media")
      .createSignedUrl(
        media.storage_path,
        3600
      );

    if (
      signError ||
      !signed?.signedUrl
    ) {
      continue;
    }

    items.push(`
      <div class="media-item">
        ${
          media.media_type === "video"
            ? `
              <video
                src="${escapeHtml(
                  signed.signedUrl
                )}"
                controls
                playsinline
                preload="metadata"
              ></video>
            `
            : `
              <img
                src="${escapeHtml(
                  signed.signedUrl
                )}"
                alt="Session image"
              >
            `
        }

        <div class="media-caption">
          ${escapeHtml(
            media.caption ||
            media.original_name ||
            "Session media"
          )}
        </div>
      </div>
    `);
  }

  if (!items.length) {
    return "";
  }

  return `
    <div class="media">
      <div class="eyebrow">
        Session Clips
      </div>

      <h3>Coach Uploads.</h3>

      <div class="media-grid">
        ${items.join("")}
      </div>
    </div>
  `;
}

async function render(playerId) {
  $("loading").textContent =
    "Loading your session history…";

  $("loading")
    .classList
    .remove("hidden");

  $("timeline")
    .classList
    .add("hidden");

  const {
    data,
    error
  } = await supabase.rpc(
    "session_connect_get_player_timeline",
    {
      p_player_user_id:
        playerId,

      p_limit:
        50
    }
  );

  if (error) {
    $("loading").textContent =
      error.message;
    return;
  }

  if (!data?.length) {
    $("loading").textContent =
      "No connected sessions yet. Once a JT coach completes a session, the feedback and clips will appear here.";
    return;
  }

  const html = [];

  for (const session of data) {
    const media =
      await mediaHtml(session);

    html.push(`
      <article class="session">
        <div class="session-head">
          <div>
            <div class="session-date">
              ${escapeHtml(
                dateLabel(
                  session.start_at
                )
              )}
            </div>

            <h2>
              ${escapeHtml(
                session.session_type
              )}
            </h2>

            <div class="meta">
              Coach:
              ${escapeHtml(
                session.coach_name
              )}

              ${
                session.venue
                  ? ` · ${escapeHtml(
                      session.venue
                    )}`
                  : ""
              }
            </div>
          </div>

          <span class="status ${
            session.status ===
            "completed"
              ? "completed"
              : ""
          }">
            ${escapeHtml(
              session.status
            )}
          </span>
        </div>

        <div class="content-grid">
          ${
            session.focus
              ? `
                <div class="box">
                  <strong>
                    Worked On
                  </strong>

                  <p>
                    ${escapeHtml(
                      session.focus
                    )}
                  </p>
                </div>
              `
              : ""
          }

          ${
            session.next_focus
              ? `
                <div class="box">
                  <strong>
                    Next Focus
                  </strong>

                  <p>
                    ${escapeHtml(
                      session.next_focus
                    )}
                  </p>
                </div>
              `
              : ""
          }

          ${
            session.coach_feedback
              ? `
                <div class="box full">
                  <strong>
                    Coach Feedback
                  </strong>

                  <p>
                    ${escapeHtml(
                      session.coach_feedback
                    )}
                  </p>
                </div>
              `
              : ""
          }

          ${
            session.homework
              ? `
                <div class="box full">
                  <strong>
                    Your Task
                  </strong>

                  <p>
                    ${escapeHtml(
                      session.homework
                    )}
                  </p>
                </div>
              `
              : ""
          }
        </div>

        ${ratingsHtml(
          session.ratings || {}
        )}

        ${media}
      </article>
    `);
  }

  $("timeline").innerHTML =
    html.join("");

  $("loading")
    .classList
    .add("hidden");

  $("timeline")
    .classList
    .remove("hidden");
}

async function initialise() {
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    location.href =
      "/performance-hub-login.html";
    return;
  }

  const {
    data: players,
    error
  } = await supabase.rpc(
    "session_connect_get_my_players"
  );

  if (error) {
    $("loading").textContent =
      error.message;
    return;
  }

  const requestedPlayer =
    new URLSearchParams(
      location.search
    ).get("player");

  const allowed =
    (players || []).find(
      (player) =>
        player.player_user_id ===
        requestedPlayer
    );

  const initial =
    allowed?.player_user_id ||
    players?.[0]?.player_user_id ||
    user.id;

  if (players?.length > 1) {
    $("playerSelectorWrap")
      .classList
      .remove("hidden");

    $("playerSelector").innerHTML =
      players
        .map(
          (player) => `
            <option
              value="${escapeHtml(
                player.player_user_id
              )}"
              ${
                player.player_user_id ===
                initial
                  ? "selected"
                  : ""
              }
            >
              ${escapeHtml(
                player.player_name
              )}
              ·
              ${escapeHtml(
                player.relationship_label
              )}
            </option>
          `
        )
        .join("");

    $("playerSelector")
      .addEventListener(
        "change",
        (event) =>
          render(
            event.target.value
          )
      );
  }

  await render(initial);
}

initialise().catch(
  (error) => {
    $("loading").textContent =
      error.message ||
      "Could not load sessions.";

    console.error(error);
  }
);
