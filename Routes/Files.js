const express = require("express");
const router = express.Router();
const multer = require("multer");

const upload = multer(); // Use multer without specifying a destination

const fileStore = {}; // In-memory storage for file metadata

const FileMeta = require("./../Models/FileMeta");
router.post("/create-link", async (req, res) => {
  try {
    const { filename, size, encryptionKey, offer, host } = req.body;
    const fileMeta = new FileMeta({
      filename,
      size,
      encryptionKey,
      offer,
      host,
    });
    await fileMeta.save();
    res.json({ link: `${process.env.app_url}/download/${fileMeta._id}` });
  } catch (error) {
    console.log(error);
  }
});
router.get("/:fileId", async (req, res) => {
  try {
    const { fileId } = req.params;
    const fileMeta = await FileMeta.findById(fileId);

    if (!fileMeta) {
      return res.status(404).json({ message: "File not found" });
    }

    res.json(fileMeta);
  } catch (error) {
    console.error("Error fetching file metadata:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router.post("/upload", upload.single("file"), (req, res) => {
  const file = req.file;
  const { description, password } = req.body;

  if (!file) {
    return res.status(400).json({ error: "File upload failed." });
  }

  const fileId = crypto.randomBytes(16).toString("hex");
  const fileLink = `https://192.168.1.4:5000/file/${fileId}/download`;

  // Store file metadata including the file buffer
  fileStore[fileId] = {
    fileBuffer: file.buffer, // Store the file buffer
    description,
    password,
    originalName: file.originalname,
  };

  res.json({ fileLink });
});

router.get("/file/:fileId/download", (req, res) => {
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
module.exports = router;
