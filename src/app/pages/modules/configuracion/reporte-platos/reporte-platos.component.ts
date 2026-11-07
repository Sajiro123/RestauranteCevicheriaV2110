import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ImportsModule } from '../../../imports';
import { SupabaseService } from '../../../../services/supabase.service';
import { MessageService } from 'primeng/api';

@Component({
    selector: 'app-reporte-platos',
    standalone: true,
    imports: [CommonModule, FormsModule, ImportsModule],
    providers: [MessageService],
    templateUrl: './reporte-platos.component.html',
    styleUrls: ['./reporte-platos.component.scss']
})
export class ReportePlatosComponent implements OnInit {
    @Output() backToMain = new EventEmitter<void>();

    selectedRange: Date[] = [];
    oneWeekAgo: Date = new Date();
    minDate: Date | undefined;
    maxDate: Date | undefined;
    esAdmin: boolean = false;

    cargando: boolean = false;
    allProductos: any[] = [];
    productosFiltrados: any[] = [];
    categorias: any[] = [];

    filtroTipo: string = 'TODOS'; // 'TODOS' | 'PLATOS' | 'BEBIDAS' | 'GASEOSAS' | 'CAT_<id>'
    busqueda: string = '';

    // KPIs
    platoTop: any = null;
    gaseosaTop: any = null;
    totalUnidadesVista: number = 0;
    totalSalonVista: number = 0;
    totalLlevarVista: number = 0;
    totalMontoVista: number = 0;
    totalPlatosUnidades: number = 0;
    totalBebidasUnidades: number = 0;

    constructor(
        private supabaseService: SupabaseService,
        private messageService: MessageService
    ) {}

    async ngOnInit() {
        const today = new Date();
        this.oneWeekAgo = new Date(today.getFullYear(), today.getMonth(), 1);

        let idperfil = 0;
        try {
            const raw = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
            if (raw) {
                const user = JSON.parse(raw);
                idperfil = Number(user?.idperfil || 0);
            }
        } catch (e) {
            idperfil = 0;
        }

        this.esAdmin = idperfil === 1;

        if (!this.esAdmin) {
            this.minDate = new Date(today);
            this.minDate.setDate(today.getDate() - 3);
            this.minDate.setHours(0, 0, 0, 0);

            this.maxDate = new Date(today);
            this.maxDate.setHours(23, 59, 59, 999);

            // Para otros perfiles consultar últimos 3 días por defecto
            const hace3Dias = new Date(today);
            hace3Dias.setDate(today.getDate() - 3);
            this.selectedRange = [hace3Dias, today];
            await this.consultarRango(hace3Dias, today);
        } else {
            this.minDate = undefined;
            this.maxDate = undefined;
            // Por defecto cargar el mes actual para el administrador
            await this.seleccionarMesActual();
        }
    }

    volver() {
        this.backToMain.emit();
    }

    onDatePickerShow(datepicker: any) {
        const base = this.selectedRange?.[0] ? new Date(this.selectedRange[0]) : new Date();
        const prevMonth = base.getMonth() === 0 ? 11 : base.getMonth() - 1;
        const prevYear = base.getMonth() === 0 ? base.getFullYear() - 1 : base.getFullYear();

        setTimeout(() => {
            if (datepicker && typeof datepicker. currentMonth !== 'undefined') {
                datepicker.currentMonth = prevMonth;
                datepicker.currentYear = prevYear;
                if (typeof datepicker.createMonths === 'function') {
                    datepicker.createMonths(prevMonth, prevYear);
                }
            }
        }, 0);
    }

