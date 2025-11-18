const express = require("express");
const router = express.Router();

const deviceCtrl = require("../controllers/deviceController");
const { verifyFirebaseIdToken } = require("../utils/authMiddleware");

// Registration disabled
// router.post("/register", verifyFirebaseIdToken, deviceCtrl.registerDevice);

// Status
router.get("/status", verifyFirebaseIdToken, deviceCtrl.getDeviceStatus);

// Settings
router.post("/settings", verifyFirebaseIdToken, deviceCtrl.updateSettings);

// Manual feeds
router.post("/feed-cat", verifyFirebaseIdToken, deviceCtrl.feedCat);
router.post("/feed-dog", verifyFirebaseIdToken, deviceCtrl.feedDog);

// Device command polling
router.get("/commands", deviceCtrl.getCommands);

// Mark command processed
router.post("/commands/:cmdId/processed", deviceCtrl.markCommandProcessed);

// Telemetry (from PI)
router.post("/telemetry", deviceCtrl.postTelemetry);

// Heartbeat (from PI)
router.post("/heartbeat", deviceCtrl.heartbeat);

// Feeding log
router.post("/feed-log", deviceCtrl.logFeeding);

// Read feeding logs
router.get("/feed-logs", verifyFirebaseIdToken, deviceCtrl.getFeedLogs);

module.exports = router;
