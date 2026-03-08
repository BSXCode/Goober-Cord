"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { useAppStore } from "@/lib/app-store";
import { useAuthStore } from "@/lib/auth-store";
import { cn } from "@/lib/cn";
import { X, Search, Smile, Server, Sticker, Clock } from "lucide-react";

type Tab = "default" | "server" | "stickers";

interface EmojiPickerProps {
  onSelectEmoji: (emoji: string) => void;
  onSelectCustomEmoji: (id: string, url: string) => void;
  onSelectSticker: (url: string, name: string) => void;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
}

interface EmojiEntry {
  emoji: string;
  keywords: string[];
}

const EMOJI_DATA: { name: string; entries: EmojiEntry[] }[] = [
  { name: "Smileys", entries: [
    { emoji: "😀", keywords: ["grinning", "happy", "smile"] },
    { emoji: "😃", keywords: ["grinning", "big eyes", "happy"] },
    { emoji: "😄", keywords: ["grinning", "squinting", "happy", "laugh"] },
    { emoji: "😁", keywords: ["beaming", "grin", "happy"] },
    { emoji: "😆", keywords: ["laughing", "satisfied", "lol"] },
    { emoji: "😅", keywords: ["sweat", "nervous", "laugh"] },
    { emoji: "🤣", keywords: ["rofl", "rolling", "laughing"] },
    { emoji: "😂", keywords: ["joy", "tears", "laughing", "lol", "crying laughing"] },
    { emoji: "🙂", keywords: ["slightly smiling", "okay"] },
    { emoji: "🙃", keywords: ["upside down", "silly", "sarcasm"] },
    { emoji: "😉", keywords: ["wink", "flirt"] },
    { emoji: "😊", keywords: ["blush", "happy", "warm"] },
    { emoji: "😇", keywords: ["angel", "halo", "innocent"] },
    { emoji: "🥰", keywords: ["love", "hearts", "smiling"] },
    { emoji: "😍", keywords: ["heart eyes", "love", "crush"] },
    { emoji: "🤩", keywords: ["star struck", "excited", "wow"] },
    { emoji: "😘", keywords: ["kiss", "blowing kiss", "love"] },
    { emoji: "😗", keywords: ["kissing", "pucker"] },
    { emoji: "😚", keywords: ["kissing", "closed eyes"] },
    { emoji: "😙", keywords: ["kissing", "smiling eyes"] },
    { emoji: "🥲", keywords: ["smiling", "tear", "sad happy"] },
    { emoji: "😋", keywords: ["yummy", "tongue", "delicious"] },
    { emoji: "😛", keywords: ["tongue out", "playful"] },
    { emoji: "😜", keywords: ["winking", "tongue", "crazy"] },
    { emoji: "🤪", keywords: ["zany", "wild", "crazy"] },
    { emoji: "😝", keywords: ["squinting", "tongue", "playful"] },
    { emoji: "🤑", keywords: ["money", "rich", "dollar"] },
    { emoji: "🤗", keywords: ["hugging", "hug", "warm"] },
    { emoji: "🤭", keywords: ["hand over mouth", "oops", "giggle"] },
    { emoji: "🫢", keywords: ["open eyes", "hand over mouth"] },
    { emoji: "🫣", keywords: ["peeking", "shy"] },
    { emoji: "🤫", keywords: ["shushing", "quiet", "secret"] },
    { emoji: "🤔", keywords: ["thinking", "hmm", "wonder"] },
    { emoji: "🫡", keywords: ["salute", "respect"] },
    { emoji: "🤐", keywords: ["zipper mouth", "quiet", "secret"] },
    { emoji: "🤨", keywords: ["raised eyebrow", "skeptical"] },
    { emoji: "😐", keywords: ["neutral", "meh", "blank"] },
    { emoji: "😑", keywords: ["expressionless", "blank"] },
    { emoji: "😶", keywords: ["no mouth", "silent"] },
    { emoji: "🫥", keywords: ["dotted line", "invisible"] },
    { emoji: "😏", keywords: ["smirk", "sly", "suggestive"] },
    { emoji: "😒", keywords: ["unamused", "bored", "annoyed"] },
    { emoji: "🙄", keywords: ["eye roll", "whatever", "annoyed"] },
    { emoji: "😬", keywords: ["grimace", "awkward", "cringe"] },
    { emoji: "🤥", keywords: ["lying", "pinocchio"] },
    { emoji: "😌", keywords: ["relieved", "peaceful"] },
    { emoji: "😔", keywords: ["pensive", "sad", "thoughtful"] },
    { emoji: "😪", keywords: ["sleepy", "tired"] },
    { emoji: "🤤", keywords: ["drooling", "yummy"] },
    { emoji: "😴", keywords: ["sleeping", "zzz", "tired"] },
    { emoji: "😷", keywords: ["mask", "sick", "medical"] },
    { emoji: "🤒", keywords: ["thermometer", "sick", "fever"] },
    { emoji: "🤕", keywords: ["bandage", "hurt", "injured"] },
    { emoji: "🤢", keywords: ["nauseated", "sick", "green"] },
    { emoji: "🤮", keywords: ["vomiting", "sick", "throw up"] },
    { emoji: "🥵", keywords: ["hot", "sweating", "overheated"] },
    { emoji: "🥶", keywords: ["cold", "freezing", "frozen"] },
    { emoji: "🥴", keywords: ["woozy", "drunk", "dizzy"] },
    { emoji: "😵", keywords: ["dizzy", "knocked out"] },
    { emoji: "🤯", keywords: ["mind blown", "exploding head", "shocked"] },
    { emoji: "🤠", keywords: ["cowboy", "hat", "yeehaw"] },
    { emoji: "🥳", keywords: ["party", "celebration", "birthday"] },
    { emoji: "🥸", keywords: ["disguise", "glasses", "nose"] },
    { emoji: "😎", keywords: ["sunglasses", "cool", "boss"] },
    { emoji: "🤓", keywords: ["nerd", "glasses", "smart"] },
    { emoji: "🧐", keywords: ["monocle", "curious", "inspect"] },
    { emoji: "😭", keywords: ["crying", "sob", "sad", "bawling"] },
    { emoji: "😤", keywords: ["angry", "steam", "frustrated"] },
    { emoji: "😠", keywords: ["angry", "mad"] },
    { emoji: "😡", keywords: ["rage", "furious", "angry", "mad"] },
    { emoji: "🤬", keywords: ["cursing", "swearing", "angry"] },
    { emoji: "😈", keywords: ["devil", "evil", "smiling"] },
    { emoji: "👿", keywords: ["devil", "angry", "evil"] },
    { emoji: "💀", keywords: ["skull", "dead", "death"] },
    { emoji: "☠️", keywords: ["skull crossbones", "death", "danger"] },
    { emoji: "💩", keywords: ["poop", "poo", "shit"] },
    { emoji: "🤡", keywords: ["clown", "funny", "joke"] },
    { emoji: "👹", keywords: ["ogre", "monster", "demon"] },
    { emoji: "👻", keywords: ["ghost", "spooky", "halloween"] },
    { emoji: "👽", keywords: ["alien", "ufo", "space"] },
    { emoji: "🤖", keywords: ["robot", "bot", "machine"] },
    { emoji: "🎃", keywords: ["jack o lantern", "halloween", "pumpkin"] },
  ]},
  { name: "Gestures", entries: [
    { emoji: "👋", keywords: ["wave", "hello", "hi", "bye"] },
    { emoji: "🤚", keywords: ["raised back hand", "stop"] },
    { emoji: "🖐️", keywords: ["hand", "fingers", "splayed"] },
    { emoji: "✋", keywords: ["raised hand", "high five", "stop"] },
    { emoji: "🖖", keywords: ["vulcan", "spock", "star trek"] },
    { emoji: "👌", keywords: ["ok", "okay", "perfect"] },
    { emoji: "🤌", keywords: ["pinched fingers", "italian"] },
    { emoji: "🤏", keywords: ["pinching", "tiny", "small"] },
    { emoji: "✌️", keywords: ["peace", "victory", "two"] },
    { emoji: "🤞", keywords: ["crossed fingers", "luck", "hope"] },
    { emoji: "🤟", keywords: ["love you", "hand sign"] },
    { emoji: "🤘", keywords: ["rock", "metal", "horns"] },
    { emoji: "🤙", keywords: ["call me", "shaka", "hang loose"] },
    { emoji: "👈", keywords: ["pointing left"] },
    { emoji: "👉", keywords: ["pointing right"] },
    { emoji: "👆", keywords: ["pointing up"] },
    { emoji: "🖕", keywords: ["middle finger", "flip off"] },
    { emoji: "👇", keywords: ["pointing down"] },
    { emoji: "☝️", keywords: ["index pointing up"] },
    { emoji: "👍", keywords: ["thumbs up", "yes", "like", "good"] },
    { emoji: "👎", keywords: ["thumbs down", "no", "dislike", "bad"] },
    { emoji: "✊", keywords: ["fist", "punch", "power"] },
    { emoji: "👊", keywords: ["fist bump", "punch"] },
    { emoji: "🤛", keywords: ["left fist"] },
    { emoji: "🤜", keywords: ["right fist"] },
    { emoji: "👏", keywords: ["clap", "applause", "bravo"] },
    { emoji: "🙌", keywords: ["raised hands", "celebration", "hooray"] },
    { emoji: "🫶", keywords: ["heart hands", "love"] },
    { emoji: "👐", keywords: ["open hands", "jazz hands"] },
    { emoji: "🤲", keywords: ["palms up", "prayer"] },
    { emoji: "🤝", keywords: ["handshake", "deal", "agree"] },
    { emoji: "🙏", keywords: ["pray", "please", "thank you", "namaste"] },
    { emoji: "💪", keywords: ["muscle", "strong", "flex", "bicep"] },
  ]},
  { name: "Hearts", entries: [
    { emoji: "❤️", keywords: ["red heart", "love"] },
    { emoji: "🧡", keywords: ["orange heart"] },
    { emoji: "💛", keywords: ["yellow heart"] },
    { emoji: "💚", keywords: ["green heart"] },
    { emoji: "💙", keywords: ["blue heart"] },
    { emoji: "💜", keywords: ["purple heart"] },
    { emoji: "🖤", keywords: ["black heart"] },
    { emoji: "🤍", keywords: ["white heart"] },
    { emoji: "🤎", keywords: ["brown heart"] },
    { emoji: "💔", keywords: ["broken heart", "heartbreak"] },
    { emoji: "❤️‍🔥", keywords: ["heart on fire", "passion"] },
    { emoji: "❤️‍🩹", keywords: ["mending heart", "healing"] },
    { emoji: "💕", keywords: ["two hearts", "love"] },
    { emoji: "💞", keywords: ["revolving hearts"] },
    { emoji: "💓", keywords: ["beating heart"] },
    { emoji: "💗", keywords: ["growing heart"] },
    { emoji: "💖", keywords: ["sparkling heart"] },
    { emoji: "💘", keywords: ["cupid heart", "arrow"] },
    { emoji: "💝", keywords: ["heart ribbon", "gift"] },
  ]},
  { name: "Animals", entries: [
    { emoji: "🐶", keywords: ["dog", "puppy", "pet"] },
    { emoji: "🐱", keywords: ["cat", "kitten", "pet"] },
    { emoji: "🐭", keywords: ["mouse", "rat"] },
    { emoji: "🐹", keywords: ["hamster"] },
    { emoji: "🐰", keywords: ["rabbit", "bunny"] },
    { emoji: "🦊", keywords: ["fox"] },
    { emoji: "🐻", keywords: ["bear"] },
    { emoji: "🐼", keywords: ["panda"] },
    { emoji: "🐨", keywords: ["koala"] },
    { emoji: "🐯", keywords: ["tiger"] },
    { emoji: "🦁", keywords: ["lion"] },
    { emoji: "🐮", keywords: ["cow"] },
    { emoji: "🐷", keywords: ["pig"] },
    { emoji: "🐸", keywords: ["frog"] },
    { emoji: "🐵", keywords: ["monkey"] },
    { emoji: "🙈", keywords: ["see no evil", "monkey"] },
    { emoji: "🙉", keywords: ["hear no evil", "monkey"] },
    { emoji: "🙊", keywords: ["speak no evil", "monkey"] },
    { emoji: "🐔", keywords: ["chicken"] },
    { emoji: "🐧", keywords: ["penguin"] },
    { emoji: "🐦", keywords: ["bird"] },
    { emoji: "🦆", keywords: ["duck"] },
    { emoji: "🦅", keywords: ["eagle"] },
    { emoji: "🦉", keywords: ["owl"] },
    { emoji: "🐺", keywords: ["wolf"] },
    { emoji: "🐴", keywords: ["horse"] },
    { emoji: "🦄", keywords: ["unicorn", "magic"] },
    { emoji: "🐝", keywords: ["bee", "honeybee"] },
    { emoji: "🦋", keywords: ["butterfly"] },
    { emoji: "🐌", keywords: ["snail", "slow"] },
    { emoji: "🐞", keywords: ["ladybug"] },
    { emoji: "🐍", keywords: ["snake"] },
    { emoji: "🐢", keywords: ["turtle", "slow"] },
    { emoji: "🐙", keywords: ["octopus"] },
    { emoji: "🦈", keywords: ["shark"] },
    { emoji: "🐳", keywords: ["whale", "spouting"] },
    { emoji: "🐬", keywords: ["dolphin"] },
  ]},
  { name: "Food", entries: [
    { emoji: "🍎", keywords: ["apple", "red", "fruit"] },
    { emoji: "🍐", keywords: ["pear", "fruit"] },
    { emoji: "🍊", keywords: ["orange", "tangerine", "fruit"] },
    { emoji: "🍋", keywords: ["lemon", "citrus"] },
    { emoji: "🍌", keywords: ["banana", "fruit"] },
    { emoji: "🍉", keywords: ["watermelon", "fruit"] },
    { emoji: "🍇", keywords: ["grapes", "fruit"] },
    { emoji: "🍓", keywords: ["strawberry", "fruit"] },
    { emoji: "🍒", keywords: ["cherry", "fruit"] },
    { emoji: "🍑", keywords: ["peach", "fruit"] },
    { emoji: "🍍", keywords: ["pineapple", "fruit"] },
    { emoji: "🥝", keywords: ["kiwi", "fruit"] },
    { emoji: "🍅", keywords: ["tomato"] },
    { emoji: "🍕", keywords: ["pizza"] },
    { emoji: "🍔", keywords: ["hamburger", "burger", "fast food"] },
    { emoji: "🍟", keywords: ["french fries", "fries"] },
    { emoji: "🌭", keywords: ["hot dog"] },
    { emoji: "🥪", keywords: ["sandwich"] },
    { emoji: "🌮", keywords: ["taco", "mexican"] },
    { emoji: "🌯", keywords: ["burrito", "wrap"] },
    { emoji: "🍿", keywords: ["popcorn", "movie"] },
    { emoji: "🍩", keywords: ["donut", "doughnut"] },
    { emoji: "🍪", keywords: ["cookie"] },
    { emoji: "🎂", keywords: ["birthday cake", "cake"] },
    { emoji: "🍰", keywords: ["cake", "shortcake", "dessert"] },
    { emoji: "🍫", keywords: ["chocolate"] },
    { emoji: "🍬", keywords: ["candy"] },
    { emoji: "🍭", keywords: ["lollipop"] },
    { emoji: "☕", keywords: ["coffee", "hot beverage", "tea"] },
    { emoji: "🍵", keywords: ["tea", "green tea"] },
    { emoji: "🥤", keywords: ["cup with straw", "soda", "drink"] },
    { emoji: "🍺", keywords: ["beer", "mug"] },
    { emoji: "🍻", keywords: ["beers", "cheers", "clinking"] },
    { emoji: "🥂", keywords: ["champagne", "toast", "cheers"] },
    { emoji: "🍷", keywords: ["wine", "red wine"] },
  ]},
  { name: "Activities", entries: [
    { emoji: "⚽", keywords: ["soccer", "football"] },
    { emoji: "🏀", keywords: ["basketball"] },
    { emoji: "🏈", keywords: ["football", "american"] },
    { emoji: "⚾", keywords: ["baseball"] },
    { emoji: "🎾", keywords: ["tennis"] },
    { emoji: "🏐", keywords: ["volleyball"] },
    { emoji: "🎱", keywords: ["pool", "billiards", "8 ball"] },
    { emoji: "🏓", keywords: ["ping pong", "table tennis"] },
    { emoji: "🎮", keywords: ["video game", "gaming", "controller"] },
    { emoji: "🕹️", keywords: ["joystick", "arcade"] },
    { emoji: "🎲", keywords: ["dice", "game"] },
    { emoji: "🧩", keywords: ["puzzle", "jigsaw"] },
    { emoji: "♟️", keywords: ["chess", "pawn"] },
    { emoji: "🎯", keywords: ["dart", "bullseye", "target"] },
    { emoji: "🎳", keywords: ["bowling"] },
    { emoji: "🎸", keywords: ["guitar", "rock"] },
    { emoji: "🎹", keywords: ["piano", "keyboard", "music"] },
    { emoji: "🎺", keywords: ["trumpet"] },
    { emoji: "🥁", keywords: ["drum"] },
    { emoji: "🎤", keywords: ["microphone", "karaoke", "singing"] },
    { emoji: "🎧", keywords: ["headphones", "music"] },
    { emoji: "🎬", keywords: ["clapper", "movie", "film"] },
    { emoji: "🎨", keywords: ["art", "palette", "painting"] },
    { emoji: "🎭", keywords: ["theater", "masks", "drama"] },
  ]},
  { name: "Objects", entries: [
    { emoji: "💡", keywords: ["light bulb", "idea"] },
    { emoji: "🔦", keywords: ["flashlight", "torch"] },
    { emoji: "💰", keywords: ["money bag", "rich"] },
    { emoji: "💎", keywords: ["gem", "diamond", "jewel"] },
    { emoji: "🔧", keywords: ["wrench", "tool"] },
    { emoji: "🔩", keywords: ["nut bolt"] },
    { emoji: "⚙️", keywords: ["gear", "settings", "cog"] },
    { emoji: "📎", keywords: ["paperclip"] },
    { emoji: "✂️", keywords: ["scissors", "cut"] },
    { emoji: "🖊️", keywords: ["pen"] },
    { emoji: "📝", keywords: ["memo", "note", "write"] },
    { emoji: "✏️", keywords: ["pencil", "write"] },
    { emoji: "🔍", keywords: ["search", "magnifying glass", "find"] },
    { emoji: "🔒", keywords: ["lock", "locked", "security"] },
    { emoji: "🔓", keywords: ["unlock", "unlocked"] },
    { emoji: "🔑", keywords: ["key"] },
    { emoji: "📱", keywords: ["phone", "mobile", "smartphone"] },
    { emoji: "💻", keywords: ["laptop", "computer"] },
    { emoji: "🖥️", keywords: ["desktop", "computer", "monitor"] },
    { emoji: "⌨️", keywords: ["keyboard"] },
    { emoji: "🖱️", keywords: ["mouse", "computer"] },
    { emoji: "📷", keywords: ["camera", "photo"] },
    { emoji: "📹", keywords: ["video camera"] },
    { emoji: "📺", keywords: ["television", "tv"] },
    { emoji: "📻", keywords: ["radio"] },
    { emoji: "🔔", keywords: ["bell", "notification", "alert"] },
    { emoji: "🔕", keywords: ["bell off", "mute", "no notification"] },
    { emoji: "📢", keywords: ["loudspeaker", "announcement"] },
  ]},
  { name: "Symbols", entries: [
    { emoji: "💯", keywords: ["hundred", "100", "perfect", "score"] },
    { emoji: "💢", keywords: ["anger"] },
    { emoji: "💥", keywords: ["boom", "collision", "explosion"] },
    { emoji: "💫", keywords: ["dizzy", "star"] },
    { emoji: "💦", keywords: ["sweat", "water drops"] },
    { emoji: "💨", keywords: ["wind", "fast", "dash"] },
    { emoji: "💬", keywords: ["speech bubble", "comment", "chat"] },
    { emoji: "💭", keywords: ["thought bubble", "thinking"] },
    { emoji: "💤", keywords: ["zzz", "sleep"] },
    { emoji: "✅", keywords: ["check", "yes", "done", "complete"] },
    { emoji: "❌", keywords: ["cross", "no", "wrong", "x"] },
    { emoji: "⭕", keywords: ["circle", "ring"] },
    { emoji: "🚫", keywords: ["prohibited", "forbidden", "no"] },
    { emoji: "♻️", keywords: ["recycle", "environment"] },
    { emoji: "✨", keywords: ["sparkles", "clean", "magic", "new"] },
    { emoji: "⚡", keywords: ["lightning", "electric", "zap", "fast"] },
    { emoji: "🔥", keywords: ["fire", "hot", "lit", "flame"] },
    { emoji: "💧", keywords: ["water", "drop", "tear"] },
    { emoji: "🌊", keywords: ["wave", "ocean", "sea"] },
    { emoji: "🎵", keywords: ["music", "note", "song"] },
    { emoji: "🎶", keywords: ["music", "notes", "singing"] },
    { emoji: "⚠️", keywords: ["warning", "caution", "alert"] },
    { emoji: "🏁", keywords: ["checkered flag", "finish", "race"] },
    { emoji: "🚩", keywords: ["red flag", "warning"] },
    { emoji: "❓", keywords: ["question mark", "what"] },
    { emoji: "❗", keywords: ["exclamation", "alert", "important"] },
    { emoji: "‼️", keywords: ["double exclamation"] },
    { emoji: "⁉️", keywords: ["exclamation question"] },
  ]},
  { name: "Flags", entries: [
    { emoji: "🏳️", keywords: ["white flag", "surrender"] },
    { emoji: "🏴", keywords: ["black flag"] },
    { emoji: "🏳️‍🌈", keywords: ["rainbow flag", "pride", "lgbtq"] },
    { emoji: "🏳️‍⚧️", keywords: ["transgender flag", "trans"] },
    { emoji: "🏴‍☠️", keywords: ["pirate flag", "jolly roger"] },
    { emoji: "🇺🇸", keywords: ["us", "usa", "america", "united states"] },
    { emoji: "🇬🇧", keywords: ["uk", "britain", "england", "united kingdom"] },
    { emoji: "🇫🇷", keywords: ["france", "french"] },
    { emoji: "🇩🇪", keywords: ["germany", "german"] },
    { emoji: "🇯🇵", keywords: ["japan", "japanese"] },
    { emoji: "🇰🇷", keywords: ["korea", "korean", "south korea"] },
    { emoji: "🇨🇳", keywords: ["china", "chinese"] },
    { emoji: "🇧🇷", keywords: ["brazil", "brazilian"] },
    { emoji: "🇮🇳", keywords: ["india", "indian"] },
    { emoji: "🇷🇺", keywords: ["russia", "russian"] },
    { emoji: "🇨🇦", keywords: ["canada", "canadian"] },
    { emoji: "🇦🇺", keywords: ["australia", "australian"] },
    { emoji: "🇲🇽", keywords: ["mexico", "mexican"] },
    { emoji: "🇪🇸", keywords: ["spain", "spanish"] },
    { emoji: "🇮🇹", keywords: ["italy", "italian"] },
  ]},
];

