import { useEffect, useMemo, useState } from "react";

/* profile.json stays the source of truth, exactly like the original site:
   it lives in public/ and is fetched at runtime (no rebuild needed to edit). */
const PROFILE_DEFAULTS = {
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

function splitRoles(role) {
  const seen = new Set();
  return String(role || "")
    .split(",")
    .reduce((acc, part) => {
      return acc.concat(
        part.split(/\band\b|\bor\b/i).map((piece) => piece.trim()).filter(Boolean)
      );
    }, [])
    .filter((item) => {
      const key = item.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function initialsOf(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "P";
  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export function useProfile() {
  const [profile, setProfile] = useState(PROFILE_DEFAULTS);

  useEffect(() => {
    let alive = true;
    fetch("profile.json", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("HTTP " + res.status))))
      .then((data) => {
        if (!alive) return;
        setProfile((prev) => ({
          ...prev,
          ...data,
          socials: { ...prev.socials, ...(data.socials || {}) }
        }));
      })
      .catch(() => { /* keep defaults, like the original */ });
    return () => { alive = false; };
  }, []);

  const roles = useMemo(
    () => splitRoles(profile.role || PROFILE_DEFAULTS.role),
    [profile.role]
  );
  const initials = useMemo(
    () => initialsOf(profile.name || PROFILE_DEFAULTS.name),
    [profile.name]
  );

  return { profile, roles, initials };
}

export { PROFILE_DEFAULTS, splitRoles, initialsOf };
