const mongoose = require("mongoose");

const adminUploadSchema = new mongoose.Schema(
  {
    route: { type: String, uppercase: true, trim: true, default: null },
    fileName: { type: String, required: true },
    originalName: { type: String, required: true },
    filePath: { type: String, required: true },
    mimeType: { type: String, default: "application/octet-stream" },
    size: { type: Number, default: 0 },
    uploadedAt: { type: Date, default: Date.now },
    totalRows: { type: Number, default: 0 },
    createdCount: { type: Number, default: 0 },
    updatedCount: { type: Number, default: 0 },
    status: { type: String, enum: ["processed", "failed"], default: "processed" },
    errors: { type: [String], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AdminUpload", adminUploadSchema);