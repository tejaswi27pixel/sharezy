const express = require("express");
const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const fs = require("fs");
const app = express();
const cors = require("cors");

app.use(express.static(path.join(__dirname, "public")));
app.use(cors());

const upload = multer(); // Use multer without specifying a destination

const fileStore = {}; // In-memory storage for file metadata

app.use(express.json());

app.post("/upload", upload.single("file"), (req, res) => {
  const file = req.file;
  const { description, password } = req.body;

  if (!file) {
    return res.status(400).json({ error: "File upload failed." });
  }

  const fileId = crypto.randomBytes(16).toString("hex");
  const fileLink = `https://sharezy.onrender.com/file/${fileId}/download`;

  // Store file metadata including the file buffer
  fileStore[fileId] = {
    fileBuffer: file.buffer, // Store the file buffer
    description,
    password,
    originalName: file.originalname,
  };

  res.json({ fileLink });
});

app.get("/file/:fileId/download", (req, res) => {
  const { fileId } = req.params;
  const { password } = req.query;

  const fileMetadata = fileStore[fileId];

  if (!fileMetadata) {
    return res.status(404).send("File not found.");
  }

  if (fileMetadata.password && fileMetadata.password !== password) {
    return res.status(403).send("Incorrect password.");
  }

  // Send the file buffer directly
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=${fileMetadata.originalName}`
  );
  res.setHeader("Content-Type", "application/octet-stream");
  res.send(fileMetadata.fileBuffer);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
