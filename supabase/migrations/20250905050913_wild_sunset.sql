/*
  # Restaurant Management System Schema

  1. New Tables
    - `mesa` - Restaurant tables management
    - `categoria` - Food categories  
    - `producto` - Food products/dishes
    - `toppings` - Additional toppings for dishes
    - `pedido` - Orders
    - `pedidodetalle` - Order details
    - `apertura_caja` - Cash register opening/closing
    - `categoriagastos` - Expense categories
    - `gastos` - Expenses

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage restaurant data
    - Public access for reading basic data (menu items, categories)

  3. Sample Data
    - Insert default tables, categories, products, and expense categories
*/

-- Create tables
CREATE TABLE IF NOT EXISTS mesa (
  idmesa SERIAL PRIMARY KEY,
  numero VARCHAR(10) NOT NULL,
  estado INTEGER DEFAULT 0,
  deleted TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categoria (
  idcategoria SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  deleted TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS producto (
  idproducto SERIAL PRIMARY KEY,
  nombre VARCHAR(200) NOT NULL,
  preciounitario DECIMAL(10,2),
  idcategoria INTEGER REFERENCES categoria(idcategoria),
  acronimo VARCHAR(10),
  deleted TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS toppings (
  idtopings SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  deleted TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pedido (
  idpedido SERIAL PRIMARY KEY,
  cliente VARCHAR(200),
  mesa INTEGER DEFAULT 0,
  total DECIMAL(10,2) DEFAULT 0,
  total_pedidos INTEGER DEFAULT 0,
  estado INTEGER DEFAULT 1,
  fecha DATE DEFAULT CURRENT_DATE,
  comentario TEXT,
  yape DECIMAL(10,2) DEFAULT 0,
  plin DECIMAL(10,2) DEFAULT 0,
  visa DECIMAL(10,2) DEFAULT 0,
  efectivo DECIMAL(10,2) DEFAULT 0,
  descuento DECIMAL(10,2) DEFAULT 0,
  motivo TEXT,
  responsable VARCHAR(100),
  deleted INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pedidodetalle (
  idpedidodetalle SERIAL PRIMARY KEY,
  idpedido INTEGER REFERENCES pedido(idpedido),
  idproducto INTEGER REFERENCES producto(idproducto),
  cantidad INTEGER DEFAULT 1,
  "precioU" DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) DEFAULT 0,
  lugarpedido INTEGER DEFAULT 0,
  toppings VARCHAR(500),
  pedido_estado INTEGER DEFAULT 1,
  deleted INTEGER DEFAULT 0,
  id_created_at INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS apertura_caja (
  idapertura SERIAL PRIMARY KEY,
  fecha DATE DEFAULT CURRENT_DATE,
  total DECIMAL(10,2) DEFAULT 0,
  estado INTEGER DEFAULT 1,
  responsable VARCHAR(100),
  id_created_at INTEGER DEFAULT 1,
  deleted TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categoriagastos (
  idcategoriagastos SERIAL PRIMARY KEY,
  descripcion VARCHAR(200) NOT NULL,
  deleted TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gastos (
  idgastos SERIAL PRIMARY KEY,
  descripcion VARCHAR(500) NOT NULL,
  idcategoriagastos INTEGER REFERENCES categoriagastos(idcategoriagastos),
  monto DECIMAL(10,2) NOT NULL,
  fecha DATE DEFAULT CURRENT_DATE,
  notas TEXT,
  id_created_at INTEGER DEFAULT 1,
  deleted INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE mesa ENABLE ROW LEVEL SECURITY;
ALTER TABLE categoria ENABLE ROW LEVEL SECURITY;
ALTER TABLE producto ENABLE ROW LEVEL SECURITY;
ALTER TABLE toppings ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedido ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidodetalle ENABLE ROW LEVEL SECURITY;
ALTER TABLE apertura_caja ENABLE ROW LEVEL SECURITY;
ALTER TABLE categoriagastos ENABLE ROW LEVEL SECURITY;
ALTER TABLE gastos ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access (menu items, categories)
CREATE POLICY "Public can read categories"
  ON categoria FOR SELECT
  TO anon, authenticated
  USING (deleted IS NULL);

CREATE POLICY "Public can read products"
  ON producto FOR SELECT
  TO anon, authenticated
  USING (deleted IS NULL);

CREATE POLICY "Public can read toppings"
  ON toppings FOR SELECT
  TO anon, authenticated
  USING (deleted IS NULL);

-- Create policies for authenticated users (full CRUD)
CREATE POLICY "Authenticated users can manage mesas"
  ON mesa FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can manage categories"
  ON categoria FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can manage products"
  ON producto FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can manage toppings"
  ON toppings FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can manage pedidos"
  ON pedido FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can manage pedidodetalle"
  ON pedidodetalle FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can manage apertura_caja"
  ON apertura_caja FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can manage categoriagastos"
  ON categoriagastos FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can manage gastos"
  ON gastos FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Insert sample data for mesas (tables 1-20)
INSERT INTO mesa (numero, estado) VALUES
('1', 0), ('2', 0), ('3', 0), ('4', 0), ('5', 0),
('6', 0), ('7', 0), ('8', 0), ('9', 0), ('10', 0),
('11', 0), ('12', 0), ('13', 0), ('14', 0), ('15', 0),
('16', 0), ('17', 0), ('18', 0), ('19', 0), ('20', 0)
ON CONFLICT DO NOTHING;

-- Insert sample categories
INSERT INTO categoria (nombre) VALUES
('Ceviches'),
('Bebidas'),
('Platos Calientes'),
('Entradas'),
('Postres'),
('Ensaladas')
ON CONFLICT DO NOTHING;

-- Insert sample products
INSERT INTO producto (nombre, preciounitario, idcategoria, acronimo) VALUES
('Ceviche Clásico', 25.00, 1, 'CC'),
('Ceviche Mixto', 30.00, 1, 'CM'),
('Tiradito', 28.00, 1, 'TIR'),
('Inca Kola', 5.00, 2, 'IK'),
('Chicha Morada', 4.00, 2, 'CHM'),
('Arroz con Pollo', 18.00, 3, 'ACP'),
('Lomo Saltado', 22.00, 3, 'LS'),
('Causa Limeña', 15.00, 4, 'CL'),
('Papa Rellena', 12.00, 4, 'PR'),
('Suspiro Limeño', 8.00, 5, 'SL'),
('Ensalada Mixta', 10.00, 6, 'EM')
ON CONFLICT DO NOTHING;

-- Insert sample toppings
INSERT INTO toppings (nombre) VALUES
('Extra Limón'),
('Ají Extra'),
('Sin Cebolla'),
('Extra Cilantro'),
('Sin Ají'),
('Extra Camote'),
('Sin Culantro')
ON CONFLICT DO NOTHING;

-- Insert expense categories
INSERT INTO categoriagastos (descripcion) VALUES
('Ingredientes'),
('Servicios'),
('Limpieza'),
('Transporte'),
('Otros Gastos'),
('Mantenimiento')
ON CONFLICT DO NOTHING;