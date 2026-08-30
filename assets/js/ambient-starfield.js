(function () {
  var layer = document.querySelector("[data-ambient-starfield]");
  var canvas = document.querySelector("[data-ambient-starfield-canvas]");
  var content = document.querySelector(".page-content .w");

  if (!layer || !canvas || !content || !canvas.getContext) {
    return;
  }

  var context = canvas.getContext("2d");
  var motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  var nodes = [];
  var connections = new Set();
  var frameId = 0;
  var lastFrame = 0;
  var viewportWidth = 0;
  var viewportHeight = 0;
  var leftLimit = 0;
  var rightLimit = 0;
  var isActive = false;
  var pointer = { active: false, x: -1000, y: -1000 };
  var colors = { node: "#4f46e5", accent: "#0891b2" };
  var connectDistance = 132;
  var disconnectDistance = 168;
  var pointerDistance = 260;

  function randomBetween(min, max) {
    return min + Math.random() * (max - min);
  }

  function readColors() {
    var styles = getComputedStyle(layer);
    colors.node = styles.getPropertyValue("--ambient-node").trim() || "#4f46e5";
    colors.accent = styles.getPropertyValue("--ambient-accent").trim() || "#0891b2";
  }

  function createNode(side) {
    var minX = side === "left" ? 18 : rightLimit + 14;
    var maxX = side === "left" ? leftLimit - 14 : viewportWidth - 18;
    var driftVx = randomBetween(-0.34, 0.34);
    var driftVy = randomBetween(-0.36, 0.36);

    return {
      accent: Math.random() > 0.72,
      alpha: randomBetween(0.24, 0.62),
      phase: randomBetween(0, Math.PI * 2),
      radius: randomBetween(0.72, 1.9),
      side: side,
      speed: randomBetween(0.28, 0.72),
      driftVx: driftVx,
      driftVy: driftVy,
      vx: driftVx,
      vy: driftVy,
      x: randomBetween(minX, Math.max(minX + 1, maxX)),
      y: randomBetween(18, Math.max(19, viewportHeight - 18))
    };
  }

  function rebuildNodes() {
    nodes = [];
    connections.clear();

    if (!isActive) {
      return;
    }

    var sideArea = (leftLimit + viewportWidth - rightLimit) * viewportHeight;
    var total = Math.max(128, Math.min(260, Math.round(sideArea / 4700)));
    var leftShare = leftLimit / Math.max(1, leftLimit + viewportWidth - rightLimit);
    var leftCount = Math.round(total * leftShare);

    for (var index = 0; index < total; index += 1) {
      nodes.push(createNode(index < leftCount ? "left" : "right"));
    }
  }

  function resize() {
    var ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    var bounds = content.getBoundingClientRect();

    viewportWidth = document.documentElement.clientWidth;
    viewportHeight = document.documentElement.clientHeight;
    leftLimit = Math.max(0, Math.floor(bounds.left - 28));
    rightLimit = Math.min(viewportWidth, Math.ceil(bounds.right + 28));

    var leftGutter = leftLimit;
    var rightGutter = viewportWidth - rightLimit;
    isActive = viewportWidth >= 1200 && Math.min(leftGutter, rightGutter) >= 96;

    layer.classList.toggle("is-active", isActive);
    layer.style.setProperty("--ambient-left-width", leftGutter + "px");
    layer.style.setProperty("--ambient-right-width", rightGutter + "px");

    canvas.width = Math.round(viewportWidth * ratio);
    canvas.height = Math.round(viewportHeight * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);

    rebuildNodes();
    draw(performance.now(), true);
  }

  function nodePosition(node, scrollProgress) {
    var pointerRatio = pointer.active ? pointer.x / Math.max(1, viewportWidth) : 0.5;
    var parallax = (pointerRatio - 0.5) * (node.side === "left" ? -28 : 28);
    var x = node.x + parallax;
    var y = node.y + Math.sin(scrollProgress * Math.PI * 2 + node.phase) * 24;

    return { x: x, y: y };
  }

  function updateNode(node, step) {
    if (pointer.active) {
      var pointerDx = node.x - pointer.x;
      var pointerDy = node.y - pointer.y;
      var pointerGap = Math.sqrt(pointerDx * pointerDx + pointerDy * pointerDy);

      if (pointerGap > 0 && pointerGap < pointerDistance) {
        var influence = 1 - pointerGap / pointerDistance;
        var force = influence * influence * 0.115 * step;
        node.vx += (pointerDx / pointerGap) * force;
        node.vy += (pointerDy / pointerGap) * force;
      }
    }

    var speed = Math.sqrt(node.vx * node.vx + node.vy * node.vy);
    var maxSpeed = 1.45;
    if (speed > maxSpeed) {
      node.vx = node.vx / speed * maxSpeed;
      node.vy = node.vy / speed * maxSpeed;
    }

    node.vx += (node.driftVx - node.vx) * 0.008 * step;
    node.vy += (node.driftVy - node.vy) * 0.008 * step;
    node.x += node.vx * step;
    node.y += node.vy * step;

    var minX = node.side === "left" ? 16 : rightLimit + 12;
    var maxX = node.side === "left" ? leftLimit - 12 : viewportWidth - 16;

    if (node.x <= minX || node.x >= maxX) {
      node.vx *= -1;
      node.driftVx *= -1;
      node.x = Math.max(minX, Math.min(maxX, node.x));
    }

    if (node.y <= 14 || node.y >= viewportHeight - 14) {
      node.vy *= -1;
      node.driftVy *= -1;
      node.y = Math.max(14, Math.min(viewportHeight - 14, node.y));
    }
  }

  function draw(timestamp, forceDraw) {
    if (!isActive) {
      context.clearRect(0, 0, viewportWidth, viewportHeight);
      return;
    }

    if (!forceDraw && timestamp - lastFrame < 33) {
      frameId = window.requestAnimationFrame(draw);
      return;
    }

    var step = lastFrame ? Math.min(2, (timestamp - lastFrame) / 16.67) : 1;
    var scrollRange = Math.max(1, document.documentElement.scrollHeight - viewportHeight);
    var scrollProgress = Math.min(1, Math.max(0, window.scrollY / scrollRange));
    var positions = [];

    lastFrame = timestamp;
    context.clearRect(0, 0, viewportWidth, viewportHeight);

    nodes.forEach(function (node) {
      if (!motionQuery.matches) {
        updateNode(node, step);
      }
      positions.push(nodePosition(node, scrollProgress));
    });

    for (var first = 0; first < nodes.length; first += 1) {
      for (var second = first + 1; second < nodes.length; second += 1) {
        if (nodes[first].side !== nodes[second].side) {
          continue;
        }

        var dx = positions[first].x - positions[second].x;
        var dy = positions[first].y - positions[second].y;
        var distance = Math.sqrt(dx * dx + dy * dy);

        var connectionKey = first + ":" + second;
        var isConnected = connections.has(connectionKey);

        if (isConnected && distance > disconnectDistance) {
          connections.delete(connectionKey);
          isConnected = false;
        } else if (!isConnected && distance <= connectDistance) {
          connections.add(connectionKey);
          isConnected = true;
        }

        if (isConnected) {
          context.beginPath();
          context.moveTo(positions[first].x, positions[first].y);
          context.lineTo(positions[second].x, positions[second].y);
          context.strokeStyle = nodes[first].accent ? colors.accent : colors.node;
          context.globalAlpha = Math.max(0.025, (1 - distance / disconnectDistance) * 0.18);
          context.lineWidth = 0.62;
          context.stroke();
        }
      }
    }

    nodes.forEach(function (node, index) {
      var pulse = 0.82 + Math.sin(timestamp * 0.001 * node.speed + node.phase) * 0.18;
      context.beginPath();
      context.arc(positions[index].x, positions[index].y, node.radius, 0, Math.PI * 2);
      context.fillStyle = node.accent ? colors.accent : colors.node;
      context.globalAlpha = node.alpha * pulse;
      context.fill();
    });

    context.globalAlpha = 1;

    if (!motionQuery.matches && !document.hidden) {
      frameId = window.requestAnimationFrame(draw);
    }
  }

  function start() {
    window.cancelAnimationFrame(frameId);
    lastFrame = 0;
    draw(performance.now(), true);

    if (isActive && !motionQuery.matches && !document.hidden) {
      frameId = window.requestAnimationFrame(draw);
    }
  }

  window.addEventListener("resize", function () {
    resize();
    start();
  });
  window.addEventListener("pointermove", function (event) {
    pointer.active = true;
    pointer.x = event.clientX;
    pointer.y = event.clientY;
  }, { passive: true });
  window.addEventListener("pointerleave", function () {
    pointer.active = false;
    pointer.x = -1000;
    pointer.y = -1000;
  });
  document.addEventListener("visibilitychange", start);

  if (motionQuery.addEventListener) {
    motionQuery.addEventListener("change", start);
  }

  new MutationObserver(function () {
    readColors();
    draw(performance.now(), true);
  }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

  readColors();
  resize();
  start();
})();
