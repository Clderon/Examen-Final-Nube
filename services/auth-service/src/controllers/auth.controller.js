const jwt = require("jsonwebtoken");

const SECRET = process.env.JWT_SECRET || "secret123";

// Usuarios en memoria (en producción usar una base de datos)
const users = [
  {
    id: 1,
    name: "Administrador",
    email: "admin@admin.com",
    password: "admin123",
    role: "admin",
    createdAt: new Date().toISOString()
  }
];

// Helper para hashear contraseñas
function hashPassword(password) {
  return password; // En producción usar bcrypt.hash()
}

// Helper para comparar contraseñas
function comparePassword(password, hashedPassword) {
  return password === hashedPassword; // En producción usar bcrypt.compare()
}

// POST /register - Registrar nuevo usuario
const register = (req, res) => {
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

  const existingUser = users.find(u => u.email === email);
  if (existingUser) {
    return res.status(400).json({ message: "El usuario ya existe" });
  }

  const newUser = {
    id: users.length + 1,
    name: name || email.split('@')[0],
    email,
    password: hashPassword(password),
    role: "user",
    createdAt: new Date().toISOString()
  };
  
  users.push(newUser);
  
  const userResponse = {
    id: newUser.id,
    name: newUser.name,
    email: newUser.email,
    role: newUser.role
  };
  
  const token = jwt.sign({ userId: newUser.id, email: newUser.email, role: newUser.role }, SECRET, { expiresIn: "24h" });
  
  console.log(`✅ Usuario registrado: ${email}`);
  res.status(201).json({ 
    message: "Usuario registrado exitosamente",
    token,
    user: userResponse
  });
};

// POST /login - Iniciar sesión
const login = (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ message: "Email y contraseña son requeridos" });
  }

  const user = users.find(u => u.email === email);
  
  if (!user) {
    return res.status(401).json({ message: "Credenciales incorrectas" });
  }

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
};

// GET /profile - Obtener perfil del usuario actual
const getProfile = (req, res) => {
  const user = users.find(u => u.id === req.user.userId);
  
  if (!user) {
    return res.status(404).json({ message: "Usuario no encontrado" });
  }

  const userResponse = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt
  };

  res.json(userResponse);
};

// GET /users - Listar todos los usuarios (solo admin)
const getAllUsers = (req, res) => {
  const usersList = users.map(user => ({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt
  }));

  res.json({
    total: usersList.length,
    users: usersList
  });
};

// Función para obtener usuarios (exportada para uso en otros módulos)
const getUsers = () => users;

module.exports = {
  register,
  login,
  getProfile,
  getAllUsers,
  getUsers // Para uso en otros módulos
};

