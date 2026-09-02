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
  gastosAppValues: { [fecha: string]: number } = {};
  gastosAppDetalles: any[] = [];

  constructor(
    private cajaService: CajaService,
    private pedidoService: PedidoService,
    private aperturaService: AperturaService,
    private messageService: MessageService
  ) { }

  ngOnInit(): void {}

  loadData(startDate: string, endDate: string) {
    this.cajaService.getByDateRange(startDate, endDate).then((res) => {
      this.cajas = res.data || [];
      this.cajasFiltradas = [...this.cajas];
      this.loadGastosAppValuesForFilteredDates();
    });
  }

  async loadGastosAppValuesForFilteredDates() {
    this.gastosAppValues = {};
    for (const caja of this.cajasFiltradas) {
      this.gastosAppValues[caja.fecha] = await this.getGastosAppForDate(caja.fecha);
    }
  }

  resetForm(): Caja {
    return { semana: 0, trabajo: '', fecha: '', dia: 0, yape: 0, efectivo: 0, tarjeta: 0, gastos: 0, plin: 0, notas: '' };
  }

  getWeekNumber(date: Date): number {
    const onejan = new Date(date.getFullYear(), 0, 1);
    return Math.ceil((((date.getTime() - onejan.getTime()) / 86400000) + onejan.getDay() + 1) / 7);
  }

  getDayName(day: number): string {
    const days = ['', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'];
    return days[day] || '';
  }

  onDateChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const value = target.value;
    if (value) {
      const date = new Date(value);
      this.form.dia = date.getDay() + 1;
      this.form.semana = this.getWeekNumber(date);
    }
  }

  filtrarPorRangoFechas() {
    if (!this.fechaInicio || !this.fechaFin) return;
    this.loadData(this.fechaInicio, this.fechaFin);
  }

  limpiarFiltros() {
    this.fechaInicio = '';
    this.fechaFin = '';
    this.cajasFiltradas = [...this.cajas];
  }

  async generateWeeklyReportPDF() {
    this.isGeneratingPDF = true;
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' }) as any;
      const PW = doc.internal.pageSize.width;
      const PH = doc.internal.pageSize.height;
      const M = 12;
      const CW = PW - M * 2;

      const sectionHeader = (title: string, y: number): number => {
        doc.setFillColor(30, 41, 59);
        doc.rect(M, y, CW, 8, 'F');
        doc.setTextColor(245, 158, 11);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text(title, M + 3, y + 5.5);
        doc.setTextColor(0, 0, 0);
        return y + 10;
      };

      const checkPage = (y: number, needed = 55): number => {
        if (y + needed > PH - 18) {
          doc.addPage();
          doc.setFillColor(30, 41, 59);
          doc.rect(0, 0, PW, 10, 'F');
          doc.setTextColor(245, 158, 11);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7.5);
          doc.text('REPORTE SEMANAL DE CAJA - Cevicheria Willy', PW / 2, 7, { align: 'center' });
          doc.setTextColor(0, 0, 0);
          return 16;
        }
        return y;
      };

      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, PW, 42, 'F');
      doc.setFillColor(245, 158, 11);
      doc.rect(0, 42, PW, 2.5, 'F');
      doc.setTextColor(245, 158, 11);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('REPORTE SEMANAL DE CAJA', PW / 2, 16, { align: 'center' });
      doc.setTextColor(203, 213, 225);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.text('Cevicheria Willy - Sistema de Gestion de Caja', PW / 2, 24, { align: 'center' });
      const periodo = this.fechaInicio && this.fechaFin
        ? `Periodo: ${this.fechaInicio}  al  ${this.fechaFin}` : 'Sin filtro de fecha activo';
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(`${periodo}  |  Generado: ${new Date().toLocaleDateString('es-PE')}`, PW / 2, 32, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      let y = 50;

      const gastosData = await this.fetchAllGastosForPeriod();
      const totalIngresos = this.getTotalPlin() + this.getTotalYape() + this.getTotalEfectivo() + this.getTotalTarjeta();
      const totalGastosReal = gastosData.reduce((s: number, i: any[]) => s + parseFloat(i[3]), 0);
      const gananciaNeta = totalIngresos - totalGastosReal;
      const margen = totalIngresos > 0 ? (gananciaNeta / totalIngresos) * 100 : 0;
      const foodCost = totalIngresos > 0 ? (totalGastosReal / totalIngresos) * 100 : 0;
      const tPlin = this.getTotalPlin(), tYape = this.getTotalYape();
      const tEfec = this.getTotalEfectivo(), tTarj = this.getTotalTarjeta();

      y = sectionHeader('1.  RESUMEN FINANCIERO DEL PERIODO', y);
      const bw = (CW - 4) / 3; const bh = 22;
      const kpis: { label: string; sub: string; value: string; bg: [number,number,number]; fg: [number,number,number] }[] = [
        { label: 'VENTAS TOTALES', sub: 'Ingresos del periodo', value: `S/. ${totalIngresos.toFixed(2)}`, bg: [209,250,229] as [number,number,number], fg: [6,95,70] as [number,number,number] },
        { label: 'GASTOS TOTALES', sub: 'Egresos registrados', value: `S/. ${totalGastosReal.toFixed(2)}`, bg: [254,226,226] as [number,number,number], fg: [185,28,28] as [number,number,number] },
        { label: 'GANANCIA NETA', sub: gananciaNeta >= 0 ? 'Positivo' : 'Negativo', value: `S/. ${gananciaNeta.toFixed(2)}`, bg: (gananciaNeta>=0?[219,234,254]:[254,226,226]) as [number,number,number], fg: (gananciaNeta>=0?[29,78,216]:[185,28,28]) as [number,number,number] },
      ];
      kpis.forEach((b, i) => {
        const bx = M + i * (bw + 2);
        doc.setFillColor(...b.bg); doc.roundedRect(bx, y, bw, bh, 3, 3, 'F');
        doc.setTextColor(...b.fg); doc.setFont('helvetica','bold'); doc.setFontSize(6.5); doc.text(b.label, bx+3, y+6);
        doc.setFont('helvetica','normal'); doc.setFontSize(6); doc.text(b.sub, bx+3, y+10);
        doc.setFont('helvetica','bold'); doc.setFontSize(11); doc.text(b.value, bx+3, y+18.5);
      });
      y += bh + 5;
      const hw = (CW - 4) / 2; const fcOk = foodCost <= 35;
      doc.setFillColor(219,234,254); doc.roundedRect(M, y, hw, 14, 2, 2, 'F');
      doc.setTextColor(29,78,216); doc.setFont('helvetica','bold'); doc.setFontSize(6);
      doc.text('MARGEN DE GANANCIA', M+3, y+5.5); doc.setFontSize(10); doc.text(`${margen.toFixed(1)} %`, M+3, y+12);
      doc.setFillColor(...(fcOk?[209,250,229]:[254,226,226]) as [number,number,number]);
      doc.roundedRect(M+hw+4, y, hw, 14, 2, 2, 'F');
      doc.setTextColor(...(fcOk?[6,95,70]:[185,28,28]) as [number,number,number]);
      doc.setFont('helvetica','bold'); doc.setFontSize(6);
      doc.text('FOOD COST (limite recomendado: 35%)', M+hw+7, y+5.5);
      doc.setFontSize(10); doc.text(`${foodCost.toFixed(1)} % - ${fcOk?'OK':'Supera el limite'}`, M+hw+7, y+12);
      y += 20;

      y = checkPage(y, 60);
      y = sectionHeader('2.  DETALLE DE INGRESOS POR DIA', y);
      const ingresosBody = this.cajasFiltradas.map(c => [
        c.fecha, this.getDayName(c.dia), c.trabajo || '',
        `S/. ${(c.plin||0).toFixed(2)}`, `S/. ${(c.yape||0).toFixed(2)}`,
        `S/. ${(c.efectivo||0).toFixed(2)}`, `S/. ${(c.tarjeta||0).toFixed(2)}`,
        `S/. ${((c.plin||0)+(c.yape||0)+(c.efectivo||0)+(c.tarjeta||0)).toFixed(2)}`
      ]);
      ingresosBody.push(['','TOTALES','',`S/. ${tPlin.toFixed(2)}`,`S/. ${tYape.toFixed(2)}`,`S/. ${tEfec.toFixed(2)}`,`S/. ${tTarj.toFixed(2)}`,`S/. ${totalIngresos.toFixed(2)}`]);
      autoTable(doc, {
        head: [['Fecha','Dia','Turno','Plin','Yape','Efectivo','Tarjeta','Total']],
        body: ingresosBody, startY: y, theme: 'grid',
        styles: { fontSize: 7.5, cellPadding: 2.2 },
        headStyles: { fillColor: [51,65,85], textColor: 255, fontSize: 7.5, fontStyle: 'bold' },
        columnStyles: { 3:{halign:'right'}, 4:{halign:'right'}, 5:{halign:'right'}, 6:{halign:'right'}, 7:{halign:'right',fontStyle:'bold',textColor:[6,95,70]} },
        alternateRowStyles: { fillColor: [248,250,251] },
        didParseCell: (data: any) => { if (data.row.index === ingresosBody.length-1) { data.cell.styles.fontStyle='bold'; data.cell.styles.fillColor=[241,245,249]; } },
        margin: { left: M, right: M }
      });
      y = doc.lastAutoTable.finalY + 6;

      y = checkPage(y, 55);
      y = sectionHeader('3.  ANALISIS POR METODO DE PAGO', y);
      const pct = (v: number) => totalIngresos > 0 ? `${((v/totalIngresos)*100).toFixed(1)} %` : '0 %';
      autoTable(doc, {
        head: [['Metodo','Monto Total','% del Total','Estado']],
        body: [
          ['Plin',`S/. ${tPlin.toFixed(2)}`,pct(tPlin),tPlin>0?'Activo':'Sin movimiento'],
          ['Yape',`S/. ${tYape.toFixed(2)}`,pct(tYape),tYape>0?'Activo':'Sin movimiento'],
          ['Efectivo',`S/. ${tEfec.toFixed(2)}`,pct(tEfec),tEfec>0?'Activo':'Sin movimiento'],
          ['Tarjeta',`S/. ${tTarj.toFixed(2)}`,pct(tTarj),tTarj>0?'Activo':'Sin movimiento'],
          ['TOTAL',`S/. ${totalIngresos.toFixed(2)}`,'100 %',''],
        ],
        startY: y, theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2.5 },
        headStyles: { fillColor: [51,65,85], textColor: 255, fontSize: 8, fontStyle: 'bold' },
        columnStyles: { 1:{halign:'right',fontStyle:'bold'}, 2:{halign:'center'}, 3:{halign:'center'} },
        didParseCell: (data: any) => { if (data.row.index===4) { data.cell.styles.fontStyle='bold'; data.cell.styles.fillColor=[241,245,249]; } },
        margin: { left: M, right: M }
      });
      y = doc.lastAutoTable.finalY + 6;

      y = checkPage(y, 55);
      y = sectionHeader('4.  DETALLE DE GASTOS DEL PERIODO', y);
      if (gastosData.length > 0) {
        autoTable(doc, {
          head: [['Fecha','Categoria','Descripcion','Monto']],
          body: gastosData.map((g: any[]) => [g[0],g[1],g[2],`S/. ${parseFloat(g[3]).toFixed(2)}`]),
          startY: y, theme: 'grid',
          styles: { fontSize: 7.5, cellPadding: 2.2 },
          headStyles: { fillColor: [51,65,85], textColor: 255, fontSize: 7.5, fontStyle: 'bold' },
          columnStyles: { 0:{cellWidth:24}, 1:{cellWidth:38}, 3:{halign:'right',fontStyle:'bold',cellWidth:26} },
          alternateRowStyles: { fillColor: [255,248,248] },
          margin: { left: M, right: M }
        });
        y = doc.lastAutoTable.finalY + 6;
      } else {
        doc.setFont('helvetica','italic'); doc.setFontSize(8); doc.setTextColor(120);
        doc.text('Sin gastos registrados para el periodo.', M+3, y+5); doc.setTextColor(0); y += 12;
      }

      y = checkPage(y, 60);
      y = sectionHeader('5.  DESGLOSE DE GASTOS POR CATEGORIA', y);
      const byType: {[k:string]:number} = {};
      gastosData.forEach((g: any[]) => { const t=g[1]||'Otros'; byType[t]=(byType[t]||0)+parseFloat(g[3]); });
      const gastosRows = Object.entries(byType).sort((a,b)=>b[1]-a[1]).map(([tipo,monto]) => {
        const p = totalGastosReal>0?((monto/totalGastosReal)*100):0;
        const est = tipo.toLowerCase().includes('pescado')||p>40?'Requiere revision':p>15?'Vigilar':'Estable';
        return [tipo,`S/. ${monto.toFixed(2)}`,`${p.toFixed(1)} %`,est];
      });
      gastosRows.push(['TOTAL GASTOS',`S/. ${totalGastosReal.toFixed(2)}`,'100 %','']);
      autoTable(doc, {
        head: [['Categoria','Monto','% Gasto','Estado']],
        body: gastosRows, startY: y, theme: 'grid',
        styles: { fontSize: 7.5, cellPadding: 2.2 },
        headStyles: { fillColor: [51,65,85], textColor: 255, fontSize: 7.5, fontStyle: 'bold' },
        columnStyles: { 1:{halign:'right',fontStyle:'bold'}, 2:{halign:'center'}, 3:{halign:'center'} },
        alternateRowStyles: { fillColor: [248,250,251] },
        didParseCell: (data: any) => { if (data.row.index===gastosRows.length-1) { data.cell.styles.fontStyle='bold'; data.cell.styles.fillColor=[241,245,249]; } },
        margin: { left: M, right: M }
      });

      const totalPages = doc.internal.getNumberOfPages();
      for (let p=1; p<=totalPages; p++) {
        doc.setPage(p);
        doc.setFillColor(30,41,59); doc.rect(0,PH-12,PW,12,'F');
        doc.setFont('helvetica','normal'); doc.setFontSize(6.5); doc.setTextColor(148,163,184);
        doc.text(`Pagina ${p} de ${totalPages}  |  Sistema de Caja - Cevicheria Willy  |  ${periodo}`, PW/2, PH-5, {align:'center'});
      }
      doc.save(`reporte_caja_${this.fechaInicio||'periodo'}_${this.fechaFin||''}.pdf`);
    } catch (error) {
      console.error('Error generating PDF report:', error);
      this.messageService.add({ severity: 'error', summary: 'Error PDF', detail: 'No se pudo generar el reporte.' });
    } finally {
      this.isGeneratingPDF = false;
    }
  }

  async fetchAllGastosForPeriod(): Promise<any[]> {
    const gastosData: any[] = [];
    const uniqueDates = [...new Set(this.cajasFiltradas.map(caja => caja.fecha))];
    for (const fecha of uniqueDates) {
      try {
        const gastosResponse = await new Promise<any>((resolve, reject) => {
          this.aperturaService.ListGastos(fecha).subscribe({ next: resolve, error: reject });
        });
        if (gastosResponse.success && gastosResponse.data) {
          gastosResponse.data.forEach((gasto: any) => {
            if (gasto.app === null) {
              gastosData.push([gasto.fecha, gasto.categoriagastos?.descripcion || 'Sin categoria', gasto.descripcion || gasto.notas || '', parseFloat(gasto.monto).toFixed(2)]);
            }
          });
        }
      } catch (error) { console.error('Error fetching gastos for date:', fecha, error); }
      try {
        const gastosAppResponse = await new Promise<any>((resolve, reject) => {
          this.aperturaService.ListGastosApp(fecha).subscribe({ next: resolve, error: reject });
        });
        if (gastosAppResponse.success && gastosAppResponse.data) {
          gastosAppResponse.data.forEach((gasto: any) => {
            if (gasto.app === '1') {
              gastosData.push([gasto.fecha, gasto.categoriagastos?.descripcion || 'Sin categoria', gasto.descripcion || gasto.notas || '', parseFloat(gasto.monto).toFixed(2)]);
            }
          });
        }
      } catch (error) { console.error('Error fetching gastosApp for date:', fecha, error); }
    }
    return gastosData;
  }


  async autocompleteFromReport() {
    if (!this.form.fecha) return;
    try {
      this.pedidoService.ShowPedidosFecha(this.form.fecha).subscribe(
        (response: { success: boolean; data: any[] }) => {
          if (response.success && response.data.length > 0) {
            let totalYape=0, totalEfectivo=0, totalVisa=0;
            response.data.forEach((order: any) => {
              totalYape += parseFloat(order.yape) || 0;
              totalEfectivo += parseFloat(order.efectivo) || 0;
              totalVisa += parseFloat(order.visa) || 0;
            });
            this.form.yape = totalYape;
            this.form.efectivo = totalEfectivo;
            this.form.tarjeta = totalVisa;
          }
        },
        (error: any) => { console.error('Error fetching report data:', error); }
      );
      this.aperturaService.ListGastos(this.form.fecha).subscribe(
        (response: { success: boolean; data: any[] }) => {
          if (response.success && response.data) {
            let totalGastos = 0;
            response.data.forEach((gasto: any) => { if (gasto.app === null) totalGastos += parseFloat(gasto.monto) || 0; });
            this.form.gastos = totalGastos;
          }
        },
        (error: any) => { console.error('Error fetching gastos data:', error); }
      );
      this.fetchGastosAppData(this.form.fecha);
    } catch (error) { console.error('Error autocompleting from report:', error); }
  }

  async fetchGastosAppData(fecha: string) {
    this.gastosAppDetalles = [];
    try {
      this.aperturaService.ListGastosApp(fecha).subscribe(
        (response: { success: boolean; data: any[] }) => {
          if (response.success && response.data) {
            this.gastosAppDetalles = response.data.filter((gasto: any) => gasto.app === '1');
          }
        },
        (error: any) => { console.error('Error fetching gastosApp data:', error); }
      );
    } catch (error) { console.error('Error fetching gastosApp data:', error); }
  }

  save() {
    this.form.total = (this.form.plin||0) + (this.form.yape||0) + (this.form.efectivo||0) + (this.form.tarjeta||0);
    if (this.editingId) {
      this.cajaService.update(this.editingId, this.form).then(({ error }) => {
        if (error) { this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo actualizar el registro.' }); return; }
        if (this.fechaInicio && this.fechaFin) this.loadData(this.fechaInicio, this.fechaFin);
        this.editingId = null; this.form = this.resetForm(); this.displayDialog = false;
        this.messageService.add({ severity: 'success', summary: 'Actualizado', detail: 'Registro actualizado correctamente.' });
      });
    } else {
      this.cajaService.create(this.form).then(({ error }) => {
        if (error) { this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar el registro.' }); return; }
        if (this.fechaInicio && this.fechaFin) this.loadData(this.fechaInicio, this.fechaFin);
        this.form = this.resetForm(); this.displayDialog = false;
        this.messageService.add({ severity: 'success', summary: 'Registrado', detail: 'Registro guardado correctamente.' });
      });
    }
  }

  edit(item: Caja) { this.editingId = item.id!; this.form = { ...item }; this.displayDialog = true; this.fetchGastosAppData(item.fecha); }

  delete(id: number) {
    if (confirm('Eliminar registro?')) {
      this.cajaService.delete(id).then(() => { if (this.fechaInicio && this.fechaFin) this.loadData(this.fechaInicio, this.fechaFin); });
    }
  }

  openNew() {
    this.form = this.resetForm(); this.editingId = null; this.displayDialog = true;
    this.gastosAppDetalles = []; this.form.trabajo = 'manana'; this.form.fecha = new Date().toISOString().slice(0, 10);
  }

  hideDialog() { this.displayDialog = false; this.editingId = null; this.form = this.resetForm(); }

  async getGastosAppForDate(fecha: string): Promise<number> {
    return new Promise((resolve) => {
      this.aperturaService.ListGastosApp(fecha).subscribe(
        (response: { success: boolean; data: any[] }) => {
          if (response.success && response.data) {
            let totalGastosApp = 0;
            response.data.forEach((gasto: any) => { if (gasto.app === '1') totalGastosApp += parseFloat(gasto.monto) || 0; });
            resolve(totalGastosApp);
          } else resolve(0);
        },
        (error: any) => { console.error('Error fetching gastosApp data:', error); resolve(0); }
      );
    });
  }

  getTotalGastos(): number { return this.cajasFiltradas.reduce((sum, caja) => sum + (caja.gastos || 0), 0); }
  getTotalPlin(): number   { return this.cajasFiltradas.reduce((sum, caja) => sum + (caja.plin || 0), 0); }
  getTotalYape(): number   { return this.cajasFiltradas.reduce((sum, caja) => sum + (caja.yape || 0), 0); }
  getTotalEfectivo(): number { return this.cajasFiltradas.reduce((sum, caja) => sum + (caja.efectivo || 0), 0); }
  getTotalTarjeta(): number  { return this.cajasFiltradas.reduce((sum, caja) => sum + (caja.tarjeta || 0), 0); }

  // CORREGIDO: incluye plin en el total general
  getTotalGeneral(): number {
    return this.cajasFiltradas.reduce((sum, caja) =>
      sum + (caja.plin || 0) + (caja.yape || 0) + (caja.efectivo || 0) + (caja.tarjeta || 0), 0);
  }

  getTotalGastosApp(): number {
    return this.cajasFiltradas.reduce((sum, caja) => sum + (this.gastosAppValues[caja.fecha] || 0), 0);
  }
}
