import { Component, OnInit } from '@angular/core';
import { MessageService } from 'primeng/api';
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
  imports: [ImportsModule],
  providers: [MessageService]
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
  gastosAppDetalles: any[] = [];

  constructor(
    private cajaService: CajaService,
    private pedidoService: PedidoService,
    private aperturaService: AperturaService,
    private messageService: MessageService
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
      plin: 0,
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
      const doc = new jsPDF() as any;
      const PW = doc.internal.pageSize.width;
      const PH = doc.internal.pageSize.height;
      const M = 14;
      const CW = PW - M * 2;

      const sectionHeader = (title: string, y: number) => {
        doc.setFillColor(30, 41, 59);
        doc.rect(M, y, CW, 7, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.text(title, M + 3, y + 5);
        doc.setTextColor(0, 0, 0);
        return y + 9;
      };

      const checkPage = (y: number, needed = 50) => {
        if (y + needed > PH - 15) { doc.addPage(); return 15; }
        return y;
      };

      // HEADER
      doc.setFillColor(30, 41, 59);
      doc.rect(0, 0, PW, 36, 'F');
      doc.setTextColor(245, 158, 11);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('REPORTE SEMANAL DE CAJA', PW / 2, 13, { align: 'center' });
      doc.setTextColor(200, 210, 220);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      const periodo = this.fechaInicio && this.fechaFin
        ? `Periodo: ${this.fechaInicio} al ${this.fechaFin}` : 'Sin filtro de fecha';
      doc.text(`Restaurante Cevicheria  |  ${periodo}  |  ${new Date().toLocaleDateString('es-PE')}`, PW / 2, 22, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      let y = 42;

      // TABLA INGRESOS
      y = sectionHeader('1.  DETALLE DE INGRESOS', y);
      const ingresosData = this.cajasFiltradas.map(c => [
        c.fecha, this.getDayName(c.dia),
        `S/. ${(c.plin || 0).toFixed(2)}`,
        `S/. ${(c.yape || 0).toFixed(2)}`,
        `S/. ${(c.efectivo || 0).toFixed(2)}`,
        `S/. ${(c.tarjeta || 0).toFixed(2)}`,
        `S/. ${((c.plin||0)+(c.yape||0)+(c.efectivo||0)+(c.tarjeta||0)).toFixed(2)}`
      ]);
      autoTable(doc, {
        head: [['Fecha','Dia','Plin','Yape','Efectivo','Tarjeta','Total']],
        body: ingresosData, startY: y, theme: 'grid',
        styles: { fontSize: 7.5, cellPadding: 2 },
        headStyles: { fillColor: [51,65,85], textColor: 255, fontSize: 7 },
        columnStyles: { 6: { fontStyle: 'bold', textColor: [133,83,0] } },
        alternateRowStyles: { fillColor: [248,250,251] },
        margin: { left: M, right: M }
      });
      y = doc.lastAutoTable.finalY + 6;

      // TABLA GASTOS
      const gastosData = await this.fetchAllGastosForPeriod();
      y = checkPage(y, 50);
      y = sectionHeader('2.  DETALLE DE GASTOS', y);
      autoTable(doc, {
        head: [['Fecha','Categoria','Descripcion','Monto']],
        body: gastosData.map((g: any[]) => [g[0],g[1],g[2],`S/. ${parseFloat(g[3]).toFixed(2)}`]),
        startY: y, theme: 'grid',
        styles: { fontSize: 7.5, cellPadding: 2 },
        headStyles: { fillColor: [51,65,85], textColor: 255, fontSize: 7 },
        columnStyles: { 3: { halign: 'right', fontStyle: 'bold' } },
        alternateRowStyles: { fillColor: [248,250,251] },
        margin: { left: M, right: M }
      });
      y = doc.lastAutoTable.finalY + 8;

      // CALCULOS
      const totalIngresos = this.getTotalPlin() + this.getTotalYape() + this.getTotalEfectivo() + this.getTotalTarjeta();
      const totalGastos = gastosData.reduce((s: number, i: any[]) => s + parseFloat(i[3]), 0);
      const gananciaNeta = totalIngresos - totalGastos;
      const margen = totalIngresos > 0 ? (gananciaNeta / totalIngresos) * 100 : 0;
      const foodCost = totalIngresos > 0 ? (totalGastos / totalIngresos) * 100 : 0;

      // SECCION 3: RESUMEN FINANCIERO
      y = checkPage(y, 70);
      y = sectionHeader('3.  RESUMEN FINANCIERO GENERAL', y);

      const bw = (CW - 4) / 3; const bh = 18;
      const kpis = [
        { label:'VENTAS TOTALES', value:`S/. ${totalIngresos.toFixed(2)}`, bg:[209,250,229] as [number,number,number], fg:[6,95,70] as [number,number,number] },
        { label:'GASTOS TOTALES', value:`S/. ${totalGastos.toFixed(2)}`, bg:[254,226,226] as [number,number,number], fg:[185,28,28] as [number,number,number] },
        { label:'GANANCIA NETA',  value:`S/. ${gananciaNeta.toFixed(2)}`, bg:(gananciaNeta>=0?[219,234,254]:[254,226,226]) as [number,number,number], fg:(gananciaNeta>=0?[29,78,216]:[185,28,28]) as [number,number,number] },
      ];
      kpis.forEach((b, i) => {
        const bx = M + i * (bw + 2);
        doc.setFillColor(...b.bg); doc.roundedRect(bx, y, bw, bh, 2, 2, 'F');
        doc.setTextColor(...b.fg); doc.setFont('helvetica','bold');
        doc.setFontSize(6.5); doc.text(b.label, bx + 3, y + 5.5);
        doc.setFontSize(10); doc.text(b.value, bx + 3, y + 14);
      });
      y += bh + 4;

      const hw = (CW - 4) / 2;
      doc.setFillColor(219,234,254); doc.roundedRect(M, y, hw, 13, 2, 2, 'F');
      doc.setTextColor(29,78,216); doc.setFontSize(6.5); doc.text('MARGEN DE GANANCIA', M+3, y+5);
      doc.setFontSize(9); doc.text(`${margen.toFixed(1)}%`, M+3, y+11.5);
      const fcOk = foodCost<=35;
      doc.setFillColor(...(fcOk?[209,250,229]:[254,226,226]) as [number,number,number]);
      doc.roundedRect(M+hw+4, y, hw, 13, 2, 2, 'F');
      doc.setTextColor(...(fcOk?[6,95,70]:[185,28,28]) as [number,number,number]);
      doc.setFontSize(6.5); doc.text(`FOOD COST (lim. recomendado 35%)`, M+hw+7, y+5);
      doc.setFontSize(9); doc.text(`${foodCost.toFixed(1)}%  ${fcOk?'OK':'Critico: Supera el limite'}`, M+hw+7, y+11.5);
      y += 19;

      // SECCION 4: ANALISIS INGRESOS
      y = checkPage(y, 50);
      y = sectionHeader('4.  ANALISIS DE INGRESOS - Metodos de Pago', y);
      const tPlin=this.getTotalPlin(), tYape=this.getTotalYape(), tEfec=this.getTotalEfectivo(), tTarj=this.getTotalTarjeta();
      const pct = (v: number) => totalIngresos>0?`${((v/totalIngresos)*100).toFixed(1)}%`:'0%';
      autoTable(doc, {
        head: [['Metodo de Pago','Monto Estimado','% del Total']],
        body: [
          ['Plin',    `S/. ${tPlin.toFixed(2)}`, pct(tPlin)],
          ['Yape',    `S/. ${tYape.toFixed(2)}`, pct(tYape)],
          ['Efectivo',`S/. ${tEfec.toFixed(2)}`, pct(tEfec)],
          ['Tarjeta', `S/. ${tTarj.toFixed(2)}`, pct(tTarj)],
          ['TOTAL',   `S/. ${totalIngresos.toFixed(2)}`, '100%'],
        ],
        startY: y, theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2.5 },
        headStyles: { fillColor: [51,65,85], textColor: 255, fontSize: 7.5 },
        columnStyles: { 1:{halign:'right',fontStyle:'bold'}, 2:{halign:'center'} },
        margin: { left: M, right: M }
      });
      y = doc.lastAutoTable.finalY + 8;

      // SECCION 5: DESGLOSE GASTOS
      y = checkPage(y, 60);
      y = sectionHeader('5.  DESGLOSE DE GASTOS - Por Categoria', y);
      const byType: {[k:string]:number} = {};
      gastosData.forEach((g: any[]) => { const t=g[1]||'Otros'; byType[t]=(byType[t]||0)+parseFloat(g[3]); });
      const gastosRows = Object.entries(byType).sort((a,b)=>b[1]-a[1]).map(([tipo,monto])=>{
        const p = totalGastos>0?((monto/totalGastos)*100):0;
        const est = tipo.toLowerCase().includes('pescado')||p>40 ? 'Requiere revision' : p>15 ? 'Vigilar' : 'Estable';
        return [tipo, `S/. ${monto.toFixed(2)}`, `${p.toFixed(1)}%`, est];
      });
      gastosRows.push(['TOTAL GASTOS',`S/. ${totalGastos.toFixed(2)}`,'100%','']);
      autoTable(doc, {
        head: [['Categoria','Monto Invertido','% Gasto','Estado']],
        body: gastosRows, startY: y, theme: 'grid',
        styles: { fontSize: 7.5, cellPadding: 2 },
        headStyles: { fillColor: [51,65,85], textColor: 255, fontSize: 7 },
        columnStyles: { 1:{halign:'right',fontStyle:'bold'}, 2:{halign:'center'} },
        alternateRowStyles: { fillColor: [248,250,251] },
        margin: { left: M, right: M }
      });

      // FOOTER
      const totalPages = doc.internal.getNumberOfPages();
      for (let p=1; p<=totalPages; p++) {
        doc.setPage(p);
        doc.setFont('helvetica','normal'); doc.setFontSize(6.5); doc.setTextColor(150);
        doc.text(`Pagina ${p} de ${totalPages}  |  Sistema de Caja - Restaurante Cevicheria`, PW/2, PH-8, {align:'center'});
      }

      doc.save(`reporte_caja_${this.fechaInicio||'sin-fecha'}.pdf`);
    } catch (error) {
      console.error('Error generating PDF report:', error);
      this.messageService.add({ severity:'error', summary:'Error PDF', detail:'No se pudo generar el reporte.' });
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
    this.gastosAppDetalles = [];
    try {
      this.aperturaService.ListGastosApp(fecha).subscribe(
        (response: { success: boolean; data: any[] }) => {
          if (response.success && response.data) {
            this.gastosAppDetalles = response.data.filter((gasto: any) => gasto.app === '1');
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
    // Calcular total antes de guardar
    this.form.total = (this.form.plin || 0) + (this.form.yape || 0) + (this.form.efectivo || 0) + (this.form.tarjeta || 0);

    if (this.editingId) {
      this.cajaService.update(this.editingId, this.form).then(({ error }) => {
        if (error) {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo actualizar el registro.' });
          return;
        }
        if (this.fechaInicio && this.fechaFin) {
          this.loadData(this.fechaInicio, this.fechaFin);
        }
        this.editingId = null;
        this.form = this.resetForm();
        this.displayDialog = false;
        this.messageService.add({ severity: 'success', summary: 'Actualizado', detail: 'Registro actualizado correctamente.' });
      });
    } else {
      this.cajaService.create(this.form).then(({ error }) => {
        if (error) {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar el registro.' });
          return;
        }
        if (this.fechaInicio && this.fechaFin) {
          this.loadData(this.fechaInicio, this.fechaFin);
        }
        this.form = this.resetForm();
        this.displayDialog = false;
        this.messageService.add({ severity: 'success', summary: 'Registrado', detail: 'Registro guardado correctamente.' });
      });
    }
  }

  edit(item: Caja) {
    this.editingId = item.id!;
    this.form = { ...item };
    this.displayDialog = true;
    this.fetchGastosAppData(item.fecha);
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
    this.gastosAppDetalles = [];
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

  getTotalPlin(): number {
    return this.cajasFiltradas.reduce((sum, caja) => sum + (caja.plin || 0), 0);
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
