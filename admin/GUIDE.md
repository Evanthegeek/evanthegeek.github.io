# Editing Guide (private)

> This guide is for you, the site owner. It is **not part of the published
> site** — do not deploy `admin/`, `server.js`, or this file. The published
> site is: `index.html`, `styles.css`, `script.js`, `profile.json`,
> `projects.json`, and `assets/`.

## The big picture

Your site is a **static site + a small local server**:

- The **published site** is plain HTML/CSS/JS. It reads two JSON files
  (`profile.json`, `projects.json`) on load and renders them. Any static host
  (GitHub Pages, Netlify, a folder on a VPS) can serve it.
- The **admin tool** (`admin/`) is how you edit those JSON files without
  touching code. Because a browser cannot write files, it talks to
  `server.js`, a tiny local Node server that writes the JSON files (and
  uploaded photos) into the repo for you.
- After you click Save in the admin tool, commit the changed files and push.
  That is your publish step.

## File map

| File                | Role                                                        |
| ------------------- | ----------------------------------------------------------- |
| `index.html`        | Page structure: hero, about, tech stack, GitHub activity, projects, contact form, contact, footer |
| `styles.css`        | All styling, both themes, via CSS variables                 |
| `script.js`         | All behavior: rendering profile/projects, canvas effects, card glow, contact form, GitHub stats |
| `profile.json`      | Your identity: username, name, role, bio, email, location, socials, photo |
| `projects.json`     | Your project cards                                          |
| `assets/`           | Uploaded photos plus `favicon.svg` (the browser-tab icon)    |
| `server.js`         | Local server + save endpoints (never deploy)                |
| `admin/`            | The admin tool and this guide (never deploy)                |
| `README.md`         | Public-facing docs; safe to publish                         |

## Content model

### profile.json

```json
{
  "username": "janedoe",
  "name": "Jane Doe",
  "role": "Software Engineer, Game Developer",
  "bio": "A few sentences about you.",
  "email": "jane@example.com",
  "location": "Berlin, Germany",
  "socials": { "instagram": "https://...", "linkedin": "https://...", "github": "https://..." },
  "photo": "assets/profile.jpg"
}
```

Where each field shows up:

- `username` — the loading screen letters. The site takes the first 16
  alphanumeric characters, uppercased (longer names automatically use a
  smaller font so nothing is cut off). The letters render in the Iceberg
  Google font (loaded in `index.html`, with Special Gothic Expanded One as a
  fallback). The animation is a flowy sequence: each letter rises up with a
  springy overshoot and a small random tilt, keeps floating in a gentle
  wave, its gold glow breathes softly, and then the whole word swells up
  large (`loaderExpand`, scale 1.35) before the screen dissolves with a
  blur.
- `name` — hero heading ("Hey, I'm ..."), the About section, the footer, and
  the browser tab title.
- `role` — the hero subheader and the About heading. Separate multiple
  roles with commas, and the words "and"/"or" also act as separators, so
  "Game and web developer" becomes two roles (duplicates are dropped). Both
  the hero subheader and the About heading type each role out, backspace,
  and move to the next (randomized typing speed). The two run in sync — the
  same phases and speeds — but always show different roles, cycling through
  every role in a random order (one shuffled deck dealt two at a time, and
  the deck is re-shuffled so a display never repeats the role it just
  showed). With a single role or reduced-motion enabled, both show the text
  statically.
- `bio`, `email`, `location` — About text, the fixed email on the left edge,
  and the contact section.
- `socials` — the About icon circles and the contact buttons.
- `photo` — the profile picture. Empty string shows your initials instead.

### projects.json

Each entry: `id`, `title`, `desc`, `tags` (array), `url`, `source`,
`image`. Only `title` is required. `image` can be a URL or an uploaded
data URL (the admin tool handles both). Common tags automatically get a
devicon icon; unknown tags show as plain text chips.

### index.html static sections (Tech Stack)

The Tech Stack items are plain HTML in `index.html` — each
`<span class="tech-item">` inside a `tech-*` category shows a Devicon icon
plus a text label. Rules to remember:

