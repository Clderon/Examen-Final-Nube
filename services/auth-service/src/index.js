const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/auth.routes");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Rutas
app.use("/", authRoutes);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "OK", service: "Auth Service" });
});

// Endpoint raíz con documentación
app.get("/", (req, res) => {
  res.json({
    service: "Auth Service",
    status: "running",
    version: "1.0.0",
    endpoints: {
      register: "POST /register",
      login: "POST /login",
      profile: "GET /profile (requiere auth)",
      users: "GET /users (requiere auth y admin)",
      health: "GET /health"
    }
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Auth Service running on port ${PORT}`);
  console.log(`🔑 Usuario admin disponible:`);
  console.log(`   Email: admin@admin.com`);
  console.log(`   Password: admin123`);
  console.log(`📚 Documentación API disponible en: http://localhost:${PORT}/`);
});
