const express = require("express");
const path = require("path");
const crypto = require("crypto");
const fs = require("fs");
const app = express();
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const authRoutes = require("./Routes/Auth");
const fileRoutes = require("./Routes/Files");
const http = require("http");
const { Server } = require("socket.io");

app.use(cors());
app.use(express.json());

dotenv.config();

// Create an HTTP server and attach Socket.io to it
const allowedOrigins = [
  "http://192.168.1.4:3000",
  "https://sharezy.tejaswianand.com",
  "http://localhost:3000", // Add this if you're also testing locally
];
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (allowedOrigins.includes(origin)) {
        callback(null, true); // Allow the request
      } else {
        callback(new Error("Not allowed by CORS")); // Block the request
      }
    },
    methods: ["GET", "POST"],
  },
});

app.use(express.static(path.join(__dirname, "public")));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: "Too many requests from this IP, please try again later.",
});
app.use(limiter);

mongoose.connect(process.env.DB_URL, {
  useUnifiedTopology: true,
});

mongoose.connection.on("connected", () => {
  console.log("Connected to MongoDB");
});

mongoose.connection.on("error", (err) => {
  console.error("MongoDB connection error:", err);
});
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  socket.on("offer", (data) => {
    console.log("Offer received:", data);
    socket.broadcast.emit("offer", data); // Forward offer to other peers
  });

  socket.on("answer", (data) => {
    console.log("Answer received:", data);
    socket.broadcast.emit("answer", data); // Forward answer to other peers
  });

  socket.on("candidate", (candidate) => {
    console.log("ICE candidate received:", candidate);
    socket.broadcast.emit("candidate", candidate); // Forward ICE candidate to other peers
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/files", fileRoutes);

const PORT = process.env.PORT || 5000;

// Start the server using the HTTP server instance
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
