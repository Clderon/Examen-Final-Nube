#!/bin/bash
set -e

# Logs
LOG_FILE="/var/log/docker-setup.log"
exec > >(tee -a $LOG_FILE)
exec 2>&1

echo "=== Iniciando setup de Docker Compose en EC2 ==="
echo "Timestamp: $(date)"

# Actualizar sistema
echo "Actualizando paquetes del sistema..."
apt-get update
apt-get upgrade -y

# Instalar dependencias básicas
echo "Instalando dependencias..."
apt-get install -y \
  curl \
  wget \
  git \
  htop \
  nano \
  net-tools \
  unzip

# Instalar Docker
echo "Instalando Docker..."
apt-get install -y \
  docker.io \
  docker-compose

# Agregar ubuntu al grupo docker
usermod -aG docker ubuntu

# Iniciar servicio Docker
echo "Iniciando servicio Docker..."
systemctl start docker
systemctl enable docker

# Esperar a que Docker esté listo
sleep 5

# Clonar repositorio
REPO_DIR="/opt/examen-final-nube"
echo "Clonando repositorio en $REPO_DIR..."
git clone https://github.com/luismiguelgilbert/Trabajo-Final-Nube.git $REPO_DIR 2>&1 || {
  echo "Usando URL alternativa..."
  git clone https://github.com/luismiguelgilbert/Examen-Final-Nube.git $REPO_DIR
}

cd $REPO_DIR/Examen-Final-Nube

# Iniciar aplicación con Docker Compose
echo "Levantando aplicación con Docker Compose..."
docker-compose up -d

echo "Esperando a que los servicios estén listos..."
sleep 15

# Verificar estado de servicios
docker-compose ps

# Obtener información de acceso
EXTERNAL_IP=$(ec2-metadata --public-ipv4 | cut -d' ' -f2)
if [ -z "$EXTERNAL_IP" ] || [ "$EXTERNAL_IP" = "unavailable" ]; then
  EXTERNAL_IP=$(hostname -I | awk '{print $1}')
fi

echo ""
echo "=== Setup completado ==="
echo ""
echo "Acceso a la aplicación:"
echo "  Frontend: http://$EXTERNAL_IP:8080"
echo "  Auth Service: http://$EXTERNAL_IP:3000"
echo "  Order Service: http://$EXTERNAL_IP:3001"
echo "  RabbitMQ Management: http://$EXTERNAL_IP:15672 (usuario: guest, password: guest)"
echo ""
echo "Comandos útiles:"
echo "  Ver servicios: docker-compose ps"
echo "  Ver logs: docker-compose logs -f"
echo "  Logs frontend: docker-compose logs frontend"
echo "  Logs order-service: docker-compose logs order-service"
echo "  Detener: docker-compose down"
echo ""
echo "Log completo: $LOG_FILE"

echo "=== Docker Compose setup COMPLETADO ==="
