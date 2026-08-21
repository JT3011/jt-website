(() => {
  function addStyles() {
    if (document.getElementById("jtSessionConnectDashboardStyles")) return;

    const style = document.createElement("style");
    style.id = "jtSessionConnectDashboardStyles";
    style.textContent = `
      .centre-card.sessions {
        --card-accent: #d4af37;
        background:
          radial-gradient(
            circle at 90% 12%,
            rgba(212,175,55,.10),
            transparent 16rem
          ),
          linear-gradient(
            145deg,
            rgba(212,175,55,.038),
            rgba(255,255,255,.012)
          ),
          #0a0a0a;
      }
    `;

    document.head.appendChild(style);
  }

  function addSessionsCard() {
    const grid =
      document.querySelector(".centre-grid");

    if (
      !grid ||
      document.getElementById("jtSessionsCard")
    ) {
      return;
    }

    const card =
      document.createElement("a");

    card.id = "jtSessionsCard";
    card.className =
      "centre-card span-4 sessions";
    card.href =
      "/performance-hub-sessions.html";

    card.innerHTML = `
      <div class="card-top">
        <div class="centre-icon">
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <rect
              x="3"
              y="5"
              width="18"
              height="16"
              rx="2"
            ></rect>

            <path
              d="M7 3v4M17 3v4M3 9h18"
            ></path>

            <path
              d="M8 13h3M8 17h8M14 13h2"
            ></path>
          </svg>
        </div>

        <span class="card-number">
          NEW
        </span>
      </div>

      <div class="card-content">
        <div class="card-kicker">
          Your Coaching Record
        </div>

        <h3>
          My Sessions.
        </h3>

        <p>
          Review every connected JT session,
          coach feedback, next actions and clips
          uploaded for you.
        </p>

        <div class="card-action">
          Open Sessions

          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              d="M5 12h14M13 6l6 6-6 6"
            ></path>
          </svg>
        </div>
      </div>
    `;

    const cards =
      [...grid.children];

    const progressCard =
      cards.find(
        (item) =>
          item.getAttribute("href") ===
          "/performance-hub-progress.html"
      );

    if (progressCard) {
      progressCard.insertAdjacentElement(
        "afterend",
        card
      );
    } else {
      grid.appendChild(card);
    }
  }

  function addTopLink() {
    const nav =
      document.querySelector(".top-actions");

    if (
      !nav ||
      nav.querySelector(
        '[href="/performance-hub-sessions.html"]'
      )
    ) {
      return;
    }

    const link =
      document.createElement("a");

    link.className = "top-link";
    link.href =
      "/performance-hub-sessions.html";
    link.textContent = "Sessions";

    const signOut =
      nav.querySelector("button");

    if (signOut) {
      nav.insertBefore(
        link,
        signOut
      );
    } else {
      nav.appendChild(link);
    }
  }

  function initialise() {
    addStyles();
    addSessionsCard();
    addTopLink();
  }

  if (
    document.readyState === "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      initialise,
      { once: true }
    );
  } else {
    initialise();
  }
})();
