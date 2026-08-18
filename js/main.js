// Footer year
document.getElementById("year").textContent = new Date().getFullYear();

// Placeholder waitlist form — no backend yet, just a friendly confirmation.
const form = document.getElementById("waitlist-form");
const message = document.getElementById("form-message");

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const email = document.getElementById("email").value.trim();

  if (!email) {
    return;
  }

  message.textContent = `Thanks! We'll let you know at ${email} when Wayfarer is ready.`;
  form.reset();
});
