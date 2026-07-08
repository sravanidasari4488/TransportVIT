const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const User = require("../models/User");

const OTP_TTL_MS = 10 * 60 * 1000;
const otpStore = new Map();

const getJwtSecret = () => process.env.JWT_SECRET || "dev_jwt_secret_change_me";
const ADMIN_USERNAME = "admin@vitap";
const ADMIN_DEFAULT_PASSWORD = "vitap@123";

const signToken = (payload) => jwt.sign(payload, getJwtSecret(), { expiresIn: "7d" });

const getUserFromAuthHeader = async (authHeader) => {
  const token = (authHeader || "").startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return null;
  const payload = jwt.verify(token, getJwtSecret());
  const user = await User.findById(payload.id);
  return user || null;
};

const buildDefaultPasswordCandidates = (name = "") => {
  const raw = String(name || "").trim();
  const compact = raw.replace(/\s+/g, "");
  const firstToken = raw.split(/\s+/).filter(Boolean)[0] || "";
  const candidates = [
    `${raw}@123`,
    `${compact}@123`,
    `${firstToken}@123`,
    `${compact.toLowerCase()}@123`,
    `${firstToken.toLowerCase()}@123`,
  ].filter((v) => v && v !== "@123");
  return Array.from(new Set(candidates));
};

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === "true",
  auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
});

