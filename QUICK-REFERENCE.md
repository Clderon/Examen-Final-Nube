# 🚀 Quick Reference - Kubernetes + Docker Compose

Cheat sheet para comandos frecuentes.

---

## ☸️ KUBERNETES (Minikube)

### Iniciar

```powershell
# Iniciar Minikube
minikube start --driver=docker --cpus=4 --memory=4096

# Verificar
minikube status
minikube ip
```

### Desplegar

```powershell
# Opción A: Automático (Recomendado)
cd k8s
.\deploy.ps1 deploy

# Opción B: Manual
cd k8s
kubectl apply -k .

# Opción C: Archivo por archivo
kubectl apply -f namespace.yaml
kubectl apply -f rabbitmq.yaml
kubectl apply -f auth-deployment.yaml
kubectl apply -f order-deployment.yaml
kubectl apply -f worker.yaml
kubectl apply -f frontend.yaml
```

### Ver Estado

```powershell
# Pods
kubectl get pods
kubectl get pods -w                          # Watching
kubectl get pods -o wide                     # Detalles

# Services
kubectl get svc
kubectl get svc -A                           # Todos namespaces

# Deployments
kubectl get deployments
kubectl describe deployment/auth-service

# ConfigMaps
kubectl get configmap
```

### Logs y Debugging

```powershell
# Logs de deployment
kubectl logs deployment/auth-service
kubectl logs deployment/order-service -f    # Follow

# Logs de pod específico
kubectl logs <pod-name>
kubectl logs <pod-name> --previous          # Error anterior

# Logs de todos en label
kubectl logs -l app=rabbitmq --tail=50

# Ejecutar comando en pod
kubectl exec -it <pod-name> -- sh
kubectl exec -it <pod-name> -- bash

# Describe pod
kubectl describe pod <pod-name>

# Events
kubectl get events
```

### Port Forwarding

```powershell
# Terminal 1
kubectl port-forward svc/frontend 8080:80

# Terminal 2
kubectl port-forward svc/auth-service 3000:3000

# Terminal 3
kubectl port-forward svc/order-service 3001:3001

# Terminal 4
kubectl port-forward svc/rabbitmq 15672:15672
```

### Escalado

```powershell
# Escalar
kubectl scale deployment/auth-service --replicas=3

# Ver replicas
kubectl get deployments

# Rollout history
kubectl rollout history deployment/auth-service

# Rollback
kubectl rollout undo deployment/auth-service
```

### Actualizar Servicios

```powershell
# Opción A: Forzar restart
kubectl rollout restart deployment/auth-service

# Opción B: Reconstruir imagen y desplegar
docker build -t auth-service:latest ./services/auth-service
kubectl rollout restart deployment/auth-service

# Opción C: Actualizar manualmente
kubectl set image deployment/auth-service \
  auth=auth-service:latest --record
```

### Eliminar Recursos

```powershell
# Pod
kubectl delete pod <pod-name>

# Deployment
kubectl delete deployment auth-service

# Todo en k8s/
kubectl delete -k k8s/

# Todo en namespace
kubectl delete all --all
```

### Dashboard

```powershell
# Abrir dashboard
minikube dashboard

# Detiene Minikube
minikube stop

# Elimina Minikube (para reinicio limpio)
minikube delete
```

---

## 🐳 DOCKER COMPOSE

### Iniciar

```bash
# Desplegar
docker-compose up -d

# Desplegar y ver logs
docker-compose up

# Desplegar sin cache
docker-compose up -d --build
```

### Ver Estado

```bash
# Containers
docker-compose ps

# Logs
docker-compose logs

# Logs de servicio específico
docker-compose logs order-service

# Logs en vivo
docker-compose logs -f auth-service

# Últimas líneas
docker-compose logs --tail=50
```

### Ejecutar Comandos

```bash
# En container
docker-compose exec order-service sh

# Comando sin interactividad
docker-compose exec auth-service npm version
```

### Actualizar Servicios

```bash
# Reconstruir imagen
docker-compose build order-service

# Reconstruir y reiniciar
docker-compose up -d --build order-service

# Restart sin rebuild
docker-compose restart order-service
```

### Detener/Eliminar

```bash
# Detener pero mantener datos
docker-compose stop

# Reiniciar
docker-compose start

# Eliminar todo
docker-compose down

# Eliminar todo incluyendo volumes
docker-compose down -v
```

---

## 🧪 TESTING

### Health Checks

```powershell
# Kubernetes
kubectl get pods                    # Ver status
kubectl describe pod <pod-name>    # Detalles

# Docker Compose
curl http://localhost:3000/health
curl http://localhost:3001/health
curl http://localhost:8080
```

### Acceso a Aplicación

#### Kubernetes
```powershell
$IP = minikube ip
# Frontend: http://$IP:30080
# Auth API: http://$IP:30000/health
# Order API: http://$IP:30001/health
# RabbitMQ: http://$IP:31567
```

