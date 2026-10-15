import { createClient } from 'npm:@supabase/supabase-js@2'

const VERIFY_TOKEN = Deno.env.get('WHATSAPP_VERIFY_TOKEN') || 'cevicheria_willy_seguro_2026'
const GRAPH_API_TOKEN = Deno.env.get('WHATSAPP_ACCESS_TOKEN') || 'EAANNNuVBiJsBSoDsBQzhZBrP6Lldi8q7q8g5KANtcKWI5SpXR1QvBQ0YnAoZCxuSiZBVD9nevRu4cxu00vgom5mAvFdbMXqWAWDRKSqbdoNVb7YpO5eZA9KbgL5pTuO9GXUyCtp1q5cGzvKOrnmZBOJgsMDVgnvwTNy04BPjf7vFtpNa1ESsaPGcVTaZAgwAZDZD'
const envPhoneId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')
// Si el secreto de Supabase aún tiene el ID de prueba de Meta (1089514050604081), usar el número de producción
const PHONE_NUMBER_ID = (envPhoneId && envPhoneId !== '1089514050604081') ? envPhoneId : '1411155722076604'
let currentIncomingPhoneId = PHONE_NUMBER_ID
const NUMERO_ASESOR = Deno.env.get('WHATSAPP_ASESOR_PHONE') || '51991687503'

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

// ==========================================
// MOTOR NLP DE BÚSQUEDA INTELIGENTE EN ESPAÑOL (100% GRATIS)
// ==========================================

const STOP_WORDS = new Set([
  'un', 'una', 'unos', 'unas', 'el', 'la', 'los', 'las', 'lo',
  'al', 'del', 'de', 'con', 'sin', 'y', 'e', 'o', 'u', 'en', 'por', 'para',
  'quiero', 'quier', 'quisiera', 'kiero', 'kero', 'dame', 'deme', 'trae', 'traeme', 'deseo', 'sirve', 'sirveme',
  'vende', 'venden', 'tienen', 'hay', 'tienes',
  'plato', 'platos', 'comida', 'pedido', 'orden', 'carta',
  'favor', 'porfa', 'porfavor', 'gracias',
  'buenas', 'buenos', 'dias', 'tardes', 'noches', 'hola', 'amigo', 'amiga',
  'precio', 'cuanto', 'cuesta', 'vale', 'costo', 'comprar', 'pedir',
  'uno', 'dos', 'tres', 'cuatro', '1', '2', '3', '4'
])

function stemWord(word: string): string {
  let w = word
  // Quitar diminutivos comunes peruanos (chaufita -> chaufa, cevichito -> ceviche)
  w = w.replace(/(itos|itas|ito|ita)$/, '')
  // Plurales en español
  if (w.endsWith('es') && w.length > 4) {
    w = w.slice(0, -2)
  } else if (w.endsWith('s') && w.length > 3) {
    w = w.slice(0, -1)
  }
  return w
}

function levenshteinDistance(a: string, b: string): number {
  const al = a.length
  const bl = b.length
  if (al === 0) return bl
  if (bl === 0) return al

  const row = new Array(bl + 1)
  for (let j = 0; j <= bl; j++) row[j] = j

  for (let i = 1; i <= al; i++) {
    let prev = i
    for (let j = 1; j <= bl; j++) {
      const val = a[i - 1] === b[j - 1] ? row[j - 1] : Math.min(row[j - 1], prev, row[j]) + 1
      row[j - 1] = prev
      prev = val
    }
    row[bl] = prev
  }

  return row[bl]
}

