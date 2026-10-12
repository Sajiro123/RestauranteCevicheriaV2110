const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const chatbotIndexPath = path.join(rootDir, 'chatbot', 'index.ts');
const supabaseIndexPath = path.join(rootDir, 'supabase', 'functions', 'whatsapp-webhook', 'index.ts');
const diagramaFlujoPath = path.join(rootDir, 'chatbot', 'DIAGRAMA_FLUJO.md');
const manualPath = path.join(rootDir, 'chatbot', 'DIAGRAMA_Y_MANUAL_FLUJO.md');

function run() {
  console.log('🔄 Analizando chatbot/index.ts para regenerar el diagrama de flujo...');

  // Determinar archivo fuente principal
  let srcPath = chatbotIndexPath;
  if (!fs.existsSync(srcPath)) {
    srcPath = supabaseIndexPath;
  }

  if (!fs.existsSync(srcPath)) {
    console.error('❌ No se encontró chatbot/index.ts ni la función en supabase.');
    return;
  }

  const code = fs.readFileSync(srcPath, 'utf8');

  // 1. Sincronizar con supabase si son diferentes
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

  // 4. Extraer Métodos de pago soportados
  const pagos = [];
  if (code.includes('pago_yape')) pagos.push('Yape');
  if (code.includes('pago_plin')) pagos.push('Plin');
  if (code.includes('pago_efectivo')) pagos.push('Efectivo');
  if (code.includes('pago_tarjeta')) pagos.push('Tarjeta');

  // 5. Extraer Estados del Bot
  const estadosSet = new Set();
  const estadoRegex = /estado:\s*['"]([a-zA-Z0-9_]+)['"]|sesion\.estado\s*===?\s*['"]([a-zA-Z0-9_]+)['"]/g;
  let em;
  while ((em = estadoRegex.exec(code)) !== null) {
    const st = em[1] || em[2];
    if (st) estadosSet.add(st);
  }
  const estados = Array.from(estadosSet);

  // 6. Construir texto formateado de platos para el nodo del flujograma
  const listaPlatosTxt = platos.length > 0 
    ? platos.map(p => `• ${p.nombre} (S/ ${Number(p.precio).toFixed(2)})`).join('<br/>')
    : '• Platos y especialidades del día';

  const listaCategoriasTxt = categorias.length > 0
    ? categorias.map(c => `${c.id}. ${c.nombre}`).join('<br/>')
    : '• Dúos, Tríos, Personales, Piqueos, Bebidas';

  const listaPagosTxt = pagos.length > 0
    ? pagos.map(p => `• ${p}`).join('<br/>')
    : '• Yape<br/>• Plin<br/>• Efectivo';

  // 7. Generar Código Mermaid Dinámico
  const timestamp = new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' });
  const mermaidDiagram = `flowchart TD
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
    OpcionesMenu -- "⭐ Los Más Pedidos" --> Destacados["📋 Lista de Especialidades:<br/>${listaPlatosTxt}"]

    %% Opción 2: Toda la Carta
    OpcionesMenu -- "📖 Toda la Carta" --> Categorias["📂 Lista de Categorías:<br/>${listaCategoriasTxt}"]
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
    OpcionesCarrito -- "🛍️ Finalizar pedido" --> MetodoPago["💰 Selección de Método de Pago<br/>Estado: 'seleccion_pago'<br/>Opciones:<br/>${listaPagosTxt}"]
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
    end`;

  // 8. Crear archivo dedicado: chatbot/DIAGRAMA_FLUJO.md
  const contenidoDiagramaMd = `# 🔄 Diagrama de Flujo del Chatbot de WhatsApp
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
| **Estados de Sesión** | \`${estados.join(', ') || 'pedir_nombre, menu, seleccion_cantidad, en_carrito, seleccion_pago, esperando_vuelto, esperando_ubicacion'}\` |
| **Platos Destacados** | ${platos.length} platos registrados (\`${platos.map(p => p.nombre).slice(0, 4).join(', ')}...\`) |
| **Categorías de Carta** | ${categorias.length} categorías (\`${categorias.map(c => c.nombre).join(', ')}\`) |
| **Métodos de Pago** | \`${pagos.join(', ')}\` |
| **Regla de Mesa Delivery** | \`mesa = 0\` |
| **Regla de Estado Pago** | \`estado = '1'\` (Pendiente / No Cobrado) |
| **Mozo Asignado** | \`idmozo = 1\` (Delivery) |

---

## 🛠️ Cómo regenerar este diagrama manualmente
Si realizaste cambios en \`chatbot/index.ts\`, puedes regenerar este diagrama ejecutando:
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

  // 9. Actualizar también en chatbot/DIAGRAMA_Y_MANUAL_FLUJO.md (reemplazando el bloque mermaid)
  if (fs.existsSync(manualPath)) {
    let manualContent = fs.readFileSync(manualPath, 'utf8');
    const regexMermaid = /```mermaid[\s\S]*?```/;
    if (regexMermaid.test(manualContent)) {
      manualContent = manualContent.replace(regexMermaid, `\`\`\`mermaid\n${mermaidDiagram}\n\`\`\``);
      fs.writeFileSync(manualPath, manualContent, 'utf8');
      console.log(`✅ Manual actualizado con el nuevo flujograma en: ${path.relative(rootDir, manualPath)}`);
    }
  }
}

run();
