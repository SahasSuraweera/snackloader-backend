const express = require("express");
const router = express.Router();
const { logPetDetection } = require("../controllers/deviceController");

router.post("/pet-detected", logPetDetection);

router.get("/test", (req, res) => {
  res.send("Device routes are working!");
});

module.exports = router;
