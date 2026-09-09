/* ==========================================================================
   Developer Portfolio — interactions (gold theme, template-based design)
   - profile.json is the source of truth for the profile (name, role, bio,
     email, socials, photo).
   - projects.json is the source of truth for the project cards.
   - Edit either file by hand or with the local admin tool
     (run "node server.js", then open http://localhost:3000/admin/).
   - Theme choice is stored in localStorage and defaults to the OS preference.
   - GitHub stats load from the public GitHub API; set GITHUB_USERNAME below.
   ========================================================================== */

(function () {
  "use strict";

  /* Set your GitHub username here to fill the GitHub Activity section. */
  var GITHUB_USERNAME = "Evanthegeek";

  var THEME_KEY = "devfolio.theme";

  var PROFILE_DEFAULTS = {
    username: "YourUsername",
    name: "Your Name",
    role: "Software Engineer",
    bio: "Placeholder biography. Describe who you are, what you like to build, and the kind of problems you enjoy solving.",
    email: "you@example.com",
    location: "Your City, Country",
    socials: {
      instagram: "https://www.instagram.com/",
      linkedin: "https://www.linkedin.com/",
      github: "https://github.com/"
    },
    photo: ""
  };

  var profile = Object.assign({}, PROFILE_DEFAULTS);
  var repoProjects = [];
  var lineWavesInstance = null;
  var particlesInstance = null;

  var prefersReducedMotion = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Small utilities ---------- */

  function $(id) { return document.getElementById(id); }

  function esc(value) {
    return String(value).replace(/[&<>"']/g, function (char) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      }[char];
    });
  }

  function safeUrl(value) {
    if (!value) return "";
    var trimmed = String(value).trim();
    if (!trimmed) return "";
    try {
      var parsed = new URL(trimmed);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        return parsed.href;
      }
    } catch (err) { /* fall through */ }
    return "";
  }

  function initialsOf(name) {
    var parts = String(name || "").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "P";
    return parts
      .slice(0, 2)
      .map(function (part) { return part.charAt(0).toUpperCase(); })
      .join("");
  }

  function fetchJSON(url) {
    return fetch(url, { cache: "no-store" }).then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    });
  }

  /* ---------- Theme ---------- */

  var themeToggle = $("theme-toggle");

  function getTheme() {
    return document.documentElement.getAttribute("data-theme") || "dark";
  }

  function isLightTheme() {
    return getTheme() === "light";
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    var light = theme === "light";
    themeToggle.setAttribute("aria-pressed", String(light));
    themeToggle.setAttribute("aria-label", light ? "Switch to dark theme" : "Switch to light theme");
    var meta = document.querySelector('meta[name="color-scheme"]');
    if (meta) meta.setAttribute("content", theme);
    // Re-create the canvas effects with theme-appropriate colors.
    restartBackgroundEffects();
  }

  themeToggle.addEventListener("click", function () {
    var next = getTheme() === "dark" ? "light" : "dark";
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch (err) { /* ignore */ }
    applyTheme(next);
  });

  applyTheme(getTheme());

  /* ---------- Loading screen ---------- */

  function renderLoaderLetters(name) {
    var loader = $("name-loader");
    if (!loader) return;

    var letters = String(name || "")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 16)
      .split("");
    if (!letters.length) letters = "PORTFOLIO".split("");

    loader.innerHTML = "";
    // Long usernames get a smaller font so the letters fit on screen.
    loader.classList.toggle("is-long", letters.length > 10);
    var stagger = 0.12;
    letters.forEach(function (letter, i) {
      var span = document.createElement("span");
      span.setAttribute("data-text", letter);
      span.textContent = letter;
      // A small random tilt makes the springy entrance feel organic.
      span.style.setProperty("--tilt", (Math.random() * 6 - 3).toFixed(2) + "deg");
      // The reveal, float and glow animations all key off this shared delay.
      span.style.setProperty("--d", (i * stagger).toFixed(2) + "s");
      loader.appendChild(span);
    });
    return letters;
  }

  var loaderHidden = false;

  function hideLoader(username) {
    if (loaderHidden) return;
    loaderHidden = true;
    var loading = $("loading");
    if (!loading) return;
    // The loading screen shows the profile username (real name is used on the
    // main page), falling back to the name or a generic label.
    var count = (renderLoaderLetters(username || PROFILE_DEFAULTS.username || PROFILE_DEFAULTS.name) || []).length;
    // The username expands for the last second as a final flourish, then the
    // loader fades. Expansion starts a beat after the last letter's glow ends.
    var stagger = 0.12;
    var lastGlowEnd = Math.max(0, (count - 1) * stagger + 1.45);
    var flourish = 1.15;   // the final swell lasts just over a second
    var delay = prefersReducedMotion
      ? 0
      : Math.min(Math.max(lastGlowEnd + 0.2 + flourish, 1.4 + count * stagger + 0.6), 4.8);
    var loaderText = $("name-loader");
    if (!prefersReducedMotion && loaderText) {
      setTimeout(function () {
        loaderText.classList.add("expand");
      }, Math.max(0, delay - flourish) * 1000);
    }
    setTimeout(function () {
      loading.classList.add("done");
    }, delay * 1000);
  }

  /* ---------- Profile rendering ---------- */

  var heroNameBtn = $("hero-name");
  var heroRole = $("hero-role");
  var aboutName = $("about-name");
  var aboutRole = $("about-role");
  var aboutBio = $("about-bio");
  var photoPlaceholder = $("photo-placeholder");
  var photoImg = $("photo-img");
  var fixedEmail = document.querySelector(".fixed-email");

  // Roles from profile.role are comma-separated: the hero subheader and the
  // About heading both cycle through them with a typing effect. Conjunction
  // words ("and"/"or") also act as separators, so "Developer and Designer"
  // becomes two roles. Duplicates are dropped (case-insensitively) so the
  // two displays never end up typing the same text.
  function splitRoles(role) {
    var seen = {};
    return String(role || "").split(",").reduce(function (acc, part) {
      return acc.concat(part.split(/\band\b|\bor\b/i).map(function (piece) {
        return piece.trim();
      }).filter(Boolean));
    }, []).filter(function (item) {
      var key = item.toLowerCase();
      if (seen[key]) return false;
      seen[key] = true;
      return true;
    });
  }

  var roleTyperGeneration = 0;

  // One shared controller drives BOTH typing displays in lockstep (same
  // phases, same random speeds), so they stay synced. Roles come from a
  // shuffled deck dealt two at a time: consecutive entries are never equal,
  // so the hero and the About heading never say the same thing at the same
  // moment, and each scrolls through every role in a random order before the
  // deck reshuffles.
  function startRoleTypers(heroTarget, aboutTarget, roles) {
    // A new generation invalidates any running animation (renderProfile can
    // be called more than once), so old timer chains stop cleanly.
    roleTyperGeneration += 1;
    var generation = roleTyperGeneration;

    function makeCaret() {
      var caret = document.createElement("span");
      caret.className = "type-caret";
      caret.setAttribute("aria-hidden", "true");
      return caret;
    }

    function shuffledDeck() {
      var deck = roles.map(function (_, i) { return i; });
      for (var i = deck.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = deck[i];
        deck[i] = deck[j];
        deck[j] = tmp;
      }
      return deck;
    }

    var deck = shuffledDeck();
    var deckPos = deck.length; // forces a fresh draw on the first step
    var hero = { el: heroTarget, caret: makeCaret(), index: -1, text: "" };
    var about = { el: aboutTarget, caret: makeCaret(), index: -1, text: "" };
    var heroLast = -1;
    var aboutLast = -1;

    function drawPair() {
      if (deckPos + 2 > deck.length) {
        // A pass is done. Reshuffle, but reject any arrangement that would
        // hand either display the same role it just showed, so nothing ever
        // repeats its text back to back.
        do {
          deck = shuffledDeck();
        } while (deck[0] === heroLast || deck[1] === aboutLast);
        deckPos = 0;
      }
      hero.index = deck[deckPos];
      about.index = deck[deckPos + 1];
      heroLast = hero.index;
      aboutLast = about.index;
      deckPos += 2;
      hero.text = "";
      about.text = "";
    }

    function rand(min, max) { return min + Math.random() * (max - min); }

    // The hero subheader reads like a shell prompt: a "$" sits ahead of the
    // typed role. Only the hero gets the prompt — the About role is typed
    // inline inside its sentence. hero.text never contains the prompt, so the
    // typing/backspace logic stays untouched.
    var heroPrompt = "$ ";

    function paint() {
      if (roleTyperGeneration !== generation) return;
      hero.el.textContent = heroPrompt + hero.text;
      hero.el.appendChild(hero.caret);
      about.el.textContent = about.text;
      about.el.appendChild(about.caret);
    }

    function deleteStep() {
      if (roleTyperGeneration !== generation) return;
      if (hero.text) hero.text = hero.text.slice(0, -1);
      if (about.text) about.text = about.text.slice(0, -1);
      paint();
      if (!hero.text && !about.text) {
        // Both empty: pause, then draw the next random pair.
        drawPair();
        setTimeout(step, rand(280, 550));
      } else {
        // Backspace quickly, still randomized per character.
        setTimeout(deleteStep, rand(22, 50));
      }
    }

    function step() {
      if (roleTyperGeneration !== generation) return;
      var heroRole = roles[hero.index];
      var aboutRole = roles[about.index];

      // Type both in lockstep: one character per tick on the same random
      // speed; whichever role is shorter waits for the other to finish.
      if (hero.text !== heroRole) hero.text = heroRole.slice(0, hero.text.length + 1);
      if (about.text !== aboutRole) about.text = aboutRole.slice(0, about.text.length + 1);
      paint();

      if (hero.text === heroRole && about.text === aboutRole) {
        // Both fully typed: hold, then backspace both away together.
        setTimeout(deleteStep, rand(1400, 2300));
        return;
      }

      // Randomize the typing speed; linger a little longer after spaces.
      var delay = rand(45, 130);
      if (hero.text.charAt(hero.text.length - 1) === " ") delay = rand(160, 300);
      setTimeout(step, delay);
    }

    drawPair();
    step();
  }

  function renderProfile() {
    var name = profile.name || PROFILE_DEFAULTS.name;
    var role = profile.role || PROFILE_DEFAULTS.role;
    var bio = profile.bio || PROFILE_DEFAULTS.bio;
    var email = profile.email || PROFILE_DEFAULTS.email;
    var socials = profile.socials || {};

    // Hero name button (stroked gold text; the gold fill sweeps in on hover)
    if (heroNameBtn) {
      var padded = "\u00A0" + name + "\u00A0";
      heroNameBtn.setAttribute("data-text", name);
      var actual = heroNameBtn.querySelector(".actual-text");
      var hover = heroNameBtn.querySelector(".hover-text");
      if (actual) actual.textContent = padded;
      if (hover) hover.textContent = padded;
    }
    // Multiple roles (comma-separated in profile.json): both the hero
    // subheader and the About heading type them out in sync, always showing
    // different roles in a random order. Otherwise they show them joined.
    var roles = splitRoles(role);
    var animateRoles = roles.length > 1 && !prefersReducedMotion && heroRole && aboutRole;
    if (animateRoles) {
      startRoleTypers(heroRole, aboutRole, roles);
    } else {
      // Static fallback (single role or reduced motion): the hero line keeps
      // its shell prompt, the About role stays plain inside its sentence.
      if (heroRole) heroRole.textContent = "$ " + roles.join(", ");
      if (aboutRole) aboutRole.textContent = roles.join(", ");
    }
    if (aboutName) aboutName.textContent = name;
    if (aboutBio) aboutBio.textContent = bio;

    var footerName = $("footer-name");
    if (footerName) footerName.textContent = name;
    document.title = name + " — Developer Portfolio";

    // Email addresses and mailto links.
    if (fixedEmail) {
      fixedEmail.href = "mailto:" + email;
      fixedEmail.textContent = email;
    }
    var contactEmail = $("contact-email");
    if (contactEmail) contactEmail.textContent = email;
    var contactEmailLink = $("contact-email-link");
    if (contactEmailLink) {
      contactEmailLink.href = "mailto:" + email;
      contactEmailLink.textContent = email;
    }

    // Social icon links.
    document.querySelectorAll(".social-icons a[data-social]").forEach(function (link) {
      var social = link.getAttribute("data-social");
      if (social === "email") {
        link.href = "mailto:" + email;
      } else if (social === "instagram" && socials.instagram) {
        link.href = socials.instagram;
      } else if (social === "linkedin" && socials.linkedin) {
        link.href = socials.linkedin;
      } else if (social === "github" && socials.github) {
        link.href = socials.github;
      }
    });

    // Contact section buttons.
    document.querySelectorAll(".contact-buttons a").forEach(function (link) {
      var href = link.getAttribute("href") || "";
      if (href.indexOf("github.com") !== -1 && socials.github) link.href = socials.github;
      if (href.indexOf("linkedin.com") !== -1 && socials.linkedin) link.href = socials.linkedin;
    });

    // Location in the contact info block.
    var contactLocation = $("contact-location");
    if (contactLocation) contactLocation.textContent = profile.location || PROFILE_DEFAULTS.location;
  }

  function renderPhoto() {
    if (profile.photo) {
      photoImg.src = profile.photo;
      photoImg.hidden = false;
      photoPlaceholder.hidden = true;
    } else {
      photoImg.removeAttribute("src");
      photoImg.hidden = true;
      photoPlaceholder.hidden = false;
      photoPlaceholder.textContent = initialsOf(profile.name || PROFILE_DEFAULTS.name);
    }
  }

  /* ---------- Projects rendering ---------- */

  var projectsGrid = $("projects-grid");
  var projectsEmpty = $("projects-empty");
  var projectsNotice = $("projects-notice");

  function showNotice(message) {
    projectsNotice.textContent = message;
    projectsNotice.hidden = false;
  }

  /* Best-effort devicon icon lookup for project tags. */
  var TAG_ICONS = {
    javascript: "javascript/javascript-original.svg",
    js: "javascript/javascript-original.svg",
    react: "react/react-original.svg",
    reactjs: "react/react-original.svg",
    typescript: "typescript/typescript-original.svg",
    ts: "typescript/typescript-original.svg",
    tailwind: "tailwindcss/tailwindcss-original.svg",
    tailwindcss: "tailwindcss/tailwindcss-original.svg",
    html: "html5/html5-original.svg",
    html5: "html5/html5-original.svg",
    css: "css3/css3-original.svg",
    css3: "css3/css3-original.svg",
    node: "nodejs/nodejs-original.svg",
    nodejs: "nodejs/nodejs-original.svg",
    express: "express/express-original.svg",
    expressjs: "express/express-original.svg",
    mongodb: "mongodb/mongodb-original.svg",
    mongoose: "mongoose/mongoose-original.svg",
    postgresql: "postgresql/postgresql-original.svg",
    postgres: "postgresql/postgresql-original.svg",
    mysql: "mysql/mysql-original.svg",
    sqlite: "sqlite/sqlite-original.svg",
    redis: "redis/redis-original.svg",
    python: "python/python-original.svg",
    fastapi: "fastapi/fastapi-original.svg",
    flask: "flask/flask-original.svg",
    django: "django/django-original.svg",
    git: "git/git-original.svg",
    github: "github/github-original.svg",
    docker: "docker/docker-original.svg",
    next: "nextjs/nextjs-original.svg",
    nextjs: "nextjs/nextjs-original.svg",
    bootstrap: "bootstrap/bootstrap-original.svg",
    redux: "redux/redux-original.svg",
    graphql: "graphql/graphql-original.svg",
    jest: "jest/jest-plain.svg",
    vite: "vite/vite-original.svg",
    vue: "vuejs/vuejs-original.svg",
    vuejs: "vuejs/vuejs-original.svg",
    angular: "angular/angular-original.svg",
    c: "c/c-original.svg",
    cpp: "cplusplus/cplusplus-original.svg",
    cplusplus: "cplusplus/cplusplus-original.svg",
    java: "java/java-original.svg",
    go: "go/go-original.svg",
    golang: "go/go-original.svg",
    rust: "rust/rust-original.svg",
    firebase: "firebase/firebase-original.svg",
    aws: "amazonwebservices/amazonwebservices-original-wordmark.svg",
    gcp: "googlecloud/googlecloud-original.svg",
    googlecloud: "googlecloud/googlecloud-original.svg",
    sass: "sass/sass-original.svg",
    scss: "sass/sass-original.svg",
    markdown: "markdown/markdown-original.svg",
    php: "php/php-original.svg"
  };

  function tagChip(tag) {
    var label = esc(tag);
    var key = String(tag).toLowerCase().replace(/[^a-z0-9]/g, "");
    var icon = TAG_ICONS[key];
    if (icon) {
      return '<span class="project-tag"><img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/' +
        icon + '" alt="" loading="lazy">' + label + "</span>";
    }
    return '<span class="project-tag">' + label + "</span>";
  }

  function renderProjects() {
    projectsGrid.innerHTML = "";

    if (!repoProjects.length) {
      projectsGrid.hidden = true;
      projectsEmpty.hidden = false;
      return;
    }

    projectsGrid.hidden = false;
    projectsEmpty.hidden = true;

    repoProjects.forEach(function (project) {
      var title = project.title || "Untitled";

      var card = document.createElement("article");
      card.className = "project-card glow-card reveal reveal-zoom";

      var media;
      if (project.image) {
        media =
          '<img class="project-media-img" src="' + esc(project.image) +
          '" alt="' + esc(title) + ' cover" loading="lazy">';
      } else {
        media =
          '<span class="project-monogram" aria-hidden="true">' +
          esc(initialsOf(title)) + "</span>";
      }

      var tags = (project.tags || [])
        .map(tagChip)
        .join("");

      var links = [];
      if (project.url) {
        links.push(
          '<a class="project-link-live" href="' + esc(project.url) +
          '" target="_blank" rel="noopener">Live Demo</a>'
        );
      }
      if (project.source) {
        links.push(
          '<a class="project-link-source" href="' + esc(project.source) +
          '" target="_blank" rel="noopener">GitHub</a>'
        );
      }

      card.innerHTML =
        '<div class="project-media">' + media + "</div>" +
        '<div class="project-body">' +
          '<h3 class="project-title">' + esc(title) + "</h3>" +
          '<p class="project-desc">' + esc(project.desc || "") + "</p>" +
          (tags ? '<div class="project-tags">' + tags + "</div>" : "") +
        "</div>" +
        (links.length
          ? '<div class="project-foot">' + links.join("") + "</div>"
          : "");

      projectsGrid.appendChild(card);
    });

    // Reveal cards as they scroll into view, staggered.
    observeReveals(projectsGrid);
  }

  /* ---------- Data loading ---------- */

  function loadData() {
    if (location.protocol === "file:") {
      showNotice("profile.json and projects.json are read over HTTP, so opening index.html directly from disk shows placeholders. Serve this folder with a static server, for example: python3 -m http.server");
      hideLoader();
      return Promise.resolve();
    }

    return Promise.all([
      fetchJSON("profile.json").catch(function () {
        showNotice("Could not load profile.json. Make sure the file exists next to index.html and the site is served over HTTP.");
        return {};
      }),
      fetchJSON("projects.json").catch(function () {
        return { projects: [] };
      })
    ]).then(function (results) {
      var profileData = results[0] || {};
      profile = Object.assign({}, PROFILE_DEFAULTS, profileData, {
        socials: Object.assign({}, PROFILE_DEFAULTS.socials, (profileData.socials || {}))
      });
      repoProjects = Array.isArray(results[1].projects) ? results[1].projects : [];
    });
  }

  /* ---------- HERO: line-waves WebGL background (silver/white waves) ---------- */

  function initLineWaves(containerId, options) {
    var container = document.getElementById(containerId);
    if (!container) return null;

    var opts = Object.assign({
      speed: 0.3,
      innerLineCount: 32.0,
      outerLineCount: 36.0,
      warpIntensity: 1.0,
      rotation: -45,
      edgeFadeWidth: 0.0,
      colorCycleSpeed: 1.0,
      brightness: 0.2,
      color1: "#ffffff",
      color2: "#ffffff",
      color3: "#ffffff",
      enableMouseInteraction: true,
      mouseInfluence: 2.0
    }, options || {});

    function hexToVec3(hex) {
      var h = hex.replace("#", "");
      return [
        parseInt(h.slice(0, 2), 16) / 255,
        parseInt(h.slice(2, 4), 16) / 255,
        parseInt(h.slice(4, 6), 16) / 255
      ];
    }

    var canvas = document.createElement("canvas");
    container.appendChild(canvas);

    var gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: false });
    if (!gl) { container.removeChild(canvas); return null; }

    var vertexShaderSrc = [
      "attribute vec2 aPosition;",
      "void main() {",
      "  gl_Position = vec4(aPosition, 0.0, 1.0);",
      "}"
    ].join("\n");

    var fragmentShaderSrc = [
      "precision highp float;",
      "uniform float uTime;",
      "uniform vec2 uResolution;",
      "uniform float uSpeed;",
      "uniform float uInnerLines;",
      "uniform float uOuterLines;",
      "uniform float uWarpIntensity;",
      "uniform float uRotation;",
      "uniform float uEdgeFadeWidth;",
      "uniform float uColorCycleSpeed;",
      "uniform float uBrightness;",
      "uniform vec3 uColor1;",
      "uniform vec3 uColor2;",
      "uniform vec3 uColor3;",
      "uniform vec2 uMouse;",
      "uniform float uMouseInfluence;",
      "uniform bool uEnableMouse;",
      "#define HALF_PI 1.5707963",
      "float hashF(float n) { return fract(sin(n * 127.1) * 43758.5453123); }",
      "float smoothNoise(float x) {",
      "  float i = floor(x);",
      "  float f = fract(x);",
      "  float u = f * f * (3.0 - 2.0 * f);",
      "  return mix(hashF(i), hashF(i + 1.0), u);",
      "}",
      "float displaceA(float coord, float t) {",
      "  float result = sin(coord * 2.123) * 0.2;",
      "  result += sin(coord * 3.234 + t * 4.345) * 0.1;",
      "  result += sin(coord * 0.589 + t * 0.934) * 0.5;",
      "  return result;",
      "}",
      "float displaceB(float coord, float t) {",
      "  float result = sin(coord * 1.345) * 0.3;",
      "  result += sin(coord * 2.734 + t * 3.345) * 0.2;",
      "  result += sin(coord * 0.189 + t * 0.934) * 0.3;",
      "  return result;",
      "}",
      "vec2 rotate2D(vec2 p, float angle) {",
      "  float c = cos(angle);",
      "  float s = sin(angle);",
      "  return vec2(p.x * c - p.y * s, p.x * s + p.y * c);",
      "}",
      "void main() {",
      "  vec2 coords = gl_FragCoord.xy / uResolution;",
      "  coords = coords * 2.0 - 1.0;",
      "  coords.x *= uResolution.x / uResolution.y;",
      "  coords = rotate2D(coords, uRotation);",
      "  float halfT = uTime * uSpeed * 0.5;",
      "  float fullT = uTime * uSpeed;",
      "  float mouseWarp = 0.0;",
      "  if (uEnableMouse) {",
      "    vec2 mPos = rotate2D(uMouse * 2.0 - 1.0, uRotation);",
      "    mPos.x *= uResolution.x / uResolution.y;",
      "    float mDist = length(coords - mPos);",
      "    mouseWarp = uMouseInfluence * exp(-mDist * mDist * 4.0);",
      "  }",
      "  float warpAx = coords.x + displaceA(coords.y, halfT) * uWarpIntensity + mouseWarp;",
      "  float warpAy = coords.y - displaceA(coords.x * cos(fullT) * 1.235, halfT) * uWarpIntensity;",
      "  float warpBx = coords.x + displaceB(coords.y, halfT) * uWarpIntensity + mouseWarp;",
      "  float warpBy = coords.y - displaceB(coords.x * sin(fullT) * 1.235, halfT) * uWarpIntensity;",
      "  vec2 fieldA = vec2(warpAx, warpAy);",
      "  vec2 fieldB = vec2(warpBx, warpBy);",
      "  vec2 blended = mix(fieldA, fieldB, mix(fieldA, fieldB, 0.5));",
      "  float fadeTop = smoothstep(uEdgeFadeWidth, uEdgeFadeWidth + 0.4, blended.y);",
      "  float fadeBottom = smoothstep(-uEdgeFadeWidth, -(uEdgeFadeWidth + 0.4), blended.y);",
      "  float vMask = 1.0 - max(fadeTop, fadeBottom);",
      "  float tileCount = mix(uOuterLines, uInnerLines, vMask);",
      "  float scaledY = blended.y * tileCount;",
      "  float nY = smoothNoise(abs(scaledY));",
      "  float ridge = pow(step(abs(nY - blended.x) * 2.0, HALF_PI) * cos(2.0 * (nY - blended.x)), 5.0);",
      "  float lines = 0.0;",
      "  for (float i = 1.0; i < 3.0; i += 1.0) {",
      "    lines += pow(max(fract(scaledY), fract(-scaledY)), i * 2.0);",
      "  }",
      "  float pattern = vMask * lines;",
      "  float cycleT = fullT * uColorCycleSpeed;",
      "  float rChannel = (pattern + lines * ridge) * (cos(blended.y + cycleT * 0.234) * 0.5 + 1.0);",
      "  float gChannel = (pattern + vMask * ridge) * (sin(blended.x + cycleT * 1.745) * 0.5 + 1.0);",
      "  float bChannel = (pattern + lines * ridge) * (cos(blended.x + cycleT * 0.534) * 0.5 + 1.0);",
      "  vec3 col = (rChannel * uColor1 + gChannel * uColor2 + bChannel * uColor3) * uBrightness;",
      "  float alpha = clamp(length(col), 0.0, 1.0);",
      "  gl_FragColor = vec4(col, alpha);",
      "}"
    ].join("\n");

    function createShader(type, source) {
      var shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    }

    var vs = createShader(gl.VERTEX_SHADER, vertexShaderSrc);
    var fs = createShader(gl.FRAGMENT_SHADER, fragmentShaderSrc);
    if (!vs || !fs) { container.removeChild(canvas); return null; }

    var program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      container.removeChild(canvas);
      return null;
    }
    gl.useProgram(program);

    var quadVerts = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    var buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, quadVerts, gl.STATIC_DRAW);

    var aPosition = gl.getAttribLocation(program, "aPosition");
    gl.enableVertexAttribArray(aPosition);
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

    var uTimeLoc = gl.getUniformLocation(program, "uTime");
    var uResLoc = gl.getUniformLocation(program, "uResolution");
    var uSpeedLoc = gl.getUniformLocation(program, "uSpeed");
    var uInnerLoc = gl.getUniformLocation(program, "uInnerLines");
    var uOuterLoc = gl.getUniformLocation(program, "uOuterLines");
    var uWarpLoc = gl.getUniformLocation(program, "uWarpIntensity");
    var uRotLoc = gl.getUniformLocation(program, "uRotation");
    var uFadeLoc = gl.getUniformLocation(program, "uEdgeFadeWidth");
    var uCycleLoc = gl.getUniformLocation(program, "uColorCycleSpeed");
    var uBrightLoc = gl.getUniformLocation(program, "uBrightness");
    var uC1Loc = gl.getUniformLocation(program, "uColor1");
    var uC2Loc = gl.getUniformLocation(program, "uColor2");
    var uC3Loc = gl.getUniformLocation(program, "uColor3");
    var uMouseLoc = gl.getUniformLocation(program, "uMouse");
    var uMouseInfLoc = gl.getUniformLocation(program, "uMouseInfluence");
    var uEnableMouseLoc = gl.getUniformLocation(program, "uEnableMouse");

    var rotRad = (opts.rotation * Math.PI) / 180;
    gl.uniform1f(uSpeedLoc, opts.speed);
    gl.uniform1f(uInnerLoc, opts.innerLineCount);
    gl.uniform1f(uOuterLoc, opts.outerLineCount);
    gl.uniform1f(uWarpLoc, opts.warpIntensity);
    gl.uniform1f(uRotLoc, rotRad);
    gl.uniform1f(uFadeLoc, opts.edgeFadeWidth);
    gl.uniform1f(uCycleLoc, opts.colorCycleSpeed);
    gl.uniform1f(uBrightLoc, opts.brightness);
    gl.uniform3fv(uC1Loc, hexToVec3(opts.color1));
    gl.uniform3fv(uC2Loc, hexToVec3(opts.color2));
    gl.uniform3fv(uC3Loc, hexToVec3(opts.color3));
    gl.uniform1f(uMouseInfLoc, opts.mouseInfluence);
    gl.uniform1i(uEnableMouseLoc, opts.enableMouseInteraction ? 1 : 0);

    gl.clearColor(0, 0, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    var currentMouse = [0.5, 0.5];
    var targetMouse = [0.5, 0.5];

    function handleMouseMove(e) {
      var rect = canvas.getBoundingClientRect();
      targetMouse = [
        (e.clientX - rect.left) / rect.width,
        1.0 - (e.clientY - rect.top) / rect.height
      ];
    }

    function handleMouseLeave() {
      targetMouse = [0.5, 0.5];
    }

    if (opts.enableMouseInteraction) {
      canvas.addEventListener("mousemove", handleMouseMove);
      canvas.addEventListener("mouseleave", handleMouseLeave);
    }

    function resize() {
      var w = container.clientWidth || container.offsetWidth || window.innerWidth;
      var h = container.clientHeight || container.offsetHeight || window.innerHeight;
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
      gl.uniform2f(uResLoc, w, h);
    }

    window.addEventListener("resize", resize);

    var animationFrameId = null;

    function render(time) {
      if (prefersReducedMotion) return;
      animationFrameId = requestAnimationFrame(render);
      gl.uniform1f(uTimeLoc, time * 0.001);

      if (opts.enableMouseInteraction) {
        currentMouse[0] += 0.05 * (targetMouse[0] - currentMouse[0]);
        currentMouse[1] += 0.05 * (targetMouse[1] - currentMouse[1]);
        gl.uniform2f(uMouseLoc, currentMouse[0], currentMouse[1]);
      }

      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    if (prefersReducedMotion) {
      resize();
      gl.uniform1f(uTimeLoc, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    } else {
      requestAnimationFrame(function () {
        resize();
        animationFrameId = requestAnimationFrame(render);
      });
    }

    return {
      destroy: function () {
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        window.removeEventListener("resize", resize);
        if (opts.enableMouseInteraction) {
          canvas.removeEventListener("mousemove", handleMouseMove);
          canvas.removeEventListener("mouseleave", handleMouseLeave);
        }
        if (container.contains(canvas)) {
          container.removeChild(canvas);
        }
      }
    };
  }

  function restartLineWaves() {
    if (lineWavesInstance) {
      lineWavesInstance.destroy();
      lineWavesInstance = null;
    }
    var color = isLightTheme() ? "#1a1a1a" : "#ffffff";  /* hero waves stay silver/white */
    var brightness = isLightTheme() ? 0.38 : 0.2;
    lineWavesInstance = initLineWaves("line-waves-container", {
      speed: 0.3,
      innerLineCount: 32,
      outerLineCount: 36,
      warpIntensity: 1.0,
      rotation: -45,
      brightness: brightness,
      color1: color,
      color2: color,
      color3: color,
      enableMouseInteraction: true,
      mouseInfluence: 2.0
    });
  }

  /* ---------- PROJECTS: particle network background ---------- */

  function initParticles(containerId) {
    var container = document.getElementById(containerId);
    if (!container) return null;

    var canvas = document.createElement("canvas");
    container.appendChild(canvas);
    var ctx = canvas.getContext("2d");
    if (!ctx) { container.removeChild(canvas); return null; }

    var particles = [];
    var animationFrameId = null;
    var running = true;
    var mouse = { x: null, y: null };
    var color = isLightTheme() ? "26, 26, 26" : "228, 230, 238";  /* particles are silver (dark) / near-black (light) — no gold in backgrounds */

    function resize() {
      canvas.width = container.clientWidth || window.innerWidth;
      canvas.height = container.clientHeight || window.innerHeight;
      seed();
    }

    function seed() {
      var area = canvas.width * canvas.height;
      var count = Math.max(24, Math.min(60, Math.round(area / 20000)));
      particles = [];
      for (var i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.6,
          vy: (Math.random() - 0.5) * 0.6,
          r: Math.random() * 1.6 + 0.8
        });
      }
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Links between close particles
      for (var i = 0; i < particles.length; i++) {
        for (var j = i + 1; j < particles.length; j++) {
          var dx = particles[i].x - particles[j].x;
          var dy = particles[i].y - particles[j].y;
          var dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 130) {
            var alpha = (1 - dist / 130) * 0.35;
            ctx.strokeStyle = "rgba(" + color + ", " + alpha.toFixed(3) + ")";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      // Dots
      for (var k = 0; k < particles.length; k++) {
        var p = particles[k];
        ctx.fillStyle = "rgba(" + color + ", 0.55)";
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();

        // Grab: link near the mouse cursor
        if (mouse.x !== null) {
          var mdx = p.x - mouse.x;
          var mdy = p.y - mouse.y;
          var mdist = Math.sqrt(mdx * mdx + mdy * mdy);
          if (mdist < 140) {
            ctx.strokeStyle = "rgba(" + color + ", " + (1 - mdist / 140).toFixed(3) + ")";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.stroke();
          }
        }
      }
    }

    function loop() {
      if (!running) return;
      animationFrameId = requestAnimationFrame(loop);
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -20) p.x = canvas.width + 20;
        if (p.x > canvas.width + 20) p.x = -20;
        if (p.y < -20) p.y = canvas.height + 20;
        if (p.y > canvas.height + 20) p.y = -20;
      }
      draw();
    }

    function handleMouseMove(e) {
      var rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    }

    function handleMouseLeave() {
      mouse.x = null;
      mouse.y = null;
    }

    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseleave", handleMouseLeave);
    window.addEventListener("resize", resize);

    resize();
    if (prefersReducedMotion) {
      draw();
    } else {
      animationFrameId = requestAnimationFrame(loop);
    }

    return {
      destroy: function () {
        running = false;
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        window.removeEventListener("resize", resize);
        canvas.removeEventListener("mousemove", handleMouseMove);
        canvas.removeEventListener("mouseleave", handleMouseLeave);
        if (container.contains(canvas)) {
          container.removeChild(canvas);
        }
      }
    };
  }

  function restartParticles() {
    if (particlesInstance) {
      particlesInstance.destroy();
      particlesInstance = null;
    }
    particlesInstance = initParticles("particles-projects");
  }

  function restartBackgroundEffects() {
    restartLineWaves();
    restartParticles();
  }

  /* ---------- Scroll progress bar + back to top ---------- */

  var backToTopButton = $("backToTop");
  var scrollBar = $("scroll-bar");
  var scrollIndicator = $("scroll-indicator");

  var ticking = false;

  function updateScrollUI() {
    var scrollTop = window.scrollY;
    var docHeight = document.documentElement.scrollHeight - window.innerHeight;
    var percent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;

    if (scrollIndicator) scrollIndicator.style.height = percent + "%";

    if (backToTopButton) {
      if (scrollTop > 300) {
        backToTopButton.classList.add("show");
      } else {
        backToTopButton.classList.remove("show");
      }
    }
    ticking = false;
  }

  window.addEventListener("scroll", function () {
    if (!ticking) {
      requestAnimationFrame(updateScrollUI);
      ticking = true;
    }
  }, { passive: true });

  updateScrollUI();

  if (backToTopButton) {
    backToTopButton.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  if (scrollBar) {
    scrollBar.addEventListener("click", function (e) {
      var rect = scrollBar.getBoundingClientRect();
      var percent = (e.clientY - rect.top) / rect.height;
      var docHeight = document.documentElement.scrollHeight - window.innerHeight;
      window.scrollTo({ top: percent * docHeight, behavior: "smooth" });
    });
  }

  /* ---------- Scroll reveal ---------- */

  var revealObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
        // Once the entrance finishes, drop .reveal so the element's own
        // transitions (e.g. the project-card hover lift) take over again.
        entry.target.addEventListener("transitionend", function (event) {
          if (event.target !== entry.target || event.propertyName !== "opacity") return;
          entry.target.classList.remove("reveal");
        });
      }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });

  function observeReveals(scope) {
    (scope || document).querySelectorAll(".reveal").forEach(function (el) {
      // Stagger grouped elements (cards in a row, etc.) with a small delay.
      var index = 0;
      var sibling = el.previousElementSibling;
      while (sibling) {
        if (sibling.classList && sibling.classList.contains("reveal")) index++;
        sibling = sibling.previousElementSibling;
      }
      el.style.setProperty("--reveal-delay", Math.min(index, 5) * 0.09 + "s");
      revealObserver.observe(el);
    });
  }

  // Attach reveal animation to static page elements.
  var revealTargets = document.querySelectorAll(
    ".about-photo, .about-text, .tech-category, " +
    ".github-stat-card, .github-panel, .github-languages-head, .github-languages, " +
    ".contact-grid, .contact-inner, .section-projects .section-title, " +
    ".section-projects .section-sub, .section-tech .section-title, " +
    ".section-github .text-center, .section-contact-form .text-center"
  );
  revealTargets.forEach(function (el) {
    el.classList.add("reveal");
  });

  // Directional reveals: the about photo slides in from the left, the about
  // text from the right, and the GitHub panel scales up gently.
  document.querySelectorAll(".about-photo").forEach(function (el) { el.classList.add("reveal-left"); });
  document.querySelectorAll(".about-text").forEach(function (el) { el.classList.add("reveal-right"); });
  document.querySelectorAll(".github-panel").forEach(function (el) { el.classList.add("reveal-zoom"); });

  observeReveals(document);

  /* ---------- Contact form (validates, then opens the email client) ---------- */

  var contactForm = $("contactForm");
  var submitBtn = $("submitBtn");
  var submitText = $("submitText");
  var submitLoading = $("submitLoading");
  var formMessage = $("formMessage");
  var messageText = $("messageText");
  var messageInput = $("message");

  function detectGibberish(text) {
    var errors = [];
    var cleanText = text.trim().replace(/\s+/g, " ");

    if (cleanText.length < 10) {
      errors.push("Message must be at least 10 characters long");
    }

    var words = cleanText.split(" ").filter(function (word) { return word.length > 0; });
    if (words.length < 3) {
      errors.push("Message must contain at least 3 words");
    }

    if (/(.)\1{4,}/.test(cleanText)) {
      errors.push("Message contains too many repeated characters");
    }

    var wordCounts = {};
    words.forEach(function (word) {
      var cleanWord = word.toLowerCase().replace(/[^\w]/g, "");
      if (cleanWord.length > 2) {
        wordCounts[cleanWord] = (wordCounts[cleanWord] || 0) + 1;
      }
    });
    var repeated = Object.keys(wordCounts).filter(function (word) {
      return wordCounts[word] > 2;
    });
    if (repeated.length > 0) {
      errors.push("Message contains too many repeated words");
    }

    var randomPatterns = [/asdfgh/i, /qwerty/i, /zxcvbn/i, /123456/i, /abcdef/i, /[!@#$%^&*]{3,}/];
    for (var i = 0; i < randomPatterns.length; i++) {
      if (randomPatterns[i].test(cleanText)) {
        errors.push("Message contains random character sequences");
        break;
      }
    }

    if (/[0-9]{4,}/.test(cleanText)) {
      errors.push("Message contains random number sequences");
    }

    var meaningful = words.filter(function (word) { return word.length >= 3; });
    if (meaningful.length < 2) {
      errors.push("Message must contain meaningful words (3+ characters)");
    }

    var punctuation = (cleanText.match(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/g) || []).length;
    if (punctuation > cleanText.length * 0.3) {
      errors.push("Message contains too much punctuation");
    }

    return { isValid: errors.length === 0, errors: errors };
  }

  function clearFieldFeedback() {
    if (messageInput) {
      messageInput.classList.remove("is-error", "is-valid");
      var old = messageInput.parentElement.querySelector(".validation-error");
      if (old) old.remove();
      var oldOk = messageInput.parentElement.querySelector(".validation-success");
      if (oldOk) oldOk.remove();
    }
  }

  function showFormMessage(html, type) {
    messageText.innerHTML = html;
    formMessage.className = "form-message " + type;
    formMessage.hidden = false;
  }

  if (messageInput) {
    var validationTimeout;

    messageInput.addEventListener("input", function () {
      clearTimeout(validationTimeout);
      validationTimeout = setTimeout(function () {
        clearFieldFeedback();
        var value = this.value;
        if (!value.trim()) return;

        var validation = detectGibberish(value);
        if (!validation.isValid) {
          messageInput.classList.add("is-error");
          var errorDiv = document.createElement("div");
          errorDiv.className = "validation-error";
          errorDiv.textContent = validation.errors.join(" ");
          messageInput.parentElement.appendChild(errorDiv);
          setTimeout(function () {
            if (errorDiv.parentNode) errorDiv.remove();
          }, 4000);
        } else {
          messageInput.classList.add("is-valid");
          var okDiv = document.createElement("div");
          okDiv.className = "validation-success";
          okDiv.textContent = "Message looks good!";
          messageInput.parentElement.appendChild(okDiv);
          setTimeout(function () {
            if (okDiv.parentNode) okDiv.remove();
          }, 2500);
        }
      }.bind(this), 450);
    });

    messageInput.addEventListener("focus", function () {
      clearTimeout(validationTimeout);
      clearFieldFeedback();
    });
  }

  if (contactForm) {
    contactForm.addEventListener("submit", function (e) {
      e.preventDefault();

      var data = new FormData(contactForm);
      var firstName = String(data.get("firstName") || "").trim();
      var lastName = String(data.get("lastName") || "").trim();
      var email = String(data.get("email") || "").trim();
      var subject = String(data.get("subject") || "").trim();
      var message = String(data.get("message") || "").trim();

      if (!firstName || !lastName || !email || !subject || !message) {
        showFormMessage("Please fill in every field before sending.", "error");
        return;
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showFormMessage("Please enter a valid email address.", "error");
        return;
      }

      var validation = detectGibberish(message);
      if (!validation.isValid) {
        showFormMessage("Please fix the following issues: " + validation.errors.join(" "), "error");
        return;
      }

      submitBtn.disabled = true;
      submitText.hidden = true;
      submitLoading.hidden = false;

      var targetEmail = profile.email || PROFILE_DEFAULTS.email;
      var mailto = "mailto:" + targetEmail +
        "?subject=" + encodeURIComponent("Portfolio Contact: " + subject) +
        "&body=" + encodeURIComponent(
          "Name: " + firstName + " " + lastName + "\n" +
          "Email: " + email + "\n" +
          "Subject: " + subject + "\n\n" +
          message
        );

      window.location.href = mailto;

      setTimeout(function () {
        submitBtn.disabled = false;
        submitText.hidden = false;
        submitLoading.hidden = true;
        contactForm.reset();
        showFormMessage("Your email client should open with the message ready to send.", "success");
      }, 1200);
    });
  }

  /* ---------- GitHub activity ---------- */

  var githubReposEl = $("githubRepos");
  var githubStarsEl = $("githubStars");
  var githubFollowersEl = $("githubFollowers");
  var githubCommitsEl = $("githubCommits");
  var githubActivityEl = $("githubActivity");
  var githubLanguagesEl = $("githubLanguages");
  var githubProfileLink = $("github-profile-link");

  function setStat(id, value) {
    var el = $(id);
    if (el) el.textContent = value;
  }

  // Renders one row of the activity feed: a small accent diamond, the event
  // text, a type tag + date, and an "Open" link. No icon circles — the feed
  // is deliberately simpler than the original template.
  function activityItem(event) {
    var repoName = (event.repo && event.repo.name) || "Unknown Repository";
    var createdAt = new Date(event.created_at).toLocaleDateString(undefined, {
      year: "numeric", month: "short", day: "numeric"
    });
    var label, text;

    switch (event.type) {
      case "PushEvent":
        label = "Push";
        text = "Pushed to " + repoName;
        break;
      case "CreateEvent":
        label = "Create";
        text = "Created " + repoName;
        break;
      case "ForkEvent":
        label = "Fork";
        text = "Forked " + repoName;
        break;
      case "WatchEvent":
        label = "Star";
        text = "Starred " + repoName;
        break;
      default:
        label = "Activity";
        text = "Activity in " + repoName;
    }

    var item = document.createElement("div");
    item.className = "gh-activity-item";
    item.innerHTML =
      '<span class="gh-activity-dot" aria-hidden="true"></span>' +
      '<div class="gh-activity-body">' +
        '<p class="gh-activity-text">' + esc(text) + "</p>" +
        '<div class="gh-activity-meta">' +
          '<span class="gh-activity-type">' + esc(label) + "</span>" +
          '<span class="gh-activity-date">' + esc(createdAt) + "</span>" +
        "</div>" +
      "</div>" +
      '<a class="gh-activity-link" href="https://github.com/' + esc(repoName) +
      '" target="_blank" rel="noopener" aria-label="Open ' + esc(repoName) +
      ' on GitHub">Open</a>';
    return item;
  }

  function langCard(language, count) {
    var card = document.createElement("div");
    card.className = "github-lang-card glow-card";
    card.innerHTML =
      '<div class="github-lang-name">' + esc(language) + "</div>" +
      '<div class="github-lang-count">' + count + " repositories</div>";
    return card;
  }

  function showGithubPlaceholder() {
    setStat("githubRepos", "-");
    setStat("githubStars", "-");
    setStat("githubFollowers", "-");
    setStat("githubCommits", "-");
    githubActivityEl.innerHTML = '<p class="github-placeholder">Set GITHUB_USERNAME in script.js to load GitHub stats.</p>';
    githubLanguagesEl.innerHTML = "";
  }

  function loadGitHubData() {
    if (!GITHUB_USERNAME || !githubReposEl) {
      showGithubPlaceholder();
      return;
    }

    if (githubProfileLink) {
      githubProfileLink.href = "https://github.com/" + GITHUB_USERNAME;
    }

    var endpoints = {
      user: "https://api.github.com/users/" + GITHUB_USERNAME,
      repos: "https://api.github.com/users/" + GITHUB_USERNAME + "/repos",
      activity: "https://api.github.com/users/" + GITHUB_USERNAME + "/events"
    };

    function fallback() {
      setStat("githubRepos", "-");
      setStat("githubStars", "-");
      setStat("githubFollowers", "-");
      setStat("githubCommits", "-");
      githubActivityEl.innerHTML = '<p class="github-placeholder">Could not load GitHub activity right now.</p>';
      githubLanguagesEl.innerHTML = "";
    }

    fetch(endpoints.user)
      .then(function (res) {
        if (!res.ok) throw new Error("user");
        return res.json();
      })
      .then(function (userData) {
        return fetch(endpoints.repos).then(function (res) {
          if (!res.ok) throw new Error("repos");
          return res.json();
        }).then(function (reposData) {
          return { userData: userData, reposData: reposData };
        });
      })
      .then(function (data) {
        var userData = data.userData;
        var reposData = data.reposData;

        setStat("githubRepos", userData.public_repos);
        setStat("githubFollowers", userData.followers);

        var totalStars = reposData.reduce(function (sum, repo) {
          return sum + (repo.stargazers_count || 0);
        }, 0);
        setStat("githubStars", totalStars);

        // Recent commits via the search API
        var thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        var since = thirtyDaysAgo.toISOString().split("T")[0];
        return fetch(
          "https://api.github.com/search/commits?q=author:" + GITHUB_USERNAME +
          "+committer-date:>" + since
        ).then(function (res) {
          if (res.ok) return res.json();
          return null;
        }).then(function (commitsData) {
          setStat("githubCommits", commitsData ? commitsData.total_count : "-");
        }).then(function () {
          // Activity feed
          return fetch(endpoints.activity).then(function (res) {
            if (!res.ok) throw new Error("activity");
            return res.json();
          }).then(function (activityData) {
            githubActivityEl.innerHTML = "";
            activityData.slice(0, 5).forEach(function (event) {
              githubActivityEl.appendChild(activityItem(event));
            });
          }).catch(function () {
            githubActivityEl.innerHTML = '<p class="github-placeholder">Could not load recent activity.</p>';
          });
        }).then(function () {
          // Language stats
          var languageStats = {};
          reposData.forEach(function (repo) {
            if (repo.language) {
              languageStats[repo.language] = (languageStats[repo.language] || 0) + 1;
            }
          });
          var sorted = Object.keys(languageStats)
            .sort(function (a, b) { return languageStats[b] - languageStats[a]; })
            .slice(0, 6);
          githubLanguagesEl.innerHTML = "";
          if (!sorted.length) {
            githubLanguagesEl.innerHTML = '<p class="github-placeholder">No language data available.</p>';
          } else {
            sorted.forEach(function (language) {
              githubLanguagesEl.appendChild(langCard(language, languageStats[language]));
            });
          }
        });
      })
      .catch(function () {
        fallback();
      });
  }

  /* ---------- Footer year ---------- */

  var footerYear = $("footer-year");
  if (footerYear) footerYear.textContent = String(new Date().getFullYear());

  /* ---------- Cards: mouse-following glow ---------- */
  // Tracks the cursor over whichever .glow-card it is on and stores the
  // local position in --mx/--my; the radial gradient in .glow-card::before
  // follows it around the card (and its edges) on hover.
  document.addEventListener("pointermove", function (event) {
    var card = event.target && event.target.closest
      ? event.target.closest(".glow-card")
      : null;
    if (!card) return;
    var rect = card.getBoundingClientRect();
    card.style.setProperty("--mx", Math.round(event.clientX - rect.left) + "px");
    card.style.setProperty("--my", Math.round(event.clientY - rect.top) + "px");
  }, { passive: true });

  /* ---------- Init ---------- */

  renderProfile(); // defaults first, real values once profile.json loads
  renderPhoto();
  loadGitHubData();

  loadData().then(function () {
    renderProfile();
    renderPhoto();
    renderProjects();
    hideLoader(profile.username || profile.name);
  });

  // Safety net: never leave the loading screen up.
  setTimeout(function () { hideLoader(); }, 4000);
})();
