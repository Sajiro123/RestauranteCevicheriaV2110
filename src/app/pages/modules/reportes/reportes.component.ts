import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ImportsModule } from '../../imports';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { PedidoService } from '../../service/pedido.service';
import { Table } from 'primeng/table';
import { ES_LOCALE } from '../../../model/util/calendar';
import { TabsModule } from 'primeng/tabs';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import jsPDF from 'jspdf';
import { AperturaService } from '../../service/apertura.service';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Router } from '@angular/router';
import { validateSession } from '../../../model/util/functionscompartidas';
import { PrimeNG } from 'primeng/config';

@Component({
    selector: 'app-reportes',
    imports: [CommonModule, ImportsModule, FormsModule, ReactiveFormsModule],
    providers: [MessageService, ConfirmationService],
    templateUrl: './reportes.component.html',
    styleUrl: './reportes.component.scss'
})
export class ReportesComponent implements OnInit {
    selectedRange: Date[] | null = null;
    selectedRange2: Date | null = null;
    selectedRange3: Date[] | null = null;
    selectedRange4: Date[] | null = null;
    expandedRows = {};
    expandedRowsEliminados = {};
    expandedRowsSinCobrar = {};
    esLocale = ES_LOCALE;
    selectedDates: Date[] = [];
    @ViewChild('dt') dt!: Table;
    Clients: any[] = [];
    PedidoDetalle: any[] = [];
    PedidoReporte: any[] = [];
    PedidoReporteEliminados: any[] = [];
    PedidoReporteSinCobrar: any[] = [];
    array_data = [] as any;
    array_data_total: any = {};
    esAdmin: boolean = false;
    allClientsData: any[] = [];
    mostrarDiasSinVentas: boolean = true;
    cargandoConsolidado: boolean = false;
    PDF_Dialog: boolean = false;
    pdfUrl: SafeResourceUrl | null = null;
    fecha_actual: any;

    // ============================================================
    // PESTAÑA 5: REPORTE DE COMPROBANTES ELECTRÓNICOS SUNAT
    // ============================================================
    selectedRangeComprobantes: Date[] | null = null;
    filtroTipoComprobante: string = 'all';
    filtroSerieComprobante: string = '';
    filtroNumeroComprobante: string = '';
    filtroClienteComprobante: string = '';
    filtroSearchComprobante: string = '';
    cargandoComprobantes: boolean = false;
    listaComprobantes: any[] = [];
    resumenComprobantes: any = {
        total_importe: 0,
        total_igv: 0,
        total_gravadas: 0,
        count_boletas: 0,
        count_facturas: 0,
        count_notas: 0,
        total_comprobantes: 0
    };
    expandedRowsComprobantes: any = {};
    comprobantePdfDialog: boolean = false;
    comprobantePdfUrl: SafeResourceUrl | null = null;
    comprobanteFormato: 'ticket' | 'a4' = 'ticket';
    comprobanteArchivosActual: any = null;
    anulandoId: number | null = null;

    // Estado de cierre de caja para el Reporte Consolidado
    cajaCerrada: boolean = false;
    verificandoCaja: boolean = true;

    // Modal amigable de aviso (caja no cerrada / advertencias)
    avisoModalDialog: boolean = false;
    avisoModalData: {
        titulo: string;
        mensaje: string;
        tipo: 'warning' | 'info' | 'error';
    } = {
        titulo: '',
        mensaje: '',
        tipo: 'warning'
    };

    mostrarAvisoAmigable(titulo: string, mensaje: string, tipo: 'warning' | 'info' | 'error' = 'warning') {
        this.avisoModalData = { titulo, mensaje, tipo };
        this.avisoModalDialog = true;
    }

    // Date restrictions for calendar (null = sin restricción)
    minDate: Date | null = null;
    maxDate: Date | null = null;
    oneWeekAgo: Date = new Date();

    // Add properties for the edit modal
    Cobrar_Dialog: boolean = false;
    Pedido_cobrar: any = {
        idpedido: 0,
        delivery: 0,
        yape: 0,
        efectivo: 0,
        visa: 0,
        plin: 0,
        total: 0
    };

    constructor(
        private PedidoService: PedidoService,
        private sanitizer: DomSanitizer,
        private AperturaService_: AperturaService,
        private messageService: MessageService,
        private router: Router,
        private primeng: PrimeNG,
        private http: HttpClient
    ) {
        // Establecer idioma español para PrimeNG
        this.primeng.setTranslation(ES_LOCALE);

        // Validate session - will redirect to login if invalid
        if (!validateSession(this.router)) {
            return;
        }

        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        const idperfil = currentUser.idperfil || 0;
        this.esAdmin = (idperfil == 1);

        if (!this.esAdmin) {
            // No admin: solo consultar hasta 3 días atrás
            const today = new Date();
            const threeDaysAgo = new Date(today);
            threeDaysAgo.setDate(today.getDate() - 3);

            this.minDate = threeDaysAgo;
            this.maxDate = today;
        } else {
            // Admin: sin restricción de fechas
            this.minDate = null;
            this.maxDate = null;
        }
    }

