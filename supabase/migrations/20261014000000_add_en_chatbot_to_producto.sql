-- ==============================================================================
-- MIGRACIÓN: Agregar columna en_chatbot a tabla producto
-- FECHA: 2026-10-14
-- DESCRIPCIÓN: Permite habilitar o deshabilitar platos específicos para venta
--              y consulta a través del Chatbot de WhatsApp.
-- ==============================================================================

-- 1. Agregar columna en_chatbot si no existe
ALTER TABLE producto 
ADD COLUMN IF NOT EXISTS en_chatbot BOOLEAN NOT NULL DEFAULT false;

-- 2. Índice condicional para optimizar las consultas rápidas del Chatbot
CREATE INDEX IF NOT EXISTS idx_producto_en_chatbot 
ON producto (en_chatbot) 
WHERE en_chatbot = true AND deleted IS NULL;

-- 3. Documentación del campo
COMMENT ON COLUMN producto.en_chatbot IS 'Indica si el plato está disponible para pedidos por el Chatbot de WhatsApp';

-- 4. (Opcional recomendado) Activar inicialmente los 7 platos insignia para que el bot tenga carta activa de inmediato
UPDATE producto 
SET en_chatbot = true 
WHERE idproducto IN (8, 104, 3, 2, 13, 61, 74) 
  AND deleted IS NULL;
