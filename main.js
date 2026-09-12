function toggleTheme() {
  const html = document.documentElement;
  const current = html.getAttribute("data-theme");
  const next = current === "dark" ? "light" : "dark";
  html.setAttribute("data-theme", next);
  localStorage.setItem("theme", next);

  // Tell the background to switch palettes
  if (window.__bgSetTheme) window.__bgSetTheme(next);
}

function initBackground() {
  // ---------- palettes ----------
  var THEMES = {
    dark: {
      bg: "#000000",
      dot: "rgba(150,215,255,.95)",
      dotGlow: "rgba(80,170,255,.06)",
      line: "rgba(90,175,255,", // alpha appended
      cursorLine: "rgba(180,230,255,",
      cursorHalo: "rgba(120,200,255,.2)",
      cursorCore: "rgba(200,235,255,.9)",
    },
    light: {
      bg: "#d8e0ea",
      dot: "rgba(30,90,160,.85)",
      dotGlow: "rgba(60,130,220,.08)",
      line: "rgba(40,110,200,", // alpha appended
      cursorLine: "rgba(20,80,160,",
      cursorHalo: "rgba(60,130,220,.15)",
      cursorCore: "rgba(20,70,150,.85)",
    },
  };

  // ---------- create canvas ----------
  var c = document.createElement("canvas");
  c.id = "bgNetwork";
  c.style.cssText =
    "position:fixed;top:0;left:0;width:100%;height:100%;" +
    "z-index:-1;display:block;pointer-events:none;transition:background .35s ease;";
  document.body.insertBefore(c, document.body.firstChild);

  var x = c.getContext("2d"),
    W,
    H;
  var M = { x: null, y: null, a: false };
  var dots = [],
    N = 110,
    CD = 160,
    CCD = 220;

  // Only use a saved theme if the user has explicitly picked one.
  // Otherwise default to dark.
  var savedTheme = localStorage.getItem("theme");
  var currentTheme = savedTheme === "light" ? "light" : "dark";

  document.documentElement.setAttribute("data-theme", currentTheme);

  var P = THEMES[currentTheme];
  c.style.background = P.bg;

  function setTheme(name) {
    currentTheme = name === "light" ? "light" : "dark";
    P = THEMES[currentTheme];
    c.style.background = P.bg;
  }
  // expose to toggleTheme
  window.__bgSetTheme = setTheme;

  // ---------- sizing ----------
  function rs() {
    W = c.width = innerWidth;
    H = c.height = innerHeight;
  }
  addEventListener("resize", rs);
  rs();

  // ---------- pointer ----------
  addEventListener("mousemove", function (e) {
    M.x = e.clientX;
    M.y = e.clientY;
    M.a = true;
  });
  addEventListener("mouseleave", function () {
    M.a = false;
    M.x = M.y = null;
  });
  addEventListener(
    "touchmove",
    function (e) {
      if (e.touches[0]) {
        M.x = e.touches[0].clientX;
        M.y = e.touches[0].clientY;
        M.a = true;
      }
    },
    { passive: true },
  );
  addEventListener("touchend", function () {
    M.a = false;
    M.x = M.y = null;
  });

  // ---------- dot ----------
  function D() {
    this.x = Math.random() * W;
    this.y = Math.random() * H;
    var a = Math.random() * 6.283,
      s = 0.3 + Math.random() * 0.4;
    this.vx = Math.cos(a) * s;
    this.vy = Math.sin(a) * s;
    this.r = 1.4 + Math.random() * 1.6;
    this.d = 0.03 + (Math.random() * 2 - 1) * 0.02;
  }
  D.prototype.u = function () {
    if (M.a && M.x !== null) {
      var dx = M.x - this.x,
        dy = M.y - this.y,
        d = Math.sqrt(dx * dx + dy * dy);
      if (d < CCD && d > 0.01) {
        var f = (1 - d / CCD) * 0.006; //gravity
        this.vx += (dx / d) * f;
        this.vy += (dy / d) * f;
      }
    }
    this.vy += this.d * 0.03;
    this.vx *= 0.996;
    this.vy *= 0.996;
    var sp = Math.sqrt(this.vx * this.vx + this.vy * this.vy),
      mx = 1.1;
    if (sp > mx) {
      this.vx = (this.vx / sp) * mx;
      this.vy = (this.vy / sp) * mx;
    }
    this.x += this.vx;
    this.y += this.vy;
    if (this.x < 0) {
      this.x = 0;
      this.vx *= -1;
    } else if (this.x > W) {
      this.x = W;
      this.vx *= -1;
    }
    if (this.y > H + 60) {
      this.y = -60;
      this.x = Math.random() * W;
      this.vx = (Math.random() - 0.5) * 0.6;
      this.vy = Math.random() * 0.25;
    } else if (this.y < -60) {
      this.y = H + 60;
      this.x = Math.random() * W;
      this.vx = (Math.random() - 0.5) * 0.6;
      this.vy = -Math.random() * 0.25;
    }
  };
  for (var i = 0; i < N; i++) dots.push(new D());

  // ---------- render loop ----------
  function loop() {
    x.clearRect(0, 0, W, H);
    var i, j, a, b, dx, dy, dist, op;

    for (i = 0; i < dots.length; i++) dots[i].u();

    x.lineWidth = 0.9;
    x.lineCap = "round";

    // dot ↔ dot
    for (i = 0; i < dots.length; i++)
      for (j = i + 1; j < dots.length; j++) {
        a = dots[i];
        b = dots[j];
        dx = a.x - b.x;
        dy = a.y - b.y;
        dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < CD) {
          op = (1 - dist / CD) * 0.6;
          x.beginPath();
          x.moveTo(a.x, a.y);
          x.lineTo(b.x, b.y);
          x.strokeStyle = P.line + op + ")";
          x.stroke();
        }
      }

    // cursor ↔ dot
    if (M.a && M.x !== null) {
      for (i = 0; i < dots.length; i++) {
        a = dots[i];
        dx = M.x - a.x;
        dy = M.y - a.y;
        dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < CCD) {
          op = (1 - dist / CCD) * 0.5;
          x.beginPath();
          x.moveTo(M.x, M.y);
          x.lineTo(a.x, a.y);
          x.strokeStyle = P.cursorLine + op + ")";
          x.lineWidth = 0.7;
          x.stroke();
        }
      }
    }

    // dots
    for (i = 0; i < dots.length; i++) {
      a = dots[i];
      x.beginPath();
      x.arc(a.x, a.y, a.r, 0, 6.283);
      x.fillStyle = P.dot;
      x.fill();
      x.beginPath();
      x.arc(a.x, a.y, a.r * 3, 0, 6.283);
      x.fillStyle = P.dotGlow;
      x.fill();
    }

    // cursor glow
    if (M.a && M.x !== null) {
      var g = x.createRadialGradient(M.x, M.y, 0, M.x, M.y, 50);
      g.addColorStop(0, P.cursorHalo);
      g.addColorStop(1, "rgba(0,0,0,0)");
      x.beginPath();
      x.arc(M.x, M.y, 50, 0, 6.283);
      x.fillStyle = g;
      x.fill();
      x.beginPath();
      x.arc(M.x, M.y, 3, 0, 6.283);
      x.fillStyle = P.cursorCore;
      x.fill();
    }

    requestAnimationFrame(loop);
  }
  loop();
}

// wait for DOM
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initBackground);
} else {
  initBackground();
}
