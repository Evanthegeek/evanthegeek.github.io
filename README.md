# Developer Portfolio

A static developer portfolio with a gold theme, redesigned around the
[Abhijeet Bhale portfolio template](https://abhijeetbhale.github.io/Portfolio/)
(the template's green accent was replaced with gold). No build step just
HTML, CSS, and JavaScript, plus two JSON files that hold all of your content.

The main site is fully static and publishable to any static host (GitHub
Pages, Netlify, etc.). Editing your content happens in a separate local admin
tool, so the public site never shows editing UI.

## Content lives in JSON files

| File            | What it holds                                   |
| --------------- | ----------------------------------------------- |
| `profile.json`  | Username, name, role, bio, email, location, social links, photo |
| `projects.json` | The project cards shown on the site             |

Both are committed to the repo. The site reads them on load; anything you
change in them is what visitors see after you push.

## Editing your content (the admin tool)

A browser cannot write files, so editing runs through a tiny local server
that writes `profile.json`, `projects.json`, and uploaded photos into the
repo. Run it with Node (no dependencies):

```bash
node server.js
```

Then open:

- Admin tool: http://localhost:3000/admin/
- Main site: http://localhost:3000/

The admin tool has two tabs:

- **Profile** — username (the letters on the loading screen: they rise up
  letter by letter with a springy overshoot, float in a gentle wave, and
  finally swell large before the screen dissolves away), name (shown on the
  main page), role (separate multiple roles with commas — the words
  "and"/"or" also split entries: the hero subheader and the About heading
  both type each role out with a randomized-speed typing effect, running in
  sync but always showing different roles, in a random order, never
  repeating the role just shown), bio, email, location,
  social links, and the profile photo (uploads are saved to `assets/`).
- **Projects** — add, edit, and delete project cards. Cover images can be an
  image URL or an uploaded file (uploads are embedded in `projects.json`, so
  the static site needs no server to display them).

Clicking **Save** writes the files in the repo. Commit and push the changes
to publish them. The server binds to `127.0.0.1` only and is meant for local
use — never deploy it. You can also edit the JSON files by hand if you
prefer.

## Project entry schema

`projects.json` holds an array under `projects`. Each entry supports:

```json
{
  "id": "unique-id",
  "title": "Weather Dashboard",
  "desc": "Short description of the project.",
  "tags": ["React", "TypeScript", "API"],
  "url": "https://live-demo.example.com",
  "source": "https://github.com/you/weather-dashboard",
  "image": "https://example.com/cover.png"
}
```

- `id` is optional (the admin tool fills it in). Keep it stable so cards
  don't get recreated on every save.
- `tags`, `url`, `source`, and `image` are optional. Common tech tags get a
  devicon icon automatically in their badge.
- `image` can be a URL or an inline `data:image/...` upload.

## Publishing

Everything except `server.js` and `admin/` is the publishable site. On a
static host the admin page will show a notice instead of working, which is
fine — it is meant for your machine. If you want the deployed site to be
completely clean, keep `server.js` and `admin/` out of the deployed branch.

## Customization

- **GitHub Activity**: set `GITHUB_USERNAME` at the top of `script.js` to
  fill the stats, recent activity, and top languages from the GitHub API.
  Until then the section shows placeholders.
- **Journey timeline**: the entries in `index.html` are placeholders marked
  with HTML comments — replace them with your own milestones.
- **Tech stack**: edit the tech items in `index.html` to match your stack.
  Icons come from the Devicon CDN.
- **Contact form**: the form validates your message and opens your email
  client with the message pre-filled (no backend or third-party service).
  Messages go to the email in `profile.json`.
- **Resume**: if you add a `resume.pdf` at the repo root you can link it from
  the About section.

## Running the site without the admin tool

If you only want to view the static site (not edit), any static server works:

```bash
python3 -m http.server
```

## Theme

The fixed toggle in the top-right switches between dark and light themes. The
choice is remembered in the browser; without a stored choice the site follows
the OS preference. Both themes use the gold accent for foregrounds — text,
outlines, and accents — over a black, silver, and white base, and the animated
backgrounds (hero line waves, project particles) recolor themselves on switch.
The gold is deliberately muted (a dim brass rather than a bright yellow). The
hero keeps its silver wave field (white lines over jet black) with a
thick (3px), hollow gold-outlined name (the gold fill sweeps in on hover),
a gold outline around the white "Hey, I'm" words, and a gold "View
Projects" button outline. The typed role lines — hero subheader and the
About-heading role — read like a terminal prompt: amber monospace text with
a blinking block cursor; the hero line is prefixed with a shell "$".

## Design notes

- No emojis in the source.
- Gradients are used sparingly and always tied to motion, the mouse, or the
  seams between sections: the hero's bottom fade, each section title's
  drawn-on gold underline (draws in as you scroll to it), a thin gold ring
  that follows the cursor around the outline of cards on hover (the card
  interior stays clear), and black-only tone ramps with a soft shadow where
  one section melts into the next.
- Gold lives on foregrounds only — headings, outlines, buttons, accents.
  The section backgrounds are jet and pure black (#000 / #030303); the
  hero's white wave field reads as the silver part of the palette.
- Seam transitions contain no gold and no colour other than black: each
  section carries a soft inset shadow at its top edge, and hovering a
  section makes its boundary lines glow silver (the bio section is exempt).
- Typography: body text uses Space Grotesk, display headings use Special
  Gothic Expanded One, the loading-screen letters use Iceberg, and the
  typed role lines use JetBrains Mono in amber (`--terminal`).
- The typed role lines are styled like a terminal: JetBrains Mono at 500
  weight in amber with a soft CRT glow and a blinking block cursor
  (`.type-caret`). The hero subheader is a shell prompt — the typed role
  always follows a "$" — while the About role types inline in its
  sentence. A single role or reduced-motion users get the same static
  amber text (prompt included).
- In the dark theme the cards are pitch black and the alternate sections are
  #030303, so the page reads as layered blacks with gold accents on the
  foreground.
- Reduced-motion preferences are respected: loading animation, backgrounds,
  typing effects, and scroll reveals are disabled or static.

*This Document was written mostly by an llm, with some manual editing by Evanthegeek*
