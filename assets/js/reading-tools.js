(function () {
  var article = document.querySelector("[data-post-body]");
  var progress = document.querySelector("[data-reading-progress]");
  var backToTop = document.querySelector("[data-back-to-top]");
  var pageTitle = document.querySelector(".post-title");

  if (!article || !progress || !backToTop) {
    return;
  }

  var ticking = false;

  function updateReadingTools() {
    var articleTop = article.getBoundingClientRect().top + window.scrollY;
    var readableDistance = Math.max(1, article.offsetHeight - window.innerHeight);
    var articleProgress = (window.scrollY - articleTop) / readableDistance;
    var percentage = Math.min(1, Math.max(0, articleProgress)) * 100;
    var showBackToTop = window.scrollY > window.innerHeight;

    progress.style.transform = "scaleX(" + percentage / 100 + ")";
    backToTop.classList.toggle("is-visible", showBackToTop);
    backToTop.setAttribute("aria-hidden", String(!showBackToTop));
    backToTop.tabIndex = showBackToTop ? 0 : -1;
    ticking = false;
  }

  function requestUpdate() {
    if (!ticking) {
      window.requestAnimationFrame(updateReadingTools);
      ticking = true;
    }
  }

  backToTop.addEventListener("click", function () {
    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (pageTitle) {
      pageTitle.focus({ preventScroll: true });
    }

    window.scrollTo({
      top: 0,
      behavior: reduceMotion ? "auto" : "smooth"
    });
  });

  window.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", requestUpdate);
  updateReadingTools();
})();