- Every category div must use the exact class `tech-category` (note the
  spelling). Script.js adds the scroll-reveal animation to all
  `.tech-category` elements automatically, so a new category just needs
  that class to animate in sync with the others.
- Keep the label as real text after the `<img>` — a `data-tag` attribute
  alone does not render anything.
- Technologies with no Devicon icon (e.g. GDScript) work fine as
  text-only chips: `<span class="tech-item">GDScript</span>`.
- Devicon logos that are pure black (GitHub, AWS, Unity, Unreal Engine,
  Express, ...) would vanish on the dark background. They get a white chip
  through the `.tech-item img[src*=...]` selector in `styles.css` — when
  you add a new dark logo, append its URL fragment to that selector.

## Where things live in script.js

The file is one big IIFE (an `(function () { ... })()` wrapper), and each
feature has a section comment:

- `Theme` — light/dark toggle and canvas recolor
- `Loading screen` — `renderLoaderLetters()` + `hideLoader()` (letters rise
  with a springy overshoot + random tilt via `--tilt`, float in a wave,
  then the word swells with `loaderExpand` before the loader fades with a
  blur)
- `Profile rendering` — `renderProfile()` fills every name/email/link;
  it also starts the role-typing animation (`startRoleTypers()`, fed by
  `splitRoles()`)
- `Projects rendering` — builds the cards from `projects.json`
- `Data loading` — `loadData()` fetches both JSON files
- `HERO: line-waves WebGL background` — the animated hero canvas
- `PROJECTS: particle network background` — the projects section canvas
- `Scroll progress bar + back to top`
- `Scroll reveal` — `IntersectionObserver` adds `.is-visible` to `.reveal`
  elements as you scroll; directional variants (`reveal-left/right/zoom`),
  per-sibling stagger (`--reveal-delay`), and a blur-to-sharp fade. After the
  entrance, `.reveal` is removed so the element's own transitions (e.g.
  project-card hover) work again. When a `.section-title` (or a container
  around one) becomes visible, its gold underline draws itself on
  left-to-right — the rule lives in `styles.css` on `.section-title::after`
- `Cards: mouse-following glow` — a delegated `pointermove` listener writes
  the cursor position (`--mx`/`--my`) onto whichever `.glow-card` is hovered;
  `styles.css` draws a thin gold ring that follows the cursor around the
  card's outline only (the interior stays clear — it is masked away). Give
  any card the `glow-card` class to opt in
- `Contact form` — validation + opens the email client
- `GitHub activity` — stats/feed/languages from the GitHub API
  (`activityItem()` builds each row: a small gold diamond + type tag + date
  and an "Open" link — no icon circles, deliberately unlike the template)

## Styling: the theme variables

`styles.css` starts with `:root` (dark theme) and
`[data-theme="light"]` (light theme) variable blocks. Nearly every color in
the design goes through these, so restyling is one place:

```css
:root {
  --bg: #000000;          /* deepest sections (hero, about, tech, projects) */
  --bg-alt: #030303;      /* alternate (slightly lighter) sections */
  --surface: #000000;     /* cards are pitch black */
  --surface-2: #030303;   /* nested rows / small surfaces */
  --seam-shadow: rgba(0, 0, 0, 0.6);     /* black-only blend at section seams */
  --seam-hover: rgba(228, 230, 238, 0.5); /* silver seam lines, shown on hover */
  --text: ...;
  --text-soft: ...;
  --gold: #b08d30;        /* main accent (deliberately muted brass) */
  --gold-strong: ...;
  --gold-deep: ...;
  --gold-stroke: rgba(176, 141, 48, 0.75); /* name-reveal outline */
  --gold-ink: ...;        /* dark text that sits on gold */
  --card-shadow: ...;
  --card-glow: ...;
}
```

The light theme has its own block with the same variables (keep those
values; the cream palette still uses light cards).

The gold is intentionally dimmed — `#d4af37`-family values were lowered to a
muted brass (`#b08d30` dark / `#96762a` light) and every glow alpha was cut
roughly a third, so the accent reads as a quiet brass instead of bright gold.

