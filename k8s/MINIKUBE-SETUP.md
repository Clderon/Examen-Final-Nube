# 🚀 Kubernetes LOCAL (Minikube) - Guía de Configuración

## Descripción
Este proyecto está configurado para ejecutarse en **Kubernetes local con Minikube**. Todos los servicios (Auth, Order, Notification Worker) están containerizados y listos para Kubernetes.

**Docker Compose** se mantiene solo para entornos de nube (producción).

---

## 📋 Requisitos Previos

### Instalar Minikube
```powershell
# 1. Instalar Docker (requisito)
# Descargar desde: https://www.docker.com/products/docker-desktop

# 2. Instalar Minikube
choco install minikube  # o descargarlo desde: https://minikube.sigs.k8s.io/docs/start/

# 3. Instalar kubectl (gestor de K8s)
choco install kubernetes-cli

# 4. Verificar instalaciones
minikube version
kubectl version --client
docker --version
```

---

## 🚀 Iniciar Minikube

### Opción 1: Con Docker driver (Recomendado en Windows)
```powershell
# Iniciar Minikube con Docker
minikube start --driver=docker --cpus=4 --memory=4096

# Verificar estado
minikube status
```

### Opción 2: Con Hyper-V (si tienes habilitado)
```powershell
minikube start --driver=hyperv --cpus=4 --memory=4096
```

### Verificar cluster está corriendo
```powershell
kubectl cluster-info
kubectl get nodes
```

---

## 🐳 Construir imágenes Docker en Minikube

### Configurar Docker CLI para usar Minikube
```powershell
# Conectar Docker CLI a Minikube
minikube docker-env | Invoke-Expression

# Verificar que Docker apunta a Minikube
docker ps
```

### Construir imágenes
```powershell
cd C:\Users\luism\OneDrive\Desktop\Trabajo-Final-Nube\Examen-Final-Nube

# Construir cada servicio
docker build -t auth-service:latest ./services/auth-service
docker build -t order-service:latest ./services/order-service
docker build -t notification-worker:latest ./services/notification-worker
docker build -t frontend:latest ./frontend

# Verificar imágenes
docker images | findstr "auth-service\|order-service\|notification-worker\|frontend"
```

---

## 📦 Desplegar en Kubernetes

### Opción 1: Desplegar con archivos individuales
```powershell
cd k8s

# Desplegar todos los servicios
kubectl apply -f namespace.yaml
kubectl apply -f rabbitmq.yaml
kubectl apply -f auth-deployment.yaml
kubectl apply -f order-deployment.yaml
kubectl apply -f worker.yaml
kubectl apply -f frontend.yaml

# Verificar despliegues
kubectl get deployments
kubectl get services
kubectl get pods
```

### Opción 2: Desplegar con Kustomize (Recomendado)
```powershell
cd k8s
kubectl apply -k .
```

---

## ✅ Verificar Estado de los Pods

```powershell
# Ver todos los pods
kubectl get pods

# Ver logs de un servicio
kubectl logs -l app=auth-service
kubectl logs -l app=order-service
kubectl logs -l app=notification-worker
kubectl logs -l app=rabbitmq

# Describir un pod (información detallada)
kubectl describe pod <pod-name>

# Ver eventos
kubectl get events
```

---

## 🌐 Acceder a Servicios

### Frontend (React)
```powershell
# Obtener IP de Minikube
minikube ip

# Abrir en navegador (reemplazar IP)
http://<minikube-ip>:30080
```

### RabbitMQ Management
```
http://<minikube-ip>:31567
Usuario: guest
Contraseña: guest
```

### Auth Service (API)
```
http://<minikube-ip>:30000/health
```

### Order Service (API)
```
http://<minikube-ip>:30001/health
```

---

## 🔄 Port Forwarding (Alternativa)

Si prefieres acceder por localhost:

```powershell
# Terminal 1: RabbitMQ
kubectl port-forward svc/rabbitmq 5672:5672 15672:15672

# Terminal 2: Auth Service
kubectl port-forward svc/auth-service 3000:3000

# Terminal 3: Order Service
kubectl port-forward svc/order-service 3001:3001

# Terminal 4: Frontend
kubectl port-forward svc/frontend 8080:80

# Acceder a:
# Frontend: http://localhost:8080
# RabbitMQ: http://localhost:15672
# Auth API: http://localhost:3000
# Order API: http://localhost:3001
```

---

## 🛠️ Comandos Útiles

```powershell
# Ver todos los recursos
kubectl get all

# Escalar un deployment
kubectl scale deployment/order-service --replicas=3

# Obtener logs en tiempo real
kubectl logs -f deployment/auth-service

# Ejecutar comandos dentro de un pod
kubectl exec -it <pod-name> -- /bin/sh

# Eliminar todos los recursos
kubectl delete all --all

# Dashboard de Minikube
minikube dashboard

# Detener Minikube
minikube stop

# Eliminar Minikube (reinicio completo)
minikube delete
```

---

## 🔧 Actualizar servicios

Cuando modifiques código:

```powershell
# 1. Reconstruir imagen
docker build -t nombre-service:latest ./services/nombre-service

# 2. Forzar actualización en K8s
kubectl rollout restart deployment/nombre-service

# 3. Verificar cambios
kubectl get pods
kubectl logs -l app=nombre-service
```

---

## 📝 Estructura de recursos

```
k8s/
├── namespace.yaml              # Namespace de la aplicación
├── auth-deployment.yaml        # Auth Service + ConfigMap
├── order-deployment.yaml       # Order Service + ConfigMap
├── rabbitmq.yaml              # RabbitMQ (Message Broker)
├── worker.yaml                # Notification Worker + ConfigMap
├── frontend.yaml              # Frontend React + ConfigMap
├── api-gateway.yaml           # Gateway de acceso (LoadBalancer)
└── kustomization.yaml         # Orquestación con Kustomize
```

---

## 🐛 Solucionar problemas

### Los pods no inician
```powershell
# Ver logs del pod
kubectl logs <pod-name>

# Ver descripción detallada
kubectl describe pod <pod-name>

# Verificar eventos
kubectl get events --sort-by='.lastTimestamp'
```

### Imágenes no encontradas
```powershell
# Verificar Docker está conectado a Minikube
minikube docker-env | Invoke-Expression
docker images

# Reconstruir imágenes
docker build -t nombre:latest ./ruta
```

### Minikube lento o sin memoria
```powershell
# Aumentar recursos
minikube delete
minikube start --driver=docker --cpus=8 --memory=8192
```

---

## 🎯 Próximos pasos

- ✅ Configurar Minikube y desplegar servicios
- [ ] Implementar Helm Charts (infraestructura como código)
- [ ] Configurar Ingress para URLs amigables
- [ ] Implementar auto-scaling (HPA)
- [ ] Configurar persistencia de datos (PersistentVolumes)
- [ ] Setup de CI/CD (GitHub Actions, ArgoCD)

---

## 📚 Referencias
- [Minikube Docs](https://minikube.sigs.k8s.io/)
- [Kubernetes Docs](https://kubernetes.io/docs/)
- [Docker Docs](https://docs.docker.com/)
