// ===============================
// CONFIG
// ===============================
const API_URL = "https://api.roomno4.com/api";
let isSubmitting = false;

// ===============================
// DOM READY
// ===============================
document.addEventListener("DOMContentLoaded", () => {

  // ===============================
  // ELEMENTY
  // ===============================
  const reserveBtn = document.querySelector(".reserve-btn");
  const reserveOverlay = document.getElementById("reserveOverlay");
  const reserveForm = document.querySelector(".reserve-form");
  const formError = document.querySelector(".form-error");

  const overlays = document.querySelectorAll(".overlay");
  const mobileMenuOverlay = document.getElementById("mobileMenuOverlay");
  const mobileMenuBtn = document.querySelector(".mobile-menu-btn");

  const nameInput = document.querySelector('input[name="name"]');
  const phoneInput = document.querySelector('input[name="phone"]');

  const langToggle = document.getElementById("langToggle");
  const langTexts = document.querySelectorAll(".lang-text");

  // ===============================
  // LANGUAGE
  // ===============================
  let currentLang = "en";

  function updateLanguage() {
    document.querySelectorAll("[data-pl][data-en]").forEach(el => {
      if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
        el.placeholder = el.dataset[currentLang];
      } else {
        el.textContent = el.dataset[currentLang];
      }
    });
  }

  if (langToggle) {
    langToggle.addEventListener("click", () => {
      currentLang = currentLang === "en" ? "pl" : "en";

      langToggle.classList.toggle("en");
      langToggle.classList.toggle("pl");

      langTexts.forEach(t => t.classList.remove("active"));
      document.querySelector(`.lang-text.${currentLang}`)?.classList.add("active");

      updateLanguage();
    });
  }

  updateLanguage();

  // ===============================
  // OVERLAYS – OPEN / CLOSE
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
  // BUY TICKET → FORM
  // ===============================
  if (reserveBtn && reserveOverlay) {
    reserveBtn.addEventListener("click", () => {
      closeAllOverlays();
      reserveOverlay.style.display = "flex";
    });
  }

  // ===============================
  // INPUT FILTERS (LIVE)
  // ===============================
  if (nameInput) {
    nameInput.addEventListener("input", () => {
      nameInput.value = nameInput.value.replace(/[^A-Za-zÀ-ž\s]/g, "");
    });
  }

  if (phoneInput) {
    phoneInput.addEventListener("input", () => {
      phoneInput.value = phoneInput.value.replace(/[^0-9+ ]/g, "");
    });
  }

  // ===============================
  // FORM SUBMIT → STRIPE
  // ===============================
  if (reserveForm) {
    reserveForm.addEventListener("submit", async e => {
      e.preventDefault();
      if (isSubmitting) return;

      if (formError) {
        formError.style.display = "none";
        formError.textContent = "";
      }

      const name = reserveForm.name.value.trim();
      const email = reserveForm.email.value.trim();
      const phone = reserveForm.phone.value.trim();

      // walidacja
      if (!/^[A-Za-zÀ-ž\s]{2,30}$/.test(name)) {
        showError(
          currentLang === "pl"
            ? "Imię musi mieć 2–30 liter"
            : "Name must be 2–30 letters"
        );
        return;
      }

      if (email.length < 5 || email.length > 60) {
        showError(
          currentLang === "pl"
            ? "Niepoprawny email"
            : "Invalid email"
        );
        return;
      }

      if (!/^[0-9+ ]{9,15}$/.test(phone)) {
        showError(
          currentLang === "pl"
            ? "Niepoprawny numer telefonu"
            : "Invalid phone number"
        );
        return;
      }

      isSubmitting = true;

      try {
        const res = await fetch(`${API_URL}/create-checkout`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, phone })
        });

        const data = await res.json();

        if (!res.ok || !data.url) throw new Error();

        window.location.href = data.url;

      } catch (err) {
        console.error(err);
        showError(
          currentLang === "pl"
            ? "Błąd płatności. Spróbuj ponownie."
            : "Payment error. Try again."
        );
        isSubmitting = false;
      }
    });
  }

  function showError(msg) {
    if (!formError) return;
    formError.textContent = msg;
    formError.style.display = "block";
  }

});
