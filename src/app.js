const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(cors());

const testRoutes = require("./routes/testRoutes");
app.use("/api/test", testRoutes);

const deviceRoutes = require("./routes/deviceRoutes");
app.use("/api/device", deviceRoutes);

app.get("/", (req, res) => {
  res.send("SnackLoader Backend Running");
});

app.listen(process.env.PORT || 5000, () =>
  console.log("Server running on port", process.env.PORT || 5000)
);
