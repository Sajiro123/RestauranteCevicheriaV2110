/*
  # Create usuario table for authentication

  1. New Tables
    - `usuario` - User authentication table
      - `idusuario` (serial, primary key)
      - `username` (varchar, unique)
      - `password` (varchar)
      - `nombre` (varchar)
      - `email` (varchar, optional)
      - `rol` (varchar, default 'user')
      - `estado` (integer, default 1 - active)
      - `deleted` (timestamp, null for active records)
      - `created_at` (timestamp, default now)

  2. Security
    - Enable RLS on `usuario` table
    - Add policies for authenticated users to read their own data
    - Add policy for public login verification

  3. Sample Data
    - Insert default admin user for testing
*/

-- Create usuario table
CREATE TABLE IF NOT EXISTS usuario (
  idusuario SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  email VARCHAR(100),
  rol VARCHAR(20) DEFAULT 'user',
  estado INTEGER DEFAULT 1,
  deleted TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE usuario ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read own data"
  ON usuario FOR SELECT
  TO authenticated
  USING (auth.uid()::text = idusuario::text);

CREATE POLICY "Public can verify login credentials"
  ON usuario FOR SELECT
  TO anon, authenticated
  USING (estado = 1 AND deleted IS NULL);

CREATE POLICY "Authenticated users can manage users"
  ON usuario FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Insert sample admin user
INSERT INTO usuario (username, password, nombre, email, rol, estado) VALUES
('admin', 'admin123', 'Administrador', 'admin@restaurant.com', 'admin', 1),
('mesero1', 'mesero123', 'Juan Pérez', 'juan@restaurant.com', 'mesero', 1),
('cajero1', 'cajero123', 'María García', 'maria@restaurant.com', 'cajero', 1)
ON CONFLICT (username) DO NOTHING;