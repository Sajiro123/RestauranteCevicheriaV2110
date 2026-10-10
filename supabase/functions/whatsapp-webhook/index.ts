import { createClient } from 'npm:@supabase/supabase-js@2'

const VERIFY_TOKEN = Deno.env.get('WHATSAPP_VERIFY_TOKEN') || 'cevicheria_willy_seguro_2026'
const GRAPH_API_TOKEN = Deno.env.get('WHATSAPP_ACCESS_TOKEN') || 'EAANNNuVBiJsBSuAgnUjw8f6PXj9vLwzZBZBZBAufeNTvRdxTEHxsHtMMAUnk5hL3iB7YczVzGorQZCywe5JotSjDIfNC2BN0lQqNhz0xFojuvDE07uZB4uoei473NuFCY6jH7FL5x5NJYHaAVw9ToPkz4ZAFwBZAfjvOw8aAMOjdLkLRJTo81Pcef89opO0x5elOfTTQIB25SlfKIxicvY4hAFMbt4FZA9dtBRC80BaUsvRCYDy4RweJOiW2fzZAXxZBZCoIinfkxkB0KJGxR0qz0LofAZDZD'
const PHONE_NUMBER_ID = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID') || '1317677311436064'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY') || ''

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false }
})

// Platos destacados más pedidos de El Puerto Cevichero de Willy
const PLATOS_DESTACADOS = [
  { id: 8, nombre: 'Arroz con Mariscos Trio', precio: 35.00, cat: 'Trio' },
  { id: 104, nombre: 'Chaufa Trio Ceviche Chicharron', precio: 35.00, cat: 'Trio' },
  { id: 3, nombre: 'Arroz con Marisco Duo', precio: 25.00, cat: 'Duos' },
  { id: 2, nombre: 'Chicharron de Pescado Duo', precio: 25.00, cat: 'Duos' },
  { id: 13, nombre: 'Ceviche Clasico Personal', precio: 20.00, cat: 'Personal' },
  { id: 61, nombre: 'Leche de Tigre a lo Macho', precio: 18.00, cat: 'Piqueos' },
  { id: 65, nombre: 'Chilcano de Pescado', precio: 12.00, cat: 'Piqueos' },
  { id: 74, nombre: 'Chicha Morada Jarra', precio: 15.00, cat: 'Bebidas' },
  { id: 78, nombre: 'Gaseosa 1/2 Litro', precio: 6.00, cat: 'Bebidas' }
]

const CATEGORIAS = [
  { id: 1, nombre: 'Duos' },
  { id: 2, nombre: 'Personal' },
  { id: 3, nombre: 'Trio' },
  { id: 4, nombre: 'Piqueos' },
  { id: 5, nombre: 'Bebidas' }
]