function calculateProductScore(prodName: string, userQuery: string): number {
  const normProd = normalizeText(prodName)
  const normQuery = normalizeText(userQuery)

  if (!normQuery) return 0
  if (normProd === normQuery) return 100

  // 1. Extraer palabras clave eliminando stopwords conversacionales
  const rawTokens = normQuery.split(/[\s,+/()_-]+/).filter(Boolean)
  let keywords = rawTokens.filter(t => !STOP_WORDS.has(t))
  if (keywords.length === 0) keywords = rawTokens

  const prodTokens = normProd.split(/[\s,+/()_-]+/).filter(Boolean)
  const prodStems = prodTokens.map(stemWord)

  let score = 0
  let matchedKeywords = 0

  for (const kw of keywords) {
    const kwStem = stemWord(kw)
    let bestMatchForThisKw = 0

    for (let i = 0; i < prodTokens.length; i++) {
      const pt = prodTokens[i]
      const ptStem = prodStems[i]

      // Coincidencia exacta de palabra
      if (pt === kw) {
        bestMatchForThisKw = Math.max(bestMatchForThisKw, 40)
        continue
      }

      // Coincidencia de raíz (stem / diminutivo / plural)
      if (ptStem === kwStem || (kwStem.length >= 4 && ptStem.startsWith(kwStem)) || (ptStem.length >= 4 && kwStem.startsWith(ptStem))) {
        // Excepción de negocio: "chicha" no debe confundirse con "chicharron"
        if (kw.startsWith('chicha') && pt.startsWith('chicharr')) continue
        if (kw.startsWith('chicharr') && pt === 'chicha') continue

        bestMatchForThisKw = Math.max(bestMatchForThisKw, 35)
        continue
      }

      // Tolerancia a errores ortográficos (Levenshtein)
      if (kw.length >= 4) {
        const dist = levenshteinDistance(kw, pt)
        if (dist === 1) {
          if (kw.startsWith('chicha') && pt.startsWith('chicharr')) continue
          bestMatchForThisKw = Math.max(bestMatchForThisKw, 28)
        } else if (dist === 2 && kw.length >= 6) {
          bestMatchForThisKw = Math.max(bestMatchForThisKw, 18)
        }
      }
    }

    if (bestMatchForThisKw > 0) {
      score += bestMatchForThisKw
      matchedKeywords++
    }
  }

  // Bonus por coincidencia de frase limpia completa (ej: "arroz mariscos")
  const cleanPhrase = keywords.join(' ')
  if (cleanPhrase && normProd.includes(cleanPhrase)) {
    const isChichaConfusion = cleanPhrase.startsWith('chicha') && !cleanPhrase.startsWith('chicharr') && normProd.includes('chicharr')
    if (!isChichaConfusion) {
      score += 30
    }
  }

  // Penalización ponderada si solo coincidió una fracción de las palabras clave
  if (keywords.length > 1 && matchedKeywords < keywords.length) {
    score = score * (matchedKeywords / keywords.length)
  }

  return Math.round(score)
}

function matchProduct(prodName: string, query: string): boolean {
  return calculateProductScore(prodName, query) >= 25
}

// ==========================================
// HELPERS PARA COMUNICACIÓN CON WHATSAPP API
// ==========================================

