document.addEventListener("DOMContentLoaded", function () {
  var container = document.querySelector(".accordion-container");
  var buttons = document.querySelectorAll(".accordion-header");

  if (container) {
    container.classList.add("is-enhanced");
  }

  buttons.forEach(function (button) {
    button.addEventListener("click", function () {
      var panel = document.getElementById(button.getAttribute("aria-controls"));
      var isOpen = button.getAttribute("aria-expanded") === "true";

      button.classList.toggle("active", !isOpen);
      button.setAttribute("aria-expanded", String(!isOpen));

      if (!panel) {
        return;
      }

      panel.style.maxHeight = isOpen ? null : panel.scrollHeight + "px";
    });
  });
});
