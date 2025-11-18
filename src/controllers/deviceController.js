// src/controllers/deviceController.js
const { db, admin } = require("../configs/firebase");

const DEFAULT_DEVICE = "default";   // <--- single device mode

module.exports = {
  // Device registration disabled in single-device mode
  registerDevice: async (req, res) => {
    return res.json({
      status: "single_device_mode",
      message: "Device registration disabled. Using default device."
    });
  },

  // Get status of the single device
  getDeviceStatus: async (req, res) => {
    try {
      const ref = db.collection("devices").doc(DEFAULT_DEVICE);
      const snap = await ref.get();

      if (!snap.exists) {
        // Create default structure automatically
        await ref.set({
          deviceId: DEFAULT_DEVICE,
          online: false,
          cat: { lidState: "closed", feedingActive: false, lastFeeding: null },
          dog: { lidState: "closed", feedingActive: false, lastFeeding: null },
          currentWeight: null,
          humidity: null,
          temperature: null,
          lastSeen: null,
        });
        return res.json((await ref.get()).data());
      }

      return res.json(snap.data());
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: err.message });
    }
  },

  // Update cat/dog schedules/settings
  updateSettings: async (req, res) => {
    try {
      const { cat, dog, autoFeedEnabled } = req.body;

      await db.collection("devices").doc(DEFAULT_DEVICE).set(
        {
          cat: cat || {},
          dog: dog || {},
          autoFeedEnabled:
            typeof autoFeedEnabled === "boolean" ? autoFeedEnabled : true,
        },
        { merge: true }
      );

      return res.json({ status: "settings_saved" });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: err.message });
    }
  },

  // Manual feed CAT
  feedCat: async (req, res) => {
    try {
      const { amount } = req.body;
      const ref = db.collection("devices").doc(DEFAULT_DEVICE);
      const doc = await ref.get();
      const data = doc.data();

      if (data.dogFeedingActive)
        return res.status(400).json({ error: "Dog feeder active" });

      await ref.set(
        {
          catFeedingActive: true,
          dogFeedingActive: false,
          "cat.feedingActive": true,
        },
        { merge: true }
      );

      const cmdRef = await ref.collection("commands").add({
        type: "FEED_CAT",
        amount: amount || data.cat?.defaultAmount || 30,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        processed: false,
      });

      return res.json({
        status: "cat_manual_feed_queued",
        cmdId: cmdRef.id,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: err.message });
    }
  },

  // Manual feed DOG
  feedDog: async (req, res) => {
    try {
      const { amount } = req.body;
      const ref = db.collection("devices").doc(DEFAULT_DEVICE);
      const doc = await ref.get();
      const data = doc.data();

      if (data.catFeedingActive)
        return res.status(400).json({ error: "Cat feeder active" });

      await ref.set(
        {
          dogFeedingActive: true,
          catFeedingActive: false,
          "dog.feedingActive": true,
        },
        { merge: true }
      );

      const cmdRef = await ref.collection("commands").add({
        type: "FEED_DOG",
        amount: amount || data.dog?.defaultAmount || 50,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        processed: false,
      });

      return res.json({
        status: "dog_manual_feed_queued",
        cmdId: cmdRef.id,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: err.message });
    }
  },

  // Device gets unprocessed commands
  getCommands: async (req, res) => {
    try {
      const ref = db
        .collection("devices")
        .doc(DEFAULT_DEVICE)
        .collection("commands");

      const q = await ref
        .where("processed", "==", false)
        .orderBy("createdAt", "asc")
        .limit(10)
        .get();

      const cmds = q.docs.map((d) => ({ id: d.id, ...d.data() }));

      return res.json(cmds);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: err.message });
    }
  },

  // Device confirms command was processed
  markCommandProcessed: async (req, res) => {
    try {
      const { cmdId } = req.params;

      await db
        .collection("devices")
        .doc(DEFAULT_DEVICE)
        .collection("commands")
        .doc(cmdId)
        .set(
          {
            processed: true,
            processedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );

      return res.json({ status: "processed" });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: err.message });
    }
  },

  // Device sends telemetry (weight/temp/humidity)
  postTelemetry: async (req, res) => {
    try {
      const { bowlWeight, temperature, humidity, petDetected } = req.body;

      const ref = db.collection("devices").doc(DEFAULT_DEVICE);

      await ref.set(
        {
          currentWeight: bowlWeight ?? null,
          temperature: temperature ?? null,
          humidity: humidity ?? null,
          petDetectedRecently: !!petDetected,
          lastSeen: admin.firestore.FieldValue.serverTimestamp(),
          online: true,
        },
        { merge: true }
      );

      // store log entry
      await ref.collection("telemetry").add({
        bowlWeight: bowlWeight ?? null,
        temperature: temperature ?? null,
        humidity: humidity ?? null,
        petDetected: !!petDetected,
        time: admin.firestore.FieldValue.serverTimestamp(),
      });

      return res.json({ status: "telemetry_saved" });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: err.message });
    }
  },

  // Heartbeat
  heartbeat: async (req, res) => {
    try {
      await db.collection("devices").doc(DEFAULT_DEVICE).set(
        {
          lastSeen: admin.firestore.FieldValue.serverTimestamp(),
          online: true,
        },
        { merge: true }
      );

      return res.json({ status: "ok" });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: err.message });
    }
  },

  // Log feeding event
  logFeeding: async (req, res) => {
    try {
      const { pet, amount, source } = req.body;

      if (!pet || !amount) {
        return res
          .status(400)
          .json({ error: "pet and amount required" });
      }

      const ref = db.collection("devices").doc(DEFAULT_DEVICE);

      await ref.collection("feedLogs").add({
        pet,
        amount,
        source: source || "device",
        time: admin.firestore.FieldValue.serverTimestamp(),
      });

      const updates = {
        [`${pet}.lastFeeding`]:
          admin.firestore.FieldValue.serverTimestamp(),
        [`${pet}.feedingActive`]: false,
        catFeedingActive: false,
        dogFeedingActive: false,
      };

      await ref.set(updates, { merge: true });

      return res.json({ status: "feed_logged" });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: err.message });
    }
  },

  // Read feeding logs
  getFeedLogs: async (req, res) => {
    try {
      const q = await db
        .collection("devices")
        .doc(DEFAULT_DEVICE)
        .collection("feedLogs")
        .orderBy("time", "desc")
        .limit(200)
        .get();

      const logs = q.docs.map((d) => ({ id: d.id, ...d.data() }));

      return res.json(logs);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: err.message });
    }
  },
};
