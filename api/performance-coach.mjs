const MAX_MESSAGE_LENGTH = 1600;
const MAX_HISTORY_MESSAGES = 8;

function sendJson(
  response,
  status,
  payload
) {
  response.setHeader(
    "Content-Type",
    "application/json"
  );

  response.setHeader(
    "Cache-Control",
    "no-store"
  );

  return response
    .status(status)
    .json(payload);
}

function normaliseText(value) {
  return String(value || "")
    .trim();
}

function parseRequestBody(request) {
  if (
    request.body &&
    typeof request.body === "object"
  ) {
    return request.body;
  }

  if (
    typeof request.body === "string"
  ) {
    return JSON.parse(request.body);
  }

  return {};
}

function prepareHistory(history) {
  if (!Array.isArray(history)) {
    return [];
  }

  return history
    .filter((item) => {
      return (
        item &&
        ["user", "assistant"].includes(
          item.role
        ) &&
        typeof item.content === "string"
      );
    })
    .slice(-MAX_HISTORY_MESSAGES)
    .map((item) => ({
      role: item.role,
      content: normaliseText(
        item.content
      ).slice(0, MAX_MESSAGE_LENGTH)
    }))
    .filter((item) => item.content);
}

function extractOutputText(payload) {
  if (!Array.isArray(payload?.output)) {
    return "";
  }

  return payload.output
    .flatMap((item) => {
      if (
        item?.type !== "message" ||
        !Array.isArray(item.content)
      ) {
        return [];
      }

      return item.content;
    })
    .filter(
      (content) =>
        content?.type === "output_text"
    )
    .map(
      (content) =>
        normaliseText(content.text)
    )
    .filter(Boolean)
    .join("\n\n")
    .trim();
}

async function getAuthenticatedUser({
  supabaseUrl,
  supabaseKey,
  accessToken
}) {
  const response = await fetch(
    `${supabaseUrl}/auth/v1/user`,
    {
      method: "GET",
      headers: {
        apikey: supabaseKey,
        Authorization:
          `Bearer ${accessToken}`
      }
    }
  );

  if (!response.ok) {
    return null;
  }

  return response.json();
}

async function getSupabaseRow({
  supabaseUrl,
  supabaseKey,
  accessToken,
  table,
  column,
  value,
  select
}) {
  const url = new URL(
    `${supabaseUrl}/rest/v1/${table}`
  );

  url.searchParams.set(
    "select",
    select
  );

  url.searchParams.set(
    column,
    `eq.${value}`
  );

  url.searchParams.set(
    "limit",
    "1"
  );

  const response = await fetch(
    url,
    {
      method: "GET",
      headers: {
        apikey: supabaseKey,
        Authorization:
          `Bearer ${accessToken}`,
        Accept: "application/json"
      }
    }
  );

  if (!response.ok) {
    const errorBody =
      await response.text();

    console.error(
      `Supabase ${table} lookup failed:`,
      response.status,
      errorBody
    );

    throw new Error(
      `Unable to load ${table}.`
    );
  }

  const rows = await response.json();

  return Array.isArray(rows)
    ? rows[0] || null
    : null;
}

