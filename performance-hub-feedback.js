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

function injectFeedbackStyles() {
  if (document.getElementById("jtFeedbackStyles")) return;

  const style = document.createElement("style");
  style.id = "jtFeedbackStyles";
  style.textContent = `
    .jt-feedback-strip {
      margin-top: 4px;
      border: 1px solid rgba(212,175,55,.14);
      border-radius: 22px;
      background:
        linear-gradient(110deg, rgba(212,175,55,.035), rgba(255,255,255,.008)),
        #090909;
      overflow: hidden;
    }

    .jt-feedback-summary {
      min-height: 82px;
      padding: 17px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 18px;
    }

    .jt-feedback-copy {
      min-width: 0;
    }

    .jt-feedback-kicker {
      color: #d4af37;
      font-size: .57rem;
      font-weight: 900;
      letter-spacing: 1.25px;
      text-transform: uppercase;
    }

    .jt-feedback-copy h3 {
      margin: 5px 0 0;
      color: #f8f4e9;
      font-family: "Playfair Display", serif;
      font-size: clamp(1.35rem, 2.2vw, 1.8rem);
      line-height: 1;
    }

    .jt-feedback-copy p {
      margin: 7px 0 0;
      color: #aaa69b;
      font-size: .7rem;
      line-height: 1.5;
    }

    .jt-feedback-open,
    .jt-feedback-submit,
    .jt-feedback-cancel {
      min-height: 40px;
      padding: 0 15px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 999px;
      font: inherit;
      font-size: .6rem;
      font-weight: 900;
      letter-spacing: .75px;
      text-transform: uppercase;
      cursor: pointer;
    }

    .jt-feedback-open,
    .jt-feedback-submit {
      border: 1px solid rgba(212,175,55,.3);
      background: rgba(212,175,55,.08);
      color: #f3dc8d;
    }

    .jt-feedback-open:hover,
    .jt-feedback-submit:hover {
      border-color: rgba(212,175,55,.55);
      background: rgba(212,175,55,.12);
    }

    .jt-feedback-form-wrap {
      display: none;
      padding: 0 20px 20px;
    }

    .jt-feedback-strip.open .jt-feedback-form-wrap {
      display: block;
    }

    .jt-feedback-form {
      padding-top: 18px;
      display: grid;
      gap: 14px;
      border-top: 1px solid rgba(255,255,255,.06);
    }

    .jt-feedback-row {
      display: grid;
      grid-template-columns: minmax(180px,.38fr) minmax(0,1fr);
      gap: 14px;
    }

    .jt-feedback-field {
      display: grid;
      gap: 7px;
    }

    .jt-feedback-field label,
    .jt-feedback-rating-label {
      color: #d0cabd;
      font-size: .58rem;
      font-weight: 800;
      letter-spacing: .8px;
      text-transform: uppercase;
    }

    .jt-feedback-field select,
    .jt-feedback-field textarea {
      width: 100%;
      border: 1px solid rgba(255,255,255,.08);
      border-radius: 14px;
      outline: none;
      background: #0e0e0e;
      color: #f8f4e9;
      font: inherit;
    }

    .jt-feedback-field select {
      min-height: 45px;
      padding: 0 12px;
    }

    .jt-feedback-field textarea {
      min-height: 108px;
      padding: 12px 13px;
      resize: vertical;
      line-height: 1.55;
    }

    .jt-feedback-field select:focus,
    .jt-feedback-field textarea:focus {
      border-color: rgba(212,175,55,.48);
      box-shadow: 0 0 0 3px rgba(212,175,55,.06);
    }

    .jt-feedback-rating {
      display: flex;
      align-items: center;
      gap: 7px;
      flex-wrap: wrap;
    }

    .jt-feedback-rating button {
      width: 36px;
      height: 36px;
      border: 1px solid rgba(255,255,255,.08);
      border-radius: 50%;
      background: rgba(255,255,255,.02);
      color: #aaa69b;
      font: inherit;
      font-size: .65rem;
      font-weight: 900;
      cursor: pointer;
    }

    .jt-feedback-rating button.selected {
      border-color: rgba(212,175,55,.48);
      background: rgba(212,175,55,.12);
      color: #f3dc8d;
    }

    .jt-feedback-actions {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
    }

    .jt-feedback-buttons {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .jt-feedback-cancel {
      border: 1px solid rgba(255,255,255,.08);
      background: rgba(255,255,255,.02);
      color: #aaa69b;
    }

    .jt-feedback-status {
      min-height: 18px;
      color: #aaa69b;
      font-size: .65rem;
      line-height: 1.4;
    }

    .jt-feedback-status.success {
      color: #78d99a;
    }

    .jt-feedback-status.error {
      color: #ff9292;
    }

    .jt-feedback-submit:disabled,
    .jt-feedback-open:disabled {
      opacity: .45;
      cursor: not-allowed;
    }

    @media (max-width: 760px) {
      .jt-feedback-summary {
        align-items: flex-start;
        flex-direction: column;
      }

      .jt-feedback-open {
        width: 100%;
      }

      .jt-feedback-row {
        grid-template-columns: 1fr;
      }

      .jt-feedback-actions {
        align-items: stretch;
        flex-direction: column;
      }

      .jt-feedback-buttons,
      .jt-feedback-buttons button {
        width: 100%;
      }
    }
  `;

  document.head.appendChild(style);
}

