import { Component, OnInit } from '@angular/core';
import { CajaService } from '../../service/caja.service';
import { PedidoService } from '../../service/pedido.service';
import { AperturaService } from '../../service/apertura.service';
import { Caja } from '../../../model/caja';
import { ImportsModule } from '../../imports';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-caja',
  templateUrl: './caja.component.html',
  styleUrls: ['./caja.component.scss'],
  imports: [ImportsModule]
})
export class CajaComponent implements OnInit {
  cajas: Caja[] = [];
  cajasFiltradas: Caja[] = [];
  form: Caja = this.resetForm();
  displayDialog: boolean = false;
  editingId: number | null = null;
  fechaInicio: string = '';
  fechaFin: string = '';
  isGeneratingPDF: boolean = false;

  // Store gastosApp values for each date
  gastosAppValues: { [fecha: string]: number } = {};

  constructor(
    private cajaService: CajaService,
    private pedidoService: PedidoService,
    private aperturaService: AperturaService
  ) { }

  ngOnInit(): void {
    // Don't load data initially - wait for user to enter date range
    // this.loadData(); // Removed initial load
  }

  // Load data for specific date range
  loadData(startDate: string, endDate: string) {
    this.cajaService.getByDateRange(startDate, endDate).then((res) => {
      this.cajas = res.data || [];
      this.cajasFiltradas = [...this.cajas];
      // Load gastosApp values for the filtered dates
      this.loadGastosAppValuesForFilteredDates();
    });
  }

  // Load gastosApp values for filtered dates only
  async loadGastosAppValuesForFilteredDates() {
    // Clear existing values
    this.gastosAppValues = {};

    // Load gastosApp for each date in the filtered data
    for (const caja of this.cajasFiltradas) {
      this.gastosAppValues[caja.fecha] = await this.getGastosAppForDate(caja.fecha);
    }
  }

  // Remove the old method since we don't need to load all dates anymore
  // loadAllGastosAppValues() method is no longer needed

  resetForm(): Caja {
    return {
      semana: 0,
      trabajo: '',
      fecha: '',
      dia: 0,
      yape: 0,
      efectivo: 0,
      tarjeta: 0,
      gastos: 0,
      notas: ''
    };
  }

  // Calculate week number based on date
  getWeekNumber(date: Date): number {
    const onejan = new Date(date.getFullYear(), 0, 1);
    return Math.ceil((((date.getTime() - onejan.getTime()) / 86400000) + onejan.getDay() + 1) / 7);
  }

  // Get day name based on day number (0-6)
  getDayName(day: number): string {
    const days = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    return days[day] || '';
  }

