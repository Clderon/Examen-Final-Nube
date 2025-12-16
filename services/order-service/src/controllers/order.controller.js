const { sendToQueue } = require("../messaging/rabbitmq");
const { pool, isDbReady } = require("../database/db");

// GET /orders - Listar todos los pedidos
const getAllOrders = async (req, res) => {
  try {
    const userRole = req.user.role;
    const userId = req.user.userId;

    let query = 'SELECT * FROM orders';
    let params = [];

    // Si no es admin, solo ver sus propios pedidos
    if (userRole !== 'admin') {
      query += ' WHERE user_id = ?';
      params.push(userId);
    }

    query += ' ORDER BY created_at DESC';

    const [orders] = await pool.query(query, params);

    // Formatear resultados para mantener compatibilidad con el frontend
    const formattedOrders = orders.map(order => ({
      id: order.id,
      product: order.product,
      description: order.description || '',
      quantity: order.quantity,
      price: parseFloat(order.price),
      total: parseFloat(order.total),
      status: order.status,
      userId: order.user_id,
      userEmail: order.user_email,
      createdAt: order.created_at.toISOString(),
      updatedAt: order.updated_at ? order.updated_at.toISOString() : null
    }));

    console.log(`📋 Listando ${formattedOrders.length} pedidos para usuario ${req.user.email}`);
    res.json(formattedOrders);
  } catch (error) {
    console.error("Error al listar pedidos:", error);
    res.status(500).json({ error: "Error al obtener pedidos", message: error.message });
  }
};

// GET /orders/:id - Obtener un pedido por ID
const getOrderById = async (req, res) => {
  if (!isDbReady()) {
    return res.status(503).json({ message: "Servicio no disponible. Base de datos no está lista aún." });
  }
  
  try {
    const orderId = parseInt(req.params.id);

    const [orders] = await pool.query(
      'SELECT * FROM orders WHERE id = ?',
      [orderId]
    );

    if (orders.length === 0) {
      return res.status(404).json({ message: "Pedido no encontrado" });
    }

    const order = orders[0];

    // Verificar permisos: admin puede ver todos, usuarios solo los suyos
    if (req.user.role !== 'admin' && order.user_id !== req.user.userId) {
      return res.status(403).json({ message: "No tienes permisos para ver este pedido" });
    }

    // Formatear resultado
    const formattedOrder = {
      id: order.id,
      product: order.product,
      description: order.description || '',
      quantity: order.quantity,
      price: parseFloat(order.price),
      total: parseFloat(order.total),
      status: order.status,
      userId: order.user_id,
      userEmail: order.user_email,
      createdAt: order.created_at.toISOString(),
      updatedAt: order.updated_at ? order.updated_at.toISOString() : null
    };

    res.json(formattedOrder);
  } catch (error) {
    console.error("Error al obtener pedido:", error);
    res.status(500).json({ error: "Error al obtener pedido", message: error.message });
  }
};

// POST /orders - Crear un nuevo pedido
const createOrder = async (req, res) => {
  if (!isDbReady()) {
    return res.status(503).json({ message: "Servicio no disponible. Base de datos no está lista aún." });
  }
  
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

    const total = parseFloat((quantity * price).toFixed(2));

    // Insertar pedido en la base de datos
    const [result] = await pool.query(
      `INSERT INTO orders (product, description, quantity, price, total, status, user_id, user_email) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        product,
        description || null,
        parseInt(quantity),
        parseFloat(price),
        total,
        'pending',
        req.user.userId,
        req.user.email
      ]
    );

    const orderId = result.insertId;

    // Obtener el pedido creado para devolverlo
    const [orders] = await pool.query('SELECT * FROM orders WHERE id = ?', [orderId]);
    const orderDb = orders[0];

    const order = {
      id: orderDb.id,
      product: orderDb.product,
      description: orderDb.description || '',
      quantity: orderDb.quantity,
      price: parseFloat(orderDb.price),
      total: parseFloat(orderDb.total),
      status: orderDb.status,
      userId: orderDb.user_id,
      userEmail: orderDb.user_email,
      createdAt: orderDb.created_at.toISOString(),
      updatedAt: orderDb.updated_at ? orderDb.updated_at.toISOString() : null
    };

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
  if (!isDbReady()) {
    return res.status(503).json({ message: "Servicio no disponible. Base de datos no está lista aún." });
  }
  
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

    // Obtener el pedido actual
    const [orders] = await pool.query('SELECT * FROM orders WHERE id = ?', [orderId]);
    
    if (orders.length === 0) {
      return res.status(404).json({ message: "Pedido no encontrado" });
    }

    const order = orders[0];

    // Solo admin puede cambiar estados, o usuarios pueden cancelar sus propios pedidos pendientes
    if (req.user.role !== 'admin') {
      if (status !== 'cancelled' || order.user_id !== req.user.userId || order.status !== 'pending') {
        return res.status(403).json({ 
          message: "No tienes permisos para actualizar este pedido" 
        });
      }
    }

    const oldStatus = order.status;

    // Actualizar estado en la base de datos
    await pool.query(
      'UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ?',
      [status, orderId]
    );

    // Obtener el pedido actualizado
    const [updatedOrders] = await pool.query('SELECT * FROM orders WHERE id = ?', [orderId]);
    const updatedOrder = updatedOrders[0];

    const formattedOrder = {
      id: updatedOrder.id,
      product: updatedOrder.product,
      description: updatedOrder.description || '',
      quantity: updatedOrder.quantity,
      price: parseFloat(updatedOrder.price),
      total: parseFloat(updatedOrder.total),
      status: updatedOrder.status,
      userId: updatedOrder.user_id,
      userEmail: updatedOrder.user_email,
      createdAt: updatedOrder.created_at.toISOString(),
      updatedAt: updatedOrder.updated_at ? updatedOrder.updated_at.toISOString() : null
    };

    console.log(`✅ Pedido #${orderId} actualizado: ${oldStatus} -> ${status}`);

    // Enviar notificación a RabbitMQ
    sendToQueue("orders", {
      orderId: formattedOrder.id,
      action: "status_updated",
      oldStatus,
      newStatus: status,
      message: `Pedido #${orderId} cambió de estado: ${oldStatus} -> ${status}`
    }).catch(err => {
      console.error("⚠️ Error al enviar notificación a RabbitMQ:", err.message);
    });

    res.json({
      message: "Estado del pedido actualizado",
      order: formattedOrder
    });
  } catch (error) {
    console.error("Error al actualizar pedido:", error);
    res.status(500).json({ error: "Error al actualizar pedido", message: error.message });
  }
};

