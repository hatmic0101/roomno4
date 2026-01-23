const API_URL = "https://api.roomno4.com/api";

const params = new URLSearchParams(window.location.search);
const sessionId = params.get("session_id");

const ticketBox = document.getElementById("ticketBox");
const qrImage = document.getElementById("qrImage");
const ticketCodeEl = document.getElementById("ticketCode");
const downloadQr = document.getElementById("downloadQr");
const errorEl = document.getElementById("error");

if (!sessionId) {
  errorEl.textContent = "Missing payment session.";
} else {
  fetch(`${API_URL}/ticket?session_id=${sessionId}`)
    .then(res => res.json())
    .then(data => {
      if (data.error) {
        errorEl.textContent = data.error;
        return;
      }

      qrImage.src = data.qr;
      ticketCodeEl.textContent = `Ticket code: ${data.ticketCode}`;
      downloadQr.href = data.qr;

      ticketBox.style.display = "block";
    })
    .catch(() => {
      errorEl.textContent = "Could not load ticket.";
    });
}
