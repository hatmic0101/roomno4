// ===============================
// CONFIG
// ===============================
const API_URL = "https://api.roomno4.com/api";

console.log("SCRIPT VERSION: STRIPE CHECKOUT");
let isSubmitting = false;

// ===============================
// WAIT FOR DOM
// ===============================
document.addEventListener("DOMContentLoaded", () => {

  const langToggle = document.getElementById("langToggle");
  const reserveBtn = document.querySelector(".reserve-btn");
  const reserveOverlay = document.getElementById("reserveOverlay");
  const reserveForm = document.querySelector(".reserve-form");
  const signupResult = document.querySelector(".signup-result");
  const userNumberEl = document.getElementById("userNumber");
  const limitNumberEl = document.getElementById("limitNumber");
  const overlays = document.querySelectorAll(".overlay");

  const nameInput = reserveForm.querySelector('input[type="text"]');
  const emailInput = reserveForm.querySelector('input[type="email"]');
  const phoneInput = reserveForm.querySelector('input[type="tel"]');
  const submitBtn = reserveForm.querySelector('button[type="submit"]');

  // ===============================
  // MOBILE MENU ELEMENTS
  // ===============================
  const mobileMenuBtn = document.querySelector(".mobile-menu-btn");
  const mobileMenuOverlay = document.getElementById("mobileMenuOverlay");

  // ===============================
  // FORM ERROR
  // ===============================
  const formError = document.querySelector(".form-error");

  function showError(msg) {
    if (!formError) return;
    formError.textContent = msg;
    formError.style.display = "block";
  }

  function clearError() {
    if (!formError) return;
    formError.style.display = "none";
    formError.textContent = "";
  }

  // ===============================
  // LANGUAGE
  // ===============================
  let currentLang = "en";

  function updateLanguage() {
    document.querySelectorAll("[data-pl]").forEach(el => {
      if (el.tagName === "INPUT") {
        el.placeholder = el.dataset[currentLang];
      } else {
        el.textContent = el.dataset[currentLang];
      }
    });
  }

  langToggle.addEventListener("click", () => {
    currentLang = currentLang === "en" ? "pl" : "en";
    langToggle.classList.toggle("en");
    langToggle.classList.toggle("pl");

    document.querySelectorAll(".lang-text")
      .forEach(el => el.classList.remove("active"));

    document.querySelector(`.lang-text.${currentLang}`)
      .classList.add("active");

    updateLanguage();
  });

  // ===============================
  // INPUT HARD BLOCKS
  // ===============================
  nameInput.addEventListener("input", () => {
    nameInput.value = nameInput.value.replace(/[^A-Za-zÀ-ž\s]/g, "");
  });

  phoneInput.addEventListener("input", () => {
    phoneInput.value = phoneInput.value.replace(/[^0-9+ ]/g, "");
  });

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

      if (mobileMenuOverlay) {
        mobileMenuOverlay.style.display = "none";
      }
    });
  });

  document.querySelectorAll(".close").forEach(btn => {
    btn.addEventListener("click", e => {
      e.preventDefault();
      e.stopPropagation();
      closeAllOverlays();

      if (mobileMenuOverlay) {
        mobileMenuOverlay.style.display = "none";
      }
    });
  });

  overlays.forEach(overlay => {
    overlay.addEventListener("click", e => {
      if (e.target === overlay && overlay.id !== "reserveOverlay") {
        closeAllOverlays();

        if (mobileMenuOverlay) {
          mobileMenuOverlay.style.display = "none";
        }
      }
    });
  });

  // ===============================
  // OPEN MOBILE MENU
  // ===============================
  if (mobileMenuBtn && mobileMenuOverlay) {
    mobileMenuBtn.addEventListener("click", () => {
      closeAllOverlays();
      mobileMenuOverlay.style.display = "flex";
    });
  }

  // ===============================
  // OPEN SIGN UP
  // ===============================
  reserveBtn.addEventListener("click", () => {
    closeAllOverlays();
    clearError();
    reserveForm.style.display = "flex";
    signupResult.style.display = "none";
    reserveOverlay.style.display = "flex";
  });

  // ===============================
  // LOAD LIMIT
  // ===============================
  fetch(`${API_URL}/status`)
    .then(r => r.json())
    .then(d => {
      if (limitNumberEl) {
        limitNumberEl.textContent = d.limit;
      }
    })
    .catch(() => console.warn("Backend offline"));

  // ===============================
  // FORM SUBMIT  🔴 STRIPE CHANGE
  // ===============================
  reserveForm.addEventListener("submit", async e => {
    e.preventDefault();
    clearError();

    if (isSubmitting) return;
    isSubmitting = true;
    submitBtn.disabled = true;

    try {
      const name = nameInput.value.trim();
      const email = emailInput.value.trim();
      const phone = phoneInput.value.trim();

      if (!/^[A-Za-zÀ-ž\s]{2,30}$/.test(name)) {
        showError(currentLang === "pl"
          ? "Imię musi mieć 2–30 liter"
          : "Name must be 2–30 letters");
        return;
      }

      if (email.length < 5 || email.length > 60) {
        showError(currentLang === "pl"
          ? "Email musi mieć 5–60 znaków"
          : "Email must be 5–60 characters");
        return;
      }

      if (!/^[0-9+ ]{9,15}$/.test(phone)) {
        showError(currentLang === "pl"
          ? "Numer telefonu niepoprawny"
          : "Invalid phone number");
        return;
      }

      // 🔴 STRIPE ENDPOINT
      const res = await fetch(`${API_URL}/create-checkout-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone })
      });

      if (!res.ok) {
        showError("Payment error. Try again.");
        return;
      }

      const { url } = await res.json();

      // 🔴 REDIRECT TO STRIPE
      window.location.href = url;

    } catch (err) {
      console.error(err);
      showError("Server error");
    } finally {
      isSubmitting = false;
      submitBtn.disabled = false;
    }
  });

  updateLanguage();
});
