const JSON_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

function jsonResponse(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...JSON_HEADERS,
      ...extraHeaders,
    },
  });
}

function normaliseEmail(email) {
  return typeof email === "string"
    ? email.trim().toLowerCase()
    : "";
}

async function retrieveStripeSession(
  sessionId,
  stripeSecretKey
) {
  const stripeUrl = new URL(
    `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(
      sessionId
    )}`
  );

  stripeUrl.searchParams.append(
    "expand[]",
    "line_items"
  );

  stripeUrl.searchParams.append(
    "expand[]",
    "subscription"
  );

  const authorization = Buffer.from(
    `${stripeSecretKey}:`
  ).toString("base64");

  const response = await fetch(stripeUrl, {
    method: "GET",
    headers: {
      Authorization: `Basic ${authorization}`,
    },
  });

  const body = await response.json();

  if (!response.ok) {
    throw new Error(
      body?.error?.message ||
      "Stripe could not retrieve the Checkout Session."
    );
  }

  return body;
}

async function retrieveSupabaseUser({
  accessToken,
  supabaseUrl,
  supabasePublishableKey,
}) {
  const response = await fetch(
    `${supabaseUrl}/auth/v1/user`,
    {
      method: "GET",
      headers: {
        apikey: supabasePublishableKey,
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  const body = await response.json();

  if (!response.ok || !body?.id) {
    console.error(
      "Supabase user lookup failed:",
      response.status,
      body
    );

    return null;
  }

  return body;
}

async function findMembershipByCheckoutSession({
  sessionId,
  supabaseUrl,
  supabaseSecretKey,
}) {
  const url = new URL(
    `${supabaseUrl}/rest/v1/memberships`
  );

  url.searchParams.set(
    "select",
    "user_id,stripe_checkout_session_id"
  );

  url.searchParams.set(
    "stripe_checkout_session_id",
    `eq.${sessionId}`
  );

  url.searchParams.set("limit", "1");

  const response = await fetch(url, {
    headers: {
      apikey: supabaseSecretKey,
      Accept: "application/json",
    },
  });

 const responseText = await response.text();

if (!response.ok) {
  console.error(
    "Supabase membership lookup failed:",
    response.status,
    responseText
  );

  throw new Error(
    "Could not check the existing membership."
  );
}

const rows = responseText
  ? JSON.parse(responseText)
  : [];

return rows[0] || null;

async function saveMembership({
  membership,
  supabaseUrl,
  supabaseSecretKey,
}) {
  const url = new URL(
    `${supabaseUrl}/rest/v1/memberships`
  );

  url.searchParams.set(
    "on_conflict",
    "user_id"
  );

  const response = await fetch(url, {
    method: "POST",
    headers: {
      apikey: supabaseSecretKey,
      "Content-Type": "application/json",
      Prefer:
        "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify(membership),
  });

  const responseText = await response.text();

  if (!response.ok) {
    console.error(
      "Supabase membership save failed:",
      response.status,
      responseText
    );

    throw new Error(
      "Could not save the membership."
    );
  }

  return responseText
    ? JSON.parse(responseText)
    : [];
}

export default {
  async fetch(request) {
    if (request.method !== "POST") {
      return jsonResponse(
        {
          claimed: false,
          error: "Method not allowed.",
        },
        405,
        {
          Allow: "POST",
        }
      );
    }

    try {
      const authorization =
        request.headers.get("authorization") || "";

      const accessToken =
        authorization.startsWith("Bearer ")
          ? authorization.slice(7).trim()
          : "";

      if (!accessToken) {
        return jsonResponse(
          {
            claimed: false,
            error:
              "You must be logged in to claim this membership.",
          },
          401
        );
      }

      let requestBody;

      try {
        requestBody = await request.json();
      } catch {
        return jsonResponse(
          {
            claimed: false,
            error: "A valid JSON request is required.",
          },
          400
        );
      }

      const sessionId =
        typeof requestBody?.session_id === "string"
          ? requestBody.session_id.trim()
          : "";

      if (
        !sessionId ||
        !sessionId.startsWith("cs_")
      ) {
        return jsonResponse(
          {
            claimed: false,
            error:
              "A valid Stripe Checkout Session ID is required.",
          },
          400
        );
      }

      const stripeSecretKey =
        process.env.STRIPE_SECRET_KEY;
      
      const supabasePublishableKey =
        process.env.SUPABASE_PUBLISHABLE_KEY;
      
      const expectedPriceId =
        process.env.STRIPE_PRICE_ID;

      const supabaseUrl = (
        process.env.SUPABASE_URL || ""
      ).replace(/\/+$/, "");

      const supabaseSecretKey =
        process.env.SUPABASE_SECRET_KEY;

     if (
  !stripeSecretKey ||
  !expectedPriceId ||
  !supabaseUrl ||
  !supabaseSecretKey ||
  !supabasePublishableKey
) {
        console.error(
          "A required server environment variable is missing."
        );

        return jsonResponse(
          {
            claimed: false,
            error:
              "The membership service is not configured.",
          },
          500
        );
      }

      /*
       * Validate the member's Supabase access token.
       */
      const user = await retrieveSupabaseUser({
        accessToken,
        supabaseUrl,
        supabasePublishableKey,
      });

      if (!user) {
        return jsonResponse(
          {
            claimed: false,
            error:
              "Your login session is invalid or has expired.",
          },
          401
        );
      }

      if (!user.email_confirmed_at) {
        return jsonResponse(
          {
            claimed: false,
            error:
              "Please confirm your email before entering the Performance Hub.",
          },
          403
        );
      }

      /*
       * Verify the Stripe subscription again server-side.
       */
      const stripeSession =
        await retrieveStripeSession(
          sessionId,
          stripeSecretKey
        );

      const correctPrice =
        stripeSession.line_items?.data?.some(
          (item) =>
            item.price?.id === expectedPriceId
        ) === true;

      const subscription =
        typeof stripeSession.subscription === "object"
          ? stripeSession.subscription
          : null;

      const subscriptionStatus =
        subscription?.status || null;

      const validSubscriptionStatus = [
        "trialing",
        "active",
      ].includes(subscriptionStatus);

      const verifiedCheckout =
        stripeSession.status === "complete" &&
        stripeSession.mode === "subscription" &&
        correctPrice &&
        validSubscriptionStatus;

      if (!verifiedCheckout) {
        return jsonResponse(
          {
            claimed: false,
            error:
              "This registration does not contain an eligible JT Performance Hub subscription.",
          },
          403
        );
      }

      /*
       * The Supabase account email must match
       * the Stripe checkout email.
       */
      const stripeEmail = normaliseEmail(
        stripeSession.customer_details?.email ||
        stripeSession.customer_email
      );

      const userEmail = normaliseEmail(user.email);

      if (
        !stripeEmail ||
        !userEmail ||
        stripeEmail !== userEmail
      ) {
        return jsonResponse(
          {
            claimed: false,
            error:
              "Your account email must match the email used during Stripe checkout.",
          },
          403
        );
      }

      const stripeCustomerId =
        typeof stripeSession.customer === "string"
          ? stripeSession.customer
          : stripeSession.customer?.id;

      const stripeSubscriptionId =
        typeof stripeSession.subscription === "string"
          ? stripeSession.subscription
          : stripeSession.subscription?.id;

      if (
        !stripeCustomerId ||
        !stripeSubscriptionId
      ) {
        return jsonResponse(
          {
            claimed: false,
            error:
              "Stripe did not return the required subscription details.",
          },
          500
        );
      }

      /*
       * Prevent one checkout session from being
       * claimed by more than one Supabase user.
       */
      const existingMembership =
        await findMembershipByCheckoutSession({
          sessionId,
          supabaseUrl,
          supabaseSecretKey,
        });

      if (
        existingMembership &&
        existingMembership.user_id !== user.id
      ) {
        return jsonResponse(
          {
            claimed: false,
            error:
              "This registration has already been connected to another account.",
          },
          409
        );
      }

      if (
        existingMembership?.user_id === user.id
      ) {
        return jsonResponse({
          claimed: true,
          alreadyClaimed: true,
          subscriptionStatus,
        });
      }

      const now = new Date().toISOString();

      await saveMembership({
        supabaseUrl,
        supabaseSecretKey,
        membership: {
          user_id: user.id,
          stripe_checkout_session_id:
            sessionId,
          stripe_customer_id:
            stripeCustomerId,
          stripe_subscription_id:
            stripeSubscriptionId,
          stripe_price_id:
            expectedPriceId,
          subscription_status:
            subscriptionStatus,
          updated_at: now,
        },
      });

      return jsonResponse({
        claimed: true,
        alreadyClaimed: false,
        subscriptionStatus,
      });
    } catch (error) {
      console.error(
        "Membership claim error:",
        error
      );

      return jsonResponse(
        {
          claimed: false,
          error:
            "Something went wrong while connecting the membership.",
        },
        500
      );
    }
  },
};
