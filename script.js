// ===============================
// CONFIG
// ===============================
const API_URL = "https://roomno4-production.up.railway.app/api";

console.log("SCRIPT VERSION: SEE YOU");

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

  // ===============================
  // NEW: MOBILE MENU ELEMENTS
  // ===============================
  const mobileMenuBtn = document.querySelector(".mobile-menu-btn");
  const mobileMenuOverlay = document.getElementById("mobileMenuOverlay");

  // ===============================
  // NEW: FORM ERROR ELEMENT
  // ===============================
  const formError = document.querySelector(".form-error"); // NEW

  function showError(msg) {          // NEW
    if (!formError) return;
    formError.textContent = msg;
    formError.style.display = "block";
  }

  function clearError() {            // NEW
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
  // INPUT HARD BLOCKS (UX)
  // ===============================

  // 👤 IMIĘ – tylko litery i spacje
  nameInput.addEventListener("input", () => {
    nameInput.value = nameInput.value.replace(/[^A-Za-zÀ-ž\s]/g, "");
  });

  // 📞 TELEFON – tylko cyfry, + i spacje
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
    clearError();                     // NEW
    reserveForm.style.display = "flex";
    signupResult.style.display = "none";
    reserveOverlay.style.display = "flex";
  });

  // ===============================
  // LOAD LIMIT (NIE KRYTYCZNE)
  // ===============================
  fetch(`${API_URL}/status`)
    .then(r => r.json())
    .then(d => {
      if (limitNumberEl) {
        limitNumberEl.textContent = d.limit;
      }
    })
    .catch(() => console.warn("Backend offline (status)"));

  // ===============================
  // FORM SUBMIT
  // ===============================
  reserveForm.addEventListener("submit", async e => {
    e.preventDefault();
    clearError();                     // NEW

    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const phone = phoneInput.value.trim();

    if (!/^[A-Za-zÀ-ž\s]{2,30}$/.test(name)) {
      showError(
        currentLang === "pl"
          ? "Imię musi mieć 2–30 liter i nie może zawierać cyfr"
          : "Name must be 2–30 letters and contain no digits"
      );
      return;
    }

    if (email.length < 5 || email.length > 60) {
      showError(
        currentLang === "pl"
          ? "Email musi mieć 5–60 znaków"
          : "Email must be 5–60 characters long"
      );
      return;
    }

    if (!/^[0-9+ ]{9,15}$/.test(phone)) {
      showError(
        currentLang === "pl"
          ? "Numer telefonu musi mieć 9–15 cyfr i nie może zawierać liter"
          : "Phone number must be 9–15 digits and contain no letters"
      );
      return;
    }

    try {
      const res = await fetch(`${API_URL}/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone })
      });

      if (!res.ok) {
        showError(
          currentLang === "pl"
            ? "Wystąpił błąd. Spróbuj ponownie."
            : "Something went wrong. Please try again."
        );
        return;
      }

      const data = await res.json();

      reserveForm.style.display = "none";
      signupResult.style.display = "block";

      userNumberEl.textContent = `#${data.number}`;

      if (limitNumberEl) {
        limitNumberEl.textContent = data.limit;
      }

      reserveForm.reset();            // NEW – czyści formularz

    } catch (err) {
      console.error("REAL ERROR:", err);
      showError(
        currentLang === "pl"
          ? "Serwer niedostępny. Spróbuj później."
          : "Server unavailable. Try again later."
      );
    }
  });

  updateLanguage();
});
