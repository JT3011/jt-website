import {processSignupEvent} from '../server/signup-alerts.mjs';
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

function parseStripeSignature(header) {
  const timestampValues = [];
  const signatures = [];

  for (const part of header.split(",")) {
    const separatorIndex = part.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = part
      .slice(0, separatorIndex)
      .trim();

    const value = part
      .slice(separatorIndex + 1)
      .trim();

    if (key === "t") {
      timestampValues.push(value);
    }

    if (key === "v1") {
      signatures.push(value);
    }
  }

  return {
    timestamp: timestampValues[0] || "",
    signatures,
  };
}

function bytesToHex(bytes) {
  return Array.from(bytes)
    .map((byte) =>
      byte.toString(16).padStart(2, "0")
    )
    .join("");
}

function secureHexEqual(first, second) {
  if (
    typeof first !== "string" ||
    typeof second !== "string" ||
    first.length !== second.length
  ) {
    return false;
  }

  let difference = 0;

  for (let index = 0; index < first.length; index += 1) {
    difference |=
      first.charCodeAt(index) ^
      second.charCodeAt(index);
  }

  return difference === 0;
}

async function verifyStripeSignature({
  bodyBytes,
  signatureHeader,
  webhookSecret,
}) {
  const {
    timestamp,
    signatures,
  } = parseStripeSignature(signatureHeader);

  if (!timestamp || signatures.length === 0) {
    return false;
  }

  const timestampNumber = Number(timestamp);

  if (!Number.isFinite(timestampNumber)) {
    return false;
  }

  const ageInSeconds = Math.abs(
    Math.floor(Date.now() / 1000) -
      timestampNumber
  );

  if (ageInSeconds > 300) {
    return false;
  }

  const encoder = new TextEncoder();

  const prefixBytes =
    encoder.encode(`${timestamp}.`);

  const signedPayload = new Uint8Array(
    prefixBytes.length + bodyBytes.length
  );

  signedPayload.set(prefixBytes, 0);

  signedPayload.set(
    bodyBytes,
    prefixBytes.length
  );

  const cryptoKey =
    await crypto.subtle.importKey(
      "raw",
      encoder.encode(webhookSecret),
      {
        name: "HMAC",
        hash: "SHA-256",
      },
      false,
      ["sign"]
    );

  const signatureBuffer =
    await crypto.subtle.sign(
      "HMAC",
      cryptoKey,
      signedPayload
    );

  const expectedSignature =
    bytesToHex(
      new Uint8Array(signatureBuffer)
    );

  return signatures.some((signature) =>
    secureHexEqual(
      signature,
      expectedSignature
    )
  );
}

async function updateMembershipFromSubscription({
  subscription,
  supabaseUrl,
  supabaseSecretKey,
  fetchImpl = fetch,
}) {
  const subscriptionId =
    subscription?.id;

  if (!subscriptionId) {
    throw new Error(
      "The Stripe subscription ID is missing."
    );
  }

  const subscriptionStatus =
    subscription?.status || "canceled";

  const stripeCustomerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id || null;

  const stripePriceId =
    subscription.items?.data?.[0]?.price?.id ||
    null;

  const url = new URL(
    `${supabaseUrl}/rest/v1/memberships`
  );

  url.searchParams.set(
    "stripe_subscription_id",
    `eq.${subscriptionId}`
  );

  const update = {
    subscription_status:
      subscriptionStatus,
    updated_at:
      new Date().toISOString(),
  };

  if (stripeCustomerId) {
    update.stripe_customer_id =
      stripeCustomerId;
  }

  if (stripePriceId) {
    update.stripe_price_id =
      stripePriceId;
  }

  const response = await fetchImpl(url, {
    method: "PATCH",
    headers: {
      apikey: supabaseSecretKey,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(update),
  });

  if (!response.ok) {
    const responseText =
      await response.text();

    console.error(
      "Supabase webhook update failed:",
      response.status,
      responseText
    );

    throw new Error(
      "Could not update the membership."
    );
  }

  console.log(
    "Membership status updated:",
    subscriptionId,
    subscriptionStatus
  );
}

export function createWebhook({env=process.env,fetchImpl=fetch,signupProcessor=processSignupEvent}={}) { return {
  async fetch(request) {
    if (request.method !== "POST") {
      return jsonResponse(
        {
          received: false,
          error: "Method not allowed.",
        },
        405,
        {
          Allow: "POST",
        }
      );
    }

    try {
      const webhookSecret =
        env.STRIPE_WEBHOOK_SECRET;

      const supabaseUrl = (
        env.SUPABASE_URL || ""
      ).replace(/\/+$/, "");

      const supabaseSecretKey =
        env.SUPABASE_SECRET_KEY;

      if (
        !webhookSecret ||
        !supabaseUrl ||
        !supabaseSecretKey
      ) {
        console.error(
          "A required webhook environment variable is missing."
        );

        return jsonResponse(
          {
            received: false,
            error:
              "The webhook service is not configured.",
          },
          500
        );
      }

      const signatureHeader =
        request.headers.get(
          "stripe-signature"
        ) || "";

      if (!signatureHeader) {
        return jsonResponse(
          {
            received: false,
            error:
              "The Stripe signature is missing.",
          },
          400
        );
      }

      const bodyBytes =
        new Uint8Array(
          await request.arrayBuffer()
        );

      const signatureIsValid =
        await verifyStripeSignature({
          bodyBytes,
          signatureHeader,
          webhookSecret,
        });

      if (!signatureIsValid) {
        console.error(
          "Stripe webhook signature verification failed."
        );

        return jsonResponse(
          {
            received: false,
            error:
              "The Stripe signature is invalid.",
          },
          400
        );
      }

      const rawBody =
        new TextDecoder().decode(bodyBytes);

      const event =
        JSON.parse(rawBody);

      if (event.livemode !== true) return jsonResponse({received:true});
      if (["checkout.session.completed", "checkout.session.async_payment_succeeded"].includes(event.type)) {
        await signupProcessor(event, {env,fetchImpl});
        return jsonResponse({received:true});
      }

      const supportedEvents = [
        "customer.subscription.created",
        "customer.subscription.updated",
        "customer.subscription.deleted",
      ];

      if (supportedEvents.includes(event.type)) {
        await updateMembershipFromSubscription({
          subscription:
            event.data?.object,
          supabaseUrl,
          supabaseSecretKey,
          fetchImpl,
        });
      } else {
        console.log(
          "Stripe event ignored:",
          event.type
        );
      }

      return jsonResponse({
        received: true,
      });
    } catch (error) {
      console.error(
        "Stripe webhook error:",
        error
      );

      return jsonResponse(
        {
          received: false,
          error:
            "Something went wrong while processing the webhook.",
        },
        500
      );
    }
  },
}; }
export default createWebhook();
