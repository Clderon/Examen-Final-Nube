# 🏗️ Examen Final Nube - Sistema de Microservicios

Sistema completo de microservicios con **Kubernetes** para desarrollo local (Minikube) y **Docker Compose** para entornos de nube.

---

## 📋 Índice

1. [Descripción General](#descripción-general)
2. [Arquitectura](#arquitectura)
3. [Estructura del Proyecto](#estructura-del-proyecto)
4. [Desarrollo Local con Kubernetes](#desarrollo-local-con-kubernetes)
5. [Despliegue en Nube](#despliegue-en-nube)
6. [Servicios](#servicios)
7. [Tecnologías](#tecnologías)

---

## 📖 Descripción General

Este proyecto implementa una arquitectura de **microservicios** moderna con:

✅ **Kubernetes Local** - Desarrollo en Minikube  
✅ **Docker Compose** - Para entornos de producción/nube  
✅ **Message Broker** - RabbitMQ para comunicación asincrónica  
✅ **Frontend React** - Interfaz de usuario responsiva  
✅ **API REST** - Servicios de autenticación y órdenes  

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────┐
│          CLIENTE FRONTEND (React)                   │
│              (Puerto 8080/30080)                    │
└──────────────┬──────────────────────────────────────┘
               │
               ├─────────────────────┬────────────────────┐
               │                     │                    │
    ┌──────────▼────────┐  ┌────────▼──────────┐  ┌─────▼───────────┐
    │  AUTH SERVICE     │  │  ORDER SERVICE    │  │   RABBITMQ      │
    │   (Puerto 3000)   │  │   (Puerto 3001)   │  │ (Puerto 5672)   │
    └──────────────────┘  └───────────────────┘  └────────┬────────┘
                                                          │
                                               ┌──────────▼──────────┐
                                               │ NOTIFICATION WORKER │
                                               │  (Consumer)         │
                                               └─────────────────────┘
```

---

## 📂 Estructura del Proyecto

```
Examen-Final-Nube/
├── 📁 k8s/                           # ☸️ Kubernetes (Minikube)
│   ├── MINIKUBE-SETUP.md             # Guía de configuración
│   ├── deploy.ps1                    # Script deploy PowerShell
│   ├── deploy.sh                     # Script deploy Bash
│   ├── kustomization.yaml            # Orquestación K8s
│   ├── namespace.yaml                # Namespace app
│   ├── auth-deployment.yaml          # Auth Service + ConfigMap
│   ├── order-deployment.yaml         # Order Service + ConfigMap
│   ├── worker.yaml                   # Notification Worker
│   ├── rabbitmq.yaml                 # RabbitMQ con ConfigMap
│   ├── frontend.yaml                 # Frontend React
│   └── api-gateway.yaml              # Gateway de acceso
│
├── 📁 services/                      # Microservicios Backend
│   ├── auth-service/                 # 🔐 Autenticación JWT
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── src/
│   │       ├── index.js
│   │       ├── controllers/
│   │       ├── middleware/
│   │       └── routes/
│   │
│   ├── order-service/                # 📦 Gestión de Órdenes
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── src/
│   │
│   └── notification-worker/          # 🔔 Procesador de Notificaciones
│       ├── Dockerfile
│       ├── package.json
│       └── src/
│
├── 📁 frontend/                      # ⚛️ React SPA
│   ├── Dockerfile
│   ├── package.json
│   ├── public/
│   └── src/
│       ├── App.jsx
│       ├── api/
│       ├── auth/
│       └── orders/
│
├── docker-compose.yml                # Para nube (producción)
└── README.md                         # Este archivo
```

---

## 🚀 Desarrollo Local con Kubernetes

### Quick Start (3 pasos)

```powershell
# 1. Preparar ambiente
cd k8s

# 2. Ejecutar script deploy
.\deploy.ps1 deploy

# 3. Acceder a la aplicación
minikube ip  # Obtener IP
# Frontend: http://<IP>:30080
```

### Detallado: Guía completa

📖 **[Ver guía MINIKUBE-SETUP.md](./k8s/MINIKUBE-SETUP.md)** para:
- ✅ Instalación de prerrequisitos
- ✅ Construcción de imágenes
- ✅ Despliegue de servicios
- ✅ Acceso a aplicación
- ✅ Troubleshooting

---

## 🐳 Despliegue en Nube

### Con Docker Compose

```bash
# Desplegar toda la stack
docker-compose up -d

# Ver logs
docker-compose logs -f

# Parar servicios
docker-compose down
```

**Accesible en:**
- Frontend: http://localhost:8080
- Auth API: http://localhost:3000
- Order API: http://localhost:3001
- RabbitMQ: http://localhost:15672

---

## 🔧 Servicios

### 🔐 Auth Service
- **Puerto:** 3000
- **Función:** Autenticación y generación de JWT
- **Endpoints:**
  - `POST /login` - Obtener token JWT
  - `GET /health` - Health check

### 📦 Order Service
- **Puerto:** 3001
- **Función:** Gestión de órdenes de compra
- **Endpoints:**
  - `POST /orders` - Crear orden
  - `GET /orders` - Listar órdenes
  - `GET /health` - Health check
- **Conectado a:** RabbitMQ (publica eventos)

### 🔔 Notification Worker
- **Consumer:** RabbitMQ
- **Función:** Procesa eventos de órdenes y envía notificaciones
- **Dependencias:** RabbitMQ, Order Service

### 🐰 RabbitMQ
- **Puerto AMQP:** 5672
- **Puerto Management:** 15672
- **Credenciales:** guest/guest
- **Función:** Message broker para comunicación asincrónica

### ⚛️ Frontend
- **Puerto:** 8080 (Docker Compose) / 30080 (Kubernetes)
- **Framework:** React + Vite
- **Función:** UI para login y gestión de órdenes

---

## 💻 Tecnologías

| Componente | Tecnología |
|-----------|-----------|
| **Backend** | Node.js + Express.js |
| **Frontend** | React 18 + Vite |
| **Orquestación Local** | Kubernetes (Minikube) |
| **Orquestación Nube** | Docker Compose |
| **Autenticación** | JWT (jsonwebtoken) |
| **Message Broker** | RabbitMQ |
| **Container Runtime** | Docker |
| **Package Manager** | npm |

---

## 📚 Scripts Disponibles

### PowerShell (Windows)
```powershell
# Iniciar Minikube
.\deploy.ps1 start

# Construir imágenes
.\deploy.ps1 build

# Despliegue completo (start + build + deploy)
.\deploy.ps1 deploy

# Ver logs de un servicio
.\deploy.ps1 logs auth-service

# Reiniciar un servicio
.\deploy.ps1 restart order-service

# Detener Minikube
.\deploy.ps1 stop

# Limpiar recursos
.\deploy.ps1 clean
```

### Bash (Linux/Mac)
```bash
# Despliegue completo
./deploy.sh deploy

# Ver logs
./deploy.sh logs auth-service

# Reiniciar servicio
./deploy.sh restart order-service
```

---

## 🛠️ Comandos kubectl Útiles

```powershell
# Ver todos los recursos
kubectl get all

# Ver pods en tiempo real
kubectl get pods -w

# Ver logs de un pod
kubectl logs <pod-name>

# Ejecutar comando en pod
kubectl exec -it <pod-name> -- sh

# Port forward
kubectl port-forward svc/rabbitmq 5672:5672

# Dashboard
minikube dashboard

# Describir recurso
kubectl describe pod <pod-name>
```

---

## 🔄 Workflow de Desarrollo

1. **Modificar código** en servicios
2. **Reconstruir imagen:** `docker build -t servicio:latest ./services/servicio`
3. **Actualizar en K8s:** `kubectl rollout restart deployment/servicio`
4. **Verificar:** `kubectl logs -l app=servicio`

---

## ⚙️ Configuración de Servicios

### Variables de Entorno

**Auth Service** (.env):
```
PORT=3000
NODE_ENV=development
```

**Order Service** (.env):
```
PORT=3001
NODE_ENV=development
RABBITMQ_HOST=rabbitmq
RABBITMQ_PORT=5672
```

**Notification Worker** (.env):
```
NODE_ENV=development
RABBITMQ_HOST=rabbitmq
RABBITMQ_PORT=5672
```

**Frontend** (.env):
```
REACT_APP_API_URL=http://localhost:3000
```

---

## 📊 Monitoreo

### Health Checks
Todos los servicios exponen endpoints de health:
```
GET /health
```

### RabbitMQ Management Console
```
http://<ip>:15672
Usuario: guest
Contraseña: guest
```

### Logs en tiempo real
```powershell
kubectl logs -f deployment/nombre-servicio
```

---

## 🚀 Próximas mejoras

- [ ] Helm Charts para mejor versionado
- [ ] Ingress para URLs amigables
- [ ] HPA (Horizontal Pod Autoscaler)
- [ ] PersistentVolumes para datos
- [ ] CI/CD con GitHub Actions
- [ ] Métricas con Prometheus
- [ ] Logs centralizados con ELK

---

## 📄 Licencia

MIT

---

## 👨‍💻 Autor

Examen Final - Nube Computing  
Universidad/Institución: [Tu institución]

---

## 📞 Soporte

Para reportar problemas o sugerencias, crear un issue en el repositorio.

---

**Last Updated:** Diciembre 2025
