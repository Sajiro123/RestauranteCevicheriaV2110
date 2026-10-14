import { createClient } from 'npm:@supabase/supabase-js@2'

const VERIFY_TOKEN = Deno.env.get('WHATSAPP_VERIFY_TOKEN') || 'cevicheria_willy_seguro_2026'
const GRAPH_API_TOKEN = Deno.env.get('WHATSAPP_ACCESS_TOKEN') || 'EAANNNuVBiJsBSuAgnUjw8f6PXj9vLwzZBZBZBAufeNTvRdxTEHxsHtMMAUnk5hL3iB7YczVzGorQZCywe5JotSjDIfNC2BN0lQqNhz0xFojuvDE07uZB4uoei473NuFCY6jH7FL5x5NJYHaAVw9ToPkz4ZAFwBZAfjvOw8aAMOjdLkLRJTo81Pcef89opO0x5elOfTTQIB25SlfKIxicvY4hAFMbt4FZA9dtBRC80BaUsvRCYDy4RweJOiW2fzZAXxZBZCoIinfkxkB0KJGxR0qz0LofAZDZD'
const PHONE_NUMBER_ID = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID') || '1317677311436064'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY') || ''

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false }
})

// Platos destacados más pedidos de El Puerto Cevichero de Willy (máx. 7 para dar cabida a Volver y Asesor)
const PLATOS_DESTACADOS = [
  { id: 8, nombre: 'Arroz con Mariscos Trio', precio: 35.00, cat: 'Trio' },
  { id: 104, nombre: 'Chaufa Trio Ceviche', precio: 35.00, cat: 'Trio' },
  { id: 3, nombre: 'Arroz Marisco Duo', precio: 25.00, cat: 'Duos' },
  { id: 2, nombre: 'Chicharron Pescado Duo', precio: 25.00, cat: 'Duos' },
  { id: 13, nombre: 'Ceviche Clasico', precio: 20.00, cat: 'Personal' },
  { id: 61, nombre: 'Leche Tigre al Macho', precio: 18.00, cat: 'Piqueos' },
  { id: 74, nombre: 'Chicha Morada Jarra', precio: 15.00, cat: 'Bebidas' }
]

// Subcategorías culinarias marinas para presentación óptima en WhatsApp (Modelo Híbrido)
const SUBCATEGORIAS = [
  { id: 'ceviches', nombre: '🐟 Ceviches y Tiraditos', desc: 'Clásicos, mixtos y tiraditos' },
  { id: 'chicharrones', nombre: '🍤 Chicharrones y Jaleas', desc: 'Pescado, pota, mariscos y jaleas' },
  { id: 'arroces', nombre: '🍚 Arroces y Chaufas', desc: 'Arroz con mariscos y chaufas' },
  { id: 'sudados', nombre: '🍲 Sudados y Parihuelas', desc: 'Sudados, parihuelas y chupes' },
  { id: 'combos', nombre: '🍽️ Dúos y Tríos', desc: 'Combinaciones marinas populares' },
  { id: 'pescados', nombre: '🐟 Pescados y Segundos', desc: 'Filetes, fritos y picantes' },
  { id: 'piqueos', nombre: '🍟 Piqueos y Entradas', desc: 'Leches de tigre, causas y choritos' },
  { id: 'bebidas', nombre: '🥤 Bebidas y Cervezas', desc: 'Chichas, jugos, gaseosas y cervezas' }
]

const CATEGORIAS = SUBCATEGORIAS

// ==========================================
// HELPERS DE NORMALIZACIÓN Y BÚSQUEDA SMART
// ==========================================

