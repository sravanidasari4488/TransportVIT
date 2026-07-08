const User = require("../models/User");
const BusRoute = require("../models/BusRoute");

const VALID_ROUTES = [
  ...Array.from({ length: 10 }, (_, i) => `VV${i + 1}`),
  ...Array.from({ length: 10 }, (_, i) => `GV${i + 1}`),
];

const sanitizeUser = (userDoc) => ({
  id: userDoc._id,
  _id: userDoc._id,
  regNo: userDoc.regNo,
  name: userDoc.name || userDoc.displayName,
  email: userDoc.email,
  role: userDoc.role,
  busRoute: userDoc.busRoute || userDoc.selectedRoute || null,
  paidStatus: userDoc.paidStatus || "Unpaid",
  dues: userDoc.dues ?? 0,
});

const syncBusRouteMembership = async (regNo, oldRoute, newRoute) => {
  const upperReg = String(regNo || "").trim().toUpperCase();
  const prev = oldRoute ? String(oldRoute).trim().toUpperCase() : null;
  const next = newRoute ? String(newRoute).trim().toUpperCase() : null;

  if (prev && prev !== next) {
    await BusRoute.updateOne({ routeId: prev }, { $pull: { students: upperReg } });
  }
  if (next) {
    await BusRoute.findOneAndUpdate(
      { routeId: next },
      {
        $setOnInsert: {
          routeId: next,
          routeName: next,
          startLocation: "",
          endLocation: "",
        },
        $addToSet: { students: upperReg },
      },
      { upsert: true, new: true }
    );
  }
};

exports.createOrUpdateUser = async (req, res) => {
  try {
    const regNo = String(req.body.regNo || "").trim().toUpperCase();
    const email = String(req.body.email || "").trim().toLowerCase();
    const name = String(req.body.name || req.body.displayName || "").trim();

    if (!regNo || !email || !name) {
      return res.status(400).json({ success: false, error: "regNo, email, and name are required" });
    }

    let user = await User.findOne({ regNo });
    if (user) {
      const oldRoute = user.busRoute;
      user.email = email;
      user.name = name;
      user.displayName = name;
      user.role = req.body.role || user.role || "student";
      user.selectedRoute = req.body.selectedRoute ?? user.selectedRoute;
      user.busRoute = req.body.busRoute ?? user.busRoute;
      user.lastLogin = new Date();
      await user.save();
      if (user.busRoute && user.busRoute !== oldRoute) {
        await syncBusRouteMembership(user.regNo, oldRoute, user.busRoute);
      }
    } else {
      user = await User.create({
        regNo,
        email,
        name,
        displayName: name,
        role: req.body.role || "student",
        selectedRoute: req.body.selectedRoute || null,
        busRoute: req.body.busRoute || null,
      });
      if (user.busRoute) {
        await syncBusRouteMembership(user.regNo, null, user.busRoute);
      }
    }

    res.json({ success: true, user: sanitizeUser(user) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getUserByRegNo = async (req, res) => {
  try {
    const regNo = String(req.params.regNo || "").trim().toUpperCase();
    const user = await User.findOne({ regNo }).select("-password");
    if (!user) return res.status(404).json({ success: false, error: "User not found" });
    res.json({ success: true, user: sanitizeUser(user) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.updateUserPreferences = async (req, res) => {
  try {
    const regNo = String(req.params.regNo || "").trim().toUpperCase();
    const user = await User.findOne({ regNo });
    if (!user) return res.status(404).json({ success: false, error: "User not found" });

    if (req.body.preferences) user.preferences = { ...user.preferences, ...req.body.preferences };
    if (req.body.selectedRoute !== undefined) {
      user.selectedRoute = req.body.selectedRoute;
      user.busRoute = req.body.selectedRoute;
    }

    await user.save();
    res.json({ success: true, user: sanitizeUser(user) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.updateUserByRegNo = async (req, res) => {
  try {
    const regNo = String(req.params.regNo || "").trim().toUpperCase();
    const user = await User.findOne({ regNo });
    if (!user) return res.status(404).json({ success: false, error: "User not found" });

    const oldRoute = user.busRoute;

    if (req.body.name !== undefined) {
      const name = String(req.body.name || "").trim();
      if (!name) return res.status(400).json({ success: false, error: "name cannot be empty" });
      user.name = name;
      user.displayName = name;
    }

    if (req.body.email !== undefined) {
      const email = String(req.body.email || "").trim().toLowerCase();
      if (!email) return res.status(400).json({ success: false, error: "email cannot be empty" });
      user.email = email;
    }

    if (req.body.busRoute !== undefined) {
      const busRoute = String(req.body.busRoute || "").trim().toUpperCase();
      if (busRoute && !VALID_ROUTES.includes(busRoute)) {
        return res.status(400).json({ success: false, error: `Invalid bus route: ${busRoute}` });
      }
      user.busRoute = busRoute || null;
      user.selectedRoute = busRoute || null;
    }

    if (req.body.paidStatus !== undefined) {
      const paidStatus = String(req.body.paidStatus || "").trim();
      const normalized =
        paidStatus.toLowerCase() === "paid" ? "Paid" : paidStatus.toLowerCase() === "unpaid" ? "Unpaid" : paidStatus;
      if (!["Paid", "Unpaid"].includes(normalized)) {
        return res.status(400).json({ success: false, error: "paidStatus must be Paid or Unpaid" });
      }
      user.paidStatus = normalized;
    }

    await user.save();

    if (req.body.busRoute !== undefined && user.busRoute !== oldRoute) {
      await syncBusRouteMembership(user.regNo, oldRoute, user.busRoute);
    }

    res.json({ success: true, user: sanitizeUser(user) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const query = {};

    if (req.query.busRoute) {
      const busRoute = String(req.query.busRoute).trim().toUpperCase();
      query.busRoute = busRoute;
      query.role = "student";
    } else if (req.query.role) {
      query.role = String(req.query.role).trim().toLowerCase();
    }

    const total = await User.countDocuments(query);
    const users = await User.find(query).select("-password").sort({ name: 1, regNo: 1 });
    const sanitized = users.map(sanitizeUser);

    res.json({
      success: true,
      users: sanitized,
      total,
      count: total,
      busRoute: query.busRoute || null,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.bulkDeleteByRoute = async (req, res) => {
  try {
    const busRoute = String(req.query.busRoute || "").trim().toUpperCase();
    if (!busRoute) {
      return res.status(400).json({ success: false, error: "busRoute query param is required" });
    }

    const result = await User.deleteMany({ busRoute, role: "student" });

    await BusRoute.updateOne({ routeId: busRoute }, { $set: { students: [] } });

    res.json({
      success: true,
      message: `Deleted all students for route ${busRoute}`,
      deleted: result.deletedCount,
      busRoute,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.userId);
    if (!user) return res.status(404).json({ success: false, error: "User not found" });

    if (user.regNo && user.busRoute) {
      await BusRoute.updateOne(
        { routeId: String(user.busRoute).toUpperCase() },
        { $pull: { students: user.regNo } }
      );
    }

    res.json({ success: true, message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
