// src/controllers/deviceController.js
const { db, admin } = require("../configs/firebase");

/**
 * Controller for device APIs
 *
 * Notes:
 * - commands collection: devices/{deviceId}/commands (device polls)
 * - feedLogs collection: devices/{deviceId}/feedLogs
 */
module.exports = {
  // Register device (link to user)
  registerDevice: async (req, res) => {
    try {
      const { deviceId, ownerId, ownerEmail } = req.body;
      if (!deviceId || !ownerId || !ownerEmail) {
        return res.status(400).json({ error: "deviceId, ownerId, ownerEmail required" });
      }

      const deviceRef = db.collection("devices").doc(deviceId);
      const snapshot = await deviceRef.get();
      if (snapshot.exists) return res.status(400).json({ error: "Device already exists" });

      await deviceRef.set({
        deviceId,
        ownerId,
        ownerEmail,
        autoFeedEnabled: true,
        cat: { schedule: [], lastFeeding: null, feedingActive: false, lidState: "closed" },
        dog: { schedule: [], lastFeeding: null, feedingActive: false, lidState: "closed" },
        catFeedingActive: false,
        dogFeedingActive: false,
        currentWeight: null,
        humidity: null,
        temperature: null,
        lastSeen: null,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Add device id to user's devices array
      await db.collection("users").doc(ownerId).set({
        devices: admin.firestore.FieldValue.arrayUnion(deviceId)
      }, { merge: true });

      return res.json({ status: "device_registered" });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: err.message });
    }
  },

  // Get device document
  getDeviceStatus: async (req, res) => {
    try {
      const id = req.params.id;
      const snap = await db.collection("devices").doc(id).get();
      if (!snap.exists) return res.status(404).json({ error: "Device not found" });
      return res.json(snap.data());
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: err.message });
    }
  },

  // Update settings (schedules)
  updateSettings: async (req, res) => {
    try {
      const id = req.params.id;
      const { cat, dog, autoFeedEnabled } = req.body;
      await db.collection("devices").doc(id).set({
        cat: cat || {},
        dog: dog || {},
        autoFeedEnabled: typeof autoFeedEnabled === "boolean" ? autoFeedEnabled : true
      }, { merge: true });
      return res.json({ status: "settings_saved" });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: err.message });
    }
  },

  // Manual feed cat -> queue command
  feedCat: async (req, res) => {
    try {
      const id = req.params.id;
      const { amount } = req.body;
      const ref = db.collection("devices").doc(id);
      const doc = await ref.get();
      if (!doc.exists) return res.status(404).json({ error: "Device not found" });
      const data = doc.data();

      if (data.dogFeedingActive) return res.status(400).json({ error: "Dog feeder active" });

      await ref.set({
        catFeedingActive: true,
        dogFeedingActive: false,
        "cat.feedingActive": true
      }, { merge: true });

      const cmdRef = await ref.collection("commands").add({
        type: "FEED_CAT",
        amount: amount || (data.cat?.defaultAmount || 30),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        processed: false
      });

      return res.json({ status: "cat_manual_feed_queued", cmdId: cmdRef.id });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: err.message });
    }
  },

  // Manual feed dog -> queue command
  feedDog: async (req, res) => {
    try {
      const id = req.params.id;
      const { amount } = req.body;
      const ref = db.collection("devices").doc(id);
      const doc = await ref.get();
      if (!doc.exists) return res.status(404).json({ error: "Device not found" });
      const data = doc.data();

      if (data.catFeedingActive) return res.status(400).json({ error: "Cat feeder active" });

      await ref.set({
        dogFeedingActive: true,
        catFeedingActive: false,
        "dog.feedingActive": true
      }, { merge: true });

      const cmdRef = await ref.collection("commands").add({
        type: "FEED_DOG",
        amount: amount || (data.dog?.defaultAmount || 50),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        processed: false
      });

      return res.json({ status: "dog_manual_feed_queued", cmdId: cmdRef.id });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: err.message });
    }
  },

  // Device polls commands (unprocessed). Returns array of commands
  getCommands: async (req, res) => {
    try {
      const id = req.params.id;
      const qSnap = await db.collection("devices").doc(id).collection("commands")
        .where("processed", "==", false)
        .orderBy("createdAt", "asc")
        .limit(10)
        .get();

      const cmds = qSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      return res.json(cmds);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: err.message });
    }
  },

  // Device marks command processed
  markCommandProcessed: async (req, res) => {
    try {
      const { id, cmdId } = req.params;
      const cmdRef = db.collection("devices").doc(id).collection("commands").doc(cmdId);
      await cmdRef.set({ processed: true, processedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
      return res.json({ status: "processed" });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: err.message });
    }
  },

  // Device posts telemetry (weight, temp, humidity, petDetected)
  postTelemetry: async (req, res) => {
    try {
      const id = req.params.id;
      const { bowlWeight, temperature, humidity, petDetected } = req.body;
      const ref = db.collection("devices").doc(id);

      await ref.set({
        currentWeight: bowlWeight ?? null,
        temperature: temperature ?? null,
        humidity: humidity ?? null,
        petDetectedRecently: !!petDetected,
        lastSeen: admin.firestore.FieldValue.serverTimestamp(),
        online: true
      }, { merge: true });

      // optionally store telemetry log
      await ref.collection("telemetry").add({
        bowlWeight: bowlWeight ?? null,
        temperature: temperature ?? null,
        humidity: humidity ?? null,
        petDetected: !!petDetected,
        time: admin.firestore.FieldValue.serverTimestamp()
      });

      return res.json({ status: "telemetry_saved" });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: err.message });
    }
  },

  // Heartbeat - mark device online
  heartbeat: async (req, res) => {
    try {
      const id = req.params.id;
      await db.collection("devices").doc(id).set({
        lastSeen: admin.firestore.FieldValue.serverTimestamp(),
        online: true
      }, { merge: true });
      return res.json({ status: "ok" });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: err.message });
    }
  },

  // Device logs the feeding event (called by device after it performed the feed)
  logFeeding: async (req, res) => {
    try {
      const id = req.params.id;
      const { pet, amount, source } = req.body; // pet: 'cat' | 'dog'
      if (!pet || !amount) return res.status(400).json({ error: "pet and amount required" });

      const ref = db.collection("devices").doc(id);

      // add feed log
      await ref.collection("feedLogs").add({
        pet,
        amount,
        source: source || "device",
        time: admin.firestore.FieldValue.serverTimestamp()
      });

      // update lastFeeding and reset active flags
      const updates = {
        [`${pet}.lastFeeding`]: admin.firestore.FieldValue.serverTimestamp(),
        catFeedingActive: false,
        dogFeedingActive: false,
        [`${pet}.feedingActive`]: false
      };

      await ref.set(updates, { merge: true });

      return res.json({ status: "feed_logged" });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: err.message });
    }
  },

  // Read feed logs (for frontend)
  getFeedLogs: async (req, res) => {
    try {
      const id = req.params.id;
      const q = await db.collection("devices").doc(id).collection("feedLogs")
        .orderBy("time", "desc").limit(200).get();

      const logs = q.docs.map(d => ({ id: d.id, ...d.data() }));
      return res.json(logs);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: err.message });
    }
  }
};
