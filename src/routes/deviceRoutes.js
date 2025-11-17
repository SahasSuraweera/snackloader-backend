const express = require("express");
const router = express.Router();
const { logPetDetection } = require("../controllers/deviceController");

router.post("/pet-detected", logPetDetection);

module.exports = router;
