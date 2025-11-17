const express = require("express");
const router = express.Router();
const { logPetDetection } = require("../controllers/deviceController");
const { db } = require("../configs/firebase");

// 0. Test route (already working)
router.get("/test", (req, res) => {
  res.send("Device routes are working!");
});

// 1. Pet detected -> log in Firestore
router.post("/pet-detected", logPetDetection);

// 2. Send camera ON/OFF command from app/Postman
router.post("/camera", async (req, res) => {
  try {
    const { turnOn } = req.body;

    await db.collection("commands")
      .doc("camera")
      .set({ turnOn }, { merge: true });

    res.json({
      success: true,
      message: turnOn ? "Camera ON command sent" : "Camera OFF command sent"
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. Raspberry Pi reads camera command
router.get("/commands/camera", async (req, res) => {
  try {
    const snap = await db.collection("commands").doc("camera").get();
    res.json(snap.data() || { turnOn: false });
  } catch (error) {
    res.json({ turnOn: false });
  }
});

module.exports = router;
