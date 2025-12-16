const express = require("express");
const cors = require("cors");
const amqp = require("amqplib");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const RABBIT_URL = process.env.RABBITMQ_URL || "amqp://rabbitmq";

// Almacenamiento en memoria (en producción usar una base de datos)
const orders = [];
let orderIdCounter = 1;

// Middleware simple para verificar token (en producción usar jwt.verify)
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token no proporcionado' });
  }
  // Por ahora solo verificamos que exista el token
  // En producción deberías verificar el JWT con jwt.verify()
  next();
};

// GET /orders - Listar todos los pedidos
app.get("/orders", verifyToken, (req, res) => {
  console.log(`📋 Listando ${orders.length} pedidos`);
  res.json(orders);
});

// POST /orders - Crear un nuevo pedido
app.post("/orders", verifyToken, async (req, res) => {
  let conn = null;
  try {
    const { product, quantity, price, total } = req.body;
    
    // Validación básica
    if (!product || !quantity || !price) {
      return res.status(400).json({ 
        error: "Datos incompletos",
        message: "Producto, cantidad y precio son requeridos" 
      });
    }

    console.log("📦 Recibida solicitud de pedido:", { product, quantity, price });

    // Crear el pedido
    const order = {
      id: orderIdCounter++,
      product,
      quantity: parseInt(quantity),
      price: parseFloat(price),
      total: total || (quantity * price),
      status: "pending",
      createdAt: new Date().toISOString()
    };

    // Guardar en memoria
    orders.push(order);
    console.log(`✅ Pedido #${order.id} creado y guardado`);

    // Enviar a RabbitMQ para procesamiento
    try {
      conn = await amqp.connect(RABBIT_URL);
      const ch = await conn.createChannel();
      await ch.assertQueue("orders");
      ch.sendToQueue("orders", Buffer.from(JSON.stringify({
        orderId: order.id,
        product: order.product,
        message: `Nuevo pedido: ${order.product}`
      })));
      await ch.close();
      console.log(`✅ Pedido #${order.id} enviado a RabbitMQ`);
    } catch (mqError) {
      console.error("⚠️ Error al enviar a RabbitMQ (pedido guardado):", mqError.message);
      // El pedido se guardó, pero no se pudo enviar a RabbitMQ
      // Continuamos con la respuesta exitosa
    }

    res.status(201).json({
      message: "Pedido creado exitosamente",
      order
    });
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

app.get("/", (req, res) => {
  res.json({
    service: "Order Service",
    status: "running",
    version: "1.0.0",
    endpoints: {
      listOrders: "GET /orders",
      createOrder: "POST /orders",
      health: "GET /health"
    }
  });
});

app.get("/health", (req, res) => {
  res.send("Order Service OK");
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Order Service running on port ${PORT}`);
  console.log(`RabbitMQ URL: ${RABBIT_URL}`);
});