const normalizeBusRoute = (route) => {
  const normalized = String(route || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
  return normalized || null;
};

const sanitizeUser = (userDoc) => ({
  id: userDoc._id,
  regNo: userDoc.regNo,
  name: userDoc.name || userDoc.displayName,
  email: userDoc.email,
  role: userDoc.role,
  busRoute: normalizeBusRoute(userDoc.busRoute || userDoc.selectedRoute),
  dues: userDoc.dues || 0,
  paidStatus: userDoc.paidStatus || "Unpaid",
  isFirstLogin: !!userDoc.isFirstLogin,
});

async function ensureDefaultAdmin() {
  let admin = await User.findOne({ role: "admin", email: ADMIN_USERNAME });
  if (!admin) {
    admin = await User.create({
      regNo: "ADMIN",
      name: "Transport Admin",
      displayName: "Transport Admin",
      email: ADMIN_USERNAME,
      password: await bcrypt.hash(ADMIN_DEFAULT_PASSWORD, 10),
      role: "admin",
      isFirstLogin: false,
      paidStatus: "Paid",
      dues: 0,
    });
  }
  return admin;
}

exports.login = async (req, res) => {
  try {
    const role = (req.body.role || "student").toString().toLowerCase();
    const username = (req.body.username || req.body.regNo || "").toString().trim();
    const password = (req.body.password || "").toString();

    if (!username || !password) {
      return res.status(400).json({ success: false, error: "username and password are required" });
    }

    let user;

    if (role === "admin") {
      const admin = await ensureDefaultAdmin();
      if (username.toLowerCase() !== ADMIN_USERNAME) {
        return res.status(401).json({ success: false, error: "Invalid admin credentials" });
      }
      user = admin;
    } else {
      const regNo = username.toUpperCase();
      user = await User.findOne({ regNo, role: "student" });
      if (!user || !user.password) {
        return res.status(401).json({ success: false, error: "Invalid student credentials" });
      }
    }

    let ok = await bcrypt.compare(password, user.password);

    // Migration-safe fallback for first login when old uploads used
    // slightly different "name@123" formatting.
    if (!ok && user.role === "student" && user.isFirstLogin) {
      const defaultCandidates = buildDefaultPasswordCandidates(user.name || user.displayName || "");
      if (defaultCandidates.includes(password)) {
        ok = true;
        user.password = await bcrypt.hash(password, 10);
      }
    }

    if (!ok) {
      return res.status(401).json({ success: false, error: "Invalid credentials" });
    }

    user.lastLogin = new Date();
    await user.save();

    const freshUser = await User.findById(user._id);
    const busRoute = normalizeBusRoute(
      freshUser?.busRoute || freshUser?.selectedRoute || user.busRoute || user.selectedRoute
    );

    console.log(`[Login] regNo=${user.regNo} busRoute=${busRoute ?? "null"}`);

    const token = signToken({
      id: user._id.toString(),
      regNo: user.regNo,
      role: user.role,
      busRoute,
    });
    return res.json({
      success: true,
      token,
      role: user.role,
      busRoute,
      name: user.name || user.displayName,
      regNo: user.regNo,
      user: sanitizeUser(freshUser || user),
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const regNo = (req.body.regNo || "").toString().trim().toUpperCase();
    const oldPassword = (req.body.oldPassword || "").toString();
    const newPassword = (req.body.newPassword || "").toString();

    if (!regNo || !oldPassword || !newPassword) {
      return res.status(400).json({ success: false, error: "regNo, oldPassword and newPassword are required" });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, error: "New password must be at least 8 characters" });
    }

    const user = await User.findOne({ regNo });
    if (!user || !user.password) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const ok = await bcrypt.compare(oldPassword, user.password);
    if (!ok) {
      return res.status(401).json({ success: false, error: "Old password is incorrect" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.isFirstLogin = false;
    await user.save();

    return res.json({ success: true, message: "Password changed successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

exports.requestOtp = async (req, res) => {
  try {
    const regNo = (req.body.regNo || "").toString().trim().toUpperCase();
    if (!regNo) return res.status(400).json({ success: false, error: "regNo is required" });

    const user = await User.findOne({ regNo, role: "student" });
    if (!user) return res.status(404).json({ success: false, error: "Student not found" });

    const otp = `${Math.floor(100000 + Math.random() * 900000)}`;
    otpStore.set(regNo, { otp, expiresAt: Date.now() + OTP_TTL_MS });

    if (process.env.SMTP_USER) {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: user.email,
        subject: "Transport App Password Reset OTP",
        text: `Your OTP is ${otp}. It will expire in 10 minutes.`,
      });
    } else {
      console.log(`OTP for ${regNo}: ${otp}`);
    }

    return res.json({ success: true, message: "OTP sent to registered email" });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

exports.verifyOtpAndResetPassword = async (req, res) => {
  try {
    const regNo = (req.body.regNo || "").toString().trim().toUpperCase();
    const otp = (req.body.otp || "").toString().trim();
    const newPassword = (req.body.newPassword || "").toString();

    if (!regNo || !otp || !newPassword) {
      return res.status(400).json({ success: false, error: "regNo, otp, newPassword are required" });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, error: "New password must be at least 8 characters" });
    }

    const record = otpStore.get(regNo);
    if (!record || record.expiresAt < Date.now()) {
      otpStore.delete(regNo);
      return res.status(400).json({ success: false, error: "OTP expired or not found" });
    }
    if (record.otp !== otp) {
      return res.status(400).json({ success: false, error: "Invalid OTP" });
    }

    const user = await User.findOne({ regNo, role: "student" });
    if (!user) return res.status(404).json({ success: false, error: "Student not found" });

    user.password = await bcrypt.hash(newPassword, 10);
    user.isFirstLogin = false;
    await user.save();
    otpStore.delete(regNo);

    return res.json({ success: true, message: "Password reset successful" });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

exports.me = async (req, res) => {
  try {
    const user = await getUserFromAuthHeader(req.headers.authorization || "");
    if (!user) return res.status(404).json({ success: false, error: "User not found" });

    return res.json({ success: true, user: sanitizeUser(user) });
  } catch (error) {
    return res.status(401).json({ success: false, error: "Invalid token" });
  }
};

exports.getStudentRoute = async (req, res) => {
  try {
    const user = await getUserFromAuthHeader(req.headers.authorization || "");
    if (!user) return res.status(401).json({ success: false, error: "Invalid token" });
    if (user.role !== "student") {
      return res.status(403).json({ success: false, error: "Only students can access this endpoint" });
    }
    if (!user.busRoute) {
      return res.status(404).json({ success: false, error: "No route assigned for this student" });
    }

    return res.json({
      success: true,
      route: {
        routeName: user.busRoute,
      },
    });
  } catch (error) {
    return res.status(401).json({ success: false, error: "Invalid token" });
  }
};