CREATE DATABASE IF NOT EXISTS farmers
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE farmers;

CREATE TABLE IF NOT EXISTS `sign-in` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `email` VARCHAR(255) NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(30) NULL,
  `name` VARCHAR(120) NULL,
  `state` VARCHAR(120) NULL,
  `location` VARCHAR(255) NULL,
  `land size` DECIMAL(10,2) NULL,
  `location_type` VARCHAR(20) NULL,
  `city` VARCHAR(120) NULL,
  `village` VARCHAR(120) NULL,
  `sensor_device_id` VARCHAR(80) NULL,
  `sensors` VARCHAR(20) NULL,
  `pumps` VARCHAR(20) NULL,
  `sensor_setup_complete` TINYINT(1) NOT NULL DEFAULT 0,
  `sensor_setup_status` VARCHAR(40) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_sign_in_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `reading` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `N` DECIMAL(8,2) NULL,
  `P` DECIMAL(8,2) NULL,
  `K` DECIMAL(8,2) NULL,
  `ph` DECIMAL(5,2) NULL,
  `soil moisture` DECIMAL(6,2) NULL,
  `humidity` DECIMAL(6,2) NULL,
  `temperature` DECIMAL(6,2) NULL,
  `time` TIME NULL,
  `date` DATE NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_reading_date_time` (`date`, `time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
