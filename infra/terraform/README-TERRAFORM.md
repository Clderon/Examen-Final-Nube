# Configuración mínima de Terraform para levantar la aplicación en AWS EC2 + Docker Compose

## Archivos

- **variables.tf**: Parámetros configurables (región, tipo de instancia, key pair, etc.)
- **main.tf**: Recursos de EC2, Security Group, IAM role
- **outputs.tf**: Información de salida (IP, DNS, URLs de servicios, comandos Docker Compose)
- **user-data.sh**: Script de bootstrap que instala Docker y levanta `docker-compose`

## Requisitos previos

1. Cuenta de AWS con credenciales configuradas (`~/.aws/credentials` o `aws configure`)
2. Una key pair creada en AWS en la región que uses
3. Terraform instalado (v1.0+)

## Pasos para desplegar

### 1. Configurar variables (opcional, si no usas los defaults)

Crear archivo `terraform.tfvars`:

```hcl
aws_region        = "us-east-1"
aws_profile        = "default"
instance_type      = "t3.medium"
key_pair_name      = "tu-key-pair-name"
allowed_ssh_cidrs  = ["tu-ip-publica/32"]  # Restringe SSH a tu IP
```

### 2. Inicializar Terraform

```bash
cd infra/terraform
terraform init
```

### 3. Planificar despliegue

```bash
terraform plan
```

### 4. Aplicar configuración

```bash
terraform apply
```

Terraform te pedirá confirmación. Escribe `yes` y espera ~2-3 minutos a que complete:
- Crea instancia EC2 (t3.medium recomendado)
- Instala Docker y Docker Compose
- Clona repositorio
- Levanta todo con `docker-compose up -d`

### 5. Acceder a la aplicación

Al terminar, Terraform muestra outputs con las URLs:

```bash
# Ver frontend URL
terraform output frontend_url
# Resultado: http://54.123.45.67:8080

# Abrirlo en navegador
curl $(terraform output frontend_url)
```

**URLs de los servicios:**
- **Frontend**: `terraform output frontend_url` (puerto 8080)
- **Auth Service**: `terraform output auth_service_url` (puerto 3000)
- **Order Service**: `terraform output order_service_url` (puerto 3001)
- **RabbitMQ Management**: `terraform output rabbitmq_management_url` (puerto 15672)

### 6. Verificar estado

Conectarse a la instancia via SSH:

```bash
# Obtener comando SSH automático
terraform output ssh_command

# Ejecutar
ssh -i ~/.ssh/tu-key-pair-name.pem ubuntu@54.123.45.67

# Dentro de la instancia:
cd /opt/examen-final-nube/Examen-Final-Nube

# Ver estado de servicios
docker-compose ps

# Ver logs
docker-compose logs -f

# Logs de un servicio específico
docker-compose logs frontend
docker-compose logs order-service
docker-compose logs rabbitmq
```

### 7. Destruir recursos (cuando termines)

```bash
terraform destroy
```

Escribe `yes` para confirmar. Esto elimina:
- Instancia EC2
- Security group
- IAM role/instance profile

## Notas

- **Docker Compose**: Se levanta automáticamente al iniciar la instancia via `user-data.sh`.
- **Puertos abiertos**:
  - 22 (SSH)
  - 8080 (Frontend)
  - 3000 (Auth Service)
  - 3001 (Order Service)
  - 5672 (RabbitMQ AMQP)
  - 15672 (RabbitMQ Management UI)
- **Logs**: Disponibles en `/var/log/docker-setup.log` en la instancia EC2.
- **Repositorio**: Se clona en `/opt/examen-final-nube/`.

## Personalización

### Cambiar tipo de instancia

```bash
terraform apply -var="instance_type=t3.large"
```

### Cambiar región

```bash
terraform apply -var="aws_region=eu-west-1"
```

### Permitir SSH solo desde tu IP

```bash
terraform apply -var='allowed_ssh_cidrs=["203.0.113.45/32"]'
```

## Troubleshooting

- **Error "Key pair does not exist"**: Crea la key pair en AWS Console antes.
- **Timeout conectando a frontend (8080)**: La instancia tarda ~2-3 min en startup; espera un poco más y verifica logs.
- **docker-compose no responde**: Verifica logs con:
  ```bash
  ssh -i ~/.ssh/tu-key-pair-name.pem ubuntu@IP
  tail -f /var/log/docker-setup.log
  docker-compose ps
  ```
- **Puertos no accesibles**: Verifica que el Security Group tiene abiertos los puertos (revisa en AWS Console).

## Próximos pasos

1. Integrar MySQL con `order-service` para persistencia real (actualmente en memoria).
2. Crear schema de base de datos en el bootstrap.
3. Configurar CI/CD para automatizar deploys.
4. Considerar ECS/Fargate para producción en lugar de EC2 directo.

