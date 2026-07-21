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

async function retrieveMembership({
  userId,
  supabaseUrl,
  supabaseSecretKey,
}) {
  const url = new URL(
    `${supabaseUrl}/rest/v1/memberships`
  );

  url.searchParams.set(
    "select",
    "stripe_customer_id,subscription_status"
  );

  url.searchParams.set(
    "user_id",
    `eq.${userId}`
  );

  url.searchParams.set("limit", "1");

  const response = await fetch(url, {
    method: "GET",
    headers: {
      apikey: supabaseSecretKey,
      Accept: "application/json",
    },
  });

  const responseText =
    await response.text();

  if (!response.ok) {
    console.error(
      "Supabase membership lookup failed:",
      response.status,
      responseText
    );

    throw new Error(
      "Could not retrieve the membership."
    );
  }

  const rows = responseText
    ? JSON.parse(responseText)
    : [];

  return rows[0] || null;
}

async function createStripePortalSession({
  stripeCustomerId,
  stripeSecretKey,
}) {
  const formData =
    new URLSearchParams();

  formData.set(
    "customer",
    stripeCustomerId
  );

  formData.set(
    "return_url",
    "https://jt-website-orpin.vercel.app/performance-hub-dashboard.html"
  );

  const authorization =
    Buffer.from(
      `${stripeSecretKey}:`
    ).toString("base64");

  const response = await fetch(
    "https://api.stripe.com/v1/billing_portal/sessions",
    {
      method: "POST",
      headers: {
        Authorization:
          `Basic ${authorization}`,
        "Content-Type":
          "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    }
  );

  const body = await response.json();

  if (!response.ok || !body?.url) {
    console.error(
      "Stripe portal session failed:",
      response.status,
      body?.error?.message ||
        "Unknown Stripe error"
    );

    throw new Error(
      body?.error?.message ||
        "Could not create the billing portal session."
    );
  }

  return body;
}

export default {
  async fetch(request) {
    if (request.method !== "POST") {
      return jsonResponse(
        {
          created: false,
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
        request.headers.get(
          "authorization"
        ) || "";

      const accessToken =
        authorization.startsWith("Bearer ")
          ? authorization.slice(7).trim()
          : "";

      if (!accessToken) {
        return jsonResponse(
          {
            created: false,
            error:
              "You must be signed in to manage your membership.",
          },
          401
        );
      }

      const stripeSecretKey =
        process.env.STRIPE_SECRET_KEY;

      const supabaseUrl = (
        process.env.SUPABASE_URL || ""
      ).replace(/\/+$/, "");

      const supabaseSecretKey =
        process.env.SUPABASE_SECRET_KEY;

      const supabasePublishableKey =
        process.env.SUPABASE_PUBLISHABLE_KEY;

      if (
        !stripeSecretKey ||
        !supabaseUrl ||
        !supabaseSecretKey ||
        !supabasePublishableKey
      ) {
        console.error(
          "A required portal environment variable is missing."
        );

        return jsonResponse(
          {
            created: false,
            error:
              "The billing portal is not configured.",
          },
          500
        );
      }

      const user =
        await retrieveSupabaseUser({
          accessToken,
          supabaseUrl,
          supabasePublishableKey,
        });

      if (!user) {
        return jsonResponse(
          {
            created: false,
            error:
              "Your login session is invalid or has expired.",
          },
          401
        );
      }

      const membership =
        await retrieveMembership({
          userId: user.id,
          supabaseUrl,
          supabaseSecretKey,
        });

      const stripeCustomerId =
        membership?.stripe_customer_id;

      if (!stripeCustomerId) {
        return jsonResponse(
          {
            created: false,
            error:
              "No Stripe billing account is connected to this membership.",
          },
          404
        );
      }

      const portalSession =
        await createStripePortalSession({
          stripeCustomerId,
          stripeSecretKey,
        });

      return jsonResponse({
        created: true,
        url: portalSession.url,
      });
    } catch (error) {
      console.error(
        "Customer portal error:",
        error
      );

      return jsonResponse(
        {
          created: false,
          error:
            error?.message ||
            "Something went wrong while opening the billing portal.",
        },
        500
      );
    }
  },
};
