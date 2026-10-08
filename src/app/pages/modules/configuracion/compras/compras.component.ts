import { Component, Output, EventEmitter, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ImportsModule } from '../../../imports';
import { MessageService, ConfirmationService } from 'primeng/api';
import { SupabaseService } from '../../../../services/supabase.service';
import { SaasMasterService } from '../../../../services/saas-master.service';

export type Prioridad = 'Normal' | 'Urgente';
export type EstadoLista = 'Pendiente' | 'En Proceso' | 'Completado';

export interface Empleado {
    idpersona: number | string;
    nombres: string;
    apellidopat?: string;
    apellidomat?: string;
    nombreCompleto: string;
    celular?: string;
}

export interface InsumoCatalogo {
    id: string;
    nombre: string;
    categoria: string;
    unidadDefecto: string;
    stockSugerido?: string;
    fechaRegistro?: string;
    esPersonalizado?: boolean;
}

export interface CompraInsumo {
    id: string;
    nombre: string;              // ej. "Pescado Corvina Fresca"
    subtitulo?: string;          // ej. "Pescado del día para Ceviche Clásico"
    categoria: string;           // "Pescados y Mariscos", "Verduras y Tubérculos", "Cítricos", etc.
    cantidad: string;            // ej. "18.0"
    unidad: string;              // "kg", "unidades", "atados", "mallas", "paquetes", "litros"
    stockCamara?: string;        // ej. "1.2 kg", "0.0 kg (Agotado)"
    prioridad: Prioridad;
    proyeccion?: string;         // Sugerencia / notas
    estado: 'pendiente' | 'comprado';
    registroCocina: string;      // ej. "Hoy 06:15 AM - Chef Mario R."
    listaId: string;             // ID de la lista a la que pertenece
    listaNombre?: string;
}

export interface ListaCompra {
    id: string;
    nombre: string;              // ej. "Terminal Pesquero", "Mercado Mayorista"
    destino: string;             // ej. "Terminal Pesquero", "Mercado Mayorista", "Insumos Secos"
    fechaIngreso: string;        // Timestamp ISO
    fechaDisplay: string;        // ej. "Hoy, 06:45 AM"
    responsable: string;         // Empleado asignado
    responsableId?: number | string;
    telefonoWtsp?: string;       // Número de WhatsApp (opcional)
    estado: EstadoLista;
    observaciones?: string;
    productos: CompraInsumo[];   // Conjunto de productos que contiene
}

@Component({
    selector: 'app-compras',
    imports: [CommonModule, FormsModule, ImportsModule],
    templateUrl: './compras.component.html',
    styleUrl: './compras.component.scss',
    providers: [MessageService, ConfirmationService]
})
export class ComprasComponent implements OnInit {
    @Output() backToMain = new EventEmitter<void>();
    @ViewChild('inputInsumoNombre') inputInsumoNombre!: ElementRef;
    @ViewChild('inputTempProdNombre') inputTempProdNombre!: ElementRef;
    @ViewChild('inputTempProdQty') inputTempProdQty!: ElementRef;

    // ─── Pestaña activa (Grilla de Listas vs Vista Operativa de Insumos) ───
    vistaActiva: 'listas' | 'insumos' = 'listas';

    // ─── Colección de Listas ──────────────────────────────────────
    listas: ListaCompra[] = [];

    // ─── Lista de empleados (desde base de datos de personas) ─────
    empleados: Empleado[] = [];
    cargandoEmpleados: boolean = false;

    // ─── Filtros de navegación ────────────────────────────────────
    filtroListaId: string = 'todas';
    filtroCategoria: string = 'Todas';
    filtroPrioridad: string = 'Todas';
    busqueda: string = '';

    // ─── Selección de productos para envío/acciones masivas ───────
    seleccionadosIds: Set<string> = new Set<string>();

    // ─── Formulario rápido inline de insumo ───────────────────────
    mostrarFormRapido: boolean = false;
    nuevoInsumoNombre: string = '';
    nuevoInsumoSubtitulo: string = '';
    nuevoInsumoListaId: string = '';
    nuevoInsumoCategoria: string = 'Pescados y Mariscos';
    nuevoInsumoStockCamara: string = '0.0 kg';
    nuevoInsumoCantidad: string = '';
    nuevoInsumoUnidad: string = 'kg';
    nuevoInsumoPrioridad: Prioridad = 'Normal';
    nuevoInsumoProyeccion: string = '';

    // ─── Diálogo: Crear Nueva Lista con Conjunto de Productos ─────
    dialogNuevaLista: boolean = false;
    nuevaListaNombre: string = '';
    nuevaListaDestino: string = 'Terminal Pesquero';
    nuevaListaResponsableId: number | string | null = null;
    nuevaListaResponsable: string = '';
    nuevaListaTelefono: string = '';
    nuevaListaObservaciones: string = '';

    // Conjunto de productos que se van agregando a la nueva lista
    productosNuevaLista: Partial<CompraInsumo>[] = [];

    // Temp inputs para el producto en el modal de nueva lista
    tempProdNombre: string = '';
    tempProdSubtitulo: string = '';
    tempProdCategoria: string = '';
    tempProdOtraCategoria: string = '';
    mostrarInputOtraCategoria: boolean = false;
    tempProdCantidad: string = '';
    tempProdUnidad: string = 'kg';
    tempProdStock: string = '0.0 kg';
    tempProdPrioridad: Prioridad = 'Normal';
    tempProdNota: string = '';

    // ─── CATÁLOGO DE INSUMOS & AUTOCOMPLETADO (PARA COMPRAS & RECETAS) ───
    catalogoInsumos: InsumoCatalogo[] = [];
    sugerenciasInsumos: InsumoCatalogo[] = [];
    mostrarSugerenciasInsumos: boolean = false;
    private sugerenciasTimeout: any = null;

    // ─── MODAL CATÁLOGO DE INSUMOS (TABLA DE INSUMOS PARA RECETAS) ─────
    dialogCatalogoInsumos: boolean = false;
    filtroBusquedaCatalogo: string = '';
    filtroCategoriaCatalogo: string = 'Todas';
    nuevoInsumoCatNombre: string = '';
    nuevoInsumoCatCategoria: string = 'Verduras y Tubérculos';
    nuevoInsumoCatUnidad: string = 'kg';

    private readonly CATALOGO_STORAGE_KEY = 'willy_catalogo_insumos_v1';
    private readonly CATEGORIAS_STORAGE_KEY = 'willy_categorias_insumos_v2';

    // ─── Diálogo: Detalle de Lista ─────────────────────────────────
    dialogDetalleLista: boolean = false;
    listaEnDetalle: ListaCompra | null = null;

    // ─── Diálogo / Modal de WhatsApp ──────────────────────────────
    dialogWhatsapp: boolean = false;
    whatsappTextoPreview: string = '';
    whatsappTelefono: string = '';
    whatsappTituloLista: string = '';

    // ─── Opciones y Catálogos ─────────────────────────────────────
    destinosDisponibles: string[] = [
        'Terminal Pesquero',
        'Mercado Mayorista',
        'Insumos Secos',
        'Verdulería / Frutería',
        'Supermercado',
        'Distribuidora de Carnes'
    ];

    categoriasDisponibles: string[] = [
        'Todas',
        'Pescados y Mariscos',
        'Verduras y Tubérculos',
        'Cítricos',
        'Insumos Secos',
        'Descartables',
        'Aseo',
        'Carnes',
        'Bebidas'
    ];

    unidadesDisponibles: string[] = ['kg', 'unidades', 'atados', 'mallas', 'paquetes', 'cajas', 'litros'];