**The hero is the silver part of the palette.** Its background keeps the
white (dark theme) / near-black (light theme) line waves from
`restartLineWaves()` — they read as silver over jet black, and the waves
stay neutral on purpose. Everything in front is gold: the name reveal
(`--text-stroke-color` / `--animation-color` on `.name-button`) uses a
thick 3px gold outline with a transparent fill (the gold fill sweeps in on
hover), and the white "Hey, I'm" words carry a 2px gold outline
(`.hero-heading .text-white`). The "View Projects" outline (`.shadow-btn`)
uses the `--gold*` tokens, so any future accent change updates it
automatically.

The two typed role lines (hero subheader `#hero-role` and the About-heading
role `#about-role`) are styled like a terminal prompt: JetBrains Mono at
500 weight, colored `--terminal` (amber in dark theme, dark amber in
light), with a soft CRT text-shadow and a blinking block cursor
(`.type-caret` is a 0.6em-wide block rather than a thin line). The hero
subheader reads as a shell prompt: a "$" (plus a space) is always painted
ahead of the typed role — in `startRoleTypers()` the `heroPrompt` constant
is prefixed at paint time and in the static fallback, so the prompt never
enters the typing/backspace state. The About role types inline with no
prompt. Both sit on the `--terminal` token, which lives in each theme
block.

Typography: body/small text uses Space Grotesk, display headings use
Special Gothic Expanded One, the loader letters use Iceberg, and the typed
role lines use JetBrains Mono — all four are loaded in `index.html`'s
Google Fonts link.

To change the accent color, update every `--gold*` variable in **both**
blocks. The cursor-following ring on cards uses `--gold` / `--gold-glow`
directly (see `.glow-card::before` in `styles.css`). Design rules you
chose: no emojis; gradients only where they move, follow the mouse, or
bridge the seams between sections. The seams themselves use two layers — a
soft tone ramp and a black-only shadow:

- Tone ramps live on the section backgrounds: `.section-tech`,
  `.section-github`, `.section-projects`, `.section-contact-form`, and
  `.section-contact` each use a `linear-gradient` whose bottom 8rem eases
  into the next section's tone (`.section-about` stays flat, since its
  neighbours are the same colour).
- The seam blend is black-only — no gold, no colour other than black: each
  `.section` carries a soft inset shadow at its top edge (`--seam-shadow`).
  The old faint gold light (`--seam-glow`) is gone.
- Hovering a section lights its boundary lines silver: `.section::before`
  (top) and `.section::after` (bottom) draw a 1px `--seam-hover` line with
  a soft glow, fading in on `.section:hover`. The bio section never shows
  them — `.section-about::before, .section-about::after { display: none }`.

Dark-theme cards are pitch black (#000) with #030303 used for the alternate
sections. The pitch-black project card colours are hardcoded under
`[data-theme="dark"] .project-card` in `styles.css` (base rules keep the
light cards for the cream theme).

## Recipe 1: change the accent from gold to another color

1. Pick your color (e.g. a deep blue `#3b82f6`).
2. In `styles.css`, replace all `--gold*` values in the `:root` block.
3. Do the same in the `[data-theme="light"]` block (usually a slightly darker
   variant for contrast on light backgrounds).
4. The animated backgrounds hardcode their own colors in `script.js`.
   `initParticles()` uses `"228, 230, 238"` (silver) / `"26, 26, 26"` —
   the particles are deliberately neutral so backgrounds stay gold-free;
   keep them that way. The hero's line waves are also neutral
   (`#ffffff` / `#1a1a1a`) — the silver part of the palette. The hero's
   name and button follow the `--gold*` tokens; the typed roles and block
   cursor follow the `--terminal` token (update it too if you want the
   amber to match your new accent).
5. Check with both themes.

## Recipe 2: add a new section to the main page

1. In `index.html`, add a section following the existing pattern:

```html
<section id="my-section" class="section section-my">
  <div class="my-inner">
    <h2 class="section-title">My Section</h2>
    <p class="section-sub">Optional subtitle.</p>
    <!-- your content -->
  </div>
</section>
```

2. Style it in `styles.css` using the theme variables (use `var(--bg)` /
   `var(--surface)` for backgrounds so both themes work).
3. Optional: add a scroll reveal by giving elements the `reveal` class and
   adding your selector to the `revealTargets` list in `script.js` (search
   for `revealTargets` near the `Scroll reveal` section). Siblings in the
   same container are staggered automatically; add `reveal-left`,
   `reveal-right`, or `reveal-zoom` for other directions. Note: a
   `.section-title`'s underline only draws itself on once the title (or its
   containing block) gets `.is-visible`, so reveal the title itself or its
   wrapper.
