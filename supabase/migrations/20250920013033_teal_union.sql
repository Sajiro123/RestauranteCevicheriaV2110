/*
  # Create vales_delivery table for delivery vouchers

  1. New Tables
    - `vales_delivery` - Delivery vouchers management
      - `id` (serial, primary key)
      - `codigo` (varchar, unique voucher code)
      - `descripcion` (text, voucher description)
      - `estado` (integer, default 1 - active)
      - `fecha_creacion` (timestamp, default now)
      - `fecha_uso` (timestamp, null until used)
      - `fecha_vencimiento` (timestamp, expiration date)
      - `idpersona` (integer, foreign key to persona)

  2. Security
    - Enable RLS on `vales_delivery` table
    - Add policies for authenticated users to manage vouchers

  3. Functions
    - Create function to generate unique voucher codes
*/

-- Create vales_delivery table
CREATE TABLE IF NOT EXISTS vales_delivery (
  id SERIAL PRIMARY KEY,
  codigo VARCHAR(50) UNIQUE NOT NULL,
  descripcion TEXT,
  estado INTEGER DEFAULT 1,
  fecha_creacion TIMESTAMP DEFAULT NOW(),
  fecha_uso TIMESTAMP NULL,
  fecha_vencimiento TIMESTAMP,
  idpersona INTEGER REFERENCES persona(idpersona),
  deleted TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE vales_delivery ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Authenticated users can manage vales_delivery"
  ON vales_delivery FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create function to generate unique voucher codes
CREATE OR REPLACE FUNCTION generate_voucher_code()
RETURNS VARCHAR(50) AS $$
DECLARE
  new_code VARCHAR(50);
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate a random 8-character code with letters and numbers
    new_code := 'VD' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM vales_delivery WHERE codigo = new_code) INTO code_exists;
    
    -- If code doesn't exist, exit loop
    IF NOT code_exists THEN
      EXIT;
    END IF;
  END LOOP;
  
  RETURN new_code;
END;
$$ LANGUAGE plpgsql;