#### Docker Compose
```
Frontend: http://localhost:8080
Auth API: http://localhost:3000
Order API: http://localhost:3001
RabbitMQ: http://localhost:15672
```

### RabbitMQ Management

```
URL: http://localhost:15672 (Docker Compose)
     http://<minikube-ip>:31567 (Kubernetes)
Usuario: guest
Contraseña: guest

En UI:
1. Ir a "Queues"
2. Ver queue "orders"
3. Ver mensajes pendientes
4. Ver consumers conectados
```

### APIs

```powershell
# Login (Auth Service)
curl -X POST http://localhost:3000/login `
  -H "Content-Type: application/json" `
  -d '{"username":"test"}'

# Obtener órdenes
curl http://localhost:3001/orders

# Crear orden
curl -X POST http://localhost:3001/orders `
  -H "Content-Type: application/json" `
  -d '{
    "userId":"user1",
    "items":["item1"],
    "total":99.99
  }'
```

---

## 📊 RECURSOS

### CPU/Memoria

```powershell
# Kubernetes
kubectl top nodes
kubectl top pods
kubectl describe node minikube

# Docker
docker stats

# Docker Compose
docker-compose stats
```

### Tamaño de Imágenes

```bash
docker images
docker image ls --format "table {{.Repository}}\t{{.Size}}"
```

---

## 🔧 TROUBLESHOOTING

### Minikube Issues

```powershell
# Verificar estado
minikube status

# Logs de Minikube
minikube logs

# Aumentar recursos
minikube delete
minikube start --cpus=8 --memory=8192

# Limpiar
minikube clean
```

### Pod Errors

```powershell
# Ver error
kubectl describe pod <pod-name>

# Ver logs
kubectl logs <pod-name>

# Recrear
kubectl delete pod <pod-name>
kubectl apply -f deployment.yaml
```

### Network Issues

```powershell
# Test DNS
kubectl run -it --rm debug --image=nicolaka/netshoot -- bash
nslookup rabbitmq

# Test conectividad
kubectl run -it --rm debug --image=busybox -- sh
nc -zv rabbitmq 5672
```

### Port Issues

```bash
# Ver puertos en uso
netstat -ano | findstr :8080      # Windows
lsof -i :8080                      # Linux/Mac

# Cambiar puerto en docker-compose
ports:
  - "8081:80"    # Cambiar 8080 por 8081
```

---

## 📝 ARCHIVOS IMPORTANTES

| Archivo | Propósito |
|---------|-----------|
| `k8s/MINIKUBE-SETUP.md` | Guía Minikube |
| `DOCKER-CLOUD-SETUP.md` | Guía Cloud |
| `TESTING.md` | Testing |
| `ARCHITECTURE.md` | Arquitectura |
| `README.md` | Documentación general |
| `docker-compose.yml` | Nube (producción) |
| `k8s/*.yaml` | Manifests Kubernetes |

---

## 🎯 WORKFLOW TÍPICO

### Desarrollo Local

```powershell
# 1. Setup inicial
cd k8s
.\deploy.ps1 deploy

# 2. Ver logs
kubectl logs -f deployment/order-service

# 3. Hacer cambios en código
# (edit services/)

# 4. Reconstruir y deploy
docker build -t order-service:latest ./services/order-service
kubectl rollout restart deployment/order-service

# 5. Verificar
kubectl logs -f deployment/order-service
```

### Despliegue en Nube

```bash
# 1. Usar Docker Compose
docker-compose up -d

# 2. Ver logs
docker-compose logs -f order-service

# 3. Hacer cambios
# (edit services/)

# 4. Reconstruir
docker-compose build order-service

# 5. Desplegar
docker-compose up -d --build

# 6. Verificar
docker-compose ps
```

---

## 🔐 VARIABLES DE ENTORNO

### Auth Service
```
PORT=3000
NODE_ENV=development
JWT_SECRET=secret123
```

### Order Service
```
PORT=3001
NODE_ENV=development
RABBITMQ_HOST=rabbitmq
RABBITMQ_PORT=5672
```

### Notification Worker
```
NODE_ENV=development
RABBITMQ_HOST=rabbitmq
RABBITMQ_PORT=5672
```

### Frontend
```
REACT_APP_API_URL=http://localhost:3000
```

---

## ✅ CHECKLIST RÁPIDO

- [ ] Minikube instalado y corriendo
- [ ] Imágenes Docker construidas
- [ ] Pods en estado `Running`
- [ ] Services accesibles
- [ ] Frontend carga en navegador
- [ ] APIs responden a health checks
- [ ] RabbitMQ acepta conexiones
- [ ] Crear orden → procesa en worker
- [ ] Logs muestran flujo correcto

---

**Última actualización:** Diciembre 2025  
**Versión:** 1.0  
**Estado:** Listo para producción
