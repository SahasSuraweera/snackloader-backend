const express = require("express");
const router = express.Router();
const { db } = require("../configs/firebase");

router.get("/firestore", async (req, res) => {
  await db.collection("testMessages").add({
    message: "Hello from SnackLoader!",
    timestamp: Date.now()
  });

  res.send("Firestore insertion successful!");
});

module.exports = router;
