import { ChangeDetectorRef, Component, ElementRef, Input, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HomeService } from '../../service/home.service';
import { CommonModule } from '@angular/common';
import { Mesa } from '../../../model/Mesa';
import { Pedido } from '../../../model/Pedido';
import { PedidoService } from '../../service/pedido.service';
import * as _ from 'lodash';
import { VoucherService } from '../../../services/voucher.service';
import { ImportsModule } from '../../imports';
import { AperturaService } from '../../service/apertura.service';
import { Products } from '../../../model/Products';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { NuevoPedido } from '../../../model/NuevoPedido';
import { concat, forkJoin, switchMap, timeout, Subscription, interval } from 'rxjs';
import { NuevoPedidodetalle } from '../../../model/NuevoPedidodetalle';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { jsPDF } from 'jspdf';
import * as QRCode from 'qrcode';
import { Popover } from 'primeng/popover';
import { UniquePipe } from '../../../model/util/unique.pipe';
import { OrderByPipe } from '../../../model/util/order-by.pipe';
import { ConfirmationService, MessageService } from 'primeng/api';
import { AuthService } from '../../../services/auth.service';
import { Router } from '@angular/router';
import { SupabaseService } from '../../../services/supabase.service';
import { EmpresaService, Empresa } from '../../service/empresa.service';

@Component({
    selector: 'app-home',
    // Remove duplicate imports that are already in ImportsModule
    imports: [CommonModule, ImportsModule, UniquePipe, OrderByPipe, FormsModule],
    providers: [MessageService, ConfirmationService],
    templateUrl: './home.component.html',
    styleUrl: './home.component.scss'
})
export class HomeComponent {
    [x: string]: any;
    empresaData: Empresa | null = null;
    products: Products[] = [];
    @ViewChild('motivoTextarea') motivoTextarea!: ElementRef;
    @ViewChild('multiselect', { static: true }) multiselect!: ElementRef;
    @Input() isLoading: boolean = false; // Para activar/desactivar el loader
    pedido_seleccionado: any;
    AperturaHoy: any;
    selectedToppings: { idtoppings: number; nombre: string }[] = [];
    isDropdownOpen = false;
    toppingDialogVisible = false;
    itemActivoTopping: any = null;
    itemActivoToppingIndex = -1;

    selectedMozo: any = null;
    private authSubscription: Subscription | undefined;
    private timeUpdateSubscription: Subscription | undefined;

    // Active orders (pedidos activos) state
    entregandoPedidos: Set<number> = new Set();
    pedidosExpandidos: Set<number> = new Set();
    filtroPedidosActivos: 'todos' | 'mesas' | 'delivery' = 'todos';
    busquedaPedidosActivos: string = '';

    @ViewChild('responsableTextarea') responsableTextarea!: ElementRef;
    multiselectToppings: any[] = [];
    nuevoToppingNombre: string = '';
    guardandoTopping: boolean = false;
    discount: number = 0;
    switchValue: boolean = false;
    pedidosSeleccionados: any[] = [];
    isPanelVisible = true;
    mozos: any = [];
    mozosSeleccionadosApertura: any = [];

    mesas: Mesa[] = [];
    Pedidos: Pedido[] = [];
    estadomesa: any = {};
    Pedido_cobrar: Pedido = {
        idpedido: 0,
        delivery: 0,
        yape: 0,
        efectivo: 0,
        visa: 0,
        plin: 0,
        idproducto: 0,
        lugarpedido: undefined,
        pedido_estado: undefined,
        nombre: undefined,
        categoria: '',
        cantidad: 0,
        descripcion: '',
        estado: false,
        lugar: '',
        precioU: 0,
        total: 0,
        total_pedidos: 0,
        mesa: '',
        descuento: 0,
        comentario: ''
    };
    NuevoPedido: NuevoPedido = {
        idpedido: 0,
        lugarpedido: undefined,
        pedido_estado: undefined,
        nombre: undefined,
        cantidad: 0,
        descripcion: '',
        estado: false,
        lugar: '',
        preciounitario: 0,
        total: 0,
        descuento: 0,
        comentario: '',
        pedidodetalle: [
            {
                idpedido: 0,
                idproducto: 0,
                nombre: '',
                cantidad: 1,
                preciounitario: 0,
                total: 0,
                pedido_estado: undefined,
                lugarpedido: '0',
                idtoppings: [],
                id_created_at: undefined,
                idpedidodetalle: 0
            }
        ],
        visa: 0,
        yape: 0,
        plin: 0,
        efectivo: 0
    };

    calculator_Dialog: boolean = false;
    displayModalCalculator = false;

    mesaSeleccionada: Mesa | null = null;
    pedido_mesa_status: boolean = false;
    isOrderViewActive: boolean = false;
    isKeypadCollapsed: boolean = false;
    mobileActiveTab: 'platos' | 'pedido' = 'platos';
    activeTabIndex: number = 0;
    highlightToolbar: boolean = false;
    isDeliveryCollapsed: boolean = false;

    numeroPlato: number | null = null;
    comentarios: string = '';
    tipomodal: any = 'Registrar';
    Cobrar_Dialog: boolean = false;
    showComprobanteMenu: boolean = false;
    PDF_Dialog: boolean = false;
    pdfModalHeader: string = 'Imprimir Comprobante';
    pdfUrl: SafeResourceUrl | null = null;
    CocinaPdf_Dialog: boolean = false;
    eliminarPedidoDialog: boolean = false;
    motivo: any;
    responsable: any;
    imprimirPedidoDialog: boolean = false;
    estadopedido: number = 0;
    buscarPlato: any = '';
    mozoDialog: boolean = false;

    // Voucher QR properties
    voucherDialog: boolean = false;
    qrDialog: boolean = false;
    voucherForm: FormGroup; //
    isGeneratingVoucher: boolean = false;
    generatedVoucher: any = null;
    qrCodeSvg: string = '';

    // Move table properties
    moveTableDialog: boolean = false;
    targetMesa: Mesa | null = null;
    availableMesas: Mesa[] = [];

    // Caja status properties
    cajaAbierta: boolean = false;
    verificandoCaja: boolean = true;

    // Comprobante (Boleta / Factura)
    comprobanteDialog: boolean = false;
    tipoComprobante: '01' | '03' = '03';
    documentoBusqueda: string = '';
    clienteEncontrado: any = null;
    mostrarFormNuevoCliente: boolean = false;
    nuevoCliente = { tipo_doc: '1', num_doc: '', razon_social: '', direccion: '' };
    emitiendo: boolean = false;
    Comprobante_PDF_Dialog: boolean = false;

    async verificarCajaAbierta(): Promise<void> {
        return new Promise((resolve) => {
            this.aperturaService.ListarAperturaHoy().subscribe((response) => {
                if (response.success && response.data && response.data.length > 0) {
                    this.AperturaHoy = response.data;
                    // Check if caja is open (estado === 1 or estado === 2)
                    this.cajaAbierta = response.data[0].estado == 1 || response.data[0].estado == 2;
                    this.verificandoCaja = false;
                } else {
                    this.cajaAbierta = false;
                    this.verificandoCaja = false;
                }
                resolve();
            });
        });
    }

    irAApertura(): void {
        this.router.navigate(['/apertura']);
    }

    constructor(
        private confirmationService: ConfirmationService,
        private homeService: HomeService,
        private PedidoService: PedidoService,
        private messageService: MessageService,
        private cd: ChangeDetectorRef,
        private sanitizer: DomSanitizer,
        private fb: FormBuilder,
        private voucherService: VoucherService,
        private authService: AuthService,
        public router: Router,
        private aperturaService: AperturaService,
        private http: HttpClient,
        private supabaseService: SupabaseService,
        private empresaService: EmpresaService
    ) {
        this.voucherForm = this.fb.group({
            descripcion: ['Vale de delivery'],
            diasVencimiento: [30, [Validators.required, Validators.min(1), Validators.max(365)]]
        });
    }

    async cargarDatosEmpresa(): Promise<Empresa | null> {
        if (this.empresaData && this.empresaData.ruc) {
            return this.empresaData;
        }
        try {
            const res = await this.empresaService.getAll();
            if (res.data && res.data.length > 0) {
                this.empresaData = res.data[0];
                if (this.empresaData) {
                    if (this.empresaData.nombre_empresa) {
                        localStorage.setItem('nombre_empresa', this.empresaData.nombre_empresa);
                    }
                    if (this.empresaData.ruc) {
                        localStorage.setItem('empresa_ruc', this.empresaData.ruc);
                    }
                    if (this.empresaData.direccion) {
                        localStorage.setItem('empresa_direccion', this.empresaData.direccion);
                    }
                    if (this.empresaData.celular) {
                        localStorage.setItem('empresa_celular', this.empresaData.celular);
                    }
                    if (this.empresaData.imagen) {
                        localStorage.setItem('logo', this.empresaData.imagen);
                    }
                }
                return this.empresaData;
            }
        } catch (err) {
            console.error('Error al cargar datos de la empresa:', err);
        }
        return null;
    }

    async ngOnInit(): Promise<void> {
        this.cargarDatosEmpresa();
        // 👇 inicializamos en el constructor
        // LoaderComponent.isLoading = true; // Set loading state to true

        // Verificar autenticación al inicializar el componente
        this.checkAuthentication();

        // Subscribe to authentication state changes
        this.authSubscription = this.authService.isAuthenticated$.subscribe((authenticated: boolean) => {
            if (!authenticated) {
                this.router.navigate(['/auth/login']);
            }
        });
        // perdiendo una rama por yordy
        this.loadMozos().then(() => {
            setTimeout(() => {
                if (this.authService.isAuthenticated()) {
                    this.verificarCajaAbierta().then(() => {
                        if (this.cajaAbierta) {
                            this.cargarMesas();
                            this.ListarToppings();
                            var Trabajadores_Array = this.AperturaHoy[0].trabajadores.split(',').map((id: string) => parseInt(id.trim()));
                            // Filter mozos to only include those in Trabajadores_Array
                            if (this.mozos && this.mozos.length > 0) {
                                this.mozosSeleccionadosApertura = this.mozos.filter((mozo: any) => {
                                    return Trabajadores_Array.includes(mozo.idpersona);
                                });
                            }
                        }
                    });
                }
            }, 1000);
            // Only proceed with initialization if user is authenticated
        });

        // Setup timer to actively update elapsed times
        this.timeUpdateSubscription = interval(30000).subscribe(() => {
            // Force change detection every 30 seconds to update the active order timers
            this.cd.detectChanges();
        });
    }

    ngOnDestroy(): void {
        if (this.authSubscription) {
            this.authSubscription.unsubscribe();
        }
        if (this.timeUpdateSubscription) {
            this.timeUpdateSubscription.unsubscribe();
        }
    }

    private checkAuthentication(): void {
        if (!this.authService.isAuthenticated()) {
            // Use setTimeout to ensure navigation happens after the component is fully initialized
            setTimeout(() => {
                this.router.navigate(['/auth/login']);
            }, 0);
        }
    }

    selectMozo(mozo: any) {
        this.selectedMozo = mozo;
        this.mozoDialog = false;
        this.isOrderViewActive = true;
        this.BuscarPlatoSearchText('');
    }
    cancelMozoSelection() {
        this.mozoDialog = false;
    }

