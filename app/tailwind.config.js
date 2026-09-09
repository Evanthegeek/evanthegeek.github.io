/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      /* Colors are backed by the site's CSS custom properties so the
         dark/light data-theme switch keeps working everywhere. */
      colors: {
        pitch: "#000000",
        graphite: {
          950: "#111111",
          900: "#1A1A1A",
          800: "#242424"
        },
        gold: {
          DEFAULT: "var(--gold)",
          strong: "var(--gold-strong)",
          deep: "var(--gold-deep)",
          ink: "var(--gold-ink)"
        },
        ink: {
          DEFAULT: "var(--text)",
          soft: "var(--text-soft)",
          muted: "var(--text-muted)"
        },
        surface: {
          DEFAULT: "var(--surface)",
          raised: "var(--surface-2)"
        }
      },
      /* Font families preserved exactly from the original site. */
      fontFamily: {
        grotesk: ['"Space Grotesk"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", '"SF Mono"', "Menlo", "Consolas", "monospace"],
        gothic: ['"Special Gothic Expanded One"', "sans-serif"],
        iceberg: ['"Iceberg"', '"Special Gothic Expanded One"', "sans-serif"]
      }
    }
  },
  plugins: []
};
