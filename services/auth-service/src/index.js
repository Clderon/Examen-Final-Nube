const express = require("express");
const jwt = require("jsonwebtoken");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const SECRET = process.env.JWT_SECRET || "secret123";

// Endpoint de registro
app.post("/register", (req, res) => {
  const { name, email, password } = req.body;
  
  // Validación básica
  if (!email || !password) {
    return res.status(400).json({ message: "Email y contraseña son requeridos" });
  }

  // En una aplicación real, aquí guardarías el usuario en la base de datos
  // Por ahora, solo generamos un token como si el registro fuera exitoso
  const user = { 
    id: Date.now(), 
    name: name || email.split('@')[0], 
    email 
  };
  
  const token = jwt.sign({ userId: user.id, email: user.email }, SECRET, { expiresIn: "24h" });
  
  console.log(`✅ Usuario registrado: ${email}`);
  res.status(201).json({ 
    message: "Usuario registrado exitosamente",
    token,
    user 
  });
});

// Endpoint de login
app.post("/login", (req, res) => {
  const { email, password } = req.body;
  
  // Validación básica
  if (!email || !password) {
    return res.status(400).json({ message: "Email y contraseña son requeridos" });
  }

  // En una aplicación real, aquí verificarías las credenciales en la base de datos
  // Por ahora, aceptamos cualquier email/password
  const user = { 
    id: Date.now(), 
    name: email.split('@')[0], 
    email 
  };
  
  const token = jwt.sign({ userId: user.id, email: user.email }, SECRET, { expiresIn: "24h" });
  
  console.log(`✅ Usuario autenticado: ${email}`);
  res.json({ 
    token,
    user 
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
});
