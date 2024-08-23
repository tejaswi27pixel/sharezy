const mongoose = require("mongoose");

const usersSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      unique: true,
      lowercase: true,
    },
    otp: { value: { type: String }, expiry: { type: Date } },
    lastSessionData: {
      token: { type: String },
      ip: { type: String },
    },
  },
  { timestamps: true }
);

const Users = mongoose.model("Users", usersSchema);
module.exports = Users;
