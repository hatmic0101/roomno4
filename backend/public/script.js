// ===============================
// CONFIG
// ===============================
const API_URL = "https://api.roomno4.com/api";

let isRedirecting = false;

// ===============================
// DOM READY
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  console.log("ROOM NO.4 script loaded");

  // ===============================
  // ELEMENTS (SAFE)
  // ===============================
  const langToggle = document.getElementById("langToggle");
  const reserveBtn = document.querySelector(".reserve-btn");
  const mobileMenuBtn = document.querySelector(".mobile-menu-btn");
  const mobileMenuOverlay = document.getElementById("mobileMenuOverlay");
  const overlays = document.querySelectorAll(".overlay");

  // ===============================
  // LANGUAGE SWITCH
  // ===============================
  let currentLang = "en";

  function updateLanguage() {
    document.querySelectorAll("[data-pl][data-en]").forEach(el => {
      if (el.tagName === "INPUT") {
        el.placeholder = el.dataset[currentLang];
      } else {
        el.textContent = el.dataset[currentLang];
      }
    });

    document.querySelectorAll("[data-pl], [data-en]").forEach(el => {
      if (el.dataset.pl && el.dataset.en) return;
      if (el.hasAttribute(`data-${currentLang}`)) {
        el.style.display = "";
      } else {
        el.style.display = "none";
      }
    });
  }

  if (langToggle) {
    langToggle.addEventListener("click", () => {
      currentLang = currentLang === "en" ? "pl" : "en";
      langToggle.classList.toggle("en");
      langToggle.classList.toggle("pl");

      document.querySelectorAll(".lang-text")
        .forEach(el => el.classList.remove("active"));

      const active = document.querySelector(`.lang-text.${currentLang}`);
      if (active) active.classList.add("active");

      updateLanguage();
    });
  }

  // ===============================
  // OVERLAYS
  // ===============================
  function closeAllOverlays() {
    overlays.forEach(o => (o.style.display = "none"));
  }

  document.querySelectorAll("[data-overlay]").forEach(link => {
    link.addEventListener("click", e => {
      e.preventDefault();
      const overlay = document.getElementById(`overlay-${link.dataset.overlay}`);
      if (!overlay) return;

      closeAllOverlays();
      overlay.style.display = "flex";
      if (mobileMenuOverlay) mobileMenuOverlay.style.display = "none";
    });
  });

  document.querySelectorAll(".close").forEach(btn => {
    btn.addEventListener("click", () => {
      closeAllOverlays();
      if (mobileMenuOverlay) mobileMenuOverlay.style.display = "none";
    });
  });

  overlays.forEach(overlay => {
    overlay.addEventListener("click", e => {
      if (e.target === overlay) {
        closeAllOverlays();
        if (mobileMenuOverlay) mobileMenuOverlay.style.display = "none";
      }
    });
  });

  // ===============================
  // MOBILE MENU
  // ===============================
  if (mobileMenuBtn && mobileMenuOverlay) {
    mobileMenuBtn.addEventListener("click", () => {
      closeAllOverlays();
      mobileMenuOverlay.style.display = "flex";
    });
  }

  // ===============================
  // STRIPE CHECKOUT
  // ===============================
  if (reserveBtn) {
    reserveBtn.addEventListener("click", async () => {
      if (isRedirecting) return;
      isRedirecting = true;

      reserveBtn.disabled = true;
      reserveBtn.textContent =
        currentLang === "pl" ? "PRZEKIEROWANIE..." : "REDIRECTING...";

      try {
        const res = await fetch(`${API_URL}/create-checkout`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "guest@roomno4.com"
          })
        });

        const data = await res.json();

        if (!res.ok || !data.url) {
          throw new Error("Stripe error");
        }

        window.location.href = data.url;

      } catch (err) {
        console.error(err);
        alert(
          currentLang === "pl"
            ? "Błąd płatności. Spróbuj ponownie."
            : "Payment error. Please try again."
        );
        reserveBtn.disabled = false;
        reserveBtn.textContent =
          currentLang === "pl" ? "KUP BILET" : "BUY TICKET";
        isRedirecting = false;
      }
    });
  }

  updateLanguage();
});