function createFeedbackSection() {
  const accountSection = document.querySelector(".account-section");

  if (
    !accountSection ||
    document.getElementById("jtFeedbackStrip")
  ) {
    return null;
  }

  const section = document.createElement("section");
  section.className = "jt-feedback-strip";
  section.id = "jtFeedbackStrip";
  section.setAttribute(
    "aria-label",
    "Performance Hub feedback"
  );

  section.innerHTML = `
    <div class="jt-feedback-summary">
      <div class="jt-feedback-copy">
        <div class="jt-feedback-kicker">
          Help Shape The Hub
        </div>

        <h3>Got 30 seconds?</h3>

        <p>
          Tell us what is working, what is confusing
          or what would make the Hub better.
        </p>
      </div>

      <button
        class="jt-feedback-open"
        id="jtFeedbackOpen"
        type="button"
        aria-expanded="false"
      >
        Send Feedback
      </button>
    </div>

    <div
      class="jt-feedback-form-wrap"
      id="jtFeedbackFormWrap"
    >
      <form
        class="jt-feedback-form"
        id="jtFeedbackForm"
        novalidate
      >
        <div class="jt-feedback-row">
          <div class="jt-feedback-field">
            <label for="jtFeedbackCategory">
              Feedback type
            </label>

            <select id="jtFeedbackCategory">
              <option value="general">
                General feedback
              </option>

              <option value="bug">
                Something is not working
              </option>

              <option value="idea">
                Idea or suggestion
              </option>

              <option value="training">
                Training Centre
              </option>

              <option value="mindset">
                Mindset Centre
              </option>

              <option value="other">
                Other
              </option>
            </select>
          </div>

          <div class="jt-feedback-field">
            <div class="jt-feedback-rating-label">
              Overall experience · optional
            </div>

            <div
              class="jt-feedback-rating"
              id="jtFeedbackRating"
              aria-label="Rate your overall experience from 1 to 5"
            >
              <button type="button" data-rating="1" aria-label="1 out of 5">1</button>
              <button type="button" data-rating="2" aria-label="2 out of 5">2</button>
              <button type="button" data-rating="3" aria-label="3 out of 5">3</button>
              <button type="button" data-rating="4" aria-label="4 out of 5">4</button>
              <button type="button" data-rating="5" aria-label="5 out of 5">5</button>
            </div>
          </div>
        </div>

        <div class="jt-feedback-field">
          <label for="jtFeedbackMessage">
            Your feedback
          </label>

          <textarea
            id="jtFeedbackMessage"
            maxlength="2000"
            placeholder="A quick sentence is enough..."
            required
          ></textarea>
        </div>

        <div class="jt-feedback-actions">
          <div
            class="jt-feedback-status"
            id="jtFeedbackStatus"
            aria-live="polite"
          ></div>

          <div class="jt-feedback-buttons">
            <button
              class="jt-feedback-cancel"
              id="jtFeedbackCancel"
              type="button"
            >
              Close
            </button>

            <button
              class="jt-feedback-submit"
              id="jtFeedbackSubmit"
              type="submit"
            >
              Send Feedback
            </button>
          </div>
        </div>
      </form>
    </div>
  `;

  accountSection.insertAdjacentElement(
    "beforebegin",
    section
  );

  return section;
}