async function consumeDailyAllowance({
  supabaseUrl,
  supabaseKey,
  accessToken
}) {
  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/consume_coach_message`,
    {
      method: "POST",
      headers: {
        apikey: supabaseKey,
        Authorization:
          `Bearer ${accessToken}`,
        "Content-Type":
          "application/json",
        Accept:
          "application/json"
      },
      body: JSON.stringify({
        daily_limit: 20
      })
    }
  );

  if (!response.ok) {
    const errorBody =
      await response.text();

    console.error(
      "Coach usage check failed:",
      response.status,
      errorBody
    );

    throw new Error(
      "The daily message allowance could not be checked."
    );
  }

  const payload =
    await response.json();

  return Array.isArray(payload)
    ? payload[0] || null
    : payload;
}
async function moderateMessage({
  apiKey,
  message
}) {
  const response = await fetch(
    "https://api.openai.com/v1/moderations",
    {
      method: "POST",
      headers: {
        Authorization:
          `Bearer ${apiKey}`,
        "Content-Type":
          "application/json"
      },
      body: JSON.stringify({
        model:
          "omni-moderation-latest",
        input: message
      })
    }
  );

  if (!response.ok) {
    const errorBody =
      await response.text();

    console.error(
      "OpenAI moderation failed:",
      response.status,
      errorBody
    );

    throw new Error(
      "The safety check could not be completed."
    );
  }

  const payload =
    await response.json();

  return (
    payload?.results?.[0]
      ?.categories || {}
  );
}

function buildCoachInstructions(
  profile
) {
  const playerContext = {
    playerName:
      profile.player_name ||
      "JT Player",

    ageGroup:
      profile.age_group ||
      "not provided",

    primaryPosition:
      profile.primary_position ||
      "not provided",

    secondaryPosition:
      profile.secondary_position ||
      "not provided",

    playingLevel:
      profile.playing_level ||
      "not provided",

    developmentGoal:
      profile.development_goal ||
      "not provided"
  };

  return `
You are the JT AI Performance Coach inside the JT Performance Hub.

Your purpose is to provide supportive, practical and age-appropriate football-development guidance.

PLAYER PROFILE:
${JSON.stringify(
  playerContext,
  null,
  2
)}

CORE COACHING AREAS:
- Football technique and position-specific development.
- Safe training structure and match preparation.
- General strength, speed, mobility and recovery education.
- General sports-nutrition education.
- Confidence, concentration, reflection and performance mindset.
- Helping the player turn a broad goal into clear, achievable actions.

COMMUNICATION STYLE:
- Use clear British English.
- Be encouraging, calm, honest and practical.
- Address the player by name naturally, but not in every response.
- Keep most answers concise and easy to follow.
- Prefer short paragraphs or a small number of clear steps.
- Give a useful answer immediately.
- Ask no more than one clarifying question when essential.
- Do not use tables.
- Never claim to be a human coach or claim to have personally watched the player.

PERSONALISATION:
- Use the player profile when it genuinely improves the answer.
- Do not invent information that is not included in the profile.
- Adapt explanations for the listed age group and playing level.
- Do not tell the player that the profile data came from a database.

YOUNG-PLAYER SAFETY:
- The player may be under 18.
- Keep every response appropriate for young people.
- Encourage support from a parent, guardian, coach or trusted adult where appropriate.
- Never encourage secrecy from a parent, guardian or trusted adult.

PHYSICAL-SAFETY RULES:
- Do not prescribe dangerous, extreme or unsupervised training.
- Do not provide maximum-lifting programmes, extreme conditioning or punishment workouts.
- Put movement quality, gradual progression, suitable space and adult or qualified supervision first.
- For pain, injury, dizziness, breathing difficulty, concussion symptoms or persistent physical concerns, advise stopping the activity and speaking to a parent, guardian and appropriately qualified healthcare professional.
- Do not diagnose injuries or provide rehabilitation prescriptions.

NUTRITION RULES:
- Give only general, balanced sports-nutrition education.
- Do not prescribe calorie targets, rapid weight change, restrictive diets, fasting, supplements or weight-loss plans.
- Do not describe foods as morally good or bad.
- For allergies, medical conditions, eating concerns or specialist needs, direct the player to a parent or guardian and an appropriately qualified healthcare professional.

MENTAL-HEALTH RULES:
- Performance-mindset coaching is allowed, but do not diagnose or treat mental-health conditions.
- Do not dismiss anxiety, distress, bullying, abuse or safety concerns as simply a mindset problem.
- Encourage the player to speak with a parent, guardian, trusted adult or qualified professional when needed.
- For immediate danger or possible self-harm, prioritise immediate real-world support and emergency services.

BOUNDARIES:
- Do not provide medical, legal or financial advice.
- Do not assist with violence, abuse, illegal activity, cheating or harmful conduct.
- Politely redirect unrelated questions back towards football development, health, recovery, nutrition or mindset.

End with one clear next action when that would help the player move forward.
`.trim();
}

export default async function handler(
  request,
  response
) {
  if (request.method !== "POST") {
    response.setHeader(
      "Allow",
      "POST"
    );

    return sendJson(
      response,
      405,
      {
        answered: false,
        error:
          "Method not allowed."
      }
    );
  }

  const OPENAI_API_KEY =
    process.env.OPENAI_API_KEY;

  const SUPABASE_URL =
    normaliseText(
      process.env.SUPABASE_URL
    ).replace(/\/+$/, "");

  const SUPABASE_PUBLISHABLE_KEY =
    process.env
      .SUPABASE_PUBLISHABLE_KEY;

  if (
    !OPENAI_API_KEY ||
    !SUPABASE_URL ||
    !SUPABASE_PUBLISHABLE_KEY
  ) {
    console.error(
      "Performance Coach environment variables are missing."
    );

    return sendJson(
      response,
      500,
      {
        answered: false,
        error:
          "The JT Performance Coach is not configured yet."
      }
    );
  }

  try {
    const authorization =
      normaliseText(
        request.headers.authorization
      );

    const accessToken =
      authorization
        .replace(
          /^Bearer\s+/i,
          ""
        )
        .trim();

    if (!accessToken) {
      return sendJson(
        response,
        401,
        {
          answered: false,
          error:
            "You must be signed in to use the JT Performance Coach."
        }
      );
    }

    const body =
      parseRequestBody(request);

    const message =
      normaliseText(body.message);

    const history =
      prepareHistory(body.history);

    if (!message) {
      return sendJson(
        response,
        400,
        {
          answered: false,
          error:
            "Enter a question for the JT Performance Coach."
        }
      );
    }

    if (
      message.length >
      MAX_MESSAGE_LENGTH
    ) {
      return sendJson(
        response,
        400,
        {
          answered: false,
          error:
            "Please shorten your question before sending it."
        }
      );
    }

    const user =
      await getAuthenticatedUser({
        supabaseUrl:
          SUPABASE_URL,

        supabaseKey:
          SUPABASE_PUBLISHABLE_KEY,

        accessToken
      });

    if (!user?.id) {
      return sendJson(
        response,
        401,
        {
          answered: false,
          error:
            "Your session has expired. Please sign in again."
        }
      );
    }

    const membership =
      await getSupabaseRow({
        supabaseUrl:
          SUPABASE_URL,

        supabaseKey:
          SUPABASE_PUBLISHABLE_KEY,

        accessToken,

        table:
          "memberships",

        column:
          "user_id",

        value:
          user.id,

        select:
          "subscription_status"
      });

    if (
      !membership ||
      !["trialing", "active"].includes(
        membership.subscription_status
      )
    ) {
      return sendJson(
        response,
        403,
        {
          answered: false,
          error:
            "An active JT Performance Hub membership is required."
        }
      );
    }

    const profile =
      await getSupabaseRow({
        supabaseUrl:
          SUPABASE_URL,

        supabaseKey:
          SUPABASE_PUBLISHABLE_KEY,

        accessToken,

        table:
          "profiles",

        column:
          "id",

        value:
          user.id,

        select: [
          "player_name",
          "age_group",
          "primary_position",
          "secondary_position",
          "playing_level",
          "development_goal",
          "onboarding_complete"
        ].join(",")
      });

    if (
      !profile ||
      !profile.onboarding_complete
    ) {
      return sendJson(
        response,
        409,
        {
          answered: false,
          error:
            "Complete your player profile before using the JT Performance Coach."
        }
      );
    }

    const categories =
      await moderateMessage({
        apiKey:
          OPENAI_API_KEY,
        message
      });

    if (
      categories[
        "self-harm/intent"
      ] ||
      categories[
        "self-harm/instructions"
      ]
    ) {
      return sendJson(
        response,
        200,
        {
          answered: true,
          urgent: true,
          answer:
            "I’m glad you said something. This needs immediate real-world support rather than football coaching. Tell a parent, guardian, coach or another trusted adult now and stay with someone. If you may act on these thoughts or you are in immediate danger, call emergency services now. Your next step is to tell the nearest trusted adult exactly what is happening."
        }
      );
    }

    if (
      categories[
        "sexual/minors"
      ]
    ) {
      return sendJson(
        response,
        400,
        {
          answered: false,
          error:
            "The JT Performance Coach cannot help with that request. Please speak with a parent, guardian or trusted adult."
        }
      );
    }

    const input = [
      ...history,
      {
        role: "user",
        content: message
      }
    ];

    const openAIResponse =
      await fetch(
        "https://api.openai.com/v1/responses",
        {
          method: "POST",
          headers: {
            Authorization:
              `Bearer ${OPENAI_API_KEY}`,

            "Content-Type":
              "application/json"
          },
          body: JSON.stringify({
            model:
              "gpt-5-mini",

            store: false,

            reasoning: {
              effort: "low"
            },

            max_output_tokens:
              900,

            safety_identifier:
              user.id,

            instructions:
              buildCoachInstructions(
                profile
              ),

            input
          })
        }
      );

    const openAIPayload =
      await openAIResponse.json();

    if (!openAIResponse.ok) {
      console.error(
        "OpenAI Responses API error:",
        openAIResponse.status,
        openAIPayload
      );

      return sendJson(
        response,
        502,
        {
          answered: false,
          error:
            "The JT Performance Coach could not respond just now. Please try again."
        }
      );
    }

    const answer =
      extractOutputText(
        openAIPayload
      );

    if (!answer) {
      console.error(
        "OpenAI returned no readable answer:",
        openAIPayload
      );

      return sendJson(
        response,
        502,
        {
          answered: false,
          error:
            "The JT Performance Coach did not return an answer. Please try again."
        }
      );
    }

    return sendJson(
      response,
      200,
      {
        answered: true,
        answer
      }
    );
  } catch (error) {
    console.error(
      "Performance Coach error:",
      error
    );

    return sendJson(
      response,
      500,
      {
        answered: false,
        error:
          "Something went wrong while contacting the JT Performance Coach."
      }
    );
  }
}
