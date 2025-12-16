-- Script de inicialización completo para MySQL
-- Crea ambas bases de datos y usuarios
-- Nota: authuser ya se crea con MYSQL_USER en docker-compose

CREATE DATABASE IF NOT EXISTS ordersdb;

-- Crear usuario para order-service (authuser ya existe por MYSQL_USER)
-- Usamos un procedimiento para evitar errores si el usuario ya existe
CREATE USER IF NOT EXISTS 'orderuser'@'%' IDENTIFIED BY 'orderpass123';
GRANT ALL PRIVILEGES ON ordersdb.* TO 'orderuser'@'%';

FLUSH PRIVILEGES;