function normalizeText(text: string): string {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function matchesSubcategory(nombre: string, idcategoria: number, subcatKey: string): boolean {
  const n = normalizeText(nombre)
  if (subcatKey === 'bebidas') {
    return idcategoria === 5 || n.includes('gaseosa') || n.includes('pilsen') || n.includes('cusquena') || n.includes('agua') || n.includes('maracuya') || n.includes('limonada') || (n.includes('chicha') && !n.includes('chicharron'))
  }
  if (subcatKey === 'combos') {
    return idcategoria === 1 || idcategoria === 3 || n.includes('duo') || n.includes('trio')
  }
  if (subcatKey === 'ceviches') {
    return n.includes('ceviche') || n.includes('tiradito')
  }
  if (subcatKey === 'chicharrones') {
    return n.includes('chicharron') || n.includes('jalea')
  }
  if (subcatKey === 'arroces') {
    return n.includes('arroz') || n.includes('chaufa')
  }
  if (subcatKey === 'sudados') {
    return n.includes('sudado') || n.includes('parihuela') || n.includes('chupe') || n.includes('dieta') || n.includes('chilcano')
  }
  if (subcatKey === 'piqueos') {
    return idcategoria === 4 || n.includes('leche') || n.includes('chorito') || n.includes('causa') || n.includes('porcion') || n.includes('taper')
  }
  if (subcatKey === 'pescados') {
    return n.includes('filete') || n.includes('frito') || n.includes('plancha') || n.includes('vapor') || n.includes('cabrilla') || n.includes('trucha') || n.includes('picante')
  }
  return false
}

function matchProduct(prodName: string, query: string): boolean {
  const normName = normalizeText(prodName)
  const cleanQuery = normalizeText(query)
  const nameTokens = normName.split(/[\s,+/()_-]+/).filter(Boolean)
  const queryWords = cleanQuery.split(/[\s,+/()_-]+/).filter(w => w.length >= 2)

  if (queryWords.length === 0) return false

  // 1. Coincidencia directa completa de frase
  if (normName.includes(cleanQuery)) {
    // Si busca "chicha" no debe coincidir con "chicharron"
    if (cleanQuery.startsWith('chicha') && !cleanQuery.startsWith('chicharr')) {
      return nameTokens.some(tok => tok === 'chicha' || tok === 'chichas')
    }
    return true
  }

  // 2. Coincidencia por todas las palabras clave
  return queryWords.every(qw => {
    return nameTokens.some(tok => {
      if (tok === qw) return true
      if (qw.length >= 4 && tok.startsWith(qw)) {
        if (qw === 'chicha' && tok.startsWith('chicharr')) return false
        return true
      }
      return false
    })
  })
}

// ==========================================
// HELPERS PARA COMUNICACIÓN CON WHATSAPP API
// ==========================================

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

async function sendText(to: string, body: string) {
  return await sendWhatsAppMessage(to, { type: 'text', text: { body } })
}

async function sendButtons(to: string, body: string, buttons: { id: string; title: string }[], footer?: string) {
  const interactive: any = {
    type: 'button',
    body: { text: body.slice(0, 1024) },
    action: {
      buttons: buttons.slice(0, 3).map(b => ({
        type: 'reply',
        reply: { id: b.id, title: b.title.slice(0, 20) }
      }))
    }
  }
  if (footer) {
    interactive.footer = { text: footer.slice(0, 60) }
  }
  return await sendWhatsAppMessage(to, { type: 'interactive', interactive })
}

async function sendButtonsWithImage(to: string, imageUrl: string, body: string, buttons: { id: string; title: string }[], footer?: string) {
  if (imageUrl && (imageUrl.startsWith('http://') || imageUrl.startsWith('https://'))) {
    const payload: any = {
      type: 'interactive',
      interactive: {
        type: 'button',
        header: {
          type: 'image',
          image: { link: imageUrl }
        },
        body: { text: body.slice(0, 1024) },
        action: {
          buttons: buttons.slice(0, 3).map(b => ({
            type: 'reply',
            reply: { id: b.id, title: b.title.slice(0, 20) }
          }))
        }
      }
    }
    if (footer) {
      payload.interactive.footer = { text: footer.slice(0, 60) }
    }
    const res = await sendWhatsAppMessage(to, payload)
    if (res?.messages) return res
  }
  return await sendButtons(to, body, buttons, footer)
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

// ==========================================
// CONTROL DE HISTORIAL Y NAVEGACIÓN "VOLVER"
// ==========================================

function pushHistorial(datos: any, paso: string) {
  const historial = Array.isArray(datos?.historial) ? [...datos.historial] : []
  if (historial[historial.length - 1] !== paso) {
    historial.push(paso)
  }
  return historial.slice(-10) // Mantener últimos 10 pasos
}

function popHistorial(datos: any): { pasoPrevio: string; nuevoHistorial: string[] } {
  const historial = Array.isArray(datos?.historial) ? [...datos.historial] : []
  historial.pop() // Quitar el paso actual
  const pasoPrevio = historial[historial.length - 1] || 'menu'
  return { pasoPrevio, nuevoHistorial: historial }
}

async function repintarPantalla(phone: string, sesion: any, paso: string) {
  if (paso === 'menu') {
    await supabase.from('wa_sesiones').update({ estado: 'menu' }).eq('telefono', phone)
    await mostrarMenuPrincipal(phone, sesion.nombre)
  } else if (paso === 'destacados') {
    await supabase.from('wa_sesiones').update({ estado: 'menu' }).eq('telefono', phone)
    await mostrarPlatosDestacados(phone)
  } else if (paso === 'subcategorias' || paso === 'categorias') {
    await supabase.from('wa_sesiones').update({ estado: 'menu' }).eq('telefono', phone)
    await mostrarSubcategorias(phone)
  } else if (paso.startsWith('subcat_')) {
    const subcatKey = paso.replace('subcat_', '')
    await supabase.from('wa_sesiones').update({ estado: 'menu' }).eq('telefono', phone)
    await mostrarPlatosPorSubcategoria(phone, subcatKey, 0)
  } else if (paso.startsWith('cat_')) {
    await supabase.from('wa_sesiones').update({ estado: 'menu' }).eq('telefono', phone)
    await mostrarSubcategorias(phone)
  } else if (paso === 'en_carrito') {
    await supabase.from('wa_sesiones').update({ estado: 'en_carrito' }).eq('telefono', phone)
    await mostrarResumenCarrito(phone, sesion)
  } else if (paso === 'seleccion_pago') {
    await supabase.from('wa_sesiones').update({ estado: 'seleccion_pago' }).eq('telefono', phone)
    await pedirMetodoPago(phone, sesion)
  } else if (paso === 'esperando_ubicacion') {
    await supabase.from('wa_sesiones').update({ estado: 'esperando_ubicacion' }).eq('telefono', phone)
    await pedirUbicacion(phone)
  } else {
    await supabase.from('wa_sesiones').update({ estado: 'menu' }).eq('telefono', phone)
    await mostrarMenuPrincipal(phone, sesion.nombre)
  }
}

// ==========================================
// SERVIDOR PRINCIPAL DENO SERVE
// ==========================================

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
      const value = body.entry?.[0]?.changes?.[0]?.value || body.value || body
      const messages = value?.messages

      if (!messages || messages.length === 0) {
        return new Response('EVENT_RECEIVED', { status: 200 })
      }

      const msg = messages[0]
      const from = msg.from
      const msgId = msg.id

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

// ==========================================
// LÓGICA DE CONVERSACIÓN MEJORADA (V2 + MODELO HÍBRIDO)
// ==========================================

async function handleIncomingMessage(phone: string, msg: any, msgId: string) {
  // 1. Desduplicación de mensajes
  const { data: existMsg } = await supabase
    .from('wa_mensajes')
    .select('id')
    .eq('wa_message_id', msgId)
    .maybeSingle()

  if (existMsg) return

  await supabase.from('wa_mensajes').insert({
    telefono: phone,
    sentido: 'in',
    tipo: msg.type,
    contenido: msg,
    wa_message_id: msgId
  })

  // 2. Obtener o crear sesión
  let { data: sesion } = await supabase
    .from('wa_sesiones')
    .select('*')
    .eq('telefono', phone)
    .maybeSingle()

  if (!sesion) {
    const { data: nueva } = await supabase
      .from('wa_sesiones')
      .insert({
        telefono: phone,
        nombre: '',
        estado: 'pedir_nombre',
        carrito: [],
        datos: { historial: ['menu'], errores: 0 },
        modo: 'bot'
      })
      .select()
      .single()
    sesion = nueva
  }

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

  // 3. Manejo de Modo Humano (Asesor)
  if (sesion.modo === 'humano') {
    if (userText === 'bot' || userText === 'reiniciar' || replyId === 'volver_bot' || userText === 'menu') {
      await supabase.from('wa_sesiones').update({
        modo: 'bot',
        estado: 'menu',
        datos: { ...sesion.datos, historial: ['menu'] }
      }).eq('telefono', phone)
      await sendText(phone, '🤖 ¡Has regresado con el asistente virtual de Willy! ¿Qué deseas ordenar hoy?')
      await mostrarMenuPrincipal(phone, sesion.nombre)
      return
    }
    return // Bot silenciado mientras atiende una persona
  }

  // 4. Comando Global: Pedir Asesor Humano en cualquier momento
  if (userText.includes('asesor') || userText.includes('humano') || replyId === 'pedir_asesor') {
    await supabase.from('wa_sesiones').update({ modo: 'humano' }).eq('telefono', phone)
    await sendButtons(
      phone,
      '👨‍💼 He pausado el asistente virtual. Un asesor de *El Puerto Cevichero de Willy* te responderá por este chat en unos momentos.\n\n_Tu pedido y carrito se mantendrán guardados._',
      [{ id: 'volver_bot', title: '🤖 Volver al Bot' }],
      'El Puerto Cevichero de Willy'
    )
    return
  }

  // 5. Comando Global: Volver Atrás (⬅️ Volver)
  if (userText === 'volver' || userText === 'atras' || replyId === 'volver') {
    const { pasoPrevio, nuevoHistorial } = popHistorial(sesion.datos)
    await supabase.from('wa_sesiones').update({
      datos: { ...sesion.datos, historial: nuevoHistorial, errores: 0 }
    }).eq('telefono', phone)
    await repintarPantalla(phone, sesion, pasoPrevio)
    return
  }

  // 6. Comando Global: Cancelar Pedido con Confirmación
  if (userText === 'cancelar' || replyId === 'cancelar_todo') {
    await supabase.from('wa_sesiones').update({ estado: 'confirmar_cancelar' }).eq('telefono', phone)
    await sendButtons(
      phone,
      '⚠️ *¿Estás seguro de que deseas cancelar todo tu pedido?*\n\nSe vaciará tu carrito actual.',
      [
        { id: 'confirmar_cancelar_si', title: '🗑️ Sí, cancelar' },
        { id: 'confirmar_cancelar_no', title: '↩️ No, seguir' }
      ],
      'Confirmación de cancelación'
    )
    return
  }

  // Si está en pantalla de confirmar cancelación
  if (sesion.estado === 'confirmar_cancelar') {
    if (replyId === 'confirmar_cancelar_si' || userText.includes('si')) {
      await supabase.from('wa_sesiones').update({
        estado: 'menu',
        carrito: [],
        datos: { historial: ['menu'], errores: 0 }
      }).eq('telefono', phone)
      await sendText(phone, '🔄 Tu pedido ha sido cancelado y tu carrito está vacío.')
      await mostrarMenuPrincipal(phone, sesion.nombre)
      return
    } else {
      const historial = sesion.datos?.historial || ['menu']
      const paso = historial[historial.length - 1] || 'en_carrito'
      await sendText(phone, '👍 ¡Excelente! Continuamos con tu orden.')
      await repintarPantalla(phone, sesion, paso)
      return
    }
  }

  // Comando Menú / Hola / Reiniciar
  if (userText === 'inicio' || userText === 'hola' || userText === 'menu' || replyId === 'seguir_bot') {
    await supabase.from('wa_sesiones').update({
      estado: 'menu',
      datos: { ...sesion.datos, historial: ['menu'], errores: 0 }
    }).eq('telefono', phone)
    await mostrarMenuPrincipal(phone, sesion.nombre)
    return
  }

  // ==========================================
  // MÁQUINA DE ESTADOS DEL BOT
  // ==========================================

  // ESTADO 1: Captura Obligatoria de Nombre
  if (!sesion.nombre || sesion.estado === 'pedir_nombre') {
    const rawText = msg.text?.body?.trim()
    if (!rawText || sesion.estado !== 'pedir_nombre' || rawText.toLowerCase() === 'hola') {
      await supabase.from('wa_sesiones').update({ estado: 'pedir_nombre' }).eq('telefono', phone)
      await sendText(
        phone,
        '¡Hola! 🐟 Bienvenido a *El Puerto Cevichero de Willy*.\n\nPara poder registrar tu pedido y atenderte mejor, *¿cuál es tu nombre y apellido?*'
      )
      return
    }

    const nombreCliente = rawText.slice(0, 150)
    await supabase.from('wa_sesiones').update({
      nombre: nombreCliente,
      estado: 'menu',
      datos: { historial: ['menu'], errores: 0 }
    }).eq('telefono', phone)

    await sendText(phone, `¡Mucho gusto, *${nombreCliente}*! 🙌`)
    await mostrarMenuPrincipal(phone, nombreCliente)
    return
  }

  // ESTADO 2: Menú Principal y Navegación de Carta
  if (sesion.estado === 'inicio' || sesion.estado === 'menu') {
    if (replyId === 'ver_destacados') {
      const hist = pushHistorial(sesion.datos, 'destacados')
      await supabase.from('wa_sesiones').update({ datos: { ...sesion.datos, historial: hist } }).eq('telefono', phone)
      await mostrarPlatosDestacados(phone)
      return
    }

    if (replyId === 'ver_subcategorias' || replyId === 'ver_categorias') {
      const hist = pushHistorial(sesion.datos, 'subcategorias')
      await supabase.from('wa_sesiones').update({ datos: { ...sesion.datos, historial: hist } }).eq('telefono', phone)
      await mostrarSubcategorias(phone)
      return
    }

    if (replyId.startsWith('subcat_')) {
      const subcatKey = replyId.replace('subcat_', '')
      const hist = pushHistorial(sesion.datos, `subcat_${subcatKey}`)
      await supabase.from('wa_sesiones').update({ datos: { ...sesion.datos, historial: hist } }).eq('telefono', phone)
      await mostrarPlatosPorSubcategoria(phone, subcatKey, 0)
      return
    }

    if (replyId.startsWith('mas_subcat_')) {
      const parts = replyId.split('_')
      const subcatKey = parts[2]
      const offset = parseInt(parts[3]) || 0
      await mostrarPlatosPorSubcategoria(phone, subcatKey, offset)
      return
    }

    // Retrocompatibilidad con cat_ previa
    if (replyId.startsWith('cat_')) {
      const hist = pushHistorial(sesion.datos, 'subcategorias')
      await supabase.from('wa_sesiones').update({ datos: { ...sesion.datos, historial: hist } }).eq('telefono', phone)
      await mostrarSubcategorias(phone)
      return
    }

    if (replyId.startsWith('prod_')) {
      const idProd = parseInt(replyId.replace('prod_', ''))
      await iniciarSeleccionCantidad(phone, idProd, sesion)
      return
    }

    if (replyId === 'ver_carrito') {
      const hist = pushHistorial(sesion.datos, 'en_carrito')
      await supabase.from('wa_sesiones').update({ estado: 'en_carrito', datos: { ...sesion.datos, historial: hist } }).eq('telefono', phone)
      await mostrarResumenCarrito(phone, sesion)
      return
    }

    // Buscador Inteligente en Chat (Modelo Híbrido: escribe e.g. "ceviche mixto", "parihuela", "chicha")
    if (userText && userText.length >= 2) {
      await buscarPlatosPorTexto(phone, userText, sesion)
      return
    }

    // Texto no reconocido en menú: volver a mostrar
    await mostrarMenuPrincipal(phone, sesion.nombre)
    return
  }

  // ESTADO 3: Selección de Cantidad Rápida (1, 2 o Más Cantidades)
  if (sesion.estado === 'seleccion_cantidad') {
    const idProducto = sesion.datos?.producto_seleccionado

    if (replyId === 'cant_mas') {
      await supabase.from('wa_sesiones').update({
        estado: 'seleccion_cantidad_mas',
        datos: { ...sesion.datos, historial: pushHistorial(sesion.datos, 'seleccion_cantidad') }
      }).eq('telefono', phone)
      await mostrarListaMasCantidades(phone)
      return
    }

    let cantidad = 0
    if (replyId === 'cant_1') cantidad = 1
    if (replyId === 'cant_2') cantidad = 2

    // Si escribe número directamente
    if (!cantidad && msg.text?.body && !isNaN(parseInt(msg.text.body))) {
      cantidad = parseInt(msg.text.body)
    }

    if (cantidad >= 1 && cantidad <= 20) {
      await agregarProductoAlCarrito(phone, sesion, idProducto, cantidad)
      return
    } else if (cantidad > 20) {
      await derivarPedidoGrande(phone, cantidad)
      return
    }

    // Si escribe texto con otro plato, derivar a búsqueda
    if (userText && isNaN(parseInt(userText)) && userText.length >= 3) {
      await buscarPlatosPorTexto(phone, userText, sesion)
      return
    }

    await sendButtons(
      phone,
      '⚠️ Por favor selecciona una opción o escribe la cantidad deseada (ejemplo: *2* o *4*):',
      [
        { id: 'volver', title: '⬅️ Volver' },
        { id: 'pedir_asesor', title: '👨‍💼 Asesor' }
      ]
    )
    return
  }

  // ESTADO 3.1: Lista Extendida de Cantidades (3 a 8 o Personalizada)
  if (sesion.estado === 'seleccion_cantidad_mas') {
    const idProducto = sesion.datos?.producto_seleccionado

    if (replyId.startsWith('cant_') && replyId !== 'cant_otra') {
      const cant = parseInt(replyId.replace('cant_', ''))
      if (cant >= 1 && cant <= 20) {
        await agregarProductoAlCarrito(phone, sesion, idProducto, cant)
        return
      }
    }

    if (replyId === 'cant_otra') {
      await supabase.from('wa_sesiones').update({ estado: 'esperando_cantidad_escrita' }).eq('telefono', phone)
      await sendButtons(
        phone,
        '✍️ *Escribe la cantidad de porciones que deseas:*\n\n_(Ejemplo: 4 o 10)_',
        [
          { id: 'volver', title: '⬅️ Volver' },
          { id: 'pedir_asesor', title: '👨‍💼 Asesor' }
        ]
      )
      return
    }
  }

  // ESTADO 3.2: Esperando número escrito
  if (sesion.estado === 'esperando_cantidad_escrita') {
    const idProducto = sesion.datos?.producto_seleccionado
    const cant = parseInt(msg.text?.body || '0')

    if (cant > 20) {
      await derivarPedidoGrande(phone, cant)
      return
    }

    if (cant >= 1) {
      await agregarProductoAlCarrito(phone, sesion, idProducto, cant)
      return
    }

    await sendButtons(
      phone,
      '⚠️ Por favor escribe un número válido de porciones (ejemplo: 4 o 10):',
      [
        { id: 'volver', title: '⬅️ Volver' },
        { id: 'pedir_asesor', title: '👨‍💼 Asesor' }
      ]
    )
    return
  }

  // ESTADO 4: Carrito y Edición (Quitar plato)
  if (sesion.estado === 'en_carrito') {
    if (replyId === 'seguir_pidiendo') {
      await supabase.from('wa_sesiones').update({
        estado: 'menu',
        datos: { ...sesion.datos, historial: ['menu'] }
      }).eq('telefono', phone)
      await mostrarMenuPrincipal(phone, sesion.nombre)
      return
    }

    if (replyId === 'confirmar_pedido' || replyId === 'proceder_pago') {
      const hist = pushHistorial(sesion.datos, 'en_carrito')
      await supabase.from('wa_sesiones').update({ datos: { ...sesion.datos, historial: hist } }).eq('telefono', phone)
      await pedirMetodoPago(phone, sesion)
      return
    }

    if (replyId === 'quitar_plato') {
      await supabase.from('wa_sesiones').update({
        estado: 'quitar_plato',
        datos: { ...sesion.datos, historial: pushHistorial(sesion.datos, 'en_carrito') }
      }).eq('telefono', phone)
      await mostrarListaQuitarPlatos(phone, sesion)
      return
    }

    // Si escribe el nombre de otro plato para seguir pidiendo directamente
    if (userText && userText.length >= 2) {
      await buscarPlatosPorTexto(phone, userText, sesion)
      return
    }
  }

  // ESTADO 4.1: Quitar plato específico del carrito
  if (sesion.estado === 'quitar_plato') {
    if (replyId.startsWith('del_')) {
      const idProdEliminar = parseInt(replyId.replace('del_', ''))
      const carrito = Array.isArray(sesion.carrito) ? [...sesion.carrito] : []
      const nuevoCarrito = carrito.filter(item => item.idproducto !== idProdEliminar)

      await supabase.from('wa_sesiones').update({
        carrito: nuevoCarrito,
        estado: 'en_carrito'
      }).eq('telefono', phone)

      sesion.carrito = nuevoCarrito
      if (nuevoCarrito.length === 0) {
        await sendText(phone, '🗑️ Has eliminado todos los platos de tu pedido.')
        await mostrarMenuPrincipal(phone, sesion.nombre)
        return
      }

      await sendText(phone, '🗑️ Plato eliminado con éxito.')
      await mostrarResumenCarrito(phone, sesion)
      return
    }
  }

  // ESTADO 5: Selección de Método de Pago
  if (sesion.estado === 'seleccion_pago') {
    let metodo = ''
    if (replyId === 'pago_yape') metodo = 'Yape'
    if (replyId === 'pago_plin') metodo = 'Plin'
    if (replyId === 'pago_efectivo') metodo = 'Efectivo'

    if (metodo === 'Efectivo') {
      const hist = pushHistorial(sesion.datos, 'seleccion_pago')
      await supabase.from('wa_sesiones').update({
        estado: 'esperando_vuelto',
        datos: { ...sesion.datos, metodo_pago: 'Efectivo', historial: hist }
      }).eq('telefono', phone)

      const total = calcularTotalCarrito(sesion.carrito)
      await sendButtons(
        phone,
        `💵 Tu total es *S/ ${total.toFixed(2)}*.\n\n*¿Con cuánto vas a pagar en efectivo?*\nEscribe el monto (ejemplo: *50* o *100*) para que el repartidor lleve tu vuelto listo:`,
        [
          { id: 'volver', title: '⬅️ Volver' },
          { id: 'pedir_asesor', title: '👨‍💼 Asesor' }
        ],
        'Pago contra entrega'
      )
      return
    } else if (metodo === 'Yape' || metodo === 'Plin') {
      const hist = pushHistorial(sesion.datos, 'seleccion_pago')
      await supabase.from('wa_sesiones').update({
        estado: 'esperando_ubicacion',
        datos: { ...sesion.datos, metodo_pago: metodo, paga_con: 0, historial: hist }
      }).eq('telefono', phone)

      await sendText(
        phone,
        `📲 Has elegido *${metodo}*.\nPodrás pagar al momento de recibir tu pedido o transferir al número del restaurante.`
      )
      await pedirUbicacion(phone)
      return
    }
  }

  // ESTADO 5.1: Esperando Monto en Efectivo
  if (sesion.estado === 'esperando_vuelto') {
    const montoText = msg.text?.body?.replace(/[^0-9.]/g, '') || '0'
    const pagaCon = parseFloat(montoText) || 0
    const total = calcularTotalCarrito(sesion.carrito)

    if (pagaCon >= total) {
      const hist = pushHistorial(sesion.datos, 'esperando_vuelto')
      await supabase.from('wa_sesiones').update({
        estado: 'esperando_ubicacion',
        datos: { ...sesion.datos, paga_con: pagaCon, historial: hist, errores: 0 }
      }).eq('telefono', phone)

      const vuelto = pagaCon - total
      if (vuelto > 0) {
        await sendText(phone, `💵 Perfecto. Pagas con *S/ ${pagaCon.toFixed(2)}*. Tu vuelto será de *S/ ${vuelto.toFixed(2)}*.`)
      }
      await pedirUbicacion(phone)
      return
    } else {
      await registrarErrorEntrada(
        phone,
        sesion,
        `⚠️ El monto debe ser mayor o igual al total de tu pedido (*S/ ${total.toFixed(2)}*). Escribe con cuánto vas a pagar:`
      )
      return
    }
  }

  // ESTADO 6: Ubicación y Dirección
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
      await registrarErrorEntrada(
        phone,
        sesion,
        '📍 Por favor comparte tu ubicación GPS de WhatsApp o escribe tu dirección y referencia:'
      )
      return
    }

    // Registrar Pedido Final
    await registrarPedidoFinal(phone, sesion, direccion, lat, lng)
    return
  }
}

