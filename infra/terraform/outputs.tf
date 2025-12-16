output "instance_id" {
  description = "ID de la instancia EC2"
  value       = aws_instance.app_server.id
}

output "instance_public_ip" {
  description = "IP pública de la instancia EC2"
  value       = aws_instance.app_server.public_ip
}

output "instance_public_dns" {
  description = "DNS público de la instancia EC2"
  value       = aws_instance.app_server.public_dns
}

output "security_group_id" {
  description = "ID del security group"
  value       = aws_security_group.app_sg.id
}

output "private_key_path" {
  description = "Ruta a la clave privada generada"
  value       = local_file.app_private_key.filename
}

output "ssh_command" {
  description = "Comando para conectarse via SSH a la instancia"
  value       = "ssh -i ${local_file.app_private_key.filename} ubuntu@${aws_instance.app_server.public_ip}"
}

output "frontend_url" {
  description = "URL de acceso a la aplicación (Frontend en puerto 8080)"
  value       = "http://${aws_instance.app_server.public_ip}:8080"
}

output "auth_service_url" {
  description = "URL de la API Auth Service"
  value       = "http://${aws_instance.app_server.public_ip}:3000"
}

output "order_service_url" {
  description = "URL de la API Order Service"
  value       = "http://${aws_instance.app_server.public_ip}:3001"
}

output "rabbitmq_management_url" {
  description = "URL de RabbitMQ Management UI"
  value       = "http://${aws_instance.app_server.public_ip}:15672"
}

output "rabbitmq_credentials" {
  description = "Credenciales para RabbitMQ"
  value       = "usuario: guest, contraseña: guest"
  sensitive   = true
}

output "docker_compose_commands" {
  description = "Comandos útiles de Docker Compose"
  value       = <<-EOT
ssh -i ${local_file.app_private_key.filename} ubuntu@${aws_instance.app_server.public_ip}

# Una vez conectado:
cd /opt/examen-final-nube/Examen-Final-Nube

# Ver estado de servicios
docker-compose ps

# Ver logs
docker-compose logs -f

# Logs específico de un servicio
docker-compose logs frontend
docker-compose logs order-service

# Detener
docker-compose down

# Reiniciar
docker-compose restart
  EOT
}