    ngOnInit(): void {
        const today = new Date();
        this.oneWeekAgo = new Date(today);
        this.oneWeekAgo.setDate(today.getDate() - 7);

        // Sin auto-precarga de data
        this.selectedRange = null;
        this.selectedRange2 = null;
        this.selectedRange3 = null;
        this.selectedRange4 = null;

        // Validar si la caja del día ya fue cerrada para permitir el Reporte Consolidado
        this.verificarEstadoCaja();
    }

    verificarEstadoCaja(): Promise<boolean> {
        return new Promise((resolve) => {
            this.verificandoCaja = true;
            this.AperturaService_.ListarAperturaHoy().subscribe({
                next: (response: any) => {
                    this.verificandoCaja = false;
                    if (response && response.success && response.data && response.data.length > 0) {
                        const apertura = response.data[0];
                        // estado == 2 significa que la caja ya fue cerrada
                        this.cajaCerrada = (apertura.estado == 2);
                    } else {
                        // Sin apertura hoy o estado !== 2
                        this.cajaCerrada = false;
                    }

                    if (!this.cajaCerrada) {
                        // Se guarda el estado de la caja de hoy sin vaciar los datos consultados
                    }

                    resolve(this.cajaCerrada);
                },
                error: (err: any) => {
                    console.error('Error al verificar estado de caja', err);
                    this.verificandoCaja = false;
                    this.cajaCerrada = false;
                    resolve(false);
                }
            });
        });
    }

    onTabChange(event: any) {
        if (event && event.index === 0) {
            this.verificarEstadoCaja();
        } else if (event && event.index === 4) {
            if (this.listaComprobantes.length === 0) {
                this.seleccionarMesActualComprobantes();
            }
        }
    }

    onDatePickerShow(picker: any) {
        if (picker && this.oneWeekAgo) {
            picker.currentMonth = this.oneWeekAgo.getMonth();
            picker.currentYear = this.oneWeekAgo.getFullYear();
            picker.createMonths(picker.currentMonth, picker.currentYear);
        }
    }

    expandAll() {
        this.expandedRows = this.PedidoReporte.reduce((acc, p) => (acc[p.id] = true) && acc, {});
    }

    collapseAll() {
        this.expandedRows = {};
    }

    filterGlobal(event: Event) {
        const input = event.target as HTMLInputElement; // Type assertion
        const value = input.value; // Safe access to value
        this.dt.filterGlobal(value, 'contains'); // Use the dt reference to filter the table
    }

    handleCalendarBlur() {
        if (this.selectedRange && this.selectedRange.length === 2 && this.selectedRange[1] != null) {
            this.showRerportemount({
                fechainicio: this.formatDateToMySQL(new Date(this.selectedRange[0])),
                fechafin: this.formatDateToMySQL(new Date(this.selectedRange[1]))
            });
        }
    }

    DayCalendarBlur() {
        if (this.selectedRange2) {
            this.showReporteDay(this.formatDateToMySQL(new Date(this.selectedRange2)));
        }
    }

    DayCalendarBlurEliminados() {
        if (this.selectedRange3 && this.selectedRange3.length === 2 && this.selectedRange3[1] != null) {
            this.showReporteDayEliminados({
                fechainicio: this.formatDateToMySQL(new Date(this.selectedRange3[0])),
                fechafin: this.formatDateToMySQL(new Date(this.selectedRange3[1]))
            });
        }
    }

    DayCalendarBlurSinCobrar() {
        if (this.selectedRange4 && this.selectedRange4.length === 2 && this.selectedRange4[1] != null) {
            this.showReporteDaySinCobrar({
                fechainicio: this.formatDateToMySQL(new Date(this.selectedRange4[0])),
                fechafin: this.formatDateToMySQL(new Date(this.selectedRange4[1]))
            });
        }
    }

    // Add the Editar function
    Editar(pedido: any) {
        this.Cobrar_Dialog = true;
        this.Pedido_cobrar = {
            idpedido: pedido.idpedido,
            delivery: pedido.delivery || 0,
            yape: pedido.yape || 0,
            efectivo: pedido.efectivo || 0,
            visa: pedido.visa || 0,
            plin: pedido.plin || 0,
            total: pedido.total || 0
        };
    }

    // Add the hideDialog function
    hideDialog() {
        this.Cobrar_Dialog = false;
    }