4. Optional: add a scroll-progress/back-to-top-friendly anchor by giving the
   section an `id` (already done above).

## Recipe 3: add a new profile field (end to end)

Say you want a "pronouns" field shown in the About section. Four small edits:

1. **`profile.json`** — add the field:
   ```json
   "pronouns": "they/them",
   ```
2. **`server.js`** — in `handleProfile()`, add a line so saves don't drop it:
   ```js
   pronouns: text(incoming.pronouns, 40).trim(),
   ```
3. **`admin/index.html`** — add an input in the "About you" card:
   ```html
   <div class="field">
     <label for="p-pronouns">Pronouns</label>
     <input type="text" id="p-pronouns" maxlength="40">
   </div>
   ```
4. **`admin/admin.js`** — populate it on load and include it on save:
   ```js
   // in populateProfile():
   $("p-pronouns").value = profile.pronouns || "";
   // in saveProfile() payload:
   pronouns: $("p-pronouns").value,
   ```
5. **`script.js`** — render it. In `renderProfile()`, near the other About
   lines, add:
   ```js
   var pronouns = profile.pronouns || "";
   var aboutPronouns = document.getElementById("about-pronouns");
   if (aboutPronouns && pronouns) aboutPronouns.textContent = pronouns;
   ```
   And add `<p id="about-pronouns" class="about-bio">` to `index.html` where
   you want it shown.

Restart `node server.js`, open `/admin/`, and the field appears with the
others.

## Recipe 4: add a new API endpoint

`server.js` routes POSTs by path in the `req.on("end")` handler. To add
`/api/notes`:

1. Write a `handleNotes(req, res, body)` function that reads/writes a file
   (copy the shape of `handleProfile`).
2. Add a branch:
   ```js
   else if (pathname === "/api/notes") handleNotes(req, res, body);
   ```
3. Call it from `admin/admin.js` with `postJSON("../api/notes", payload)`.
4. Keep it local: the endpoint only exists on `127.0.0.1` and is never
   deployed.

## Running and testing

```bash
node server.js            # start the admin + site server (localhost:3000)
node --check script.js    # quick syntax check after JS edits
node --check server.js
node --check admin/admin.js
```

The server logs nothing on success; hit the endpoints with curl to verify a
save works:

```bash
curl -X POST http://localhost:3000/api/profile \
  -H "Content-Type: application/json" \
  -d '{"name":"Jane Doe","username":"janedoe","role":"Dev","bio":"","email":"","location":"","socials":{}}'
```

After any save, open `http://localhost:3000/` and hard-refresh to see the
change on the main site.

## Troubleshooting

- **"Could not save the profile: ... unexpected character at line 1 column 1"**
  — the admin page is being served by a static server (for example
  `python3 -m http.server` or a VS Code extension), not by `server.js`.
  Loading the form works because the JSON files are static, but `POST
  /api/profile` gets answered with an HTML error page. Fix: stop that
  server, run `node server.js` in the project root, and open
  `http://localhost:3000/admin/`. The admin page now detects this and shows
  the warning notice up front.
- The form loads but the Save buttons are missing or the page looks broken
  — open the page through `http://localhost:3000/admin/` (the local server
  also serves the admin CSS/JS), not as a raw file.
- Nothing changes on the main site after a save — hard-refresh (Ctrl/Cmd+
  Shift+R) to bypass the browser cache.

## Publishing checklist

- The site is publishable at any time: it is just static files plus the two
  JSON files and `assets/`.
- Never deploy `server.js`, `admin/`, or this guide. On a static host the
  admin page will show a "start the server" notice, which is harmless, but
  the cleanest setup keeps those files out of the deployed folder/branch.
- After an admin save, commit the JSON changes (and any `assets/` photo) and
  push. That is the whole publish flow.