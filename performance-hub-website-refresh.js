(() => {
  const HUB_LOGIN = "/performance-hub-login.html";
  const HUB_FREE = "/performance-hub-free-signup.html";
  const HUB_TRIAL = "https://buy.stripe.com/fZucMYcQuaGx2OA3y56Vq05";

  function addStyles() {
    if (document.getElementById("jtHubWebsiteRefreshStyles")) return;

    const style = document.createElement("style");
    style.id = "jtHubWebsiteRefreshStyles";
    style.textContent = `
      .nav-hub-cta {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        height: 44px;
        padding: 0 19px;
        border-radius: 999px;
        border: 1px solid rgba(212,175,55,.38);
        background: linear-gradient(135deg, #d4af37, #f5e6b3);
        color: #050505 !important;
        font-size: .7rem;
        font-weight: 900;
        letter-spacing: 1.15px;
        text-transform: uppercase;
        box-shadow: 0 14px 38px rgba(212,175,55,.18);
        transition: transform .3s var(--ease), box-shadow .3s var(--ease);
      }

      .nav-hub-cta:hover {
        transform: translateY(-3px);
        box-shadow: 0 20px 50px rgba(212,175,55,.28);
      }

      .mobile-hub-link {
        color: var(--gold) !important;
      }

      .hub-refresh {
        position: relative;
        overflow: hidden;
        padding: clamp(88px, 10vw, 150px) 22px;
        background:
          radial-gradient(circle at 50% -10%, rgba(212,175,55,.18), transparent 34rem),
          linear-gradient(180deg, #060606 0%, #0a0a0a 55%, #050505 100%);
        border-top: 1px solid rgba(212,175,55,.12);
        border-bottom: 1px solid rgba(212,175,55,.12);
      }

      .hub-refresh::before {
        content: "";
        position: absolute;
        left: 50%;
        top: -260px;
        width: 720px;
        height: 720px;
        transform: translateX(-50%);
        border: 1px solid rgba(212,175,55,.1);
        border-radius: 50%;
        box-shadow:
          0 0 0 110px rgba(212,175,55,.018),
          0 0 0 220px rgba(212,175,55,.01);
        pointer-events: none;
      }

      .hub-refresh-inner {
        position: relative;
        z-index: 2;
        width: min(1180px, 100%);
        margin: 0 auto;
        text-align: center;
      }

      .hub-refresh-eyebrow {
        color: var(--gold);
        font-size: .7rem;
        font-weight: 900;
        letter-spacing: 2.7px;
        text-transform: uppercase;
      }

      .hub-refresh-badge {
        width: fit-content;
        margin: 22px auto 0;
        padding: 10px 15px;
        display: inline-flex;
        align-items: center;
        gap: 9px;
        border: 1px solid rgba(212,175,55,.24);
        border-radius: 999px;
        background: rgba(212,175,55,.055);
        color: var(--gold-2);
        font-size: .68rem;
        font-weight: 900;
        letter-spacing: 1.25px;
        text-transform: uppercase;
      }

      .hub-refresh-badge::before {
        content: "";
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: var(--gold);
        box-shadow: 0 0 15px rgba(212,175,55,.8);
      }

      .hub-refresh-title {
        max-width: 1050px;
        margin: 25px auto 0;
        font-family: "Playfair Display", serif;
        font-size: clamp(3.4rem, 8.6vw, 8.8rem);
        font-weight: 900;
        line-height: .82;
        letter-spacing: -.065em;
        text-transform: uppercase;
      }

      .hub-refresh-title .gold-text {
        display: block;
      }

      .hub-refresh-intro {
        max-width: 780px;
        margin: 29px auto 0;
        color: var(--soft);
        font-size: clamp(1rem, 1.45vw, 1.18rem);
        line-height: 1.8;
      }

      .hub-refresh-proof {
        margin: 27px auto 0;
        display: flex;
        justify-content: center;
        gap: 9px;
        flex-wrap: wrap;
      }

      .hub-refresh-proof span {
        padding: 9px 12px;
        border: 1px solid rgba(255,255,255,.075);
        border-radius: 999px;
        background: rgba(255,255,255,.025);
        color: rgba(248,243,231,.76);
        font-size: .64rem;
        font-weight: 800;
        letter-spacing: .75px;
        text-transform: uppercase;
      }

      .hub-refresh-divider {
        width: min(760px, 100%);
        height: 1px;
        margin: 38px auto 0;
        background: linear-gradient(90deg, transparent, rgba(212,175,55,.34), transparent);
      }

      .hub-refresh-included {
        max-width: 1000px;
        margin: 31px auto 0;
        display: grid;
        grid-template-columns: repeat(5, minmax(0, 1fr));
        gap: 10px;
      }

      .hub-refresh-item {
        min-height: 112px;
        padding: 17px 13px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        border: 1px solid rgba(255,255,255,.065);
        border-radius: 18px;
        background: rgba(255,255,255,.02);
      }

      .hub-refresh-item strong {
        color: var(--white);
        font-size: .72rem;
        font-weight: 900;
        letter-spacing: .8px;
        text-transform: uppercase;
      }

      .hub-refresh-item span {
        margin-top: 7px;
        color: var(--muted);
        font-size: .7rem;
        line-height: 1.45;
      }

      .hub-refresh-actions {
        margin-top: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
        flex-wrap: wrap;
      }

      .hub-refresh-actions .btn {
        min-width: 190px;
      }

      .hub-refresh-price {
        margin-top: 18px;
        color: rgba(248,243,231,.58);
        font-size: .76rem;
        line-height: 1.6;
      }

      .hub-refresh-price strong {
        color: var(--gold-2);
      }

      @media (max-width: 900px) {
        .hub-refresh-included {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .hub-refresh-item:last-child {
          grid-column: 1 / -1;
        }
      }

      /* Mobile typography polish across the main JT website */
      @media (max-width: 760px) {
        .section-title {
          max-width: 100% !important;
          font-size: clamp(2.7rem, 12.4vw, 4.55rem) !important;
          line-height: .91 !important;
          letter-spacing: -.045em !important;
          overflow-wrap: normal;
          word-break: normal;
        }

        .section-title .small-word {
          font-size: .76em !important;
        }

        .mega-title {
          max-width: 100% !important;
          font-size: clamp(3rem, 13.3vw, 5.2rem) !important;
          line-height: .88 !important;
          letter-spacing: -.05em !important;
        }

        .path-card h3 {
          max-width: 100%;
          font-size: clamp(2.25rem, 11vw, 3.65rem) !important;
          line-height: .91 !important;
          letter-spacing: -.045em !important;
          overflow-wrap: normal;
        }

        .service-row h3 {
          max-width: 100%;
          font-size: clamp(2.25rem, 11.2vw, 3.8rem) !important;
          line-height: .91 !important;
          letter-spacing: -.045em !important;
        }

        .booking-card h3,
        .contact-card h3,
        .map-card h3,
        .media-tile h3,
        .product-card h3 {
          max-width: 100%;
          overflow-wrap: normal;
          word-break: normal;
        }

        .hub-refresh-title {
          max-width: 100%;
          padding-inline: 4px;
          font-size: clamp(3rem, 13vw, 5.05rem) !important;
          line-height: .87 !important;
          letter-spacing: -.05em !important;
        }

        .hub-refresh-intro {
          max-width: 34rem;
          padding-inline: 2px;
          font-size: 1rem;
          line-height: 1.72;
        }
      }

      @media (max-width: 430px) {
        .section-title {
          font-size: clamp(2.55rem, 11.8vw, 3.35rem) !important;
        }

        .mega-title {
          font-size: clamp(2.8rem, 12.6vw, 4.25rem) !important;
        }

        .path-card h3,
        .service-row h3 {
          font-size: clamp(2.15rem, 10.6vw, 3.15rem) !important;
        }

        .hub-refresh-title {
          font-size: clamp(2.9rem, 12.2vw, 4.15rem) !important;
        }
      }

      @media (max-width: 760px) {
        .nav-actions .nav-hub-cta {
          display: inline-flex;
          height: 42px;
          padding: 0 14px;
          font-size: .62rem;
        }

        .hub-refresh {
          padding: 82px 16px;
        }

        .hub-refresh-title {
          font-size: clamp(3.2rem, 17vw, 5.8rem);
        }

        .hub-refresh-included {
          grid-template-columns: 1fr;
        }

        .hub-refresh-item:last-child {
          grid-column: auto;
        }

        .hub-refresh-actions,
        .hub-refresh-actions .btn {
          width: 100%;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function refreshNavigation() {
    const navActions = document.querySelector(".nav-actions");
    if (navActions && !document.querySelector(".nav-hub-cta")) {
      const currentCta = navActions.querySelector(".nav-cta");
      if (currentCta) currentCta.remove();

      const hubButton = document.createElement("a");
      hubButton.className = "nav-hub-cta";
      hubButton.href = HUB_LOGIN;
      hubButton.textContent = "Enter Hub";
      hubButton.setAttribute("aria-label", "Enter JT Performance Hub");
      navActions.insertBefore(hubButton, navActions.firstChild);
    }

    const mobileInner = document.querySelector(".mobile-menu-inner");
    if (mobileInner && !mobileInner.querySelector(".mobile-hub-link")) {
      const mobileHub = document.createElement("a");
      mobileHub.className = "mobile-hub-link";
      mobileHub.href = HUB_LOGIN;
      mobileHub.textContent = "Enter Hub";
      mobileInner.insertBefore(mobileHub, mobileInner.firstChild);
    }
  }

  function refreshHubSection() {
    const oldSection = document.getElementById("performance-hub");
    if (!oldSection || oldSection.dataset.refreshed === "true") return;

    oldSection.dataset.refreshed = "true";
    oldSection.className = "hub-refresh";

    oldSection.innerHTML = `
      <div class="hub-refresh-inner">
        <div class="hub-refresh-eyebrow">JT Performance Hub</div>

        <div class="hub-refresh-badge">Free Account Available • Premium Trial Available</div>

        <h2 class="hub-refresh-title">
          Everything Your Game Needs.
          <span class="gold-text">One Place.</span>
        </h2>

        <p class="hub-refresh-intro">
          Start with a free player account to build habits, keep your profile and stay
          connected to JT coach feedback. Upgrade the same account whenever you want the
          complete personalised football-performance environment.
        </p>

        <div class="hub-refresh-proof" aria-label="Performance Hub highlights">
          <span>Join Free — No Card</span>
          <span>Coach Session Feedback</span>
          <span>Performance Challenges</span>
          <span>Upgrade Without Starting Over</span>
        </div>

        <div class="hub-refresh-divider"></div>

        <div class="hub-refresh-included" aria-label="Premium features">
          <div class="hub-refresh-item">
            <strong>Training</strong>
            <span>Position-specific plans and at-home development.</span>
          </div>

          <div class="hub-refresh-item">
            <strong>AI Performance Coach</strong>
            <span>Football, preparation, nutrition and mindset support.</span>
          </div>

          <div class="hub-refresh-item">
            <strong>Matchday & Readiness</strong>
            <span>Prepare, check in and reflect on performance.</span>
          </div>

          <div class="hub-refresh-item">
            <strong>Nutrition & Recovery</strong>
            <span>Simple guidance to fuel, reset and perform.</span>
          </div>

          <div class="hub-refresh-item">
            <strong>Mindset & Progress</strong>
            <span>Build confidence, track progress, earn points and rewards.</span>
          </div>
        </div>

        <div class="hub-refresh-actions">
          <a
            class="btn btn-primary"
            href="${HUB_FREE}"
            aria-label="Create your free JT Performance Hub player account"
          >
            Join Performance Hub Free
          </a>

          <a
            class="btn btn-outline"
            href="${HUB_TRIAL}"
            aria-label="Start your 30-day JT Performance Hub Premium trial"
          >
            Start Premium Free Trial
          </a>

          <a
            class="btn btn-outline"
            href="${HUB_LOGIN}"
          >
            Player Login
          </a>
        </div>

        <p class="hub-refresh-price">
          <strong>Free player account: £0.</strong> Premium includes a 30-day free trial,
          then £12.99/month. Cancel anytime. Use the same account when you upgrade.
        </p>
      </div>
    `;
  }

  function initialise() {
    addStyles();
    refreshNavigation();
    refreshHubSection();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialise, { once: true });
  } else {
    initialise();
  }
})();