// ==========================================
// VISTAS Y MENÚS INTERACTIVOS (MODELO HÍBRIDO)
// ==========================================

async function mostrarMenuPrincipal(phone: string, nombre: string) {
  await sendButtons(
    phone,
    `🍽️ *El Puerto Cevichero de Willy*\n¡Hola ${nombre || 'amigo'}! ¿Cómo deseas armar tu pedido hoy?\n\n💡 *Buscador rápido:* También puedes escribir directamente el plato que buscas (ejemplo: _"ceviche mixto"_, _"arroz con marisco"_, _"parihuela"_, _"chicha"_).`,
    [
      { id: 'ver_destacados', title: '⭐ Más pedidos' },
      { id: 'ver_subcategorias', title: '📖 Toda la carta' },
      { id: 'pedir_asesor', title: '👨‍💼 Asesor' }
    ],
    'El Puerto Cevichero de Willy'
  )
}

async function mostrarPlatosDestacados(phone: string) {
  // Consultar platos activos en chatbot para los destacados
  const { data: dbDestacados } = await supabase
    .from('producto')
    .select('idproducto, nombre, preciounitario, en_chatbot')
    .in('idproducto', PLATOS_DESTACADOS.map(p => p.id))
    .eq('en_chatbot', true)
    .is('deleted', null)

  const activosIds = new Set((dbDestacados || []).map(p => p.idproducto))
  // Si hay platos marcados en BD, mostramos solo esos; de lo contrario fallback a PLATOS_DESTACADOS
  const platosAMostrar = activosIds.size > 0
    ? PLATOS_DESTACADOS.filter(p => activosIds.has(p.id))
    : PLATOS_DESTACADOS

  const rows = platosAMostrar.map(p => ({
    id: `prod_${p.id}`,
    title: p.nombre.slice(0, 24),
    description: `S/ ${p.precio.toFixed(2)} - ${p.cat}`.slice(0, 72)
  }))

  // Filas fijas de navegación (Tope de 10 filas de Meta)
  rows.push({
    id: 'volver',
    title: '⬅️ Volver',
    description: 'Regresar al Menú Principal'
  })
  rows.push({
    id: 'pedir_asesor',
    title: '👨‍💼 Hablar con Asesor',
    description: 'Atención personalizada'
  })

  await sendList(
    phone,
    '⭐ Platos Más Pedidos',
    'Selecciona un plato para agregarlo a tu pedido:',
    'Ver Platos',
    [{ title: 'Especialidades', rows }]
  )
}

