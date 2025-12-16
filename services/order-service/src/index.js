const express = require("express");
const cors = require("cors");
const amqp = require("amqplib");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const RABBIT_URL = process.env.RABBITMQ_URL || "amqp://rabbitmq";

app.post("/orders", async (req, res) => {
  let conn = null;
  try {
    console.log("📦 Recibida solicitud de pedido");
    conn = await amqp.connect(RABBIT_URL);
    const ch = await conn.createChannel();
    await ch.assertQueue("orders");
    ch.sendToQueue("orders", Buffer.from("Nuevo pedido"));
    await ch.close();
    console.log("✅ Pedido enviado a RabbitMQ");
    res.json({ message: "Pedido enviado" });
  } catch (error) {
    console.error("❌ Error al procesar pedido:", error.message);
    res.status(500).json({ error: "Error al procesar pedido", message: error.message });
  } finally {
    if (conn) {
      try {
        await conn.close();
      } catch (err) {
        console.error("Error al cerrar conexión:", err.message);
      }
    }
  }
});

app.get("/health", (req, res) => {
  res.send("Order Service OK");
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Order Service running on port ${PORT}`);
  console.log(`RabbitMQ URL: ${RABBIT_URL}`);
});