const FREQ_KEY = "gc-emoji-freq";

function getFrequentEmojis(): string[] {
  try {
    const raw = localStorage.getItem(FREQ_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as string[];
  } catch { return []; }
}

function recordEmojiUse(emoji: string) {
  try {
    const list = getFrequentEmojis().filter((e) => e !== emoji);
    list.unshift(emoji);
    localStorage.setItem(FREQ_KEY, JSON.stringify(list.slice(0, 32)));
  } catch {}
}

export function EmojiPicker({ onSelectEmoji, onSelectCustomEmoji, onSelectSticker, onClose, anchorRef }: EmojiPickerProps) {
  const selectedServerId = useAppStore((s) => s.selectedServerId);
  const servers = useAppStore((s) => s.servers);
  const members = useAppStore((s) => s.members);
  const currentUserId = useAuthStore((s) => s.currentUserId);
  const panelRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const [tab, setTab] = useState<Tab>("default");
  const [search, setSearch] = useState("");
  const [frequent, setFrequent] = useState<string[]>([]);

  const server = selectedServerId ? servers[selectedServerId] : null;

  const allServerEmojis = useMemo(() => {
    const myServerIds = new Set<string>();
    if (currentUserId) {
      Object.values(members).forEach((m) => {
        if (m.userId === currentUserId) myServerIds.add(m.serverId);
      });
    }
    const emojis: { serverId: string; serverName: string; emoji: import("@/lib/types").CustomEmoji }[] = [];
    myServerIds.forEach((sid) => {
      const srv = servers[sid];
      if (srv?.customEmojis) {
        srv.customEmojis.forEach((e) => emojis.push({ serverId: sid, serverName: srv.name, emoji: e }));
      }
    });
    return emojis;
  }, [members, servers, currentUserId]);

  const allServerStickers = useMemo(() => {
    const myServerIds = new Set<string>();
    if (currentUserId) {
      Object.values(members).forEach((m) => {
        if (m.userId === currentUserId) myServerIds.add(m.serverId);
      });
    }
    const stickers: { serverName: string; sticker: import("@/lib/types").CustomSticker }[] = [];
    myServerIds.forEach((sid) => {
      const srv = servers[sid];
      if (srv?.customStickers) {
        srv.customStickers.forEach((s) => stickers.push({ serverName: srv.name, sticker: s }));
      }
    });
    return stickers;
  }, [members, servers, currentUserId]);

  const customEmojis = allServerEmojis.map((e) => e.emoji);
  const customStickers = allServerStickers.map((s) => s.sticker);

  useEffect(() => {
    setFrequent(getFrequentEmojis());
  }, []);

  const handleSelectEmoji = useCallback((emoji: string) => {
    recordEmojiUse(emoji);
    onSelectEmoji(emoji);
    onClose();
  }, [onSelectEmoji, onClose]);

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return EMOJI_DATA;
    const q = search.toLowerCase();
    return EMOJI_DATA.map((cat) => ({
      ...cat,
      entries: cat.entries.filter((e) =>
        e.keywords.some((kw) => kw.includes(q)) || e.emoji.includes(q)
      ),
    })).filter((cat) => cat.entries.length > 0);
  }, [search]);

  const filteredCustomEmojis = useMemo(() => {
    if (!search.trim()) return customEmojis;
    const q = search.toLowerCase();
    return customEmojis.filter((e) => e.name.toLowerCase().includes(q));
  }, [customEmojis, search]);

  const filteredStickers = useMemo(() => {
    if (!search.trim()) return customStickers;
    const q = search.toLowerCase();
    return customStickers.filter((s) => s.name.toLowerCase().includes(q));
  }, [customStickers, search]);

  useEffect(() => {
    const recalc = () => {
      const anchor = anchorRef.current;
      if (!anchor) return;
      const r = anchor.getBoundingClientRect();
      const pw = 352, ph = 420, gap = 8;
      const left = Math.min(Math.max(gap, r.right - pw), window.innerWidth - pw - gap);
      const top = r.top >= ph + gap ? r.top - ph - gap : r.bottom + gap;
      setCoords({ top: Math.max(gap, top), left });
    };
    recalc();
    window.addEventListener("resize", recalc);
    window.addEventListener("scroll", recalc, true);
    return () => {
      window.removeEventListener("resize", recalc);
      window.removeEventListener("scroll", recalc, true);
    };
  }, [anchorRef]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        anchorRef.current && !anchorRef.current.contains(e.target as Node)
      ) onClose();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose, anchorRef]);

  if (typeof document === "undefined") return null;

  const content = (
    <div
      ref={panelRef}
      className="fixed w-[352px] rounded-xl bg-[#2b2d31] border border-[#3f4147] shadow-2xl overflow-hidden z-[120] flex flex-col"
      style={{ top: coords.top, left: coords.left, maxHeight: 420 }}
    >
      <div className="flex items-center gap-0.5 px-2 pt-2 pb-1 border-b border-[#3f4147]">
        <button type="button" onClick={() => { setTab("default"); setSearch(""); }}
          className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors",
            tab === "default" ? "bg-[#5865f2] text-white" : "text-[#b5bac1] hover:text-white hover:bg-[#3f4147]")}>
          <Smile className="w-3.5 h-3.5" /> Emoji
        </button>
        {allServerEmojis.length > 0 && (
          <button type="button" onClick={() => { setTab("server"); setSearch(""); }}
            className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors",
              tab === "server" ? "bg-[#5865f2] text-white" : "text-[#b5bac1] hover:text-white hover:bg-[#3f4147]")}>
            <Server className="w-3.5 h-3.5" /> Server
          </button>
        )}
        {allServerStickers.length > 0 && (
          <button type="button" onClick={() => { setTab("stickers"); setSearch(""); }}
            className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors",
              tab === "stickers" ? "bg-[#5865f2] text-white" : "text-[#b5bac1] hover:text-white hover:bg-[#3f4147]")}>
            <Sticker className="w-3.5 h-3.5" /> Stickers
          </button>
        )}
        <div className="flex-1" />
        <button type="button" onClick={onClose} className="p-1 rounded text-[#b5bac1] hover:text-white hover:bg-[#3f4147]" aria-label="Close">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="px-2 py-1.5">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[#4e5058] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder={tab === "stickers" ? "Search stickers..." : "Search emoji..."}
            className="w-full pl-8 pr-3 py-1.5 rounded-md bg-[#1e1f22] border border-[#3f4147] text-[#dbdee1] placeholder-[#4e5058] text-xs focus:border-[#5865f2] focus:outline-none" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scroll-thin px-2 pb-2" style={{ maxHeight: 320 }}>
        {tab === "default" && (
          <div>
            {!search.trim() && frequent.length > 0 && (
              <div className="mb-2">
                <p className="text-[10px] font-bold text-[#949ba4] uppercase tracking-wider px-1 py-1 sticky top-0 bg-[#2b2d31] z-10 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Frequently Used
                </p>
                <div className="flex flex-wrap">
                  {frequent.map((emoji, i) => (
                    <button key={`freq-${i}`} type="button" onClick={() => handleSelectEmoji(emoji)}
                      className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#3f4147] text-xl transition-colors leading-none"
                      title={emoji}>
                      <span className="emoji-char">{emoji}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {filteredCategories.map((cat) => (
              <div key={cat.name} className="mb-2">
                <p className="text-[10px] font-bold text-[#949ba4] uppercase tracking-wider px-1 py-1 sticky top-0 bg-[#2b2d31] z-10">{cat.name}</p>
                <div className="flex flex-wrap">
                  {cat.entries.map((entry) => (
                    <button key={entry.emoji} type="button" onClick={() => handleSelectEmoji(entry.emoji)}
                      className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#3f4147] text-xl transition-colors leading-none"
                      title={entry.keywords[0]}>
                      <span className="emoji-char">{entry.emoji}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {search.trim() && filteredCategories.length === 0 && (
              <p className="text-xs text-[#949ba4] text-center py-6">No emoji found.</p>
            )}
          </div>
        )}

        {tab === "server" && (
          <div>
            {filteredCustomEmojis.length === 0 ? (
              <p className="text-xs text-[#949ba4] text-center py-6">
                {customEmojis.length === 0 ? "No custom emojis. Upload them in Server Settings." : "No matches."}
              </p>
            ) : (() => {
              const grouped = new Map<string, typeof allServerEmojis>();
              const filtered = search.trim()
                ? allServerEmojis.filter((e) => e.emoji.name.toLowerCase().includes(search.toLowerCase()))
                : allServerEmojis;
              filtered.forEach((e) => {
                if (!grouped.has(e.serverName)) grouped.set(e.serverName, []);
                grouped.get(e.serverName)!.push(e);
              });
              return Array.from(grouped.entries()).map(([serverName, emojis]) => (
                <div key={serverName} className="mb-2">
                  <p className="text-[10px] font-bold text-[#949ba4] uppercase tracking-wider px-1 py-1 sticky top-0 bg-[#2b2d31] z-10">{serverName}</p>
                  <div className="flex flex-wrap gap-1">
                    {emojis.map((e) => (
                      <button key={e.emoji.id} type="button"
                        onClick={() => { onSelectCustomEmoji(e.emoji.id, e.emoji.url); onClose(); }}
                        className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-[#3f4147] transition-colors group relative"
                        title={`:${e.emoji.name}:`}>
                        <img src={e.emoji.url} alt={e.emoji.name} className="w-7 h-7 object-contain" />
                        <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-[#949ba4] whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none">
                          :{e.emoji.name}:
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ));
            })()}
          </div>
        )}

        {tab === "stickers" && (
          <div>
            {filteredStickers.length === 0 ? (
              <p className="text-xs text-[#949ba4] text-center py-6">
                {customStickers.length === 0 ? "No stickers. Upload them in Server Settings." : "No matches."}
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {filteredStickers.map((s) => (
                  <button key={s.id} type="button"
                    onClick={() => { onSelectSticker(s.url, s.name); onClose(); }}
                    className="flex flex-col items-center p-2 rounded-lg hover:bg-[#3f4147] transition-colors"
                    title={s.name}>
                    <img src={s.url} alt={s.name} className="w-20 h-20 object-contain" />
                    <span className="text-[10px] text-[#949ba4] truncate max-w-full mt-1">{s.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