    private readonly STORAGE_KEY = 'willy_listas_compras_v2';

    constructor(
        private messageService: MessageService,
        private confirmationService: ConfirmationService,
        private supabaseService: SupabaseService,
        private saasMasterService: SaasMasterService
    ) {}

    ngOnInit(): void {
        this.cargarCategorias();
        this.cargarDatos();
        this.cargarEmpleados();
        this.cargarCatalogoInsumos();
    }

    cargarCategorias(): void {
        try {
            const raw = localStorage.getItem(this.CATEGORIAS_STORAGE_KEY);
            if (raw) {
                const arr = JSON.parse(raw);
                if (Array.isArray(arr) && arr.length > 0) {
                    const setCats = new Set([...this.categoriasDisponibles, ...arr]);
                    this.categoriasDisponibles = Array.from(setCats);
                }
            }
        } catch {}
    }

    guardarCategorias(): void {
        try {
            localStorage.setItem(this.CATEGORIAS_STORAGE_KEY, JSON.stringify(this.categoriasDisponibles));
        } catch {}
    }

    agregarNuevaCategoria(nuevaCat: string): void {
        const catNorm = this.formatearNombreInsumo(nuevaCat.trim());
        if (!catNorm) return;
        const yaExiste = this.categoriasDisponibles.some(
            c => this.normalizarTexto(c) === this.normalizarTexto(catNorm)
        );
        if (!yaExiste) {
            this.categoriasDisponibles.push(catNorm);
            this.guardarCategorias();
        }
    }

    onTempProdCategoriaChange(): void {
        if (this.tempProdCategoria === '__OTRA__') {
            this.mostrarInputOtraCategoria = true;
            this.tempProdOtraCategoria = '';
            setTimeout(() => {
                const el = document.getElementById('inputOtraCat');
                if (el) el.focus();
            }, 100);
        } else {
            this.mostrarInputOtraCategoria = false;
        }
    }

    goBack(): void {
        this.backToMain.emit();
    }

    // ─── Carga de Empleados desde SaaS Master y Supabase ──────────
    async cargarEmpleados(): Promise<void> {
        this.cargandoEmpleados = true;
        try {
            // Ejecutar consultas en paralelo para máxima velocidad
            const [supaRes, saasRes] = await Promise.allSettled([
                this.supabaseService.getTrabajadores(),
                this.saasMasterService.getUsuariosNegocio()
            ]);

            const supaPersonas = (supaRes.status === 'fulfilled' && supaRes.value?.success && supaRes.value?.data) ? supaRes.value.data : [];
            const saasUsuarios = (saasRes.status === 'fulfilled' && Array.isArray(saasRes.value)) ? saasRes.value : [];

            // Mapear y unificar datos priorizando el teléfono del colaborador
            const listaUnificada: Empleado[] = [];

            // Primero las personas de Supabase
            for (const p of supaPersonas) {
                const nom = (p.nombres || '').trim();
                const ape = (p.apellidopat || '').trim();
                const nombreCompleto = ape ? `${nom} ${ape}` : nom;

                // Buscar teléfono en Supabase o en SaaS Master
                let celular = (p.celular || '').trim();
                if (!celular && saasUsuarios.length > 0) {
                    const matchSaas = saasUsuarios.find(u => {
                        const uNom = (u.nombres || u.nombreCompleto || '').trim().toLowerCase();
                        const uApe = (u.apellidos || '').trim().toLowerCase();
                        return (nom && uNom && (nom.toLowerCase().includes(uNom) || uNom.includes(nom.toLowerCase()))) ||
                               (ape && uApe && (ape.toLowerCase().includes(uApe) || uApe.includes(ape.toLowerCase())));
                    });
                    if (matchSaas && matchSaas.telefono) {
                        celular = String(matchSaas.telefono).trim();
                    }
                }

                listaUnificada.push({
                    idpersona: p.idpersona,
                    nombres: nom,
                    apellidopat: ape,
                    apellidomat: (p.apellidomat || '').trim(),
                    nombreCompleto: nombreCompleto,
                    celular: celular
                });
            }

            // Añadir también usuarios de SaaS Master que no estén en Supabase
            for (const u of saasUsuarios) {
                if (u.estaActivo === false) continue;
                const uNom = (u.nombres || u.nombreCompleto || '').trim();
                const uApe = (u.apellidos || '').trim();
                const nombreCompleto = u.nombreCompleto || (uApe ? `${uNom} ${uApe}` : uNom);
                const tel = (u.telefono || '').trim();

                const yaExiste = listaUnificada.some(e => 
                    e.nombreCompleto.toLowerCase().includes(uNom.toLowerCase()) ||
                    (u.email && e.nombreCompleto.toLowerCase() === u.email.toLowerCase())
                );

                if (!yaExiste && uNom) {
                    listaUnificada.push({
                        idpersona: u.id || ('saas-' + (listaUnificada.length + 1)),
                        nombres: uNom,
                        apellidopat: uApe,
                        nombreCompleto: nombreCompleto,
                        celular: tel
                    });
                }
            }

            this.empleados = listaUnificada;

            // Si hay empleados y no hay responsable asignado, seleccionar el primero
            if (this.empleados.length > 0 && !this.nuevaListaResponsableId) {
                this.seleccionarEmpleadoPorId(this.empleados[0].idpersona);
            }
        } catch (error) {
            console.error('Error cargando empleados:', error);
        } finally {
            this.cargandoEmpleados = false;
        }
    }

    onEmpleadoSelect(id?: any): void {
        const idToSelect = (id !== undefined && id !== null) ? id : this.nuevaListaResponsableId;
        this.seleccionarEmpleadoPorId(idToSelect);
    }

    private seleccionarEmpleadoPorId(idpersona: any): void {
        if (idpersona === null || idpersona === undefined) return;
        const emp = this.empleados.find(e => 
            e.idpersona === idpersona || 
            String(e.idpersona) === String(idpersona) ||
            (!isNaN(Number(e.idpersona)) && !isNaN(Number(idpersona)) && Number(e.idpersona) === Number(idpersona))
        );
        if (emp) {
            this.nuevaListaResponsableId = emp.idpersona;
            this.nuevaListaResponsable = emp.nombreCompleto;
            // Traer el teléfono celular automáticamente si el empleado lo tiene
            if (emp.celular && emp.celular.trim().length > 0) {
                this.nuevaListaTelefono = emp.celular.trim();
            } else {
                this.nuevaListaTelefono = '';
            }
        }
    }

    // ─── LIMPIAR CANTIDAD AL CAMBIAR DE UNIDAD ──────────────────────
    onUnidadNuevaListaChange(): void {
        this.tempProdCantidad = '';
    }

    onUnidadRapidaChange(): void {
        this.nuevoInsumoCantidad = '';
    }

    // ─── Carga y persistencia ──────────────────────────────────────
    private cargarDatos(): void {
        try {
            const raw = localStorage.getItem(this.STORAGE_KEY);
            if (raw) {
                this.listas = JSON.parse(raw);
            } else {
                this.listas = this.getDatosInicialesMarYMarea();
                this.guardarDatos();
            }
        } catch {
            this.listas = this.getDatosInicialesMarYMarea();
        }

        if (this.listas.length > 0 && !this.nuevoInsumoListaId) {
            this.nuevoInsumoListaId = this.listas[0].id;
        }
    }

