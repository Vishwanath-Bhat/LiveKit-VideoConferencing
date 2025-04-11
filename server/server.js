const express = require("express");
const https = require("https");
const fs = require('fs');
const socketIO = require("socket.io");
const cors = require("cors");
const { AccessToken } = require("livekit-server-sdk");
require('dotenv').config();


const requiredEnvVars = ['LIVEKIT_API_KEY', 'LIVEKIT_SECRET', 'LIVEKIT_URL'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}


const app = express();
const server = https.createServer({
  key: fs.readFileSync('./ssl/key.pem'),
  cert: fs.readFileSync('./ssl/cert.pem'),
}, app);

const io = socketIO(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket'],
  allowUpgrades: false
});

app.use(cors());
app.use(express.json());

const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_SECRET = process.env.LIVEKIT_SECRET;
const LIVEKIT_URL = process.env.LIVEKIT_URL;

app.post("/get-token", async (req, res) => {
  const { identity, room } = req.body;

  const token = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_SECRET, {
    identity,
  });

  token.addGrant({ roomJoin: true, room });

  try {
    const jwt = await token.toJwt();
    res.json({ token: jwt, url: LIVEKIT_URL });
  } catch (err) {
    console.error("Error generating token:", err);
    res.status(500).json({ error: "Token generation failed" });
  }
});

io.on("connection", (socket) => {
  console.log("Client connected for subtitles.");

  const phrases = [
    "Hello there!", 
    "Welcome to the meeting.",
    "How are you today?",
    "This is a live subtitle demo.",
    "The system is working well!"
  ];
  let i = 0;

  const interval = setInterval(() => {
    const phrase = phrases[i % phrases.length];
    socket.emit("subtitle", phrase);
    console.log('Sent subtitle:', phrase);
    i++;
  }, 3000);

  socket.on("disconnect", () => {
    clearInterval(interval);
    console.log("Client disconnected.");
  });

  socket.on("error", (err) => {
    console.error("Socket error:", err);
  });
});

server.listen(3000, '0.0.0.0', () => {
  console.log("Backend running on https://localhost:3000");
});