async function mostrarSubcategorias(phone: string) {
  const rows = SUBCATEGORIAS.map(s => ({
    id: `subcat_${s.id}`,
    title: s.nombre.slice(0, 24),
    description: s.desc.slice(0, 72)
  }))

  // Filas fijas (Total exactamente 10 filas = 8 subcategorías + 2 navegación)
  rows.push({
    id: 'volver',
    title: '⬅️ Volver',
    description: 'Regresar al Menú Principal'
  })
  rows.push({
    id: 'pedir_asesor',
    title: '👨‍💼 Hablar con Asesor',
    description: 'Atención personalizada'
  })

  await sendList(
    phone,
    '📖 Carta Cevichera',
    'Selecciona una categoría para ver los platos disponibles:',
    'Ver Categorías',
    [{ title: 'Nuestra Carta', rows }]
  )
}

async function mostrarCategorias(phone: string) {
  await mostrarSubcategorias(phone)
}

async function mostrarPlatosPorSubcategoria(phone: string, subcatKey: string, offset: number = 0) {
  const subcat = SUBCATEGORIAS.find(s => s.id === subcatKey) || {
    id: subcatKey,
    nombre: 'Platos Disponibles',
    desc: ''
  }

  // Filtrar solo platos marcados para vender en Chatbot
  let { data: todos, error } = await supabase
    .from('producto')
    .select('idproducto, nombre, preciounitario, idcategoria, en_chatbot')
    .is('deleted', null)
    .not('preciounitario', 'is', null)
    .gt('preciounitario', 0)
    .eq('en_chatbot', true)

  // Resiliencia: si la columna en_chatbot aún no existe en BD, cargar sin filtro
  if (error && (error as any).code === '42703') {
    const res = await supabase
      .from('producto')
      .select('idproducto, nombre, preciounitario, idcategoria')
      .is('deleted', null)
      .not('preciounitario', 'is', null)
      .gt('preciounitario', 0)
    todos = res.data
  }

  if (!todos || todos.length === 0) {
    await sendButtons(
      phone,
      'No hay platos disponibles en este momento.',
      [
        { id: 'volver', title: '⬅️ Volver' },
        { id: 'pedir_asesor', title: '👨‍💼 Asesor' }
      ]
    )
    return
  }

  const filtrados = todos
    .filter(p => matchesSubcategory(p.nombre, p.idcategoria, subcatKey))
    .sort((a, b) => a.nombre.localeCompare(b.nombre))

  if (filtrados.length === 0) {
    await sendButtons(
      phone,
      `No se encontraron platos en ${subcat.nombre}.`,
      [
        { id: 'volver', title: '⬅️ Volver' },
        { id: 'pedir_asesor', title: '👨‍💼 Asesor' }
      ]
    )
    return
  }

  // Paginación limpia: 6 platos por tanda para no saturar WhatsApp y cumplir tope de 10 filas de Meta
  const pageItems = filtrados.slice(offset, offset + 6)
  const rows: any[] = pageItems.map(p => ({
    id: `prod_${p.idproducto}`,
    title: p.nombre.slice(0, 24),
    description: `S/ ${Number(p.preciounitario).toFixed(2)}`
  }))

  if (offset + 6 < filtrados.length) {
    rows.push({
      id: `mas_subcat_${subcatKey}_${offset + 6}`,
      title: '➡️ Ver más platos',
      description: `Ver siguientes (${filtrados.length - (offset + 6)} restantes)`
    })
  }

  rows.push({
    id: 'volver',
    title: '⬅️ Volver',
    description: 'Regresar a la carta'
  })
  rows.push({
    id: 'pedir_asesor',
    title: '👨‍💼 Hablar con Asesor',
    description: 'Atención personalizada'
  })

  await sendList(
    phone,
    subcat.nombre.slice(0, 60),
    'Selecciona un plato para agregarlo a tu orden:',
    'Ver Platos',
    [{ title: subcat.nombre.slice(0, 24), rows }]
  )
}

