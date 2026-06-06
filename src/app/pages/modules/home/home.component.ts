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

@Component({
    selector: 'app-home',
    // Remove duplicate imports that are already in ImportsModule
    imports: [CommonModule, ImportsModule, UniquePipe, OrderByPipe],
    providers: [MessageService, ConfirmationService],
    templateUrl: './home.component.html',
    styleUrl: './home.component.scss'
})
export class HomeComponent {
    [x: string]: any;
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
    activeTabIndex: number = 0;
    highlightToolbar: boolean = false;

    numeroPlato: number | null = null;
    comentarios: string = '';
    tipomodal: any = 'Registrar';
    Cobrar_Dialog: boolean = false;
    PDF_Dialog: boolean = false;
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
        private supabaseService: SupabaseService
    ) {
        this.voucherForm = this.fb.group({
            descripcion: ['Vale de delivery'],
            diasVencimiento: [30, [Validators.required, Validators.min(1), Validators.max(365)]]
        });
    }

    async ngOnInit(): Promise<void> {
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
                    this.multiselectToppings = [...this.multiselectToppings, response.data]
                        .sort((a: any, b: any) => a.nombre.localeCompare(b.nombre));
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
                            tr.className = 'border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors group';
                            tr.innerHTML = `
                                <td class="py-3 px-3">
                                    <div class="font-extrabold text-slate-800 text-sm xl:text-base leading-tight group-hover:text-blue-700 transition-colors">
                                        ${element.nombre || ''}
                                    </div>
                                    <div class="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                        N° Carta ${element.numero_carta || 'No tiene'}
                                    </div>
                                </td>
                                <td class="py-3 px-3 text-right">
                                    <div class="inline-flex items-center justify-center bg-blue-50 text-blue-700 font-black text-sm px-2.5 py-1 rounded-lg border border-blue-100 group-hover:bg-blue-600 group-hover:text-white transition-colors">
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

    entregarPedido(pedido: any) {
        this.PedidoService.updateEstadoCocina(pedido.idpedido, 1).subscribe({
            next: (response) => {
                this.cargarMesas();
                this.cd.detectChanges();
                this.messageService.add({
                    severity: 'success',
                    summary: 'Éxito',
                    detail: 'Pedido marcado como entregado',
                    life: 3000
                });
            },
            error: (err) => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'No se pudo actualizar el estado',
                    life: 3000
                });
            }
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
                        await this.ListarPedidos();
                        resolve();
                    } else {
                        alert('Error al intentar consultar');
                        resolve();
                    }
                },
                error: (error) => {
                    console.error('Error al intentar consultar', error);
                    alert('Hubo un problema al conectar con el servidor');
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
                        this.Pedidos = response.data;
                        if (response.data && response.data.length > 0) {
                            Object.values(this.estadomesa).forEach((element: any) => {
                                if (element.mesa != 0) {
                                    const hayPedido = this.Pedidos.some((pedido: any) => pedido.mesa == element.mesa);
                                    element.value = hayPedido ? 1 : 0;
                                }
                            });
                        } else {
                            this.LimpiarNuevoPedido();
                        }
                    } else {
                        alert('Error al intentar consultar');
                    }
                    resolve();
                },
                error: (error) => {
                    console.error('Error al intentar consultar', error);
                    alert('Hubo un problema al conectar con el servidor');
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

    /**
     * Get unique active orders for the new active orders section.
     * Groups by idpedido, sorts by created_at (oldest first).
     */
    getActiveUniqueOrders(): Pedido[] {
        if (!this.Pedidos || this.Pedidos.length === 0) return [];

        // Use lodash to get unique by idpedido
        let uniqueOrders = _.uniqBy(this.Pedidos, 'idpedido');

        // Filter out delivered orders (estado_cocina = 1)
        uniqueOrders = uniqueOrders.filter((pedido: any) => pedido.estado_cocina != 1);

        // Sort by created_at ascending (oldest to newest)
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

        // Parse the created_at string (which is in UTC or a specific timezone from the database)
        // Ensure accurate browser-based conversion. The raw format is likely "YYYY-MM-DD HH:mm:ss"
        const createdTime = new Date(createdAt);
        const currentTime = new Date();

        const diffMs = currentTime.getTime() - createdTime.getTime();
        const diffMinutes = Math.floor(diffMs / 60000);

        return diffMinutes >= 0 ? diffMinutes : 0;
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
                var status_array = this.Pedidos.filter((p) => p.mesa == mesa.numero);
                if (status_array.length > 0) {
                    this.pedido_mesa_status = true;
                    this.tipomodal = 'Editar';
                } else {
                    this.tipomodal = 'Registrar';
                    if (this.mozosSeleccionadosApertura && this.mozosSeleccionadosApertura.length === 1) {
                        this.selectMozo(this.mozosSeleccionadosApertura[0]);
                    } else {
                        this.mozoDialog = true;
                    }
                }
            }
        }

        if (this.pedido_mesa_status) {
            this.hydrateNuevoPedido(mesa.numero, this.pedido_mesa_status, this.mesaSeleccionada);
        }

        // Fix: Ensure timeout callback properly handles component state
        setTimeout(() => {
            if (this.isLoading) {
                this.isLoading = false;
            }

            if (this.pedido_mesa_status) {
                this.highlightToolbar = true;
                this.cd.detectChanges(); // ensure view updates before scrolling

                const toolbarEl = document.getElementById('action-buttons-toolbar');
                if (toolbarEl) {
                    toolbarEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }

                setTimeout(() => {
                    this.highlightToolbar = false;
                    this.cd.detectChanges();
                }, 1500);
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

    generatePDF(pedido: NuevoPedido) {
        this.isLoading = true;
        this.loadImageBase64('assets/img/logo.png').then((base64Logo) => {
            this.PedidoService.ShowProductosPdf(pedido.idpedido, 'ticket').subscribe((response) => {
                var inicial = 125;
                var items = response.data?.pedidodetalle?.length || 0;

                const increments = [
                    { threshold: 4, value: 3 },
                    { threshold: 5, value: 2 },
                    { threshold: 6, value: 2 },
                    { threshold: 7, value: 5 },
                    { threshold: 8, value: 6 },
                    { threshold: 9, value: 8 },
                    { threshold: 10, value: 5 },
                    { threshold: 11, value: 5 },
                    { threshold: 12, value: 5 },
                    { threshold: 13, value: 5 },
                    { threshold: 14, value: 5 },
                    { threshold: 15, value: 5 },
                    { threshold: 16, value: 5 },
                    { threshold: 17, value: 5 },
                    { threshold: 18, value: 5 },
                    { threshold: 19, value: 5 },
                    { threshold: 20, value: 5 }
                ];

                for (const increment of increments) {
                    if (items >= increment.threshold) {
                        inicial += increment.value;
                    }
                }

                const doc = new jsPDF({
                    orientation: 'portrait',
                    unit: 'mm',
                    format: [80, inicial] // Ticket en tamaño pequeño
                });

                let y = 10;
                const centerX = 40; // Mitad del ticket (80 mm de ancho)

                // Encabezado
                doc.setFontSize(12);
                const nombreEmpresa = localStorage.getItem('nombre_empresa') || 'LA EMPRESA';
                const nombreLines = doc.splitTextToSize(nombreEmpresa, 74);
                nombreLines.forEach((line: any) => {
                    doc.text(line, centerX, y, { align: 'center' });
                    y += 4.5;
                });
                y -= 1; // Ajuste de espacio
                doc.setFontSize(8);

                doc.text('Nota de Venta: 000-95', centerX, y, { align: 'center' });
                y += 3.5;
                const rucEmpresa = localStorage.getItem('empresa_ruc') || '';
                doc.text('RUC.: ' + rucEmpresa, centerX, y, { align: 'center' });
                y += 3.5;
                const direccionEmpresa = localStorage.getItem('empresa_direccion') || '';
                const direccionLines = doc.splitTextToSize(direccionEmpresa, 74);
                direccionLines.forEach((line: any) => {
                    doc.text(line, centerX, y, { align: 'center' });
                    y += 3.5;
                });
                const celularEmpresa = localStorage.getItem('empresa_celular') || '';
                doc.text('TEL: ' + celularEmpresa, centerX, y, { align: 'center' });
                y += 3.5;
                doc.addImage(base64Logo, 'PNG', 27, 25, 29, 28);
                y += 28;
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(10);
                var date = new Date(response.data.created_at);
                const datePart = date.toLocaleDateString('en-US');
                const timePart = date.toLocaleTimeString('en-US');
                // Datos
                doc.text('Fecha: ' + datePart + ' ' + timePart, 6, y);
                y += 5;
                if (response.data.mesa == '0') {
                    doc.text('Cliente: ' + (response.data.cliente || ''), 6, y);
                } else {
                    doc.text('Mesa: ' + response.data.mesa, 6, y);
                }

                y += 4;
                doc.setFontSize(9);

                // Detalle
                doc.text('=====================================', centerX, y, { align: 'center' });
                doc.setFont('helvetica', 'normal');

                y += 5;
                // doc.text('1 Chicharron Pota Duo        23,00', 5, y);
                doc.setFontSize(10);

                const data: any = [];
                response.data.pedidodetalle.forEach((element: any) => {
                    data.push([element.cantidad, element.producto.nombre, element.precioU * element.cantidad]);
                });

                data.forEach((element: any) => {
                    const col1X = 7; // Posición X para la cantidad
                    const col2X = 12; // Posición X para el nombre del producto
                    const col3X = 69; // Posición X para el precio (ajusta según necesites)

                    doc.text(element[0].toString(), col1X, y);
                    doc.text(element[1], col2X, y);
                    doc.text('S/' + element[2].toString(), col3X, y);
                    y += 5;
                });

                y += 4;
                // Total
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.text('Sirvase pagar esta cantidad', centerX, y, { align: 'center' });
                y += 5;
                doc.text('******************************', centerX, y, { align: 'center' });
                y += 6;
                doc.setFontSize(14);
                doc.text('TOTAL: S/.' + response.data.total, centerX, y, { align: 'center' });
                y += 6;
                doc.setFontSize(10);
                doc.text('******************************', centerX, y, { align: 'center' });
                y += 10;

                // Cuando la imagen se cargue, agregarla al PDF
                const pdfBlob = doc.output('blob');
                const pdfUrl = URL.createObjectURL(pdfBlob);
                this.PDFdescargar(pdfUrl);
                this.isLoading = false;
            });
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

    generateCocinaPDF(pedido: any) {
        this.isLoading = true; // Activar el loader

        this.PedidoService.ShowProductosPdf(pedido.idpedido, 'cocina').subscribe((response) => {
            this.estadopedido = 0;
            var inicial = 100;
            var items = response.data?.pedidodetalle?.length || 0;

            const increments = [
                { threshold: 4, value: 3 },
                { threshold: 5, value: 2 },
                { threshold: 6, value: 2 },
                { threshold: 7, value: 5 },
                { threshold: 8, value: 6 },
                { threshold: 9, value: 8 },
                { threshold: 10, value: 5 },
                { threshold: 11, value: 5 },
                { threshold: 12, value: 5 },
                { threshold: 13, value: 5 },
                { threshold: 14, value: 5 },
                { threshold: 15, value: 5 },
                { threshold: 16, value: 5 },
                { threshold: 17, value: 5 },
                { threshold: 18, value: 5 },
                { threshold: 19, value: 5 },
                { threshold: 20, value: 5 }
            ];

            for (const increment of increments) {
                if (items >= increment.threshold) {
                    inicial += increment.value;
                }
            }

            response.data.pedidodetalle.forEach((element: any) => {
                var toppings = element.toppings;
                if (toppings && toppings != 0) {
                    var topings_ = toppings.split(',');
                    topings_.forEach((elementopping: any) => {
                        const topping = this.multiselectToppings.find((t: any) => t.idtoppings == elementopping);
                        if (topping) {
                            inicial += 3.5; // Sumar 3.5mm por CADA topping que se imprime en nueva línea
                        }
                    });
                }
                inicial += 4; // Sumar 4mm por la línea separadora que va debajo de cada plato
            });

            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: [80, inicial] // Ticket en tamaño pequeño
            });

            let y = 15;
            const centerX = 40; // Mitad del ticket (80 mm de ancho)
            doc.setFont('helvetica', 'bold');

            // Encabezado
            y += 5;

            doc.setFontSize(14);
            var date = new Date(response.data.created_at);
            var datePart = date.toLocaleDateString('en-US');
            var timePart = date.toLocaleTimeString('en-US');
            // Datos
            doc.text('Fecha: ' + datePart + ' ' + timePart, 42, y, { align: 'center' }); // Datos
            y += 7;
            if (response.data.mesa == '0') {
                doc.text('Cliente : ' + response.data.cliente, centerX, y, { align: 'center' });
                y += 9;
            } else {
                doc.text('Mesa: ' + response.data.mesa, 42, y, { align: 'center' });
                y += 7;
            }

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(12);

            const data: any = [];

            response.data.pedidodetalle.forEach((element: any) => {
                if (element.lugarpedido == '1') {
                    this.estadopedido = 1; // Para llevar
                }
                if (element.lugarpedido == null || element.lugarpedido == '0') data.push([element.cantidad, element.producto.nombre, element.precioU * element.cantidad]);
            });
            if (data.length > 0) {
                doc.setFont('helvetica', 'bold');
                if (response.data.mesa == 0) {
                    doc.text('PEDIDOS PARA LLEVAR DELIVERY', centerX, y, { align: 'center' });
                } else {
                    doc.text('PEDIDOS PARA MESA', centerX, y, { align: 'center' });
                }

                y += 5;
                doc.text('=============================', centerX, y, { align: 'center' });
                y += 5;
                doc.setFont('helvetica', 'normal');
            }

            data.forEach((element: any) => {
                const col1X = 5; // Posición X para la cantidad
                const col2X = 9; // Posición X para el nombre del producto
                const col3X = 69; // Posición X para el precio (ajusta según necesites)

                doc.text(element[0].toString(), col1X, y);
                doc.text(element[1], col2X, y);
                doc.text('S/' + element[2].toString(), col3X, y);
                y += 4.5;

                // Toppings del plato (debajo del producto)
                const detalle = response.data.pedidodetalle.find((p: any) => p.producto.nombre === element[1] && (p.lugarpedido == null || p.lugarpedido == '0'));
                if (detalle && detalle.toppings && detalle.toppings != 0) {
                    const toppingIds = detalle.toppings.split(',');
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(8);
                    toppingIds.forEach((tid: any) => {
                        const topping = this.multiselectToppings.find((t: any) => t.idtoppings == tid);
                        if (topping) {
                            const esSin = topping.nombre.toUpperCase().startsWith('SIN');
                            const prefijo = esSin ? '  >> - ' : '  >> + ';
                            doc.text(prefijo + topping.nombre, col2X, y);
                            y += 3.5;
                        }
                    });
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(12);
                }

                // Línea separadora entre platos
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(8);
                doc.text('-----------------------------------------------------------------------', centerX, y, { align: 'center' });
                doc.setFontSize(12);
                y += 4;
            });

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12);
            y += 5;
            if (this.estadopedido == 1) {
                doc.text('PEDIDOS PARA LLEVAR', centerX, y, { align: 'center' });
                y += 5;
                doc.text('=============================', centerX, y, { align: 'center' });

                doc.setFont('helvetica', 'normal');
                doc.setFontSize(12);
                y += 5;
                response.data.pedidodetalle.forEach((element: any) => {
                    if (element.lugarpedido == '1') {
                        const col1X = 5; // Posición X para la cantidad
                        const col2X = 9; // Posición X para el nombre del producto
                        const col3X = 69; // Posición X para el precio (ajusta según necesites)
                        doc.text(element.cantidad.toString(), col1X, y);
                        doc.text(element.producto.nombre, col2X, y);
                        doc.text('S/' + element.precioU.toString(), col3X, y);
                        y += 4;

                        // Toppings debajo del plato (para llevar)
                        if (element.toppings && element.toppings != 0) {
                            const toppingIds = element.toppings.split(',');
                            doc.setFont('helvetica', 'bold');
                            doc.setFontSize(8);
                            toppingIds.forEach((tid: any) => {
                                const topping = this.multiselectToppings.find((t: any) => t.idtoppings == tid);
                                if (topping) {
                                    const esSin = topping.nombre.toUpperCase().startsWith('SIN');
                                    const prefijo = esSin ? '  >> - ' : '  >> + ';
                                    doc.text(prefijo + topping.nombre, col2X, y);
                                    y += 3.5;
                                }
                            });
                            doc.setFont('helvetica', 'normal');
                            doc.setFontSize(12);
                        }

                        // Línea separadora entre platos
                        doc.setFont('helvetica', 'normal');
                        doc.setFontSize(8);
                        doc.text('-----------------------------------------------------------------------', centerX, y, { align: 'center' });
                        doc.setFontSize(12);
                        y += 4;
                    }
                });
            }

            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            y += 4;

            doc.text('Comentario :', centerX, y, { align: 'center' });
            y += 4;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);

            const maxWidth = 73; // Ancho máximo en unidades del PDF (ajústalo según tu diseño)
            const comentario = response.data.comentario || ''; // Texto del comentario (o string vacío si es null/undefined)
            const lines = doc.splitTextToSize(comentario, maxWidth);
            // Posición inicial (x, y)
            let x = 5;
            let currentY = y; // 'y' es la posición vertical inicial que ya tienes definida

            // Imprimir cada línea
            lines.forEach((line: string | string[]) => {
                doc.text(line, x, currentY);
                currentY += 4; // Espacio entre líneas (ajusta según necesidad)
            });
            y += 5;
            // (Toppings renderizados ahora debajo de cada plato, se elimina el bloque anterior)

            // Cuando la imagen se cargue, agregarla al PDF
            const pdfBlob = doc.output('blob');
            const pdfUrl = URL.createObjectURL(pdfBlob);
            this.PDFdescargar(pdfUrl);
            this.isLoading = false; // Desactivar el loader
        });
    }
    PDFdescargar(pdf: string) {
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
            status_array = this.Pedidos.filter((p) => p.idpedido == mesaSeleccionada.idpedido).sort((a, b) => {
                if (a.categoria !== b.categoria) {
                    return Number(b.categoria) - Number(a.categoria);
                }
                return Number(a.categoria) - Number(b.categoria);
            });
        } else {
            status_array = this.Pedidos.filter((p) => p.mesa == numMesa).sort((a, b) => {
                if (a.categoria !== b.categoria) {
                    return Number(b.categoria) - Number(a.categoria);
                }
                return Number(a.categoria) - Number(b.categoria);
            });
        }

        var idtoppingsArray: { idtoppings: number; nombre: string }[] = [];
        if (status_array.length != 0) {
            this.NuevoPedido = {
                idpedido: status_array[0]?.idpedido || 0,
                lugarpedido: undefined,
                pedido_estado: undefined,
                nombre: undefined,
                cantidad: 0,
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
                idmozo: status_array[0]?.persona == null ? null : status_array[0]?.persona.idpersona
            };

            this.NuevoPedido.pedidodetalle = status_array.map((pedido) => ({
                idpedido: pedido.idpedido || 0,
                nombre: pedido.nombre || '',
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
                idpedidodetalle: 0,
                pedido_estado: undefined
            }));

            status_array.forEach((element: any) => {
                var toppings = element.toppings;
                if (toppings) {
                    var topings_ = toppings.split(',');
                    idtoppingsArray = [];
                    topings_.forEach((elementopping: any) => {
                        const topping = this.multiselectToppings.find((t: any) => t.idtoppings == elementopping);
                        if (topping) idtoppingsArray.push({ idtoppings: topping.idtoppings, nombre: topping.nombre });
                        const lastDetalle = this.NuevoPedido.pedidodetalle.find((detalle) => detalle.idproducto == element.idproducto);
                        if (lastDetalle) {
                            lastDetalle.idtoppings = [...idtoppingsArray];
                        }
                    });
                }
            });

            this.comentarios = status_array[0].comentario || '';
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
                    return this.Pedidos.filter((p) => p.mesa == numMesa);
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
                        comentario: pedido.comentario
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

        this.estadopedido = 0;
        var inicial = 100;
        var items = this.pedidosSeleccionados.length;

        // Calcular altura adicional por toppings
        let toppingCount = 0;
        this.pedidosSeleccionados.forEach((element: any) => {
            if (element.toppings && element.toppings != '0') {
                const ids = element.toppings.split(',').filter((id: any) => id.trim() !== '');
                toppingCount += ids.length;
            }
        });
        inicial += toppingCount * 3.5;

        const increments = [
            { threshold: 4, value: 3 },
            { threshold: 5, value: 2 },
            { threshold: 6, value: 2 },
            { threshold: 7, value: 5 },
            { threshold: 8, value: 6 },
            { threshold: 9, value: 8 },
            { threshold: 10, value: 5 },
            { threshold: 11, value: 5 },
            { threshold: 12, value: 5 },
            { threshold: 13, value: 5 },
            { threshold: 14, value: 5 },
            { threshold: 15, value: 5 },
            { threshold: 16, value: 5 },
            { threshold: 17, value: 5 },
            { threshold: 18, value: 5 },
            { threshold: 19, value: 5 },
            { threshold: 20, value: 5 }
        ];

        for (const increment of increments) {
            if (items >= increment.threshold) {
                inicial += increment.value;
            }
        }

        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: [80, inicial] // Ticket en tamaño pequeño
        });

        let y = 15;
        const centerX = 40; // Mitad del ticket (80 mm de ancho)
        doc.setFont('helvetica', 'bold');

        // Encabezado
        y += 5;
        doc.setFontSize(14);
        var date = new Date(this.pedidosSeleccionados[0].created_at);
        var datePart = date.toLocaleDateString('en-US');
        var timePart = date.toLocaleTimeString('en-US');
        // Datos
        doc.text('Fecha: ' + datePart + ' ' + timePart, 42, y, { align: 'center' });
        y += 5;

        doc.text('Mesa:' + this.pedidosSeleccionados[0].mesa, 42, y, { align: 'center' });
        y += 7;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(12);

        const data: any = [];

        this.pedidosSeleccionados.forEach((element: any) => {
            if (element.lugarpedido == '1') {
                this.estadopedido = 1; // Para llevar
            }
            if (element.lugarpedido == null || element.lugarpedido == '0') data.push([element.cantidad, element.producto.nombre, element.precioU * element.cantidad]);
        });
        if (data.length > 0) {
            doc.setFont('helvetica', 'bold');

            doc.text('PEDIDOS PARA MESA', centerX, y, { align: 'center' });
            y += 5;
            doc.text('=============================', centerX, y, { align: 'center' });
            y += 5;
            doc.setFont('helvetica', 'normal');
        }
        data.forEach((element: any) => {
            const col1X = 5;
            const col2X = 9;
            const col3X = 69;

            doc.text(element[0].toString(), col1X, y);
            doc.text(element[1], col2X, y);
            doc.text('S/' + element[2].toString(), col3X, y);
            y += 4.5;

            // Toppings del plato (debajo del producto)
            const detalle = this.pedidosSeleccionados.find((p: any) => p.producto.nombre === element[1] && (p.lugarpedido == null || p.lugarpedido == '0'));
            if (detalle && detalle.toppings && detalle.toppings != 0) {
                const toppingIds = detalle.toppings.split(',');
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(8);
                toppingIds.forEach((tid: any) => {
                    const topping = this.multiselectToppings.find((t: any) => t.idtoppings == tid);
                    if (topping) {
                        const esSin = topping.nombre.toUpperCase().startsWith('SIN');
                        const prefijo = esSin ? '  >> - ' : '  >> + ';
                        doc.text(prefijo + topping.nombre, col2X, y);
                        y += 3.5;
                    }
                });
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(12);
            }
        });

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        y += 5;
        if (this.estadopedido == 1) {
            doc.text('PEDIDOS PARA LLEVAR', centerX, y, { align: 'center' });
            y += 5;
            doc.text('=============================', centerX, y, { align: 'center' });

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(12);
            y += 5;
            this.pedidosSeleccionados.forEach((element: any) => {
                if (element.lugarpedido == '1') {
                    const col1X = 5;
                    const col2X = 9;
                    const col3X = 69;
                    doc.text(element.cantidad.toString(), col1X, y);
                    doc.text(element.producto.nombre, col2X, y);
                    doc.text('S/' + element.precioU.toString(), col3X, y);
                    y += 4;

                    // Toppings debajo del plato (para llevar)
                    if (element.toppings && element.toppings != 0) {
                        const toppingIds = element.toppings.split(',');
                        doc.setFont('helvetica', 'normal');
                        doc.setFontSize(8);
                        toppingIds.forEach((tid: any) => {
                            const topping = this.multiselectToppings.find((t: any) => t.idtoppings == tid);
                            if (topping) {
                                const esSin = topping.nombre.toUpperCase().startsWith('SIN');
                                const prefijo = esSin ? '  >> - ' : '  >> + ';
                                doc.text(prefijo + topping.nombre, col2X, y);
                                y += 3.5;
                            }
                        });
                        doc.setFont('helvetica', 'normal');
                        doc.setFontSize(12);
                    }
                }
            });
        }

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        y += 4;

        doc.text('Comentario :', centerX, y, { align: 'center' });
        y += 4;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);

        const maxWidth = 73;
        const comentario = this.pedidosSeleccionados[0].comentario || '';
        const lines = doc.splitTextToSize(comentario, maxWidth);
        let x = 5;
        let currentY = y;

        lines.forEach((line: string | string[]) => {
            doc.text(line, x, currentY);
            currentY += 4;
        });
        y += 5;

        // Cuando la imagen se cargue, agregarla al PDF

        const pdfBlob = doc.output('blob');
        const pdfUrl = URL.createObjectURL(pdfBlob);
        this.PDFdescargar(pdfUrl);
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
}