    pagarTodo(metodo: 'efectivo' | 'visa' | 'yape' | 'plin') {
        this.Pedido_cobrar.efectivo = 0;
        this.Pedido_cobrar.visa = 0;
        this.Pedido_cobrar.yape = 0;
        this.Pedido_cobrar.plin = 0;

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

    // Add the CobrarPedido function
    CobrarPedido(pedido: any) {
        const total_ingresado = Number(pedido.yape || 0) + Number(pedido.visa || 0) + Number(pedido.plin || 0) + Number(pedido.efectivo || 0);

        if (total_ingresado == pedido.total) {
            this.PedidoService.CobrarPedido(pedido).subscribe((response) => {
                // Update the pedido in the list
                const index = this.PedidoReporte.findIndex(p => p.idpedido === pedido.idpedido);
                if (index !== -1) {
                    this.PedidoReporte[index] = { ...this.PedidoReporte[index], ...pedido };
                }

                this.Cobrar_Dialog = false;
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

    PdfReporteDiario(fecha: string) {
        this.PedidoService.ValidarCierre(fecha).subscribe((responsevalidar) => {
            if (!responsevalidar.data) {
                this.mostrarAvisoAmigable(
                    'Falta cerrar la caja',
                    `No se puede generar el reporte PDF para el día ${fecha} porque la caja aún no ha sido cerrada.`,
                    'warning'
                );
                return;
            }

            this.AperturaService_.calcularResumenCaja(fecha).subscribe((resumenRes) => {
                this.AperturaService_.ListGastos(fecha).subscribe((responsegastos) => {
                    const resumen = (resumenRes && resumenRes.data) ? resumenRes.data : {};
                    const montoInicial = Number(resumen.montoInicial || 0);
                    const ventasEfectivo = Number(resumen.ventasEfectivo || 0);
                    const ventasYape = Number(resumen.ventasYape || 0);
                    const ventasPlin = Number(resumen.ventasPlin || 0);
                    const ventasTarjeta = Number(resumen.ventasTarjeta || 0);
                    const totalVentas = Number(resumen.totalVentas || (ventasEfectivo + ventasYape + ventasPlin + ventasTarjeta));

                    let gastosarray: any[] = [];
                    let totalgastos = 0;
                    if (responsegastos && responsegastos.data) {
                        gastosarray = responsegastos.data;
                        totalgastos = gastosarray.reduce((sum: number, item: any) => sum + (Number(item.monto) || 0), 0);
                    }

                    // Cálculos financieros correctos:
                    // 1. Efectivo neto del día (sin caja inicial / ventas en efectivo - gastos en efectivo)
                    const efectivoSinInicial = ventasEfectivo - totalgastos;
                    // 2. Efectivo total físico en caja (con caja inicial / fondo de apertura)
                    const efectivoConInicial = montoInicial + ventasEfectivo - totalgastos;
                    // 3. Dinero en cuentas / billeteras digitales (Yape, Plin, Tarjeta)
                    const dineroDigital = ventasYape + ventasPlin + ventasTarjeta;
                    // 4. Balance neto del día (Ventas Totales - Gastos)
                    const balanceNeto = totalVentas - totalgastos;

                    // Formatear fecha en español legible sin errores gramaticales
                    const [anio, mes, dia] = fecha.split('-').map(Number);
                    const dateObj = new Date(anio, mes - 1, dia);
                    const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
                    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
                    const diaSemana = diasSemana[dateObj.getDay()];
                    const mesNombre = meses[mes - 1];
                    const fechaFormateada = `${diaSemana}, ${dia} de ${mesNombre} del ${anio}`;

                    // Altura dinámica del ticket (80mm de ancho)
                    const cantGastos = Math.max(gastosarray.length, 1);
                    const altoCalculado = 126 + (cantGastos * 4.2);
                    const pageHeight = Math.max(138, Math.ceil(altoCalculado));

                    const doc = new jsPDF({
                        orientation: 'portrait',
                        unit: 'mm',
                        format: [80, pageHeight]
                    });

                    const xLeft = 6;
                    const xRight = 74;
                    const xCenter = 40;
                    let y = 8;

                    const drawDashedLine = (posY: number) => {
                        doc.setDrawColor(160, 170, 185);
                        doc.setLineWidth(0.2);
                        doc.setLineDashPattern([1.2, 1.2], 0);
                        doc.line(xLeft, posY, xRight, posY);
                        doc.setLineDashPattern([], 0);
                    };

                    const drawSolidLine = (posY: number, width = 0.25) => {
                        doc.setDrawColor(180, 190, 205);
                        doc.setLineWidth(width);
                        doc.line(xLeft, posY, xRight, posY);
                    };

                    // ====== ENCABEZADO ======
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(13);
                    doc.setTextColor(15, 23, 42);
                    doc.text('CEVICHERÍA WILLY', xCenter, y, { align: 'center' });
                    y += 4.8;

                    doc.setFontSize(8.5);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(51, 65, 85);
                    doc.text('REPORTE DE CIERRE DE CAJA', xCenter, y, { align: 'center' });
                    y += 4.2;

                    doc.setFontSize(7.5);
                    doc.setFont('helvetica', 'normal');
                    doc.setTextColor(100, 116, 139);
                    doc.text(fechaFormateada, xCenter, y, { align: 'center' });
                    y += 3.8;

                    doc.setFontSize(6.8);
                    const horaActual = new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
                    doc.text(`Impresión: ${horaActual} hrs`, xCenter, y, { align: 'center' });
                    y += 4.5;

                    drawDashedLine(y);
                    y += 4.5;

                    // ====== 1. INGRESOS POR VENTAS ======
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(8);
                    doc.setTextColor(15, 23, 42);
                    doc.text('1. INGRESOS POR VENTAS', xLeft, y);
                    y += 4.2;

                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(7.5);
                    doc.setTextColor(51, 65, 85);

                    doc.text('Efectivo', xLeft + 2, y);
                    doc.text(`S/ ${ventasEfectivo.toFixed(2)}`, xRight, y, { align: 'right' });
                    y += 3.8;

                    doc.text('Yape', xLeft + 2, y);
                    doc.text(`S/ ${ventasYape.toFixed(2)}`, xRight, y, { align: 'right' });
                    y += 3.8;

                    doc.text('Plin', xLeft + 2, y);
                    doc.text(`S/ ${ventasPlin.toFixed(2)}`, xRight, y, { align: 'right' });
                    y += 3.8;

                    doc.text('Tarjeta / Visa', xLeft + 2, y);
                    doc.text(`S/ ${ventasTarjeta.toFixed(2)}`, xRight, y, { align: 'right' });
                    y += 4.2;

                    drawSolidLine(y, 0.2);
                    y += 3.5;

                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(8);
                    doc.setTextColor(15, 23, 42);
                    doc.text('TOTAL VENTAS (+)', xLeft + 2, y);
                    doc.text(`S/ ${totalVentas.toFixed(2)}`, xRight, y, { align: 'right' });
                    y += 5;

                    // ====== 2. DETALLE DE GASTOS ======
                    drawDashedLine(y);
                    y += 4.5;

                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(8);
                    doc.setTextColor(15, 23, 42);
                    doc.text('2. DETALLE DE GASTOS', xLeft, y);
                    y += 4.2;

                    if (gastosarray.length > 0) {
                        doc.setFont('helvetica', 'normal');
                        doc.setFontSize(7);
                        doc.setTextColor(51, 65, 85);
                        gastosarray.forEach((gasto: any) => {
                            const desc = (gasto.descripcion || gasto.notas || 'Gasto vario').trim();
                            const descCortada = desc.length > 25 ? desc.substring(0, 23) + '..' : desc;
                            doc.text(`• ${descCortada}`, xLeft + 2, y);
                            doc.text(`S/ ${Number(gasto.monto).toFixed(2)}`, xRight, y, { align: 'right' });
                            y += 3.8;
                        });
                    } else {
                        doc.setFont('helvetica', 'italic');
                        doc.setFontSize(7);
                        doc.setTextColor(148, 163, 184);
                        doc.text('Sin gastos registrados en el día', xLeft + 2, y);
                        y += 3.8;
                    }

                    drawSolidLine(y, 0.2);
                    y += 3.5;

                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(8);
                    doc.setTextColor(185, 28, 28);
                    doc.text('TOTAL GASTOS (-)', xLeft + 2, y);
                    doc.text(`S/ ${totalgastos.toFixed(2)}`, xRight, y, { align: 'right' });
                    y += 5;

                    // ====== 3. ARQUEO Y LIQUIDACIÓN ======
                    drawSolidLine(y, 0.35);
                    y += 4.5;

                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(8);
                    doc.setTextColor(15, 23, 42);
                    doc.text('3. ARQUEO Y LIQUIDACIÓN', xLeft, y);
                    y += 4.2;

                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(7.5);
                    doc.setTextColor(71, 85, 105);

                    doc.text('(+) Efectivo Ventas:', xLeft + 2, y);
                    doc.text(`S/ ${ventasEfectivo.toFixed(2)}`, xRight, y, { align: 'right' });
                    y += 3.8;

                    doc.text('(-) Gastos en Efectivo:', xLeft + 2, y);
                    doc.text(`S/ ${totalgastos.toFixed(2)}`, xRight, y, { align: 'right' });
                    y += 4.2;

                    drawSolidLine(y, 0.15);
                    y += 3.5;

                    // Efectivo sin caja inicial
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(7.8);
                    doc.setTextColor(15, 23, 42);
                    doc.text('EFECTIVO SIN CAJA INICIAL:', xLeft + 2, y);
                    doc.text(`S/ ${efectivoSinInicial.toFixed(2)}`, xRight, y, { align: 'right' });
                    y += 4.2;

                    // Fondo de apertura / Caja inicial
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(7.5);
                    doc.setTextColor(71, 85, 105);
                    doc.text('(+) Fondo / Caja Inicial:', xLeft + 2, y);
                    doc.text(`S/ ${montoInicial.toFixed(2)}`, xRight, y, { align: 'right' });
                    y += 4.8;

                    // Recuadro destacado: TOTAL EFECTIVO EN CAJA (con caja inicial)
                    doc.setFillColor(241, 245, 249);
                    doc.setDrawColor(203, 213, 225);
                    doc.roundedRect(xLeft, y, 68, 7.5, 1.5, 1.5, 'FD');

                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(8);
                    doc.setTextColor(15, 23, 42);
                    doc.text('TOTAL EFECTIVO EN CAJA:', xLeft + 2, y + 5);

                    doc.setFontSize(9);
                    doc.setTextColor(5, 150, 105);
                    doc.text(`S/ ${efectivoConInicial.toFixed(2)}`, xRight - 2, y + 5, { align: 'right' });
                    y += 11;

                    // Dinero Digital y Balance Neto
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(7.5);
                    doc.setTextColor(71, 85, 105);
                    doc.text('Dinero Digital (Yape/Plin/Visa):', xLeft + 2, y);
                    doc.text(`S/ ${dineroDigital.toFixed(2)}`, xRight, y, { align: 'right' });
                    y += 4;

                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(8);
                    doc.setTextColor(15, 23, 42);
                    doc.text('BALANCE NETO DEL DÍA:', xLeft + 2, y);
                    doc.text(`S/ ${balanceNeto.toFixed(2)}`, xRight, y, { align: 'right' });
                    y += 5.5;

                    // ====== PIE DEL TICKET ======
                    drawDashedLine(y);
                    y += 4;

                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(6.5);
                    doc.setTextColor(148, 163, 184);
                    doc.text('Sistema de Gestión - Cevichería Willy', xCenter, y, { align: 'center' });
                    y += 3.2;
                    doc.text('*** Documento de Control Interno ***', xCenter, y, { align: 'center' });

                    const pdfBlob = doc.output('blob');
                    const pdfUrl = URL.createObjectURL(pdfBlob);
                    this.PDFdescargar(pdfUrl);
                });
            });
        });
    }

    hideDialogPdf() {
        this.PDF_Dialog = false;
    }

    PDFdescargar(pdf: string) {
        this.PDF_Dialog = true;
        this.pdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(pdf);
    }

    showRerportemount(parameters: any = {}) {
        this.Clients = [];
        this.allClientsData = [];
        this.array_data_total = {};
        this.cargandoConsolidado = true;

        this.PedidoService.showRerporte(parameters).subscribe(
            (response: any) => {
                this.cargandoConsolidado = false;
                if (response && response.cajaNoCerrada) {
                    this.Clients = [];
                    this.allClientsData = [];
                    this.mostrarAvisoAmigable(
                        'Aún falta cerrar la caja',
                        response.message || 'No es posible consultar el Reporte Consolidado de Ventas porque la caja para la fecha seleccionada aún no ha sido cerrada.',
                        'warning'
                    );
                    return;
                }

                if (response && response.success && Array.isArray(response.data)) {
                    const mapaPorFecha = new Map<string, any>();

                    response.data.forEach((element: any) => {
                        const rawFecha = element.fecha ? String(element.fecha).trim().split('T')[0].split(' ')[0] : '';
                        if (!rawFecha) return;

                        const yape = Number(element.yape) || 0;
                        const plin = Number(element.plin) || 0;
                        const visa = Number(element.visa) || 0;
                        const efectivo = Number(element.efectivo) || 0;
                        const gastos = Number(element.gastos) || 0;

                        let nombreDia = '';
                        const partes = rawFecha.split('-');
                        if (partes.length === 3) {
                            const dateObj = new Date(parseInt(partes[0], 10), parseInt(partes[1], 10) - 1, parseInt(partes[2], 10));
                            const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
                            nombreDia = dias[dateObj.getDay()];
                        }

                        if (!mapaPorFecha.has(rawFecha)) {
                            mapaPorFecha.set(rawFecha, {
                                fecha: rawFecha,
                                dia: nombreDia,
                                yape,
                                plin,
                                visa,
                                efectivo,
                                gastos,
                                total: yape + plin + visa + efectivo,
                                cajaEstado: element.cajaEstado,
                                sinVentas: (yape + plin + visa + efectivo) === 0 && gastos === 0
                            });
                        } else {
                            const existente = mapaPorFecha.get(rawFecha);
                            existente.yape += yape;
                            existente.plin += plin;
                            existente.visa += visa;
                            existente.efectivo += efectivo;
                            existente.gastos += gastos;
                            existente.total = existente.yape + existente.plin + existente.visa + existente.efectivo;
                            existente.sinVentas = existente.total === 0 && existente.gastos === 0;
                            if (element.cajaEstado) existente.cajaEstado = element.cajaEstado;
                        }
                    });

                    // Generar todos los días del calendario en el rango seleccionado
                    if (parameters.fechainicio && parameters.fechafin) {
                        const [y1, m1, d1] = parameters.fechainicio.split('-').map(Number);
                        const [y2, m2, d2] = parameters.fechafin.split('-').map(Number);
                        const cur = new Date(y1, m1 - 1, d1);
                        const end = new Date(y2, m2 - 1, d2);

                        while (cur <= end) {
                            const yyyy = cur.getFullYear();
                            const mm = String(cur.getMonth() + 1).padStart(2, '0');
                            const dd = String(cur.getDate()).padStart(2, '0');
                            const fStr = `${yyyy}-${mm}-${dd}`;

                            const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
                            const nombreDia = dias[cur.getDay()];

                            if (!mapaPorFecha.has(fStr)) {
                                mapaPorFecha.set(fStr, {
                                    fecha: fStr,
                                    dia: nombreDia,
                                    yape: 0,
                                    plin: 0,
                                    visa: 0,
                                    efectivo: 0,
                                    gastos: 0,
                                    total: 0,
                                    cajaEstado: null,
                                    sinVentas: true
                                });
                            }
                            cur.setDate(cur.getDate() + 1);
                        }
                    }

                    // Ordenar cronológicamente por fecha ASC
                    this.allClientsData = Array.from(mapaPorFecha.values()).sort((a: any, b: any) =>
                        (a.fecha || '').localeCompare(b.fecha || '')
                    );

                    this.aplicarFiltroDiasSinVentas();
                } else {
                    this.Clients = [];
                    this.allClientsData = [];
                    this.recalcularTotales();
                }
            },
            (error: any) => {
                this.cargandoConsolidado = false;
                console.error('Error al intentar consultar', error);
                this.mostrarAvisoAmigable(
                    'Error de conexión',
                    'Hubo un problema al conectar con el servidor para consultar las ventas.',
                    'error'
                );
            }
        );
    }

    seleccionarMesActual() {
        if (!this.esAdmin) return;
        const now = new Date();
        const y = now.getFullYear();
        const m = now.getMonth();
        const inicio = new Date(y, m, 1);
        const fin = new Date(y, m + 1, 0);
        this.selectedRange = [inicio, fin];
        this.handleCalendarBlur();
    }

    seleccionarMesAnterior() {
        if (!this.esAdmin) return;
        const now = new Date();
        const y = now.getFullYear();
        const m = now.getMonth();
        const inicio = new Date(y, m - 1, 1);
        const fin = new Date(y, m, 0);
        this.selectedRange = [inicio, fin];
        this.handleCalendarBlur();
    }

    seleccionarUltimos30Dias() {
        if (!this.esAdmin) return;
        const fin = new Date();
        const inicio = new Date();
        inicio.setDate(fin.getDate() - 30);
        this.selectedRange = [inicio, fin];
        this.handleCalendarBlur();
    }

    toggleDiasSinVentas() {
        this.mostrarDiasSinVentas = !this.mostrarDiasSinVentas;
        this.aplicarFiltroDiasSinVentas();
    }

    aplicarFiltroDiasSinVentas() {
        if (this.mostrarDiasSinVentas) {
            this.Clients = [...this.allClientsData];
        } else {
            this.Clients = this.allClientsData.filter((c: any) => c.total > 0 || c.gastos > 0);
        }
        this.recalcularTotales();
    }

    recalcularTotales() {
        this.array_data_total = {
            efectivo: this.totalEfectivo,
            plin: this.totalPlin,
            visa: this.totalVisa,
            gastos: this.totalGastos,
            total: this.totalGeneral,
            yape: this.totalyape
        };
    }

    get totalDiasConVentas(): number {
        return (this.allClientsData || []).filter((c: any) => (Number(c.total) || 0) > 0).length;
    }

    get totalDiasSinVentas(): number {
        return (this.allClientsData || []).filter((c: any) => (Number(c.total) || 0) === 0 && (Number(c.gastos) || 0) === 0).length;
    }

    get balanceNeto(): number {
        return (Number(this.array_data_total?.total) || 0) - (Number(this.array_data_total?.gastos) || 0);
    }

    showReporteDay(parameters: string) {
        this.PedidoReporte = [];
        this.PedidoService.ShowPedidosFecha(parameters).subscribe(
            async (response: { success: any; data: any[] }) => {
                if (response.success) {
                    this.array_data = [] as any;
                    response.data.forEach((element: any) => {
                        if (element.fecha != undefined) {
                            const rawFecha = String(element.fecha).trim().split('T')[0].split(' ')[0];
                            const partes = rawFecha.split('-');
                            if (partes.length === 3) {
                                const y = parseInt(partes[0], 10);
                                const m = parseInt(partes[1], 10) - 1;
                                const d = parseInt(partes[2], 10);
                                const dateObj = new Date(y, m, d);
                                element.fecha = rawFecha;
                                const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
                                element.dia = dias[dateObj.getDay()];
                            }
                        }
                    });
                    // Ordenar por fecha y hora ASC
                    response.data.sort((a: any, b: any) => (a.fecha || '').localeCompare(b.fecha || '') || (a.hora || '').localeCompare(b.hora || '') || (a.idpedido - b.idpedido));
                    this.PedidoReporte = response.data;

                    await this.PedidoService.ReporteProductoDetalle(parameters).subscribe((response2: { success: any; data: any[] }) => {
                        if (response2.success) {
                            this.PedidoReporte = this.PedidoReporte.map((pedido: any) => {
                                const detalle = response2.data.filter((d: any) => d.idpedido === pedido.idpedido);
                                return {
                                    ...pedido,
                                    pedidodetalle: detalle.length > 0 ? detalle[0].pedidodetalle : []
                                };
                            });
                        } else {
                            this.mostrarAvisoAmigable('Detalles no disponibles', 'No se pudieron consultar los detalles de los productos.', 'info');
                        }
                    });
                } else {
                    this.mostrarAvisoAmigable(
                        'Sin pedidos',
                        `No se encontraron pedidos registrados para la fecha ${parameters}.`,
                        'info'
                    );
                }
            },
            (error: any) => {
                console.error('Error al intentar consultar', error);
                this.mostrarAvisoAmigable('Error de conexión', 'Hubo un problema al conectar con el servidor para obtener los pedidos del día.', 'error');
            }
        );
    }

    showReporteDayEliminados(parameters: any) {
        this.PedidoReporteEliminados = [];
        this.PedidoService.ShowPedidosFechaEliminados(parameters).subscribe(
            async (response: { success: any; data: any[] }) => {
                if (response.success) {
                    response.data.forEach((element: any) => {
                        if (element.fecha != undefined) {
                            const d = new Date(element.fecha);
                            if (!isNaN(d.getTime())) {
                                const yyyy = d.getFullYear();
                                const mm = String(d.getMonth() + 1).padStart(2, '0');
                                const dd = String(d.getDate()).padStart(2, '0');
                                element.fecha = `${yyyy}-${mm}-${dd}`;

                                const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
                                element.dia = dias[d.getDay()];
                            }
                        }
                    });
                    // Ordenar por fecha y hora ASC
                    response.data.sort((a: any, b: any) => (a.fecha || '').localeCompare(b.fecha || '') || (a.hora || '').localeCompare(b.hora || '') || (a.idpedido - b.idpedido));
                    this.PedidoReporteEliminados = response.data;

                    await this.PedidoService.ReporteProductoDetalleEliminados(parameters).subscribe((response2: { success: any; data: any[] }) => {
                        if (response2.success) {
                            this.PedidoReporteEliminados = this.PedidoReporteEliminados.map((pedido: any) => {
                                const detalle = response2.data.filter((d: any) => d.idpedido === pedido.idpedido);
                                return {
                                    ...pedido,
                                    pedidodetalle: detalle.length > 0 ? detalle[0].pedidodetalle : []
                                };
                            });
                        } else {
                            this.mostrarAvisoAmigable('Detalles no disponibles', 'No se pudieron consultar los detalles de los productos eliminados.', 'info');
                        }
                    });
                } else {
                    this.mostrarAvisoAmigable(
                        'Sin pedidos eliminados',
                        'No se encontraron pedidos anulados o eliminados en el rango de fechas seleccionado.',
                        'info'
                    );
                }
            },
            (error: any) => {
                console.error('Error al intentar consultar', error);
                this.mostrarAvisoAmigable('Error de conexión', 'Hubo un problema al conectar con el servidor.', 'error');
            }
        );
    }

    showReporteDaySinCobrar(parameters: any) {
        this.PedidoReporteSinCobrar = [];
        this.PedidoService.ShowPedidosFechaSinCobrar(parameters).subscribe(
            async (response: { success: any; data: any[] }) => {
                if (response.success) {
                    response.data.forEach((element: any) => {
                        if (element.fecha != undefined) {
                            const d = new Date(element.fecha);
                            if (!isNaN(d.getTime())) {
                                const yyyy = d.getFullYear();
                                const mm = String(d.getMonth() + 1).padStart(2, '0');
                                const dd = String(d.getDate()).padStart(2, '0');
                                element.fecha = `${yyyy}-${mm}-${dd}`;

                                const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
                                element.dia = dias[d.getDay()];
                            }
                        }
                    });
                    // Ordenar por fecha y hora ASC
                    response.data.sort((a: any, b: any) => (a.fecha || '').localeCompare(b.fecha || '') || (a.hora || '').localeCompare(b.hora || '') || (a.idpedido - b.idpedido));
                    this.PedidoReporteSinCobrar = response.data;

                    await this.PedidoService.ReporteProductoDetalleSinCobrar(parameters).subscribe((response2: { success: any; data: any[] }) => {
                        if (response2.success) {
                            this.PedidoReporteSinCobrar = this.PedidoReporteSinCobrar.map((pedido: any) => {
                                const detalle = response2.data.filter((d: any) => d.idpedido === pedido.idpedido);
                                return {
                                    ...pedido,
                                    pedidodetalle: detalle.length > 0 ? detalle[0].pedidodetalle : []
                                };
                            });
                        } else {
                            this.mostrarAvisoAmigable('Detalles no disponibles', 'No se pudieron consultar los detalles de los productos sin cobrar.', 'info');
                        }
                    });
                } else {
                    this.mostrarAvisoAmigable(
                        'Sin pedidos pendientes',
                        'No se encontraron pedidos sin cobrar en el rango de fechas seleccionado.',
                        'info'
                    );
                }
            },
            (error: any) => {
                console.error('Error al intentar consultar', error);
                this.mostrarAvisoAmigable('Error de conexión', 'Hubo un problema al conectar con el servidor.', 'error');
            }
        );
    }

    formatDate(dateString: string | number | Date) {
        const date = new Date(dateString);
        date.setMinutes(date.getMinutes() + date.getTimezoneOffset());

        // Get day, month, year, hours, and minutes
        const day = String(date.getDate()).padStart(2, '0'); // Add leading zero
        const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-based
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, '0'); // Add leading zero
        const minutes = String(date.getMinutes()).padStart(2, '0'); // Add leading zero

        return `${day}/${month}/${year} ${hours}:${minutes}`;

        // Usage example
    }
    formatDateToMySQL(date: Date): string {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');

        return `${year}-${month}-${day}`;
    }

    get totalEfectivo(): number {
        return this.datosVisibles.reduce((sum, item) => sum + +item.efectivo, 0);
    }

    get totalyape(): number {
        return this.datosVisibles.reduce((sum, item) => sum + +item.yape, 0);
    }

    get totalPlin(): number {
        return this.datosVisibles.reduce((sum, item) => sum + +item.plin, 0);
    }

    get totalVisa(): number {
        return this.datosVisibles.reduce((sum, item) => sum + +item.visa, 0);
    }

    get totalGastos(): number {
        return this.datosVisibles.reduce((sum, item) => sum + (+item.gastos || 0), 0);
    }

    get totalGeneral(): number {
        return this.totalEfectivo + this.totalPlin + this.totalVisa + this.totalyape;
    }

    private get datosVisibles(): any[] {
        return this.Clients;
    }

    // ============================================================
    // MÉTODOS DEL REPORTE DE COMPROBANTES SUNAT
    // ============================================================
    cargarReporteComprobantes() {
        this.cargandoComprobantes = true;
        let url = 'http://127.0.0.1:8000/api/comprobantes?limit=250';

        if (this.selectedRangeComprobantes && this.selectedRangeComprobantes[0]) {
            const fInicio = this.formatDateToMySQL(this.selectedRangeComprobantes[0]);
            url += `&fecha_inicio=${fInicio}`;
            if (this.selectedRangeComprobantes[1]) {
                const fFin = this.formatDateToMySQL(this.selectedRangeComprobantes[1]);
                url += `&fecha_fin=${fFin}`;
            } else {
                url += `&fecha_fin=${fInicio}`;
            }
        }

        if (this.filtroTipoComprobante && this.filtroTipoComprobante !== 'all') {
            url += `&tipo_doc=${encodeURIComponent(this.filtroTipoComprobante)}`;
        }
        if (this.filtroSerieComprobante && this.filtroSerieComprobante.trim()) {
            url += `&serie=${encodeURIComponent(this.filtroSerieComprobante.trim().toUpperCase())}`;
        }
        if (this.filtroNumeroComprobante && String(this.filtroNumeroComprobante).trim()) {
            url += `&correlativo=${encodeURIComponent(String(this.filtroNumeroComprobante).trim())}`;
        }
        if (this.filtroClienteComprobante && this.filtroClienteComprobante.trim()) {
            url += `&cliente=${encodeURIComponent(this.filtroClienteComprobante.trim())}`;
        }
        if (this.filtroSearchComprobante && this.filtroSearchComprobante.trim()) {
            url += `&search=${encodeURIComponent(this.filtroSearchComprobante.trim())}`;
        }

        this.http.get<any>(url).subscribe({
            next: (res) => {
                this.cargandoComprobantes = false;
                this.listaComprobantes = res?.data || [];
                this.resumenComprobantes = res?.resumen || {
                    total_importe: 0,
                    total_igv: 0,
                    total_gravadas: 0,
                    count_boletas: 0,
                    count_facturas: 0,
                    count_notas: 0,
                    total_comprobantes: 0
                };
            },
            error: (err) => {
                this.cargandoComprobantes = false;
                console.error('Error cargando reporte comprobantes:', err);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'No se pudo conectar con el servidor de comprobantes. Verifique que sunat-api esté activo.',
                    life: 5000
                });
            }
        });
    }

    seleccionarHoyComprobantes() {
        const hoy = new Date();
        this.selectedRangeComprobantes = [hoy, hoy];
        this.cargarReporteComprobantes();
    }

    seleccionarMesActualComprobantes() {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        this.selectedRangeComprobantes = [start, end];
        this.cargarReporteComprobantes();
    }

    seleccionarMesAnteriorComprobantes() {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const end = new Date(now.getFullYear(), now.getMonth(), 0);
        this.selectedRangeComprobantes = [start, end];
        this.cargarReporteComprobantes();
    }

    limpiarFiltrosComprobantes() {
        this.selectedRangeComprobantes = null;
        this.filtroTipoComprobante = 'all';
        this.filtroSerieComprobante = '';
        this.filtroNumeroComprobante = '';
        this.filtroClienteComprobante = '';
        this.filtroSearchComprobante = '';
        this.cargarReporteComprobantes();
    }

    verPdfComprobante(item: any, formato: 'ticket' | 'a4' = 'ticket') {
        this.comprobanteArchivosActual = item.archivos || null;
        this.comprobanteFormato = formato;
        const targetUrl = formato === 'ticket'
            ? (item.archivos?.pdf_ticket || item.archivos?.pdf)
            : (item.archivos?.pdf_a4 || item.archivos?.pdf);

        if (!targetUrl) {
            this.messageService.add({ severity: 'warn', summary: 'Aviso', detail: 'El archivo PDF no está disponible para este comprobante', life: 3000 });
            return;
        }

        this.http.get(targetUrl, { responseType: 'blob' }).subscribe({
            next: (blob) => {
                const blobUrl = URL.createObjectURL(blob);
                this.comprobantePdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(blobUrl);
                this.comprobantePdfDialog = true;
            },
            error: () => {
                window.open(targetUrl, '_blank');
            }
        });
    }

    cambiarFormatoPdfComprobante(formato: 'ticket' | 'a4') {
        this.comprobanteFormato = formato;
        const targetUrl = formato === 'ticket'
            ? (this.comprobanteArchivosActual?.pdf_ticket || this.comprobanteArchivosActual?.pdf)
            : (this.comprobanteArchivosActual?.pdf_a4 || this.comprobanteArchivosActual?.pdf);

        if (targetUrl) {
            this.http.get(targetUrl, { responseType: 'blob' }).subscribe({
                next: (blob) => {
                    const blobUrl = URL.createObjectURL(blob);
                    this.comprobantePdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(blobUrl);
                }
            });
        }
    }

    anularComprobanteReporte(item: any) {
        if (!confirm(`¿Está seguro de anular el comprobante ${item.numero_comprobante} de ${item.cliente_razon_social} mediante una Nota de Crédito en SUNAT?`)) {
            return;
        }

        this.anulandoId = item.id;
        this.http.post<any>('http://127.0.0.1:8000/api/comprobantes/nota-credito', {
            venta_id: item.id,
            motivo: 'ANULACION DE LA OPERACION'
        }).subscribe({
            next: (res) => {
                this.anulandoId = null;
                this.messageService.add({
                    severity: 'success',
                    summary: 'Nota de Crédito Emitida',
                    detail: res.message || 'El comprobante fue anulado con éxito en SUNAT.',
                    life: 5000
                });
                this.cargarReporteComprobantes();
            },
            error: (err) => {
                this.anulandoId = null;
                const msg = err?.error?.message || 'No se pudo emitir la Nota de Crédito.';
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error al anular',
                    detail: msg,
                    life: 6000
                });
            }
        });
    }
}
