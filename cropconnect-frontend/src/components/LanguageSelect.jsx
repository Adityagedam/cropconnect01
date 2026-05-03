import { Globe } from "lucide-react";

export const languages = [
  { code: "en", name: "English" },
  { code: "hi", name: "हिन्दी" },
  { code: "mr", name: "मराठी" },
  { code: "te", name: "తెలుగు" },
  { code: "ta", name: "தமிழ்" },
  { code: "bn", name: "বাংলা" },
  { code: "kn", name: "ಕನ್ನಡ" },
];

export default function LanguageSelect({ value, onChange, className = "" }) {
  return (
    <div className={`relative inline-flex items-center gap-2 ${className}`}>
      <Globe className="w-4 h-4 text-[#1A201C]/60" />
      <select
        value={value}
        onChange={(e) => {
          localStorage.setItem("cropconnect-language", e.target.value);
          onChange(e.target.value);
        }}
        className="bg-transparent text-sm text-[#1A201C]/80 border-none focus:ring-0 cursor-pointer pr-6"
        aria-label="Select language"
      >
        {languages.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.name}
          </option>
        ))}
      </select>
    </div>
  );
}
