(function () {
  var body = document.querySelector("[data-post-body]");
  var nav = document.querySelector("[data-post-toc]");
  var toc = document.querySelector(".post-toc");
  var layout = document.querySelector(".post-reading-layout");

  if (!body || !nav || !toc) {
    return;
  }

  var headings = Array.prototype.slice.call(body.querySelectorAll("h2, h3, h4"));

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
    linksById.forEach(function (link) {
      link.classList.toggle("is-active", link.hash.slice(1) === encodeURIComponent(id));
    });
  }

  if (!("IntersectionObserver" in window)) {
    activate(headings[0].id);
    return;
  }

  var visible = new Map();
  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          visible.set(entry.target.id, entry.boundingClientRect.top);
        } else {
          visible.delete(entry.target.id);
        }
      });

      if (visible.size === 0) {
        return;
      }

      var activeId = Array.from(visible.entries()).sort(function (a, b) {
        return Math.abs(a[1]) - Math.abs(b[1]);
      })[0][0];

      activate(activeId);
    },
    {
      rootMargin: "-12% 0px -70% 0px",
      threshold: [0, 1]
    }
  );

  headings.forEach(function (heading) {
    observer.observe(heading);
  });

  activate(headings[0].id);
})();
