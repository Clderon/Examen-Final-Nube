const mysql = require('mysql2/promise');

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'authuser',
  password: process.env.DB_PASSWORD || 'authpass123',
  database: process.env.DB_NAME || 'usersdb',
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

    console.log('✅ Base de datos inicializada correctamente');
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