  // Handle date change to automatically set day and week
  onDateChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const value = target.value;
    if (value) {
      const date = new Date(value);
      // Set day of week (0-6, Sunday=0)
      this.form.dia = date.getDay() + 1;
      // Set week number
      this.form.semana = this.getWeekNumber(date);
    }
  }

  // Filter data by date range
  filtrarPorRangoFechas() {
    if (!this.fechaInicio || !this.fechaFin) {
      return;
    }

    // Load data for the specified date range
    this.loadData(this.fechaInicio, this.fechaFin);
  }

  // Clear date filters
  limpiarFiltros() {
    this.fechaInicio = '';
    this.fechaFin = '';
    this.cajasFiltradas = [...this.cajas];
  }

  // Generate weekly financial report in PDF format
  async generateWeeklyReportPDF() {
    this.isGeneratingPDF = true;

    try {
      // Create new PDF document
      const doc = new jsPDF() as any;

      // Set document properties
      doc.setFontSize(18);
      doc.text('REPORTE SEMANAL DE CAJA', 105, 20, { align: 'center' });

      // Add subtitle with date range
      doc.setFontSize(12);
      let subtitle = 'Turno: Mañana';
      if (this.fechaInicio && this.fechaFin) {
        subtitle += ` — Período: ${this.fechaInicio} a ${this.fechaFin}`;
      }
      doc.text(subtitle, 105, 30, { align: 'center' });

      // Add week info
      doc.setFontSize(10);
      doc.text('Semana 48', 105, 37, { align: 'center' });

      // Add margin
      doc.setLineWidth(0.5);
      doc.line(20, 45, 190, 45);

      // INGRESOS TABLE
      doc.setFontSize(14);
      doc.text('INGRESOS', 20, 55);

      doc.setFontSize(10);
      const ingresosHeaders = ['Fecha', 'Día', 'Yape', 'Efectivo', 'Tarjeta', 'Total'];
      const ingresosData = this.cajasFiltradas.map(caja => [
        caja.fecha,
        this.getDayName(caja.dia),
        caja.yape.toFixed(2),
        caja.efectivo.toFixed(2),
        caja.tarjeta.toFixed(2),
        (caja.yape + caja.efectivo + caja.tarjeta).toFixed(2)
      ]);

      autoTable(doc, {
        head: [ingresosHeaders],
        body: ingresosData,
        startY: 60,
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [22, 160, 133] },
        margin: { left: 20, right: 20 }
      });

      // Calculate total ingresos
      const totalIngresos = this.getTotalGeneral();

      // Add total ingresos
      let finalY = 60 + (ingresosData.length + 1) * 10; // Approximate position after table

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`Total Ingresos: S/. ${totalIngresos.toFixed(2)}`, 150, finalY);

      // GASTOS TABLE
      doc.setFont(undefined, 'normal');
      doc.setFontSize(14);
      doc.text('GASTOS', 20, finalY + 20);

      // Fetch actual gastos data
      const gastosData = await this.fetchAllGastosForPeriod();

      doc.setFontSize(10);
      const gastosHeaders = ['Fecha', 'Tipo', 'Motivo', 'Monto'];

      autoTable(doc, {
        head: [gastosHeaders],
        body: gastosData,
        startY: finalY + 25,
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [22, 160, 133] },
        margin: { left: 20, right: 20 }
      });

      // Calculate total gastos
      const totalGastos = gastosData.reduce((sum, item) => sum + parseFloat(item[3]), 0);

      // Add total gastos
      const gastosTableHeight = (gastosData.length + 1);
      let finalYGastos = gastosTableHeight + 20;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`Total Gastos: S/. ${totalGastos.toFixed(2)}`, 150, finalYGastos);

      // CALCULATIONS SECTION (Original)
      const gananciaBruta = totalIngresos - totalGastos;
      const gananciaNeta = gananciaBruta * 0.85; // Example calculation
      const porcentajeGanancia = totalIngresos > 0 ? (gananciaBruta / totalIngresos) * 100 : 0;
      const foodCost = totalIngresos > 0 ? (totalGastos / totalIngresos) * 100 : 0;

      // Add calculations section
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text('RESUMEN FINANCIERO', 20, finalYGastos + 20);

      // Add a line under the header
      doc.setDrawColor(200, 200, 200);
      doc.line(20, finalYGastos + 22, 190, finalYGastos + 22);

      doc.setFontSize(10);
      doc.text(`Ganancia Bruta: S/. ${gananciaBruta.toFixed(2)}`, 20, finalYGastos + 35);
      doc.text(`Ganancia Neta: S/. ${gananciaNeta.toFixed(2)}`, 20, finalYGastos + 42);
      doc.text(`Porcentaje de Ganancia: ${porcentajeGanancia.toFixed(2)}%`, 20, finalYGastos + 49);
      doc.text(`Food Cost: ${foodCost.toFixed(2)}%`, 20, finalYGastos + 56);

      // Add expense types breakdown with improved design
      const expenseDetailsStartY = finalYGastos + 70;

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('DETALLE DE GASTOS POR TIPO:', 20, expenseDetailsStartY);

      // Add a line under the header
      doc.setDrawColor(200, 200, 200);
      doc.line(20, expenseDetailsStartY + 2, 190, expenseDetailsStartY + 2);

      // Calculate totals by expense type
      const gastosByType: { [key: string]: number } = {};
      gastosData.forEach(item => {
        const tipo = item[1]; // Tipo column
        const monto = parseFloat(item[3]); // Monto column
        gastosByType[tipo] = (gastosByType[tipo] || 0) + monto;
      });

      // Display expense types and their totals with improved formatting
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      let yPos = expenseDetailsStartY + 12;

      // Draw table header for expense details
      doc.setFillColor(245, 245, 245);
      doc.rect(20, yPos, 170, 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.text('TIPO DE GASTO', 25, yPos + 6);
      doc.text('TOTAL', 160, yPos + 6);

      yPos += 10;

      // Draw expense details
      Object.keys(gastosByType).forEach(tipo => {
        const total = gastosByType[tipo];

        // Alternate row colors for better readability
        if ((yPos / 10) % 2 === 0) {
          doc.setFillColor(250, 250, 250);
          doc.rect(20, yPos - 2, 170, 8, 'F');
        }

        doc.setFont('helvetica', 'normal');
        doc.text(tipo, 25, yPos + 6);
        doc.text(`S/. ${total.toFixed(2)}`, 160, yPos + 6);
        yPos += 8;
      });

      // Add total expenses with emphasis
      yPos += 5;
      doc.setFont('helvetica', 'bold');
      doc.setLineWidth(0.5);
      doc.line(20, yPos, 190, yPos); // Top line
      doc.line(20, yPos + 10, 190, yPos + 10); // Bottom line
      doc.text(`TOTAL GASTOS: S/. ${totalGastos.toFixed(2)}`, 25, yPos + 7);

      // NEW RESUMEN SEMANAL SECTION
      const ventasTotales = totalIngresos;
      const gastosTotales = totalGastos;
      const gananciaNetaReal = gananciaBruta;

      // Calculate new position after expense details
      let resumenSemanalPosition = yPos + 25;

      // Add RESUMEN SEMANAL section with better spacing and design
      // Check if we have enough space on the current page, if not, add a new page
      const pageHeight = doc.internal.pageSize.height;
      const requiredSpace = 60; // Approximate space needed for this section

      if (resumenSemanalPosition + requiredSpace > pageHeight - 20) {
        doc.addPage();
        resumenSemanalPosition = 20; // Reset position for new page
      }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0);
      doc.text('RESUMEN SEMANAL', 20, resumenSemanalPosition);

      // Add a line under the header
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(1);
      doc.line(20, resumenSemanalPosition + 2, 190, resumenSemanalPosition + 2);

      // Add summary items with proper spacing and formatting
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`Ventas totales: S/. ${ventasTotales.toFixed(2)}`, 25, resumenSemanalPosition + 20);
      doc.text(`Gastos totales: S/. ${gastosTotales.toFixed(2)}`, 25, resumenSemanalPosition + 32);
      doc.text(`Ganancia neta: S/. ${gananciaNetaReal.toFixed(2)}`, 25, resumenSemanalPosition + 44);

      // Save the PDF
      doc.save('reporte_semanal_caja.pdf');
    } catch (error) {
      console.error('Error generating PDF report:', error);
      alert('Error al generar el reporte PDF. Por favor, inténtelo de nuevo.');
    } finally {
      this.isGeneratingPDF = false;
    }
  }

  // Fetch all gastos for the current period
  async fetchAllGastosForPeriod(): Promise<any[]> {
    const gastosData: any[] = [];

    // Get unique dates from filtered data
    const uniqueDates = [...new Set(this.cajasFiltradas.map(caja => caja.fecha))];

    // Fetch gastos for each date
    for (const fecha of uniqueDates) {
      // Fetch regular gastos (app is null)
      try {
        const gastosResponse = await new Promise<any>((resolve, reject) => {
          this.aperturaService.ListGastos(fecha).subscribe({
            next: (response) => resolve(response),
            error: (error) => reject(error)
          });
        });

        if (gastosResponse.success && gastosResponse.data) {
          gastosResponse.data.forEach((gasto: any) => {
            if (gasto.app === null) {
              gastosData.push([
                gasto.fecha,
                gasto.categoriagastos?.descripcion || 'Sin categoría',
                gasto.descripcion || gasto.notas || '',
                parseFloat(gasto.monto).toFixed(2)
              ]);
            }
          });
        }
      } catch (error) {
        console.error('Error fetching gastos for date:', fecha, error);
      }

      // Fetch gastosApp (app = '1')
      try {
        const gastosAppResponse = await new Promise<any>((resolve, reject) => {
          this.aperturaService.ListGastosApp(fecha).subscribe({
            next: (response) => resolve(response),
            error: (error) => reject(error)
          });
        });

        if (gastosAppResponse.success && gastosAppResponse.data) {
          gastosAppResponse.data.forEach((gasto: any) => {
            if (gasto.app === '1') {
              gastosData.push([
                gasto.fecha,
                gasto.categoriagastos?.descripcion || 'Sin categoría',
                gasto.descripcion || gasto.notas || '',
                parseFloat(gasto.monto).toFixed(2)
              ]);
            }
          });
        }
      } catch (error) {
        console.error('Error fetching gastosApp for date:', fecha, error);
      }
    }

    return gastosData;
  }

  // Autocomplete financial data from reports based on date
  async autocompleteFromReport() {
    if (!this.form.fecha) {
      return;
    }

    try {
      // Fetch report data for the selected date
      this.pedidoService.ShowPedidosFecha(this.form.fecha).subscribe(
        (response: { success: boolean; data: any[] }) => {
          if (response.success && response.data.length > 0) {
            // Calculate totals from all orders on that date
            let totalYape = 0;
            let totalEfectivo = 0;
            let totalVisa = 0; // Using visa as tarjeta

            response.data.forEach((order: any) => {
              totalYape += parseFloat(order.yape) || 0;
              totalEfectivo += parseFloat(order.efectivo) || 0;
              totalVisa += parseFloat(order.visa) || 0;
            });

            // Update form values
            this.form.yape = totalYape;
            this.form.efectivo = totalEfectivo;
            this.form.tarjeta = totalVisa;
          }
        },
        (error: any) => {
          console.error('Error fetching report data:', error);
        }
      );

      // Fetch gastos data for the selected date (where app is null)
      this.aperturaService.ListGastos(this.form.fecha).subscribe(
        (response: { success: boolean; data: any[] }) => {
          if (response.success && response.data) {
            // Calculate total gastos from all expenses on that date where app is null
            let totalGastos = 0;
            response.data.forEach((gasto: any) => {
              if (gasto.app === null) {
                totalGastos += parseFloat(gasto.monto) || 0;
              }
            });

            // Update form gastos value
            this.form.gastos = totalGastos;
          }
        },
        (error: any) => {
          console.error('Error fetching gastos data:', error);
        }
      );

      // Fetch gastosApp data for the selected date (where app = '1')
      this.fetchGastosAppData(this.form.fecha);
    } catch (error) {
      console.error('Error autocompleting from report:', error);
    }
  }

  // Fetch gastosApp data where app = '1' for the selected date
  async fetchGastosAppData(fecha: string) {
    try {
      this.aperturaService.ListGastosApp(fecha).subscribe(
        (response: { success: boolean; data: any[] }) => {
          if (response.success && response.data) {
            // Calculate total gastosApp from all expenses on that date where app = '1'
            let totalGastosApp = 0;
            response.data.forEach((gasto: any) => {
              if (gasto.app === '1') {
                totalGastosApp += parseFloat(gasto.monto) || 0;
              }
            });

            // Update form gastosApp value
            // this.form.gastosApp = totalGastosApp;
          }
        },
        (error: any) => {
          console.error('Error fetching gastosApp data:', error);
        }
      );
    } catch (error) {
      console.error('Error fetching gastosApp data:', error);
    }
  }

  save() {
    if (this.editingId) {
      this.cajaService.update(this.editingId, this.form).then(() => {
        // Reload data for current date range if set
        if (this.fechaInicio && this.fechaFin) {
          this.loadData(this.fechaInicio, this.fechaFin);
        }
        this.editingId = null;
        this.form = this.resetForm();
        this.displayDialog = false;
      });
    } else {
      this.cajaService.create(this.form).then(() => {
        // Reload data for current date range if set
        if (this.fechaInicio && this.fechaFin) {
          this.loadData(this.fechaInicio, this.fechaFin);
        }
        this.form = this.resetForm();
        this.displayDialog = false;
      });
    }
  }

  edit(item: Caja) {
    this.editingId = item.id!;
    this.form = { ...item };
    this.displayDialog = true;
  }

  delete(id: number) {
    if (confirm('¿Eliminar registro?')) {
      this.cajaService.delete(id).then(() => {
        // Reload data for current date range if set
        if (this.fechaInicio && this.fechaFin) {
          this.loadData(this.fechaInicio, this.fechaFin);
        }
      });
    }
  }

  openNew() {
    this.form = this.resetForm();
    this.editingId = null;
    this.displayDialog = true;
    this.form.trabajo = "mañana";
    this.form.fecha = new Date().toISOString().slice(0, 10);
  }

  hideDialog() {
    this.displayDialog = false;
    this.editingId = null;
    this.form = this.resetForm();
  }

  // Calculate gastosApp for a specific date
  async getGastosAppForDate(fecha: string): Promise<number> {
    return new Promise((resolve) => {
      this.aperturaService.ListGastosApp(fecha).subscribe(
        (response: { success: boolean; data: any[] }) => {
          if (response.success && response.data) {
            // Calculate total gastosApp from all expenses on that date where app = '1'
            let totalGastosApp = 0;
            response.data.forEach((gasto: any) => {
              if (gasto.app === '1') {
                totalGastosApp += parseFloat(gasto.monto) || 0;
              }
            });
            resolve(totalGastosApp);
          } else {
            resolve(0);
          }
        },
        (error: any) => {
          console.error('Error fetching gastosApp data:', error);
          resolve(0);
        }
      );
    });
  }

  // Calculate total gastos from filtered data
  getTotalGastos(): number {
    return this.cajasFiltradas.reduce((sum, caja) => sum + (caja.gastos || 0), 0);
  }

  // Calculate total yape from filtered data
  getTotalYape(): number {
    return this.cajasFiltradas.reduce((sum, caja) => sum + (caja.yape || 0), 0);
  }

  // Calculate total efectivo from filtered data
  getTotalEfectivo(): number {
    return this.cajasFiltradas.reduce((sum, caja) => sum + (caja.efectivo || 0), 0);
  }

  // Calculate total tarjeta from filtered data
  getTotalTarjeta(): number {
    return this.cajasFiltradas.reduce((sum, caja) => sum + (caja.tarjeta || 0), 0);
  }

  // Calculate total general from filtered data (sum of yape, efectivo, and tarjeta)
  getTotalGeneral(): number {
    return this.cajasFiltradas.reduce((sum, caja) =>
      sum + (caja.yape || 0) + (caja.efectivo || 0) + (caja.tarjeta || 0), 0);
  }

  // Calculate total gastosApp from filtered data
  getTotalGastosApp(): number {
    return this.cajasFiltradas.reduce((sum, caja) => sum + (this.gastosAppValues[caja.fecha] || 0), 0);
  }
}
