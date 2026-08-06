// server.js
const path = require("path");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { v4: uuidv4 } = require("uuid");
const chalk = require("chalk");

const { startSession } = require("./lib/sessionManager");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Health check — useful for free-tier hosts (Katabump etc.) that ping to keep alive
app.get("/health", (_req, res) => res.status(200).send("OK"));

io.on("connection", (socket) => {
  socket.on("join", (sessionId) => {
    socket.join(sessionId);
  });

  socket.on("start", async ({ method, number }) => {
    const sessionId = uuidv4();
    socket.join(sessionId);
    socket.emit("session-room", { sessionId });

    if (method === "code" && (!number || number.replace(/[^0-9]/g, "").length < 8)) {
      socket.emit("error", { message: "Enter a valid phone number with country code." });
      return;
    }

    try {
      await startSession(sessionId, method, number, io);
    } catch (err) {
      console.error(err);
      socket.emit("error", { message: "Something went wrong. Please try again." });
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(chalk.greenBright(`\n⚡ LEGEND MD Session Generator running on port ${PORT}\n`));
});
