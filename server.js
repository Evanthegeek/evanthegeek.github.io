#!/usr/bin/env node
/* ==========================================================================
   Local developer server for the portfolio and its admin tool.

   The main site is fully static (HTML/CSS/JS + profile.json + projects.json)
   and can be published to any static host. A browser cannot write files, so
   the admin tool in /admin/ talks to this small server, which writes
   profile.json, projects.json, and uploaded photos into the repo.

   Run:          node server.js
   Main site:    http://localhost:3000
   Admin tool:   http://localhost:3000/admin

   Local only: this binds to 127.0.0.1 and must NOT be deployed. The /admin/
   folder and server.js are meant for your machine; publish the rest.
   ========================================================================== */

"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const HOST = "127.0.0.1";
const PORT = Number(process.env.PORT) || 3000;
const MAX_BODY_BYTES = 20 * 1024 * 1024; // 20 MB (base64 photos included)

const PROFILE_FILE = path.join(ROOT, "profile.json");
const PROJECTS_FILE = path.join(ROOT, "projects.json");
const ASSETS_DIR = path.join(ROOT, "assets");
const ALLOWED_PHOTO_EXTS = ["png", "jpg", "jpeg", "webp", "gif"];
const ALLOWED_PHOTO_BYTES = 4 * 1024 * 1024; // decoded image size cap

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".pdf": "application/pdf"
};

/* ---------- Small helpers ---------- */

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store"
  });
  res.end(body);
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (err) {
    return null;
  }
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n", "utf8");
}

function text(value, maxLength) {
  return typeof value === "string" ? value.slice(0, maxLength) : "";
}

function url(value) {
  const raw = text(value, 2000).trim();
  if (!raw) return "";
  try {
    const parsed = new URL(raw);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.href;
    }
  } catch (err) { /* not a URL */ }
  return "";
}

function coverImage(value) {
  // Project covers: allow http(s) URLs or inline base64 data URLs (uploaded
  // covers are embedded in projects.json so the static site needs no server).
  const raw = text(value, 5 * 1024 * 1024).trim();
  if (!raw) return "";
  if (raw.indexOf("data:image/") === 0) return raw;
  return url(raw);
}

function tags(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter(function (tag) { return typeof tag === "string"; })
    .map(function (tag) { return tag.trim().slice(0, 40); })
    .filter(Boolean)
    .slice(0, 8);
}

function deleteAssetFile(photoPath) {
  // Only ever delete files we manage in assets/.
  if (typeof photoPath !== "string" || !photoPath) return;
  if (photoPath.indexOf("..") !== -1) return;
  const full = path.join(ROOT, photoPath);
  if (!full.startsWith(ASSETS_DIR + path.sep)) return;
  try {
    fs.unlinkSync(full);
  } catch (err) { /* file already gone */ }
}

/* ---------- API handlers ---------- */

function handleProfile(req, res, body) {
  const incoming = body && typeof body === "object" ? body : {};
  const previous = readJson(PROFILE_FILE) || {};

  const profile = {
    username: text(incoming.username, 40).trim(),
    name: text(incoming.name, 80).trim() || "Your Name",
    role: text(incoming.role, 120).trim() || "Software Engineer",
    bio: text(incoming.bio, 3000).trim(),
    email: text(incoming.email, 254).trim(),
    location: text(incoming.location, 120).trim(),
    socials: {
      instagram: url(incoming.socials && incoming.socials.instagram),
      linkedin: url(incoming.socials && incoming.socials.linkedin),
      github: url(incoming.socials && incoming.socials.github)
    },
    photo: text(incoming.photo, 500)
  };

  // Drop the previous uploaded photo when it was replaced or removed.
  if (previous.photo && previous.photo !== profile.photo) {
    deleteAssetFile(previous.photo);
  }

  writeJson(PROFILE_FILE, profile);
  sendJson(res, 200, { ok: true, profile: profile });
}

function handleProjects(req, res, body) {
  const incoming = body && typeof body === "object" ? body : {};
  const previous = readJson(PROJECTS_FILE) || {};

  if (!Array.isArray(incoming.projects)) {
    sendJson(res, 400, { ok: false, error: "projects must be an array" });
    return;
  }

  const projects = incoming.projects.slice(0, 200).map(function (project) {
    return {
      id: text(project.id, 80) || "p_" + Math.random().toString(36).slice(2, 10),
      title: text(project.title, 80).trim(),
      desc: text(project.desc, 1000).trim(),
      tags: tags(project.tags),
      url: url(project.url),
      source: url(project.source),
      image: coverImage(project.image)
    };
  }).filter(function (project) { return project.title; });

  // Keep the _readme field that documents the schema.
  const output = { _readme: previous._readme || "Projects shown on the portfolio site.", projects: projects };
  writeJson(PROJECTS_FILE, output);
  sendJson(res, 200, { ok: true, count: projects.length });
}

