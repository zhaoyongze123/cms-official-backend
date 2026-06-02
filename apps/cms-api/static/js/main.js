/**
 * cms-api Main JavaScript
 * Mobile navigation toggle
 */
document.addEventListener("DOMContentLoaded", function () {
  const toggle = document.getElementById("nav-toggle");
  const navList = document.getElementById("nav-list");

  if (toggle && navList) {
    toggle.addEventListener("click", function () {
      navList.classList.toggle("open");
    });

    document.addEventListener("click", function (e) {
      if (!toggle.contains(e.target) && !navList.contains(e.target)) {
        navList.classList.remove("open");
      }
    });
  }

  const passwordInput = document.getElementById("login-password");
  const togglePasswordButton = document.getElementById("toggle-password-visibility");
  const copyPasswordButton = document.getElementById("copy-password-value");

  if (passwordInput && togglePasswordButton) {
    togglePasswordButton.addEventListener("click", function () {
      const isHidden = passwordInput.type === "password";
      passwordInput.type = isHidden ? "text" : "password";
      togglePasswordButton.innerHTML = isHidden
        ? '<i class="fas fa-eye-slash"></i>'
        : '<i class="fas fa-eye"></i>';
    });
  }

  if (passwordInput && copyPasswordButton) {
    copyPasswordButton.addEventListener("click", async function () {
      try {
        await navigator.clipboard.writeText(passwordInput.value || "");
      } catch (error) {
        passwordInput.select();
        document.execCommand("copy");
      }
    });
  }
});
