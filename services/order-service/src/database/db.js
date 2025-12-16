const mysql = require('mysql2/promise');

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'orderuser',
  password: process.env.DB_PASSWORD || 'orderpass123',
  database: process.env.DB_NAME || 'ordersdb',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Crear pool de conexiones
const pool = mysql.createPool(DB_CONFIG);

// Función para inicializar la base de datos y tablas
async function initializeDatabase() {
  let connection;
  try {
    // Conectar usando el pool (ya configurado con la base de datos)
    connection = await pool.getConnection();

    // Crear tabla de pedidos
    await connection.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product VARCHAR(255) NOT NULL,
        description TEXT,
        quantity INT NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        total DECIMAL(10, 2) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        user_id INT NOT NULL,
        user_email VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        INDEX idx_status (status),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    console.log('✅ Base de datos de pedidos inicializada correctamente');
  } catch (error) {
    console.error('❌ Error al inicializar base de datos:', error.message);
    // Reintentar después de un delay (MySQL puede tardar en estar listo)
    setTimeout(() => {
      initializeDatabase().catch(err => {
        console.error('Error en reintento de inicialización:', err.message);
      });
    }, 5000);
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

// Ejecutar inicialización al cargar el módulo (con retry)
setTimeout(() => {
  initializeDatabase().catch(err => {
    console.error('Error en inicialización:', err.message);
  });
}, 2000); // Esperar 2 segundos para que MySQL esté listo

module.exports = pool;

