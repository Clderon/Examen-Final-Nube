variable "aws_region" {
  type        = string
  description = "Región de AWS"
  default     = "us-east-1"
}

variable "aws_profile" {
  type        = string
  description = "Perfil de AWS a usar"
  default     = "default"
}

variable "instance_type" {
  type        = string
  description = "Tipo de instancia EC2"
  default     = "t3.medium"
}

variable "allowed_ssh_cidrs" {
  type        = list(string)
  description = "CIDR blocks permitidos para SSH"
  default     = ["0.0.0.0/0"]
}

variable "app_name" {
  type        = string
  description = "Nombre de la aplicación"
  default     = "examen-final-nube"
}

variable "environment" {
  type        = string
  description = "Ambiente"
  default     = "dev"
}

variable "repository_url" {
  type        = string
  description = "URL del repositorio Git (usar HTTPS o SSH)"
  default     = "https://github.com/luismiguelgilbert/Trabajo-Final-Nube.git"
}

variable "repository_branch" {
  type        = string
  description = "Rama del repositorio"
  default     = "main"
}