    async loadMozos() {
        try {
            this.PedidoService.loadMozos().subscribe(
                (response) => {
                    if (response.success) {
                        if (response.data) {
                            this.mozos = response.data || [];
                            this.cd.detectChanges(); // Forzar detección de cambios
                        } else {
                            this.messageService.add({ severity: 'warn', summary: 'Error', detail: 'No contiene informaciòn la consulta BuscarPlatoSearch' });
                        }
                    } else {
                        alert('Hubo un problema al conectar con el servidor');
                    }
                },
                (error) => {
                    console.error('Error al intentar consultar', error);
                    alert('Hubo un problema al conectar con el servidor');
                }
            );
        } catch (error) {
            console.error('Error loading mozos:', error);
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Error al cargar lista de mozos'
            });
        }
    }

    setNumbersSelectDashboard(value: number | 'clear') {
        if (value === 'clear') {
            this.numeroPlato = null;
        } else {
            this.numeroPlato = Number(`${this.numeroPlato ?? ''}${value}`);
        }
    }

    getTotal(campo: string, value: number): number {
        if (this.NuevoPedido[campo as keyof NuevoPedido] !== undefined) {
            (this.NuevoPedido as any)[campo] = value;
        }
        return this.NuevoPedido[campo as keyof NuevoPedido] || 0;
    }

    hideDialog() {
        this.Cobrar_Dialog = false;
    }

    CobrarPedido(NuevoPedido: any) {
        const total_ingresado = Number(this.Pedido_cobrar.yape || 0) + Number(this.Pedido_cobrar.visa || 0) + Number(this.Pedido_cobrar.plin || 0) + Number(this.Pedido_cobrar.efectivo || 0);
        this.Pedido_cobrar.idpedido = NuevoPedido.idpedido;
        if (total_ingresado == NuevoPedido.total) {
            this.PedidoService.CobrarPedido(this.Pedido_cobrar).subscribe((response) => {
                this.LimpiarNuevoPedido();
                this.cargarMesas();
                this.Cobrar_Dialog = false;
                this.mesaSeleccionada = null;
                this.messageService.add({
                    severity: 'success',
                    summary: 'Successful',
                    detail: 'Se ha cobrado correctamente el pedido',
                    life: 3000
                });
            });
        } else {
            this.messageService.add({
                severity: 'error',
                summary: 'Aviso importante',
                detail: 'No coincide los montos al cobrar con el total',
                life: 3000
            });
        }
    }

    CobrarDialog(mesa: Mesa, NuevoPedido: NuevoPedido): void {
        var total = 0;

        this.Cobrar_Dialog = true;
        if (mesa.numero == '0') {
            var status_array = this.Pedidos.filter((p) => p.idpedido === NuevoPedido.idpedido);
        } else {
            var status_array = this.Pedidos.filter((p) => p.mesa == mesa.numero);
            this.mesaSeleccionada = mesa;
        }
        if (status_array.length > 0) {
            this.NuevoPedido = this.getPedidoClick(status_array);
            var pedidos: NuevoPedido[] = [this.NuevoPedido];
            pedidos.forEach((element: any) => {
                element.pedidodetalle.forEach((element2: any) => {
                    total += element2.cantidad * element2.preciounitario;
                });
            });
        }

        this.Pedido_cobrar = {
            idpedido: this.NuevoPedido.idpedido,
            delivery: 1,
            yape: this.NuevoPedido.yape,
            efectivo: this.NuevoPedido.efectivo,
            visa: this.NuevoPedido.visa,
            plin: this.NuevoPedido.plin,
            idproducto: 0,
            lugarpedido: undefined,
            pedido_estado: undefined,
            nombre: undefined,
            categoria: '',
            cantidad: 0,
            descripcion: '',
            estado: false,
            lugar: '',
            precioU: 0,
            total: total,
            total_pedidos: 0,
            mesa: '',
            descuento: 0,
            comentario: ''
        };
    }

    ListarPedidoNumeroCalculadora() {
        this.PedidoService.BuscarPlatoSearch(this.numeroPlato, 'numero_carta').subscribe(
            (response) => {
                if (response.success) {
                    if (response.data) {
                        this.numeroPlato = null;
                        this.cd.detectChanges(); // Forzar detección de cambios
                        response.data[0].cantidad = 1; // Inicializar cantidad en 1
                        response.data[0].total = response.data[0].preciounitario; // Inicializar cantidad en 1
                        response.data[0].lugarpedido = '0'; // Inicializar cantidad en 1
                        response.data[0].idtoppings = [{ idtoppings: 0, nombre: '' }]; // Inicializar toppings
                        this.NuevoPedido.pedidodetalle.push(response.data[0]);
                    } else {
                        this.messageService.add({ severity: 'warn', summary: 'Error', detail: 'No contiene informaciòn la consulta BuscarPlatoSearch' });
                    }
                } else {
                    alert('Hubo un problema al conectar con el servidor');
                }
            },
            (error) => {
                console.error('Error al intentar consultar', error);
                alert('Hubo un problema al conectar con el servidor');
            }
        );
    }
    cargarToppingsSeleccionados(pedidosdetalle: NuevoPedidodetalle) {
        const detalle = this.NuevoPedido.pedidodetalle.find((d) => d.idpedidodetalle === pedidosdetalle.idpedidodetalle);

        if (detalle && Array.isArray(detalle.idtoppings)) {
            var toppings = (detalle.idtoppings as { idtoppings: number; nombre: string }[]).map((topping) => ({
                idtoppings: topping.idtoppings,
                nombre: topping.nombre
            }));
            this.selectedToppings = [...toppings];
        } else {
            this.selectedToppings = [];
        }
    }

    /** Abre el dialog global de toppings para el item específico */
    abrirToppingPanel(pedidosdetalle: NuevoPedidodetalle, event: Event) {
        event.stopPropagation();
        this.itemActivoTopping = pedidosdetalle;

        // Siempre usar referencia de objeto para encontrar el índice exacto
        this.itemActivoToppingIndex = this.NuevoPedido.pedidodetalle.findIndex((d) => d === pedidosdetalle);

        // Leer toppings directamente del objeto pasado (evita bug con find por idpedidodetalle=0)
        if (pedidosdetalle.idtoppings && Array.isArray(pedidosdetalle.idtoppings)) {
            this.selectedToppings = (pedidosdetalle.idtoppings as { idtoppings: number; nombre: string }[]).filter((t) => t && t.idtoppings && t.idtoppings > 0).map((t) => ({ idtoppings: t.idtoppings, nombre: t.nombre }));
        } else {
            this.selectedToppings = [];
        }

        this.toppingDialogVisible = true;
    }

    /** Toggle individual de un topping en el panel */
    toggleTopping(topping: { idtoppings: number; nombre: string }) {
        debugger;
        // Guard: ignorar toppings sin id válido
        if (!topping || !topping.idtoppings || topping.idtoppings <= 0) return;

        const existe = this.selectedToppings.some((t) => t.idtoppings === topping.idtoppings);
        if (existe) {
            this.selectedToppings = this.selectedToppings.filter((t) => t.idtoppings !== topping.idtoppings);
        } else {
            this.selectedToppings = [...this.selectedToppings, { idtoppings: topping.idtoppings, nombre: topping.nombre }];
        }
    }

    /** Verifica si un topping está seleccionado — con guard para idtoppings inválido */
    isToppingSelected(topping: { idtoppings: number; nombre: string }): boolean {
        if (!topping || !topping.idtoppings || topping.idtoppings <= 0) return false;
        return this.selectedToppings.some((t) => t.idtoppings === topping.idtoppings);
    }

    /** Guarda los toppings del item activo y cierra el dialog */
    guardarToppingDesdeDialog() {
        const idx = this.itemActivoToppingIndex;
        if (idx >= 0 && idx < this.NuevoPedido.pedidodetalle.length) {
            this.NuevoPedido.pedidodetalle[idx].idtoppings = [...this.selectedToppings];
        }
        this.toppingDialogVisible = false;
        this.itemActivoTopping = null;
        this.itemActivoToppingIndex = -1;
        this.selectedToppings = [];
    }

    /** Crea un nuevo topping en la BD, lo agrega a la lista y lo selecciona */
    agregarNuevoTopping() {
        const nombre = this.nuevoToppingNombre.trim();
        if (!nombre) return;

        // Evitar duplicados
        const existe = this.multiselectToppings.some((t: any) => t.nombre.toLowerCase() === nombre.toLowerCase());
        if (existe) {
            this.messageService.add({ severity: 'warn', summary: 'Duplicado', detail: 'Ese topping ya existe en la lista.', life: 2500 });
            return;
        }

        this.guardandoTopping = true;
        this.PedidoService.InsertarTopping(nombre).subscribe({
            next: (response) => {
                this.guardandoTopping = false;
                if (response.success && response.data) {
                    this.multiselectToppings = [...this.multiselectToppings, response.data].sort((a: any, b: any) => a.nombre.localeCompare(b.nombre));
                    // Auto-seleccionar el nuevo topping
                    this.selectedToppings = [...this.selectedToppings, { idtoppings: response.data.idtoppings, nombre: response.data.nombre }];
                    this.nuevoToppingNombre = '';
                    this.messageService.add({ severity: 'success', summary: 'Topping agregado', detail: '"' + nombre + '" fue creado y seleccionado.', life: 2500 });
                } else {
                    this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo agregar el topping.', life: 3000 });
                }
            },
            error: () => {
                this.guardandoTopping = false;
                this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error al conectar con la base de datos.', life: 3000 });
            }
        });
    }

    agregarToppingsPedido(pedidosdetalle: NuevoPedidodetalle, op: Popover, index: number) {
        debugger;
        if (pedidosdetalle.idpedidodetalle != 0) {
            var detalleIndex = this.NuevoPedido.pedidodetalle.findIndex((d) => d.idpedidodetalle === pedidosdetalle.idpedidodetalle);
        } else {
            var detalleIndex = this.NuevoPedido.pedidodetalle[index] ? index : -1; // Buscar el índice del detalle en el array
        }

        if (this.selectedToppings.length > 0) {
            if (detalleIndex === -1) {
                // Si no existe, crear nuevo detalle
                const nuevoDetalle: NuevoPedidodetalle = {
                    idpedido: pedidosdetalle.idpedido,
                    idproducto: pedidosdetalle.idproducto,
                    nombre: pedidosdetalle.nombre,
                    cantidad: pedidosdetalle.cantidad,
                    preciounitario: pedidosdetalle.preciounitario,
                    total: pedidosdetalle.total,
                    pedido_estado: pedidosdetalle.pedido_estado,
                    lugarpedido: pedidosdetalle.lugarpedido,
                    idtoppings: [{ idtoppings: 0, nombre: '' }],
                    id_created_at: pedidosdetalle.id_created_at,
                    idpedidodetalle: 0
                };
                this.NuevoPedido.pedidodetalle.push(nuevoDetalle);
                detalleIndex = this.NuevoPedido.pedidodetalle.length - 1;
            }

            // Asegurar que idtoppings existe y es array
            if (!this.NuevoPedido.pedidodetalle[detalleIndex].idtoppings) {
                this.NuevoPedido.pedidodetalle[detalleIndex].idtoppings = [];
            }

            // Asignar los toppings (reemplazar existentes)
            this.NuevoPedido.pedidodetalle[detalleIndex].idtoppings = [...this.selectedToppings];

            this.selectedToppings = [];
            this.isDropdownOpen = false;
        } else {
            if (typeof detalleIndex === 'number' && detalleIndex >= 0) {
                this.NuevoPedido.pedidodetalle[detalleIndex].idtoppings = [];
            }
        }
        op.hide();
    }
    ListarToppings() {
        this.PedidoService.ListarToppings().subscribe(
            (response) => {
                if (response.success) {
                    if (response.data) {
                        this.multiselectToppings = response.data;
                        this.cd.detectChanges(); // Forzar detección de cambios
                    } else {
                        this.messageService.add({ severity: 'warn', summary: 'Error', detail: 'No contiene informaciòn la consulta BuscarPlatoSearch' });
                    }
                } else {
                    alert('Hubo un problema al conectar con el servidor');
                }
            },
            (error) => {
                console.error('Error al intentar consultar', error);
                alert('Hubo un problema al conectar con el servidor');
            }
        );
    }
    BuscarPlatoSearchText(buscarPlato: string) {
        this.PedidoService.BuscarPlatoSearch(buscarPlato, 'nombre').subscribe((response) => {
            if (response.success) {
                if (response.data) {
                    // Construir el HTML para cada fila y agregarlo a la tabla
                    const table = document.getElementById('listarPlatos');
                    if (table) {
                        response.data.forEach((element: any) => {
                            const tr = document.createElement('tr');
                            tr.onclick = (event) => {
                                this.agregarProducto(element, true);
                            };
                            tr.className = 'border-b border-slate-100 hover:bg-blue-50/60 active:bg-blue-100/60 cursor-pointer transition-colors group';
                            tr.innerHTML = `
                                <td class="py-2.5 px-3">
                                    <div class="font-bold text-slate-800 text-xs sm:text-sm leading-snug group-hover:text-blue-700 transition-colors">
                                        ${element.nombre || ''}
                                    </div>
                                    <div class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">
                                        Carta: ${element.numero_carta || 'S/N'}
                                    </div>
                                </td>
                                <td class="py-2.5 px-3 text-right whitespace-nowrap">
                                    <div class="inline-flex items-center justify-center bg-blue-50 text-blue-700 font-black text-xs sm:text-sm px-2.5 py-1 rounded-lg border border-blue-100 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                        S/ ${element.preciounitario || '0.00'}
                                    </div>
                                </td>
                            `;
                            table.appendChild(tr);
                        });
                    }
                }
            }
        });
    }
    agregarProducto(element: any, arg1: boolean) {
        this.cd.detectChanges(); // Forzar detección de cambios
        this.NuevoPedido.pedidodetalle.push({
            nombre: element.acronimo || '',
            idproducto: element.idproducto || 0,
            preciounitario: element.preciounitario || 0,
            cantidad: 1,
            total: element.preciounitario || 0,
            pedido_estado: undefined,
            lugarpedido: '0',
            idpedido: 0,
            idtoppings: [{ idtoppings: 0, nombre: '' }],
            id_created_at: undefined,
            idpedidodetalle: 0
        });
    }
    returntoMesas() {
        this.isOrderViewActive = false;
        this.mesaSeleccionada = null;
        this.pedido_mesa_status = false;
        this.isDeliveryCollapsed = false;
    }
    toggleDeliveryCollapse() {
        this.isDeliveryCollapsed = !this.isDeliveryCollapsed;
    }
    incrementnewPedido(product: NuevoPedidodetalle) {
        product.cantidad++;
        product.total = product.cantidad * product.preciounitario;
    }

    decrementnewPedido(product: NuevoPedidodetalle) {
        if (product.cantidad > 1) {
            product.cantidad--;
            product.total = product.cantidad * product.preciounitario;
        }
    }
    remove(product: Products) {
        const index = this.products.indexOf(product);
        if (index > -1) {
            this.products.splice(index, 1);
        }
    }

    total() {
        return this.NuevoPedido.pedidodetalle.reduce((sum, product) => sum + product.preciounitario * product.cantidad, 0) - this.discount;
    }

    async EditarPedido() {
        if (!this.mesaSeleccionada) {
            alert('Seleccione una mesa para crear el pedido');
            return;
        }

        try {
            // 1️⃣ Preparamos los datos
            const pedido = this.NuevoPedido;
            this.NuevoPedido.comentario = this.comentarios;
            const detalles = this.NuevoPedido.pedidodetalle.map((element) => ({
                ...element,
                idpedido: pedido.idpedido,
                id_created_at: 1
            }));

            // 2️⃣ Ejecutamos la transacción completa (pedido + detalles)
            const { data, error } = await this.PedidoService.editarPedidoCompleto(pedido, detalles);

            if (error || !data?.success) {
                throw new Error(data?.error || error?.message || 'Error al editar pedido');
            }

            // Reset estado_cocina to 0
            this.PedidoService.updateEstadoCocina(pedido.idpedido, 0).subscribe({
                next: () => {},
                error: (err) => console.error('Error resetting estado_cocina:', err)
            });

            // 3️⃣ Refrescamos las mesas y mostramos mensaje
            await this.cargarMesas();

            setTimeout(() => {
                this.isLoading = false;
                this.isOrderViewActive = false;
                if (this.mesaSeleccionada) {
                    const num = this.mesaSeleccionada.numero;
                    const refreshed = this.mesas.find((m) => m.numero == num) || this.mesaSeleccionada;
                    // For deliveries where numero == '0', we must assign the fresh idpedido
                    if (num === '0') {
                        // Deliveries logic to auto-select would happen here if we tracked idpedido differently,
                        // For now we just safely callccionarMesa
                        this.seleccionarMesa(refreshed);
                    } else {
                        this.seleccionarMesa(refreshed);
                    }
                }
            }, 1000);

            this.messageService.add({
                severity: 'success',
                summary: 'Successful',
                detail: 'Pedido modificado correctamente',
                life: 3000
            });

            setTimeout(() => {
                this.generateCocinaPDF(data.data || this.NuevoPedido);
            }, 1500);
        } catch (error) {
            console.error('Error en el proceso completo:', error);

            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Ocurrió un error al modificar el pedido. No se aplicaron los cambios.',
                life: 3000
            });
        }
    }

    trashPedido(pedido: NuevoPedidodetalle) {
        const index = this.NuevoPedido.pedidodetalle.indexOf(pedido);
        if (index > -1) {
            this.NuevoPedido.pedidodetalle.splice(index, 1);
        }

        this.messageService.add({
            severity: 'success',
            summary: 'Successful',
            detail: 'Se elimino correctamente',
            life: 3000
        });
    }

    async deletePedido() {
        if (!this.motivo) {
            this.motivoTextarea.nativeElement.focus();
            this.messageService.add({
                severity: 'warn',
                summary: 'Aviso',
                detail: 'Ingresar motivo de eliminaciòn',
                life: 3000
            });
            return;
        }
        if (!this.responsable) {
            this.responsableTextarea.nativeElement.focus();
            this.messageService.add({
                severity: 'warn',
                summary: 'Aviso',
                detail: 'Ingresar respopnsable de eliminaciòn',
                life: 3000
            });
            return;
        }
        (await this.PedidoService.deletePedido(this.NuevoPedido.idpedido, this.motivo, this.responsable)).subscribe((response) => {
            this.LimpiarNuevoPedido();
            this.cargarMesas();
            this.mesaSeleccionada = null;
            this.eliminarPedidoDialog = false;
            this.cd.detectChanges(); // Forzar detección de cambios
            this.messageService.add({
                severity: 'success',
                summary: 'Successful',
                detail: 'Product Deleted',
                life: 3000
            });
        });
    }

    FunctionButtonPedido(pedido: NuevoPedido) {
        if (this.tipomodal === 'Registrar') {
            this.RegistrarPedido();
        } else if (this.tipomodal === 'Editar') {
            this.EditarPedido();
        }
    }

    async RegistrarPedido() {
        this.isLoading = true; // Activar el loader
        if (this.mesaSeleccionada) {
            if (this.mesaSeleccionada.numero == '0') {
                if (!this.NuevoPedido.cliente || this.NuevoPedido.cliente?.trim() === '') {
                    document.getElementById('cliente')?.focus();
                    this.messageService.add({
                        severity: 'info',
                        summary: 'Ingresar Cliente',
                        detail: 'Debes ingresar el Cliente para registrar el pedido',
                        life: 3000
                    });
                    this.isLoading = false;
                    return;
                }
            } else {
                if (this.selectedMozo.idpersona == null) {
                    this.messageService.add({
                        severity: 'info',
                        summary: 'Ingresar Producto',
                        detail: 'Seleccione un mozo',
                        life: 3000
                    });
                    this.isLoading = false;
                    return;
                }
                this.NuevoPedido.idmozo = this.selectedMozo.idpersona;
            }

            if (this.NuevoPedido.pedidodetalle.length == 0) {
                this.messageService.add({
                    severity: 'info',
                    summary: 'Ingresar Producto',
                    detail: 'Seleccione un producto para registrar el pedido',
                    life: 3000
                });
                this.isLoading = false;
                return;
            }

            try {
                // 1️⃣ Preparamos los datos
                const pedido = this.NuevoPedido;
                const now = new Date();

                const fechaPeru = now.toLocaleDateString('en-CA', {
                    timeZone: 'America/Lima'
                });

                this.NuevoPedido.comentario = this.comentarios;
                this.NuevoPedido.fecha = fechaPeru;
                this.NuevoPedido.mesa = this.mesaSeleccionada.numero;

                const detalles = this.NuevoPedido.pedidodetalle.map((element) => ({
                    ...element,
                    idpedido: pedido.idpedido,
                    id_created_at: 1
                }));

                // 2️⃣ Ejecutamos la transacción completa (pedido + detalles)
                const { data, error } = await this.PedidoService.insertarPedidoCompleto(pedido, detalles);
                if (error || !data?.success) {
                    throw new Error(data?.error || error?.message || 'Error al registrar pedido');
                }
                await this.cargarMesas();
                setTimeout(() => {
                    this.isLoading = false;
                    this.isOrderViewActive = false;
                    if (this.mesaSeleccionada) {
                        const num = this.mesaSeleccionada.numero;
                        const refreshed = this.mesas.find((m) => m.numero == num) || this.mesaSeleccionada;
                        if (num === '0') {
                            if (data?.idpedido) {
                                refreshed.idpedido = data.idpedido;
                            }
                            this.seleccionarMesa(refreshed);
                        } else {
                            this.seleccionarMesa(refreshed);
                        }
                    }
                }, 1000);

                this.messageService.add({
                    severity: 'success',
                    summary: 'Successful',
                    detail: 'Pedido ingresado correctamente',
                    life: 3000
                });

                setTimeout(() => {
                    this.generateCocinaPDF(data);
                }, 1000);
            } catch (error) {
                console.error('Error en el proceso completo:', error);

                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Ocurrió un error al insertar el pedido. No se aplicaron los cambios.',
                    life: 3000
                });
            }

            // } catch (error) {
            //     console.error('Error en el proceso completo:', error);

            //     this.messageService.add({
            //         severity: 'error',
            //         summary: 'Error',
            //         detail: 'Ocurrió un error al modificar el pedido. No se aplicaron los cambios.',
            //         life: 3000
            //     });
            // }

            // this.PedidoService.insertPedido(this.NuevoPedido, this.mesaSeleccionada.numero, this.comentarios)
            //     .pipe(
            //         switchMap((pedidoResponse: any) => {
            //             debugger;
            //             const pedidoId = pedidoResponse.data.idpedido;
            //             if (this.mesaSeleccionada?.numero == '0') {
            //                 this.mesaSeleccionada.idpedido = pedidoId; // Asignar el ID del pedido insertado
            //             }
            //             // Creamos un array de observables para los detalles
            //             const detallesObservables = this.NuevoPedido.pedidodetalle.map((element) => {
            //                 element.idpedido = pedidoId;
            //                 return this.PedidoService.insertPedidoDetalle(element);
            //             });

            //             // Usamos forkJoin para esperar a que TODOS los detalles se completen
            //             return forkJoin(detallesObservables);
            //         })
            //     )
            //     .subscribe({
            //         next: async () => {
            //             await this.cargarMesas();

            //             setTimeout(() => {
            //                 this.isLoading = false;
            //                 if (this.mesaSeleccionada) {
            //                     this.seleccionarMesa(this.mesaSeleccionada);
            //                 }
            //             }, 1000);

            //             this.messageService.add({
            //                 severity: 'success',
            //                 summary: 'Successful',
            //                 detail: 'Pedido registrado correctamente',
            //                 life: 3000
            //             });
            //         },
            //         error: (error) => {
            //             console.error('Error en el proceso completo:', error);
            //             this.messageService.add({
            //                 severity: 'error',
            //                 summary: 'Error',
            //                 detail: 'Ocurrió un error al registrar el pedido',
            //                 life: 3000
            //             });
            //         }
            //     });
        } else {
            alert('Seleccione una mesa para crear el pedido');
        }
    }

    editar(mesa: Mesa, pedido: NuevoPedido): void {
        this.buscarPlato = '';
        this.pedido_mesa_status = false;
        this.isOrderViewActive = true;
        if (mesa.numero == '0') {
            var status_array = this.Pedidos.filter((p) => p.idpedido === pedido.idpedido);
        } else {
            var status_array = this.Pedidos.filter((p) => p.mesa == mesa.numero);
        }
        this.NuevoPedido = this.getPedidoClick(status_array);
        this.BuscarPlatoSearchText('');
    }
    getPedidoClick(status_array: any): NuevoPedido {
        var idtoppingsArray: { idtoppings: number; nombre: string }[] = [];

        if (status_array.length > 0) {
            this.selectedMozo = status_array[0]?.persona;

            this.NuevoPedido = {
                idpedido: status_array[0]?.idpedido || 0,
                lugarpedido: undefined,
                pedido_estado: undefined,
                nombre: undefined,
                cantidad: status_array.length,
                descripcion: '',
                estado: false,
                lugar: '',
                preciounitario: 0,
                total: this.NuevoPedido.pedidodetalle.reduce((sum: number, product: { preciounitario: number; cantidad: number }) => sum + product.preciounitario * product.cantidad, 0),
                descuento: 0,
                comentario: '',
                pedidodetalle: [],
                visa: 0,
                yape: 0,
                plin: 0,
                efectivo: 0,
                cliente: status_array[0]?.cliente || '',
                idmozo: status_array[0]?.persona == undefined ? null : status_array[0]?.persona.idpersona
            };
            this.NuevoPedido.pedidodetalle = status_array[0].pedidodetalle.map(
                (pedido: { producto: any; idpedidodetalle: number; idpedido: any; nombre: any; idproducto: any; precioU: any; cantidad: any; descripcion: any; total: any; estado: any; lugarpedido: any; comentario: any }) => ({
                    idpedidodetalle: pedido.idpedidodetalle || 0,
                    idpedido: pedido.idpedido || 0,
                    nombre: pedido.producto.nombre || '',
                    idproducto: pedido.idproducto || 0,
                    preciounitario: pedido.precioU || 0,
                    cantidad: pedido.cantidad || 0,
                    descripcion: pedido.descripcion || '',
                    total: pedido.total || 0,
                    estado: pedido.estado || false,
                    lugarpedido: pedido.lugarpedido || '',
                    comentario: pedido.comentario || '',
                    idtoppings: idtoppingsArray || [],
                    id_created_at: undefined,
                    pedido_estado: undefined
                })
            );

            status_array[0].pedidodetalle.forEach((element: any) => {
                var toppings = element.toppings;
                if (toppings) {
                    var topings_ = toppings.split(',');
                    idtoppingsArray = [];
                    topings_.forEach((elementopping: any) => {
                        const topping = this.multiselectToppings.find((t: any) => t.idtoppings == elementopping);
                        if (topping) idtoppingsArray.push({ idtoppings: topping.idtoppings, nombre: topping.nombre });
                        const lastDetalle = this.NuevoPedido.pedidodetalle.find((detalle) => detalle.idpedidodetalle == element.idpedidodetalle);
                        // Asegurarse de que lastDetalle no sea undefined
                        if (lastDetalle) {
                            lastDetalle.idtoppings = [...idtoppingsArray];
                        }
                    });
                }
            });

            this.comentarios = status_array[0].comentario;
        } else {
            // alert(2)
            // alert('No hay pedidos en esta mesa');
        }
        if (this.mesaSeleccionada?.numero == '0') {
            this.NuevoPedido.delivery = 1;
        }
        return this.NuevoPedido;
    }

    getNombreMozo(idmozo: any): any {
        if (!this.AperturaHoy || !this.AperturaHoy[0] || !this.AperturaHoy[0].trabajadores) {
            return '';
        }

        var Trabajadores_Array = this.AperturaHoy[0].trabajadores.split(',').map((id: string) => parseInt(id.trim()));

        if (this.mozos && this.mozos.length > 0) {
            const mozo = this.mozos.find((m: { idpersona: number }) => m.idpersona === idmozo && Trabajadores_Array.includes(m.idpersona));
            return mozo ? mozo.nombres : '';
        }

        return '';
    }

    async cargarMesas(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.LimpiarNuevoPedido(true);
            this.homeService.getMesas().subscribe({
                next: async (response) => {
                    if (response.success) {
                        this.mesas = response.data;
                        this.estadomesa = {};
                        this.mesas.forEach((element: any) => {
                            this.estadomesa[element.numero] = { mesa: element.numero, value: 0, piso: element.piso };
                        });
                        this.ListarPedidos();
                        resolve();
                    } else {
                        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error al consultar las mesas', life: 3000 });
                        resolve();
                    }
                },
                error: (error) => {
                    console.error('Error al intentar consultar', error);
                    this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Hubo un problema al conectar con el servidor', life: 3000 });
                    resolve();
                }
            });
        });
    }

    showModal() {
        this.displayModalCalculator = true;
        this.numeroPlato = null;
    }

    pricechange(pedidosnew: NuevoPedidodetalle) {
        if (pedidosnew.preciounitario > 0) {
            pedidosnew.total = pedidosnew.cantidad * pedidosnew.preciounitario;
        }
    }

    async ListarPedidos(): Promise<void> {
        return new Promise((resolve) => {
            this.Pedidos = [];
            this.PedidoService.ListarPedidosMesa().subscribe({
                next: (response) => {
                    if (response.success) {
                        this.Pedidos = response.data || [];
                        if (this.Pedidos.length > 0) {
                            Object.values(this.estadomesa).forEach((element: any) => {
                                if (element.mesa != 0) {
                                    const hayPedido = this.Pedidos.some((pedido: any) => 
                                        String(pedido.mesa).trim() === String(element.mesa).trim() &&
                                        (pedido.estado === '1' || pedido.estado === 1)
                                    );
                                    element.value = hayPedido ? 1 : 0;
                                }
                            });
                        } else {
                            Object.values(this.estadomesa).forEach((element: any) => {
                                element.value = 0;
                            });
                            this.LimpiarNuevoPedido();
                        }
                        this.estadomesa = { ...this.estadomesa };
                        this.cd.detectChanges();
                    } else {
                        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error al consultar los pedidos de las mesas', life: 3000 });
                    }
                    resolve();
                },
                error: (error) => {
                    console.error('Error al intentar consultar', error);
                    this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Hubo un problema al conectar con el servidor', life: 3000 });
                    resolve();
                }
            });
        });
    }

    getTiempoTranscurrido(numeroMesa: string): string {
        // Find the pedido for this mesa
        const pedido = this.Pedidos.find((p) => p.mesa == numeroMesa);
        if (pedido && pedido['created_at']) {
            const createdTime = new Date(pedido['created_at']);
            const currentTime = new Date();
            const diffMinutes = Math.floor((currentTime.getTime() - createdTime.getTime()) / 60000);
            return `${diffMinutes} min`;
        }
        return '0 min';
    }

    // Helper method to get number of pedidos for a mesa
    getNumeroPedidos(numeroMesa: string): number {
        // Count pedidos for this mesa
        const pedidos = this.Pedidos.filter((p) => p.mesa == numeroMesa) as any;
        return pedidos[0].pedidodetalle.reduce((sum: number, element: any) => sum + element.cantidad, 0);
    }

    isEntregando(idpedido: number): boolean {
        return this.entregandoPedidos.has(idpedido);
    }

    setFiltroPedidosActivos(filtro: 'todos' | 'mesas' | 'delivery'): void {
        this.filtroPedidosActivos = filtro;
    }

    getTotalActiveOrdersCount(): number {
        if (!this.Pedidos || this.Pedidos.length === 0) return 0;
        const unique = _.uniqBy(this.Pedidos, 'idpedido');
        return unique.filter((p: any) => p.estado_cocina != 1).length;
    }

    getMesasActiveOrdersCount(): number {
        if (!this.Pedidos || this.Pedidos.length === 0) return 0;
        const unique = _.uniqBy(this.Pedidos, 'idpedido');
        return unique.filter((p: any) => p.estado_cocina != 1 && p.mesa != '0').length;
    }

    getDeliveryActiveOrdersCount(): number {
        if (!this.Pedidos || this.Pedidos.length === 0) return 0;
        const unique = _.uniqBy(this.Pedidos, 'idpedido');
        return unique.filter((p: any) => p.estado_cocina != 1 && p.mesa == '0').length;
    }

    /**
     * Get unique active orders for the active orders section.
     * Groups by idpedido, filters out delivered orders (estado_cocina = 1),
     * applies tab filter and search filter, sorts by created_at (oldest first).
     */
    getActiveUniqueOrders(): Pedido[] {
        if (!this.Pedidos || this.Pedidos.length === 0) return [];

        let uniqueOrders = _.uniqBy(this.Pedidos, 'idpedido');
        uniqueOrders = uniqueOrders.filter((pedido: any) => pedido.estado_cocina != 1);

        if (this.filtroPedidosActivos === 'mesas') {
            uniqueOrders = uniqueOrders.filter((p: any) => p.mesa != '0');
        } else if (this.filtroPedidosActivos === 'delivery') {
            uniqueOrders = uniqueOrders.filter((p: any) => p.mesa == '0');
        }

        if (this.busquedaPedidosActivos && this.busquedaPedidosActivos.trim() !== '') {
            const query = this.busquedaPedidosActivos.trim().toLowerCase();
            uniqueOrders = uniqueOrders.filter((p: any) => {
                const mesa = String(p.mesa || '').toLowerCase();
                const mozo = String(p.persona?.nombres || '').toLowerCase();
                const cliente = String(p.cliente || '').toLowerCase();
                const idpedido = String(p.idpedido || '').toLowerCase();
                const tienePlato = p.pedidodetalle?.some((d: any) =>
                    String(d.producto?.nombre || d.nombre || '').toLowerCase().includes(query)
                );
                return (
                    mesa.includes(query) ||
                    mozo.includes(query) ||
                    cliente.includes(query) ||
                    idpedido.includes(query) ||
                    tienePlato
                );
            });
        }

        uniqueOrders.sort((a: any, b: any) => {
            const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
            const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
            return dateA - dateB;
        });

        return uniqueOrders;
    }

    /**
     * Get elapsed time for a specific order based on its created_at
     */
    getTiempoTranscurridoPedido(createdAt: string): number {
        if (!createdAt) return 0;
        const parseable = createdAt.includes('T') ? createdAt : createdAt.replace(' ', 'T');
        const createdTime = new Date(parseable);
        const currentTime = new Date();
        const diffMs = currentTime.getTime() - createdTime.getTime();
        const diffMinutes = Math.floor(diffMs / 60000);
        return diffMinutes >= 0 ? diffMinutes : 0;
    }

    getTiempoBadgeClass(createdAt: string): string {
        const min = this.getTiempoTranscurridoPedido(createdAt);
        if (min >= 30) {
            return 'bg-red-600 text-white animate-pulse border border-red-300 shadow-sm';
        } else if (min >= 15) {
            return 'bg-amber-500 text-white border border-amber-300 shadow-sm';
        } else {
            return 'bg-emerald-600 text-white border border-emerald-400 shadow-sm';
        }
    }

    getTiempoEstadoLabel(createdAt: string): string {
        const min = this.getTiempoTranscurridoPedido(createdAt);
        if (min >= 30) {
            return '¡Demorado!';
        } else if (min >= 15) {
            return 'En espera';
        } else {
            return 'A tiempo';
        }
    }

    getToppingsList(toppings: any): string[] {
        if (!toppings) return [];
        if (Array.isArray(toppings)) {
            return toppings.map((t: any) => (typeof t === 'object' ? t.nombre || '' : String(t))).filter(Boolean);
        }
        const tStr = String(toppings).trim();
        if (!tStr || tStr === '0') return [];
        const ids = tStr.split(',').map((id: string) => id.trim()).filter((id: string) => id !== '' && id !== '0');
        return ids.map((id: string) => {
            const found = this.multiselectToppings.find((t: any) => String(t.idtoppings) === id);
            return found ? found.nombre : '';
        }).filter(Boolean);
    }

    irAMesaDePedido(pedido: any): void {
        if (!pedido) return;
        if (pedido.mesa == '0') {
            this.seleccionarMesa({ numero: '0', estado: '0', pedidos: [], idpedido: pedido.idpedido } as any);
        } else {
            const mesaEncontrada = this.mesas.find((m: any) => String(m.numero).trim() === String(pedido.mesa).trim());
            if (mesaEncontrada) {
                this.seleccionarMesa(mesaEncontrada);
            }
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    imprimirComandaDesdeCard(pedido: any): void {
        if (!pedido) return;
        this.generateCocinaPDFCard(pedido);
    }

    generateCocinaPDFCard(pedido: any): void {
        this.isLoading = true;
        const targetId = pedido?.idpedido;

        const renderDoc = (dataCocina: any) => {
            const mesaValue = (dataCocina?.mesa !== undefined && dataCocina?.mesa !== null && dataCocina?.mesa !== '') 
                ? dataCocina.mesa 
                : pedido?.mesa;

            const doc = this.generarComandaCocinaPdf({
                idpedido: dataCocina?.idpedido || targetId,
                mesa: mesaValue,
                cliente: dataCocina?.cliente || pedido?.cliente,
                created_at: dataCocina?.created_at || pedido?.created_at,
                comentario: dataCocina?.comentario || pedido?.comentario,
                pedidodetalle: (dataCocina?.pedidodetalle && dataCocina.pedidodetalle.length > 0) ? dataCocina.pedidodetalle : (pedido?.pedidodetalle || [])
            });

            const pdfBlob = doc.output('blob');
            const pdfBlobUrl = URL.createObjectURL(pdfBlob);
            this.PDFdescargar(pdfBlobUrl, 'Imprimir Comanda Cocina');
            this.isLoading = false;
        };

        if (!targetId) {
            renderDoc(pedido);
            return;
        }

        this.PedidoService.ShowProductosPdf(targetId, 'cocina').subscribe({
            next: (response: any) => {
                let dataCocina = response?.data;
                if (!dataCocina || !dataCocina.pedidodetalle || dataCocina.pedidodetalle.length === 0) {
                    dataCocina = pedido;
                }
                renderDoc(dataCocina);
            },
            error: () => {
                renderDoc(pedido);
            }
        });
    }

    imprimirTicketDesdeCard(pedido: any): void {
        if (!pedido) return;
        this.generatePDF(pedido);
    }

    toggleExpandirPedido(idpedido: number): void {
        if (!idpedido) return;
        if (this.pedidosExpandidos.has(idpedido)) {
            this.pedidosExpandidos.delete(idpedido);
        } else {
            this.pedidosExpandidos.add(idpedido);
        }
    }

    isPedidoExpandido(idpedido: number): boolean {
        return !!idpedido && this.pedidosExpandidos.has(idpedido);
    }

    entregarPedido(pedido: any): void {
        if (!pedido || !pedido.idpedido) return;
        if (this.entregandoPedidos.has(pedido.idpedido)) return;

        this.entregandoPedidos.add(pedido.idpedido);

        this.PedidoService.updateEstadoCocina(pedido.idpedido, 1).subscribe({
            next: async (response) => {
                pedido.estado_cocina = 1;
                if (this.Pedidos && this.Pedidos.length > 0) {
                    this.Pedidos.forEach((p: any) => {
                        if (p.idpedido === pedido.idpedido) {
                            p.estado_cocina = 1;
                        }
                    });
                }
                this.entregandoPedidos.delete(pedido.idpedido);
                this.cd.detectChanges();

                const mesaLabel = pedido.mesa == '0' ? 'Delivery' : `Mesa ${pedido.mesa}`;
                this.messageService.add({
                    severity: 'success',
                    summary: '¡Pedido Entregado!',
                    detail: `Pedido #${pedido.idpedido} (${mesaLabel}) marcado como entregado`,
                    life: 3000
                });

                await this.cargarMesas();
                this.cd.detectChanges();
            },
            error: (err) => {
                this.entregandoPedidos.delete(pedido.idpedido);
                this.cd.detectChanges();
                console.error('Error al marcar pedido como entregado:', err);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'No se pudo marcar como entregado',
                    life: 3000
                });
            }
        });
    }

    /**
     * Trigger the delete modal from the active orders card
     */
    eliminarPedidoDesdeCard(pedido: any): void {
        this.NuevoPedido.idpedido = pedido.idpedido;
        this.eliminarPedidoDialog = true;
        this.motivo = '';
        this.responsable = '';
    }

    pagarTodo(metodo: 'efectivo' | 'visa' | 'yape' | 'plin') {
        // Reiniciar todos
        this.Pedido_cobrar.efectivo = 0;
        this.Pedido_cobrar.visa = 0;
        this.Pedido_cobrar.yape = 0;
        this.Pedido_cobrar.plin = 0;

        // Colocar el total en el método elegido
        this.Pedido_cobrar[metodo] = this.Pedido_cobrar.total;
    }

    get totalCobradoIngresado(): number {
        return +(
            (Number(this.Pedido_cobrar?.efectivo) || 0) +
            (Number(this.Pedido_cobrar?.visa) || 0) +
            (Number(this.Pedido_cobrar?.yape) || 0) +
            (Number(this.Pedido_cobrar?.plin) || 0)
        ).toFixed(2);
    }

    get diferenciaCobro(): number {
        const total = Number(this.Pedido_cobrar?.total) || 0;
        return +(this.totalCobradoIngresado - total).toFixed(2);
    }

    // Helper method to get mozo name for a mesa
    getNombreMozopedido(numeroMesa: string): string {
        // Find the pedido for this mesa
        const pedido = this.Pedidos.find((p) => p.mesa == numeroMesa);
        if (pedido && pedido.persona && pedido.persona.nombres) {
            // Return first name and first letter of last name
            const nombres = pedido.persona.nombres.split(' ');
            if (nombres.length > 1) {
                return `${nombres[0]} ${nombres[1].charAt(0)}.`;
            }
            return nombres[0];
        }
        return 'Sin mozo';
    }

    // Helper method to get total amount for a mesa
    getTotalMesa(numeroMesa: string): string {
        // Find all pedidos for this mesa and sum their totals
        const pedidos = this.Pedidos.filter((p) => p.mesa == numeroMesa);
        const total = pedidos.reduce((sum, pedido) => {
            return sum + (pedido.total || 0);
        }, 0);
        return total.toFixed(2);
    }
    seleccionarMesa(mesa: Mesa): void {
        this.isLoading = true;
        this.LimpiarNuevoPedido(false);

        // Switch to appropriate tab based on the table's floor
        if (mesa.piso === '1') {
            this.activeTabIndex = 0;
        } else if (mesa.piso === '2') {
            this.activeTabIndex = 1;
        }

        if (this.tipomodal === 'Editar') {
            this.mesaSeleccionada = null;
            this.NuevoPedido = {
                idpedido: 0,
                lugarpedido: undefined,
                pedido_estado: undefined,
                nombre: undefined,
                cantidad: 0,
                descripcion: '',
                estado: false,
                lugar: '',
                preciounitario: 0,
                total: 0,
                descuento: 0,
                comentario: '',
                pedidodetalle: [],
                visa: 0,
                yape: 0,
                plin: 0,
                efectivo: 0
            };
        }
        this.tipomodal = 'Registrar';
        // this.LimpiarNuevoPedido();
        this.comentarios = '';
        this.pedido_mesa_status = false;
        this.mesaSeleccionada = mesa;
        if (mesa.numero == '0') {
            this.BuscarPlatoSearchText('');

            // Delivery
            this.NuevoPedido.delivery = 1;
            if (mesa.idpedido && mesa.idpedido > 0) {
                var status_array = this.Pedidos.filter((p) => p.idpedido == mesa.idpedido);
                if (status_array.length > 0) {
                    this.pedido_mesa_status = true;
                    this.tipomodal = 'Editar';
                } else {
                    this.tipomodal = 'Registrar';
                    if (this.mozosSeleccionadosApertura && this.mozosSeleccionadosApertura.length === 1) {
                        this.selectMozo(this.mozosSeleccionadosApertura[0]);
                    } else {
                        this.mozoDialog = true;
                        this.selectedMozo = [];
                    }
                }
            } else {
                this.NuevoPedido.idmozo = 1;
                this.selectedMozo = { idmozo: 1, nombre: 'Delivery' };
                this.isOrderViewActive = true;
            }
        } else {
            this.NuevoPedido.delivery = 0;
            if (this.Pedidos) {
                var status_array = this.Pedidos.filter((p) => String(p.mesa).trim() === String(mesa.numero).trim());
                if (status_array.length > 0) {
                    this.pedido_mesa_status = true;
                    this.tipomodal = 'Editar';
                } else {
                    this.pedido_mesa_status = false;
                    this.tipomodal = 'Registrar';
                    if (this.mozosSeleccionadosApertura && this.mozosSeleccionadosApertura.length === 1) {
                        this.selectMozo(this.mozosSeleccionadosApertura[0]);
                    } else {
                        this.mozoDialog = true;
                    }
                }
            } else {
                this.pedido_mesa_status = false;
            }
        }

        if (this.pedido_mesa_status) {
            this.hydrateNuevoPedido(mesa.numero, this.pedido_mesa_status, this.mesaSeleccionada);
            if (typeof window !== 'undefined' && window.innerWidth < 1440) {
                this.isDeliveryCollapsed = true;
            }
        }

        // Fix: Ensure timeout callback properly handles component state
        setTimeout(() => {
            if (this.isLoading) {
                this.isLoading = false;
            }

            if (this.pedido_mesa_status) {
                this.highlightToolbar = true;
                this.cd.detectChanges(); // ensure view updates before scrolling

                const isResponsive = typeof window !== 'undefined' && window.innerWidth <= 991;

                if (isResponsive) {
                    setTimeout(() => {
                        const cuentaEl = document.getElementById('mesa-cuenta-panel') || document.getElementById('panel-mesa-cuenta');
                        if (cuentaEl) {
                            cuentaEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                    }, 50);
                } else {
                    const toolbarEl = document.getElementById('action-buttons-toolbar');
                    if (toolbarEl) {
                        toolbarEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }

                setTimeout(() => {
                    this.highlightToolbar = false;
                    this.cd.detectChanges();
                }, 1800);
            }
        }, 300);
    }
    loadImageBase64(path: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.src = path;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                if (!ctx) return reject('No se pudo obtener el contexto del canvas');
                ctx.drawImage(img, 0, 0);
                const dataURL = canvas.toDataURL('image/png');
                resolve(dataURL);
            };
            img.onerror = (error) => reject(error);
        });
    }

    async generatePDF(pedido: NuevoPedido) {
        this.isLoading = true;
        await this.cargarDatosEmpresa();

        // Determinar logo de la empresa (custom de Datos de la Empresa o fallback a assets)
        let base64Logo: string | null = null;
        if (this.empresaData?.imagen && this.empresaData.imagen.startsWith('data:image')) {
            base64Logo = this.empresaData.imagen;
        } else {
            const savedLogo = localStorage.getItem('logo');
            if (savedLogo && savedLogo.startsWith('data:image')) {
                base64Logo = savedLogo;
            } else {
                base64Logo = await this.loadImageBase64('assets/img/logo.png').catch(() => null);
            }
        }

        let targetId = pedido?.idpedido || this.NuevoPedido?.idpedido;
        if (!targetId && this.mesaSeleccionada) {
            const found = this.Pedidos.find((p) => String(p.mesa).trim() === String(this.mesaSeleccionada?.numero).trim());
            if (found) targetId = found.idpedido;
        }

        const renderTicketDoc = (ticketData: any) => {
            const items = ticketData.pedidodetalle || [];
            const nombreEmpresa = this.empresaData?.nombre_empresa || localStorage.getItem('nombre_empresa') || 'El Puerto Cevichero de Willy';
            const rucEmpresa = this.empresaData?.ruc || localStorage.getItem('empresa_ruc') || '20431738806';
            const direccionEmpresa = this.empresaData?.direccion || localStorage.getItem('empresa_direccion') || '';
            const celularEmpresa = this.empresaData?.celular || localStorage.getItem('empresa_celular') || '';

            // Estimación dinámica de altura
            let calcHeight = 8;
            if (base64Logo) calcHeight += 26;
            calcHeight += 6;
            if (rucEmpresa) calcHeight += 3.5;
            if (direccionEmpresa) calcHeight += (Math.ceil(direccionEmpresa.length / 38) || 1) * 3.5;
            if (celularEmpresa) calcHeight += 3.5;
            calcHeight += 6; // Título pre-cuenta
            calcHeight += 12; // Fecha, Mesa, Cliente
            calcHeight += 7; // Encabezados columnas

            items.forEach((elem: any) => {
                const pNom = (elem.producto?.nombre || elem.nombre || 'PLATO').toUpperCase();
                const lines = Math.ceil(pNom.length / 22) || 1;
                calcHeight += Math.max(lines * 3.8, 4.5) + 1.5;
            });

            calcHeight += 18; // Total y separadores
            calcHeight += 14; // Pie y margen inferior

            const finalHeight = Math.max(75, Math.ceil(calcHeight));

            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: [80, finalHeight]
            });

            let y = 6;
            const centerX = 40;

            // Logo centrado si existe
            if (base64Logo) {
                doc.addImage(base64Logo, 'PNG', 28, y, 24, 24);
                y += 26;
            }

            // Encabezado empresa
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(11);
            const nombreLines = doc.splitTextToSize(nombreEmpresa, 70);
            nombreLines.forEach((line: string) => {
                doc.text(line, centerX, y, { align: 'center' });
                y += 4.5;
            });

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            if (rucEmpresa) {
                doc.text('RUC: ' + rucEmpresa, centerX, y, { align: 'center' });
                y += 3.5;
            }
            if (direccionEmpresa) {
                const dirLines = doc.splitTextToSize(direccionEmpresa, 70);
                dirLines.forEach((line: string) => {
                    doc.text(line, centerX, y, { align: 'center' });
                    y += 3.5;
                });
            }
            if (celularEmpresa) {
                doc.text('TEL: ' + celularEmpresa, centerX, y, { align: 'center' });
                y += 3.5;
            }

            y += 1;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9.5);
            doc.text('PRE-CUENTA / TICKET', centerX, y, { align: 'center' });
            y += 2;
            doc.setLineWidth(0.3);
            doc.line(5, y, 75, y);
            y += 3.5;

            // Datos del pedido
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            const fechaStr = this.formatFechaPeruTicket(new Date());
            doc.text('Fecha: ' + fechaStr, 5, y);
            y += 3.5;

            doc.setFont('helvetica', 'bold');
            const numMesaVal = ticketData.mesa != null ? ticketData.mesa : (this.mesaSeleccionada?.numero || '0');
            if (numMesaVal == '0') {
                doc.text('Cliente: ' + (ticketData.cliente || this.NuevoPedido?.cliente || 'Delivery / Llevar'), 5, y);
            } else {
                doc.text('Mesa: ' + numMesaVal + (ticketData.cliente ? ` - ${ticketData.cliente}` : ''), 5, y);
            }
            y += 2;
            doc.setLineWidth(0.3);
            doc.line(5, y, 75, y);
            y += 3.5;

            // Cabecera de columnas
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8.5);
            doc.text('CANT', 5, y);
            doc.text('DESCRIPCIÓN', 16, y);
            doc.text('TOTAL', 75, y, { align: 'right' });
            y += 1.5;
            doc.setLineWidth(0.2);
            doc.line(5, y, 75, y);
            y += 3.5;

            // Platos
            let totalCalculado = 0;
            items.forEach((element: any) => {
                const cant = Number(element.cantidad) || 1;
                const prodNombre = (element.producto?.nombre || element.nombre || 'PLATO').toUpperCase();
                const pUnit = element.precioU != null ? Number(element.precioU) : (Number(element.preciounitario) || 0);
                const subtotal = element.total != null ? Number(element.total) : (cant * pUnit);
                totalCalculado += subtotal;

                // Cantidad
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(9.5);
                doc.text(`${cant}`, 5, y);

                // Nombre envuelto (nunca choca con cantidad ni con importe)
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(8.5);
                const nameLines = doc.splitTextToSize(prodNombre, 43);
                nameLines.forEach((line: string, idx: number) => {
                    doc.text(line, 16, y + (idx * 3.8));
                });

                // Importe
                doc.text(`S/${subtotal.toFixed(2)}`, 75, y, { align: 'right' });

                y += Math.max(nameLines.length * 3.8, 4) + 1.5;
            });

            // Total
            doc.setLineWidth(0.3);
            doc.line(5, y, 75, y);
            y += 4.5;

            const finalTotal = ticketData.total != null ? Number(ticketData.total) : totalCalculado;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12.5);
            doc.text('TOTAL: S/' + finalTotal.toFixed(2), 75, y, { align: 'right' });
            y += 5.5;

            doc.setLineWidth(0.3);
            doc.line(5, y, 75, y);
            y += 4;

            // Pie
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.text('¡Gracias por su visita!', centerX, y, { align: 'center' });
            y += 3.5;
            doc.setFontSize(7);
            doc.text('Documento de control interno', centerX, y, { align: 'center' });

            const pdfBlob = doc.output('blob');
            const pdfUrl = URL.createObjectURL(pdfBlob);
            this.PDFdescargar(pdfUrl, 'Imprimir Ticket');
            this.isLoading = false;
        };

        if (!targetId) {
            const fallback = this.NuevoPedido?.pedidodetalle?.length ? this.NuevoPedido : null;
            if (fallback) {
                renderTicketDoc(fallback);
                return;
            }
            this.messageService.add({
                severity: 'warn',
                summary: 'Atención',
                detail: 'No se encontró un pedido activo para generar el ticket.',
                life: 3000
            });
            this.isLoading = false;
            return;
        }

        this.PedidoService.ShowProductosPdf(targetId, 'ticket').subscribe({
            next: (response) => {
                let pedidoData = response?.data;
                if (!pedidoData || !pedidoData.pedidodetalle || pedidoData.pedidodetalle.length === 0) {
                    const fallback = this.Pedidos.find((p) => p.idpedido == targetId) || this.NuevoPedido;
                    if (fallback && fallback.pedidodetalle && fallback.pedidodetalle.length > 0) {
                        pedidoData = fallback;
                    }
                }

                if (!pedidoData) {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'No se encontraron datos del pedido para generar el ticket.',
                        life: 3000
                    });
                    this.isLoading = false;
                    return;
                }

                renderTicketDoc(pedidoData);
            },
            error: (err) => {
                console.error('Error al generar ticket, usando fallback:', err);
                const fallback = this.Pedidos.find((p) => p.idpedido == targetId) || this.NuevoPedido;
                if (fallback && fallback.pedidodetalle && fallback.pedidodetalle.length > 0) {
                    renderTicketDoc(fallback);
                } else {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Error al generar ticket.',
                        life: 3000
                    });
                    this.isLoading = false;
                }
            }
        });
    }

    hideDialogPdf() {
        this.PDF_Dialog = false;
        this.CocinaPdf_Dialog = false;
        this.eliminarPedidoDialog = false;
        this.voucherDialog = false;
        this.qrDialog = false;
    }

    openVoucherDialog() {
        // Check if voucher already exists for this order
        const currentPedido = this.getPedidosDeMesa(this.mesaSeleccionada?.numero, this.pedido_mesa_status, this.mesaSeleccionada)[0];

        if (currentPedido && currentPedido['vales'] && currentPedido['vales'].length > 0) {
            // Voucher exists, download it instead
            this.generatedVoucher = currentPedido['vales'][0];
            this['downloadExistingQR']();
            return;
        }

        // No voucher exists, show dialog to create one
        this.voucherForm.reset();
        this.voucherForm.patchValue({
            descripcion: 'Vale de delivery',
            diasVencimiento: 30
        });
        this.voucherDialog = true;
    }

    hasVoucher(pedido: any): boolean {
        return pedido && pedido['vales'] && pedido['vales'].length > 0;
    }

    hideVoucherDialog() {
        this.voucherDialog = false;
        this.isGeneratingVoucher = false;
    }

    hideQrDialog() {
        this.qrDialog = false;
        this.generatedVoucher = null;
        this.qrCodeSvg = '';
    }

    async generateVoucher() {
        if (this.voucherForm.valid) {
            this.isGeneratingVoucher = true;

            try {
                // Get the current order ID from the selected table
                const currentPedido = this.getPedidosDeMesa(this.mesaSeleccionada?.numero, this.pedido_mesa_status, this.mesaSeleccionada)[0];

                if (!currentPedido || !currentPedido.idpedido) {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'No hay un pedido activo para generar el vale',
                        life: 5000
                    });
                    return;
                }

                // Create or find persona for the client
                // let idpersona = 1; // Default persona

                // if (currentPedido.cliente && currentPedido.cliente.trim()) {
                //     // Try to find existing persona or create new one
                //     const personaResult = await this.voucherService.findOrCreatePersonaDni(currentPedido.cliente);
                //     if (personaResult.success && personaResult.data) {
                //         idpersona = personaResult.data.idpersona;
                //     }
                // }

                const formData = this.voucherForm.value;

                // Create voucher
                const result = await this.voucherService.createVoucher(formData.descripcion, currentPedido.idpedido, formData.diasVencimiento);

                if (result.success && result.data) {
                    this.generatedVoucher = result.data;

                    // Generate QR code with voucher data
                    const qrData = JSON.stringify({
                        id: result.data.id,
                        codigo: result.data.codigo,
                        descripcion: result.data.descripcion,
                        estado: result.data.estado,
                        fecha_creacion: result.data.fecha_creacion,
                        fecha_vencimiento: result.data.fecha_vencimiento,
                        idpersona: result.data.idpersona
                    });

                    this.qrCodeSvg = await QRCode.toString(qrData, {
                        type: 'svg',
                        width: 200,
                        margin: 2,
                        color: {
                            dark: '#000000',
                            light: '#FFFFFF'
                        }
                    });

                    this.voucherDialog = false;
                    this.qrDialog = true;

                    this.messageService.add({
                        severity: 'success',
                        summary: 'Éxito',
                        detail: `Vale generado para pedido #${currentPedido.idpedido}`,
                        life: 3000
                    });
                } else {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Error al generar el vale de delivery',
                        life: 5000
                    });
                }
            } catch (error) {
                console.error('Error generating voucher:', error);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Error al generar el vale de delivery',
                    life: 5000
                });
            } finally {
                this.isGeneratingVoucher = false;
            }
        } else {
            this.voucherForm.markAllAsTouched();
        }
    }

    private async findOrCreatePersonaByDni(dni: string): Promise<any> {
        try {
            const result = await this.voucherService.findOrCreatePersonaDni(dni);
            if (!result) {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'No se pudo crear o encontrar la persona con el DNI proporcionado',
                    life: 5000
                });
                return;
            }

            return result;
        } catch (error) {
            console.error('Error in findOrCreatePersonaByDni:', error);
            return null;
        }
    }

    async downloadQR() {
        if (this.qrCodeSvg && this.generatedVoucher) {
            try {
                // Generate QR code as data URL
                const qrDataUrl = await QRCode.toDataURL(this.generatedVoucher.codigo, {
                    width: 200,
                    margin: 2,
                    color: {
                        dark: '#000000',
                        light: '#ffffff'
                    }
                });

                // Create PDF
                const doc = new jsPDF({
                    orientation: 'portrait',
                    unit: 'mm',
                    format: 'a4'
                });

                const pageWidth = doc.internal.pageSize.getWidth();
                const pageHeight = doc.internal.pageSize.getHeight();
                const centerX = pageWidth / 2;
                let y = 20;

                // Title
                doc.setFontSize(20);
                doc.setFont('helvetica', 'bold');
                doc.text('Vale de Delivery', centerX, y, { align: 'center' });
                y += 15;

                // Code
                doc.setFontSize(16);
                doc.setFont('helvetica', 'bold');
                doc.text(`Código: ${this.generatedVoucher.codigo}`, centerX, y, { align: 'center' });
                y += 10;

                // Description
                doc.setFontSize(12);
                doc.setFont('helvetica', 'normal');
                doc.text(this.generatedVoucher.descripcion || '', centerX, y, { align: 'center' });
                y += 15;

                // QR Code
                const qrSize = 80;
                const qrX = centerX - qrSize / 2;
                doc.addImage(qrDataUrl, 'PNG', qrX, y, qrSize, qrSize);
                y += qrSize + 15;

                // Details
                doc.setFontSize(11);
                doc.setFont('helvetica', 'normal');
                const validUntil = new Date(this.generatedVoucher.fecha_vencimiento).toLocaleDateString('es-PE');
                doc.text(`Válido hasta: ${validUntil}`, centerX, y, { align: 'center' });
                y += 8;
                doc.text(`Estado: ${this.generatedVoucher.estado == 1 ? 'Activo' : 'Usado'}`, centerX, y, { align: 'center' });

                // Convert PDF to blob URL
                const pdfBlob = doc.output('blob');
                const pdfUrl = URL.createObjectURL(pdfBlob);
                this.pdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(pdfUrl);

                // Show PDF dialog
                this.PDF_Dialog = true;

                this.messageService.add({
                    severity: 'success',
                    summary: 'PDF Generado',
                    detail: 'QR generado en PDF correctamente',
                    life: 3000
                });
            } catch (error) {
                console.error('Error generating QR PDF:', error);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Error al generar el PDF del QR',
                    life: 3000
                });
            }
        }
    }

    async downloadExistingQR() {
        if (this.generatedVoucher) {
            try {
                // Generate QR code as data URL
                const qrDataUrl = await QRCode.toDataURL(this.generatedVoucher.codigo, {
                    width: 200,
                    margin: 2,
                    color: {
                        dark: '#000000',
                        light: '#ffffff'
                    }
                });

                // Create PDF
                const doc = new jsPDF({
                    orientation: 'portrait',
                    unit: 'mm',
                    format: 'a4'
                });

                const pageWidth = doc.internal.pageSize.getWidth();
                const pageHeight = doc.internal.pageSize.getHeight();
                const centerX = pageWidth / 2;
                let y = 20;

                // Title
                doc.setFontSize(20);
                doc.setFont('helvetica', 'bold');
                doc.text('Vale de Delivery', centerX, y, { align: 'center' });
                y += 15;

                // Code
                doc.setFontSize(16);
                doc.setFont('helvetica', 'bold');
                doc.text(`Código: ${this.generatedVoucher.codigo}`, centerX, y, { align: 'center' });
                y += 10;

                // Description
                doc.setFontSize(12);
                doc.setFont('helvetica', 'normal');
                doc.text(this.generatedVoucher.descripcion || 'Vale de delivery', centerX, y, { align: 'center' });
                y += 15;

                // QR Code
                const qrSize = 80;
                const qrX = centerX - qrSize / 2;
                doc.addImage(qrDataUrl, 'PNG', qrX, y, qrSize, qrSize);
                y += qrSize + 15;

                // Details
                doc.setFontSize(11);
                doc.setFont('helvetica', 'normal');
                const validUntil = new Date(this.generatedVoucher.fecha_vencimiento).toLocaleDateString('es-PE');
                doc.text(`Válido hasta: ${validUntil}`, centerX, y, { align: 'center' });
                y += 8;
                doc.text(`Estado: ${this.generatedVoucher.estado == 1 ? 'Disponible' : 'Usado'}`, centerX, y, { align: 'center' });

                // Convert PDF to blob URL
                const pdfBlob = doc.output('blob');
                const pdfUrl = URL.createObjectURL(pdfBlob);
                this.pdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(pdfUrl);

                // Show PDF dialog
                this.PDF_Dialog = true;

                this.messageService.add({
                    severity: 'success',
                    summary: 'QR Descargado',
                    detail: 'Vale QR generado correctamente',
                    life: 3000
                });
            } catch (error) {
                console.error('Error generating QR PDF:', error);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Error al generar el PDF del QR',
                    life: 3000
                });
            }
        }
    }

    deletepedidoModal() {
        this.eliminarPedidoDialog = true;
        this.motivo = '';
        this.responsable = '';
    }

    moveTableModal() {
        // Load available mesas that are not the current one and are free (estado = 0 in estadomesa)
        this.availableMesas = this.mesas.filter((mesa) => mesa.numero !== this.mesaSeleccionada?.numero && this.estadomesa[mesa.numero]?.value === 0);

        // If there are no available mesas, show a message
        if (this.availableMesas.length === 0) {
            this.messageService.add({
                severity: 'info',
                summary: 'No hay mesas disponibles',
                detail: 'No hay otras mesas disponibles para mover este pedido',
                life: 3000
            });
            return;
        }

        this.moveTableDialog = true;
        this.targetMesa = null;
    }

    moveTable() {
        if (!this.targetMesa) {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Por favor seleccione una mesa de destino',
                life: 3000
            });
            return;
        }

        // Check if the target mesa is already occupied
        const targetMesaOccupied = this.Pedidos.some((pedido) => pedido.mesa === this.targetMesa!.numero && pedido.idpedido !== this.NuevoPedido.idpedido);

        if (targetMesaOccupied) {
            this.messageService.add({
                severity: 'error',
                summary: 'Mesa ocupada',
                detail: 'La mesa seleccionada ya está ocupada por otro pedido',
                life: 3000
            });
            return;
        }

        // Update the pedido with the new mesa number
        this.PedidoService.updatePedidoMesa(this.NuevoPedido.idpedido, parseInt(this.targetMesa.numero)).subscribe({
            next: (response) => {
                if (response.success) {
                    // Update the mesa states
                    // Set the current mesa to free (estado = '0')
                    if (this.mesaSeleccionada) {
                        const currentMesa = this.mesas.find((m) => m.numero == this.mesaSeleccionada!.numero);
                        if (currentMesa) {
                            currentMesa.estado = '0';
                            if (this.estadomesa[currentMesa.numero]) {
                                this.estadomesa[currentMesa.numero].value = 0;
                            }
                        }
                    }

                    // Set the target mesa to occupied (estado = '1')
                    this.targetMesa!.estado = '1';
                    if (this.targetMesa && this.estadomesa[this.targetMesa.numero]) {
                        this.estadomesa[this.targetMesa.numero].value = 1;
                    }

                    // Update the pedido's mesa number
                    const pedido = this.Pedidos.find((p) => p.idpedido === this.NuevoPedido.idpedido);
                    if (pedido) {
                        pedido.mesa = this.targetMesa!.numero;
                    }

                    // Update the mesa selection
                    this.mesaSeleccionada = this.targetMesa;

                    // Close the dialog
                    this.moveTableDialog = false;

                    // Refresh the view
                    this.cargarMesas();

                    this.messageService.add({
                        severity: 'success',
                        summary: 'Éxito',
                        detail: 'El pedido se ha movido correctamente a la mesa ' + this.targetMesa!.numero,
                        life: 3000
                    });
                } else {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: response.error?.message || 'Error al mover el pedido',
                        life: 3000
                    });
                }
            },
            error: (error) => {
                console.error('Error moving table:', error);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Ocurrió un error al mover el pedido: ' + error.message,
                    life: 3000
                });
            }
        });
    }

    formatFechaPeruTicket(dateInput: any): string {
        if (!dateInput) return '';
        const d = new Date(dateInput);
        if (isNaN(d.getTime())) return '';
        const pad = (n: number) => n.toString().padStart(2, '0');
        const dd = pad(d.getDate());
        const mm = pad(d.getMonth() + 1);
        const yyyy = d.getFullYear();
        let hours = d.getHours();
        const minutes = pad(d.getMinutes());
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12;
        return `${dd}/${mm}/${yyyy}  ${pad(hours)}:${minutes} ${ampm}`;
    }

    generarComandaCocinaPdf(input: {
        idpedido?: any;
        mesa: any;
        cliente?: string | null;
        created_at?: string;
        comentario?: string | null;
        pedidodetalle: any[];
    }): jsPDF {
        const items = input.pedidodetalle || [];
        const itemsMesa: any[] = [];
        const itemsLlevar: any[] = [];

        items.forEach((item: any) => {
            if (item.lugarpedido === '1' || item.lugarpedido === 1) {
                itemsLlevar.push(item);
            } else {
                itemsMesa.push(item);
            }
        });

        const esDelivery = !input.mesa || input.mesa === '0' || input.mesa === 0;

        // Función auxiliar para calcular altura de lista de ítems
        const calcItemsH = (list: any[]) => {
            let h = 0;
            list.forEach((elem: any) => {
                const prodNom = (elem.producto?.nombre || elem.nombre || 'PLATO').toUpperCase();
                const lines = Math.ceil(prodNom.length / 20) || 1;
                h += Math.max(lines * 4.2, 4.5);
                if (elem.toppings && elem.toppings != '0') {
                    const tIds = elem.toppings.toString().split(',').map((id: string) => id.trim()).filter((id: string) => id !== '' && id !== '0');
                    h += tIds.length * 3.5;
                }
                h += 4.5;
            });
            return h;
        };

        // Estimación dinámica de altura total para formato 80mm
        let calcHeight = 8;
        calcHeight += 4; // Título comanda
        calcHeight += esDelivery ? 15 : 13; // Badge mesa / delivery
        calcHeight += 8; // Fecha y número de pedido
        calcHeight += 8; // Cabecera de columnas

        if (!esDelivery && itemsMesa.length > 0 && itemsLlevar.length > 0) {
            calcHeight += 5 + calcItemsH(itemsMesa);
            calcHeight += 5 + calcItemsH(itemsLlevar);
        } else {
            calcHeight += calcItemsH(items);
        }

        if (input.comentario && input.comentario.trim()) {
            const comLinesCount = Math.ceil(input.comentario.trim().length / 38) || 1;
            calcHeight += 6 + (comLinesCount * 3.8) + 4;
        }

        calcHeight += 18; // Total de platos, fin y margen de corte
        const finalHeight = Math.max(125, Math.ceil(calcHeight));

        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: [80, finalHeight]
        });

        const centerX = 40;
        let y = 6;

        // Título superior
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text('*** COMANDA DE COCINA ***', centerX, y, { align: 'center' });
        y += 4;

        // Badge destacado de Mesa o Para Llevar
        const badgeH = esDelivery ? 14 : 12;
        doc.setLineWidth(0.5);
        doc.setDrawColor(0, 0, 0);
        doc.roundedRect(5, y, 70, badgeH, 2, 2, 'S');

        if (!esDelivery) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(17);
            doc.text(`MESA  ${input.mesa}`, centerX, y + 8, { align: 'center' });
        } else {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12.5);
            doc.text('PARA LLEVAR / DELIVERY', centerX, y + 5.5, { align: 'center' });
            if (input.cliente && input.cliente.trim()) {
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(9);
                doc.text(`Cliente: ${input.cliente.trim()}`, centerX, y + 10.5, { align: 'center' });
            }
        }
        y += badgeH + 3.5;

        // Fecha y hora: hora a la que entra a cocina (momento exacto de emision o actualizacion)
        const fechaStr = this.formatFechaPeruTicket(new Date());
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text(fechaStr, centerX, y, { align: 'center' });
        y += 3.5;

        if (input.idpedido) {
            doc.setFont('helvetica', 'bold');
            doc.text(`Pedido N°: #${input.idpedido}`, centerX, y, { align: 'center' });
            y += 3.5;
        }

        // Línea divisoria principal
        doc.setLineWidth(0.4);
        doc.line(5, y, 75, y);
        y += 3.5;

        // Cabecera de columnas
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.text('CANT', 5, y);
        doc.text('DESCRIPCIÓN / PLATO', 16, y);
        doc.text('P.UNIT', 75, y, { align: 'right' });
        y += 1.5;
        doc.setLineWidth(0.2);
        doc.line(5, y, 75, y);
        y += 3.5;

        // Función para renderizar filas de platos
        const renderItemList = (list: any[]) => {
            list.forEach((elem: any) => {
                const cant = elem.cantidad || 1;
                const prodNom = (elem.producto?.nombre || elem.nombre || 'PLATO').toUpperCase();
                const precioU = elem.precioU != null ? Number(elem.precioU).toFixed(2) : '0.00';

                // Cantidad en negrita destacada con espacio seguro
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(11.5);
                doc.text(`${cant}x`, 5, y);

                // Nombre del plato con ajuste de línea (nunca choca con la cantidad ni con el precio)
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(10);
                const nameLines = doc.splitTextToSize(prodNom, 43);
                nameLines.forEach((nLine: string, idx: number) => {
                    doc.text(nLine, 16, y + (idx * 4.2));
                });

                // Precio unitario alineado a la derecha
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(8.5);
                doc.text(`S/${precioU}`, 75, y, { align: 'right' });

                y += Math.max(nameLines.length * 4.2, 4.5);

                // Toppings / Modificadores
                if (elem.toppings && elem.toppings != '0') {
                    const tIds = elem.toppings.toString().split(',').map((id: string) => id.trim()).filter((id: string) => id !== '' && id !== '0');
                    tIds.forEach((tid: string) => {
                        const topping = this.multiselectToppings.find((t: any) => t.idtoppings == tid);
                        if (topping) {
                            const nom = topping.nombre.trim().toUpperCase();
                            const esSin = nom.startsWith('SIN ') || nom.startsWith('NO ');
                            const esExtra = nom.startsWith('CON ') || nom.includes('EXTRA') || nom.includes('DOBLE');
                            let prefix = '  [*] ';
                            if (esSin) prefix = '  [-] ';
                            else if (esExtra) prefix = '  [+] ';

                            doc.setFont('helvetica', esSin ? 'bold' : 'normal');
                            doc.setFontSize(8.5);
                            doc.text(`${prefix}${nom}`, 16, y);
                            y += 3.5;
                        }
                    });
                }

                // Línea divisoria suave punteada entre platos
                y += 1;
                doc.setLineWidth(0.15);
                doc.setLineDashPattern([1, 1], 0);
                doc.line(5, y, 75, y);
                doc.setLineDashPattern([], 0);
                y += 3.5;
            });
        };

        // Renderizado por sección
        if (!esDelivery && itemsMesa.length > 0 && itemsLlevar.length > 0) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.text('>> SALÓN / MESA', 5, y);
            y += 3.5;
            renderItemList(itemsMesa);

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.text('>> PARA LLEVAR', 5, y);
            y += 3.5;
            renderItemList(itemsLlevar);
        } else if (!esDelivery && itemsLlevar.length > 0) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.text('>> PARA LLEVAR', 5, y);
            y += 3.5;
            renderItemList(itemsLlevar);
        } else {
            renderItemList(items);
        }

        // Observaciones / Comentario de cocina
        if (input.comentario && input.comentario.trim()) {
            const com = input.comentario.trim();
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            const comLines = doc.splitTextToSize(com, 64);
            const boxH = 6 + (comLines.length * 3.8);

            doc.setLineWidth(0.35);
            doc.setLineDashPattern([], 0);
            doc.roundedRect(5, y, 70, boxH, 1.5, 1.5, 'S');

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8.5);
            doc.text('OBSERVACIONES / NOTA COCINA:', 7, y + 4);

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            let comY = y + 7.8;
            comLines.forEach((cl: string) => {
                doc.text(cl, 7, comY);
                comY += 3.8;
            });
            y += boxH + 3.5;
        }

        // Conteo total y pie
        const totalPlatos = items.reduce((acc: number, item: any) => acc + (Number(item.cantidad) || 0), 0);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.text(`TOTAL PLATOS: ${totalPlatos}`, 5, y);
        y += 4;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.text('*** FIN COMANDA ***', centerX, y, { align: 'center' });

        return doc;

    }

    generateCocinaPDF(pedido: any) {
        this.isLoading = true;
        let targetId = pedido?.idpedido || this.NuevoPedido?.idpedido;
        if (!targetId && this.mesaSeleccionada) {
            const found = this.Pedidos.find((p) => String(p.mesa).trim() === String(this.mesaSeleccionada?.numero).trim());
            if (found) targetId = found.idpedido;
        }

        const renderCocinaDoc = (dataCocina: any) => {
            const mesaValue = (dataCocina?.mesa !== undefined && dataCocina?.mesa !== null && dataCocina?.mesa !== '') 
                ? dataCocina.mesa 
                : (pedido?.mesa !== undefined && pedido?.mesa !== null ? pedido.mesa : this.mesaSeleccionada?.numero);

            const doc = this.generarComandaCocinaPdf({
                idpedido: dataCocina?.idpedido || targetId,
                mesa: mesaValue,
                cliente: dataCocina?.cliente || pedido?.cliente || this.NuevoPedido?.cliente,
                created_at: dataCocina?.created_at || pedido?.created_at,
                comentario: dataCocina?.comentario || pedido?.comentario || this.NuevoPedido?.comentario,
                pedidodetalle: (dataCocina?.pedidodetalle && dataCocina.pedidodetalle.length > 0) ? dataCocina.pedidodetalle : (pedido?.pedidodetalle || [])
            });
            const pdfBlob = doc.output('blob');
            const pdfUrl = URL.createObjectURL(pdfBlob);
            this.PDFdescargar(pdfUrl, 'Imprimir Comanda Cocina');
            this.isLoading = false;
        };

        if (!targetId) {
            const fallback = this.NuevoPedido?.pedidodetalle?.length ? this.NuevoPedido : null;
            if (fallback) {
                renderCocinaDoc(fallback);
                return;
            }
            this.messageService.add({
                severity: 'warn',
                summary: 'Atención',
                detail: 'No se encontró un pedido activo para enviar a cocina.',
                life: 3000
            });
            this.isLoading = false;
            return;
        }

        this.PedidoService.ShowProductosPdf(targetId, 'cocina').subscribe({
            next: (response: any) => {
                let dataCocina = response?.data;
                if (!dataCocina || !dataCocina.pedidodetalle || dataCocina.pedidodetalle.length === 0) {
                    const fallback = this.Pedidos.find((p) => p.idpedido == targetId) || this.NuevoPedido;
                    if (fallback && fallback.pedidodetalle && fallback.pedidodetalle.length > 0) {
                        dataCocina = fallback;
                    }
                }

                if (!dataCocina) {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'No se encontraron datos de platos para cocina.',
                        life: 3000
                    });
                    this.isLoading = false;
                    return;
                }

                renderCocinaDoc(dataCocina);
            },
            error: (err: any) => {
                console.error('Error al generar comanda de cocina, usando fallback:', err);
                const fallback = this.Pedidos.find((p) => p.idpedido == targetId) || this.NuevoPedido;
                if (fallback && fallback.pedidodetalle && fallback.pedidodetalle.length > 0) {
                    renderCocinaDoc(fallback);
                } else {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Error al generar comanda de cocina.',
                        life: 3000
                    });
                    this.isLoading = false;
                }
            }
        });
    }
    PDFdescargar(pdf: string, header?: string) {
        if (header) {
            this.pdfModalHeader = header;
        }
        this.PDF_Dialog = true;
        this.pdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(pdf);
    }

    PDFCocinadescargar(pdf: string) {
        this.CocinaPdf_Dialog = true;
        this.pdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(pdf);
    }

    hydrateNuevoPedido(numMesa: any, statuspedido: boolean, mesaSeleccionada: any) {
        if (!this.Pedidos || !statuspedido) return;

        let status_array: Pedido[] = [];
        if (numMesa == '0') {
            status_array = this.Pedidos.filter((p) => p.idpedido == mesaSeleccionada.idpedido);
        } else {
            status_array = this.Pedidos.filter((p) => String(p.mesa).trim() === String(numMesa).trim());
        }

        if (status_array.length != 0) {
            const pedidoActual = status_array[0];
            const detalles = pedidoActual.pedidodetalle || [];

            this.NuevoPedido = {
                idpedido: pedidoActual.idpedido || 0,
                lugarpedido: undefined,
                pedido_estado: undefined,
                nombre: undefined,
                cantidad: detalles.length,
                descripcion: '',
                estado: false,
                lugar: '',
                preciounitario: 0,
                total: Number(pedidoActual.total) || 0,
                descuento: Number(pedidoActual.descuento) || 0,
                comentario: pedidoActual.comentario || '',
                pedidodetalle: detalles.map((det: any) => ({
                    idpedidodetalle: det.idpedidodetalle || 0,
                    idpedido: det.idpedido || pedidoActual.idpedido || 0,
                    nombre: det.producto?.nombre || det.nombre || 'PLATO',
                    idproducto: det.idproducto || 0,
                    preciounitario: det.precioU != null ? Number(det.precioU) : (Number(det.preciounitario) || 0),
                    cantidad: Number(det.cantidad) || 1,
                    descripcion: det.descripcion || '',
                    total: det.total != null ? Number(det.total) : ((Number(det.cantidad) || 1) * (Number(det.precioU) || 0)),
                    estado: det.estado || false,
                    lugarpedido: det.lugarpedido || '',
                    comentario: det.comentario || '',
                    idtoppings: det.toppings ? det.toppings.toString().split(',').filter((t: string) => t && t !== '0') : [],
                    id_created_at: undefined,
                    pedido_estado: undefined,
                    producto: det.producto
                })),
                visa: Number(pedidoActual.visa) || 0,
                yape: Number(pedidoActual.yape) || 0,
                plin: Number(pedidoActual.plin) || 0,
                efectivo: Number(pedidoActual.efectivo) || 0,
                cliente: (pedidoActual as any).cliente || '',
                idmozo: pedidoActual.persona == null ? ((pedidoActual as any).idmozo || null) : pedidoActual.persona.idpersona
            };

            this.comentarios = pedidoActual.comentario || '';
        }
    }

    getPedidosDeMesa(numMesa: any, statuspedido: boolean, mesaSeleccionada: any): Pedido[] {
        var idpedido = 0;
        if (mesaSeleccionada != null) {
            if (mesaSeleccionada.idpedido && mesaSeleccionada.idpedido > 0) {
                idpedido = mesaSeleccionada.idpedido;
            }
        }
        if (this.Pedidos) {
            if (statuspedido == true) {
                if (idpedido > 0) {
                    return this.Pedidos.filter((p) => p.idpedido == mesaSeleccionada.idpedido);
                } else if (numMesa != '0') {
                    return this.Pedidos.filter((p) => String(p.mesa).trim() === String(numMesa).trim());
                }
            } else if (this.mesaSeleccionada) {
                return [];
            }
        }
        return [];
    }
    onlyNumberKey(event: KeyboardEvent) {
        const charCode = event.which ? event.which : event.keyCode;
        // Solo permitir números (0-9)
        if (charCode > 31 && (charCode < 48 || charCode > 57)) {
            event.preventDefault();
        }
    }

    calculateTotalPedidos(numeroMesa: string, pedidoMesaStatus: boolean, mesaSeleccionada: any): any {
        const pedidos = this.getPedidosDeMesa(numeroMesa, pedidoMesaStatus, mesaSeleccionada);
        var total = 0;
        pedidos.forEach((element: any) => {
            element.pedidodetalle.forEach((element2: any) => {
                total += element2.cantidad * element2.precioU;
            });
        });
        // var total= pedidos.reduce((total, pedido) => {
        //     return total + pedido.cantidad * pedido.precioU;
        // }, 0);
        return total;
    }
    LimpiarNuevoPedido(limpiarmesa: any = false): void {
        this.selectedMozo = [];

        if (limpiarmesa == true) {
            Object.values(this.estadomesa).forEach((element: any) => {
                element.value = 0; // Cambia el estado a libre
            });
        }
        this.tipomodal = 'Registrar';
        this.NuevoPedido = {
            idpedido: 0,
            lugarpedido: undefined,
            pedido_estado: undefined,
            nombre: undefined,
            cantidad: 0,
            descripcion: '',
            estado: false,
            lugar: '',
            preciounitario: 0,
            total: 0,
            descuento: 0,
            comentario: '',
            pedidodetalle: [],
            visa: 0,
            yape: 0,
            plin: 0,
            efectivo: 0
        };

        this.voucherForm = this.fb.group({
            descripcion: ['Vale de delivery'],
            diasVencimiento: [30, [Validators.required, Validators.min(1), Validators.max(365)]]
        });
    }

    imprimirpedidodialog(Pedidos: Pedido[]) {
        this.imprimirPedidoDialog = true;
        this.pedidosSeleccionados = [];
    }

    imprimirSeleccionados() {
        const pedidos = this.getPedidosDeMesa(this.mesaSeleccionada?.numero, this.pedido_mesa_status, this.mesaSeleccionada);
        this.pedidosSeleccionados = [];

        pedidos.forEach((pedido) => {
            if (pedido.pedidodetalle) {
                const seleccionados = pedido.pedidodetalle.filter((p: any) => p.seleccionado);
                seleccionados.forEach((sel: any) => {
                    this.pedidosSeleccionados.push({
                        ...sel,
                        created_at: pedido.created_at,
                        mesa: pedido.mesa,
                        comentario: pedido.comentario,
                        idpedido: pedido.idpedido
                    });
                });
            }
        });

        if (this.pedidosSeleccionados.length === 0) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Atención',
                detail: 'Debe seleccionar al menos un producto para imprimir.',
                life: 3000
            });
            return;
        }

        const first = this.pedidosSeleccionados[0];
        const doc = this.generarComandaCocinaPdf({
            idpedido: first?.idpedido || this.NuevoPedido?.idpedido,
            mesa: first?.mesa || this.mesaSeleccionada?.numero,
            cliente: this.NuevoPedido?.cliente,
            created_at: first?.created_at,
            comentario: first?.comentario || this.NuevoPedido?.comentario,
            pedidodetalle: this.pedidosSeleccionados
        });

        const pdfBlob = doc.output('blob');
        const pdfUrl = URL.createObjectURL(pdfBlob);
        this.PDFdescargar(pdfUrl, 'Imprimir Comanda Cocina');
        this.imprimirPedidoDialog = false; // Cerrar el diálogo después de imprimir
    }
    AddKeyPress(e: Event | undefined, buscarPlato: string) {
        e = e || window.event;
        const keyboardEvent = e as KeyboardEvent;
        if (keyboardEvent.keyCode === 13) {
            const table = document.getElementById('listarPlatos');
            if (table) {
                table.innerHTML = '';
            }
            this.BuscarPlatoSearchText(buscarPlato);
        }
        return true;
    }

    onBuscarPlatoChange(value: string) {
        if (value.length > 4) {
            const table = document.getElementById('listarPlatos');
            if (table) {
                table.innerHTML = '';
            }
            this.BuscarPlatoSearchText(value);
        } else if (value.length === 0) {
            const table = document.getElementById('listarPlatos');
            if (table) {
                table.innerHTML = '';
            }
            this.BuscarPlatoSearchText('');
        }
    }

    quickSearchPlato(term: string) {
        this.buscarPlato = term;
        const table = document.getElementById('listarPlatos');
        if (table) {
            table.innerHTML = '';
        }
        this.BuscarPlatoSearchText(term);
    }

    AddKeyPressCalculator(e: Event | undefined, buscarPlato: string) {
        e = e || window.event;
        const keyboardEvent = e as KeyboardEvent;
        if (keyboardEvent.keyCode === 13) {
            this.ListarPedidoNumeroCalculadora();
        }
        return true;
    }
    toggleTodos(event: any) {
        let checked = false;
        if (event && event.target && event.target.type === 'checkbox') {
            checked = event.target.checked;
        } else {
            const checkbox = document.getElementById('selectAllItemsBtn') as HTMLInputElement;
            if (checkbox) {
                checkbox.checked = !checkbox.checked;
                checked = checkbox.checked;
            }
        }

        const pedidos = this.getPedidosDeMesa(this.mesaSeleccionada?.numero, this.pedido_mesa_status, this.mesaSeleccionada);
        pedidos.forEach((p) => {
            p.seleccionado = checked;
            if (p.pedidodetalle) {
                p.pedidodetalle.forEach((detalle: any) => (detalle.seleccionado = checked));
            }
        });
    }
    toggleDataTable(op: Popover, event: any, pedidosdetalle: NuevoPedidodetalle) {
        console.log('toggleDataTable', this.NuevoPedido.pedidodetalle);
        const index = this.NuevoPedido.pedidodetalle.findIndex((detalle) => detalle.idpedido === pedidosdetalle.idpedido);
        // this.NuevoPedido.pedidodetalle[index].idtoppings = [{ idtoppings: 0, nombre: '' }]; // Inicializar con un objeto por defecto

        // Fix for potential infinite loop - was: this.isDropdownOpen = this.isDropdownOpen;
        this.isDropdownOpen = !this.isDropdownOpen;
        op.toggle(event);
        this.cargarToppingsSeleccionados(pedidosdetalle);
    }
    onProductSelect(op: Popover, event: any) {
        op.hide();
        this.messageService.add({ severity: 'info', summary: 'Product Selected', detail: event?.data.name, life: 3000 });
    }

    // =============================================
    // COMPROBANTE (BOLETA / FACTURA) METHODS
    // =============================================
    abrirComprobanteModal(tipo: '01' | '03') {
        this.tipoComprobante = tipo;
        this.documentoBusqueda = '';
        this.clienteEncontrado = null;
        this.mostrarFormNuevoCliente = false;
        this.nuevoCliente = { tipo_doc: tipo === '01' ? '6' : '1', num_doc: '', razon_social: '', direccion: '' };
        this.emitiendo = false;
        this.comprobanteDialog = true;
    }

    seleccionarTipoComprobante(tipo: '01' | '03') {
        this.tipoComprobante = tipo;
        this.clienteEncontrado = null;
        this.documentoBusqueda = '';
        this.mostrarFormNuevoCliente = false;
        this.nuevoCliente.tipo_doc = tipo === '01' ? '6' : '1';
    }

    async buscarClienteComprobante() {
        if (!this.documentoBusqueda) {
            this.messageService.add({ severity: 'warn', summary: 'Aviso', detail: 'Ingrese un número de documento', life: 3000 });
            return;
        }

        try {
            // Buscar en Supabase: persona con tipo=2 y deleted IS NULL
            const { data, error } = await this.supabaseService.client.from('persona').select('*').is('deleted', null).eq('tipo', 2).eq('numerodoc', this.documentoBusqueda.trim()).maybeSingle();

            if (error) throw error;

            if (data) {
                // Cliente encontrado
                this.clienteEncontrado = {
                    num_doc: data.numerodoc,
                    razon_social: `${data.nombres} ${data.apellidopat} ${data.apellidomat || ''}`.trim(),
                    direccion: data.direccion || '',
                    tipo_doc: data.tipodoc ? String(data.tipodoc) : this.tipoComprobante === '01' ? '6' : '1',
                    idpersona: data.idpersona
                };
                this.mostrarFormNuevoCliente = false;
            } else {
                // No encontrado, abrir form de registro
                this.clienteEncontrado = null;
                this.nuevoCliente.num_doc = this.documentoBusqueda;
                this.nuevoCliente.razon_social = '';
                this.nuevoCliente.direccion = '';
                this.mostrarFormNuevoCliente = true;
                this.messageService.add({ severity: 'info', summary: 'No encontrado', detail: 'El cliente no está registrado. Complete los datos.', life: 4000 });
            }
        } catch (error) {
            console.error('Error buscando cliente:', error);
            this.clienteEncontrado = null;
            this.nuevoCliente.num_doc = this.documentoBusqueda;
            this.nuevoCliente.razon_social = '';
            this.nuevoCliente.direccion = '';
            this.mostrarFormNuevoCliente = true;
            this.messageService.add({ severity: 'info', summary: 'No encontrado', detail: 'Cliente no encontrado. Complete los datos para registrarlo.', life: 4000 });
        }
    }

    async guardarNuevoCliente() {
        if (!this.nuevoCliente.razon_social) {
            this.messageService.add({ severity: 'warn', summary: 'Aviso', detail: 'Ingrese el nombre o razón social', life: 3000 });
            return;
        }
        if (this.tipoComprobante === '01' && !this.nuevoCliente.direccion) {
            this.messageService.add({ severity: 'warn', summary: 'Aviso', detail: 'La dirección fiscal es obligatoria para Factura', life: 3000 });
            return;
        }

        try {
            // Guardar en Supabase: insertar en persona con tipo=2
            const tipodoc = this.tipoComprobante === '01' ? 2 : 1; // Factura=RUC(2), Boleta=DNI(1)
            const { data, error } = await this.supabaseService.client
                .from('persona')
                .insert({
                    numerodoc: this.nuevoCliente.num_doc,
                    nombres: this.nuevoCliente.razon_social,
                    apellidopat: '',
                    apellidomat: '',
                    direccion: this.nuevoCliente.direccion || '',
                    tipodoc: tipodoc,
                    tipo: 2,
                    idestado: 1
                })
                .select()
                .single();

            if (error) throw error;

            this.clienteEncontrado = {
                num_doc: data.numerodoc,
                razon_social: data.nombres,
                direccion: data.direccion || '',
                tipo_doc: String(data.tipodoc),
                idpersona: data.idpersona
            };
            this.mostrarFormNuevoCliente = false;
            this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Cliente registrado correctamente', life: 3000 });
        } catch (error) {
            console.error('Error guardando cliente:', error);
            // Si falla, asignar localmente para poder continuar
            this.clienteEncontrado = { ...this.nuevoCliente };
            this.mostrarFormNuevoCliente = false;
            this.messageService.add({ severity: 'success', summary: 'Cliente asignado', detail: 'Cliente asignado localmente', life: 3000 });
        }
    }

    emitirComprobante() {
        if (!this.clienteEncontrado) {
            this.messageService.add({ severity: 'warn', summary: 'Aviso', detail: 'Debe seleccionar o registrar un cliente primero', life: 3000 });
            return;
        }

        this.emitiendo = true;
        const payload = {
            idpedido: this.NuevoPedido.idpedido,
            tipo_doc: this.tipoComprobante,
            cliente: this.clienteEncontrado
        };

        this.http.post<any>('http://127.0.0.1:8000/api/emitir-comprobante-prueba', payload).subscribe({
            next: (res) => {
                this.emitiendo = false;
                this.comprobanteDialog = false;
                this.messageService.add({
                    severity: 'success',
                    summary: '¡Comprobante Emitido!',
                    detail: `${this.tipoComprobante === '01' ? 'Factura' : 'Boleta'} enviada correctamente a SUNAT`,
                    life: 5000
                });
                console.log('Respuesta SUNAT:', res);

                // Abrir modal con el PDF si viene en la respuesta
                if (res.success && res.archivos?.pdf) {
                    setTimeout(() => {
                        // Descargar el PDF como blob para mostrarlo en el iframe
                        this.http.get(res.archivos.pdf, { responseType: 'blob' }).subscribe({
                            next: (blob) => {
                                const blobUrl = URL.createObjectURL(blob);
                                this.pdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(blobUrl);
                                this.Comprobante_PDF_Dialog = true;
                            },
                            error: () => {
                                // Fallback: abrir en nueva pestaña
                                window.open(res.archivos.pdf, '_blank');
                            }
                        });
                    }, 300);
                }
            },
            error: (err) => {
                this.emitiendo = false;
                console.error('Error al emitir comprobante:', err);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Hubo un error al emitir el comprobante. Revise la conexión con SUNAT.',
                    life: 5000
                });
            }
        });
    }

    // ─── Floor Plan Grid Position Maps ────────────────────────────────────────
    // Piso 1 layout (5 cols × 3 rows):
    //  Col:   1       2       3(BAR)  4       5
    //  Row1: Mesa3  Mesa4   [empty] Mesa9   Mesa10
    //  Row2: Mesa2  Mesa5    BAR    Mesa8   Mesa11
    //  Row3: Mesa1  Mesa6   [empty] Mesa7   Mesa12

    private readonly FLOOR1_COL: Record<number, number> = {
        1:1, 2:1, 3:1,
        4:2, 5:2, 6:2,
        7:4, 8:4, 9:4,
        10:5, 11:5, 12:5
    };
    private readonly FLOOR1_ROW: Record<number, number> = {
        3:1, 4:1, 9:1, 10:1,
        2:2, 5:2, 8:2, 11:2,
        1:3, 6:3, 7:3, 12:3
    };

    // Piso 2 layout (4 cols × 3 rows):
    //  Col:   1       2       3       4
    //  Row1: Mesa13  Mesa16  Mesa19  Mesa22
    //  Row2: Mesa14  Mesa17  Mesa20  Mesa23
    //  Row3: Mesa15  Mesa18  Mesa21  Mesa24
    private readonly FLOOR2_COL: Record<number, number> = {
        13:1, 14:1, 15:1,
        16:2, 17:2, 18:2,
        19:3, 20:3, 21:3,
        22:4, 23:4, 24:4
    };
    private readonly FLOOR2_ROW: Record<number, number> = {
        13:1, 16:1, 19:1, 22:1,
        14:2, 17:2, 20:2, 23:2,
        15:3, 18:3, 21:3, 24:3
    };

    getMesaGridCol(numero: string, piso: string): string {
        const n = parseInt(numero, 10);
        const map = piso === '2' ? this.FLOOR2_COL : this.FLOOR1_COL;
        return (map[n] ?? 'auto').toString();
    }

    getMesaGridRow(numero: string, piso: string): string {
        const n = parseInt(numero, 10);
        const map = piso === '2' ? this.FLOOR2_ROW : this.FLOOR1_ROW;
        return (map[n] ?? 'auto').toString();
    }
}