// Enviar mensaje a la API de WhatsApp Graph
async function sendWhatsAppMessage(to: string, messageData: any) {
  if (!GRAPH_API_TOKEN) {
    console.error('WHATSAPP_ACCESS_TOKEN no configurado')
    return null
  }
  try {
    const res = await fetch(`https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GRAPH_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: to,
        ...messageData
      })
    })
    const json = await res.json()
    return json
  } catch (err) {
    console.error('Error enviando mensaje WhatsApp:', err)
    return null
  }
}

// Helpers para enviar textos, botones y listas
async function sendText(to: string, body: string) {
  return await sendWhatsAppMessage(to, { type: 'text', text: { body } })
}

async function sendButtons(to: string, body: string, buttons: { id: string; title: string }[]) {
  return await sendWhatsAppMessage(to, {
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: body },
      action: {
        buttons: buttons.slice(0, 3).map(b => ({
          type: 'reply',
          reply: { id: b.id, title: b.title.slice(0, 20) }
        }))
      }
    }
  })
}

async function sendList(to: string, header: string, body: string, buttonText: string, sections: any[]) {
  return await sendWhatsAppMessage(to, {
    type: 'interactive',
    interactive: {
      type: 'list',
      header: { type: 'text', text: header.slice(0, 60) },
      body: { text: body.slice(0, 1024) },
      action: {
        button: buttonText.slice(0, 20),
        sections
      }
    }
  })
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url)

  // 1. Verificación de Webhook para Meta (GET)
  if (req.method === 'GET') {
    const mode = url.searchParams.get('hub.mode')
    const token = url.searchParams.get('hub.verify_token')
    const challenge = url.searchParams.get('hub.challenge')

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('Webhook verificado exitosamente por Meta')
      return new Response(challenge, { status: 200 })
    }
    return new Response('Token de verificación inválido', { status: 403 })
  }

  // 2. Procesamiento de mensajes entrantes (POST)
  if (req.method === 'POST') {
    try {
      const body = await req.json()
      console.log('Webhook payload recibido:', JSON.stringify(body))

      // Soportar tanto producción (entry[0].changes[0].value) como la herramienta de prueba de Meta (body.value)
      const value = body.entry?.[0]?.changes?.[0]?.value || body.value || body
      const messages = value?.messages

      if (!messages || messages.length === 0) {
        return new Response('EVENT_RECEIVED', { status: 200 })
      }

      const msg = messages[0]
      const from = msg.from // Teléfono del cliente
      const msgId = msg.id

      // Procesar de forma asíncrona o directa
      try {
        await handleIncomingMessage(from, msg, msgId)
      } catch (err: any) {
        console.error('Error procesando handleIncomingMessage:', err.message || err)
      }

      return new Response('EVENT_RECEIVED', { status: 200 })
    } catch (e: any) {
      console.error('Error parseando webhook:', e.message || e)
      return new Response('ERROR', { status: 500 })
    }
  }

  return new Response('Método no permitido', { status: 405 })
})

// Lógica de conversación del Bot
async function handleIncomingMessage(phone: string, msg: any, msgId: string) {
  // Evitar procesar mensajes duplicados de Meta
  const { data: existMsg, error: errCheck } = await supabase
    .from('wa_mensajes')
    .select('id')
    .eq('wa_message_id', msgId)
    .maybeSingle()

  if (errCheck) console.error('Error verificando wa_message_id:', errCheck)
  if (existMsg) return

  // Registrar mensaje entrante en historial
  const { error: errInsMsg } = await supabase.from('wa_mensajes').insert({
    telefono: phone,
    sentido: 'in',
    tipo: msg.type,
    contenido: msg,
    wa_message_id: msgId
  })
  if (errInsMsg) console.error('Error insertando en wa_mensajes:', errInsMsg)

  // Obtener o crear sesión del usuario
  let { data: sesion, error: errSes } = await supabase
    .from('wa_sesiones')
    .select('*')
    .eq('telefono', phone)
    .maybeSingle()

  if (errSes) console.error('Error leyendo wa_sesiones:', errSes)

  if (!sesion) {
    const { data: nueva } = await supabase
      .from('wa_sesiones')
      .insert({
        telefono: phone,
        nombre: '',
        estado: 'pedir_nombre',
        carrito: [],
        datos: {},
        modo: 'bot'
      })
      .select()
      .single()
    sesion = nueva
  }

  // Si está en modo humano (asesor), el bot guarda silencio excepto si el cliente pide volver al bot
  const userText = (
    msg.text?.body ||
    msg.interactive?.button_reply?.title ||
    msg.interactive?.list_reply?.title ||
    ''
  ).trim().toLowerCase()

  const replyId = (
    msg.interactive?.button_reply?.id ||
    msg.interactive?.list_reply?.id ||
    ''
  )

  if (sesion.modo === 'humano') {
    if (userText === 'bot' || userText === 'reiniciar' || replyId === 'volver_bot') {
      await supabase.from('wa_sesiones').update({ modo: 'bot', estado: 'menu' }).eq('telefono', phone)
      await sendText(phone, '🤖 ¡Has regresado con el asistente virtual de Willy! ¿Qué deseas ordenar?')
      await mostrarMenuPrincipal(phone, sesion.nombre)
      return
    }
    return // Silencio mientras lo atiende un humano
  }

  // Comando universal para pedir asesor humano
  if (userText.includes('asesor') || userText.includes('humano') || replyId === 'pedir_asesor') {
    await supabase.from('wa_sesiones').update({ modo: 'humano' }).eq('telefono', phone)
    await sendButtons(
      phone,
      '👨‍💼 He pausado el asistente. Un asesor de *El Puerto Cevichero de Willy* te responderá en este chat en breve.',
      [{ id: 'volver_bot', title: '🤖 Volver al Bot' }]
    )
    return
  }

  // Comando para reiniciar / cancelar / nuevo pedido
  if (userText === 'cancelar' || userText === 'inicio' || replyId === 'reiniciar' || userText === 'hola' || userText === 'menu') {
    await supabase.from('wa_sesiones').update({ estado: 'menu', carrito: [], datos: {} }).eq('telefono', phone)
    await sendText(phone, '🔄 ¡Listo! Vamos a tomar tu pedido:')
    await mostrarMenuPrincipal(phone, sesion.nombre)
    return
  }

  // ==========================================
  // MÁQUINA DE ESTADOS DEL BOT
  // ==========================================

  // 1. REGLA OBLIGATORIA: Pedir SIEMPRE el nombre al cliente si no lo tiene
  if (!sesion.nombre || sesion.estado === 'pedir_nombre') {
    const rawText = msg.text?.body?.trim()
    // Si apenas está saludando o no envió texto
    if (!rawText || sesion.estado !== 'pedir_nombre' || rawText.toLowerCase() === 'hola') {
      await supabase.from('wa_sesiones').update({ estado: 'pedir_nombre' }).eq('telefono', phone)
      await sendText(
        phone,
        '¡Hola! 🐟 Bienvenido a *El Puerto Cevichero de Willy*.\n\nPara poder registrar tu pedido y atenderte mejor, *¿cuál es tu nombre y apellido?*'
      )
      return
    }

    // Guardar el nombre ingresado
    const nombreCliente = rawText.slice(0, 150)
    await supabase.from('wa_sesiones').update({
      nombre: nombreCliente,
      estado: 'menu'
    }).eq('telefono', phone)

    await sendText(phone, `¡Mucho gusto, *${nombreCliente}*! 🙌`)
    await mostrarMenuPrincipal(phone, nombreCliente)
    return
  }

  // 2. MENÚ PRINCIPAL (O NUEVO PEDIDO / ESTADO INICIO)
  if (sesion.estado === 'inicio' || sesion.estado === 'menu') {
    if (sesion.estado === 'inicio') {
      await supabase.from('wa_sesiones').update({ estado: 'menu' }).eq('telefono', phone)
    }

    if (replyId === 'ver_destacados') {
      await mostrarPlatosDestacados(phone)
      return
    }
    if (replyId === 'ver_categorias') {
      await mostrarCategorias(phone)
      return
    }
    if (replyId.startsWith('cat_')) {
      const idCat = parseInt(replyId.replace('cat_', ''))
      await mostrarPlatosPorCategoria(phone, idCat)
      return
    }
    if (replyId.startsWith('prod_')) {
      const idProd = parseInt(replyId.replace('prod_', ''))
      await iniciarSeleccionCantidad(phone, idProd)
      return
    }
    if (replyId === 'ver_carrito') {
      await mostrarResumenCarrito(phone, sesion)
      return
    }

    // Si escribe texto ("hola", "buenas", etc.)
    await mostrarMenuPrincipal(phone, sesion.nombre)
    return
  }

  // 3. SELECCIÓN DE CANTIDAD
  if (sesion.estado === 'seleccion_cantidad') {
    const idProducto = sesion.datos?.producto_seleccionado
    let cantidad = 1

    if (replyId.startsWith('cant_')) {
      cantidad = parseInt(replyId.replace('cant_', ''))
    } else if (msg.text?.body && !isNaN(parseInt(msg.text.body))) {
      cantidad = Math.max(1, Math.min(20, parseInt(msg.text.body)))
    }

    // Buscar producto
    const { data: producto } = await supabase
      .from('producto')
      .select('idproducto, nombre, preciounitario')
      .eq('idproducto', idProducto)
      .single()

    if (producto) {
      const carrito = Array.isArray(sesion.carrito) ? [...sesion.carrito] : []
      const existente = carrito.find(item => item.idproducto === producto.idproducto)
      const pu = Number(producto.preciounitario) || 0

      if (existente) {
        existente.cantidad += cantidad
        existente.total = existente.cantidad * pu
      } else {
        carrito.push({
          idproducto: producto.idproducto,
          nombre: producto.nombre,
          cantidad: cantidad,
          preciounitario: pu,
          total: cantidad * pu
        })
      }

      await supabase.from('wa_sesiones').update({
        carrito: carrito,
        estado: 'en_carrito',
        datos: {}
      }).eq('telefono', phone)

      const totalItem = cantidad * pu
      await sendButtons(
        phone,
        `✅ Agregado: *${cantidad}x ${producto.nombre}* (S/ ${totalItem.toFixed(2)})\n\n¿Deseas pedir algo más o finalizar tu pedido?`,
        [
          { id: 'seguir_pidiendo', title: '➕ Seguir pidiendo' },
          { id: 'confirmar_pedido', title: '🛍️ Finalizar pedido' }
        ]
      )
      return
    }
  }

  // 4. CARRITO
  if (sesion.estado === 'en_carrito') {
    if (replyId === 'seguir_pidiendo') {
      await supabase.from('wa_sesiones').update({ estado: 'menu' }).eq('telefono', phone)
      await mostrarMenuPrincipal(phone, sesion.nombre)
      return
    }
    if (replyId === 'confirmar_pedido' || replyId === 'proceder_pago') {
      await pedirMetodoPago(phone, sesion)
      return
    }
  }

  // 5. SELECCIÓN DE MÉTODO DE PAGO (INFORMATIVO, NO SE MARCA COBRADO)
  if (sesion.estado === 'seleccion_pago') {
    let metodo = ''
    if (replyId === 'pago_yape') metodo = 'Yape'
    if (replyId === 'pago_plin') metodo = 'Plin'
    if (replyId === 'pago_efectivo') metodo = 'Efectivo'

    if (metodo === 'Efectivo') {
      await supabase.from('wa_sesiones').update({
        estado: 'esperando_vuelto',
        datos: { ...sesion.datos, metodo_pago: 'Efectivo' }
      }).eq('telefono', phone)

      const total = calcularTotalCarrito(sesion.carrito)
      await sendText(
        phone,
        `💵 Tu total es *S/ ${total.toFixed(2)}*.\n\n*¿Con cuánto vas a pagar en efectivo?* (Ejemplo: escribe *50* o *100* para que el repartidor lleve tu vuelto listo):`
      )
      return
    } else if (metodo === 'Yape' || metodo === 'Plin') {
      await supabase.from('wa_sesiones').update({
        estado: 'esperando_ubicacion',
        datos: { ...sesion.datos, metodo_pago: metodo, paga_con: 0 }
      }).eq('telefono', phone)

      await sendText(
        phone,
        `📲 Has elegido *${metodo}*.\nPodrás pagar al momento de recibir tu pedido o transferir al número del restaurante.`
      )
      await pedirUbicacion(phone)
      return
    }
  }

  // 5.1 SI PAGA EN EFECTIVO: REGISTRAR MONTO DE VUELTO
  if (sesion.estado === 'esperando_vuelto') {
    const montoText = msg.text?.body?.replace(/[^0-9.]/g, '') || '0'
    const pagaCon = parseFloat(montoText) || 0

    await supabase.from('wa_sesiones').update({
      estado: 'esperando_ubicacion',
      datos: { ...sesion.datos, paga_con: pagaCon }
    }).eq('telefono', phone)

    await pedirUbicacion(phone)
    return
  }

  // 6. UBICACIÓN Y DIRECCIÓN
  if (sesion.estado === 'esperando_ubicacion') {
    let lat = null
    let lng = null
    let direccion = ''

    if (msg.type === 'location') {
      lat = msg.location.latitude
      lng = msg.location.longitude
      direccion = msg.location.address || msg.location.name || 'Ubicación GPS compartida'
    } else if (msg.text?.body) {
      direccion = msg.text.body.trim()
    }

    if (!direccion && !lat) {
      await sendText(phone, '📍 Por favor comparte tu ubicación de WhatsApp o escribe tu dirección y referencia:')
      return
    }

    // 7. REGISTRAR EL PEDIDO EN LA BASE DE DATOS
    await registrarPedidoFinal(phone, sesion, direccion, lat, lng)
    return
  }
}

// ==========================================
// FUNCIONES AUXILIARES DE VISTAS Y MENSAJES
// ==========================================

async function mostrarMenuPrincipal(phone: string, nombre: string) {
  await sendButtons(
    phone,
    `🍽️ *El Puerto Cevichero de Willy*\nHola ${nombre || 'amigo'}, ¿cómo deseas armar tu pedido?`,
    [
      { id: 'ver_destacados', title: '⭐ Los Más Pedidos' },
      { id: 'ver_categorias', title: '📖 Toda la Carta' },
      { id: 'pedir_asesor', title: '👨‍💼 Hablar con Asesor' }
    ]
  )
}

async function mostrarPlatosDestacados(phone: string) {
  const rows = PLATOS_DESTACADOS.map(p => ({
    id: `prod_${p.id}`,
    title: p.nombre.slice(0, 24),
    description: `S/ ${p.precio.toFixed(2)} - Categoría: ${p.cat}`
  }))

  await sendList(
    phone,
    '⭐ Platos Más Pedidos',
    'Selecciona un plato para agregarlo a tu pedido:',
    'Ver Platos',
    [{ title: 'Especialidades', rows }]
  )
}

async function mostrarCategorias(phone: string) {
  const rows = CATEGORIAS.map(c => ({
    id: `cat_${c.id}`,
    title: c.nombre,
    description: `Ver todos los platos de ${c.nombre}`
  }))

  await sendList(
    phone,
    '📖 Carta por Categorías',
    'Elige una categoría de nuestra carta:',
    'Ver Categorías',
    [{ title: 'Categorías', rows }]
  )
}

async function mostrarPlatosPorCategoria(phone: string, idCategoria: number) {
  const { data: platos } = await supabase
    .from('producto')
    .select('idproducto, nombre, preciounitario')
    .eq('idcategoria', idCategoria)
    .is('deleted', null)
    .order('nombre')
    .limit(10)

  if (!platos || platos.length === 0) {
    await sendText(phone, 'No hay platos disponibles en esta categoría por el momento.')
    return
  }

  const rows = platos.map(p => ({
    id: `prod_${p.idproducto}`,
    title: p.nombre.slice(0, 24),
    description: `S/ ${Number(p.preciounitario).toFixed(2)}`
  }))

  await sendList(
    phone,
    'Platos Disponibles',
    'Selecciona el plato que deseas pedir:',
    'Seleccionar Plato',
    [{ title: 'Platos', rows }]
  )
}

async function iniciarSeleccionCantidad(phone: string, idProducto: number) {
  const { data: prod } = await supabase
    .from('producto')
    .select('idproducto, nombre, preciounitario')
    .eq('idproducto', idProducto)
    .single()

  if (!prod) return

  await supabase.from('wa_sesiones').update({
    estado: 'seleccion_cantidad',
    datos: { producto_seleccionado: idProducto }
  }).eq('telefono', phone)

  await sendButtons(
    phone,
    `🐟 *${prod.nombre}*\nPrecio: S/ ${Number(prod.preciounitario).toFixed(2)}\n\n¿Cuántas porciones deseas?`,
    [
      { id: 'cant_1', title: '1 porción' },
      { id: 'cant_2', title: '2 porciones' },
      { id: 'cant_3', title: '3 porciones' }
    ]
  )
}

function calcularTotalCarrito(carrito: any[]) {
  if (!Array.isArray(carrito)) return 0
  return carrito.reduce((sum, item) => sum + (Number(item.total) || 0), 0)
}

async function mostrarResumenCarrito(phone: string, sesion: any) {
  const carrito = sesion.carrito || []
  if (carrito.length === 0) {
    await sendText(phone, '🛒 Tu carrito está vacío. ¡Elige un plato para empezar!')
    await mostrarMenuPrincipal(phone, sesion.nombre)
    return
  }

  let resumen = '🛒 *Tu Pedido Actual:*\n\n'
  carrito.forEach((item: any) => {
    resumen += `• ${item.cantidad}x ${item.nombre} - S/ ${Number(item.total).toFixed(2)}\n`
  })
  const total = calcularTotalCarrito(carrito)
  resumen += `\n*TOTAL: S/ ${total.toFixed(2)}*`

  await sendButtons(
    phone,
    resumen,
    [
      { id: 'seguir_pidiendo', title: '➕ Agregar más' },
      { id: 'confirmar_pedido', title: '🛍️ Proceder al Pago' },
      { id: 'reiniciar', title: '🗑️ Cancelar todo' }
    ]
  )
}

async function pedirMetodoPago(phone: string, sesion: any) {
  const total = calcularTotalCarrito(sesion.carrito)
  await supabase.from('wa_sesiones').update({ estado: 'seleccion_pago' }).eq('telefono', phone)

  await sendButtons(
    phone,
    `💰 El total a pagar es *S/ ${total.toFixed(2)}*.\n\n¿Cómo deseas pagar cuando llegue tu pedido?`,
    [
      { id: 'pago_yape', title: '📲 Yape' },
      { id: 'pago_plin', title: '📲 Plin' },
      { id: 'pago_efectivo', title: '💵 Efectivo' }
    ]
  )
}

async function pedirUbicacion(phone: string) {
  await sendText(
    phone,
    '📍 *Último paso:* Comparte tu *Ubicación en tiempo real / GPS* mediante el botón 📎 de WhatsApp, o escribe tu *Dirección exacta y referencia* (Ej: Jr. Los Pinos 123, frente al parque):'
  )
}

// 7. REGISTRO EN BASE DE DATOS
async function registrarPedidoFinal(phone: string, sesion: any, direccion: string, lat: any, lng: any) {
  const carrito = sesion.carrito || []
  const total = calcularTotalCarrito(carrito)
  const totalPedidos = carrito.reduce((sum: number, item: any) => sum + (item.cantidad || 1), 0)
  const metodoPago = sesion.datos?.metodo_pago || 'Por coordinar'
  const pagaCon = Number(sesion.datos?.paga_con) || 0

  let comentario = `[PEDIDO WHATSAPP DELIVERY] Método de pago: ${metodoPago}`
  if (metodoPago === 'Efectivo' && pagaCon > 0) {
    const vuelto = Math.max(0, pagaCon - total)
    comentario += ` (Paga con: S/ ${pagaCon.toFixed(2)} | Vuelto: S/ ${vuelto.toFixed(2)})`
  }
  if (direccion) {
    comentario += ` | Dirección: ${direccion}`
  }

  const now = new Date()
  const fechaLima = now.toLocaleDateString('en-CA', { timeZone: 'America/Lima' })

  // Preparar payload para insertar_pedido_y_detalles
  const pedidoData = {
    cliente: sesion.nombre || 'Cliente WhatsApp',
    mesa: 0, // 0 = DELIVERY en tu sistema
    estado: '1', // 1 = PENDIENTE / NO COBRADO (OBLIGATORIO: EL MOZO COBRA)
    total_pedidos: totalPedidos,
    fecha: fechaLima,
    idmozo: 1, // Mozo 1 = "Delivery" en tu sistema
    total: total,
    comentarios: comentario
  }

  const detalles = carrito.map((item: any) => ({
    idproducto: item.idproducto,
    cantidad: item.cantidad,
    preciounitario: item.preciounitario,
    lugarpedido: '1' // 1 = Para llevar / Delivery
  }))

  // Llamar la función RPC de Supabase
  const { data: rpcResult, error: rpcError } = await supabase.rpc('insertar_pedido_y_detalles', {
    pedido_data: pedidoData,
    detalles: detalles
  })

  if (rpcError || !rpcResult?.success) {
    console.error('Error insertando pedido:', rpcError)
    await sendText(
      phone,
      '⚠️ Hubo un pequeño inconveniente al registrar el pedido en el sistema. Un asesor te atenderá de inmediato por este chat.'
    )
    await supabase.from('wa_sesiones').update({ modo: 'humano' }).eq('telefono', phone)
    return
  }

  const idPedido = rpcResult.idpedido

  // Actualizar datos extra en el pedido (telefono, gps, direccion, metodo_pago)
  await supabase.from('pedido').update({
    telefono: phone,
    direccion: direccion,
    latitud: lat,
    longitud: lng,
    metodo_pago: metodoPago,
    paga_con: pagaCon,
    yape: 0,
    plin: 0,
    efectivo: 0,
    visa: 0
  }).eq('idpedido', idPedido)

  // Limpiar sesión del cliente para su siguiente pedido
  await supabase.from('wa_sesiones').update({
    estado: 'inicio',
    carrito: [],
    datos: {}
  }).eq('telefono', phone)

  // Enviar confirmación al cliente
  let mapaLink = ''
  if (lat && lng) {
    mapaLink = `\n🗺️ Mapa: https://maps.google.com/?q=${lat},${lng}`
  }

  await sendText(
    phone,
    `🎉 *¡PEDIDO CONFIRMADO CON ÉXITO!* 🎉\n\n` +
    `📋 *Pedido N°:* #${idPedido}\n` +
    `👤 *Cliente:* ${sesion.nombre}\n` +
    `💰 *Total:* S/ ${total.toFixed(2)}\n` +
    `💳 *Pago:* ${metodoPago} *(se cobra contra entrega)*\n` +
    `📍 *Entrega:* ${direccion}${mapaLink}\n\n` +
    `👨‍🍳 El equipo de cocina de *El Puerto Cevichero de Willy* ya recibió tu comanda y comenzará su preparación. ¡Muchas gracias!`
  )
}
