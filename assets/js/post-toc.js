(function () {
  var body = document.querySelector("[data-post-body]");
  var nav = document.querySelector("[data-post-toc]");
  var toc = document.querySelector(".post-toc");
  var layout = document.querySelector(".post-reading-layout");

  if (!body || !nav || !toc) {
    return;
  }

  var headings = Array.prototype.slice.call(body.querySelectorAll("h1"));

  if (headings.length < 2) {
    toc.hidden = true;
    if (layout) {
      layout.classList.add("has-no-toc");
    }
    return;
  }

  var usedIds = new Set(
    Array.prototype.map.call(document.querySelectorAll("[id]"), function (node) {
      return node.id;
    })
  );

  function slugify(text) {
    return text
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\p{L}\p{N}_-]+/gu, "")
      .replace(/^-+|-+$/g, "");
  }

  function uniqueId(base) {
    var id = base || "section";
    var nextId = id;
    var index = 2;

    while (usedIds.has(nextId)) {
      nextId = id + "-" + index;
      index += 1;
    }

    usedIds.add(nextId);
    return nextId;
  }

  var list = document.createElement("ol");
  list.className = "post-toc-list";

  headings.forEach(function (heading) {
    if (!heading.id) {
      heading.id = uniqueId(slugify(heading.textContent));
    }

    var level = Number(heading.tagName.slice(1));
    var item = document.createElement("li");
    var link = document.createElement("a");

    item.className = "post-toc-item";
    link.className = "post-toc-link post-toc-level-" + level;
    link.href = "#" + encodeURIComponent(heading.id);
    link.textContent = heading.textContent.trim();

    item.appendChild(link);
    list.appendChild(item);
  });

  nav.appendChild(list);

  var linksById = new Map(
    Array.prototype.map.call(nav.querySelectorAll(".post-toc-link"), function (link) {
      return [decodeURIComponent(link.hash.slice(1)), link];
    })
  );

  function activate(id) {
    linksById.forEach(function (link, linkId) {
      var active = linkId === id;
      link.classList.toggle("is-active", active);
      if (active) {
        link.setAttribute("aria-current", "location");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  }

  var ticking = false;

  function updateFromScroll() {
    ticking = false;
    // Include headings just below scroll-margin-top, and keep the preceding
    // section active when scrolling through long content between headings.
    var activationLine = Math.min(120, window.innerHeight * 0.15);
    var active = headings[0];
    headings.forEach(function (heading) {
      if (heading.getBoundingClientRect().top <= activationLine) {
        active = heading;
      }
    });
    activate(active.id);
  }

  function requestUpdate() {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(updateFromScroll);
    }
  }

  linksById.forEach(function (link, id) {
    link.addEventListener("click", function () {
      activate(id);
    });
  });

  function updateFromHash() {
    var id;
    try {
      id = decodeURIComponent(window.location.hash.slice(1));
    } catch (_) {
      requestUpdate();
      return;
    }
    if (linksById.has(id)) {
      activate(id);
    } else {
      requestUpdate();
    }
  }

  window.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", requestUpdate);
  window.addEventListener("hashchange", updateFromHash);
  window.addEventListener("load", requestUpdate);
  // Lazy images and MathJax may change section positions after initial render.
  if ("ResizeObserver" in window) {
    new ResizeObserver(requestUpdate).observe(body);
  }
  updateFromScroll();
  updateFromHash();
})();
