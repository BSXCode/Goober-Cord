/**
 * Client-only settings (localStorage). Used for API keys and preferences
 * that don't need to be in the main app store.
 */

const KLIPY_KEY = "goober-cord-klipy-api-key";
const THEME_KEY = "goober-cord-theme";
const ACCENT_KEY = "goober-cord-accent-color";
const FONT_KEY = "goober-cord-font";
const FONT_FILE_KEY = "goober-cord-font-file";
const UI_SCALE_KEY = "goober-cord-ui-scale";
const GRADIENT_KEY = "goober-cord-custom-gradient";
const CUSTOM_CSS_KEY = "goober-cord-custom-css";
const BG_IMAGE_KEY = "goober-cord-bg-image";
const BG_SETTINGS_KEY = "goober-cord-bg-settings";
const BG_MUSIC_KEY = "goober-cord-bg-music";
const BG_MUSIC_VOL_KEY = "goober-cord-bg-music-vol";
const BG_MUSIC_LOOP_KEY = "goober-cord-bg-music-loop";
const BG_MUSIC_AUTOPLAY_KEY = "goober-cord-bg-music-autoplay";

export interface CustomGradient {
  enabled: boolean;
  color1: string;
  color2: string;
  angle: number;
  speed: number; // seconds
  animated: boolean;
}

export function getKlipyApiKey(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(KLIPY_KEY) ?? "";
}

export function setKlipyApiKey(key: string): void {
  if (typeof window === "undefined") return;
  if (key) localStorage.setItem(KLIPY_KEY, key);
  else localStorage.removeItem(KLIPY_KEY);
}

export function getTheme(): "dark" | "light" | "bendy" | "undertale" | null {
  if (typeof window === "undefined") return null;
  const theme = localStorage.getItem(THEME_KEY);
  if (theme === "dark" || theme === "light" || theme === "bendy" || theme === "undertale") return theme;
  return null;
}

export function setTheme(theme: "dark" | "light" | "bendy" | "undertale"): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(THEME_KEY, theme);
}

export function getAccentColor(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCENT_KEY);
}

export function setAccentColor(color: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACCENT_KEY, color);
}

export function getFont(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(FONT_KEY);
}

export function setFont(font: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(FONT_KEY, font);
}

export function getFontFile(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(FONT_FILE_KEY);
}

export function setFontFile(fontFile: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(FONT_FILE_KEY, fontFile);
}

export function getUiScale(): number {
  if (typeof window === "undefined") return 100;
  const val = localStorage.getItem(UI_SCALE_KEY);
  const n = val ? parseInt(val, 10) : 100;
  return n >= 50 && n <= 150 ? n : 100;
}

export function setUiScale(scale: number): void {
  if (typeof window === "undefined") return;
  const clamped = Math.max(50, Math.min(150, Math.round(scale)));
  localStorage.setItem(UI_SCALE_KEY, String(clamped));
}

export function applyUiScale(scale?: number): void {
  if (typeof document === "undefined") return;
  const s = scale ?? getUiScale();
  document.documentElement.style.fontSize = `${s}%`;
}

export function getCustomGradient(): CustomGradient {
  if (typeof window === "undefined") return { enabled: false, color1: "#5865f2", color2: "#2b2d31", angle: 45, speed: 10, animated: true };
  const val = localStorage.getItem(GRADIENT_KEY);
  if (!val) return { enabled: false, color1: "#5865f2", color2: "#2b2d31", angle: 45, speed: 10, animated: true };
  try {
    return JSON.parse(val);
  } catch {
    return { enabled: false, color1: "#5865f2", color2: "#2b2d31", angle: 45, speed: 10, animated: true };
  }
}

export function setCustomGradient(gradient: CustomGradient): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(GRADIENT_KEY, JSON.stringify(gradient));
}

export function getCustomCss(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(CUSTOM_CSS_KEY) ?? "";
}

export function setCustomCss(css: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CUSTOM_CSS_KEY, css);
}

export interface BgSettings {
  blur: number;
  opacity: number;
  fixed: boolean;
}

const DEFAULT_BG_SETTINGS: BgSettings = { blur: 0, opacity: 30, fixed: true };

export function getBackgroundImage(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(BG_IMAGE_KEY);
}

export function setBackgroundImage(dataUrl: string | null): void {
  if (typeof window === "undefined") return;
  if (dataUrl) localStorage.setItem(BG_IMAGE_KEY, dataUrl);
  else localStorage.removeItem(BG_IMAGE_KEY);
}

export function getBgSettings(): BgSettings {
  if (typeof window === "undefined") return DEFAULT_BG_SETTINGS;
  try {
    const raw = localStorage.getItem(BG_SETTINGS_KEY);
    return raw ? { ...DEFAULT_BG_SETTINGS, ...JSON.parse(raw) } : DEFAULT_BG_SETTINGS;
  } catch { return DEFAULT_BG_SETTINGS; }
}

export function setBgSettings(settings: BgSettings): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(BG_SETTINGS_KEY, JSON.stringify(settings));
}

export function getBgMusic(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(BG_MUSIC_KEY);
}

export function setBgMusic(dataUrl: string | null): void {
  if (typeof window === "undefined") return;
  if (dataUrl) localStorage.setItem(BG_MUSIC_KEY, dataUrl);
  else localStorage.removeItem(BG_MUSIC_KEY);
}

export function getBgMusicVolume(): number {
  if (typeof window === "undefined") return 30;
  const v = localStorage.getItem(BG_MUSIC_VOL_KEY);
  return v ? Math.max(0, Math.min(100, parseInt(v, 10))) : 30;
}

export function setBgMusicVolume(vol: number): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(BG_MUSIC_VOL_KEY, String(Math.max(0, Math.min(100, vol))));
}

export function getBgMusicLoop(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(BG_MUSIC_LOOP_KEY) !== "false";
}

export function setBgMusicLoop(loop: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(BG_MUSIC_LOOP_KEY, String(loop));
}

export function getBgMusicAutoplay(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(BG_MUSIC_AUTOPLAY_KEY) === "true";
}

export function setBgMusicAutoplay(auto: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(BG_MUSIC_AUTOPLAY_KEY, String(auto));
}

export function applyBackgroundImage(): void {
  if (typeof document === "undefined") return;
  const img = getBackgroundImage();
  const settings = getBgSettings();
  let el = document.getElementById("gc-custom-bg");

  if (!img) {
    if (el) el.remove();
    return;
  }

  if (!el) {
    el = document.createElement("div");
    el.id = "gc-custom-bg";
    el.style.position = "fixed";
    el.style.inset = "0";
    el.style.zIndex = "-1";
    el.style.pointerEvents = "none";
    document.body.prepend(el);
  }

  el.style.backgroundImage = `url(${img})`;
  el.style.backgroundSize = "cover";
  el.style.backgroundPosition = "center";
  el.style.backgroundAttachment = settings.fixed ? "fixed" : "scroll";
  el.style.filter = settings.blur > 0 ? `blur(${settings.blur}px)` : "none";
  el.style.opacity = String(settings.opacity / 100);
}