async function sendWhatsAppMessage(to: string, messageData: any) {
  const activePhoneId = currentIncomingPhoneId || PHONE_NUMBER_ID || '1411155722076604'
  if (!GRAPH_API_TOKEN) {
    console.error('WHATSAPP_ACCESS_TOKEN no configurado')
    return null
  }
  try {
    const res = await fetch(`https://graph.facebook.com/v22.0/${activePhoneId}/messages`, {
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
    if (json.error) {
      console.error('Error enviando mensaje WhatsApp Meta API:', JSON.stringify(json.error))
      try {
        await supabase.from('wa_mensajes').insert({
          telefono: to,
          sentido: 'out_error',
          tipo: 'error',
          contenido: json.error,
          wa_message_id: 'meta_err_' + Date.now()
        })
      } catch (_) {}
    }
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

async function sendCtaUrlButton(to: string, header: string, body: string, buttonText: string, url: string, footer?: string) {
  const interactive: any = {
    type: 'cta_url',
    body: { text: body.slice(0, 1024) },
    action: {
      name: 'cta_url',
      parameters: {
        display_text: buttonText.slice(0, 20),
        url: url
      }
    }
  }
  if (header) {
    interactive.header = { type: 'text', text: header.slice(0, 60) }
  }
  if (footer) {
    interactive.footer = { text: footer.slice(0, 60) }
  }
  return await sendWhatsAppMessage(to, { type: 'interactive', interactive })
}

async function transferirAAsesor(phone: string, sesion: any) {
  const nombreCliente = sesion?.nombre || 'Cliente'
  const waUrl = `https://wa.me/${NUMERO_ASESOR}?text=${encodeURIComponent(`Hola, soy ${nombreCliente} y solicito atención con mi pedido en El Puerto Cevichero`)}`

  // 1. Enviar botón nativo interactivo para chatear directamente con el asesor humano
  await sendCtaUrlButton(
    phone,
    '👨‍💼 Atención Personalizada',
    `¡Hola *${nombreCliente}*! Para comunicarte directamente con nuestro asesor en el restaurante, toca el botón de abajo:\n\n_Tu pedido y carrito de compras seguirán guardados._`,
    '💬 Hablar con Asesor',
    waUrl,
    'El Puerto Cevichero de Willy'
  )

  // 2. Notificar inmediatamente al WhatsApp del asesor humano (991 687 503)
  try {
    const carrito = sesion?.carrito || []
    let detalleCarrito = 'Sin platos seleccionados aún'
    if (carrito.length > 0) {
      detalleCarrito = carrito.map((i: any) => `• ${i.cantidad}x ${i.nombre} (S/ ${Number(i.total).toFixed(2)})`).join('\n')
    }
    const mensajeAlAsesor = `🚨 *SOLICITUD DE ASESOR - EL PUERTO CEVICHERO* 🚨\n\n👤 *Cliente:* ${nombreCliente}\n📱 *Teléfono:* +${phone}\n🛒 *Carrito:* \n${detalleCarrito}\n\n👉 *Escríbele directamente:* https://wa.me/${phone}`
    await sendText(NUMERO_ASESOR, mensajeAlAsesor)
  } catch (err) {
    console.error('Error notificando al asesor humano:', err)
  }
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
  } else if (paso === 'esperando_observaciones') {
    await supabase.from('wa_sesiones').update({ estado: 'esperando_observaciones' }).eq('telefono', phone)
    await pedirObservacionesCocina(phone, sesion)
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

      const metadataPhoneId = value?.metadata?.phone_number_id
      if (metadataPhoneId && metadataPhoneId !== '1089514050604081') {
        currentIncomingPhoneId = metadataPhoneId
      }
      const contactProfileName = value?.contacts?.[0]?.profile?.name || ''

      const msg = messages[0]
      const from = msg.from
      const msgId = msg.id

      try {
        await handleIncomingMessage(from, msg, msgId, contactProfileName)
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

async function handleIncomingMessage(phone: string, msg: any, msgId: string, contactProfileName: string = '') {
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
    const defaultName = contactProfileName ? contactProfileName.trim() : ''
    const { data: nueva } = await supabase
      .from('wa_sesiones')
      .insert({
        telefono: phone,
        nombre: defaultName,
        estado: 'menu',
        carrito: [],
        datos: { historial: ['menu'], errores: 0 },
        modo: 'bot'
      })
      .select()
      .single()
    sesion = nueva
  } else if (!sesion.nombre && contactProfileName) {
    sesion.nombre = contactProfileName.trim()
    await supabase.from('wa_sesiones').update({ nombre: sesion.nombre }).eq('telefono', phone)
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
    await transferirAAsesor(phone, sesion)
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

  // Manejo de recepción de imágenes (captura de comprobante / Yape / Plin)
  if (msg.type === 'image' && sesion.estado !== 'esperando_ubicacion') {
    await sendText(
      phone,
      '📸 ¡Captura de pantalla recibida con éxito! 🙌\nNuestro equipo verificará tu constancia de pago al preparar y despachar tu pedido. ¡Muchas gracias!'
    )
    return
  }

  // ==========================================
  // MÁQUINA DE ESTADOS DEL BOT
  // ==========================================

  // ESTADO 1: Captura Obligatoria de Nombre (solo si no viene de una interacción de botones o carta)
  if ((!sesion.nombre || sesion.estado === 'pedir_nombre') && !replyId && !userText.startsWith('prod_')) {
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
      await pedirObservacionesCocina(phone, sesion)
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

  // ESTADO 4.2: Observaciones e Indicaciones para Cocina (Sin ají, sin camote, etc.)
  if (sesion.estado === 'esperando_observaciones') {
    if (replyId === 'obs_continuar' || replyId === 'obs_normal' || userText === 'continuar' || userText === 'todo normal' || userText === 'normal' || userText === 'todo bien' || userText === 'nada' || userText === 'ninguna' || userText === 'sin cambios') {
      const hist = pushHistorial(sesion.datos, 'esperando_observaciones')
      await supabase.from('wa_sesiones').update({
        estado: 'seleccion_pago',
        datos: { ...sesion.datos, observaciones: '', historial: hist }
      }).eq('telefono', phone)
      sesion.datos = { ...sesion.datos, observaciones: '' }
      await pedirMetodoPago(phone, sesion)
      return
    }

    if (replyId === 'obs_sin_aji') {
      const hist = pushHistorial(sesion.datos, 'esperando_observaciones')
      await supabase.from('wa_sesiones').update({
        estado: 'seleccion_pago',
        datos: { ...sesion.datos, observaciones: 'Sin ají', historial: hist }
      }).eq('telefono', phone)
      sesion.datos = { ...sesion.datos, observaciones: 'Sin ají' }
      await sendText(phone, '🌶️❌ ¡Anotado para la cocina! "*Sin ají*". 👨‍🍳👍')
      await pedirMetodoPago(phone, sesion)
      return
    }

    // Si el usuario escribe texto directamente con su observación
    const textoIngresado = msg.text?.body?.trim()
    if (textoIngresado && textoIngresado.length >= 2) {
      const hist = pushHistorial(sesion.datos, 'esperando_observaciones')
      await supabase.from('wa_sesiones').update({
        estado: 'seleccion_pago',
        datos: { ...sesion.datos, observaciones: textoIngresado, historial: hist }
      }).eq('telefono', phone)
      sesion.datos = { ...sesion.datos, observaciones: textoIngresado }
      await sendText(phone, `📝 ¡Anotado para la cocina! "*${textoIngresado}*" 👨‍🍳👍`)
      await pedirMetodoPago(phone, sesion)
      return
    }

    // Si no reconoció la opción, volver a consultar
    await pedirObservacionesCocina(phone, sesion)
    return
  }

  // ESTADO 5: Selección de Método de Pago
  if (sesion.estado === 'seleccion_pago') {
    let metodo = ''
    if (replyId === 'pago_yape' || userText.includes('yape')) metodo = 'Yape'
    else if (replyId === 'pago_plin' || userText.includes('plin')) metodo = 'Plin'
    else if (replyId === 'pago_efectivo' || userText.includes('efectivo')) metodo = 'Efectivo'

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

      const total = calcularTotalCarrito(sesion.carrito)
      if (metodo === 'Yape') {
        await sendText(
          phone,
          `📲 Has elegido *Yape*.\n\n` +
          `Por favor realiza el yapeo al siguiente número:\n` +
          `📱 *974372084*\n` +
          `👤 Titular: *Espinoza Willy*\n` +
          `💵 Monto a transferir: *S/ ${total.toFixed(2)}*\n\n` +
          `📸 *Importante:* Envíanos la captura de pantalla de tu constancia por este chat para que tu pedido pueda salir.`
        )
      } else {
        await sendText(
          phone,
          `📲 Has elegido *Plin*.\n\n` +
          `Por favor realiza la transferencia al siguiente número:\n` +
          `📱 *974372084*\n` +
          `👤 Titular: *Espinoza Willy*\n` +
          `💵 Monto a transferir: *S/ ${total.toFixed(2)}*\n\n` +
          `📸 *Importante:* Envíanos la captura de pantalla de tu constancia por este chat para que tu pedido pueda salir.`
        )
      }
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
    } else if (msg.type === 'image') {
      await sendText(
        phone,
        '📸 ¡Captura de pago recibida! Muchas gracias 🙌\n\nAhora, para poder llevarte el pedido, por favor *comparte tu ubicación GPS* (botón 📎) o escribe tu *dirección y referencia* de entrega:'
      )
      return
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
      { id: 'ver_destacados', title: '⭐ Platos Más Pedidos' },
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
    '⭐ Los Platos Más Pedidos',
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

  // Búsqueda inteligente con NLP y puntuación difusa
  const scored = prods
    .map(p => ({ ...p, score: calculateProductScore(p.nombre, query) }))
    .filter(p => p.score >= 25)
    .sort((a, b) => b.score - a.score)

  // Caso 1: Coincidencia única clara o el primer plato tiene una clara ventaja (score >= 70 y ventaja de al menos 20 pts)
  if (scored.length === 1 || (scored.length > 1 && scored[0].score >= 70 && scored[0].score - scored[1].score >= 20)) {
    const plato = scored[0]
    await sendText(phone, `🎯 ¡Excelente elección! Encontré *${plato.nombre}* (S/ ${Number(plato.preciounitario).toFixed(2)}).`)
    await iniciarSeleccionCantidad(phone, plato.idproducto, sesion)
    return
  }

  // Caso 2: Múltiples coincidencias (entre 2 y 7 platos) -> Muestra lista interactiva de resultados
  if (scored.length >= 2 && scored.length <= 7) {
    const rows: any[] = scored.map(p => ({
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
      `Encontré estos ${scored.length} platos para "*${query}*":`,
      'Ver Platos',
      [{ title: 'Resultados Encontrados', rows }]
    )
    return
  }

  // Caso 3: Demasiadas coincidencias (> 7 platos) -> Muestra los 6 de mayor relevancia
  if (scored.length > 7) {
    const top6 = scored.slice(0, 6)
    const rows: any[] = top6.map(p => ({
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
      `Encontré ${scored.length} platos relacionados con "*${query}*". Aquí tienes las mejores opciones:`,
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

async function pedirObservacionesCocina(phone: string, sesion: any) {
  const hist = pushHistorial(sesion.datos, 'en_carrito')
  await supabase.from('wa_sesiones').update({
    estado: 'esperando_observaciones',
    datos: { ...sesion.datos, historial: hist }
  }).eq('telefono', phone)

  await sendButtons(
    phone,
    `👨‍🍳 *¿Alguna indicación especial para la cocina?*\n\n` +
    `Escribe por aquí tu indicación para que el equipo prepare tu pedido a tu gusto.\n\n` +
    `💡 *Ideas de cómo pedir:*\n` +
    `• _"Sin ají"_\n` +
    `• _"Sin camote"_\n` +
    `• _"Sin cebolla"_\n` +
    `• _"Sin ají y sin camote"_\n` +
    `• _"Ensalada aparte"_\n` +
    `• _"Poco picante"_\n\n` +
    `_Si no tienes ninguna indicación especial, presiona *⏩ Continuar* para avanzar:_`,
    [
      { id: 'obs_continuar', title: '⏩ Continuar' },
      { id: 'volver', title: '⬅️ Volver' }
    ],
    'El Puerto Cevichero de Willy'
  )
}

function obtenerToppingIdsDeTexto(textoObservacion: string): string {
  if (!textoObservacion) return '0'
  const norm = normalizeText(textoObservacion)
  const ids: number[] = []

  // Mapeo con los IDs reales de la tabla toppings en Supabase
  if (norm.includes('sin aji') || norm.includes('sin picante') || norm.includes('no aji') || norm.includes('no picante') || norm.includes('cero aji') || norm.includes('nada de aji')) {
    ids.push(1) // SIN AJI
  }
  if (norm.includes('sin camote') || norm.includes('no camote') || norm.includes('sin camotito')) {
    ids.push(5) // SIN CAMOTE
  }
  if (norm.includes('sin cebolla') || norm.includes('no cebolla') || norm.includes('sin cebollita')) {
    ids.push(4) // SIN CEBOLLA
  } else if (norm.includes('poca cebolla') || norm.includes('poco cebolla')) {
    ids.push(24) // poca cebolla
  }
  if (norm.includes('sin yuca') || norm.includes('no yuca')) {
    ids.push(7) // SIN YUCA
  }
  if (norm.includes('sin arroz') || norm.includes('no arroz')) {
    ids.push(8) // SIN ARROZ
  } else if (norm.includes('poco arroz') || norm.includes('poca arroz')) {
    ids.push(30) // poco arroz
  }
  if (norm.includes('ensalada aparte') || norm.includes('aparte ensalada')) {
    ids.push(9) // ENSALADA APARTE
  }
  if (norm.includes('bajo aji') || norm.includes('poco aji') || norm.includes('poco picante') || norm.includes('suave aji')) {
    ids.push(11) // BAJO AJI
  }
  if (norm.includes('bien picante') || norm.includes('bastante aji') || norm.includes('muy picante') || norm.includes('harto aji')) {
    ids.push(29) // bien picante
  }
  if (norm.includes('bajo sal') || norm.includes('poca sal') || norm.includes('sin sal')) {
    ids.push(16) // BAJO SAL
  }

  return ids.length > 0 ? ids.join(',') : '0'
}

async function pedirMetodoPago(phone: string, sesion: any) {
  const total = calcularTotalCarrito(sesion.carrito)
  await supabase.from('wa_sesiones').update({ estado: 'seleccion_pago' }).eq('telefono', phone)

  let notaText = ''
  if (sesion.datos?.observaciones) {
    notaText = `\n📝 *Nota cocina:* ${sesion.datos.observaciones}`
  }

  await sendButtons(
    phone,
    `💰 El total a pagar es *S/ ${total.toFixed(2)}*.${notaText}\n\n¿Cómo deseas pagar cuando llegue tu pedido?`,
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

  const observacionCliente = sesion.datos?.observaciones ? String(sesion.datos.observaciones).trim() : ''

  let comentario = ''
  if (observacionCliente) {
    comentario += `⚠️ NOTA COCINA: ${observacionCliente.toUpperCase()} | `
  }
  comentario += `[PEDIDO WHATSAPP DELIVERY] Método de pago: ${metodoPago}`
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
    telefono: phone,
    mesa: 0, // 0 = DELIVERY
    estado: '1', // 1 = PENDIENTE / NO COBRADO (EL MOZO O REPARTIDOR COBRA)
    total_pedidos: totalPedidos,
    fecha: fechaLima,
    idmozo: 1, // Mozo 1 = "Delivery"
    total: total,
    comentario: comentario,
    comentarios: comentario,
    direccion: direccion,
    latitud: lat,
    longitud: lng,
    metodo_pago: metodoPago,
    paga_con: pagaCon,
    es_chatbot: true
  }

  // Las indicaciones de cocina son generales para todo el pedido, no se asignan a nivel de pedidodetalle
  const detalles = carrito.map((item: any) => ({
    idproducto: item.idproducto,
    cantidad: item.cantidad,
    preciounitario: item.preciounitario,
    lugarpedido: '1', // 1 = Para llevar / Delivery
    toppings: '0',
    opcionespedido: null
  }))

  const { data: rpcResult, error: rpcError } = await supabase.rpc('insertar_pedido_y_detalles', {
    pedido_data: pedidoData,
    detalles: detalles
  })

  if (rpcError || !rpcResult?.success) {
    console.error('Error insertando pedido:', rpcError)
    await transferirAAsesor(phone, sesion)
    return
  }

  const idPedido = rpcResult.idpedido

  const updatePayload: any = {
    telefono: phone,
    direccion: direccion,
    latitud: lat,
    longitud: lng,
    metodo_pago: metodoPago,
    paga_con: pagaCon,
    yape: 0,
    plin: 0,
    efectivo: 0,
    visa: 0,
    es_chatbot: true
  }

  const { error: updateErr } = await supabase.from('pedido').update(updatePayload).eq('idpedido', idPedido)
  if (updateErr) {
    console.warn('Aviso al actualizar pedido con es_chatbot:', updateErr)
    delete updatePayload.es_chatbot
    await supabase.from('pedido').update(updatePayload).eq('idpedido', idPedido)
  }

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

  let metodoDetalle = metodoPago
  if (metodoPago === 'Efectivo') {
    metodoDetalle = pagaCon > 0 ? `Efectivo (Paga con S/ ${pagaCon.toFixed(2)})` : 'Efectivo contra entrega'
  } else if (metodoPago === 'Yape' || metodoPago === 'Plin') {
    metodoDetalle = `${metodoPago} (Transferencia)`
  }

  let notaClienteMsg = ''
  if (observacionCliente) {
    notaClienteMsg = `\n📝 *Nota para cocina:* ${observacionCliente}`
  }

  let recordatorioPago = ''
  if (metodoPago === 'Yape' || metodoPago === 'Plin') {
    recordatorioPago = `\n\n⚠️ *Recordatorio:* Si aún no enviaste la captura de pantalla de tu ${metodoPago} al *974372084 (Espinoza Willy)*, por favor envíala por aquí para despachar tu pedido de inmediato.`
  }

  await sendText(
    phone,
    `🎉 *¡PEDIDO CONFIRMADO CON ÉXITO!* 🎉\n\n` +
    `📋 *Pedido N°:* #${idPedido}\n` +
    `👤 *Cliente:* ${sesion.nombre}\n` +
    `💰 *Total:* S/ ${total.toFixed(2)}\n` +
    `💳 *Pago:* ${metodoDetalle}${notaClienteMsg}\n` +
    `📍 *Entrega:* ${direccion}${mapaLink}\n\n` +
    `👨‍🍳 El equipo de cocina de *El Puerto Cevichero de Willy* ya recibió tu comanda y comenzará su preparación. ¡Muchas gracias!${recordatorioPago}`
  )
}
