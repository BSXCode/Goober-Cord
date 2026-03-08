"use client";

import { useState, useEffect, useRef } from "react";
import { useAppStore } from "@/lib/app-store";
import { useAuthStore } from "@/lib/auth-store";
import { cn } from "@/lib/cn";
import { X } from "lucide-react";
import {
  getKlipyApiKey, setKlipyApiKey, getFont, setFont, getFontFile, setFontFile,
  getUiScale, setUiScale, applyUiScale,
  getBackgroundImage, setBackgroundImage, getBgSettings, setBgSettings, applyBackgroundImage,
  getBgMusic, setBgMusic, getBgMusicVolume, setBgMusicVolume as saveMusicVol,
  getBgMusicLoop, setBgMusicLoop as saveMusicLoop, getBgMusicAutoplay, setBgMusicAutoplay as saveMusicAutoplay,
  type BgSettings,
} from "@/lib/client-settings";
import { getSocket } from "@/lib/socket";
import { initPwa, isInstallable, isInstalled, promptInstall, onPwaChange } from "@/lib/pwa";
import { getSoundsEnabled, setSoundsEnabled, playSuccess } from "@/lib/sounds";
import { Download, Monitor, Volume2, VolumeX, Music, Play, Pause, Trash2, Upload } from "lucide-react";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

