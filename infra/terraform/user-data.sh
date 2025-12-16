#!/bin/bash

# Logs
LOG_FILE="/var/log/docker-setup.log"
exec > >(tee -a $LOG_FILE)
exec 2>&1

echo "======================================"
echo "Iniciando setup de Docker Compose"
echo "Timestamp: $(date)"
echo "======================================"

# Exit on error pero permite continuar
trap 'echo "ERROR en línea $LINENO"; exit 1' ERR

# Actualizar sistema
echo "[1/7] Actualizando paquetes del sistema..."
apt-get update > /dev/null 2>&1
apt-get upgrade -y > /dev/null 2>&1

# Instalar dependencias
echo "[2/7] Instalando dependencias..."
apt-get install -y \
  curl wget git htop nano net-tools unzip \
  ca-certificates gnupg lsb-release \
  > /dev/null 2>&1

# Instalar Docker
echo "[3/7] Instalando Docker..."
apt-get install -y docker.io > /dev/null 2>&1

# Instalar docker-compose desde apt (más estable)
echo "[4/7] Instalando docker-compose..."
apt-get install -y docker-compose > /dev/null 2>&1

# Iniciar Docker
echo "[5/7] Iniciando Docker daemon..."
systemctl start docker
systemctl enable docker
sleep 5

# Agregar ubuntu al grupo docker
usermod -aG docker ubuntu

# Verificaciones
echo "[6/7] Verificando instalaciones..."
docker --version
docker-compose --version

# Clonar repositorio
echo "[7/7] Clonando repositorio..."
REPO_DIR="/opt/examen-final-nube"
TEMP_DIR="/tmp/examen-repo-$$"

mkdir -p $REPO_DIR
mkdir -p $TEMP_DIR

cd $TEMP_DIR
echo "  - Clonando desde GitHub..."
if ! git clone https://github.com/Clderon/Examen-Final-Nube.git . 2>&1 | head -5; then
  echo "ERROR: No se pudo clonar el repositorio"
  exit 1
fi

echo "  - Buscando Examen-Final-Nube dentro del repo..."
if [ -d "Examen-Final-Nube" ]; then
  echo "  - Encontrado subdirectorio Examen-Final-Nube"
  cp -r Examen-Final-Nube/* $REPO_DIR/
elif [ -f "docker-compose.yml" ]; then
  echo "  - docker-compose.yml en raíz"
  cp -r . $REPO_DIR/
else
  echo "ERROR: No se encontró docker-compose.yml"
  ls -la
  exit 1
fi

# Limpiar temp
rm -rf $TEMP_DIR

# Verificar que exista docker-compose.yml
if [ ! -f "$REPO_DIR/docker-compose.yml" ]; then
  echo "ERROR: docker-compose.yml no existe en $REPO_DIR"
  ls -la $REPO_DIR/
  exit 1
fi

echo "✓ Repositorio clonado exitosamente en $REPO_DIR"

# Levantar Docker Compose
cd $REPO_DIR
echo ""
echo "======================================"
echo "Levantando servicios con Docker Compose"
echo "======================================"

# Mostrar docker-compose.yml
echo "Contenido de docker-compose.yml:"
head -20 docker-compose.yml

echo ""
echo "Construyendo imágenes sin caché..."
sudo -u ubuntu docker-compose build --no-cache 2>&1

echo ""
echo "Iniciando servicios..."
sudo -u ubuntu docker-compose up -d 2>&1

echo "Esperando a que los servicios estén listos..."
sleep 20

# Verificar estado
echo ""
echo "Estado de los servicios:"
sudo -u ubuntu docker-compose ps

# Obtener IP externa
EXTERNAL_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)
if [ -z "$EXTERNAL_IP" ]; then
  EXTERNAL_IP=$(hostname -I | awk '{print $1}')
fi

# Información de acceso
echo ""
echo "======================================"
echo "✓ Setup completado exitosamente"
echo "======================================"
echo ""
echo "Acceso a la aplicación:"
echo "  Frontend:          http://$EXTERNAL_IP:8080"
echo "  Auth Service:      http://$EXTERNAL_IP:3000"
echo "  Order Service:     http://$EXTERNAL_IP:3001"
echo "  RabbitMQ (AMQP):   $EXTERNAL_IP:5672"
echo "  RabbitMQ UI:       http://$EXTERNAL_IP:15672"
echo ""
echo "Comandos útiles:"
echo "  Ver servicios:     docker-compose ps"
echo "  Ver logs (todos):  docker-compose logs -f"
echo "  Ver logs (uno):    docker-compose logs -f <servicio>"
echo "  Detener:           docker-compose down"
echo "  Reiniciar:         docker-compose restart"
echo ""
echo "Log completo: $LOG_FILE"
echo "======================================"
