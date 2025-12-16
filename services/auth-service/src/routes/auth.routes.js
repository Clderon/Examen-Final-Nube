const express = require("express");
const router = express.Router();
const { verifyToken, verifyAdmin } = require("../middleware/jwt.middleware");
const {
  register,
  login,
  getProfile,
  getAllUsers
} = require("../controllers/auth.controller");

// Rutas públicas
router.post("/register", register);
router.post("/login", login);

// Rutas protegidas
router.get("/profile", verifyToken, getProfile);
router.get("/users", verifyToken, verifyAdmin, getAllUsers);

module.exports = router;

