const jwt = require("jsonwebtoken");
const { pool, isDbReady } = require("../database/db");

const SECRET = process.env.JWT_SECRET || "secret123";

// Helper para hashear contraseñas (simplificado, en producción usar bcrypt)
function hashPassword(password) {
  return password; // En producción usar bcrypt.hash()
}

// Helper para comparar contraseñas (simplificado, en producción usar bcrypt)
function comparePassword(password, hashedPassword) {
  return password === hashedPassword; // En producción usar bcrypt.compare()
}

// POST /register - Registrar nuevo usuario
const register = async (req, res) => {
  if (!isDbReady()) {
    return res.status(503).json({ message: "Servicio no disponible. Base de datos no está lista aún." });
  }
  
  try {
    const { name, email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: "Email y contraseña son requeridos" });
    }

    // Validar formato de email básico
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Formato de email inválido" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "La contraseña debe tener al menos 6 caracteres" });
    }

    // Verificar si el usuario ya existe
    const [existingUsers] = await pool.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ message: "El usuario ya existe" });
    }

    // Crear nuevo usuario
    const hashedPassword = hashPassword(password);
    const [result] = await pool.query(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name || email.split('@')[0], email, hashedPassword, 'user']
    );

    const userId = result.insertId;
    
    const userResponse = {
      id: userId,
      name: name || email.split('@')[0],
      email: email,
      role: 'user'
    };
    
    const token = jwt.sign({ userId: userId, email: email, role: 'user' }, SECRET, { expiresIn: "24h" });
    
    console.log(`✅ Usuario registrado: ${email}`);
    res.status(201).json({ 
      message: "Usuario registrado exitosamente",
      token,
      user: userResponse
    });
  } catch (error) {
    console.error('Error al registrar usuario:', error);
    res.status(500).json({ message: "Error al registrar usuario", error: error.message });
  }
};

// POST /login - Iniciar sesión
const login = async (req, res) => {
  if (!isDbReady()) {
    return res.status(503).json({ message: "Servicio no disponible. Base de datos no está lista aún." });
  }
  
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: "Email y contraseña son requeridos" });
    }

    // Buscar usuario en la base de datos
    const [users] = await pool.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
  
    if (users.length === 0) {
      return res.status(401).json({ message: "Credenciales incorrectas" });
    }

    const user = users[0];

    if (!comparePassword(password, user.password)) {
      return res.status(401).json({ message: "Credenciales incorrectas" });
    }

    const userResponse = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role || "user"
    };
    
    const token = jwt.sign({ userId: user.id, email: user.email, role: userResponse.role }, SECRET, { expiresIn: "24h" });
    
    console.log(`✅ Usuario autenticado: ${email} (${userResponse.role})`);
    res.json({ 
      token,
      user: userResponse
    });
  } catch (error) {
    console.error('Error al iniciar sesión:', error);
    res.status(500).json({ message: "Error al iniciar sesión", error: error.message });
  }
};

// GET /profile - Obtener perfil del usuario actual
const getProfile = async (req, res) => {
  if (!isDbReady()) {
    return res.status(503).json({ message: "Servicio no disponible. Base de datos no está lista aún." });
  }
  
  try {
    const [users] = await pool.query(
      'SELECT id, name, email, role, created_at FROM users WHERE id = ?',
      [req.user.userId]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    const user = users[0];
    const userResponse = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.created_at
    };

    res.json(userResponse);
  } catch (error) {
    console.error('Error al obtener perfil:', error);
    res.status(500).json({ message: "Error al obtener perfil", error: error.message });
  }
};

// GET /users - Listar todos los usuarios (solo admin)
const getAllUsers = async (req, res) => {
  if (!isDbReady()) {
    return res.status(503).json({ message: "Servicio no disponible. Base de datos no está lista aún." });
  }
  
  try {
    const [users] = await pool.query(
      'SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC'
    );

    const usersList = users.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.created_at
    }));

    res.json({
      total: usersList.length,
      users: usersList
    });
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({ message: "Error al obtener usuarios", error: error.message });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  getAllUsers,
  getUsers // Para uso en otros módulos
};

