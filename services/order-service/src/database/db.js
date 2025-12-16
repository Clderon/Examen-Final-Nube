const mysql = require('mysql2/promise');

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'orderuser',
  password: process.env.DB_PASSWORD || 'orderpass123',
  database: process.env.DB_NAME || 'ordersdb',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
};

// Crear pool de conexiones con mejor manejo de errores
const pool = mysql.createPool(DB_CONFIG);

// Variable para trackear si la DB está lista
let dbReady = false;

// Función para verificar conexión a la DB
async function testConnection() {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.ping();
    console.log('✅ Conexión a MySQL verificada (orders)');
    return true;
  } catch (error) {
    console.error('❌ Error al conectar con MySQL (orders):', error.message);
    return false;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

// Función para inicializar la base de datos y tablas con retry
async function initializeDatabase(retries = 10) {
  let connection;
  
  for (let i = 0; i < retries; i++) {
    try {
      // Esperar antes de intentar (excepto el primer intento)
      if (i > 0) {
        console.log(`⏳ Reintentando conexión a MySQL (orders) (intento ${i + 1}/${retries})...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
      }

      // Verificar conexión primero
      const connected = await testConnection();
      if (!connected) {
        continue; // Continuar al siguiente intento
      }

      // Conectar usando el pool
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

      dbReady = true;
      console.log('✅ Base de datos de pedidos inicializada correctamente');
      return;
    } catch (error) {
      console.error(`❌ Error al inicializar base de datos (intento ${i + 1}/${retries}):`, error.message);
      if (i === retries - 1) {
        console.error('❌ No se pudo conectar a la base de datos después de todos los intentos');
      }
    } finally {
      if (connection) {
        connection.release();
        connection = null;
      }
    }
  }
}

// Función para verificar si la DB está lista
function isDbReady() {
  return dbReady;
}

// Ejecutar inicialización al cargar el módulo
initializeDatabase().catch(err => {
  console.error('Error crítico en inicialización:', err.message);
});

module.exports = { pool, isDbReady };

