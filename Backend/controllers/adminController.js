const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const multer = require("multer");
const bcrypt = require("bcryptjs");
const XLSX = require("xlsx");
const User = require("../models/User");
const BusRoute = require("../models/BusRoute");
const AdminUpload = require("../models/AdminUpload");

const VALID_ROUTES = [
  ...Array.from({ length: 10 }, (_, i) => `VV${i + 1}`),
  ...Array.from({ length: 10 }, (_, i) => `GV${i + 1}`),
];

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../uploads/admin");
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});

const allowedExt = [".csv", ".xlsx", ".xls"];
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExt.includes(ext)) cb(null, true);
    else cb(new Error("Only CSV/XLSX/XLS files are allowed"));
  },
  limits: { fileSize: 10 * 1024 * 1024 },
});

const requiredHeaders = ["regNo", "name", "email", "dues", "paidStatus"];

const normalizeHeader = (header) =>
  String(header || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");

const defaultPasswordFromName = (name = "") => {
  const compact = String(name || "").trim().replace(/\s+/g, "");
  return `${compact.toLowerCase()}@123`;
};

const normalizeRow = (row) => ({
  regNo: String(row.regNo || row.RegNo || row.REGNO || "").trim().toUpperCase(),
  name: String(row.name || row.Name || "").trim(),
  email: String(row.email || row.Email || "").trim().toLowerCase(),
  route: String(row.route || row.Route || "").trim().toUpperCase(),
  dues: Number(row.dues ?? row.Dues ?? NaN),
  paidStatus: String(row.paidStatus || row.PaidStatus || "").trim(),
});

const parseCsvRows = async (filePath) => {
  const rows = [];
  const headers = [];
  await new Promise((resolve, reject) => {
    const stream = fs.createReadStream(filePath).pipe(csv());
    stream.on("headers", (h) => headers.push(...h));
    stream.on("data", (raw) => rows.push(raw));
    stream.on("end", resolve);
    stream.on("error", reject);
  });
  return { rows, headers };
};

const parseExcelRows = (filePath) => {
  const wb = XLSX.readFile(filePath);
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return { rows: [], headers: [] };
  const rawRows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: "" });
  const first = rawRows[0] || {};
  return { rows: rawRows, headers: Object.keys(first) };
};

const parseFileRows = async (filePath, originalName) => {
  const ext = path.extname(originalName).toLowerCase();
  const parsed = ext === ".csv" ? await parseCsvRows(filePath) : parseExcelRows(filePath);
  return {
    rows: parsed.rows.map(normalizeRow),
    headers: parsed.headers || [],
  };
};

const validateRows = (rows, headers, selectedRoute = null) => {
  const errors = [];
  const normalizedHeaders = headers.map(normalizeHeader);
  const missingHeaders = requiredHeaders.filter((h) => !normalizedHeaders.includes(normalizeHeader(h)));
  if (missingHeaders.length) {
    errors.push(`Missing required columns: ${missingHeaders.join(", ")}`);
  }
  if (!rows.length) return { errors: ["File is empty"] };

  const seen = new Set();
  rows.forEach((r, idx) => {
    if (!r.regNo || !r.name || !r.email || (!r.route && !selectedRoute) || Number.isNaN(r.dues) || !r.paidStatus) {
      errors.push(`Row ${idx + 2}: missing required fields`);
      return;
    }
    if (seen.has(r.regNo)) errors.push(`Row ${idx + 2}: duplicate regNo ${r.regNo} in file`);
    seen.add(r.regNo);
    if (!r.email.endsWith("@vitapstudent.ac.in")) errors.push(`Row ${idx + 2}: invalid student email`);
    const effectiveRoute = selectedRoute || r.route;
    if (!VALID_ROUTES.includes(effectiveRoute)) errors.push(`Row ${idx + 2}: invalid route ${effectiveRoute}`);
    if (r.dues < 0) errors.push(`Row ${idx + 2}: dues must be >= 0`);
    if (!["Paid", "Unpaid"].includes(r.paidStatus)) errors.push(`Row ${idx + 2}: paidStatus must be Paid/Unpaid`);
  });

  return { errors };
};

