const mongoose = require("mongoose");

const fileMetaSchema = new mongoose.Schema(
  {
    filename: { type: String },
    size: { type: Number },
    encryptionKey: { type: String },
    offer: { type: Object, required: true },
    description: {
      type: String,
    },
    isProtected: {
      type: Boolean,
      default: false,
    },
    host: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: function () {
        return this.isProtected;
      },
    },
    uploadedIP: {
      type: String,
    },
    link: { type: String, unique: false },
  },
  { timestamps: true }
);

const FileMeta = mongoose.model("FileMeta", fileMetaSchema);
module.exports = FileMeta;