async function mostrarPlatosPorCategoria(phone: string, idCategoria: number, offset: number = 0) {
  await mostrarPlatosPorSubcategoria(phone, 'ceviches', offset)
}

// ==========================================
// BUSCADOR INTELIGENTE EN CHAT
// ==========================================

async function buscarPlatosPorTexto(phone: string, query: string, sesion: any) {
  let { data: prods, error } = await supabase
    .from('producto')
    .select('idproducto, nombre, preciounitario, imagen, en_chatbot')
    .is('deleted', null)
    .not('preciounitario', 'is', null)
    .gt('preciounitario', 0)
    .eq('en_chatbot', true)

  // Resiliencia si la columna aún no existe
  if (error && (error as any).code === '42703') {
    const res = await supabase
      .from('producto')
      .select('idproducto, nombre, preciounitario, imagen')
      .is('deleted', null)
      .not('preciounitario', 'is', null)
      .gt('preciounitario', 0)
    prods = res.data
  }

  if (!prods || prods.length === 0) {
    await sendText(phone, 'No pudimos consultar la carta en este momento. Por favor elige una categoría:')
    await mostrarSubcategorias(phone)
    return
  }

  const matches = prods.filter(p => matchProduct(p.nombre, query))

  // Caso 1: Coincidencia única exacta -> Lleva directo a seleccionar porciones
  if (matches.length === 1) {
    const plato = matches[0]
    await sendText(phone, `🎯 ¡Excelente elección! Encontré *${plato.nombre}* (S/ ${Number(plato.preciounitario).toFixed(2)}).`)
    await iniciarSeleccionCantidad(phone, plato.idproducto, sesion)
    return
  }

  // Caso 2: Múltiples coincidencias (entre 2 y 7 platos) -> Muestra lista interactiva de resultados
  if (matches.length >= 2 && matches.length <= 7) {
    const rows: any[] = matches.map(p => ({
      id: `prod_${p.idproducto}`,
      title: p.nombre.slice(0, 24),
      description: `S/ ${Number(p.preciounitario).toFixed(2)}`
    }))

    rows.push({
      id: 'volver',
      title: '⬅️ Volver',
      description: 'Regresar al Menú Principal'
    })
    rows.push({
      id: 'pedir_asesor',
      title: '👨‍💼 Hablar con Asesor',
      description: 'Atención personalizada'
    })

    await sendList(
      phone,
      '🔍 Resultados de Búsqueda',
      `Encontré estos ${matches.length} platos que coinciden con "*${query}*":`,
      'Ver Platos',
      [{ title: 'Resultados Encontrados', rows }]
    )
    return
  }

  // Caso 3: Demasiadas coincidencias (> 7 platos) -> Muestra los primeros 6 y pide afinar búsqueda
  if (matches.length > 7) {
    const rows: any[] = matches.slice(0, 6).map(p => ({
      id: `prod_${p.idproducto}`,
      title: p.nombre.slice(0, 24),
      description: `S/ ${Number(p.preciounitario).toFixed(2)}`
    }))

    rows.push({
      id: 'volver',
      title: '⬅️ Volver',
      description: 'Regresar al Menú Principal'
    })
    rows.push({
      id: 'pedir_asesor',
      title: '👨‍💼 Hablar con Asesor',
      description: 'Atención personalizada'
    })

    await sendList(
      phone,
      '🔍 Resultados de Búsqueda',
      `Encontré ${matches.length} platos para "*${query}*". Aquí tienes los principales (o sé más específico):`,
      'Ver Platos',
      [{ title: 'Resultados Destacados', rows }]
    )
    return
  }

  // Caso 4: No se encontraron platos con esa palabra clave
  await sendText(
    phone,
    `🔍 No encontré platos que coincidan con "*${query}*".\n\n💡 *Tip:* Prueba buscando por palabras como *ceviche*, *arroz*, *chicha*, *parihuela*, o explora nuestra carta organizada por categorías:`
  )
  await mostrarSubcategorias(phone)
}

