const { db } = require("../configs/firebase");

exports.logPetDetection = async (req, res) => {
  try {
    const { deviceId, confidence } = req.body;

    await db.collection("petDetections").add({
      deviceId: deviceId || "raspberry",
      confidence: confidence ?? null,
      detectedAt: new Date().toISOString()
    });

    res.json({
      success: true,
      message: "Pet detection logged"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
