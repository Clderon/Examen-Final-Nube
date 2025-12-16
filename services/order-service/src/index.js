const express = require("express");
const cors = require("cors");
const amqp = require("amqplib");

const app = express();
app.use(cors());
app.use(express.json());

const RABBIT_URL = "amqp://rabbitmq";

app.post("/orders", async (req, res) => {
  const conn = await amqp.connect(RABBIT_URL);
  const ch = await conn.createChannel();
  await ch.assertQueue("orders");
  ch.sendToQueue("orders", Buffer.from("Nuevo pedido"));
  res.json({ message: "Pedido enviado" });
});

app.get("/health", (req, res) => {
  res.send("Order Service OK");
});

app.listen(3001, () => {
  console.log("Order Service running on port 3001");
});
