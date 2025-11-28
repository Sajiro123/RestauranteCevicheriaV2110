import { Component } from '@angular/core';
import { Caja } from '../../../model/caja';
import { CajaService } from '../../service/caja.service';
import { ImportsModule } from '../../imports';
import { PedidoService } from '../../service/pedido.service';
import { AperturaService } from '../../service/apertura.service';

@Component({
  selector: 'app-caja',
  imports: [ImportsModule],
  templateUrl: './caja.component.html',
  styleUrl: './caja.component.scss'
})
export class CajaComponent {
  cajas: Caja[] = [];
  cajasFiltradas: Caja[] = [];
  form: Caja = this.resetForm();
  editingId: number | null = null;
  displayDialog: boolean = false;
  fechaInicio: string = '';
  fechaFin: string = '';

  constructor(
    private cajaService: CajaService,
    private pedidoService: PedidoService,
    private aperturaService: AperturaService
  ) { }

  ngOnInit(): void {
    this.loadData();
  }

  loadData() {
    this.cajaService.getAll().then((res) => {
      this.cajas = res.data || [];
      this.cajasFiltradas = [...this.cajas];
    });
  }

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
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return days[day] || '';
  }

  // Handle date change to automatically set day and week
  onDateChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const value = target.value;
    if (value) {
      const date = new Date(value);
      // Set day of week (0-6, Sunday=0)
      this.form.dia = date.getDay();
      // Set week number
      this.form.semana = this.getWeekNumber(date);
    }
  }

  // Filter data by date range
  filtrarPorRangoFechas() {
    if (!this.fechaInicio || !this.fechaFin) {
      this.cajasFiltradas = [...this.cajas];
      return;
    }

    const inicio = new Date(this.fechaInicio);
    const fin = new Date(this.fechaFin);

    this.cajasFiltradas = this.cajas.filter(caja => {
      const fechaCaja = new Date(caja.fecha);
      return fechaCaja >= inicio && fechaCaja <= fin;
    });
  }

  // Clear date filters
  limpiarFiltros() {
    this.fechaInicio = '';
    this.fechaFin = '';
    this.cajasFiltradas = [...this.cajas];
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

      // Fetch gastos data for the selected date
      this.aperturaService.ListGastos(this.form.fecha).subscribe(
        (response: { success: boolean; data: any[] }) => {
          if (response.success && response.data) {
            // Calculate total gastos from all expenses on that date
            let totalGastos = 0;
            response.data.forEach((gasto: any) => {
              // Only include gastos where app is null (as per your SQL query)
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
    } catch (error) {
      console.error('Error autocompleting from report:', error);
    }
  }

  save() {
    if (this.editingId) {
      this.cajaService.update(this.editingId, this.form).then(() => {
        this.loadData();
        this.editingId = null;
        this.form = this.resetForm();
        this.displayDialog = false;
      });
    } else {
      this.cajaService.create(this.form).then(() => {
        this.loadData();
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
      this.cajaService.delete(id).then(() => this.loadData());
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
}