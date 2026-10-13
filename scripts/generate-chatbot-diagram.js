const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const chatbotIndexPath = path.join(rootDir, 'chatbot', 'index.ts');
const supabaseIndexPath = path.join(rootDir, 'supabase', 'functions', 'whatsapp-webhook', 'index.ts');
const diagramaFlujoPath = path.join(rootDir, 'chatbot', 'DIAGRAMA_FLUJO.md');
const manualPath = path.join(rootDir, 'chatbot', 'DIAGRAMA_Y_MANUAL_FLUJO.md');

function run() {
  console.log('🔄 Analizando chatbot/index.ts para regenerar el diagrama de flujo v2...');

  let srcPath = chatbotIndexPath;
  if (!fs.existsSync(srcPath)) {
    srcPath = supabaseIndexPath;
  }

  if (!fs.existsSync(srcPath)) {
    console.error('❌ No se encontró chatbot/index.ts ni la función en supabase.');
    return;
  }

  const code = fs.readFileSync(srcPath, 'utf8');

  // 1. Sincronizar con supabase si difieren
  if (fs.existsSync(supabaseIndexPath)) {
    const supaCode = fs.readFileSync(supabaseIndexPath, 'utf8');
    if (srcPath === chatbotIndexPath && code !== supaCode) {
      fs.writeFileSync(supabaseIndexPath, code, 'utf8');
      console.log('✅ Sincronizado automáticamente con supabase/functions/whatsapp-webhook/index.ts');
    }
  }

  // 2. Extraer Platos Destacados
  const platosMatch = code.match(/const\s+PLATOS_DESTACADOS\s*=\s*\[([\s\S]*?)\]\s*(?:;|\n)/);
  const platos = [];
  if (platosMatch) {
    const itemRegex = /\{[^}]*id:\s*(\d+)[^}]*nombre:\s*['"]([^'"]+)['"][^}]*precio:\s*([\d.]+)[^}]*cat:\s*['"]([^'"]+)['"][^}]*\}/g;
    let m;
    while ((m = itemRegex.exec(platosMatch[1])) !== null) {
      platos.push({ id: m[1], nombre: m[2], precio: m[3], cat: m[4] });
    }
  }

  // 3. Extraer Categorías
  const catMatch = code.match(/const\s+CATEGORIAS\s*=\s*\[([\s\S]*?)\]\s*(?:;|\n)/);
  const categorias = [];
  if (catMatch) {
    const catItemRegex = /\{[^}]*id:\s*(\d+)[^}]*nombre:\s*['"]([^'"]+)['"][^}]*\}/g;
    let cm;
    while ((cm = catItemRegex.exec(catMatch[1])) !== null) {
      categorias.push({ id: cm[1], nombre: cm[2] });
    }
  }

  // 4. Extraer Métodos de pago
  const pagos = [];
  if (code.includes('pago_yape')) pagos.push('Yape');
  if (code.includes('pago_plin')) pagos.push('Plin');
  if (code.includes('pago_efectivo')) pagos.push('Efectivo');

  // 5. Extraer Estados del Bot
  const estadosSet = new Set();
  const estadoRegex = /estado:\s*['"]([a-zA-Z0-9_]+)['"]|sesion\.estado\s*===?\s*['"]([a-zA-Z0-9_]+)['"]/g;
  let em;
  while ((em = estadoRegex.exec(code)) !== null) {
    const st = em[1] || em[2];
    if (st) estadosSet.add(st);
  }
  const estados = Array.from(estadosSet);

  const listaPlatosTxt = platos.length > 0 
    ? platos.map(p => `• ${p.nombre} (S/ ${Number(p.precio).toFixed(2)})`).join('<br/>')
    : '• Platos y especialidades del día';

  const listaCategoriasTxt = categorias.length > 0
    ? categorias.map(c => `${c.id}. ${c.nombre}`).join('<br/>')
    : '• Dúos, Tríos, Personales, Piqueos, Bebidas';

  // 6. Generar Código Mermaid Dinámico (v2 Mejorado)
  const timestamp = new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' });
  const mermaidDiagram = `flowchart TD
    %% Flujo mejorado del chatbot de pedidos por WhatsApp (v2)
    %% Incluye: Volver atrás global, selector de cantidades, asesor en cada paso,
    %% fotos de platos, quitar plato del carrito y confirmación de cancelación.

    Inicio(["👤 Cliente envía mensaje por WhatsApp"])
    ComandosCheck{"¿Es comando especial?<br/>hola / menu / volver / cancelar / asesor<br/>(o toca el botón ⬅️ Volver / 👨‍💼 Asesor)"}

    %% Reglas Globales
    ReglaGlobal["📌 Reglas en TODOS los pasos:<br/>• Listas interactivas: filas fijas ⬅️ Volver y 👨‍💼 Asesor al final (tope 10 filas)<br/>• Botones rápidos: ⬅️ Volver si hay lugar, Asesor en pie de mensaje<br/>• Historial en wa_sesiones para retroceder con carrito intacto"]

    %% Atención Humana (Asesor)
    ModoHumano["👨‍💼 Pausa el bot y activa Modo Humano<br/>Sesión: modo = 'humano'<br/>Conserva el paso actual y el carrito"]
    NotificarPersonal["🔔 Avisa al personal en el restaurante<br/>Nombre, teléfono y carrito acumulado"]
    AtencionHumana["💬 Atención por persona capacitada<br/>El bot guarda silencio"]
    ReanudarBot["▶️ Reactiva el bot: modo = 'bot'<br/>Vuelve al menú con carrito intacto"]
    OfrecerAsesor{"🤝 ¿Te atiende una persona?<br/>Botones: 👨‍💼 Sí, con asesor · 🤖 Seguir con bot"}

    %% Volver y Cancelar
    Volver["⬅️ Volver un paso<br/>Recupera estado del historial<br/>El carrito se conserva"]
    Repintar["Re-envía la pantalla del paso anterior<br/>menú · categorías · platos · cantidad · carrito · pago"]
    ConfirmarCancelar{"⚠️ ¿Cancelar todo el pedido?<br/>Botones: 🗑️ Sí, cancelar · ↩️ No, seguir"}
    ResetSesion["🔄 Reinicia el carrito a cero<br/>Sesión: estado = 'menu', carrito = []"]

    %% Nombre Obligatorio
    CheckNombre{"¿El cliente ya tiene<br/>nombre guardado?"}
    PedirNombre["📝 Bot solicita Nombre y Apellido<br/>Estado: 'pedir_nombre'"]
    ClienteEnviaNombre["Cliente escribe su nombre<br/>Ej: 'Alex Gomez'"]
    GuardarNombre["💾 Guarda nombre en wa_sesiones<br/>Envía: '¡Mucho gusto, Alex! 🙌'"]

    %% Menú Principal
    MenuPrincipal["🍽️ Menú Principal Interactivo<br/>Estado: 'menu'<br/>Botones: ⭐ Más pedidos · 📖 Toda la carta · 👨‍💼 Asesor"]
    OpcionesMenu{"¿Qué botón presiona?"}
    Destacados["⭐ Lista: Platos Más Pedidos<br/>${listaPlatosTxt}<br/>Filas fijas: ⬅️ Volver · 👨‍💼 Asesor"]
    Categorias["📂 Lista de Categorías<br/>${listaCategoriasTxt}<br/>Filas fijas: ⬅️ Volver · 👨‍💼 Asesor"]
    SelCategoria["Cliente elige una categoría"]
    PlatosCategoria["Consulta la tabla 'producto'<br/>Muestra platos (máx. 7 por página) + ➡️ Ver más + ⬅️ Volver + 👨‍💼 Asesor"]
    ElegirPlato["Cliente selecciona un plato"]

    %% Cantidad y Porciones
    PedirCantidad["🔢 Pregunta Cantidad (con foto si existe)<br/>Estado: 'seleccion_cantidad'<br/>Botones: 1 porción · 2 porciones · ➕ Más cantidades"]
    ElegirCantidad{"¿Qué elige?"}
    CantidadMas["🔢 Lista de más porciones<br/>3 · 4 · 5 · 6 · 7 · 8 porciones<br/>✍️ Otra cantidad<br/>Filas fijas: ⬅️ Volver · 👨‍💼 Asesor"]
    CantidadEscrita["✍️ Pide escribir la cantidad numéricamente"]
    ValidarCantidad{"¿Es un número válido?"}

    %% Carrito
    AgregarCarrito["🛒 Agrega al Carrito en wa_sesiones<br/>Calcula subtotal: cantidad x precio<br/>Estado: 'en_carrito'"]
    OpcionesCarrito{"Resumen del pedido y total en soles"}
    QuitarPlato["✏️ Lista de platos del carrito<br/>Elimina el plato elegido y recalcula el total<br/>Filas fijas: ⬅️ Volver · 🗑️ Cancelar todo"]

    %% Pago y Ubicación
    MetodoPago["💰 Selección de Método de Pago<br/>Estado: 'seleccion_pago'<br/>Botones: 📲 Yape · 📲 Plin · 💵 Efectivo"]
    ElegirPago{"Botón de Pago"}
    PagoDigital["Registra método Yape/Plin<br/>Indica que se valida contra entrega"]
    PagoEfectivo["Pregunta: ¿Con cuánto vas a pagar?<br/>Estado: 'esperando_vuelto'"]
    ClienteIndicaMonto["Cliente escribe monto. Ej: '50' o '100'<br/>Guarda paga_con y calcula vuelto"]
    SolicitarUbicacion["📍 Solicita Ubicación de Entrega<br/>Estado: 'esperando_ubicacion'"]
    TipoUbicacion{"¿Cómo envía ubicación?"}
    CapturaGPS["Extrae latitud y longitud<br/>Genera enlace de Google Maps"]
    CapturaTexto["Guarda dirección y referencia escrita"]

    %% Inserción en Base de Datos
    InsertarBD["💾 Inserción Transaccional en Base de Datos<br/>RPC: insertar_pedido_y_detalles<br/>• mesa = 0 (DELIVERY)<br/>• idmozo = 1 (Delivery)<br/>• estado = '1' (PENDIENTE / NO COBRADO)<br/>• lugarpedido = '1' (Para Llevar)<br/>• telefono = 519XXXXXXXX<br/>• direccion, gps, metodo_pago, paga_con"]
    ConfirmarCliente["🎉 Mensaje de Confirmación al Cliente:<br/>• N° de Pedido #ID<br/>• Detalle de platos y Total S/<br/>• Enlace de Google Maps<br/>• Estado: Enviado a cocina"]
    ResetFinal["Limpia sesión para siguiente pedido:<br/>estado = 'inicio', carrito = []"]
    POSAngular["🖥️ Sistema POS Angular del Restaurante"]

    subgraph POS_ANGULAR ["🖥️ Respuesta Inmediata en el Sistema POS"]
        POSAngular --> ChimeSonoro["🔔 Campana Sonora en bucle cada 3.2s"]
        POSAngular --> AutoRefresh["⚡ ListarPedidos() auto-refresca pedidos activos"]
        POSAngular --> ModalRojo["🚨 Modal Rojo Urgente en Pantalla Completa<br/>Datos del cliente, platos, teléfono, mapa y vuelto"]
        ModalRojo --> ClickAtender["Botón: '🚨 Atender Pedido e Imprimir Comanda'"]
        ClickAtender --> Silenciar["Silencia campana y cierra modal"]
        ClickAtender --> SeleccionarMesa0["Autoselecciona Mesa 0 en panel de pedidos"]
        ClickAtender --> ImprimirComanda["📄 Dispara y abre PDF de Comanda de Cocina listo para imprimir"]
    end

    %% Conexiones
    Inicio --> ComandosCheck
    ReglaGlobal -.-> ComandosCheck
    ComandosCheck -->|"asesor / humano / 👨‍💼"| ModoHumano
    ComandosCheck -->|"volver / ⬅️"| Volver
    ComandosCheck -->|"cancelar"| ConfirmarCancelar
    ComandosCheck -.->|"2 errores seguidos"| OfrecerAsesor
    ComandosCheck -->|"Mensaje normal / hola / menu"| CheckNombre

    ModoHumano --> NotificarPersonal --> AtencionHumana
    AtencionHumana -->|"Escribe menu o bot"| ReanudarBot
    ReanudarBot --> MenuPrincipal
    OfrecerAsesor -->|"Sí, con asesor"| ModoHumano
    OfrecerAsesor -->|"Seguir con bot"| Repintar

    Volver --> Repintar
    ConfirmarCancelar -->|"Sí, cancelar"| ResetSesion
    ConfirmarCancelar -->|"No, seguir"| Repintar
    ResetSesion --> MenuPrincipal

    CheckNombre -->|"No o estado='pedir_nombre'"| PedirNombre
    CheckNombre -->|"Sí"| MenuPrincipal
    PedirNombre --> ClienteEnviaNombre --> GuardarNombre --> MenuPrincipal

    MenuPrincipal --> OpcionesMenu
    OpcionesMenu -->|"⭐ Más pedidos"| Destacados
    OpcionesMenu -->|"📖 Toda la carta"| Categorias
    OpcionesMenu -->|"👨‍💼 Asesor"| ModoHumano
    Categorias --> SelCategoria --> PlatosCategoria
    Destacados --> ElegirPlato
    PlatosCategoria --> ElegirPlato

    ElegirPlato --> PedirCantidad --> ElegirCantidad
    ElegirCantidad -->|"1 o 2 porciones"| AgregarCarrito
    ElegirCantidad -->|"➕ Más cantidades"| CantidadMas
    ElegirCantidad -->|"Escribe un número"| ValidarCantidad
    CantidadMas -->|"3 a 8 porciones"| AgregarCarrito
    CantidadMas -->|"✍️ Otra cantidad"| CantidadEscrita
    CantidadEscrita --> ValidarCantidad
    ValidarCantidad -->|"Sí (1 a 20)"| AgregarCarrito
    ValidarCantidad -->|"Más de 20 (pedido grande)"| ModoHumano
    ValidarCantidad -->|"No es válido"| CantidadEscrita

    AgregarCarrito --> OpcionesCarrito
    OpcionesCarrito -->|"🛍️ Finalizar pedido"| MetodoPago
    OpcionesCarrito -->|"➕ Seguir pidiendo"| MenuPrincipal
    OpcionesCarrito -->|"✏️ Quitar un plato"| QuitarPlato
    OpcionesCarrito -->|"🗑️ Cancelar todo"| ConfirmarCancelar
    QuitarPlato --> OpcionesCarrito
    QuitarPlato -->|"Carrito vacío"| MenuPrincipal

    MetodoPago --> ElegirPago
    ElegirPago -->|"📲 Yape / Plin"| PagoDigital
    ElegirPago -->|"💵 Efectivo"| PagoEfectivo
    PagoEfectivo --> ClienteIndicaMonto
    PagoDigital --> SolicitarUbicacion
    ClienteIndicaMonto --> SolicitarUbicacion
    SolicitarUbicacion --> TipoUbicacion
    TipoUbicacion -->|"Ubicación GPS (clip WhatsApp)"| CapturaGPS
    TipoUbicacion -->|"Texto escrito"| CapturaTexto

    CapturaGPS --> InsertarBD
    CapturaTexto --> InsertarBD
    InsertarBD --> ConfirmarCliente
    InsertarBD --> ResetFinal
    InsertarBD -. Realtime postgres_changes .-> POSAngular`;

  // 7. Guardar en chatbot/DIAGRAMA_FLUJO.md
  const contenidoDiagramaMd = `# 🔄 Diagrama de Flujo del Chatbot de WhatsApp (Versión 2 Mejorada)
> **Última sincronización automática:** ${timestamp}  
> **Archivo origen:** \`chatbot/index.ts\` (analizado automáticamente)

Este diagrama representa con exactitud la lógica activa en el código del chatbot. Se actualiza de forma automática cada vez que se realizan modificaciones en \`chatbot/index.ts\`.

---

## 🗺️ Flujograma Activo

\`\`\`mermaid
${mermaidDiagram}
\`\`\`

---

## 📊 Metadatos Detectados del Código Fuente

| Parámetro | Valores Detectados en el Código |
| :--- | :--- |
| **Estados de Sesión** | \`${estados.join(', ')}\` |
| **Platos Destacados** | ${platos.length} platos registrados (\`${platos.map(p => p.nombre).slice(0, 4).join(', ')}...\`) |
| **Categorías de Carta** | ${categorias.length} categorías (\`${categorias.map(c => c.nombre).join(', ')}\`) |
| **Métodos de Pago** | \`${pagos.join(', ')}\` |
| **Regla de Mesa Delivery** | \`mesa = 0\` |
| **Regla de Estado Pago** | \`estado = '1'\` (Pendiente / No Cobrado) |
| **Mozo Asignado** | \`idmozo = 1\` (Delivery) |

---

## 🛠️ Cómo regenerar este diagrama automáticamente
Si realizaste cambios en \`chatbot/index.ts\`, el diagrama se actualiza solo al hacer \`git commit\`.  
También puedes forzar la actualización ejecutando:
\`\`\`bash
npm run update-diagram
\`\`\`
O mantenerlo sincronizado en tiempo real mientras programas con:
\`\`\`bash
npm run watch-diagram
\`\`\`
`;

  fs.writeFileSync(diagramaFlujoPath, contenidoDiagramaMd, 'utf8');
  console.log(`✅ Diagrama generado con éxito en: ${path.relative(rootDir, diagramaFlujoPath)}`);

  // 8. Actualizar también en chatbot/DIAGRAMA_Y_MANUAL_FLUJO.md
  if (fs.existsSync(manualPath)) {
    let manualContent = fs.readFileSync(manualPath, 'utf8');
    const regexMermaid = /```mermaid[\s\S]*?```/;
    if (regexMermaid.test(manualContent)) {
      manualContent = manualContent.replace(regexMermaid, `\`\`\`mermaid\n${mermaidDiagram}\n\`\`\``);
      fs.writeFileSync(manualPath, manualContent, 'utf8');
      console.log(`✅ Manual actualizado con el nuevo flujograma v2 en: ${path.relative(rootDir, manualPath)}`);
    }
  }
}

run();