// ==========================================
// SELECCIÓN DE CANTIDAD Y PEDIDO
// ==========================================

async function iniciarSeleccionCantidad(phone: string, idProducto: number, sesion: any) {
  const { data: prod } = await supabase
    .from('producto')
    .select('idproducto, nombre, preciounitario, imagen, en_chatbot')
    .eq('idproducto', idProducto)
    .single()

  if (!prod) return

  if (prod.en_chatbot === false) {
    await sendText(phone, '⚠️ Lo sentimos, este plato no se encuentra disponible actualmente en la carta de WhatsApp.')
    await repintarPantalla(phone, sesion, 'menu')
    return
  }

  const hist = pushHistorial(sesion.datos, 'menu')
  await supabase.from('wa_sesiones').update({
    estado: 'seleccion_cantidad',
    datos: { ...sesion.datos, producto_seleccionado: idProducto, historial: hist }
  }).eq('telefono', phone)

  const bodyText = `🐟 *${prod.nombre}*\nPrecio: S/ ${Number(prod.preciounitario).toFixed(2)}\n\n¿Cuántas porciones deseas?`
  const botones = [
    { id: 'cant_1', title: '1 porción' },
    { id: 'cant_2', title: '2 porciones' },
    { id: 'cant_mas', title: '➕ Más cantidades' }
  ]

  // Enviar con foto si el producto la tiene
  if (prod.imagen && (prod.imagen.startsWith('http://') || prod.imagen.startsWith('https://'))) {
    await sendButtonsWithImage(phone, prod.imagen, bodyText, botones, 'Escribe VOLVER o ASESOR si necesitas')
  } else {
    await sendButtons(phone, bodyText, botones, 'Escribe VOLVER o ASESOR si necesitas')
  }
}

