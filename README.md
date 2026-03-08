# Goober-Cord

A friendly, Discord-style chat app you can run yourself. Message in real time, hop in voice channels, create servers and DMs, and play games together—all from the browser. Works on **Windows, macOS, and Linux**.

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
