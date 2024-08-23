const nodemailer = require("nodemailer");
const transporter = nodemailer.createTransport({
  host: "smtp.tejaswianand.com",
  port: 465,
  auth: {
    user: "sharezy@tejaswianand.com",
    pass: "Bs5d9bf0c",
  },
});
module.exports = transporter;