async function mostrarListaMasCantidades(phone: string) {
  const rows = [
    { id: 'cant_3', title: '3 porciones', description: 'Porciones estándar' },
    { id: 'cant_4', title: '4 porciones', description: 'Porciones estándar' },
    { id: 'cant_5', title: '5 porciones', description: 'Porciones familiares' },
    { id: 'cant_6', title: '6 porciones', description: 'Porciones familiares' },
    { id: 'cant_7', title: '7 porciones', description: 'Porciones para grupo' },
    { id: 'cant_8', title: '8 porciones', description: 'Porciones para grupo' },
    { id: 'cant_otra', title: '✍️ Otra cantidad', description: 'Escribir número personalizado' },
    { id: 'volver', title: '⬅️ Volver', description: 'Regresar al plato' },
    { id: 'pedir_asesor', title: '👨‍💼 Asesor', description: 'Hablar con una persona' }
  ]

  await sendList(
    phone,
    'Elegir Cantidad',
    'Selecciona cuántas porciones deseas ordenar:',
    'Ver Cantidades',
    [{ title: 'Opciones de Cantidad', rows }]
  )
}

async function derivarPedidoGrande(phone: string, cantidad: number) {
  await supabase.from('wa_sesiones').update({ modo: 'humano' }).eq('telefono', phone)
  await sendButtons(
    phone,
    `👨‍🍳 Has indicado *${cantidad} porciones*.\n\nPara pedidos mayores a 20 porciones (pedidos grandes / banquetes), un asesor se comunicará contigo de inmediato por este chat para coordinar el tiempo de preparación y facilidades de pago.`,
    [{ id: 'volver_bot', title: '🤖 Volver al Bot' }],
    'Atención para eventos y banquetes'
  )
}

