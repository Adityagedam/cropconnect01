CREATE DATABASE IF NOT EXISTS cropconnect
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE cropconnect;

CREATE TABLE IF NOT EXISTS sensor_readings (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  device_id VARCHAR(80) NOT NULL,
  soil_moisture DECIMAL(6,2) NULL,
  humidity DECIMAL(6,2) NULL,
  temperature DECIMAL(6,2) NULL,
  ph DECIMAL(5,2) NULL,
  nitrogen DECIMAL(8,2) NULL,
  phosphorus DECIMAL(8,2) NULL,
  potassium DECIMAL(8,2) NULL,
  raw_payload JSON NULL,
  recorded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_device_recorded_at (device_id, recorded_at),
  INDEX idx_recorded_at (recorded_at)
);

CREATE TABLE IF NOT EXISTS devices (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  device_id VARCHAR(80) NOT NULL UNIQUE,
  display_name VARCHAR(120) NULL,
  location VARCHAR(160) NULL,
  api_key VARCHAR(120) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

INSERT INTO devices (device_id, display_name, location, api_key)
VALUES ('sim-node-1', 'CropConnect Prototype Node', 'Pune, Maharashtra', 'dev-secret-key')
ON DUPLICATE KEY UPDATE
  display_name = VALUES(display_name),
  location = VALUES(location);
