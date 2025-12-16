const { sendToQueue } = require("../messaging/rabbitmq");

// Almacenamiento en memoria (en producción usar una base de datos)
const orders = [];
let orderIdCounter = 1;

// GET /orders - Listar todos los pedidos
const getAllOrders = (req, res) => {
  try {
    const userRole = req.user.role;
    const userId = req.user.userId;

    let filteredOrders = orders;

    // Si no es admin, solo ver sus propios pedidos
    if (userRole !== 'admin') {
      filteredOrders = orders.filter(order => order.userId === userId);
    }

    // Ordenar por fecha más reciente primero
    filteredOrders = [...filteredOrders].sort((a, b) => 
      new Date(b.createdAt) - new Date(a.createdAt)
    );

    console.log(`📋 Listando ${filteredOrders.length} pedidos para usuario ${req.user.email}`);
    res.json(filteredOrders);
  } catch (error) {
    console.error("Error al listar pedidos:", error);
    res.status(500).json({ error: "Error al obtener pedidos", message: error.message });
  }
};

// GET /orders/:id - Obtener un pedido por ID
const getOrderById = (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const order = orders.find(o => o.id === orderId);

    if (!order) {
      return res.status(404).json({ message: "Pedido no encontrado" });
    }

    // Verificar permisos: admin puede ver todos, usuarios solo los suyos
    if (req.user.role !== 'admin' && order.userId !== req.user.userId) {
      return res.status(403).json({ message: "No tienes permisos para ver este pedido" });
    }

    res.json(order);
  } catch (error) {
    console.error("Error al obtener pedido:", error);
    res.status(500).json({ error: "Error al obtener pedido", message: error.message });
  }
};

// POST /orders - Crear un nuevo pedido
const createOrder = async (req, res) => {
  try {
    const { product, quantity, price, description } = req.body;
    
    // Validación
    if (!product || !quantity || !price) {
      return res.status(400).json({ 
        error: "Datos incompletos",
        message: "Producto, cantidad y precio son requeridos" 
      });
    }

    if (quantity <= 0 || price <= 0) {
      return res.status(400).json({ 
        error: "Valores inválidos",
        message: "Cantidad y precio deben ser mayores a 0" 
      });
    }

    console.log("📦 Recibida solicitud de pedido:", { product, quantity, price });

    // Crear el pedido
    const order = {
      id: orderIdCounter++,
      product,
      description: description || '',
      quantity: parseInt(quantity),
      price: parseFloat(price),
      total: parseFloat((quantity * price).toFixed(2)),
      status: "pending",
      userId: req.user.userId,
      userEmail: req.user.email,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Guardar en memoria
    orders.push(order);
    console.log(`✅ Pedido #${order.id} creado y guardado`);

    // Enviar a RabbitMQ para procesamiento (no bloqueante)
    sendToQueue("orders", {
      orderId: order.id,
      product: order.product,
      userEmail: order.userEmail,
      message: `Nuevo pedido: ${order.product} - Cantidad: ${order.quantity}`
    }).catch(err => {
      console.error("⚠️ Error al enviar a RabbitMQ (pedido guardado):", err.message);
      // El pedido se guardó, pero no se pudo enviar a RabbitMQ
    });

    res.status(201).json({
      message: "Pedido creado exitosamente",
      order
    });
  } catch (error) {
    console.error("❌ Error al procesar pedido:", error.message);
    res.status(500).json({ error: "Error al procesar pedido", message: error.message });
  }
};

// PUT /orders/:id/status - Actualizar estado de un pedido
const updateOrderStatus = async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const { status } = req.body;

    const validStatuses = ['pending', 'processing', 'completed', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ 
        error: "Estado inválido",
        message: `El estado debe ser uno de: ${validStatuses.join(', ')}` 
      });
    }

    const orderIndex = orders.findIndex(o => o.id === orderId);
    if (orderIndex === -1) {
      return res.status(404).json({ message: "Pedido no encontrado" });
    }

    const order = orders[orderIndex];

    // Solo admin puede cambiar estados, o usuarios pueden cancelar sus propios pedidos pendientes
    if (req.user.role !== 'admin') {
      if (status !== 'cancelled' || order.userId !== req.user.userId || order.status !== 'pending') {
        return res.status(403).json({ 
          message: "No tienes permisos para actualizar este pedido" 
        });
      }
    }

    const oldStatus = order.status;
    orders[orderIndex] = {
      ...order,
      status,
      updatedAt: new Date().toISOString()
    };

    console.log(`✅ Pedido #${orderId} actualizado: ${oldStatus} -> ${status}`);

    // Enviar notificación a RabbitMQ
    sendToQueue("orders", {
      orderId: order.id,
      action: "status_updated",
      oldStatus,
      newStatus: status,
      message: `Pedido #${orderId} cambió de estado: ${oldStatus} -> ${status}`
    }).catch(err => {
      console.error("⚠️ Error al enviar notificación a RabbitMQ:", err.message);
    });

    res.json({
      message: "Estado del pedido actualizado",
      order: orders[orderIndex]
    });
  } catch (error) {
    console.error("Error al actualizar pedido:", error);
    res.status(500).json({ error: "Error al actualizar pedido", message: error.message });
  }
};

// DELETE /orders/:id - Eliminar un pedido
const deleteOrder = (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const orderIndex = orders.findIndex(o => o.id === orderId);

    if (orderIndex === -1) {
      return res.status(404).json({ message: "Pedido no encontrado" });
    }

    const order = orders[orderIndex];

    // Solo admin puede eliminar, o usuarios pueden eliminar sus propios pedidos pendientes
    if (req.user.role !== 'admin') {
      if (order.userId !== req.user.userId || order.status !== 'pending') {
        return res.status(403).json({ 
          message: "Solo puedes eliminar tus propios pedidos pendientes" 
        });
      }
    }

    orders.splice(orderIndex, 1);
    console.log(`✅ Pedido #${orderId} eliminado`);

    res.json({ message: "Pedido eliminado exitosamente" });
  } catch (error) {
    console.error("Error al eliminar pedido:", error);
    res.status(500).json({ error: "Error al eliminar pedido", message: error.message });
  }
};

// GET /orders/stats/stats - Obtener estadísticas de pedidos
const getOrderStats = (req, res) => {
  try {
    const userRole = req.user.role;
    const userId = req.user.userId;

    let filteredOrders = orders;
    if (userRole !== 'admin') {
      filteredOrders = orders.filter(order => order.userId === userId);
    }

    const stats = {
      total: filteredOrders.length,
      byStatus: {
        pending: filteredOrders.filter(o => o.status === 'pending').length,
        processing: filteredOrders.filter(o => o.status === 'processing').length,
        completed: filteredOrders.filter(o => o.status === 'completed').length,
        cancelled: filteredOrders.filter(o => o.status === 'cancelled').length
      },
      totalValue: filteredOrders.reduce((sum, o) => sum + (o.total || 0), 0).toFixed(2),
      averageOrderValue: filteredOrders.length > 0 
        ? (filteredOrders.reduce((sum, o) => sum + (o.total || 0), 0) / filteredOrders.length).toFixed(2)
        : 0
    };

    res.json(stats);
  } catch (error) {
    console.error("Error al obtener estadísticas:", error);
    res.status(500).json({ error: "Error al obtener estadísticas", message: error.message });
  }
};

module.exports = {
  getAllOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
  deleteOrder,
  getOrderStats
};