async function agregarProductoAlCarrito(phone: string, sesion: any, idProducto: number, cantidad: number) {
  const { data: producto } = await supabase
    .from('producto')
    .select('idproducto, nombre, preciounitario, en_chatbot')
    .eq('idproducto', idProducto)
    .single()

  if (!producto) return

  if (producto.en_chatbot === false) {
    await sendText(phone, '⚠️ Lo sentimos, este plato ya no está disponible para pedidos por WhatsApp.')
    await repintarPantalla(phone, sesion, 'menu')
    return
  }

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

  const hist = pushHistorial(sesion.datos, 'menu')
  await supabase.from('wa_sesiones').update({
    carrito: carrito,
    estado: 'en_carrito',
    datos: { ...sesion.datos, producto_seleccionado: null, historial: hist, errores: 0 }
  }).eq('telefono', phone)

  sesion.carrito = carrito
  await mostrarResumenCarrito(phone, sesion, `✅ Agregado: *${cantidad}x ${producto.nombre}* (S/ ${(cantidad * pu).toFixed(2)})`)
}

function calcularTotalCarrito(carrito: any[]) {
  if (!Array.isArray(carrito)) return 0
  return carrito.reduce((sum, item) => sum + (Number(item.total) || 0), 0)
}

async function mostrarResumenCarrito(phone: string, sesion: any, mensajeExito?: string) {
  const carrito = sesion.carrito || []
  if (carrito.length === 0) {
    await sendText(phone, '🛒 Tu carrito está vacío. ¡Elige un plato para empezar!')
    await mostrarMenuPrincipal(phone, sesion.nombre)
    return
  }

  let resumen = mensajeExito ? `${mensajeExito}\n\n` : ''
  resumen += '🛒 *Tu Pedido Actual:*\n\n'
  carrito.forEach((item: any) => {
    resumen += `• ${item.cantidad}x ${item.nombre} - S/ ${Number(item.total).toFixed(2)}\n`
  })
  const total = calcularTotalCarrito(carrito)
  resumen += `\n*TOTAL: S/ ${total.toFixed(2)}*`

  await sendButtons(
    phone,
    resumen,
    [
      { id: 'confirmar_pedido', title: '🛍️ Finalizar pedido' },
      { id: 'seguir_pidiendo', title: '➕ Seguir pidiendo' },
      { id: 'quitar_plato', title: '✏️ Quitar un plato' }
    ],
    'Escribe CANCELAR o ASESOR si necesitas'
  )
}

async function mostrarListaQuitarPlatos(phone: string, sesion: any) {
  const carrito = sesion.carrito || []
  const rows: any[] = carrito.map((item: any) => ({
    id: `del_${item.idproducto}`,
    title: `${item.cantidad}x ${item.nombre}`.slice(0, 24),
    description: `S/ ${Number(item.total).toFixed(2)} - Toca para eliminar`.slice(0, 72)
  }))

  rows.push({
    id: 'volver',
    title: '⬅️ Volver',
    description: 'Regresar al carrito'
  })
  rows.push({
    id: 'cancelar_todo',
    title: '🗑️ Cancelar todo',
    description: 'Vaciar todo el pedido'
  })

  await sendList(
    phone,
    'Quitar Plato',
    'Selecciona el plato que deseas eliminar de tu orden:',
    'Eliminar Plato',
    [{ title: 'Platos en tu carrito', rows: rows.slice(0, 10) }]
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
    ],
    'Escribe VOLVER o ASESOR si lo requieres'
  )
}

async function pedirUbicacion(phone: string) {
  await sendButtons(
    phone,
    '📍 *Último paso:* Comparte tu *Ubicación en tiempo real / GPS* mediante el botón 📎 de WhatsApp, o escribe tu *Dirección exacta y referencia* (Ej: Jr. Los Pinos 123, frente al parque):',
    [
      { id: 'volver', title: '⬅️ Volver' },
      { id: 'pedir_asesor', title: '👨‍💼 Asesor' }
    ],
    'Entrega a domicilio'
  )
}

// Control proactivo de errores de entrada consecutivos
async function registrarErrorEntrada(phone: string, sesion: any, mensajeError: string) {
  const errores = (sesion.datos?.errores || 0) + 1
  await supabase.from('wa_sesiones').update({
    datos: { ...sesion.datos, errores: errores }
  }).eq('telefono', phone)

  if (errores >= 2) {
    await sendButtons(
      phone,
      '🤝 ¿Te gustaría que te atienda una persona de nuestro equipo?',
      [
        { id: 'pedir_asesor', title: '👨‍💼 Sí, con un asesor' },
        { id: 'seguir_bot', title: '🤖 Seguir con el bot' }
      ]
    )
  } else {
    await sendText(phone, mensajeError)
  }
}

// ==========================================
// REGISTRO DEL PEDIDO EN BASE DE DATOS
// ==========================================

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

  const pedidoData = {
    cliente: sesion.nombre || 'Cliente WhatsApp',
    mesa: 0, // 0 = DELIVERY
    estado: '1', // 1 = PENDIENTE / NO COBRADO (EL MOZO O REPARTIDOR COBRA)
    total_pedidos: totalPedidos,
    fecha: fechaLima,
    idmozo: 1, // Mozo 1 = "Delivery"
    total: total,
    comentarios: comentario
  }

  const detalles = carrito.map((item: any) => ({
    idproducto: item.idproducto,
    cantidad: item.cantidad,
    preciounitario: item.preciounitario,
    lugarpedido: '1' // 1 = Para llevar / Delivery
  }))

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

  // Limpiar sesión para nuevo pedido
  await supabase.from('wa_sesiones').update({
    estado: 'inicio',
    carrito: [],
    datos: { historial: ['menu'], errores: 0 }
  }).eq('telefono', phone)

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
