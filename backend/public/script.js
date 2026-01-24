const API_URL = "https://api.roomno4.com/api";

console.log("SCRIPT VERSION: STRIPE CHECKOUT – FIXED");

let isSubmitting = false;

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

  const mobileMenuBtn = document.querySelector(".mobile-menu-btn");
  const mobileMenuOverlay = document.getElementById("mobileMenuOverlay");

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

  // ============================
  // DODANE: RESET FORMULARZA
  // ============================
  function resetForm() {
    reserveForm.reset();
    clearError();
    submitBtn.disabled = false;
    isSubmitting = false;
  }
  // ============================

  let currentLang = "en";

  function updateLanguage() {
    document.querySelectorAll("[data-pl]").forEach(el => {
      if (el.tagName === "INPUT") {
        el.placeholder = el.dataset[currentLang];
      } else if (el.dataset[currentLang]) {
        el.textContent = el.dataset[currentLang];
      }
    });
  }

  function updateLegalLanguage() {
    document.querySelectorAll("[data-pl][data-en]").forEach(el => {
      el.style.display = "none";
    });

    document.querySelectorAll(`[data-${currentLang}]`).forEach(el => {
      if (!el.hasAttribute("data-pl") || !el.hasAttribute("data-en")) return;
      el.style.display = "block";
    });
  }

  langToggle.addEventListener("click", () => {
    currentLang = currentLang === "en" ? "pl" : "en";

    langToggle.classList.toggle("en");
    langToggle.classList.toggle("pl");

    document.querySelectorAll(".lang-text")
      .forEach(el => el.classList.remove("active"));

    const activeLangEl = document.querySelector(`.lang-text.${currentLang}`);
    if (activeLangEl) activeLangEl.classList.add("active");

    updateLanguage();
    updateLegalLanguage();
  });

  nameInput.addEventListener("input", () => {
    nameInput.value = nameInput.value.replace(/[^A-Za-zÀ-ž\s]/g, "");
  });

  phoneInput.addEventListener("input", () => {
    phoneInput.value = phoneInput.value.replace(/[^0-9+ ]/g, "");
  });

  function closeAllOverlays() {
    overlays.forEach(o => (o.style.display = "none"));
  }

  document.querySelectorAll("[data-overlay]").forEach(link => {
    link.addEventListener("click", e => {
      e.preventDefault();

      const overlayId = `overlay-${link.dataset.overlay}`;
      const overlay = document.getElementById(overlayId);
      if (!overlay) return;

      closeAllOverlays();
      overlay.style.display = "flex";

      updateLegalLanguage();

      if (mobileMenuOverlay) {
        mobileMenuOverlay.style.display = "none";
      }
    });
  });

  document.querySelectorAll(".close").forEach(btn => {
    btn.addEventListener("click", e => {
      e.preventDefault();
      closeAllOverlays();
      if (mobileMenuOverlay) {
        mobileMenuOverlay.style.display = "none";
      }
    });
  });

  if (mobileMenuBtn && mobileMenuOverlay) {
    mobileMenuBtn.addEventListener("click", () => {
      closeAllOverlays();
      mobileMenuOverlay.style.display = "flex";
    });
  }

  reserveBtn.addEventListener("click", () => {
    closeAllOverlays();
    resetForm(); // 🔥 TU CZYŚCIMY FORMULARZ
    reserveForm.style.display = "flex";
    signupResult.style.display = "none";
    reserveOverlay.style.display = "flex";
  });

  fetch(`${API_URL}/status`)
    .then(r => r.json())
    .then(d => {
      if (limitNumberEl) {
        limitNumberEl.textContent = d.limit;
      }
    })
    .catch(() => {});

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

      const res = await fetch(`${API_URL}/create-checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone })
      });

      const data = await res.json();

      if (!res.ok || !data.url) {
        showError(currentLang === "pl"
          ? "Błąd płatności. Spróbuj ponownie."
          : "Payment error. Try again.");
        return;
      }

      window.location.href = data.url;

    } catch (err) {
      showError(currentLang === "pl"
        ? "Błąd serwera. Spróbuj później."
        : "Server error. Try again later.");
    } finally {
      isSubmitting = false;
      submitBtn.disabled = false;
    }
  });

  // 🔥 RESET PRZY ODSWIEŻENIU STRONY
  resetForm();
  updateLanguage();
  updateLegalLanguage();
});
