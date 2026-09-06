(function () {
  var tables = document.querySelectorAll(".page-content table");
  tables.forEach(function (table, index) {
    // Leave renderer-owned tables and nested tables alone.
    if (table.closest(".table-scroll, .highlight, .MathJax, .MathJax_Display, mjx-container") ||
        table.parentElement.closest("table")) {
      return;
    }
    var wrapper = document.createElement("div");
    wrapper.className = "table-scroll";
    wrapper.setAttribute("role", "region");
    var caption = table.querySelector("caption");
    var headings = Array.prototype.map.call(table.querySelectorAll("thead th"), function (cell) {
      return cell.textContent.trim();
    }).join("、");
    wrapper.setAttribute("aria-label", (caption ? caption.textContent.trim() : headings) || "表格 " + (index + 1));
    table.parentNode.insertBefore(wrapper, table);
    wrapper.appendChild(table);

    function updateOverflow() {
      // Keyboard users can focus and scroll wide tables, without adding
      // unnecessary tab stops for tables that already fit their container.
      if (wrapper.scrollWidth > wrapper.clientWidth + 1) {
        wrapper.tabIndex = 0;
      } else {
        wrapper.removeAttribute("tabindex");
      }
    }
    if ("ResizeObserver" in window) {
      var observer = new ResizeObserver(updateOverflow);
      observer.observe(wrapper);
      observer.observe(table);
    }
    window.addEventListener("resize", updateOverflow);
    window.addEventListener("load", updateOverflow);
    updateOverflow();
  });
})();
