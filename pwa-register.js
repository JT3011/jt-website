(() => {
  "use strict";

  if (!("serviceWorker" in navigator)) return;
  if (location.protocol !== "https:" && location.hostname !== "localhost") return;

  const markStandalone = () => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;
    document.documentElement.dataset.pwaDisplay = standalone ? "standalone" : "browser";
  };

  markStandalone();

  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register(
        "/service-worker.js",
        { scope: "/", updateViaCache: "none" }
      );

      const announceUpdate = (worker) => {
        if (!worker) return;
        worker.addEventListener("statechange", () => {
          if (worker.state === "installed" && navigator.serviceWorker.controller) {
            window.dispatchEvent(
              new CustomEvent("jt-pwa-update-ready", { detail: { registration } })
            );
          }
        });
      };

      if (registration.installing) announceUpdate(registration.installing);
      registration.addEventListener("updatefound", () => {
        announceUpdate(registration.installing);
      });

      window.setTimeout(() => registration.update().catch(() => {}), 3000);
    } catch (error) {
      console.warn("JT Hub PWA registration skipped", error);
    }
  }, { once: true });
})();
