const amqp = require("amqplib");

const RABBIT_URL = "amqp://rabbitmq";

async function connectWithRetry() {
  while (true) {
    try {
      const conn = await amqp.connect(RABBIT_URL);
      const ch = await conn.createChannel();
      await ch.assertQueue("orders");

      console.log("✅ Conectado a RabbitMQ");

      ch.consume("orders", msg => {
        console.log("📦 Pedido recibido:", msg.content.toString());
        ch.ack(msg);
      });

      break; // sale del loop si conecta bien
    } catch (err) {
      console.log("⏳ Esperando a RabbitMQ...");
      await new Promise(res => setTimeout(res, 5000));
    }
  }
}

connectWithRetry();
