-- ==============================================================================
-- MIGRACIÓN: Agregar columna es_chatbot a tabla pedido
-- FECHA: 2026-10-14
-- DESCRIPCIÓN: Distingue los pedidos originados desde el Chatbot de WhatsApp
--              de los pedidos de delivery ingresados manualmente en el POS.
--              Permite que la alerta visual y sonora en caja solo suene para
--              pedidos del Chatbot.
-- ==============================================================================

-- 1. Agregar columna es_chatbot a la tabla pedido
ALTER TABLE pedido 
ADD COLUMN IF NOT EXISTS es_chatbot BOOLEAN NOT NULL DEFAULT false;

-- 2. Índice condicional para optimizar las consultas y filtros de pedidos Chatbot
CREATE INDEX IF NOT EXISTS idx_pedido_es_chatbot 
ON pedido (es_chatbot) 
WHERE es_chatbot = true;

-- 3. Documentación del campo
COMMENT ON COLUMN pedido.es_chatbot IS 'Indica si el pedido fue generado automáticamente desde el Chatbot de WhatsApp';

-- 4. Marcar pedidos históricos generados por chatbot mediante el comentario
UPDATE pedido 
SET es_chatbot = true 
WHERE comentario LIKE '%[PEDIDO WHATSAPP DELIVERY]%' 
   OR comentario LIKE '%WHATSAPP%';
