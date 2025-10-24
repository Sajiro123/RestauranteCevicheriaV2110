import { CommonModule } from '@angular/common';
import { Component, ViewChild, Output, EventEmitter, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ImportsModule } from '../../../imports';
import { MessageService } from 'primeng/api';
import { VoucherService } from '../../../../services/voucher.service';
import { Table } from 'primeng/table';

interface VoucherDisplay {
    id: number;
    codigo: string;
    descripcion?: string;
    estado: number;
    estadoLabel: string;
    fecha_creacion: string;
    fecha_uso?: string;
    fecha_vencimiento: string;
    idpedido?: number;
    deleted?: string;
}

@Component({
    selector: 'app-vouchers',
    imports: [CommonModule, FormsModule, ImportsModule],
    templateUrl: './vouchers.component.html',
    styleUrl: './vouchers.component.scss',
    providers: [MessageService]
})
export class VouchersComponent implements OnInit {
    @ViewChild('dt') dt!: Table;
    @Output() backToMain = new EventEmitter<void>();

    vouchers: VoucherDisplay[] = [];
    filteredVouchers: VoucherDisplay[] = [];
    loading: boolean = false;

    // Filtros
    selectedEstado: any = null;
    estadoOptions = [
        { label: 'Usado', value: '2' },
        { label: 'Disponible', value: '1' }
    ];

    fechaInicio: Date | null = null;
    fechaFin: Date | null = null;

    constructor(
        private voucherService: VoucherService,
        private messageService: MessageService
    ) {
        // Establecer fecha de inicio y fin como el día de hoy
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        this.fechaInicio = today;

        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);
        this.fechaFin = endOfDay;
    }

    goBack() {
        this.backToMain.emit();
    }

    ngOnInit(): void {
        this.loadVouchers();
    }

    async loadVouchers() {
        this.loading = true;
        try {
            const result = await this.voucherService.getAllVouchers();

            if (result.success && result.data) {
                this.vouchers = result.data.map(v => ({
                    ...v,
                    estadoLabel: v.estado === '1' ? 'Disponible' : 'Usado'
                }));
                this.applyFilters();
            } else {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Error al cargar vouchers'
                });
            }
        } catch (error) {
            console.error('Error loading vouchers:', error);
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Error al cargar vouchers'
            });
        } finally {
            this.loading = false;
        }
    }

    applyFilters() {
        let filtered = [...this.vouchers];

        // Filtro por rango de fechas (siempre aplicar si hay fechas)
        if (this.fechaInicio || this.fechaFin) {
            filtered = filtered.filter(v => {
                const fechaCreacion = new Date(v.fecha_creacion);
                fechaCreacion.setHours(0, 0, 0, 0);

                let passFilter = true;

                if (this.fechaInicio) {
                    const inicio = new Date(this.fechaInicio);
                    inicio.setHours(0, 0, 0, 0);
                    passFilter = passFilter && fechaCreacion >= inicio;
                }

                if (this.fechaFin) {
                    const fin = new Date(this.fechaFin);
                    fin.setHours(23, 59, 59, 999);
                    passFilter = passFilter && fechaCreacion <= fin;
                }

                return passFilter;
            });
        }

        // Filtro por estado (solo si se selecciona uno)
        if (this.selectedEstado !== null && this.selectedEstado !== undefined) {
            filtered = filtered.filter(v => v.estado == this.selectedEstado.value);
        }

        this.filteredVouchers = filtered;
    }

    onEstadoChange() {
        this.applyFilters();
    }

    onDateChange() {
        this.applyFilters();
    }

    clearFilters() {
        this.selectedEstado = null;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        this.fechaInicio = today;

        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);
        this.fechaFin = endOfDay;

        this.applyFilters();
    }

    onGlobalFilter(table: Table, event: Event) {
        table.filterGlobal((event.target as HTMLInputElement).value, 'contains');
    }

    getEstadoSeverity(estado: any): string {
        return estado === '1' ? 'success' : 'secondary';
    }

    formatDate(dateString: string | undefined): string {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('es-PE', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }


}
