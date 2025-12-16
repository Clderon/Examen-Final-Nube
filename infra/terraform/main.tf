terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
    local = {
      source  = "hashicorp/local"
      version = "~> 2.0"
    }
  }
}

provider "local" {}

# Generar clave privada TLS
resource "tls_private_key" "app_key" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

# Crear key pair en AWS usando la clave generada
resource "aws_key_pair" "app_key" {
  key_name   = "${var.app_name}-key-${var.environment}"
  public_key = tls_private_key.app_key.public_key_openssh

  tags = {
    Name        = "${var.app_name}-key"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# Guardar clave privada localmente
resource "local_file" "app_private_key" {
  filename        = "${path.module}/${var.app_name}-key.pem"
  content         = tls_private_key.app_key.private_key_pem
  file_permission = "0600"
}

# Security Group
resource "aws_security_group" "app_sg" {
  name        = "${var.app_name}-sg-${var.environment}"
  description = "Security group para Docker Compose en EC2"

  # SSH
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = var.allowed_ssh_cidrs
  }

  # Frontend (Docker Compose puerto 8080)
  ingress {
    from_port   = 8080
    to_port     = 8080
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Auth Service (puerto 3000)
  ingress {
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Order Service (puerto 3001)
  ingress {
    from_port   = 3001
    to_port     = 3001
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # RabbitMQ AMQP (puerto 5672)
  ingress {
    from_port   = 5672
    to_port     = 5672
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # RabbitMQ Management (puerto 15672)
  ingress {
    from_port   = 15672
    to_port     = 15672
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Egress
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${var.app_name}-sg"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# Data source para AMI Ubuntu 22.04
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# Instance IAM role (mínimo para EC2)
resource "aws_iam_role" "app_role" {
  name = "${var.app_name}-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "${var.app_name}-role"
    Environment = var.environment
  }
}

resource "aws_iam_instance_profile" "app_profile" {
  name = "${var.app_name}-profile-${var.environment}"
  role = aws_iam_role.app_role.name
}

# EC2 Instance
resource "aws_instance" "app_server" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = var.instance_type
  key_name      = aws_key_pair.app_key.key_name

  iam_instance_profile = aws_iam_instance_profile.app_profile.name
  security_groups      = [aws_security_group.app_sg.name]

  # Root volume
  root_block_device {
    volume_type           = "gp3"
    volume_size           = 30
    delete_on_termination = true
  }

  # User data script para instalar Docker Compose y desplegar la aplicación
  user_data = base64encode(file("${path.module}/user-data.sh"))

  tags = {
    Name        = "${var.app_name}-server"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }

  monitoring = true

  depends_on = [
    aws_iam_role.app_role,
    aws_key_pair.app_key,
    local_file.app_private_key
  ]
}
