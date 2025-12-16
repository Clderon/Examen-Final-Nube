const express = require("express");
const jwt = require("jsonwebtoken");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const SECRET = process.env.JWT_SECRET || "secret123";

// Usuarios en memoria (en producción usar una base de datos)
// Usuario admin por defecto
const users = [
  {
    id: 1,
    name: "Administrador",
    email: "admin@admin.com",
    password: "admin123", // En producción esto debería estar hasheado con bcrypt
    role: "admin"
  }
];

// Helper para hashear contraseñas (simplificado, en producción usar bcrypt)
function hashPassword(password) {
  // Por ahora solo retornamos la contraseña, en producción usar bcrypt.hash()
  return password;
}

// Helper para comparar contraseñas
function comparePassword(password, hashedPassword) {
  // Por ahora solo comparamos directamente, en producción usar bcrypt.compare()
  return password === hashedPassword;
}

// Endpoint de registro
app.post("/register", (req, res) => {
  const { name, email, password } = req.body;
  
  // Validación básica
  if (!email || !password) {
    return res.status(400).json({ message: "Email y contraseña son requeridos" });
  }

  // Verificar si el usuario ya existe
  const existingUser = users.find(u => u.email === email);
  if (existingUser) {
    return res.status(400).json({ message: "El usuario ya existe" });
  }

  // Crear nuevo usuario
  const newUser = {
    id: users.length + 1,
    name: name || email.split('@')[0],
    email,
    password: hashPassword(password),
    role: "user"
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
});

// Endpoint de login
app.post("/login", (req, res) => {
  const { email, password } = req.body;
  
  // Validación básica
  if (!email || !password) {
    return res.status(400).json({ message: "Email y contraseña son requeridos" });
  }

  // Buscar usuario
  const user = users.find(u => u.email === email);
  
  if (!user) {
    return res.status(401).json({ message: "Credenciales incorrectas" });
  }

  // Verificar contraseña
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
});

app.get("/health", (req, res) => {
  res.send("Auth Service OK");
});

app.get("/", (req, res) => {
  res.json({
    service: "Auth Service",
    status: "running",
    version: "1.0.0",
    endpoints: {
      register: "POST /register",
      login: "POST /login",
      health: "GET /health"
    }
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Auth Service running on port ${PORT}`);
  console.log(`🔑 Usuario admin disponible:`);
  console.log(`   Email: admin@admin.com`);
  console.log(`   Password: admin123`);
});
