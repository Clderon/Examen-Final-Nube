const express = require("express");
const jwt = require("jsonwebtoken");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const SECRET = "secret123";

app.post("/login", (req, res) => {
  const token = jwt.sign({ user: "demo" }, SECRET, { expiresIn: "1h" });
  res.json({ token });
});

app.get("/health", (req, res) => {
  res.send("Auth Service OK");
});

app.listen(3000, () => {
  console.log("Auth Service running on port 3000");
});
