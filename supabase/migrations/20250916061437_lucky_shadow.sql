/*
  # Create persona and perfil tables for staff management

  1. New Tables
    - `perfil` - Staff profiles/roles
      - `idperfil` (serial, primary key)
      - `nombre` (varchar)
      - `descripcion` (text, optional)
      - `created_at` (timestamp, default now)
    
    - `persona` - Staff/personnel management
      - `idpersona` (serial, primary key)
      - `nombres` (varchar)
      - `apellidopat` (varchar)
      - `apellidomat` (varchar)
      - `direccion` (varchar, optional)
      - `referencia` (text, optional)
      - `cumpleanos` (date, optional)
      - `idperfil` (integer, foreign key to perfil)
      - `idestado` (integer, default 1 - active)
      - `created_at` (timestamp, default now)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage staff data

  3. Sample Data
    - Insert default profiles (roles)
    - Insert sample staff members
*/

-- Create perfil table
CREATE TABLE IF NOT EXISTS perfil (
  idperfil SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  descripcion TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create persona table
CREATE TABLE IF NOT EXISTS persona (
  idpersona SERIAL PRIMARY KEY,
  nombres VARCHAR(200) NOT NULL,
  apellidopat VARCHAR(100) NOT NULL,
  apellidomat VARCHAR(100) NOT NULL,
  direccion VARCHAR(300),
  referencia TEXT,
  cumpleanos DATE,
  idperfil INTEGER REFERENCES perfil(idperfil),
  idestado INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE perfil ENABLE ROW LEVEL SECURITY;
ALTER TABLE persona ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Authenticated users can manage perfiles"
  ON perfil FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can manage personal"
  ON persona FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Insert sample profiles
INSERT INTO perfil (nombre, descripcion) VALUES
('Administrador', 'Acceso completo al sistema'),
('Mesero', 'Gestión de pedidos y atención al cliente'),
('Cajero', 'Manejo de caja y cobros'),
('Cocinero', 'Preparación de alimentos'),
('Supervisor', 'Supervisión de operaciones')
ON CONFLICT DO NOTHING;

-- Insert sample staff members
INSERT INTO persona (nombres, apellidopat, apellidomat, direccion, idperfil, idestado) VALUES
('Juan Carlos', 'Pérez', 'García', 'Av. Principal 123', 2, 1),
('María Elena', 'González', 'López', 'Jr. Los Olivos 456', 3, 1),
('Carlos Alberto', 'Rodríguez', 'Martínez', 'Calle Las Flores 789', 4, 1),
('Ana Sofía', 'Hernández', 'Vargas', 'Av. Central 321', 2, 1)
ON CONFLICT DO NOTHING;