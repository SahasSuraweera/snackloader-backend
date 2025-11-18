const express = require("express");
const cors = require("cors");
require("dotenv").config();

const deviceRoutes = require("./routes/deviceRoutes");
const testRoutes = require("./routes/testRoutes");

const app = express();
app.use(cors());
app.use(express.json());

app.use("/device", deviceRoutes);
app.use("/test", testRoutes);

app.get("/", (req, res) => {
  res.send("SnackLoader Backend Running");
});

app.listen(process.env.PORT || 5000, () => {
  console.log("Backend running on port", process.env.PORT || 5000);
});
