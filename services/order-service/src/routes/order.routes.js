const express = require("express");
const router = express.Router();
const { verifyToken, verifyAdmin } = require("../middleware/jwt.middleware");
const {
  getAllOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
  deleteOrder,
  getOrderStats
} = require("../controllers/order.controller");

// Todas las rutas requieren autenticación
router.use(verifyToken);

// Rutas de pedidos
router.get("/", getAllOrders);
router.get("/stats", getOrderStats);
router.get("/:id", getOrderById);
router.post("/", createOrder);
router.put("/:id/status", updateOrderStatus);
router.delete("/:id", deleteOrder);

module.exports = router;

