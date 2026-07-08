const express = require("express");
const {
  uploadStudentsCsv,
  listUploads,
  viewUpload,
  updateUpload,
  deleteUpload,
} = require("../controllers/adminController");

const router = express.Router();

router.post("/upload-students-csv", uploadStudentsCsv);
router.post("/upload-csv", uploadStudentsCsv);
router.get("/files", listUploads);
router.get("/files/:id", viewUpload);
router.put("/files/:id", updateUpload);
router.delete("/files/:id", deleteUpload);

module.exports = router;