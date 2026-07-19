export default {
  async fetch(request) {
    const headers = {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    };

    if (request.method !== "GET") {
      return new Response(
        JSON.stringify({
          verified: false,
          error: "Method not allowed",
        }),
        {
          status: 405,
          headers: {
            ...headers,
            Allow: "GET",
          },
        }
      );
    }

    try {
      const url = new URL(request.url);
      const sessionId = url.searchParams.get("session_id");

      if (!sessionId || !sessionId.startsWith("cs_")) {
        return new Response(
          JSON.stringify({
            verified: false,
            error: "A valid Checkout Session ID is required.",
          }),
          {
            status: 400,
            headers,
          }
        );
      }

      const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
      const expectedPriceId = process.env.STRIPE_PRICE_ID;

      if (!stripeSecretKey || !expectedPriceId) {
        console.error("Required Stripe environment variables are missing.");

        return new Response(
          JSON.stringify({
            verified: false,
            error: "The verification service is not configured.",
          }),
          {
            status: 500,
            headers,
          }
        );
      }

      const stripeUrl = new URL(
        `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(
          sessionId
        )}`
      );

      stripeUrl.searchParams.append("expand[]", "line_items");
      stripeUrl.searchParams.append("expand[]", "subscription");

      const authorization = Buffer.from(
        `${stripeSecretKey}:`
      ).toString("base64");

      const stripeResponse = await fetch(stripeUrl, {
        method: "GET",
        headers: {
          Authorization: `Basic ${authorization}`,
        },
      });

      const session = await stripeResponse.json();

      if (!stripeResponse.ok) {
        console.error(
          "Stripe verification failed:",
          session?.error?.message || "Unknown Stripe error"
        );

        return new Response(
          JSON.stringify({
            verified: false,
            error: "We could not verify this registration.",
          }),
          {
            status: 400,
            headers,
          }
        );
      }

      const correctPrice = session.line_items?.data?.some(
        (item) => item.price?.id === expectedPriceId
      );

      const subscriptionStatus =
        typeof session.subscription === "object"
          ? session.subscription?.status
          : null;

      const validSubscriptionStatus = [
        "trialing",
        "active",
      ].includes(subscriptionStatus);

      const verified =
        session.status === "complete" &&
        session.mode === "subscription" &&
        correctPrice === true &&
        validSubscriptionStatus;

      if (!verified) {
        return new Response(
          JSON.stringify({
            verified: false,
            error:
              "This checkout does not contain an eligible JT Performance Hub subscription.",
          }),
          {
            status: 403,
            headers,
          }
        );
      }

      return new Response(
        JSON.stringify({
          verified: true,
          email:
            session.customer_details?.email ||
            session.customer_email ||
            null,
          subscriptionStatus,
        }),
        {
          status: 200,
          headers,
        }
      );
    } catch (error) {
      console.error("Checkout verification error:", error);

      return new Response(
        JSON.stringify({
          verified: false,
          error:
            "Something went wrong while verifying the registration.",
        }),
        {
          status: 500,
          headers,
        }
      );
    }
  },
};
