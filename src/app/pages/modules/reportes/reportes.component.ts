import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild } from '@angular/core';
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
    PDF_Dialog: boolean = false;
    pdfUrl: SafeResourceUrl | null = null;
    fecha_actual: any;

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
        private primeng: PrimeNG
    ) {
        // Establecer idioma español para PrimeNG
        this.primeng.setTranslation(ES_LOCALE);

        // Validate session - will redirect to login if invalid
        if (!validateSession(this.router)) {
            return;
        }

        const idperfil = JSON.parse(localStorage.getItem('currentUser') || '{}').idperfil || 0;

        if (idperfil != 1) {
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);

            this.minDate = yesterday;
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
                        this.Clients = [];
                        this.messageService.add({
                            severity: 'warn',
                            summary: 'Falta cerrar la caja',
                            detail: 'No se puede visualizar el Reporte Consolidado de Ventas porque la caja aún no ha sido cerrada.',
                            life: 5000
                        });
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
        this.array_data_total = {}; // Reiniciar el total

        this.PedidoService.showRerporte(parameters).subscribe(
            (response: any) => {
                if (response && response.cajaNoCerrada) {
                    this.Clients = [];
                    this.mostrarAvisoAmigable(
                        'Aún falta cerrar la caja',
                        response.message || 'No es posible consultar el Reporte Consolidado de Ventas porque la caja para la fecha seleccionada aún no ha sido cerrada. Debe realizar el cierre de caja para poder visualizar la información.',
                        'warning'
                    );
                    return;
                }
                if (response && response.success) {
                    var yape_total = 0;
                    var plin_total = 0;
                    var visa_total = 0;
                    var efectivo_total = 0;
                    var yape_total = 0;
                    var TOTAL_TOTAL = 0;
                    this.array_data = [] as any;
                    response.data.forEach((element: any) => {
                        yape_total += parseInt(element.yape);
                        plin_total += parseInt(element.plin);
                        visa_total += parseInt(element.visa);
                        efectivo_total += parseInt(element.efectivo);
                        var total = parseInt(element.yape) + parseInt(element.visa) + parseInt(element.efectivo) + parseInt(element.plin);
                        TOTAL_TOTAL += total;

                        let nombreDia = '';
                        if (element.fecha != undefined) {
                            const d = new Date(element.fecha);
                            if (!isNaN(d.getTime())) {
                                const yyyy = d.getFullYear();
                                const mm = String(d.getMonth() + 1).padStart(2, '0');
                                const dd = String(d.getDate()).padStart(2, '0');
                                element.fecha = `${yyyy}-${mm}-${dd}`;

                                const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
                                nombreDia = dias[d.getDay()];
                            }
                        } else {
                            element.fecha = '';
                        }

                        this.array_data.push({
                            fecha: element.fecha,
                            dia: nombreDia,
                            yape: element.yape || 0,
                            visa: element.visa || 0,
                            efectivo: element.efectivo || 0,
                            plin: element.plin || 0,
                            gastos: element.gastos || 0,
                            total: total
                        });
                    });
                    // Ordenar por fecha ASC
                    this.array_data.sort((a: any, b: any) => (a.fecha || '').localeCompare(b.fecha || ''));
                    this.Clients = this.array_data;
                    this.array_data_total = {
                        efectivo: this.totalEfectivo,
                        plin: this.totalPlin,
                        visa: this.totalVisa,
                        gastos: this.totalGastos,
                        total: this.totalGeneral,
                        yape: this.totalyape
                    };
                } else {
                    this.Clients = [];
                    this.mostrarAvisoAmigable(
                        'Falta cerrar la caja',
                        response?.message || 'No es posible visualizar las ventas de este rango porque la caja aún no ha sido cerrada. Debe realizar el cierre de caja para consultar este reporte.',
                        'warning'
                    );
                }
            },
            (error: any) => {
                console.error('Error al intentar consultar', error);
                this.mostrarAvisoAmigable(
                    'Error de conexión',
                    'Hubo un problema al conectar con el servidor para consultar las ventas. Por favor, revise su conexión a internet.',
                    'error'
                );
            }
        );
    }

    showReporteDay(parameters: string) {
        this.PedidoReporte = [];
        this.PedidoService.ShowPedidosFecha(parameters).subscribe(
            async (response: { success: any; data: any[] }) => {
                if (response.success) {
                    this.array_data = [] as any;
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
}
