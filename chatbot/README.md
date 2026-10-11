# 🤖 Chatbot de WhatsApp - El Puerto Cevichero de Willy
### Módulo de Recepción Automática de Pedidos Delivery y Alerta en POS Angular

Este directorio contiene el código y la arquitectura del Chatbot Oficial de WhatsApp conectado a la API Cloud de Meta, Supabase y el sistema POS Angular (`RestauranteCevicheriav2`).

---

## 📁 Archivos
- `chatbot/index.ts` : Código fuente completo de la Edge Function (Deno + TypeScript).
- `supabase/functions/whatsapp-webhook/index.ts` : Mismo archivo sincronizado para despliegues con Supabase CLI.

---

## 🔄 Flujo Completo de Funcionamiento (Paso a Paso)

```
[ Cliente en WhatsApp ]
       │
       ▼ (Escribe "Hola")
[ Meta WhatsApp Cloud API ]
       │
       ▼ (Webhook POST HTTPS)
[ Supabase Edge Function (Deno) ]
       │
       ├─► 1. ¿Tiene nombre registrado?
       │      ├─ No ──► Solicita su nombre y lo guarda.
       │      └─ Sí ──► Saluda por su nombre y muestra Menú Interactivo.
       │
       ├─► 2. Catálogo Interactivo (Listas y Botones WhatsApp)
       │      ├─ Ver Tríos, Dúos, Personales, Piqueos, Bebidas.
       │      └─ Selecciona plato y cantidad ──► Se acumula en carrito (wa_sesiones).
       │
       ├─► 3. Método de Pago (Contra entrega)
       │      ├─ Yape / Plin
       │      └─ Efectivo (pregunta con cuánto paga para calcular vuelto).
       │
       ├─► 4. Ubicación de Entrega
       │      ├─ Ubicación GPS nativa de WhatsApp (latitud / longitud).
       │      └─ O dirección escrita con referencia.
       │
       ▼ 5. Inserción Transaccional en Base de Datos
[ Supabase PostgreSQL: RPC insertar_pedido_y_detalles ]
       ├─ mesa = 0 (DELIVERY)
       ├─ idmozo = 1 (Mozo Delivery)
       ├─ lugarpedido = '1' (Para llevar)
       ├─ estado = '1' (PENDIENTE / NO COBRADO - El cajero o repartidor cobra)
       ├─ telefono = '51XXXXXXXXX'
       ├─ latitud / longitud / direccion / metodo_pago / paga_con
       └─ comentario = '[PEDIDO WHATSAPP DELIVERY] ...'
       │
       ▼ 6. Supabase Realtime (postgres_changes INSERT en tabla pedido)
[ Sistema Web POS Angular (RestauranteCevicheriav2) ]
       ├─► Suena alarma de campana en bucle continuo (Web Audio API).
       ├─► Abre MODAL ROJO URGENTE de Alerta en pantalla completa.
       ├─► Actualiza automáticamente la lista de "Pedidos Activos en Cocina" (ListarPedidos).
       │
       ▼ 7. Cajero presiona: "🚨 Atender Pedido e Imprimir Comanda"
       ├─► Silencia la alarma sonora.
       ├─► Selecciona automáticamente la mesa de Delivery (mesa 0).
       ├─► Carga los platos en la cuenta lateral.
       └─► Abre directamente el diálogo de IMPRESIÓN DEL TICKET DE COCINA (Comanda).
```

---

## 🗄️ Tablas en la Base de Datos (Supabase)

### 1. `wa_sesiones` (Gestión de Estado de Conversación)
Guarda la sesión y el carrito de cada cliente:
- `telefono`: Clave primaria (`51XXXXXXXXX`).
- `nombre`: Nombre del cliente.
- `estado`: Estado actual del bot (`inicio`, `esperando_nombre`, `menu`, `esperando_cantidad`, `esperando_pago`, `esperando_ubicacion`, `esperando_monto_efectivo`).
- `carrito`: Array JSONB con los platos agregados `[{ id, nombre, precio, cantidad, total }]`.
- `datos`: Objeto JSONB temporal (método de pago, con cuánto paga, etc.).
- `modo`: `'bot'` (automático) o `'humano'` (cuando solicita hablar con asesor).

### 2. `wa_mensajes` (Auditoría y Desduplicación)
Registra todos los mensajes entrantes y salientes para evitar procesar mensajes duplicados que Meta pueda reenviar.

### 3. `pedido` y `pedidodetalle`
Tablas nativas del restaurante donde el pedido entra como un pedido delivery real (`mesa: 0, estado: '1'`).

---

## 🚀 Despliegue de la Edge Function

Para actualizar la función en vivo en Supabase:

```bash
# Copiar al directorio de supabase si hiciste cambios en chatbot/index.ts:
cp chatbot/index.ts supabase/functions/whatsapp-webhook/index.ts

# Desplegar a Supabase:
npx supabase functions deploy whatsapp-webhook --no-verify-jwt
```

---

## 🔑 Variables de Entorno en Supabase
Configuradas en Supabase Dashboard > Edge Functions > `whatsapp-webhook` > Secrets:
- `WHATSAPP_ACCESS_TOKEN`: Token permanente de System User de Meta Cloud API.
- `WHATSAPP_PHONE_NUMBER_ID`: `1317677311436064` (ID de teléfono del restaurante).
- `WHATSAPP_VERIFY_TOKEN`: `cevicheria_willy_seguro_2026` (Token para verificación del Webhook en Meta).
- `SUPABASE_URL`: URL del proyecto Supabase.
- `SUPABASE_SERVICE_ROLE_KEY`: Service role secret para inserciones automáticas sin restricciones de RLS.
