const mysql = require('mysql2/promise');

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'authuser',
  password: process.env.DB_PASSWORD || 'authpass123',
  database: process.env.DB_NAME || 'usersdb',
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
    console.log('✅ Conexión a MySQL verificada');
    return true;
  } catch (error) {
    console.error('❌ Error al conectar con MySQL:', error.message);
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
        console.log(`⏳ Reintentando conexión a MySQL (intento ${i + 1}/${retries})...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
      }

      // Verificar conexión primero
      const connected = await testConnection();
      if (!connected) {
        continue; // Continuar al siguiente intento
      }

      // Conectar usando el pool
      connection = await pool.getConnection();
      
      // Crear tabla de usuarios
      await connection.query(`
        CREATE TABLE IF NOT EXISTS users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          role VARCHAR(50) DEFAULT 'user',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_email (email)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);

      // Verificar si existe el usuario admin
      const [adminUsers] = await connection.query(
        'SELECT * FROM users WHERE email = ?',
        ['admin@admin.com']
      );

      // Crear usuario admin por defecto si no existe
      if (adminUsers.length === 0) {
        await connection.query(
          'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
          ['Administrador', 'admin@admin.com', 'admin123', 'admin']
        );
        console.log('✅ Usuario admin creado por defecto');
      }

      dbReady = true;
      console.log('✅ Base de datos inicializada correctamente');
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

