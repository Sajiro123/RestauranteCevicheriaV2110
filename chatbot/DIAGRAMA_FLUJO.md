# 🔄 Diagrama de Flujo del Chatbot de WhatsApp
> **Última sincronización automática:** 2026-10-12 17:06:07  
> **Archivo origen:** `chatbot/index.ts` (analizado automáticamente)

Este diagrama representa con exactitud la lógica activa en el código del chatbot. Se actualiza de forma automática cada vez que se realizan modificaciones en `chatbot/index.ts`.

---

## 🗺️ Flujograma Activo

```mermaid
flowchart TD
    Inicio([👤 Cliente envía mensaje por WhatsApp]) --> ComandosCheck{¿Es comando especial?<br/>hola / menu / cancelar / asesor}

    %% Comandos Universales
    ComandosCheck -- "asesor / humano" --> ModoHumano[👨‍💼 Pausar Bot y activar Modo Humano<br/>Sesión: modo = 'humano'<br/>Bot guarda silencio]
    ComandosCheck -- "cancelar / reiniciar" --> ResetSesion[🔄 Reiniciar Carrito<br/>Sesión: estado = 'menu', carrito = []]

    %% Validación de Nombre
    ComandosCheck -- "Mensaje normal" --> CheckNombre{¿El cliente ya tiene<br/>nombre guardado?}
    CheckNombre -- No o estado='pedir_nombre' --> PedirNombre[📝 Bot solicita Nombre y Apellido<br/>Estado: 'pedir_nombre']
    PedirNombre --> ClienteEnviaNombre[Cliente escribe su nombre<br/>Ej: 'Alex Gomez']
    ClienteEnviaNombre --> GuardarNombre[💾 Guarda nombre en wa_sesiones<br/>Envía: '¡Mucho gusto, Alex! 🙌']

    %% Menú Principal
    GuardarNombre --> MenuPrincipal[🍽️ Menú Principal Interactivo<br/>Estado: 'menu']
    CheckNombre -- Sí --> MenuPrincipal
    ResetSesion --> MenuPrincipal

    MenuPrincipal --> OpcionesMenu{¿Qué botón presiona?}

    %% Opción 1: Los Más Pedidos
    OpcionesMenu -- "⭐ Los Más Pedidos" --> Destacados["📋 Lista de Especialidades:<br/>• Arroz con Mariscos Trio (S/ 35.00)<br/>• Chaufa Trio Ceviche Chicharron (S/ 35.00)<br/>• Arroz con Marisco Duo (S/ 25.00)<br/>• Chicharron de Pescado Duo (S/ 25.00)<br/>• Ceviche Clasico Personal (S/ 20.00)<br/>• Leche de Tigre a lo Macho (S/ 18.00)<br/>• Chilcano de Pescado (S/ 12.00)<br/>• Chicha Morada Jarra (S/ 15.00)<br/>• Gaseosa 1/2 Litro (S/ 6.00)"]

    %% Opción 2: Toda la Carta
    OpcionesMenu -- "📖 Toda la Carta" --> Categorias["📂 Lista de Categorías:<br/>1. Duos<br/>2. Personal<br/>3. Trio<br/>4. Piqueos<br/>5. Bebidas"]
    Categorias --> SelCategoria[Cliente elige una categoría]
    SelCategoria --> PlatosCategoria[Consulta base de datos 'producto'<br/>Muestra platos de esa categoría]

    %% Opción 3: Hablar con Asesor
    OpcionesMenu -- "👨‍💼 Hablar con Asesor" --> ModoHumano

    %% Selección de Plato y Cantidad
    Destacados --> ElegirPlato[Cliente selecciona un plato]
    PlatosCategoria --> ElegirPlato

    ElegirPlato --> PedirCantidad[🔢 Pregunta Cantidad<br/>Estado: 'seleccion_cantidad'<br/>Botones: 1 porción / 2 porciones / 3 porciones<br/>O escribe número por texto]

    PedirCantidad --> AgregarCarrito[🛒 Agrega al Carrito en wa_sesiones<br/>Calcula subtotal: cantidad x precio<br/>Estado: 'en_carrito']

    AgregarCarrito --> OpcionesCarrito{Botones en Carrito}
    OpcionesCarrito -- "➕ Seguir pidiendo" --> MenuPrincipal
    OpcionesCarrito -- "🛍️ Finalizar pedido" --> MetodoPago["💰 Selección de Método de Pago<br/>Estado: 'seleccion_pago'<br/>Opciones:<br/>• Yape<br/>• Plin<br/>• Efectivo"]
    OpcionesCarrito -- "🗑️ Cancelar todo" --> ResetSesion

    %% Métodos de Pago
    MetodoPago --> ElegirPago{Botón de Pago}
    ElegirPago -- "📲 Yape / Plin" --> PagoDigital[Registra método Yape/Plin<br/>Indica que se valida contra entrega]
    ElegirPago -- "💵 Efectivo" --> PagoEfectivo[Pregunta: '¿Con cuánto vas a pagar?'<br/>Estado: 'esperando_vuelto']
    PagoEfectivo --> ClienteIndicaMonto[Cliente escribe monto. Ej: '50' o '100'<br/>Guarda paga_con y calcula vuelto]

    %% Ubicación y Entrega
    PagoDigital --> SolicitarUbicacion[📍 Solicita Ubicación de Entrega<br/>Estado: 'esperando_ubicacion']
    ClienteIndicaMonto --> SolicitarUbicacion

    SolicitarUbicacion --> TipoUbicacion{¿Cómo envía ubicación?}
    TipoUbicacion -- "Ubicación GPS (clip de WhatsApp)" --> CapturaGPS[Extrae latitud y longitud<br/>Genera enlace de Google Maps]
    TipoUbicacion -- "Texto escrito" --> CapturaTexto[Guarda dirección y referencia escrita]

    %% Inserción en Base de Datos
    CapturaGPS --> InsertarBD[💾 Inserción Transaccional en Base de Datos<br/>RPC: insertar_pedido_y_detalles<br/>• mesa = 0 (DELIVERY)<br/>• idmozo = 1 (Delivery)<br/>• estado = '1' (PENDIENTE / NO COBRADO)<br/>• lugarpedido = '1' (Para Llevar)<br/>• telefono = 519XXXXXXXX<br/>• direccion, gps, metodo_pago, paga_con]
    CapturaTexto --> InsertarBD

    InsertarBD --> ConfirmarCliente[🎉 Mensaje de Confirmación al Cliente:<br/>• N° de Pedido #ID<br/>• Detalle de platos y Total S/<br/>• Enlace de Google Maps<br/>• Estado: Enviado a cocina]
    InsertarBD --> ResetFinal[Limpia sesión para siguiente pedido:<br/>estado = 'inicio', carrito = []]

    %% Disparo POS en tiempo real
    InsertarBD -. Realtime postgres_changes .-> POSAngular[🖥️ Sistema POS Angular del Restaurante]

    subgraph POS_ANGULAR ["🖥️ Respuesta Inmediata en el Sistema POS"]
        POSAngular --> ChimeSonoro[🔔 Campana Sonora en bucle cada 3.2s]
        POSAngular --> AutoRefresh[⚡ ListarPedidos() auto-refresca pedidos activos]
        POSAngular --> ModalRojo[🚨 Modal Rojo Urgente en Pantalla Completa<br/>Datos del cliente, platos, teléfono, mapa y vuelto]
        ModalRojo --> ClickAtender[Botón: '🚨 Atender Pedido e Imprimir Comanda']
        ClickAtender --> Silenciar[Silencia campana y cierra modal]
        ClickAtender --> SeleccionarMesa0[Autoselecciona Mesa 0 en panel de pedidos]
        ClickAtender --> ImprimirComanda[📄 Dispara y abre PDF de Comanda de Cocina listo para imprimir]
    end
```

---

## 📊 Metadatos Detectados del Código Fuente

| Parámetro | Valores Detectados en el Código |
| :--- | :--- |
| **Estados de Sesión** | `pedir_nombre, menu, inicio, seleccion_cantidad, en_carrito, seleccion_pago, esperando_vuelto, esperando_ubicacion, 1` |
| **Platos Destacados** | 9 platos registrados (`Arroz con Mariscos Trio, Chaufa Trio Ceviche Chicharron, Arroz con Marisco Duo, Chicharron de Pescado Duo...`) |
| **Categorías de Carta** | 5 categorías (`Duos, Personal, Trio, Piqueos, Bebidas`) |
| **Métodos de Pago** | `Yape, Plin, Efectivo` |
| **Regla de Mesa Delivery** | `mesa = 0` |
| **Regla de Estado Pago** | `estado = '1'` (Pendiente / No Cobrado) |
| **Mozo Asignado** | `idmozo = 1` (Delivery) |

---

## 🛠️ Cómo regenerar este diagrama manualmente
Si realizaste cambios en `chatbot/index.ts`, puedes regenerar este diagrama ejecutando:
```bash
npm run update-diagram
```
O mantenerlo sincronizado en tiempo real mientras programas con:
```bash
npm run watch-diagram
```
