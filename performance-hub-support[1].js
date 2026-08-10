const SUPPORT_EMAIL = "james@jtmindbodybalance.com";

function supportMailto(subject) {
  const params = new URLSearchParams({
    subject,
    body:
      `Hi James,\n\nI need some help with the JT Performance Hub.\n\nPage: ${window.location.href}\n\nWhat happened:\n`
  });

  return `mailto:${SUPPORT_EMAIL}?${params.toString()}`;
}

function injectSupportStyles() {
  if (document.getElementById("jtSupportStyles")) return;

  const style = document.createElement("style");
  style.id = "jtSupportStyles";
  style.textContent = `
    .jt-support-card {
      width: 100%;
      border: 1px solid rgba(212,175,55,.14);
      border-radius: 20px;
      background:
        linear-gradient(110deg, rgba(212,175,55,.035), rgba(255,255,255,.008)),
        #090909;
      color: #f8f4e9;
      font-family: "Montserrat", sans-serif;
    }

    .jt-support-inner {
      padding: 17px 19px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 18px;
    }

    .jt-support-kicker {
      color: #d4af37;
      font-size: .57rem;
      font-weight: 900;
      letter-spacing: 1.25px;
      text-transform: uppercase;
    }

    .jt-support-title {
      margin: 5px 0 0;
      color: #f8f4e9;
      font-family: "Playfair Display", serif;
      font-size: clamp(1.2rem, 2vw, 1.6rem);
      line-height: 1.05;
    }

    .jt-support-copy {
      margin: 7px 0 0;
      max-width: 720px;
      color: #aaa69b;
      font-size: .69rem;
      line-height: 1.55;
    }

    .jt-support-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 0 0 auto;
    }

    .jt-support-link,
    .jt-support-toggle {
      min-height: 39px;
      padding: 0 14px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 999px;
      font: inherit;
      font-size: .58rem;
      font-weight: 900;
      letter-spacing: .7px;
      text-transform: uppercase;
      text-decoration: none;
      cursor: pointer;
    }

    .jt-support-link {
      border: 1px solid rgba(212,175,55,.32);
      background: rgba(212,175,55,.08);
      color: #f3dc8d;
    }

    .jt-support-toggle {
      border: 1px solid rgba(255,255,255,.08);
      background: rgba(255,255,255,.02);
      color: #c8c2b5;
    }

    .jt-support-details {
      display: none;
      padding: 0 19px 18px;
    }

    .jt-support-card.open .jt-support-details {
      display: block;
    }

    .jt-support-steps {
      padding-top: 15px;
      display: grid;
      gap: 8px;
      border-top: 1px solid rgba(255,255,255,.06);
    }

    .jt-support-step {
      padding: 10px 12px;
      border: 1px solid rgba(255,255,255,.06);
      border-radius: 12px;
      background: rgba(255,255,255,.012);
      color: #aaa69b;
      font-size: .66rem;
      line-height: 1.5;
    }

    .jt-support-step strong {
      color: #f3dc8d;
    }

    .jt-support-email {
      color: #f3dc8d;
      text-decoration: none;
      overflow-wrap: anywhere;
    }

    .jt-support-signup {
      margin-top: 14px;
    }

    .jt-support-dashboard {
      margin-top: 12px;
    }

    @media (max-width: 760px) {
      .jt-support-inner {
        align-items: flex-start;
        flex-direction: column;
      }

      .jt-support-actions {
        width: 100%;
      }

      .jt-support-actions a,
      .jt-support-actions button {
        flex: 1;
      }
    }

    @media (max-width: 520px) {
      .jt-support-actions {
        flex-direction: column;
      }

      .jt-support-actions a,
      .jt-support-actions button {
        width: 100%;
      }
    }
  `;

  document.head.appendChild(style);
}