    private formatLocalYYYYMMDD(d: Date): string {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    async handleCalendarBlur() {
        if (this.selectedRange && this.selectedRange.length === 2 && this.selectedRange[0] && this.selectedRange[1]) {
            await this.consultarRango(this.selectedRange[0], this.selectedRange[1]);
        }
    }

    async seleccionarHoy() {
        const hoy = new Date();
        this.selectedRange = [hoy, hoy];
        await this.consultarRango(hoy, hoy);
    }

    async seleccionarMesActual() {
        const hoy = new Date();
        const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
        const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
        this.selectedRange = [inicioMes, finMes];
        await this.consultarRango(inicioMes, finMes);
    }

    async seleccionarMesAnterior() {
        const hoy = new Date();
        const inicioMesAnt = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
        const finMesAnt = new Date(hoy.getFullYear(), hoy.getMonth(), 0);
        this.selectedRange = [inicioMesAnt, finMesAnt];
        await this.consultarRango(inicioMesAnt, finMesAnt);
    }

    async seleccionarUltimos30Dias() {
        const hoy = new Date();
        const hace30 = new Date(hoy);
        hace30.setDate(hoy.getDate() - 29);
        this.selectedRange = [hace30, hoy];
        await this.consultarRango(hace30, hoy);
    }

    async consultarRango(start: Date, end: Date) {
        this.cargando = true;
        try {
            const fechaInicio = this.formatLocalYYYYMMDD(start);
            const fechaFin = this.formatLocalYYYYMMDD(end);

            const res = await this.supabaseService.getReportePlatosVendidos(fechaInicio, fechaFin);
            if (res.success) {
                this.allProductos = res.data || [];
                this.categorias = res.categorias || [];
                this.calcularKPIsGlobales();
                this.aplicarFiltros();
            } else {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'No se pudo obtener el reporte de platos vendidos.'
                });
            }
        } finally {
            this.cargando = false;
        }
    }

    private calcularKPIsGlobales() {
        const platos = this.allProductos.filter((p) => !p.esBebida);
        const bebidas = this.allProductos.filter((p) => p.esBebida);
        const gaseosas = this.allProductos.filter((p) => p.esGaseosa);

        this.platoTop = platos.length > 0 ? platos[0] : null;
        // Priorizar la gaseosa más vendida o bebida si no hubo gaseosas
        this.gaseosaTop = gaseosas.length > 0 ? gaseosas[0] : (bebidas.length > 0 ? bebidas[0] : null);

        this.totalPlatosUnidades = platos.reduce((acc, p) => acc + (p.cantidadVendida || 0), 0);
        this.totalBebidasUnidades = bebidas.reduce((acc, p) => acc + (p.cantidadVendida || 0), 0);
    }

    cambiarFiltroTipo(tipo: string) {
        this.filtroTipo = tipo;
        this.aplicarFiltros();
    }

    aplicarFiltros() {
        let lista = [...this.allProductos];

        if (this.filtroTipo === 'PLATOS') {
            lista = lista.filter((p) => !p.esBebida);
        } else if (this.filtroTipo === 'BEBIDAS') {
            lista = lista.filter((p) => p.esBebida);
        } else if (this.filtroTipo === 'GASEOSAS') {
            lista = lista.filter((p) => p.esGaseosa);
        } else if (this.filtroTipo.startsWith('CAT_')) {
            const idCat = Number(this.filtroTipo.replace('CAT_', ''));
            lista = lista.filter((p) => Number(p.idcategoria) === idCat);
        }

        const term = (this.busqueda || '').trim().toLowerCase();
        if (term) {
            lista = lista.filter(
                (p) =>
                    (p.nombre || '').toLowerCase().includes(term) ||
                    (p.categoria || '').toLowerCase().includes(term)
            );
        }

        const totalUnidadesFiltro = lista.reduce((acc, p) => acc + (p.cantidadVendida || 0), 0);

        this.productosFiltrados = lista.map((item, idx) => ({
            ...item,
            posicionVista: idx + 1,
            porcentajeVista: totalUnidadesFiltro > 0
                ? Number(((item.cantidadVendida / totalUnidadesFiltro) * 100).toFixed(1))
                : 0
        }));

        this.totalUnidadesVista = totalUnidadesFiltro;
        this.totalSalonVista = lista.reduce((acc, p) => acc + (p.cantidadSalon || 0), 0);
        this.totalLlevarVista = lista.reduce((acc, p) => acc + (p.cantidadLlevar || 0), 0);
        this.totalMontoVista = lista.reduce((acc, p) => acc + (p.totalRecaudado || 0), 0);
    }

    getBadgeCategoriaClass(idcategoria: number, esGaseosa: boolean): string {
        if (esGaseosa) return 'cat-badge-gaseosa';
        switch (Number(idcategoria)) {
            case 1: return 'cat-badge-duos';
            case 2: return 'cat-badge-personal';
            case 3: return 'cat-badge-trio';
            case 4: return 'cat-badge-piqueos';
            case 5: return 'cat-badge-bebidas';
            default: return 'cat-badge-default';
        }
    }
}
