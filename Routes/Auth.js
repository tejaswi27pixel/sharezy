const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const User = require("./../Models/Users");
const transporter = require("../mailConfig");
const crypto = require("crypto");
const axios = require("axios");

router.post("/send-otp", async (req, res) => {
  const { email } = req.body;
  const ip = req.ip;

  try {
    const user = await User.findOne({ email });

    // Generate OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    if (user) {
      const lastOtpTimestamp = user.otp.expiry || new Date(0);
      const otpCooldownPeriod = 60 * 1000; // 1 minute in milliseconds

      // Calculate the time remaining before a new OTP can be requested
      const timeElapsed = Date.now() - lastOtpTimestamp.getTime();
      const timeRemaining = Math.max(otpCooldownPeriod - timeElapsed, 0); // Ensure timeRemaining is not negative

      // Ensure only one OTP is sent per minute
      //   if (timeRemaining > 0) {
      //     return res.status(429).json({
      //       status: false,
      //       message: `Please wait ${Math.ceil(
      //         timeRemaining / 1000
      //       )} seconds before requesting a new OTP.`,
      //     });
      //   }

      // Proceed with OTP generation if the cooldown period has elapsed

      // Update existing user with new OTP and expiry
      user.otp = { value: otp, expiry: otpExpiry };
      await user.save();
    } else {
      // Create a new user if not exists
      const token = jwt.sign({ email }, process.env.JWT_KEY, {
        expiresIn: "8h",
      });

      const newUser = new User({
        email,
        otp: { value: otp, expiry: otpExpiry },
      });
      await newUser.save();
    }

    // Send OTP email
    const emailBody = `
      <div style="font-family: Arial, sans-serif; background-color: #f0f0f0; padding: 40px; text-align: center; max-width: 600px; margin: 0 auto;">
    <div style="background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);">
        <h1 style="font-size: 28px; font-weight: bold; color: #333; margin: 0; letter-spacing: 0px;">SHAREZY</h1>
        <p style="font-size: 18px; font-weight: normal; color: #666; margin: 20px 0 30px;">Hii, ${email}, Here is your OTP start a new session</p>
        <p style="font-size: 36px; font-weight: bold; color: #007BFF; margin: 0; letter-spacing: 4px;">${otp}</p>
        <p style="font-size: 14px; color: #888; margin: 20px 0 0;">
            If you did not request this, please ignore this email.
        </p>
    </div>
</div>

    `;

    await transporter.sendMail({
      from: '"Sharezy" <sharezy@tejaswianand.com>',
      to: email,
      subject: "Your OTP to Start Session",
      html: emailBody,
    });

    res.status(200).json({
      status: true,
      message: "OTP sent successfully to your email.",
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ status: false, message: "Internal Server Error" });
  }
});

router.post("/verify-otp", async (req, res) => {
  const { email, otp, ip, location } = req.body;
  const currentTime = new Date();

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        status: false,
        message: "User not found.",
      });
    }

    const otpExpiry = user.otp.expiry;

    // Check if OTP is correct and not expired
    if (user.otp.value !== otp || currentTime > otpExpiry) {
      return res.status(400).json({
        status: false,
        message: "Invalid or expired OTP.",
      });
    }

    // Generate new token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_KEY, {
      expiresIn: "8h",
    });

    // Update user's last login data
    user.lastSessionData = { token: token, ip: ip };
    await user.save();

    // Send session start email
    const emailBody = `
      <div style="font-family: Arial, sans-serif; background-color: #f0f0f0; padding: 40px; text-align: center; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);">
          <h1 style="font-size: 28px; font-weight: bold; color: #333; margin: 0; letter-spacing: 2px;">
            SHAREZY
          </h1>
          <p style="font-size: 18px; font-weight: normal; color: #666; margin: 20px 0 30px;">
            A new session has been started with the following details:
          </p>
          <ul style="list-style: none; padding: 0; margin: 0 0 30px; text-align: left;">
            <li style="font-size: 16px; margin-bottom: 8px;">
              <strong>IP Address:</strong> ${ip}
            </li>
            <li style="font-size: 16px; margin-bottom: 8px;">
              <strong>Location:</strong> ${location}
            </li>
            <li style="font-size: 16px; margin-bottom: 8px;">
              <strong>Time:</strong> ${currentTime.toLocaleString()}
            </li>
          </ul>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: '"Sharezy" <sharezy@tejaswianand.com>',
      to: email,
      subject: "New Session Started",
      html: emailBody,
    });

    res.status(200).json({
      status: true,
      message: "OTP verified successfully. New session started.",
      token: token,
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ status: false, message: "Internal Server Error" });
  }
});

module.exports = router;
