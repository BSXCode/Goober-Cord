# Goober-Cord

A friendly, Discord-style chat app you can run yourself. Message in real time, hop in voice channels, create servers and DMs, and play games together—all from the browser. Works on **Windows, macOS, and Linux**.

---

## Features

### Accounts and auth
- Sign up and log in (username + password)
- Change username and password; delete account
- Reconnect with session token after refresh
- Passwords hashed with scrypt (per-user salt); optional encrypted database

### Servers and channels
- Create servers (name, icon, banner) and leave servers you don’t own
- Text and voice channels; categories; reorder channels and categories (server owner)
- Create and delete channels; invite people to the server via DM (search by username)
- Server settings (owner): edit server, manage channels, soundboard (upload sounds), roles

### Messaging
- Real-time chat in channels and DMs; reply to messages; threads
- Rich text: **markdown**, @mentions, link previews/embeds, custom server emojis inline
- Attachments: images, GIFs, video; paste images into the chat
- Edit and delete your messages; pin/unpin messages
- Reactions (emoji and custom server emojis); typing indicators
- Unread indicators and “return to newest message”; notification bell with history

### Friends and DMs
- Friend requests: send, accept, decline; remove friend
- Search users by username to add friends (Social tab) or to invite to a server (no full user list)
- DMs with anyone; unread counts and pings

### Profiles
- View profile popover (click username or avatar) with bio, status, badges, theme
- Edit profile: bio, custom status, avatar, banner, profile theme, name color, nameplate style, avatar decoration, profile effects, pronouns, activity widget

### Voice and video
- Join/leave voice channels; mute, deafen, camera, screen share
- Talking indicator; call settings (mic/speaker/camera selection)
- Voice/video in a draggable widget so you can keep chatting

### Games
- In-app games: Snake, Wordle, Tic-Tac-Toe, Minesweeper
- Embedded: Hextris, DOOM, NZP Zombies, Minecraft (Eaglercraft), FNAF 1
- Fullscreen option for the games panel

### Customization
- Themes: dark, light, bendy, Undertale (pixel style)
- Custom gradient background; custom background image; custom CSS
- Fonts and UI scale; sound effects toggle; optional background music (upload your own)
- PWA: install prompt and “add to home screen” support; mobile-friendly layout

### Other
- Rate limiting on the server (messages, typing, reactions, friend requests)
- Command palette (search servers, channels, DMs)
- Optional database encryption via `ENCRYPTION_KEY` in `.env`

---

## What you can add

The codebase is a single Next.js app plus a Node/Socket.io server and a JSON (or encrypted) database. Here are directions that fit the current design:

- **New themes or games** – Add a theme in `src/app/globals.css` and the theme picker in `SettingsModal`; add a game tab in `GamesPanel` (React component or iframe).
- **New server or message features** – Define new socket events in `server/handlers.js`, then handle them in `src/lib/socket.ts` and add UI (e.g. slash commands, bots, slowmode, kick/ban).
- **Auth and safety** – Password reset flow, email verification, OAuth, or stricter moderation (e.g. report flow, role-based permissions).
- **Storage and media** – Swap or extend attachment handling (e.g. S3, file size limits, allowed types) in the message send flow and server handlers.
- **Localization** – Add i18n (e.g. `next-intl` or similar) and translate strings in `src/`.
- **Integrations** – Webhooks, bot API, or link preview customization in the embed logic.

If you build something others might use, consider opening an issue or PR on the repo.

---

## What you need

- **Node.js** 18 or newer (20 is recommended)
- **npm** (comes with Node) or **yarn**

[Download Node.js](https://nodejs.org/) if you don’t have it yet.

---

## Get started

### 1. Get the code

If you’re using Git:

```bash
git clone https://github.com/BSXCode/Goober-Cord.git
cd Goober-Cord
```

Or download the project and open a terminal in its folder.

### 2. Install dependencies

```bash
npm install
```

### 3. Run the app

**For everyday use (with hot reload):**

```bash
npm run dev
```

Open **http://localhost:3000** in your browser. You’re in.

**For a production-style run:**

```bash
npm run build
npm start
```

The app listens on all interfaces (`0.0.0.0`), so others on your network can use it at `http://YOUR_IP:3000` (replace `YOUR_IP` with your computer’s IP).

---

## Optional: environment and security

You don’t have to set anything to run Goober-Cord. If you want to lock things down or add features:

- **`.env`** – Used by the server. Create it in the project root. The server loads it automatically.
- **`.env.local`** – Used by the Next.js front end (e.g. API keys for GIF search).

**Example `.env`:**

```env
# Optional: encrypt the database (users, messages, etc.) on disk.
# Use a long random passphrase or a 64-character hex string.
# ENCRYPTION_KEY=your-secret-passphrase
```

**Tip:** Don’t commit `.env` or `.env.local`. They’re already in `.gitignore`.

### Keeping data private

- **Passwords** are hashed with **scrypt** and a unique salt per user. They’re never stored in plain text.
- **Database file** – If you set `ENCRYPTION_KEY` in `.env`, the whole database file is encrypted (AES-256-GCM). Good for production or if the machine is shared.  
  You can use either a **passphrase** (any string) or a **64-character hex key**. If you already have a plain `data/goobercord.json`, the server will load it and then save it encrypted after the first write—back up that file before turning encryption on. If you lose the key, encrypted data can’t be recovered.
- **In production**, put the app behind **HTTPS** (e.g. a reverse proxy like Nginx or Caddy) so traffic is encrypted in transit.

---

## What’s inside the project

| Folder / file   | Purpose |
|-----------------|--------|
| `src/`          | Front end (React, Next.js) |
| `server/`       | Back end (Socket.io, auth, database logic) |
| `server.js`     | Entry point: starts the HTTP server and Socket.io |
| `data/`         | Created when you run the app (database and uploads; not in Git) |

---

## License

This project is licensed under **Creative Commons Attribution 4.0 International (CC BY 4.0)**. You may share and adapt the material for any purpose, including commercially, as long as you give appropriate credit and indicate if changes were made. See [LICENSE](LICENSE) for the full text and [creativecommons.org/licenses/by/4.0](https://creativecommons.org/licenses/by/4.0/) for a readable summary.