const normalizeBusRouteId = (route) => {
  const normalized = String(route || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
  return normalized || null;
};

const resolveUploadRouteId = (req) => {
  return normalizeBusRouteId(
    req.body?.routeId || req.body?.selectedRoute || req.query?.routeId || req.query?.selectedRoute || ""
  );
};

const processRows = async (rows, selectedRoute = null) => {
  let created = 0;
  let updated = 0;
  const uploadRoute = normalizeBusRouteId(selectedRoute);

  for (const row of rows) {
    const defaultPassword = defaultPasswordFromName(row.name);
    const hash = await bcrypt.hash(defaultPassword, 10);
    // When uploading for a specific route, always assign that route (ignore CSV route column).
    const routeToUse = normalizeBusRouteId(uploadRoute || row.route);
    if (!routeToUse) {
      console.warn(`[CSV Upload] Skipping ${row.regNo}: missing busRoute`);
      continue;
    }

    console.log(`[CSV Upload] regNo=${row.regNo} busRoute=${routeToUse}`);

    const existing = await User.findOne({ regNo: row.regNo });

    if (existing) {
      existing.name = row.name;
      existing.displayName = row.name;
      existing.email = row.email;
      existing.busRoute = routeToUse;
      existing.selectedRoute = routeToUse;
      existing.dues = row.dues;
      existing.paidStatus = row.paidStatus;
      existing.role = "student";
      existing.password = hash;
      existing.isFirstLogin = true;
      await existing.save();
      updated += 1;
    } else {
      await User.create({
        regNo: row.regNo,
        name: row.name,
        displayName: row.name,
        email: row.email,
        password: hash,
        role: "student",
        busRoute: routeToUse,
        selectedRoute: routeToUse,
        dues: row.dues,
        paidStatus: row.paidStatus,
        isFirstLogin: true,
      });
      created += 1;
    }

    await BusRoute.findOneAndUpdate(
      { routeId: routeToUse },
      {
        $setOnInsert: {
          routeId: routeToUse,
          routeName: routeToUse,
          startLocation: "",
          endLocation: "",
        },
        $addToSet: { students: row.regNo },
      },
      { upsert: true, new: true }
    );
  }

  return { created, updated };
};

async function handleUploadAndProcess(file, existingUploadId = null, selectedRoute = null) {
  const { rows, headers } = await parseFileRows(file.path, file.originalname);
  const { errors } = validateRows(rows, headers, selectedRoute);
  if (errors.length) {
    return { ok: false, errors };
  }

  const { created, updated } = await processRows(rows, selectedRoute);

  let uploadDoc;
  if (existingUploadId) {
    uploadDoc = await AdminUpload.findById(existingUploadId);
    if (uploadDoc && uploadDoc.filePath && fs.existsSync(uploadDoc.filePath)) {
      fs.unlinkSync(uploadDoc.filePath);
    }
    if (uploadDoc) {
      uploadDoc.fileName = path.basename(file.path);
      uploadDoc.route = selectedRoute;
      uploadDoc.originalName = file.originalname;
      uploadDoc.filePath = file.path;
      uploadDoc.mimeType = file.mimetype || "application/octet-stream";
      uploadDoc.size = file.size || 0;
      uploadDoc.uploadedAt = new Date();
      uploadDoc.totalRows = rows.length;
      uploadDoc.createdCount = created;
      uploadDoc.updatedCount = updated;
      uploadDoc.status = "processed";
      uploadDoc.errors = [];
      await uploadDoc.save();
    }
  } else {
    uploadDoc = await AdminUpload.create({
      fileName: path.basename(file.path),
      route: selectedRoute,
      originalName: file.originalname,
      filePath: file.path,
      mimeType: file.mimetype || "application/octet-stream",
      size: file.size || 0,
      uploadedAt: new Date(),
      totalRows: rows.length,
      createdCount: created,
      updatedCount: updated,
      status: "processed",
      errors: [],
    });
  }

  return { ok: true, rows, created, updated, uploadDoc };
}

exports.uploadStudentsCsv = (req, res) => {
  upload.single("csvFile")(req, res, async (err) => {
    if (err) return res.status(400).json({ success: false, error: err.message });
    if (!req.file) return res.status(400).json({ success: false, error: "CSV/Excel file is required" });

    try {
      const selectedRoute = resolveUploadRouteId(req);
      if (selectedRoute && !VALID_ROUTES.includes(selectedRoute)) {
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(400).json({ success: false, error: "Invalid selected route" });
      }

      const result = await handleUploadAndProcess(req.file, null, selectedRoute);
      if (!result.ok) {
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(400).json({ success: false, error: "Validation failed", errors: result.errors });
      }

      return res.json({
        success: true,
        message: "File processed successfully",
        uploadId: result.uploadDoc?._id,
        summary: {
          total: result.rows.length,
          created: result.created,
          updated: result.updated,
          errors: [],
        },
      });
    } catch (error) {
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(500).json({ success: false, error: error.message });
    }
  });
};

exports.listUploads = async (req, res) => {
  try {
    const files = await AdminUpload.find().sort({ createdAt: -1 });
    res.json({ success: true, files });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.viewUpload = async (req, res) => {
  try {
    const file = await AdminUpload.findById(req.params.id);
    if (!file) return res.status(404).json({ success: false, error: "File not found" });
    if (!fs.existsSync(file.filePath)) return res.status(404).json({ success: false, error: "Stored file not found" });

    const parsed = await parseFileRows(file.filePath, file.originalName);
    const rows = Array.isArray(parsed?.rows) ? parsed.rows : [];
    res.json({ success: true, file, preview: rows.slice(0, 50) });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateUpload = (req, res) => {
  upload.single("csvFile")(req, res, async (err) => {
    if (err) return res.status(400).json({ success: false, error: err.message });
    if (!req.file) return res.status(400).json({ success: false, error: "CSV/Excel file is required" });

    try {
      const selectedRoute = resolveUploadRouteId(req);
      if (selectedRoute && !VALID_ROUTES.includes(selectedRoute)) {
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(400).json({ success: false, error: "Invalid selected route" });
      }

      const existing = await AdminUpload.findById(req.params.id);
      if (!existing) {
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(404).json({ success: false, error: "File record not found" });
      }

      const result = await handleUploadAndProcess(req.file, existing._id, selectedRoute || existing.route || null);
      if (!result.ok) {
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(400).json({ success: false, error: "Validation failed", errors: result.errors });
      }

      return res.json({
        success: true,
        message: "File updated and reprocessed successfully",
        uploadId: existing._id,
        summary: { total: result.rows.length, created: result.created, updated: result.updated, errors: 0 },
      });
    } catch (error) {
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(500).json({ success: false, error: error.message });
    }
  });
};

exports.deleteUpload = async (req, res) => {
  try {
    const file = await AdminUpload.findByIdAndDelete(req.params.id);
    if (!file) return res.status(404).json({ success: false, error: "File not found" });
    if (file.filePath && fs.existsSync(file.filePath)) fs.unlinkSync(file.filePath);

    res.json({ success: true, message: "File deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};