/* ==========================================================================
   Portfolio admin tool.
   Loads profile.json + projects.json, lets you edit them in a form, and
   saves them back through the local server (server.js). Requires the server:
   run "node server.js" and open http://localhost:3000/admin/
   ========================================================================== */

(function () {
  "use strict";

  var profile = null;
  var projects = [];
  var pendingPhoto = null;   // { dataUrl, ext } from a newly selected file
  var photoRemoved = false;  // true when the user asked to remove the photo

  var $ = function (id) { return document.getElementById(id); };

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

  function showStatus(message, type) {
    var el = $("status");
    el.textContent = message;
    el.className = "admin-status " + (type || "");
  }

  function initialsOf(name) {
    var parts = String(name || "").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "P";
    return parts.slice(0, 2).map(function (part) { return part.charAt(0).toUpperCase(); }).join("");
  }

  /* ---------- Data loading ---------- */

  function loadJSON(url) {
    return fetch(url, { cache: "no-store" }).then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    });
  }

  function postJSON(url, payload) {
    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }).then(function (res) {
      // Read the body as text first: when the admin page is served by a
      // plain static server instead of server.js, POST /api/* answers with
      // an HTML error page, and res.json() would fail with a cryptic
      // "unexpected character" error. Name the real cause instead.
      return res.text().then(function (raw) {
        var data = null;
        try {
          data = JSON.parse(raw);
        } catch (err) {
          throw new Error(
            "the save endpoint returned " +
            (raw ? "an HTML/error page (HTTP " + res.status + ") instead of JSON" : "an empty response (HTTP " + res.status + ")") +
            ". This admin tool must be served by the local server: run \"node server.js\" in the project root, then open http://localhost:3000/admin/"
          );
        }
        if (!res.ok || !data.ok) {
          throw new Error((data && data.error) || ("HTTP " + res.status));
        }
        return data;
      });
    });
  }

  // Probes whether the local server's API is reachable. POSTing an empty
  // object to /api/photo is safe: it is rejected with a JSON 400 without
  // writing anything, while a static server answers with a non-JSON page.
  function probeApi() {
    return fetch("../api/photo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}"
    }).then(function (res) {
      return res.text().then(function (raw) {
        try {
          var data = JSON.parse(raw);
          return typeof data === "object" && data !== null;
        } catch (err) {
          return false;
        }
      });
    }).catch(function () {
      return false;
    });
  }

  function loadData() {
    Promise.all([loadJSON("../profile.json"), loadJSON("../projects.json")])
      .then(function (results) {
        profile = results[0] || {};
        projects = (results[1] && Array.isArray(results[1].projects)) ? results[1].projects : [];
        populateProfile();
        renderProjectCards();
        // The JSON files load fine on any static host, but saving needs the
        // local server's API. Probe it so the notice shows up front instead
        // of the first save failing with a confusing error.
        probeApi().then(function (apiUp) {
          if (!apiUp) {
            $("notice-title").textContent =
              "The save endpoints are not available - this admin page is not being served by the local server (node server.js).";
            $("load-notice").hidden = false;
          } else {
            $("load-notice").hidden = true;
          }
        });
      })
      .catch(function () {
        $("notice-title").textContent = "Could not load profile.json or projects.json.";
        $("load-notice").hidden = false;
      });
  }

  /* ---------- Profile tab ---------- */

  var photoPreview = $("photo-preview");
  var photoInitials = $("photo-initials");
  var photoImg = $("photo-img");
  var photoFile = $("photo-file");
  var photoRemove = $("photo-remove");

  function renderPhotoPreview() {
    // Priority: newly picked file, then removal state, then saved photo.
    if (pendingPhoto) {
      photoImg.src = pendingPhoto.dataUrl;
      photoImg.hidden = false;
      photoInitials.hidden = true;
      photoRemove.hidden = false;
      photoRemove.textContent = "Remove photo";
      return;
    }
    if (photoRemoved || !profile || !profile.photo) {
      photoImg.hidden = true;
      photoImg.removeAttribute("src");
      photoInitials.hidden = false;
      photoInitials.textContent = initialsOf(profile ? profile.name : "");
      photoRemove.hidden = false;
      photoRemove.textContent = "Keep placeholder";
      return;
    }
    photoImg.src = "../" + profile.photo;
    photoImg.hidden = false;
    photoInitials.hidden = true;
    photoRemove.hidden = false;
    photoRemove.textContent = "Remove photo";
  }

  function populateProfile() {
    $("p-name").value = profile.name || "";
    $("p-username").value = profile.username || "";
    $("p-role").value = profile.role || "";
    $("p-bio").value = profile.bio || "";
    $("p-email").value = profile.email || "";
    $("p-location").value = profile.location || "";
    var socials = profile.socials || {};
    $("p-instagram").value = socials.instagram || "";
    $("p-linkedin").value = socials.linkedin || "";
    $("p-github").value = socials.github || "";
    renderPhotoPreview();
  }

  $("p-name").addEventListener("input", function () {
    if (!photoImg.hidden) return;
    photoInitials.textContent = initialsOf($("p-name").value);
  });

  photoFile.addEventListener("change", function () {
    var file = photoFile.files && photoFile.files[0];
    if (!file) return;
    if (file.type.indexOf("image/") !== 0) {
      showStatus("Please choose an image file.", "error");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      showStatus("The image is larger than 4 MB. Please choose a smaller file.", "error");
      return;
    }
    var ext = (file.type.split("/")[1] || "png").toLowerCase();
    if (["png", "jpeg", "jpg", "webp", "gif"].indexOf(ext) === -1) {
      showStatus("Supported formats: PNG, JPG, WebP, GIF.", "error");
      return;
    }
    var reader = new FileReader();
    reader.onload = function () {
      pendingPhoto = { dataUrl: reader.result, ext: ext === "jpg" ? "jpeg" : ext };
      photoRemoved = false;
      renderPhotoPreview();
    };
    reader.readAsDataURL(file);
    photoFile.value = "";
  });

  photoRemove.addEventListener("click", function () {
    pendingPhoto = null;
    photoRemoved = true;
    renderPhotoPreview();
  });

  function saveProfile(event) {
    event.preventDefault();

    var payload = {
      name: $("p-name").value,
      username: $("p-username").value,
      role: $("p-role").value,
      bio: $("p-bio").value,
      email: $("p-email").value,
      location: $("p-location").value,
      socials: {
        instagram: $("p-instagram").value,
        linkedin: $("p-linkedin").value,
        github: $("p-github").value
      },
      photo: profile ? (profile.photo || "") : ""
    };

    var photoStep = Promise.resolve();

    if (pendingPhoto) {
      photoStep = postJSON("../api/photo", {
        dataUrl: pendingPhoto.dataUrl,
        ext: pendingPhoto.ext
      }).then(function (data) {
        payload.photo = data.path;
      });
    } else if (photoRemoved && profile && profile.photo) {
      photoStep = postJSON("../api/photo", { remove: true }).then(function () {
        payload.photo = "";
      });
    }

    photoStep
      .then(function () {
        return postJSON("../api/profile", payload);
      })
      .then(function () {
        showStatus("Profile saved to profile.json.", "success");
        profile = payload;
        pendingPhoto = null;
        photoRemoved = false;
        renderPhotoPreview();
      })
      .catch(function (err) {
        showStatus("Could not save the profile: " + err.message, "error");
      });
  }

  $("profile-form").addEventListener("submit", saveProfile);

  /* ---------- Projects tab ---------- */

  var projectList = $("project-list");

  function projectCardHTML(project, index) {
    var id = project.id || "";
    var title = project.title || "";
    var desc = project.desc || "";
    var tags = (project.tags || []).join(", ");
    var url = project.url || "";
    var source = project.source || "";
    var image = project.image || "";
    var isDataUrl = image.indexOf("data:") === 0;

    return (
      '<div class="project-edit-card" data-index="' + index + '">' +
        '<div class="project-edit-head">' +
          '<span class="project-edit-title">' + (esc(title) || "New project") + "</span>" +
          '<button class="admin-btn admin-btn-danger project-delete" type="button">Delete</button>' +
        "</div>" +
        '<div class="project-edit-body">' +
          '<div class="field">' +
            '<label for="pj-title-' + index + '">Title</label>' +
            '<input type="text" class="pj-title" id="pj-title-' + index + '" maxlength="80" placeholder="Project name" value="' + esc(title) + '">' +
          "</div>" +
          '<div class="field">' +
            '<label for="pj-desc-' + index + '">Description</label>' +
            '<textarea class="pj-desc" id="pj-desc-' + index + '" rows="3" maxlength="1000" placeholder="What does it do?">' + esc(desc) + "</textarea>" +
          "</div>" +
          '<div class="field">' +
            '<label for="pj-tags-' + index + '">Tags</label>' +
            '<input type="text" class="pj-tags" id="pj-tags-' + index + '" placeholder="React, TypeScript, API" value="' + esc(tags) + '">' +
          "</div>" +
          '<div class="field-row">' +
            '<div class="field">' +
              '<label for="pj-url-' + index + '">Live URL</label>' +
              '<input type="url" class="pj-url" id="pj-url-' + index + '" placeholder="https://example.com" value="' + esc(url) + '">' +
            "</div>" +
            '<div class="field">' +
              '<label for="pj-source-' + index + '">Source URL</label>' +
              '<input type="url" class="pj-source" id="pj-source-' + index + '" placeholder="https://github.com/you/repo" value="' + esc(source) + '">' +
            "</div>" +
          "</div>" +
          '<div class="field">' +
            '<label for="pj-image-' + index + '">Cover image URL</label>' +
            '<input type="url" class="pj-image-url" id="pj-image-url-' + index + '" placeholder="https://example.com/cover.png" value="' + (isDataUrl ? "" : esc(image)) + '">' +
          "</div>" +
          '<div class="project-edit-img-row">' +
            '<input type="file" class="pj-image-file" accept="image/*" aria-label="Upload cover image">' +
            '<img class="project-edit-img-preview' + (image ? " has-img" : "") + '" alt="Cover preview" src="' + esc(image) + '">' +
          "</div>" +
        "</div>" +
      "</div>"
    );
  }

  function renderProjectCards() {
    projectList.innerHTML = projects.map(projectCardHTML).join("");
  }

  function readProjectCard(card) {
    var index = Number(card.dataset.index);
    var existing = projects[index] || {};
    var imageUrl = card.querySelector(".pj-image-url").value.trim();
    var uploaded = card.querySelector(".project-edit-img-preview").getAttribute("src") || "";
    var image = imageUrl || (uploaded.indexOf("data:") === 0 ? uploaded : (existing.image || ""));

    return {
      id: existing.id || "",
      title: card.querySelector(".pj-title").value.trim(),
      desc: card.querySelector(".pj-desc").value.trim(),
      tags: card.querySelector(".pj-tags").value.split(",").map(function (tag) { return tag.trim(); }).filter(Boolean).slice(0, 8),
      url: card.querySelector(".pj-url").value.trim(),
      source: card.querySelector(".pj-source").value.trim(),
      image: image
    };
  }

  projectList.addEventListener("click", function (event) {
    var btn = event.target.closest(".project-delete");
    if (!btn) return;
    var card = btn.closest(".project-edit-card");
    var title = card.querySelector(".pj-title").value.trim() || "this project";
    if (!window.confirm('Delete "' + title + '" from projects.json?')) return;
    var index = Number(card.dataset.index);
    projects.splice(index, 1);
    renderProjectCards();
  });

  projectList.addEventListener("change", function (event) {
    var fileInput = event.target.closest(".pj-image-file");
    if (!fileInput) return;
    var file = fileInput.files && fileInput.files[0];
    if (!file) return;
    if (file.type.indexOf("image/") !== 0) {
      showStatus("Please choose an image file.", "error");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showStatus("Cover images must be smaller than 2 MB.", "error");
      return;
    }
    var reader = new FileReader();
    reader.onload = function () {
      var card = fileInput.closest(".project-edit-card");
      var preview = card.querySelector(".project-edit-img-preview");
      preview.src = reader.result;
      preview.classList.add("has-img");
      card.querySelector(".pj-image-url").value = "";
    };
    reader.readAsDataURL(file);
    fileInput.value = "";
  });

  $("add-project").addEventListener("click", function () {
    projects.push({});
    renderProjectCards();
  });

  $("projects-form").addEventListener("submit", function (event) {
    event.preventDefault();

    var cards = projectList.querySelectorAll(".project-edit-card");
    var list = Array.prototype.map.call(cards, readProjectCard);

    postJSON("../api/projects", { projects: list })
      .then(function () {
        showStatus("Projects saved to projects.json.", "success");
        projects = list;
        renderProjectCards();
      })
      .catch(function (err) {
        showStatus("Could not save projects: " + err.message, "error");
      });
  });

  /* ---------- Tabs ---------- */

  function switchTab(tabName) {
    var tabs = { profile: "tab-profile", projects: "tab-projects" };
    var panels = { profile: "panel-profile", projects: "panel-projects" };

    Object.keys(tabs).forEach(function (name) {
      var isActive = name === tabName;
      $(tabs[name]).classList.toggle("is-active", isActive);
      $(tabs[name]).setAttribute("aria-selected", String(isActive));
      $(panels[name]).hidden = !isActive;
      $(panels[name]).classList.toggle("is-active", isActive);
    });
  }

  $("tab-profile").addEventListener("click", function () { switchTab("profile"); });
  $("tab-projects").addEventListener("click", function () { switchTab("projects"); });

  /* ---------- Init ---------- */

  loadData();
})();