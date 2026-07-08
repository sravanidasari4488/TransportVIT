const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

router.post("/login", authController.login);
router.post("/change-password", authController.changePassword);
router.post("/forgot-password/request-otp", authController.requestOtp);
router.post("/forgot-password/verify-otp", authController.verifyOtpAndResetPassword);
router.get("/me", authController.me);
router.get("/student/route", authController.getStudentRoute);

module.exports = router;