function buildSupportCard({
  id,
  className,
  kicker,
  title,
  copy,
  subject,
  showSignupTips = false
}) {
  const section = document.createElement("section");
  section.id = id;
  section.className = `jt-support-card ${className}`;

  section.innerHTML = `
    <div class="jt-support-inner">
      <div>
        <div class="jt-support-kicker">${kicker}</div>
        <h3 class="jt-support-title">${title}</h3>
        <p class="jt-support-copy">${copy}</p>
      </div>

      <div class="jt-support-actions">
        ${
          showSignupTips
            ? `
              <button
                class="jt-support-toggle"
                type="button"
                aria-expanded="false"
              >
                Quick fixes
              </button>
            `
            : ""
        }

        <a
          class="jt-support-link"
          href="${supportMailto(subject)}"
        >
          Email James
        </a>
      </div>
    </div>

    ${
      showSignupTips
        ? `
          <div class="jt-support-details">
            <div class="jt-support-steps">
              <div class="jt-support-step">
                <strong>Checkout email:</strong>
                use the same email address you used when starting your JT Performance Hub trial.
              </div>

              <div class="jt-support-step">
                <strong>Confirmation email:</strong>
                if it has not arrived, check Spam, Junk or Promotions before trying again.
              </div>

              <div class="jt-support-step">
                <strong>Still stuck?</strong>
                Email
                <a
                  class="jt-support-email"
                  href="${supportMailto("JT Performance Hub signup help")}"
                >${SUPPORT_EMAIL}</a>
                and include a screenshot if possible.
              </div>
            </div>
          </div>
        `
        : ""
    }
  `;

  if (showSignupTips) {
    const toggle = section.querySelector(".jt-support-toggle");

    toggle.addEventListener("click", () => {
      const open = section.classList.toggle("open");

      toggle.setAttribute(
        "aria-expanded",
        String(open)
      );

      toggle.textContent =
        open
          ? "Hide fixes"
          : "Quick fixes";
    });
  }

  return section;
}

function mountSignupHelp() {
  if (
    document.getElementById("jtSignupSupport") ||
    !document.getElementById("authContent")
  ) {
    return;
  }

  const authShell =
    document.querySelector(".auth-shell");

  const authCard =
    authShell?.querySelector(".auth-card");

  if (!authShell || !authCard) return;

  const card = buildSupportCard({
    id: "jtSignupSupport",
    className: "jt-support-signup",
    kicker: "Need A Hand?",
    title: "Having Trouble Signing Up?",
    copy:
      "Most issues are simple to fix. Try the quick checks or email James directly and we’ll get you into the Hub.",
    subject: "JT Performance Hub signup help",
    showSignupTips: true
  });

  authCard.insertAdjacentElement(
    "afterend",
    card
  );

  const footerSupport =
    [...document.querySelectorAll("footer a")]
      .find(
        (link) =>
          link.textContent.trim().toLowerCase() ===
          "support"
      );

  if (footerSupport) {
    footerSupport.href =
      supportMailto(
        "JT Performance Hub signup help"
      );
  }
}

function mountDashboardHelp() {
  if (
    document.getElementById("jtDashboardSupport") ||
    !document.getElementById("dashboardState")
  ) {
    return;
  }

  const accountSection =
    document.querySelector(".account-section");

  if (!accountSection) return;

  const card = buildSupportCard({
    id: "jtDashboardSupport",
    className: "jt-support-dashboard",
    kicker: "Member Support",
    title: "Need Help With The Hub?",
    copy:
      `If something is not working or you are unsure what to do next, email James at ${SUPPORT_EMAIL}.`,
    subject: "JT Performance Hub member support"
  });

  accountSection.insertAdjacentElement(
    "afterend",
    card
  );
}

function mountSupport() {
  injectSupportStyles();

  mountSignupHelp();
  mountDashboardHelp();

  const observer =
    new MutationObserver(() => {
      mountSignupHelp();
      mountDashboardHelp();
    });

  observer.observe(
    document.body,
    {
      childList: true,
      subtree: true
    }
  );

  setTimeout(
    () => observer.disconnect(),
    8000
  );
}

mountSupport();
