import { CommonModule } from '@angular/common';
import { Component, ViewChild } from '@angular/core';
import { ImportsModule } from '../../imports';
import { FormsModule } from '@angular/forms';
import { PedidoService } from '../../service/pedido.service';
import { Table } from 'primeng/table';
import { ES_LOCALE } from '../../../model/util/calendar';
import { TabsModule } from 'primeng/tabs';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import jsPDF from 'jspdf';
import { AperturaService } from '../../service/apertura.service'; // <-- Add this import
import { ConfirmationService, MessageService } from 'primeng/api';

@Component({
    selector: 'app-reportes',
    imports: [CommonModule, ImportsModule, FormsModule], // <-- Add this
    providers: [MessageService, ConfirmationService],
    templateUrl: './reportes.component.html',
    styleUrl: './reportes.component.scss'
})
export class ReportesComponent {
    selectedRange: Date[] = [];
    selectedRange2: Date | null = null; // Initialize selectedRange2 as null
    expandedRows = {};
    esLocale = ES_LOCALE;
    selectedDates: Date[] = [];
    @ViewChild('dt') dt!: Table; // Use the Table type from PrimeNGç
    Clients: any[] = []; // Initialize Clients as an empty array
    PedidoDetalle: any[] = []; // Initialize PedidoDetalle as an empty array
    PedidoReporte: any[] = []; // Initialize PedidoReporte as an empty array
    array_data = [] as any;
    array_data_total: any = {};
    PDF_Dialog: boolean = false;
    pdfUrl: SafeResourceUrl | null = null;
    fecha_actual: any;
    constructor(private PedidoService: PedidoService, private sanitizer: DomSanitizer, private AperturaService_: AperturaService, private messageService: MessageService) {}

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
        if (this.selectedRange.length === 2) {
            if (this.selectedRange[1] != null) {
                this.showRerportemount({
                    fechainicio: this.formatDateToMySQL(new Date(this.selectedRange[0])),
                    fechafin: this.formatDateToMySQL(new Date(this.selectedRange[1]))
                });
            }
        } else {
            console.log('No se ha completado el rango de fechas');
        }
    }

    DayCalendarBlur() {
        if (this.selectedRange2) {
            this.showReporteDay(this.formatDateToMySQL(new Date(this.selectedRange2)));
        } else {
            console.log('No se ha completado el rango de fechas');
        }
    }

    PdfReporteDiario(fecha: string) {
        this.PedidoService.ValidarCierre(fecha).subscribe((responsevalidar) => {
            if (!responsevalidar.data) {
                this.messageService.add({
                    severity: 'info',
                    summary: 'Cerrar Caja',
                    detail: 'No se puede generar el reporte, la caja no ha sido cerrada para esta fecha',
                    life: 3000
                });

                return;
            }

            this.PedidoService.ReporteDiario(fecha).subscribe((response) => {
                this.AperturaService_.ListGastos(fecha).subscribe((responsegastos) => {
                    var data = response.data[0];
                    var inicial = 140;
                    var total = parseInt(data.yape) + parseInt(data.visa) + parseInt(data.efectivo) + parseInt(data.plin);

                    const doc = new jsPDF({
                        orientation: 'portrait',
                        unit: 'mm',
                        format: [80, inicial] // Ticket en tamaño pequeño
                    });

                    let yPosition = 12;
                    const lineHeight = 8;

                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(10);
                    const date = new Date(fecha);
                    date.setMinutes(date.getMinutes() + date.getTimezoneOffset());

                    this.fecha_actual = date.toISOString().split('T')[0];

                    var totalgastos = 0;
                    var gastosarray = [];
                    if (responsegastos.data) {
                        gastosarray = responsegastos.data;
                        totalgastos = responsegastos.data.reduce((sum: number, item: { monto: number }) => sum + +item.monto, 0);
                    }

                    const opciones: Intl.DateTimeFormatOptions = {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric'
                    };

                    var dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
                    var numeroDia = date.getDay() + 1;
                    var nombreDia = dias[numeroDia];

                    // Convertir la fecha a texto en español
                    const fechaFormateada = date.toLocaleDateString('es-PE', opciones);

                    // Reemplazar "de junio de 2025" por "de junio del 2025"
                    this.fecha_actual = fechaFormateada.replace(' de ', ' de ').replace(' de ', ' del ');
                    var marginLeft = 9;
                    // Estilo para el título
                    doc.setFontSize(18);
                    doc.setFont('helvetica', 'bold');
                    doc.text('Caja Resumen', marginLeft, yPosition);
                    yPosition += 10;

                    // Estilo para la fecha
                    doc.setFontSize(12);
                    doc.setFont('helvetica', 'normal');
                    doc.text(this.fecha_actual, marginLeft, yPosition);
                    yPosition += 10;

                    // Estilo para los métodos de pago
                    doc.setFont('helvetica', 'bold');
                    doc.text(`Yape: ${data.yape}`, marginLeft, yPosition);
                    yPosition += 7;

                    doc.text(`Plin: S/${data.plin}`, marginLeft, yPosition);
                    yPosition += 7;

                    doc.text(`Visa: S/${data.visa}`, marginLeft, yPosition);
                    yPosition += 7;

                    doc.text(`Efectivo: S/${data.efectivo}`, marginLeft, yPosition);
                    yPosition += 7;

                    // Línea divisoria
                    doc.setDrawColor(0);
                    doc.setLineWidth(0.5);
                    doc.line(marginLeft, yPosition, 200 - marginLeft, yPosition);
                    yPosition += 7;

                    // Total
                    doc.setFontSize(14);
                    doc.text(`Total: S/ ${total}`, marginLeft, yPosition);
                    yPosition += 7;
                    doc.text(`Efectivo en Caja: S/${total - Math.round(totalgastos * 100) / 100}`, marginLeft, yPosition);
                    yPosition += 7;
                    doc.text(`Total Gastos: S/${Math.round(totalgastos * 100) / 100}`, marginLeft, yPosition);
                    yPosition += 7;

                    doc.text(`-------- Detalles Gastos ---------`, marginLeft, yPosition);

                    yPosition += 7;
                    doc.setFontSize(11);
                    doc.setFont('helvetica', 'normal');
                    if (gastosarray.length != 0) {
                        gastosarray.forEach((element: any) => {
                            doc.text('* ' + element.descripcion.toLowerCase(), 12, yPosition);
                            doc.text('S/' + element.monto.toString(), 52, yPosition, { align: 'right' });
                            yPosition += 6;
                        });
                    }
                    yPosition += 4;
                    // Cuando la imagen se cargue, agregarla al PDF
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
            (response: { success: any; data: any[] }) => {
                debugger;
                if (response.success) {
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
                        var dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
                        var numeroDia = new Date(element.fecha).getDay() + 1;
                        var nombreDia = dias[numeroDia];
                        var total = parseInt(element.yape) + parseInt(element.visa) + parseInt(element.efectivo) + parseInt(element.plin);
                        TOTAL_TOTAL += total;
                        if (element.fecha != undefined) {
                            element.fecha = new Date(element.fecha).toISOString().split('T')[0]; // Formato YYYY-MM-DD
                            // element.fecha = this.formatDateToMySQL(element.fecha);
                        } else {
                            element.fecha = '';
                        }
                        this.array_data.push({
                            fecha: element.fecha,
                            dia: nombreDia,
                            yape: element.yape,
                            visa: element.visa,
                            efectivo: element.efectivo,
                            plin: element.plin,
                            total: total
                        });
                    });
                    debugger;
                    this.Clients = this.array_data;
                    this.array_data_total = {
                        efectivo: this.totalEfectivo,
                        plin: this.totalPlin,
                        visa: this.totalVisa,
                        total: this.totalGeneral,
                        yape: this.totalyape
                    };
                } else {
                    alert('Error al intentar consultar');
                }
            },
            (error: any) => {
                console.error('Error al intentar consultar', error);
                alert('Hubo un problema al conectar con el servidor');
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
                            element.fecha = new Date(element.fecha).toISOString().split('T')[0]; // Formato YYYY-MM-DD
                            var dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
                            var numeroDia = new Date(element.fecha).getDay() + 1;
                            var nombreDia = dias[numeroDia];
                            element.dia = nombreDia;
                        }
                    });
                    this.PedidoReporte = response.data;

                    debugger;
                    await this.PedidoService.ReporteProductoDetalle(parameters).subscribe((response2: { success: any; data: any[] }) => {
                        debugger;
                        if (response2.success) {
                            // this.PedidoDetalle =
                            debugger;
                            var pedidodetalle: any = {};
                            // response2.data.forEach((element: any) => {
                            //     pedidodetalle = { ...element.pedidodetalle };
                            // });
                            // this.PedidoDetalle = pedidodetalle;
                            debugger;
                            this.PedidoReporte = this.PedidoReporte.map((pedido: any) => {
                                const detalle = response2.data.filter((d: any) => d.idpedido === pedido.idpedido);
                                return {
                                    ...pedido,
                                    pedidodetalle: detalle.length > 0 ? detalle[0].pedidodetalle : []
                                };
                            });
                        } else {
                            alert('Error al intentar consultar los detalles del producto');
                        }
                    });
                } else {
                    alert('Error al intentar consultar');
                }
            },
            (error: any) => {
                console.error('Error al intentar consultar', error);
                alert('Hubo un problema al conectar con el servidor');
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
        date.setMinutes(date.getMinutes() + date.getTimezoneOffset());
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
        const day = String(date.getDate()).padStart(2, '0');

        return `${year}-${month}-${day}`; // Return the date in YYYY-MM-DD format
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

    get totalGeneral(): number {
        return this.totalEfectivo + this.totalPlin + this.totalVisa + this.totalyape;
    }

    private get datosVisibles(): any[] {
        return this.Clients;
    }
}
