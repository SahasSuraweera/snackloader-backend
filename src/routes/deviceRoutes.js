// src/routes/deviceRoutes.js
const express = require("express");
const router = express.Router();

const deviceCtrl = require("../controllers/deviceController");
const { verifyFirebaseIdToken } = require("../utils/authMiddleware");

// Device registration (frontend)
router.post("/register", verifyFirebaseIdToken, deviceCtrl.registerDevice);

// Get device status
router.get("/:id/status", verifyFirebaseIdToken, deviceCtrl.getDeviceStatus);

// Update schedules/settings
router.post("/:id/settings", verifyFirebaseIdToken, deviceCtrl.updateSettings);

// Manual feed
router.post("/:id/feed-cat", verifyFirebaseIdToken, deviceCtrl.feedCat);
router.post("/:id/feed-dog", verifyFirebaseIdToken, deviceCtrl.feedDog);

// Device polling for commands (device calls)
router.get("/:id/commands", deviceCtrl.getCommands);
router.post("/:id/commands/:cmdId/processed", deviceCtrl.markCommandProcessed);

// Telemetry & heartbeat from device
router.post("/:id/telemetry", deviceCtrl.postTelemetry);
router.post("/:id/heartbeat", deviceCtrl.heartbeat);

// Device logs feeding (after hardware performed feed)
router.post("/:id/feed-log", deviceCtrl.logFeeding);

// Frontend reads logs
router.get("/:id/feed-logs", verifyFirebaseIdToken, deviceCtrl.getFeedLogs);

module.exports = router;