const ACCENT_PRESETS = ["#5865F2", "#ED4245", "#57F287", "#FEE75C", "#EB459E", "#00A8FC"];

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const theme = useAppStore((s) => s.theme);
  const accentColor = useAppStore((s) => s.accentColor);
  const density = useAppStore((s) => s.density);
  const setTheme = useAppStore((s) => s.setTheme);
  const setAccentColor = useAppStore((s) => s.setAccentColor);
  const setDensity = useAppStore((s) => s.setDensity);
  const customGradient = useAppStore((s) => s.customGradient);
  const setCustomGradient = useAppStore((s) => s.setCustomGradient);
  const customCss = useAppStore((s) => s.customCss);
  const setCustomCss = useAppStore((s) => s.setCustomCss);

  const [klipyKey, setKlipyKey] = useState("");
  const [uiScaleVal, setUiScaleVal] = useState(100);
  const [activeSection, setActiveSection] = useState<"account" | "appearance" | "gif" | "call" | "fonts" | "audio" | "install">("appearance");
  const [soundsOn, setSoundsOn] = useState(true);
  const [installReady, setInstallReady] = useState(false);
  const [installing, setInstalling] = useState(false);
  const currentUserId = useAuthStore((s) => s.currentUserId);
  const logout = useAuthStore((s) => s.logout);
  const users = useAppStore((s) => s.users);
  const updateUser = useAppStore((s) => s.updateUser);
  const currentUser = currentUserId ? users[currentUserId] : null;
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [accountMsg, setAccountMsg] = useState("");
  const [selectedFont, setSelectedFont] = useState("var(--font-geist-sans), system-ui, sans-serif");
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [bgSettings, setBgSettingsState] = useState<BgSettings>({ blur: 0, opacity: 30, fixed: true });
  const [cameraDeviceId, setCameraDeviceId] = useState<string>("");
  const [microphoneDeviceId, setMicrophoneDeviceId] = useState<string>("");
  const [outputDeviceId, setOutputDeviceId] = useState<string>("");
  const [musicUrl, setMusicUrl] = useState<string | null>(null);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [musicVolume, setMusicVolume] = useState(30);
  const [musicLoop, setMusicLoop] = useState(true);
  const [musicAutoplay, setMusicAutoplay] = useState(false);
  const musicRef = useRef<HTMLAudioElement | null>(null);
  const [availableDevices, setAvailableDevices] = useState<{
    cameras: MediaDeviceInfo[];
    microphones: MediaDeviceInfo[];
    speakers: MediaDeviceInfo[];
  }>({ cameras: [], microphones: [], speakers: [] });

  useEffect(() => {
    if (open) {
      setKlipyKey(getKlipyApiKey());
      setUiScaleVal(getUiScale());
      loadDevices();
      const savedFont = getFont();
      if (savedFont) setSelectedFont(savedFont);
      setBgImage(getBackgroundImage());
      setBgSettingsState(getBgSettings());
      setNewUsername(currentUser?.username ?? "");
      setNewPassword("");
      setConfirmPassword("");
      setAccountMsg("");
      setSoundsOn(getSoundsEnabled());
      setMusicUrl(getBgMusic());
      setMusicVolume(getBgMusicVolume());
      setMusicLoop(getBgMusicLoop());
      setMusicAutoplay(getBgMusicAutoplay());
      initPwa();
      setInstallReady(isInstallable());
    }
  }, [open, currentUser?.username]);

  useEffect(() => {
    const unsub = onPwaChange(() => {
      setInstallReady(isInstallable());
    });
    return unsub;
  }, []);

  const loadDevices = async () => {
    try {
      // Request permissions first to get device labels
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      } catch (e) {
        // Permission denied is okay, we can still enumerate devices
      }
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter((d) => d.kind === "videoinput");
      const microphones = devices.filter((d) => d.kind === "audioinput");
      const speakers = devices.filter((d) => d.kind === "audiooutput");
      setAvailableDevices({ cameras, microphones, speakers });
      
      // Load saved preferences from localStorage
      const savedCamera = localStorage.getItem("goober-cord-camera-device");
      const savedMic = localStorage.getItem("goober-cord-microphone-device");
      const savedOutput = localStorage.getItem("goober-cord-output-device");
      if (savedCamera) setCameraDeviceId(savedCamera);
      if (savedMic) setMicrophoneDeviceId(savedMic);
      if (savedOutput) setOutputDeviceId(savedOutput);
    } catch (error) {
      console.error("Failed to enumerate devices:", error);
    }
  };

  if (!open) return null;

  const handleSaveKlipyKey = () => {
    setKlipyApiKey(klipyKey.trim());
    onClose();
  };

  const handleSaveCallSettings = () => {
    if (cameraDeviceId) localStorage.setItem("goober-cord-camera-device", cameraDeviceId);
    if (microphoneDeviceId) localStorage.setItem("goober-cord-microphone-device", microphoneDeviceId);
    if (outputDeviceId) localStorage.setItem("goober-cord-output-device", outputDeviceId);
    onClose();
  };

  const handleFontChange = (font: string) => {
    setSelectedFont(font);
    setFont(font);
    applyFont(font);
  };

  const handleFontFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check if it's a font file
    const validExtensions = [".ttf", ".otf", ".woff", ".woff2", ".eot"];
    const ext = file.name.toLowerCase().substring(file.name.lastIndexOf("."));
    if (!validExtensions.includes(ext)) {
      alert("Please upload a valid font file (.ttf, .otf, .woff, .woff2, or .eot)");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const fontDataUrl = event.target?.result as string;
      const fontName = file.name.substring(0, file.name.lastIndexOf(".")).replace(/[^a-zA-Z0-9]/g, "");
      
      // Determine format
      let format = "truetype";
      if (ext === ".otf") format = "opentype";
      else if (ext === ".woff") format = "woff";
      else if (ext === ".woff2") format = "woff2";
      else if (ext === ".eot") format = "embedded-opentype";
      
      // Create @font-face rule
      const style = document.createElement("style");
      style.id = "custom-font-face";
      const existingStyle = document.getElementById("custom-font-face");
      if (existingStyle) existingStyle.remove();
      
      const fontFaceRule = `
        @font-face {
          font-family: '${fontName}';
          src: url('${fontDataUrl}') format('${format}');
        }
      `;
      style.textContent = fontFaceRule;
      document.head.appendChild(style);
      
      setFontFile(fontFaceRule);
      setFont(`'${fontName}'`);
      setSelectedFont(`'${fontName}'`);
      applyFont(`'${fontName}'`);
    };
    reader.readAsDataURL(file);
  };

  const applyFont = (font: string) => {
    if (typeof document !== "undefined") {
      document.documentElement.style.setProperty("--font-family", font);
      document.body.style.fontFamily = font;
    }
  };

  const FONT_PRESETS = [
    { name: "Default", value: "var(--font-geist-sans), system-ui, sans-serif" },
    { name: "Arial", value: "Arial, sans-serif" },
    { name: "Helvetica", value: "Helvetica, Arial, sans-serif" },
    { name: "Times New Roman", value: "'Times New Roman', serif" },
    { name: "Georgia", value: "Georgia, serif" },
    { name: "Courier New", value: "'Courier New', monospace" },
    { name: "Verdana", value: "Verdana, sans-serif" },
    { name: "Comic Sans MS", value: "'Comic Sans MS', cursive" },
    { name: "Impact", value: "Impact, fantasy" },
    { name: "Trebuchet MS", value: "'Trebuchet MS', sans-serif" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-[var(--glass-bg)] backdrop-blur-md rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] sm:max-h-[85vh] overflow-hidden flex flex-col border border-[var(--glass-border)] animate-pop-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-[var(--glass-border)]">
          <h2 className="text-lg sm:text-xl font-bold text-[var(--text)]">Goober-Cord Settings</h2>
          <button type="button" onClick={onClose} className="p-2 rounded-full text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--channel-hover)] transition-colors" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col sm:flex-row flex-1 min-h-0">
          <nav className="flex sm:flex-col sm:w-48 flex-shrink-0 border-b sm:border-b-0 sm:border-r border-[var(--glass-border)] p-2 sm:p-3 gap-1 sm:gap-0 sm:space-y-1 overflow-x-auto sm:overflow-x-visible">
            {(
              [
                ["account", "Account"],
                ["appearance", "Appearance"],
                ["audio", "Audio"],
                ["gif", "GIF"],
                ["call", "Call"],
                ["fonts", "Fonts"],
              ] as [typeof activeSection, string][]
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveSection(id)}
                className={cn(
                  "whitespace-nowrap text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  activeSection === id ? "bg-[var(--accent)] text-white shadow-md" : "text-[var(--text-muted)] hover:bg-[var(--channel-hover)] hover:text-[var(--text)]"
                )}
              >
                {label}
              </button>
            ))}
            {!isInstalled() && (
              <button
                type="button"
                onClick={() => setActiveSection("install")}
                className={cn(
                  "whitespace-nowrap text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  activeSection === "install" ? "bg-[var(--accent)] text-white shadow-md" : "text-[var(--text-muted)] hover:bg-[var(--channel-hover)] hover:text-[var(--text)]"
                )}
              >
                Install
              </button>
            )}
          </nav>

          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            {activeSection === "account" && (
              <>
                <section>
                  <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3">Change Username</h3>
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="New username"
                    className="w-full px-3 py-2 rounded-lg bg-[var(--surface-elevated)] border border-[var(--glass-border)] text-[var(--text)] text-sm focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] focus:outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const trimmed = newUsername.trim();
                      if (!trimmed || !currentUserId) return;
                      if (trimmed === currentUser?.username) { setAccountMsg("Username is the same."); return; }
                      const sock = getSocket();
                      if (sock) {
                        sock.emit("account:changeUsername", { userId: currentUserId, newUsername: trimmed }, (res: any) => {
                          if (res?.ok) { setAccountMsg("Username changed!"); }
                          else { setAccountMsg(res?.error ?? "Failed to change username."); }
                        });
                      }
                    }}
                    className="mt-2 px-4 py-2 rounded-lg bg-[var(--accent)] hover:opacity-90 text-white text-sm font-medium"
                  >
                    Update Username
                  </button>
                </section>
                <section>
                  <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3">Change Password</h3>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New password"
                    className="w-full px-3 py-2 rounded-lg bg-[var(--surface-elevated)] border border-[var(--glass-border)] text-[var(--text)] text-sm mb-2 focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] focus:outline-none transition-all"
                  />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full px-3 py-2 rounded-lg bg-[var(--surface-elevated)] border border-[var(--glass-border)] text-[var(--text)] text-sm focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] focus:outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!newPassword || !currentUserId) return;
                      if (newPassword !== confirmPassword) { setAccountMsg("Passwords don't match."); return; }
                      if (newPassword.length < 3) { setAccountMsg("Password must be at least 3 characters."); return; }
                      const sock = getSocket();
                      if (sock) {
                        sock.emit("account:changePassword", { userId: currentUserId, newPassword }, (res: any) => {
                          if (res?.ok) { setAccountMsg("Password changed!"); setNewPassword(""); setConfirmPassword(""); }
                          else { setAccountMsg(res?.error ?? "Failed to change password."); }
                        });
                      }
                    }}
                    className="mt-2 px-4 py-2 rounded-lg bg-[var(--accent)] hover:opacity-90 text-white text-sm font-medium"
                  >
                    Update Password
                  </button>
                </section>
                {accountMsg && (
                  <p className={cn("text-sm font-medium", accountMsg.includes("!") ? "text-green-400" : "text-red-400")}>{accountMsg}</p>
                )}
                <section className="border-t border-[var(--glass-border)] pt-6">
                  <h3 className="text-xs font-bold text-red-400 uppercase tracking-wider mb-3">Danger Zone</h3>
                  <p className="text-sm text-[var(--text-muted)] mb-3">Permanently delete your account. This cannot be undone.</p>
                  <button
                    type="button"
                    onClick={() => {
                      if (!currentUserId) return;
                      if (!confirm("Are you sure you want to delete your account? This is permanent and cannot be undone.")) return;
                      const sock = getSocket();
                      if (sock) {
                        sock.emit("account:delete", { userId: currentUserId }, (res: any) => {
                          if (res?.ok) {
                            logout();
                            onClose();
                          } else {
                            setAccountMsg(res?.error ?? "Failed to delete account.");
                          }
                        });
                      }
                    }}
                    className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors"
                  >
                    Delete Account
                  </button>
                </section>
              </>
            )}
            {activeSection === "appearance" && (
              <>
                <section>
                  <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3">Theme</h3>
                  <div className="flex gap-3 flex-wrap">
                    {(["dark", "light", "bendy", "undertale"] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          setTheme(t);
                          if (typeof document !== "undefined") {
                            const root = document.documentElement;
                            root.classList.remove("dark", "light", "bendy", "undertale");
                            root.classList.add(t);
                            if (t === "undertale") {
                              const link = document.getElementById("undertale-font-link") ?? document.createElement("link");
                              link.id = "undertale-font-link";
                              (link as HTMLLinkElement).rel = "stylesheet";
                              (link as HTMLLinkElement).href = "https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap";
                              if (!link.parentNode) document.head.appendChild(link);
                            }
                            void root.offsetHeight;
                          }
                        }}
                        className={cn(
                          "px-6 py-3 rounded-xl text-sm font-medium capitalize transition-all shadow-sm border border-[var(--glass-border)]",
                          theme === t ? "bg-[var(--accent)] text-white border-transparent shadow-md transform scale-105" : "bg-[var(--surface-elevated)] text-[var(--text-muted)] hover:bg-[var(--channel-hover)] hover:text-[var(--text)]"
                        )}
                      >
                        {t === "undertale" ? "Undertale" : t}
                      </button>
                    ))}
                  </div>
                </section>
                <section>
                  <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3">Custom Gradient</h3>
                  <div className="flex items-center gap-2 mb-3">
                    <input
                      type="checkbox"
                      checked={customGradient.enabled}
                      onChange={(e) => setCustomGradient({ ...customGradient, enabled: e.target.checked })}
                      className="w-4 h-4 rounded border-[var(--glass-border)] bg-[var(--surface-elevated)] text-[var(--accent)] focus:ring-[var(--accent)]"
                    />
                    <label className="text-sm text-[var(--text)]">Enable Custom Gradient</label>
                  </div>
                  {customGradient.enabled && (
                    <div className="space-y-3 pl-6 border-l-2 border-[var(--glass-border)]">
                      <div className="flex gap-4">
                        <div>
                          <label className="block text-xs text-[var(--text-muted)] mb-1">Color 1</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={customGradient.color1}
                              onChange={(e) => setCustomGradient({ ...customGradient, color1: e.target.value })}
                              className="w-8 h-8 rounded border-none p-0 bg-transparent cursor-pointer"
                            />
                            <span className="text-xs font-mono text-[var(--text-muted)]">{customGradient.color1}</span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-[var(--text-muted)] mb-1">Color 2</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={customGradient.color2}
                              onChange={(e) => setCustomGradient({ ...customGradient, color2: e.target.value })}
                              className="w-8 h-8 rounded border-none p-0 bg-transparent cursor-pointer"
                            />
                            <span className="text-xs font-mono text-[var(--text-muted)]">{customGradient.color2}</span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-[var(--text-muted)] mb-1">Angle: {customGradient.angle}°</label>
                        <input
                          type="range"
                          min={0}
                          max={360}
                          value={customGradient.angle}
                          onChange={(e) => setCustomGradient({ ...customGradient, angle: Number(e.target.value) })}
                          className="w-full accent-[var(--accent)]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-[var(--text-muted)] mb-1">Animation Speed: {customGradient.speed}s</label>
                        <input
                          type="range"
                          min={1}
                          max={60}
                          value={customGradient.speed}
                          onChange={(e) => setCustomGradient({ ...customGradient, speed: Number(e.target.value) })}
                          className="w-full accent-[var(--accent)]"
                        />
                      </div>
                    </div>
                  )}
                </section>
                <section>
                  <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3">Custom CSS</h3>
                  <p className="text-xs text-[var(--text-muted)] mb-2">
                    Inject custom CSS to override styles. Use with caution.
                  </p>
                  <textarea
                    value={customCss}
                    onChange={(e) => setCustomCss(e.target.value)}
                    placeholder="/* Your custom CSS here */"
                    className="w-full h-32 px-3 py-2 rounded bg-[#1e1f22] border border-[#3f4147] text-white text-sm font-mono focus:border-[var(--accent)] focus:outline-none resize-none"
                  />
                </section>
                <section>
                  <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3">Background Image</h3>
                  <p className="text-xs text-[var(--text-muted)] mb-2">Upload an image or GIF as your custom background (max 2MB, stored locally).</p>
                  {bgImage && (
                    <div className="relative mb-3 h-24 rounded-lg overflow-hidden border border-[var(--glass-border)]">
                      <img src={bgImage} alt="Background preview" className="w-full h-full object-cover" style={{ filter: bgSettings.blur > 0 ? `blur(${bgSettings.blur}px)` : "none", opacity: bgSettings.opacity / 100 }} />
                      <button
                        type="button"
                        onClick={() => {
                          setBgImage(null);
                          setBackgroundImage(null);
                          applyBackgroundImage();
                        }}
                        className="absolute top-1 right-1 px-2 py-0.5 rounded bg-red-600 text-white text-[10px] font-medium hover:bg-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/gif,image/webp"
                    className="hidden"
                    id="bg-image-input"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 2 * 1024 * 1024) { alert("Max 2MB"); return; }
                      const reader = new FileReader();
                      reader.onload = () => {
                        const dataUrl = reader.result as string;
                        setBgImage(dataUrl);
                        setBackgroundImage(dataUrl);
                        applyBackgroundImage();
                      };
                      reader.readAsDataURL(file);
                      e.target.value = "";
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => document.getElementById("bg-image-input")?.click()}
                    className="px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 mb-3"
                  >
                    {bgImage ? "Change Image" : "Upload Image"}
                  </button>
                  {bgImage && (
                    <div className="space-y-3 pl-4 border-l-2 border-[var(--glass-border)]">
                      <div>
                        <label className="block text-xs text-[var(--text-muted)] mb-1">Blur: {bgSettings.blur}px</label>
                        <input type="range" min={0} max={20} value={bgSettings.blur}
                          onChange={(e) => {
                            const next = { ...bgSettings, blur: Number(e.target.value) };
                            setBgSettingsState(next);
                            setBgSettings(next);
                            applyBackgroundImage();
                          }}
                          className="w-full accent-[var(--accent)]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-[var(--text-muted)] mb-1">Opacity: {bgSettings.opacity}%</label>
                        <input type="range" min={5} max={100} value={bgSettings.opacity}
                          onChange={(e) => {
                            const next = { ...bgSettings, opacity: Number(e.target.value) };
                            setBgSettingsState(next);
                            setBgSettings(next);
                            applyBackgroundImage();
                          }}
                          className="w-full accent-[var(--accent)]"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked={bgSettings.fixed}
                          onChange={(e) => {
                            const next = { ...bgSettings, fixed: e.target.checked };
                            setBgSettingsState(next);
                            setBgSettings(next);
                            applyBackgroundImage();
                          }}
                          className="w-4 h-4 rounded"
                        />
                        <label className="text-sm text-[var(--text)]">Fixed position (parallax)</label>
                      </div>
                    </div>
                  )}
                </section>
                <section>
                  <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3">Accent color</h3>
                  <div className="flex flex-wrap gap-3">
                    {ACCENT_PRESETS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setAccentColor(color)}
                        className={cn(
                          "w-10 h-10 rounded-full border-2 transition-all shadow-sm",
                          accentColor === color ? "border-white scale-110 shadow-md ring-2 ring-offset-2 ring-offset-[var(--bg)] ring-[var(--accent)]" : "border-transparent hover:scale-105"
                        )}
                        style={{ backgroundColor: color }}
                        aria-label={`Accent ${color}`}
                      />
                    ))}
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <input
                      type="text"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="flex-1 px-4 py-2 rounded-lg bg-[var(--surface-elevated)] border border-[var(--glass-border)] text-[var(--text)] text-sm font-mono focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] focus:outline-none transition-all"
                    />
                  </div>
                </section>
                <section>
                  <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3">Message density</h3>
                  <div className="flex gap-3">
                    {(["cozy", "compact"] as const).map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDensity(d)}
                        className={cn(
                          "px-6 py-3 rounded-xl text-sm font-medium capitalize transition-all shadow-sm border border-[var(--glass-border)]",
                          density === d ? "bg-[var(--accent)] text-white border-transparent shadow-md transform scale-105" : "bg-[var(--surface-elevated)] text-[var(--text-muted)] hover:bg-[var(--channel-hover)] hover:text-[var(--text)]"
                        )}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </section>
                <section>
                  <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3">UI Scale</h3>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min={50}
                      max={150}
                      step={5}
                      value={uiScaleVal}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setUiScaleVal(v);
                        setUiScale(v);
                        applyUiScale(v);
                      }}
                      className="flex-1 accent-[var(--accent)]"
                    />
                    <span className="text-sm font-mono text-[var(--text)] w-12 text-right">{uiScaleVal}%</span>
                  </div>
                  <div className="flex justify-between text-xs text-[var(--text-muted)] mt-1 px-0.5">
                    <span>50%</span>
                    <span>100%</span>
                    <span>150%</span>
                  </div>
                </section>
              </>
            )}

            {activeSection === "call" && (
              <>
                <section>
                  <h3 className="text-xs font-semibold text-[#b5bac1] uppercase tracking-wide mb-2">Camera</h3>
                  <select
                    value={cameraDeviceId}
                    onChange={(e) => setCameraDeviceId(e.target.value)}
                    className="w-full px-3 py-2 rounded bg-[#1e1f22] border border-[#3f4147] text-white text-sm focus:border-[var(--accent)] focus:outline-none"
                  >
                    <option value="">Default camera</option>
                    {availableDevices.cameras.map((device) => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || `Camera ${availableDevices.cameras.indexOf(device) + 1}`}
                      </option>
                    ))}
                  </select>
                </section>
                <section>
                  <h3 className="text-xs font-semibold text-[#b5bac1] uppercase tracking-wide mb-2">Microphone</h3>
                  <select
                    value={microphoneDeviceId}
                    onChange={(e) => setMicrophoneDeviceId(e.target.value)}
                    className="w-full px-3 py-2 rounded bg-[#1e1f22] border border-[#3f4147] text-white text-sm focus:border-[var(--accent)] focus:outline-none"
                  >
                    <option value="">Default microphone</option>
                    {availableDevices.microphones.map((device) => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || `Microphone ${availableDevices.microphones.indexOf(device) + 1}`}
                      </option>
                    ))}
                  </select>
                </section>
                <section>
                  <h3 className="text-xs font-semibold text-[#b5bac1] uppercase tracking-wide mb-2">Output Device</h3>
                  <select
                    value={outputDeviceId}
                    onChange={(e) => setOutputDeviceId(e.target.value)}
                    className="w-full px-3 py-2 rounded bg-[#1e1f22] border border-[#3f4147] text-white text-sm focus:border-[var(--accent)] focus:outline-none"
                  >
                    <option value="">Default output</option>
                    {availableDevices.speakers.map((device) => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || `Speaker ${availableDevices.speakers.indexOf(device) + 1}`}
                      </option>
                    ))}
                  </select>
                </section>
                <button
                  type="button"
                  onClick={handleSaveCallSettings}
                  className="mt-4 px-4 py-2 rounded-lg bg-[var(--accent)] hover:opacity-90 text-white text-sm font-medium"
                >
                  Save call settings
                </button>
              </>
            )}

            {activeSection === "fonts" && (
              <>
                <section>
                  <h3 className="text-xs font-semibold text-[#b5bac1] uppercase tracking-wide mb-2">Font Presets</h3>
                  <select
                    value={selectedFont}
                    onChange={(e) => handleFontChange(e.target.value)}
                    className="w-full px-3 py-2 rounded bg-[#1e1f22] border border-[#3f4147] text-white text-sm focus:border-[var(--accent)] focus:outline-none"
                  >
                    {FONT_PRESETS.map((font) => (
                      <option key={font.value} value={font.value}>
                        {font.name}
                      </option>
                    ))}
                  </select>
                </section>
                <section>
                  <h3 className="text-xs font-semibold text-[#b5bac1] uppercase tracking-wide mb-2">Upload Custom Font</h3>
                  <p className="text-xs text-[#949ba4] mb-2">
                    Upload a font file (.ttf, .otf, .woff, .woff2, or .eot)
                  </p>
                  <input
                    type="file"
                    accept=".ttf,.otf,.woff,.woff2,.eot"
                    onChange={handleFontFileUpload}
                    className="w-full px-3 py-2 rounded bg-[#1e1f22] border border-[#3f4147] text-white text-sm focus:border-[var(--accent)] focus:outline-none file:mr-4 file:py-1 file:px-2 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-[var(--accent)] file:text-white hover:file:bg-[var(--accent-hover)]"
                  />
                </section>
              </>
            )}

            {activeSection === "install" && !isInstalled() && (
              <section>
                <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3">Install Goober-Cord</h3>
                <p className="text-sm text-[var(--text-muted)] mb-4">
                  Install Goober-Cord as a desktop app. It will run in its own window with a taskbar icon.
                </p>
                {installReady ? (
                  <button
                    type="button"
                    onClick={async () => {
                      setInstalling(true);
                      await promptInstall();
                      setInstalling(false);
                      setInstallReady(isInstallable());
                    }}
                    disabled={installing}
                    className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-[var(--accent)] hover:opacity-90 text-white text-sm font-medium disabled:opacity-60 transition-colors"
                  >
                    <Download className="w-5 h-5 flex-shrink-0" />
                    <span>{installing ? "Installing..." : "Install App"}</span>
                    <Monitor className="w-5 h-5 flex-shrink-0 opacity-70 ml-auto" />
                  </button>
                ) : (
                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--surface-elevated)] border border-[var(--glass-border)] text-[var(--text-muted)]">
                    <Download className="w-5 h-5 flex-shrink-0 text-[var(--accent)]" />
                    <p className="text-sm">
                      Use Chrome or Edge to install. In other browsers, use the menu &quot;Install app&quot; or &quot;Add to Home Screen&quot; option.
                    </p>
                  </div>
                )}
              </section>
            )}

            {activeSection === "audio" && (
              <>
                <section>
                  <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3">Sound Effects</h3>
                  <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--surface-elevated)] border border-[var(--glass-border)]">
                    <div className="flex items-center gap-3">
                      {soundsOn ? <Volume2 className="w-5 h-5 text-green-400" /> : <VolumeX className="w-5 h-5 text-red-400" />}
                      <div>
                        <p className="text-sm font-medium text-[var(--text)]">UI Sound Effects</p>
                        <p className="text-xs text-[var(--text-muted)]">Notifications, sends, navigation, reactions</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const next = !soundsOn;
                        setSoundsOn(next);
                        setSoundsEnabled(next);
                        if (next) playSuccess();
                      }}
                      className={cn(
                        "relative w-12 h-6 rounded-full transition-colors",
                        soundsOn ? "bg-green-500" : "bg-[var(--border)]"
                      )}
                    >
                      <span className={cn(
                        "absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform",
                        soundsOn ? "left-[26px]" : "left-0.5"
                      )} />
                    </button>
                  </div>
                </section>
                <section>
                  <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3">Sound Preview</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      ["Ping", () => { const { playPing } = require("@/lib/sounds"); playPing(); }],
                      ["Message", () => { const { playMessage } = require("@/lib/sounds"); playMessage(); }],
                      ["Send", () => { const { playSend } = require("@/lib/sounds"); playSend(); }],
                      ["Join", () => { const { playJoin } = require("@/lib/sounds"); playJoin(); }],
                      ["Leave", () => { const { playLeave } = require("@/lib/sounds"); playLeave(); }],
                      ["Reaction", () => { const { playReaction } = require("@/lib/sounds"); playReaction(); }],
                      ["Navigate", () => { const { playNavigate } = require("@/lib/sounds"); playNavigate(); }],
                      ["Success", () => { const { playSuccess: ps } = require("@/lib/sounds"); ps(); }],
                      ["Error", () => { const { playError } = require("@/lib/sounds"); playError(); }],
                      ["Connect", () => { const { playConnect } = require("@/lib/sounds"); playConnect(); }],
                    ] as [string, () => void][]).map(([name, fn]) => (
                      <button
                        key={name}
                        type="button"
                        onClick={fn}
                        className="px-3 py-2 rounded-lg bg-[var(--surface-elevated)] border border-[var(--glass-border)] text-sm text-[var(--text)] hover:bg-[var(--channel-hover)] transition-colors active:scale-95"
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                </section>
                <section>
                  <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3">Background Music</h3>
                  <div className="space-y-3">
                    {musicUrl ? (
                      <div className="p-4 rounded-xl bg-[var(--surface-elevated)] border border-[var(--glass-border)] space-y-3">
                        <div className="flex items-center gap-3">
                          <Music className="w-5 h-5 text-[var(--accent)]" />
                          <span className="text-sm text-[var(--text)] flex-1">Music loaded</span>
                          <button
                            type="button"
                            onClick={() => {
                              if (musicRef.current) { musicRef.current.pause(); musicRef.current = null; }
                              setMusicUrl(null);
                              setMusicPlaying(false);
                              setBgMusic(null);
                            }}
                            className="p-1.5 rounded text-red-400 hover:text-red-300 hover:bg-[var(--channel-hover)]"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              if (!musicRef.current) {
                                const audio = new Audio(musicUrl);
                                audio.volume = musicVolume / 100;
                                audio.loop = musicLoop;
                                audio.onended = () => { if (!musicLoop) setMusicPlaying(false); };
                                musicRef.current = audio;
                              }
                              if (musicPlaying) {
                                musicRef.current.pause();
                                setMusicPlaying(false);
                              } else {
                                musicRef.current.play().catch(() => {});
                                setMusicPlaying(true);
                              }
                            }}
                            className="p-2 rounded-lg bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
                          >
                            {musicPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                          </button>
                          <div className="flex-1">
                            <label className="block text-[10px] text-[var(--text-muted)] mb-0.5">Volume: {musicVolume}%</label>
                            <input
                              type="range"
                              min={0}
                              max={100}
                              value={musicVolume}
                              onChange={(e) => {
                                const v = parseInt(e.target.value, 10);
                                setMusicVolume(v);
                                saveMusicVol(v);
                                if (musicRef.current) musicRef.current.volume = v / 100;
                              }}
                              className="w-full h-1.5 accent-[var(--accent)]"
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-2 text-sm text-[var(--text)]">
                            <input
                              type="checkbox"
                              checked={musicLoop}
                              onChange={(e) => {
                                setMusicLoop(e.target.checked);
                                saveMusicLoop(e.target.checked);
                                if (musicRef.current) musicRef.current.loop = e.target.checked;
                              }}
                              className="w-4 h-4 rounded accent-[var(--accent)]"
                            />
                            Loop
                          </label>
                          <label className="flex items-center gap-2 text-sm text-[var(--text)]">
                            <input
                              type="checkbox"
                              checked={musicAutoplay}
                              onChange={(e) => {
                                setMusicAutoplay(e.target.checked);
                                saveMusicAutoplay(e.target.checked);
                              }}
                              className="w-4 h-4 rounded accent-[var(--accent)]"
                            />
                            Autoplay on load
                          </label>
                        </div>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center p-6 rounded-xl bg-[var(--surface-elevated)] border-2 border-dashed border-[var(--glass-border)] cursor-pointer hover:border-[var(--accent)] transition-colors">
                        <Upload className="w-8 h-8 text-[var(--text-muted)] mb-2" />
                        <span className="text-sm text-[var(--text)]">Upload music file</span>
                        <span className="text-xs text-[var(--text-muted)] mt-0.5">MP3, OGG, WAV (max 10MB)</span>
                        <input
                          type="file"
                          accept="audio/mpeg,audio/ogg,audio/wav,audio/mp3"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            if (file.size > 10 * 1024 * 1024) {
                              alert("File too large (max 10MB)");
                              return;
                            }
                            const reader = new FileReader();
                            reader.onload = () => {
                              const url = reader.result as string;
                              setMusicUrl(url);
                              setBgMusic(url);
                            };
                            reader.readAsDataURL(file);
                            e.target.value = "";
                          }}
                        />
                      </label>
                    )}
                  </div>
                </section>
              </>
            )}

            {activeSection === "gif" && (
              <section>
                <h3 className="text-xs font-semibold text-[#b5bac1] uppercase tracking-wide mb-2">Klipy GIF API key</h3>
                <p className="text-sm text-[#b5bac1] mb-2">
                  Get a free key at{" "}
                  <a href="https://partner.klipy.com" target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:underline">
                    partner.klipy.com
                  </a>
                  . Paste it below to enable GIF search in chat.
                </p>
                <input
                  type="password"
                  value={klipyKey}
                  onChange={(e) => setKlipyKey(e.target.value)}
                  placeholder="Paste your Klipy API key"
                  className="w-full px-3 py-2 rounded bg-[#1e1f22] border border-[#3f4147] text-white placeholder-[#4e5058] focus:border-[var(--accent)] focus:outline-none text-sm"
                />
                <button
                  type="button"
                  onClick={handleSaveKlipyKey}
                  className="mt-2 px-4 py-2 rounded-lg bg-[var(--accent)] hover:opacity-90 text-white text-sm font-medium"
                >
                  Save key
                </button>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
