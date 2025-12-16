const express = require("express");
const cors = require("cors");
const orderRoutes = require("./routes/order.routes");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

// Rutas
app.use("/orders", orderRoutes);

// Endpoint raíz
app.get("/", (req, res) => {
  res.json({
    service: "Order Service",
    status: "running",
    version: "1.0.0",
    endpoints: {
      listOrders: "GET /orders",
      getOrder: "GET /orders/:id",
      createOrder: "POST /orders",
      updateOrderStatus: "PUT /orders/:id/status",
      deleteOrder: "DELETE /orders/:id",
      getStats: "GET /orders/stats",
      health: "GET /health"
    }
  });
});

// Health check mejorado
app.get("/health", async (req, res) => {
  const { isDbReady } = require("./database/db");
  if (isDbReady()) {
    res.json({ status: "OK", service: "Order Service", database: "connected" });
  } else {
    res.status(503).json({ status: "NOT_READY", service: "Order Service", database: "connecting" });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Order Service running on port ${PORT}`);
  console.log(`📚 Documentación API disponible en: http://localhost:${PORT}/`);
});
