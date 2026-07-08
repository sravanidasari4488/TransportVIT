const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");

router.post("/create-or-update", userController.createOrUpdateUser);
router.get("/", userController.getAllUsers);
router.put("/:regNo/preferences", userController.updateUserPreferences);
router.put("/:regNo", userController.updateUserByRegNo);
router.get("/:regNo", userController.getUserByRegNo);
router.delete("/bulk", userController.bulkDeleteByRoute);
router.delete("/:userId/delete", userController.deleteUser);

module.exports = router;
