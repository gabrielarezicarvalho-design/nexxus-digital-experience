import { useLang } from "@/lib/i18n";

function FlagBR() {
  return (
    <svg viewBox="0 0 20 14" aria-hidden="true">
      <rect width="20" height="14" fill="#009b3a" />
      <polygon points="10,1.8 18.2,7 10,12.2 1.8,7" fill="#fedf00" />
      <circle cx="10" cy="7" r="2.6" fill="#002776" />
    </svg>
  );
}

function FlagUS() {
  return (
    <svg viewBox="0 0 20 14" aria-hidden="true">
      <rect width="20" height="14" fill="#b22234" />
      {[1, 3, 5, 7, 9, 11].map((i) => (
        <rect key={i} y={(i * 14) / 13} width="20" height={14 / 13} fill="#ffffff" />
      ))}
      <rect width="8.6" height={(14 * 7) / 13} fill="#3c3b6e" />
    </svg>
  );
}

export function LanguageToggle() {
  const { lang, setLang } = useLang();
  return (
    <div className="lang-toggle" role="group" aria-label="Idioma / Language">
      <button
        type="button"
        className={`lang-flag${lang === "pt" ? " is-active" : ""}`}
        onClick={() => setLang("pt")}
        aria-label="Português (Brasil)"
        aria-pressed={lang === "pt"}
        title="Português (Brasil)"
      >
        <FlagBR />
      </button>
      <button
        type="button"
        className={`lang-flag${lang === "en" ? " is-active" : ""}`}
        onClick={() => setLang("en")}
        aria-label="English (US)"
        aria-pressed={lang === "en"}
        title="English (US)"
      >
        <FlagUS />
      </button>
    </div>
  );
}