function initialiseFeedbackInteractions(section) {
  const openButton =
    section.querySelector("#jtFeedbackOpen");

  const cancelButton =
    section.querySelector("#jtFeedbackCancel");

  const form =
    section.querySelector("#jtFeedbackForm");

  const message =
    section.querySelector("#jtFeedbackMessage");

  const category =
    section.querySelector("#jtFeedbackCategory");

  const status =
    section.querySelector("#jtFeedbackStatus");

  const submitButton =
    section.querySelector("#jtFeedbackSubmit");

  const ratingButtons = [
    ...section.querySelectorAll("[data-rating]")
  ];

  let selectedRating = null;

  function setStatus(
    text = "",
    type = ""
  ) {
    status.textContent = text;
    status.className = "jt-feedback-status";

    if (type) {
      status.classList.add(type);
    }
  }

  function setOpen(open) {
    section.classList.toggle(
      "open",
      open
    );

    openButton.setAttribute(
      "aria-expanded",
      String(open)
    );

    openButton.textContent =
      open
        ? "Feedback Open"
        : "Send Feedback";

    if (open) {
      setTimeout(
        () => message.focus(),
        60
      );
    }
  }

  openButton.addEventListener(
    "click",
    () => {
      setOpen(
        !section.classList.contains("open")
      );
    }
  );

  cancelButton.addEventListener(
    "click",
    () => {
      setOpen(false);
      setStatus("");
    }
  );

  ratingButtons.forEach(
    (button) => {
      button.addEventListener(
        "click",
        () => {
          selectedRating =
            Number(button.dataset.rating);

          ratingButtons.forEach(
            (item) => {
              const selected =
                item === button;

              item.classList.toggle(
                "selected",
                selected
              );

              item.setAttribute(
                "aria-pressed",
                String(selected)
              );
            }
          );
        }
      );
    }
  );

  form.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();

      const feedbackText =
        message.value.trim();

      if (feedbackText.length < 5) {
        setStatus(
          "Please add a little more detail before sending.",
          "error"
        );

        message.focus();
        return;
      }

      submitButton.disabled = true;
      submitButton.textContent = "Sending...";

      setStatus(
        "Sending your feedback..."
      );

      try {
        const {
          data: userData,
          error: userError
        } =
          await supabase.auth.getUser();

        const user =
          userData?.user;

        if (
          userError ||
          !user
        ) {
          throw new Error(
            "Please sign in again before sending feedback."
          );
        }

        const {
          error: insertError
        } =
          await supabase
            .from("hub_feedback")
            .insert({
              user_id: user.id,
              category: category.value,
              rating: selectedRating,
              message: feedbackText,
              page_path:
                window.location.pathname
            });

        if (insertError) {
          throw insertError;
        }

        message.value = "";
        selectedRating = null;

        ratingButtons.forEach(
          (item) => {
            item.classList.remove(
              "selected"
            );

            item.setAttribute(
              "aria-pressed",
              "false"
            );
          }
        );

        setStatus(
          "✓ Thanks — your feedback has been sent to JT.",
          "success"
        );

        submitButton.textContent = "Sent";

        setTimeout(
          () => {
            setOpen(false);

            submitButton.textContent =
              "Send Feedback";

            submitButton.disabled =
              false;

            setStatus("");
          },
          1800
        );
      } catch (error) {
        console.error(
          "Feedback submission error:",
          error
        );

        setStatus(
          error?.message ||
          "Your feedback could not be sent. Please try again.",
          "error"
        );

        submitButton.disabled = false;
        submitButton.textContent =
          "Send Feedback";
      }
    }
  );
}

function mountFeedback() {
  if (
    !document.getElementById(
      "dashboardState"
    )
  ) {
    return;
  }

  injectFeedbackStyles();

  const attemptMount = () => {
    const section =
      createFeedbackSection();

    if (!section) {
      return false;
    }

    initialiseFeedbackInteractions(
      section
    );

    return true;
  };

  if (attemptMount()) {
    return;
  }

  const observer =
    new MutationObserver(
      () => {
        if (attemptMount()) {
          observer.disconnect();
        }
      }
    );

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

mountFeedback();
