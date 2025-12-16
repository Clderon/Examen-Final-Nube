const amqp = require("amqplib");

const RABBIT_URL = process.env.RABBITMQ_URL || "amqp://rabbitmq";

// Función para enviar mensaje a RabbitMQ
async function sendToQueue(queueName, message) {
  let conn = null;
  try {
    conn = await amqp.connect(RABBIT_URL);
    const ch = await conn.createChannel();
    await ch.assertQueue(queueName, { durable: true });
    ch.sendToQueue(queueName, Buffer.from(JSON.stringify(message)), { persistent: true });
    await ch.close();
    console.log(`✅ Mensaje enviado a cola ${queueName}:`, message);
    return true;
  } catch (error) {
    console.error(`❌ Error al enviar mensaje a RabbitMQ:`, error.message);
    throw error;
  } finally {
    if (conn) {
      try {
        await conn.close();
      } catch (err) {
        console.error("Error al cerrar conexión:", err.message);
      }
    }
  }
}

module.exports = { sendToQueue };

