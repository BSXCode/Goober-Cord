require("dotenv").config();
const { createServer } = require("http");
const next = require("next");
const { Server } = require("socket.io");

const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    handle(req, res);
  });

  const io = new Server(httpServer, {
    cors: { origin: "*" },
    maxHttpBufferSize: 50e6,
  });

  try {
    const db = require("./server/db");
    require("./server/handlers")(io, db);
  } catch (err) {
    console.error("Failed to initialize server handlers:", err);
    process.exit(1);
  }

  httpServer.listen(port, () => {
    console.log(`> Goober-Cord ready on port ${port}`);
    console.log(`> Environment: ${process.env.NODE_ENV}`);
    const nets = require("os").networkInterfaces();
    for (const iface of Object.values(nets)) {
      for (const cfg of iface) {
        if (cfg.family === "IPv4" && !cfg.internal) {
          console.log(`> Network:  http://${cfg.address}:${port}`);
        }
      }
    }
  });
}).catch((err) => {
  console.error("Error starting server:", err);
  process.exit(1);
});