// DELETE /orders/:id - Eliminar un pedido
const deleteOrder = async (req, res) => {
  if (!isDbReady()) {
    return res.status(503).json({ message: "Servicio no disponible. Base de datos no está lista aún." });
  }
  
  try {
    const orderId = parseInt(req.params.id);

    // Obtener el pedido primero para verificar permisos
    const [orders] = await pool.query('SELECT * FROM orders WHERE id = ?', [orderId]);

    if (orders.length === 0) {
      return res.status(404).json({ message: "Pedido no encontrado" });
    }

    const order = orders[0];

    // Solo admin puede eliminar, o usuarios pueden eliminar sus propios pedidos pendientes
    if (req.user.role !== 'admin') {
      if (order.user_id !== req.user.userId || order.status !== 'pending') {
        return res.status(403).json({ 
          message: "Solo puedes eliminar tus propios pedidos pendientes" 
        });
      }
    }

    // Eliminar el pedido
    await pool.query('DELETE FROM orders WHERE id = ?', [orderId]);
    console.log(`✅ Pedido #${orderId} eliminado`);

    res.json({ message: "Pedido eliminado exitosamente" });
  } catch (error) {
    console.error("Error al eliminar pedido:", error);
    res.status(500).json({ error: "Error al eliminar pedido", message: error.message });
  }
};

// GET /orders/stats - Obtener estadísticas de pedidos
const getOrderStats = async (req, res) => {
  if (!isDbReady()) {
    return res.status(503).json({ message: "Servicio no disponible. Base de datos no está lista aún." });
  }
  
  try {
    const userRole = req.user.role;
    const userId = req.user.userId;

    let whereClause = '';
    let params = [];

    if (userRole !== 'admin') {
      whereClause = 'WHERE user_id = ?';
      params.push(userId);
    }

    // Obtener total de pedidos
    const [totalResult] = await pool.query(
      `SELECT COUNT(*) as total FROM orders ${whereClause}`,
      params
    );
    const total = totalResult[0].total;

    // Obtener pedidos por estado
    const [statusResult] = await pool.query(
      `SELECT status, COUNT(*) as count FROM orders ${whereClause} GROUP BY status`,
      params
    );

    const byStatus = {
      pending: 0,
      processing: 0,
      completed: 0,
      cancelled: 0
    };

    statusResult.forEach(row => {
      byStatus[row.status] = row.count;
    });

    // Obtener valor total
    const [valueResult] = await pool.query(
      `SELECT COALESCE(SUM(total), 0) as totalValue, 
              COALESCE(AVG(total), 0) as avgValue 
       FROM orders ${whereClause}`,
      params
    );

    const totalValue = parseFloat(valueResult[0].totalValue || 0).toFixed(2);
    const averageOrderValue = parseFloat(valueResult[0].avgValue || 0).toFixed(2);

    const stats = {
      total: total,
      byStatus: byStatus,
      totalValue: totalValue,
      averageOrderValue: averageOrderValue
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

