const { db } = require("../configs/firebase");

exports.logPetDetection = async (req, res) => {
  const { petType } = req.body;

  await db.collection("petDetections").add({
    petType,
    time: Date.now()
  });

  res.send({ success: true, message: "Pet detection logged" });
};