function handlePhoto(req, res, body) {
  const incoming = body && typeof body === "object" ? body : {};
  const previous = readJson(PROFILE_FILE) || {};

  // { remove: true } deletes the current uploaded photo and clears the
  // reference in profile.json so the site never points at a missing file.
  if (incoming.remove) {
    if (previous.photo) deleteAssetFile(previous.photo);
    if (previous.photo) {
      previous.photo = "";
      writeJson(PROFILE_FILE, previous);
    }
    sendJson(res, 200, { ok: true, path: "" });
    return;
  }

  const dataUrl = text(incoming.dataUrl, MAX_BODY_BYTES);
  const ext = text(incoming.ext, 10).toLowerCase().replace(/[^a-z0-9]/g, "");
  if (ALLOWED_PHOTO_EXTS.indexOf(ext) === -1) {
    sendJson(res, 400, { ok: false, error: "unsupported image type" });
    return;
  }
  const match = dataUrl.match(/^data:image\/[a-z0-9.+-]+;base64,(.+)$/);
  if (!match) {
    sendJson(res, 400, { ok: false, error: "expected a base64 data URL" });
    return;
  }

  let buffer;
  try {
    buffer = Buffer.from(match[1], "base64");
  } catch (err) {
    sendJson(res, 400, { ok: false, error: "could not decode image" });
    return;
  }
  if (!buffer.length || buffer.length > ALLOWED_PHOTO_BYTES) {
    sendJson(res, 400, { ok: false, error: "image is empty or larger than 4 MB" });
    return;
  }

  if (!fs.existsSync(ASSETS_DIR)) fs.mkdirSync(ASSETS_DIR, { recursive: true });

  const fileName = "profile." + ext;
  const full = path.join(ASSETS_DIR, fileName);
  fs.writeFileSync(full, buffer);

  if (previous.photo && previous.photo !== "assets/" + fileName) {
    deleteAssetFile(previous.photo);
  }

  sendJson(res, 200, { ok: true, path: "assets/" + fileName });
}

/* ---------- Static file serving ---------- */

function serveStatic(req, res, pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch (err) {
    sendJson(res, 400, { ok: false, error: "bad request path" });
    return;
  }

  let filePath = path.normalize(path.join(ROOT, decoded));
  if (filePath !== ROOT && !filePath.startsWith(ROOT + path.sep)) {
    sendJson(res, 403, { ok: false, error: "forbidden" });
    return;
  }

  try {
    if (fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, "index.html");
    }
  } catch (err) {
    sendJson(res, 404, { ok: false, error: "not found" });
    return;
  }

  fs.readFile(filePath, function (err, data) {
    if (err) {
      sendJson(res, 404, { ok: false, error: "not found" });
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Content-Length": data.length,
      "Cache-Control": "no-cache"
    });
    res.end(data);
  });
}

/* ---------- Server ---------- */

const server = http.createServer(function (req, res) {
  const urlObj = new URL(req.url, "http://" + HOST + ":" + PORT);
  const pathname = urlObj.pathname;

  if (req.method === "POST") {
    const chunks = [];
    let size = 0;
    req.on("data", function (chunk) {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        res.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", function () {
      let body = {};
      try {
        body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
      } catch (err) {
        sendJson(res, 400, { ok: false, error: "invalid JSON body" });
        return;
      }
      if (pathname === "/api/profile") handleProfile(req, res, body);
      else if (pathname === "/api/projects") handleProjects(req, res, body);
      else if (pathname === "/api/photo") handlePhoto(req, res, body);
      else sendJson(res, 404, { ok: false, error: "unknown endpoint" });
    });
    return;
  }

  if (req.method === "GET" || req.method === "HEAD") {
    const indexPath = pathname === "/" ? "/index.html" : pathname;
    serveStatic(req, res, indexPath);
    return;
  }

  sendJson(res, 405, { ok: false, error: "method not allowed" });
});

server.listen(PORT, HOST, function () {
  console.log("Portfolio + admin server running locally:");
  console.log("  Main site: http://localhost:" + PORT + "/");
  console.log("  Admin tool: http://localhost:" + PORT + "/admin/");
  console.log("Local only — this server is not for deployment.");
});