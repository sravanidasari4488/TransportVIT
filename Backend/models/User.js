const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  regNo: {
    type: String,
    uppercase: true,
    trim: true,
    unique: true,
    sparse: true,
    index: true,
  },
  name: {
    type: String,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    trim: true,
  },
  role: {
    type: String,
    enum: ["faculty", "student", "admin"],
    default: "faculty",
  },
  busRoute: {
    type: String,
    uppercase: true,
    trim: true,
    default: null,
  },
  dues: {
    type: Number,
    default: 0,
    min: 0,
  },
  paidStatus: {
    type: String,
    enum: ["Paid", "Unpaid"],
    default: "Unpaid",
  },
  isFirstLogin: {
    type: Boolean,
    default: false,
  },
  displayName: {
    type: String,
    trim: true,
  },
  photoURL: {
    type: String,
    default: null,
  },
  firebaseUid: {
    type: String,
    unique: true,
    sparse: true,
  },
  selectedRoute: {
    type: String,
    default: null,
  },
  preferences: {
    notifications: {
      type: Boolean,
      default: true,
    },
    theme: {
      type: String,
      enum: ["light", "dark", "auto"],
      default: "auto",
    },
  },
  lastLogin: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);