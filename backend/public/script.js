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

  // ===============================
  // OVERLAYS – OPEN / CLOSE
  // ===============================
  function closeAllOverlays() {
    overlays.forEach(o => (o.style.display = "none"));
  }

  // otwieranie overlayów z data-overlay
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

  // zamykanie X
  document.querySelectorAll(".close").forEach(btn => {
    btn.addEventListener("click", () => {
      closeAllOverlays();
      if (mobileMenuOverlay) mobileMenuOverlay.style.display = "none";
    });
  });

  // klik poza box
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
  // IMIĘ – tylko litery
  if (nameInput) {
    nameInput.addEventListener("input", () => {
      nameInput.value = nameInput.value.replace(/[^A-Za-zÀ-ž\s]/g, "");
    });
  }

  // TELEFON – tylko cyfry, +, spacje
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

      // dodatkowa walidacja JS (twarda)
      if (!/^[A-Za-zÀ-ž\s]{2,30}$/.test(name)) {
        if (formError) {
          formError.textContent = "Imię może zawierać tylko litery (2–30)";
          formError.style.display = "block";
        }
        return;
      }

      if (email.length < 5 || email.length > 60) {
        if (formError) {
          formError.textContent = "Niepoprawny email";
          formError.style.display = "block";
        }
        return;
      }

      if (!/^[0-9+ ]{9,15}$/.test(phone)) {
        if (formError) {
          formError.textContent = "Niepoprawny numer telefonu";
          formError.style.display = "block";
        }
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

        if (!res.ok || !data.url) {
          throw new Error("Stripe error");
        }

        // redirect do Stripe
        window.location.href = data.url;

      } catch (err) {
        console.error(err);
        if (formError) {
          formError.textContent = "Błąd płatności. Spróbuj ponownie.";
          formError.style.display = "block";
        }
        isSubmitting = false;
      }
    });
  }

});