    guardarDatos(): void {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.listas));
        } catch (e) {
            console.error('Error guardando en localStorage:', e);
        }
    }

    // ─── Datos iniciales de alta fidelidad según la imagen ────────
    private getDatosInicialesMarYMarea(): ListaCompra[] {
        const id1 = 'lista-terminal-pesquero';
        const id2 = 'lista-mercado-mayorista';
        const id3 = 'lista-insumos-secos';

        const l1: ListaCompra = {
            id: id1,
            nombre: 'Terminal Pesquero',
            destino: 'Terminal Pesquero',
            fechaIngreso: new Date().toISOString(),
            fechaDisplay: 'Hoy, 06:45 AM',
            responsable: 'Chef Mario R.',
            telefonoWtsp: '51987654321',
            estado: 'Pendiente',
            observaciones: 'Control estricto de temperatura marina < 2.5°C en muelle.',
            productos: [
                {
                    id: 'ins-1',
                    listaId: id1,
                    listaNombre: 'Terminal Pesquero',
                    nombre: 'Pescado Corvina Fresca',
                    subtitulo: 'Pescado del día para Ceviche Clásico • Agallas rojas firmes',
                    categoria: 'Pescados y Mariscos',
                    cantidad: '18.0',
                    unidad: 'kg',
                    stockCamara: '1.2 kg',
                    prioridad: 'Urgente',
                    proyeccion: '18.0 kg sugeridos para alta demanda de viernes (+20%)',
                    estado: 'pendiente',
                    registroCocina: 'Hoy 06:15 AM - Chef Mario R.'
                },
                {
                    id: 'ins-2',
                    listaId: id1,
                    listaNombre: 'Terminal Pesquero',
                    nombre: 'Pescado Lenguado Entero',
                    subtitulo: 'Tiraditos especiales y ceviche premium',
                    categoria: 'Pescados y Mariscos',
                    cantidad: '12.0',
                    unidad: 'kg',
                    stockCamara: '0.0 kg (Agotado)',
                    prioridad: 'Normal',
                    proyeccion: '12.0 kg (Piezas de 1.2kg a 1.4kg con piel limpia)',
                    estado: 'pendiente',
                    registroCocina: 'Hoy 06:20 AM - Chef Mario R.'
                },
                {
                    id: 'ins-3',
                    listaId: id1,
                    listaNombre: 'Terminal Pesquero',
                    nombre: 'Pulpo Fresco Mediano',
                    subtitulo: 'Para pulpo al olivo y parrilla marina',
                    categoria: 'Pescados y Mariscos',
                    cantidad: '8.0',
                    unidad: 'kg',
                    stockCamara: '2.1 kg',
                    prioridad: 'Normal',
                    proyeccion: 'Piezas de 2kg aprox con tentáculos íntegros',
                    estado: 'pendiente',
                    registroCocina: 'Hoy 07:00 AM - Sous Chef Carlos'
                }
            ]
        };

        const l2: ListaCompra = {
            id: id2,
            nombre: 'Mercado Mayorista',
            destino: 'Mercado Mayorista',
            fechaIngreso: new Date().toISOString(),
            fechaDisplay: 'Hoy, 06:50 AM',
            responsable: 'Alex Diaz',
            telefonoWtsp: '51991234567',
            estado: 'Pendiente',
            observaciones: 'Verduras seleccionadas y cítricos de primera calidad.',
            productos: [
                {
                    id: 'ins-4',
                    listaId: id2,
                    listaNombre: 'Mercado Mayorista',
                    nombre: 'Cebolla Roja Criolla',
                    subtitulo: 'Corte pluma crocante, cabezas medianas y piel tersa',
                    categoria: 'Verduras y Tubérculos',
                    cantidad: '15.0',
                    unidad: 'kg',
                    stockCamara: '3.5 kg',
                    prioridad: 'Normal',
                    proyeccion: '15.0 kg calculados para 180 raciones de cancha',
                    estado: 'pendiente',
                    registroCocina: 'Hoy 06:30 AM - Alex Diaz'
                },
                {
                    id: 'ins-5',
                    listaId: id2,
                    listaNombre: 'Mercado Mayorista',
                    nombre: 'Camote Morado / Dulce',
                    subtitulo: 'Guarnición glaseada y horneada artesanal',
                    categoria: 'Verduras y Tubérculos',
                    cantidad: '12.0',
                    unidad: 'kg',
                    stockCamara: '4.0 kg',
                    prioridad: 'Normal',
                    proyeccion: '12.0 kg para preparación matutina en almíbar de naranja',
                    estado: 'pendiente',
                    registroCocina: 'Hoy 06:35 AM - Alex Diaz'
                },
                {
                    id: 'ins-6',
                    listaId: id2,
                    listaNombre: 'Mercado Mayorista',
                    nombre: 'Limón Sutil Piurano',
                    subtitulo: '1 Malla selecta • Cáscara delgada, alto rendimiento en jugo',
                    categoria: 'Cítricos',
                    cantidad: '20.0',
                    unidad: 'kg',
                    stockCamara: '2.0 kg (Mínimo)',
                    prioridad: 'Urgente',
                    proyeccion: '1 malla cerrada de Chulucanas/Olmos para leche de tigre',
                    estado: 'pendiente',
                    registroCocina: 'Hoy 06:48 AM - Alex Diaz'
                },
                {
                    id: 'ins-7',
                    listaId: id2,
                    listaNombre: 'Mercado Mayorista',
                    nombre: 'Choclo Serrano Gigante',
                    subtitulo: 'Grano tierno y grande (Cuzco o Mantaro)',
                    categoria: 'Verduras y Tubérculos',
                    cantidad: '10.0',
                    unidad: 'kg',
                    stockCamara: '1.5 kg',
                    prioridad: 'Normal',
                    proyeccion: '10.0 kg (aprox 25 mazorcas desgranadas en turno mañana)',
                    estado: 'pendiente',
                    registroCocina: 'Hoy 06:40 AM - Cocinero Juan P.'
                },
                {
                    id: 'ins-8',
                    listaId: id2,
                    listaNombre: 'Mercado Mayorista',
                    nombre: 'Ají Limo Fresco (Rojo y Amarillo)',
                    subtitulo: 'Aroma penetrante y picor estándar para ceviche',
                    categoria: 'Verduras y Tubérculos',
                    cantidad: '2.5',
                    unidad: 'kg',
                    stockCamara: '0.3 kg',
                    prioridad: 'Normal',
                    proyeccion: 'Seleccionar 70% color rojo encendido y 30% amarillo brillante',
                    estado: 'pendiente',
                    registroCocina: 'Hoy 06:50 AM - Alex Diaz'
                }
            ]
        };

        const l3: ListaCompra = {
            id: id3,
            nombre: 'Insumos Secos',
            destino: 'Insumos Secos',
            fechaIngreso: new Date().toISOString(),
            fechaDisplay: 'Hoy, 07:05 AM',
            responsable: 'Roly Vazquez',
            telefonoWtsp: '',
            estado: 'Pendiente',
            observaciones: 'Hierbas y empaques secos de almacén central.',
            productos: [
                {
                    id: 'ins-9',
                    listaId: id3,
                    listaNombre: 'Insumos Secos',
                    nombre: 'Culantro de Huerto Fresco',
                    subtitulo: 'Tallo delgado, hojas verdes sin mancha',
                    categoria: 'Verduras y Tubérculos',
                    cantidad: '5',
                    unidad: 'atados',
                    stockCamara: '1 atado',
                    prioridad: 'Normal',
                    proyeccion: '5 atados grandes con raíz para conservación en frío',
                    estado: 'pendiente',
                    registroCocina: 'Hoy 06:55 AM - Roly Vazquez'
                }
            ]
        };

        return [l1, l2, l3];
    }

    // ─── GETTERS Y KPIS ───────────────────────────────────────────
    normalizarTexto(txt: string | null | undefined): string {
        if (!txt) return '';
        return txt
            .trim()
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');
    }

    setFiltroCategoria(cat: string): void {
        this.filtroCategoria = cat;
        // Si la lista activa no tiene insumos de esta categoría, cambiar lista a 'todas' para no dejar la vista vacía
        if (cat !== 'Todas' && this.filtroListaId !== 'todas') {
            const tieneEnLista = this.todosLosInsumos.some(i => 
                i.listaId === this.filtroListaId && 
                this.normalizarTexto(i.categoria) === this.normalizarTexto(cat)
            );
            if (!tieneEnLista) {
                this.filtroListaId = 'todas';
            }
        }
    }

    get todosLosInsumos(): CompraInsumo[] {
        const res: CompraInsumo[] = [];
        this.listas.forEach(l => {
            l.productos.forEach(p => {
                res.push({ ...p, listaNombre: l.nombre });
            });
        });
        return res;
    }

    get insumosFiltrados(): CompraInsumo[] {
        return this.todosLosInsumos.filter(item => {
            const matchLista = this.filtroListaId === 'todas' || item.listaId === this.filtroListaId;
            const matchCategoria = this.filtroCategoria === 'Todas' || 
                this.normalizarTexto(item.categoria) === this.normalizarTexto(this.filtroCategoria);
            const matchPrioridad = this.filtroPrioridad === 'Todas' || 
                this.normalizarTexto(item.prioridad) === this.normalizarTexto(this.filtroPrioridad);
            const q = this.normalizarTexto(this.busqueda);
            const matchBusqueda = !q ||
                this.normalizarTexto(item.nombre).includes(q) ||
                (item.subtitulo && this.normalizarTexto(item.subtitulo).includes(q)) ||
                this.normalizarTexto(item.categoria).includes(q);

            return matchLista && matchCategoria && matchPrioridad && matchBusqueda;
        });
    }

    get totalItemsFaltantes(): number {
        return this.todosLosInsumos.filter(i => i.estado === 'pendiente').length;
    }

    get totalItemsUrgentes(): number {
        return this.todosLosInsumos.filter(i => i.prioridad === 'Urgente' && i.estado === 'pendiente').length;
    }

    get totalKgPescados(): number {
        return this.todosLosInsumos
            .filter(i => i.categoria === 'Pescados y Mariscos')
            .reduce((acc, curr) => acc + (parseFloat(curr.cantidad) || 0), 0);
    }

    get totalKgVerduras(): number {
        return this.todosLosInsumos
            .filter(i => i.categoria === 'Verduras y Tubérculos' || i.categoria === 'Cítricos')
            .reduce((acc, curr) => acc + (parseFloat(curr.cantidad) || 0), 0);
    }

    // Suma de seleccionados
    get sumaKgPescadosSeleccionados(): number {
        return this.todosLosInsumos
            .filter(i => this.seleccionadosIds.has(i.id) && i.categoria === 'Pescados y Mariscos')
            .reduce((acc, curr) => acc + (parseFloat(curr.cantidad) || 0), 0);
    }

    get sumaKgVerdurasSeleccionadas(): number {
        return this.todosLosInsumos
            .filter(i => this.seleccionadosIds.has(i.id) && (i.categoria === 'Verduras y Tubérculos' || i.categoria === 'Cítricos'))
            .reduce((acc, curr) => acc + (parseFloat(curr.cantidad) || 0), 0);
    }

    // ─── GESTIÓN DE LISTAS (GRILLA DE LISTAS INGRESADAS) ───────────
    abrirModalNuevaLista(): void {
        this.nuevaListaNombre = '';
        this.nuevaListaDestino = 'Terminal Pesquero';
        this.nuevaListaTelefono = '';
        this.nuevaListaObservaciones = '';
        this.productosNuevaLista = [];
        this.limpiarTempProd();
        this.mostrarSugerenciasInsumos = false;

        // Si tenemos empleados, seleccionar el primero por defecto
        if (this.empleados.length > 0) {
            this.seleccionarEmpleadoPorId(this.empleados[0].idpersona);
        }

        this.dialogNuevaLista = true;
        setTimeout(() => this.inputTempProdNombre?.nativeElement?.focus(), 150);
    }

    limpiarTempProd(): void {
        this.tempProdNombre = '';
        this.tempProdSubtitulo = '';
        this.tempProdCategoria = '';
        this.tempProdOtraCategoria = '';
        this.mostrarInputOtraCategoria = false;
        this.tempProdCantidad = '';
        this.tempProdUnidad = 'kg';
        this.tempProdStock = '0.0 kg';
        this.tempProdPrioridad = 'Normal';
        this.tempProdNota = '';
        this.mostrarSugerenciasInsumos = false;
    }

    // ─── AUTOCOMPLETADO Y CATÁLOGO DE INSUMOS ─────────────────────
    onInputTempProdNombre(event?: any): void {
        const val = this.normalizarTexto(this.tempProdNombre);
        if (this.sugerenciasTimeout) clearTimeout(this.sugerenciasTimeout);

        if (!val) {
            this.sugerenciasInsumos = this.catalogoInsumos.slice(0, 8);
        } else {
            this.sugerenciasInsumos = this.catalogoInsumos.filter(item =>
                this.normalizarTexto(item.nombre).includes(val) ||
                this.normalizarTexto(item.categoria).includes(val)
            ).slice(0, 10);
        }
        this.mostrarSugerenciasInsumos = true;
    }

    onFocusTempProdNombre(): void {
        this.onInputTempProdNombre();
    }

    onBlurTempProdNombre(): void {
        this.sugerenciasTimeout = setTimeout(() => {
            this.mostrarSugerenciasInsumos = false;
        }, 220);
    }

    seleccionarInsumoCatalogo(insumo: InsumoCatalogo): void {
        this.tempProdNombre = insumo.nombre;
        this.tempProdCategoria = insumo.categoria;
        this.tempProdUnidad = insumo.unidadDefecto || 'kg';
        this.mostrarSugerenciasInsumos = false;

        this.messageService.add({
            severity: 'info',
            summary: 'Insumo Seleccionado',
            detail: `"${insumo.nombre}" seleccionado (${insumo.categoria}).`,
            life: 2000
        });

        setTimeout(() => this.inputTempProdQty?.nativeElement?.focus(), 100);
    }

    existeCoincidenciaExacta(): boolean {
        const val = this.tempProdNombre.trim().toLowerCase();
        return this.catalogoInsumos.some(i => i.nombre.trim().toLowerCase() === val);
    }

    registrarNuevoInsumoCatalogo(nombre: string, categoria: string, unidad: string): InsumoCatalogo {
        const nombreFormateado = this.formatearNombreInsumo(nombre);
        const yaExiste = this.catalogoInsumos.find(
            c => c.nombre.trim().toLowerCase() === nombreFormateado.toLowerCase()
        );
        if (yaExiste) {
            return yaExiste;
        }

        const nuevo: InsumoCatalogo = {
            id: 'ins-cat-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
            nombre: nombreFormateado,
            categoria: categoria || 'Verduras y Tubérculos',
            unidadDefecto: unidad || 'kg',
            fechaRegistro: new Date().toISOString(),
            esPersonalizado: true
        };

        this.catalogoInsumos.unshift(nuevo);
        this.guardarCatalogoInsumos();

        this.messageService.add({
            severity: 'success',
            summary: 'Nuevo Insumo Registrado',
            detail: `"${nuevo.nombre}" guardado en la tabla de insumos para compras y recetas.`,
            life: 3000
        });

        return nuevo;
    }

    crearDesdeAutocompletado(): void {
        if (!this.tempProdNombre.trim()) return;
        this.mostrarSugerenciasInsumos = false;
        this.messageService.add({
            severity: 'info',
            summary: 'Categoría Requerida',
            detail: `Insumo "${this.tempProdNombre.trim()}": Por favor seleccione o escriba su categoría.`,
            life: 3500
        });
        setTimeout(() => {
            const catSelect = document.getElementById('selectTempProdCat');
            if (catSelect) catSelect.focus();
        }, 120);
    }

    private formatearNombreInsumo(texto: string): string {
        return texto.trim()
            .split(' ')
            .filter(w => w.length > 0)
            .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
            .join(' ');
    }

    // ─── CARGA Y PERSISTENCIA DEL CATÁLOGO ─────────────────────────
    cargarCatalogoInsumos(): void {
        try {
            const raw = localStorage.getItem(this.CATALOGO_STORAGE_KEY);
            if (raw) {
                const parsed: InsumoCatalogo[] = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    this.catalogoInsumos = parsed;
                    return;
                }
            }
        } catch (e) {
            console.error('Error cargando catalogo de insumos:', e);
        }

        this.catalogoInsumos = this.getInsumosInicialesCevicheria();
        this.guardarCatalogoInsumos();
    }

    guardarCatalogoInsumos(): void {
        try {
            localStorage.setItem(this.CATALOGO_STORAGE_KEY, JSON.stringify(this.catalogoInsumos));
        } catch (e) {
            console.error('Error guardando catálogo en localStorage:', e);
        }
    }

    private getInsumosInicialesCevicheria(): InsumoCatalogo[] {
        const fecha = new Date().toISOString();
        return [
            // Pescados y Mariscos
            { id: 'cat-1', nombre: 'Pescado Corvina Fresca', categoria: 'Pescados y Mariscos', unidadDefecto: 'kg', fechaRegistro: fecha },
            { id: 'cat-2', nombre: 'Pescado Lenguado Entero', categoria: 'Pescados y Mariscos', unidadDefecto: 'kg', fechaRegistro: fecha },
            { id: 'cat-3', nombre: 'Pulpo Fresco Mediano', categoria: 'Pescados y Mariscos', unidadDefecto: 'kg', fechaRegistro: fecha },
            { id: 'cat-4', nombre: 'Calamar / Pota Fresca', categoria: 'Pescados y Mariscos', unidadDefecto: 'kg', fechaRegistro: fecha },
            { id: 'cat-5', nombre: 'Langostinos Eviscerados', categoria: 'Pescados y Mariscos', unidadDefecto: 'kg', fechaRegistro: fecha },
            { id: 'cat-6', nombre: 'Conchas de Abanico', categoria: 'Pescados y Mariscos', unidadDefecto: 'unidades', fechaRegistro: fecha },
            { id: 'cat-7', nombre: 'Bonito Fresco', categoria: 'Pescados y Mariscos', unidadDefecto: 'kg', fechaRegistro: fecha },
            { id: 'cat-8', nombre: 'Cabrilla Fresca', categoria: 'Pescados y Mariscos', unidadDefecto: 'kg', fechaRegistro: fecha },
            { id: 'cat-9', nombre: 'Mixtura de Mariscos', categoria: 'Pescados y Mariscos', unidadDefecto: 'kg', fechaRegistro: fecha },
            { id: 'cat-10', nombre: 'Tollo de Leche', categoria: 'Pescados y Mariscos', unidadDefecto: 'kg', fechaRegistro: fecha },

            // Verduras y Tubérculos
            { id: 'cat-11', nombre: 'Cebolla Roja Criolla', categoria: 'Verduras y Tubérculos', unidadDefecto: 'kg', fechaRegistro: fecha },
            { id: 'cat-12', nombre: 'Cebolla Blanca', categoria: 'Verduras y Tubérculos', unidadDefecto: 'kg', fechaRegistro: fecha },
            { id: 'cat-13', nombre: 'Camote Morado / Dulce', categoria: 'Verduras y Tubérculos', unidadDefecto: 'kg', fechaRegistro: fecha },
            { id: 'cat-14', nombre: 'Camote Amarillo', categoria: 'Verduras y Tubérculos', unidadDefecto: 'kg', fechaRegistro: fecha },
            { id: 'cat-15', nombre: 'Choclo Serrano Gigante', categoria: 'Verduras y Tubérculos', unidadDefecto: 'kg', fechaRegistro: fecha },
            { id: 'cat-16', nombre: 'Ají Limo Fresco (Rojo y Amarillo)', categoria: 'Verduras y Tubérculos', unidadDefecto: 'kg', fechaRegistro: fecha },
            { id: 'cat-17', nombre: 'Ají Amarillo Fresco', categoria: 'Verduras y Tubérculos', unidadDefecto: 'kg', fechaRegistro: fecha },
            { id: 'cat-18', nombre: 'Rocoto de Huerta', categoria: 'Verduras y Tubérculos', unidadDefecto: 'kg', fechaRegistro: fecha },
            { id: 'cat-19', nombre: 'Culantro de Huerto Fresco', categoria: 'Verduras y Tubérculos', unidadDefecto: 'atados', fechaRegistro: fecha },
            { id: 'cat-20', nombre: 'Apio Criollo', categoria: 'Verduras y Tubérculos', unidadDefecto: 'atados', fechaRegistro: fecha },
            { id: 'cat-21', nombre: 'Kion / Jengibre', categoria: 'Verduras y Tubérculos', unidadDefecto: 'kg', fechaRegistro: fecha },
            { id: 'cat-22', nombre: 'Ajo Pelado / Molido', categoria: 'Verduras y Tubérculos', unidadDefecto: 'kg', fechaRegistro: fecha },
            { id: 'cat-23', nombre: 'Yuca Amarilla Selecta', categoria: 'Verduras y Tubérculos', unidadDefecto: 'kg', fechaRegistro: fecha },
            { id: 'cat-24', nombre: 'Maíz Cancha Serrano', categoria: 'Verduras y Tubérculos', unidadDefecto: 'kg', fechaRegistro: fecha },

            // Cítricos
            { id: 'cat-25', nombre: 'Limón Sutil Piurano', categoria: 'Cítricos', unidadDefecto: 'kg', fechaRegistro: fecha },
            { id: 'cat-26', nombre: 'Naranja Agria Criolla', categoria: 'Cítricos', unidadDefecto: 'kg', fechaRegistro: fecha },
            { id: 'cat-27', nombre: 'Maracuyá Criollo', categoria: 'Cítricos', unidadDefecto: 'kg', fechaRegistro: fecha },

            // Insumos Secos y Abarrotes
            { id: 'cat-28', nombre: 'Arroz Extra Superior', categoria: 'Insumos Secos', unidadDefecto: 'kg', fechaRegistro: fecha },
            { id: 'cat-29', nombre: 'Aceite Vegetal Sol', categoria: 'Insumos Secos', unidadDefecto: 'litros', fechaRegistro: fecha },
            { id: 'cat-30', nombre: 'Aceite de Ajonjolí', categoria: 'Insumos Secos', unidadDefecto: 'litros', fechaRegistro: fecha },
            { id: 'cat-31', nombre: 'Sillao / Salsa de Soya', categoria: 'Insumos Secos', unidadDefecto: 'litros', fechaRegistro: fecha },
            { id: 'cat-32', nombre: 'Vinagre Blanco', categoria: 'Insumos Secos', unidadDefecto: 'litros', fechaRegistro: fecha },
            { id: 'cat-33', nombre: 'Sal de Mesa Yodada', categoria: 'Insumos Secos', unidadDefecto: 'kg', fechaRegistro: fecha },
            { id: 'cat-34', nombre: 'Pimienta y Comino Molido', categoria: 'Insumos Secos', unidadDefecto: 'paquetes', fechaRegistro: fecha },
            { id: 'cat-35', nombre: 'Ajinomoto / Glutamato', categoria: 'Insumos Secos', unidadDefecto: 'kg', fechaRegistro: fecha },
            { id: 'cat-36', nombre: 'Fondo de Pescado Concentrado', categoria: 'Insumos Secos', unidadDefecto: 'litros', fechaRegistro: fecha },

            // Descartables y Aseo
            { id: 'cat-37', nombre: 'Servilletas de Papel Interdobladas', categoria: 'Descartables', unidadDefecto: 'paquetes', fechaRegistro: fecha },
            { id: 'cat-38', nombre: 'Envases Térmicos / Bowls Ceviche', categoria: 'Descartables', unidadDefecto: 'paquetes', fechaRegistro: fecha },
            { id: 'cat-39', nombre: 'Bolsas Biodegradables', categoria: 'Descartables', unidadDefecto: 'paquetes', fechaRegistro: fecha },
            { id: 'cat-40', nombre: 'Papel Toalla Industrial', categoria: 'Aseo', unidadDefecto: 'unidades', fechaRegistro: fecha },
            { id: 'cat-41', nombre: 'Detergente y Lavavajillas Líquido', categoria: 'Aseo', unidadDefecto: 'litros', fechaRegistro: fecha },
            { id: 'cat-42', nombre: 'Guantes de Nitrilo', categoria: 'Descartables', unidadDefecto: 'cajas', fechaRegistro: fecha }
        ];
    }

    // ─── MODAL CATÁLOGO DE INSUMOS (TABLA DE INSUMOS) ─────────────
    abrirModalCatalogo(): void {
        this.filtroBusquedaCatalogo = '';
        this.filtroCategoriaCatalogo = 'Todas';
        this.nuevoInsumoCatNombre = '';
        this.nuevoInsumoCatCategoria = 'Verduras y Tubérculos';
        this.nuevoInsumoCatUnidad = 'kg';
        this.dialogCatalogoInsumos = true;
    }

    get catalogoInsumosFiltrados(): InsumoCatalogo[] {
        return this.catalogoInsumos.filter(item => {
            const matchCat = this.filtroCategoriaCatalogo === 'Todas' || 
                this.normalizarTexto(item.categoria) === this.normalizarTexto(this.filtroCategoriaCatalogo);
            const q = this.normalizarTexto(this.filtroBusquedaCatalogo);
            const matchQ = !q || 
                this.normalizarTexto(item.nombre).includes(q) || 
                this.normalizarTexto(item.categoria).includes(q);
            return matchCat && matchQ;
        });
    }

    guardarNuevoInsumoDirecto(): void {
        if (!this.nuevoInsumoCatNombre.trim()) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Nombre requerido',
                detail: 'Ingrese el nombre del nuevo insumo a registrar.',
                life: 3000
            });
            return;
        }

        this.registrarNuevoInsumoCatalogo(
            this.nuevoInsumoCatNombre.trim(),
            this.nuevoInsumoCatCategoria,
            this.nuevoInsumoCatUnidad
        );
        this.nuevoInsumoCatNombre = '';
    }

    eliminarInsumoCatalogo(insumo: InsumoCatalogo): void {
        this.confirmationService.confirm({
            message: `¿Deseas quitar "${insumo.nombre}" del catálogo de insumos?`,
            header: 'Eliminar Insumo del Catálogo',
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                this.catalogoInsumos = this.catalogoInsumos.filter(i => i.id !== insumo.id);
                this.guardarCatalogoInsumos();
                this.messageService.add({
                    severity: 'success',
                    summary: 'Insumo eliminado',
                    detail: `Se quitó "${insumo.nombre}" del catálogo.`,
                    life: 2500
                });
            }
        });
    }

    agregarProductoTemporalANuevaLista(): void {
        if (!this.tempProdNombre.trim()) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Falta producto',
                detail: 'Ingrese el nombre del insumo o producto que necesita comprar.',
                life: 3000
            });
            return;
        }

        // VALIDACIÓN Y RESOLUCIÓN OBLIGATORIA DE CATEGORÍA:
        let catFinal = this.tempProdCategoria;
        if (catFinal === '__OTRA__') {
            catFinal = this.tempProdOtraCategoria.trim();
        }
        if (!catFinal || !catFinal.trim()) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Categoría requerida',
                detail: 'Debe seleccionar o escribir la categoría para este insumo.',
                life: 3500
            });
            setTimeout(() => {
                const el = document.getElementById('selectTempProdCat') || document.getElementById('inputOtraCat');
                if (el) el.focus();
            }, 100);
            return;
        }

        if (this.tempProdCategoria === '__OTRA__') {
            catFinal = this.formatearNombreInsumo(catFinal);
            this.agregarNuevaCategoria(catFinal);
            this.tempProdCategoria = catFinal;
            this.mostrarInputOtraCategoria = false;
        }

        if (!this.tempProdCantidad.trim()) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Falta cantidad',
                detail: 'Ingrese la cantidad requerida para este insumo.',
                life: 3000
            });
            return;
        }

        // REGISTRAR EN TABLA DE INSUMOS SI NO EXISTE EN CATÁLOGO CON SU CATEGORÍA:
        const existeEnCatalogo = this.catalogoInsumos.some(
            c => c.nombre.trim().toLowerCase() === this.tempProdNombre.trim().toLowerCase()
        );
        if (!existeEnCatalogo) {
            this.registrarNuevoInsumoCatalogo(
                this.tempProdNombre.trim(),
                catFinal,
                this.tempProdUnidad
            );
        }

        const nombreNormalizado = this.formatearNombreInsumo(this.tempProdNombre.trim());

        const prod: Partial<CompraInsumo> = {
            id: 'temp-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
            nombre: nombreNormalizado,
            subtitulo: this.tempProdSubtitulo.trim(),
            categoria: catFinal,
            cantidad: this.tempProdCantidad.trim(),
            unidad: this.tempProdUnidad,
            stockCamara: this.tempProdStock.trim() || '0.0 kg',
            prioridad: this.tempProdPrioridad,
            proyeccion: this.tempProdNota.trim(),
            estado: 'pendiente',
            registroCocina: `Hoy ${this.formatearHoraActual()} - ${this.nuevaListaResponsable || 'Chef'}`
        };

        this.productosNuevaLista.push(prod);
        this.limpiarTempProd();
        this.mostrarSugerenciasInsumos = false;

        this.messageService.add({
            severity: 'info',
            summary: 'Producto añadido',
            detail: `"${prod.nombre}" [${prod.categoria}] añadido a la lista.`,
            life: 2500
        });

        setTimeout(() => this.inputTempProdNombre?.nativeElement?.focus(), 100);
    }

    quitarProductoTemporal(index: number): void {
        this.productosNuevaLista.splice(index, 1);
    }

    guardarNuevaLista(): void {
        if (!this.nuevaListaNombre.trim()) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Nombre requerido',
                detail: 'Escribe un nombre para la lista (ej. Terminal Pesquero, Verduras del Día).',
                life: 3000
            });
            return;
        }

        if (this.productosNuevaLista.length === 0) {
            this.confirmationService.confirm({
                message: 'No has agregado ningún producto a esta lista. ¿Deseas guardarla vacía para llenarla luego?',
                header: 'Lista sin productos',
                icon: 'pi pi-exclamation-triangle',
                accept: () => {
                    this.procesarGuardarLista();
                }
            });
            return;
        }

        this.procesarGuardarLista();
    }

    private procesarGuardarLista(): void {
        const now = new Date();
        const listaId = 'lista-' + Date.now().toString(36);
        const fechaHoraDisplay = this.formatearFechaHora(now);

        const prodsFinal: CompraInsumo[] = this.productosNuevaLista.map((p, idx) => ({
            id: 'ins-' + Date.now().toString(36) + idx,
            listaId: listaId,
            listaNombre: this.nuevaListaNombre.trim(),
            nombre: p.nombre || 'Insumo',
            subtitulo: p.subtitulo || '',
            categoria: p.categoria || 'Varios',
            cantidad: p.cantidad || '1.0',
            unidad: p.unidad || 'kg',
            stockCamara: p.stockCamara || '0.0 kg',
            prioridad: p.prioridad || 'Normal',
            proyeccion: p.proyeccion || '',
            estado: 'pendiente',
            registroCocina: `Hoy ${this.formatearHoraActual()} - ${this.nuevaListaResponsable || 'Chef'}`
        }));

        const nueva: ListaCompra = {
            id: listaId,
            nombre: this.nuevaListaNombre.trim(),
            destino: this.nuevaListaDestino,
            fechaIngreso: now.toISOString(),
            fechaDisplay: fechaHoraDisplay,
            responsable: this.nuevaListaResponsable || 'Chef de Turno',
            responsableId: this.nuevaListaResponsableId || undefined,
            telefonoWtsp: this.nuevaListaTelefono.trim(),
            estado: 'Pendiente',
            observaciones: this.nuevaListaObservaciones.trim(),
            productos: prodsFinal
        };

        this.listas.unshift(nueva);
        this.guardarDatos();
        this.dialogNuevaLista = false;

        this.messageService.add({
            severity: 'success',
            summary: 'Lista Registrada',
            detail: `Lista "${nueva.nombre}" guardada con ${prodsFinal.length} producto(s).`,
            life: 3500
        });

        this.filtroListaId = nueva.id;
    }

    eliminarLista(lista: ListaCompra, event?: Event): void {
        if (event) event.stopPropagation();
        this.confirmationService.confirm({
            message: `¿Estás seguro de eliminar la lista <strong>${lista.nombre}</strong> y todos sus ${lista.productos.length} productos?`,
            header: 'Confirmar eliminación de lista',
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                this.listas = this.listas.filter(l => l.id !== lista.id);
                this.guardarDatos();
                if (this.filtroListaId === lista.id) {
                    this.filtroListaId = 'todas';
                }
                this.messageService.add({
                    severity: 'success',
                    summary: 'Lista Eliminada',
                    detail: `Se eliminó "${lista.nombre}".`,
                    life: 2500
                });
            }
        });
    }

    verDetalleLista(lista: ListaCompra): void {
        this.listaEnDetalle = lista;
        this.dialogDetalleLista = true;
    }

    // ─── FORMULARIO RÁPIDO DE INSUMO A LISTA EXISTENTE ───────────
    toggleFormRapido(): void {
        this.mostrarFormRapido = !this.mostrarFormRapido;
        if (this.mostrarFormRapido) {
            setTimeout(() => this.inputInsumoNombre?.nativeElement?.focus(), 100);
        }
    }

    agregarInsumoRapido(): void {
        if (!this.nuevoInsumoNombre.trim()) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Campo requerido',
                detail: 'Ingrese el nombre del insumo o producto.',
                life: 3000
            });
            return;
        }

        if (!this.nuevoInsumoCantidad.trim()) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Falta cantidad',
                detail: 'Ingrese la cantidad requerida.',
                life: 3000
            });
            return;
        }

        const listaDestino = this.listas.find(l => l.id === this.nuevoInsumoListaId) || this.listas[0];
        if (!listaDestino) {
            this.messageService.add({
                severity: 'error',
                summary: 'Sin listas',
                detail: 'Primero crea una lista para poder agregarle productos.',
                life: 3000
            });
            return;
        }

        const nuevo: CompraInsumo = {
            id: 'ins-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
            listaId: listaDestino.id,
            listaNombre: listaDestino.nombre,
            nombre: this.nuevoInsumoNombre.trim(),
            subtitulo: this.nuevoInsumoSubtitulo.trim(),
            categoria: this.nuevoInsumoCategoria,
            cantidad: this.nuevoInsumoCantidad.trim(),
            unidad: this.nuevoInsumoUnidad,
            stockCamara: this.nuevoInsumoStockCamara.trim() || '0.0 kg',
            prioridad: this.nuevoInsumoPrioridad,
            proyeccion: this.nuevoInsumoProyeccion.trim(),
            estado: 'pendiente',
            registroCocina: `Hoy ${this.formatearHoraActual()} - ${listaDestino.responsable}`
        };

        listaDestino.productos.push(nuevo);
        this.guardarDatos();

        this.messageService.add({
            severity: 'success',
            summary: 'Insumo Agregado',
            detail: `"${nuevo.nombre}" añadido a la lista "${listaDestino.nombre}".`,
            life: 2500
        });

        this.nuevoInsumoNombre = '';
        this.nuevoInsumoSubtitulo = '';
        this.nuevoInsumoCantidad = '';
        this.nuevoInsumoProyeccion = '';
        setTimeout(() => this.inputInsumoNombre?.nativeElement?.focus(), 80);
    }

    eliminarInsumo(item: CompraInsumo): void {
        this.confirmationService.confirm({
            message: `¿Eliminar "${item.nombre}" de la lista?`,
            header: 'Confirmar eliminación',
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                const lista = this.listas.find(l => l.id === item.listaId);
                if (lista) {
                    lista.productos = lista.productos.filter(p => p.id !== item.id);
                    this.guardarDatos();
                }
                this.seleccionadosIds.delete(item.id);
                this.messageService.add({
                    severity: 'success',
                    summary: 'Eliminado',
                    detail: `"${item.nombre}" fue eliminado.`,
                    life: 2000
                });
            }
        });
    }

    toggleEstadoInsumo(item: CompraInsumo): void {
        item.estado = item.estado === 'pendiente' ? 'comprado' : 'pendiente';
        this.guardarDatos();
    }

    // ─── SELECCIÓN MÚLTIPLE DE PRODUCTOS ──────────────────────────
    toggleSeleccion(item: CompraInsumo): void {
        if (this.seleccionadosIds.has(item.id)) {
            this.seleccionadosIds.delete(item.id);
        } else {
            this.seleccionadosIds.add(item.id);
        }
    }

    isSeleccionado(item: CompraInsumo): boolean {
        return this.seleccionadosIds.has(item.id);
    }

    isTodoSeleccionado(): boolean {
        const visibles = this.insumosFiltrados;
        return visibles.length > 0 && visibles.every(i => this.seleccionadosIds.has(i.id));
    }

    toggleSeleccionarTodos(): void {
        const visibles = this.insumosFiltrados;
        if (this.isTodoSeleccionado()) {
            visibles.forEach(i => this.seleccionadosIds.delete(i.id));
        } else {
            visibles.forEach(i => this.seleccionadosIds.add(i.id));
        }
    }

    // ─── LÓGICA DE WHATSAPP (WTSP) ────────────────────────────────
    abrirModalWhatsappParaLista(lista: ListaCompra, event?: Event): void {
        if (event) event.stopPropagation();
        this.whatsappTituloLista = lista.nombre;
        this.whatsappTelefono = lista.telefonoWtsp || '';
        this.whatsappTextoPreview = this.generarTextoWhatsappLista(lista);
        this.dialogWhatsapp = true;
    }

    abrirModalWhatsappSeleccionados(): void {
        const seleccionados = this.todosLosInsumos.filter(i => this.seleccionadosIds.has(i.id));
        if (seleccionados.length === 0) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Sin selección',
                detail: 'Marca al menos un producto con el checkbox para enviar.',
                life: 3000
            });
            return;
        }

        this.whatsappTituloLista = 'Productos Seleccionados';
        this.whatsappTelefono = '';
        this.whatsappTextoPreview = this.generarTextoWhatsappInsumos(seleccionados, 'PRODUCTOS SELECCIONADOS DEL DÍA');
        this.dialogWhatsapp = true;
    }

    abrirModalWhatsappTodosFiltrados(): void {
        const prods = this.insumosFiltrados;
        if (prods.length === 0) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Sin productos',
                detail: 'No hay productos en la vista actual para enviar.',
                life: 3000
            });
            return;
        }

        const nombre = this.filtroListaId === 'todas' ? 'Todas las Listas del Día' : (this.listas.find(l => l.id === this.filtroListaId)?.nombre || 'Lista');
        this.whatsappTituloLista = nombre;
        this.whatsappTelefono = '';
        this.whatsappTextoPreview = this.generarTextoWhatsappInsumos(prods, nombre);
        this.dialogWhatsapp = true;
    }

    generarTextoWhatsappLista(lista: ListaCompra): string {
        const fechaHora = lista.fechaDisplay || this.formatearFechaHora(new Date(lista.fechaIngreso));
        let texto = `🛒 *LISTA DE COMPRAS — ${lista.nombre.toUpperCase()}*\n`;
        texto += `🏪 *Destino:* ${lista.destino}\n`;
        texto += `📅 *Ingresado:* ${fechaHora}\n`;
        texto += `👨‍🍳 *Responsable:* ${lista.responsable}\n`;
        if (lista.observaciones) {
            texto += `📝 *Nota:* ${lista.observaciones}\n`;
        }
        texto += `━━━━━━━━━━━━━━━━━━━━\n`;
        texto += `📦 *PRODUCTOS A COMPRAR (${lista.productos.length} ítems):*\n\n`;

        lista.productos.forEach((p, idx) => {
            const iconoPrio = p.prioridad === 'Urgente' ? '🔴 *[URGENTE]*' : '🟢';
            const estadoIcono = p.estado === 'comprado' ? '✅ _(Comprado)_' : '⏳ _(Pendiente)_';

            texto += `${idx + 1}. *${p.nombre}* ${iconoPrio} ${estadoIcono}\n`;
            texto += `   ▸ *Pedido:* ${p.cantidad} ${p.unidad}\n`;
            texto += `   ▸ *Categoría:* ${p.categoria}\n`;
            if (p.stockCamara) {
                texto += `   ▸ *Stock Cámara:* ${p.stockCamara}\n`;
            }
            if (p.proyeccion) {
                texto += `   ▸ *Sugerencia:* ${p.proyeccion}\n`;
            }
            texto += `\n`;
        });

        const totalKg = lista.productos.reduce((acc, curr) => acc + (parseFloat(curr.cantidad) || 0), 0);
        texto += `━━━━━━━━━━━━━━━━━━━━\n`;
        texto += `📊 *Total:* ${lista.productos.length} productos (~${totalKg.toFixed(1)} kg/und)\n`;
        texto += `📍 *Mar & Marea Cevichería — Sistema Willy ERP*`;

        return texto;
    }

    generarTextoWhatsappInsumos(prods: CompraInsumo[], titulo: string): string {
        const fechaHora = this.formatearFechaHora(new Date());
        let texto = `🛒 *LISTA DE COMPRAS — ${titulo.toUpperCase()}*\n`;
        texto += `📅 *Generado:* ${fechaHora}\n`;
        texto += `━━━━━━━━━━━━━━━━━━━━\n`;
        texto += `📦 *PRODUCTOS (${prods.length} ítems):*\n\n`;

        prods.forEach((p, idx) => {
            const iconoPrio = p.prioridad === 'Urgente' ? '🔴 *[URGENTE]*' : '🟢';
            texto += `${idx + 1}. *${p.nombre}* ${iconoPrio}\n`;
            texto += `   ▸ *Cantidad:* ${p.cantidad} ${p.unidad} (${p.categoria})\n`;
            if (p.stockCamara) {
                texto += `   ▸ *Stock en Cámara:* ${p.stockCamara}\n`;
            }
            if (p.proyeccion) {
                texto += `   ▸ *Detalle:* ${p.proyeccion}\n`;
            }
            texto += `\n`;
        });

        texto += `━━━━━━━━━━━━━━━━━━━━\n`;
        texto += `📊 *Total:* ${prods.length} productos seleccionados\n`;
        texto += `📍 *Mar & Marea Cevichería — Sistema Willy ERP*`;

        return texto;
    }

    enviarWhatsapp(): void {
        const mensajeEncoded = encodeURIComponent(this.whatsappTextoPreview);
        let url = '';

        const telLimpio = (this.whatsappTelefono || '').replace(/\D/g, '');
        if (telLimpio) {
            const numeroFinal = telLimpio.startsWith('51') ? telLimpio : `51${telLimpio}`;
            url = `https://api.whatsapp.com/send?phone=${numeroFinal}&text=${mensajeEncoded}`;
        } else {
            url = `https://api.whatsapp.com/send?text=${mensajeEncoded}`;
        }

        window.open(url, '_blank');
        this.dialogWhatsapp = false;

        this.messageService.add({
            severity: 'success',
            summary: 'WhatsApp Abierto',
            detail: 'Abriendo WhatsApp con la lista de compras...',
            life: 3000
        });
    }

    copiarTextoWhatsapp(): void {
        navigator.clipboard.writeText(this.whatsappTextoPreview).then(() => {
            this.messageService.add({
                severity: 'info',
                summary: 'Copiado',
                detail: 'El mensaje de la lista fue copiado al portapapeles.',
                life: 2500
            });
        }).catch(() => {
            this.messageService.add({
                severity: 'warn',
                summary: 'No se pudo copiar',
                detail: 'Copia el texto manualmente desde el recuadro.',
                life: 3000
            });
        });
    }

    // ─── HELPERS DE FORMATO ────────────────────────────────────────
    private formatearHoraActual(): string {
        const d = new Date();
        let h = d.getHours();
        const m = d.getMinutes().toString().padStart(2, '0');
        const ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12;
        h = h ? h : 12;
        return `${h.toString().padStart(2, '0')}:${m} ${ampm}`;
    }

    private formatearFechaHora(d: Date): string {
        const dia = d.getDate().toString().padStart(2, '0');
        const mes = (d.getMonth() + 1).toString().padStart(2, '0');
        const yyyy = d.getFullYear();
        let h = d.getHours();
        const m = d.getMinutes().toString().padStart(2, '0');
        const ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12;
        h = h ? h : 12;
        return `${dia}/${mes}/${yyyy} ${h.toString().padStart(2, '0')}:${m} ${ampm}`;
    }

    getCategoriaEmoji(categoria: string): string {
        const map: Record<string, string> = {
            'Pescados y Mariscos': '🐟',
            'Verduras y Tubérculos': '🥬',
            'Cítricos': '🍋',
            'Insumos Secos': '📦',
            'Descartables': '🥡',
            'Aseo': '🧹',
            'Carnes': '🥩',
            'Bebidas': '🥤'
        };
        return map[categoria] ?? '🛒';
    }

    getDestinoIcono(destino: string): string {
        if (destino.includes('Pesquero')) return 'fa-solid fa-ship';
        if (destino.includes('Mayorista') || destino.includes('Mercado')) return 'fa-solid fa-store';
        if (destino.includes('Seco')) return 'fa-solid fa-boxes-stacked';
        return 'fa-solid fa-basket-shopping';
    }
}
