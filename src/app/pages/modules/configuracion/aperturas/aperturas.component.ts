import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ImportsModule } from '../../../imports';
import { SupabaseService } from '../../../../services/supabase.service';
import { AperturaService } from '../../../service/apertura.service';
import { ConfirmationService, MessageService } from 'primeng/api';

export interface AperturaCaja {
    id?: number;
    fecha: string;
    total: number;
    estado: number;
    responsable: string;
    trabajadores: string;
    turno: string;
    trabajadoresArray?: number[];
}

@Component({
    selector: 'app-aperturas',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule, ImportsModule],
    providers: [MessageService, ConfirmationService],
    templateUrl: './aperturas.component.html',
    styleUrl: './aperturas.component.scss'
})
export class AperturasComponent implements OnInit {
    @Output() backToMain = new EventEmitter<void>();

    // Lista
    aperturas: AperturaCaja[] = [];
    cargando = false;

    // Filtros
    fechaDesde: string = '';
    fechaHasta: string = '';

    // Trabajadores para multiselect
    trabajadoresList: any[] = [];

    // Modal editar
    editVisible = false;
    guardando = false;
    editForm: FormGroup;
    aperturaEditando: AperturaCaja | null = null;

    constructor(
        private supabase: SupabaseService,
        private aperturaService: AperturaService,
        private fb: FormBuilder,
        private messageService: MessageService,
        private confirmationService: ConfirmationService
    ) {
        // Rango por defecto: últimos 30 días
        const hoy = new Date();
        const hace30 = new Date();
        hace30.setDate(hoy.getDate() - 30);
        this.fechaHasta = hoy.toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
        this.fechaDesde = hace30.toLocaleDateString('en-CA', { timeZone: 'America/Lima' });

        this.editForm = this.fb.group({
            responsable: ['', Validators.required],
            turno: ['', Validators.required],
            total: [0, [Validators.required, Validators.min(0)]],
            trabajadores: [[], Validators.required],
            estado: [1, Validators.required]
        });
    }

    ngOnInit(): void {
        this.cargarTrabajadores();
        this.buscar();
    }

    async cargarTrabajadores() {
        const res = await this.supabase.getTrabajadores();
        if (res.success) this.trabajadoresList = res.data || [];
    }

    async buscar() {
        if (!this.fechaDesde || !this.fechaHasta) return;
        this.cargando = true;
        const { data, error } = await this.supabase.client.from('apertura_caja').select('*').gte('fecha', this.fechaDesde).lte('fecha', this.fechaHasta).is('deleted', null).order('fecha', { ascending: false });

        this.cargando = false;
        if (error) {
            console.error(error);
            return;
        }

        this.aperturas = (data || []).map((a: any) => ({
            ...a,
            trabajadoresArray: a.trabajadores
                ? a.trabajadores
                      .split(',')
                      .map((id: string) => parseInt(id.trim()))
                      .filter((id: number) => !isNaN(id))
                : []
        }));
    }

    getEstadoBadge(estado: number): { label: string; cls: string } {
        return estado == 1 ? { label: 'Abierta', cls: 'badge-open' } : { label: 'Cerrada', cls: 'badge-closed' };
    }

    getNombreTrabajador(id: number): string {
        const t = this.trabajadoresList.find((w) => w.idpersona === id);
        return t ? t.nombres : `#${id}`;
    }

    getInicialesTrabajador(id: number): string {
        const name = this.getNombreTrabajador(id);
        return name
            .split(' ')
            .slice(0, 2)
            .map((w) => w[0])
            .join('')
            .toUpperCase();
    }

    getDiaSemana(fecha: string): string {
        if (!fecha) return '';
        const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        // T00:00:00 asegura que la fecha se interprete en la zona horaria local (Perú)
        const fechaObj = new Date(fecha + 'T00:00:00');
        return diasSemana[fechaObj.getDay()];
    }

    abrirEditar(apertura: AperturaCaja) {
        this.aperturaEditando = apertura;
        this.editForm.patchValue({
            responsable: apertura.responsable,
            turno: apertura.turno,
            total: Number(apertura.total),
            trabajadores: apertura.trabajadoresArray || [],
            estado: Number(apertura.estado)  // forzar int para que [ngValue] coincida
        });
        this.editVisible = true;
    }

    async guardarEdicion() {
        if (this.editForm.invalid || !this.aperturaEditando) {
            this.editForm.markAllAsTouched();
            return;
        }
        this.guardando = true;
        const val = this.editForm.value;

        let trabajadoresStr = (val.trabajadores as number[]).join(',');

        const { error } = await this.supabase.client
            .from('apertura_caja')
            .update({
                responsable: val.responsable,
                turno: val.turno,
                total: val.total,
                trabajadores: trabajadoresStr,
                estado: Number(val.estado)   // guardar como int en Supabase
            })
            .eq('id', this.aperturaEditando.id);

        this.guardando = false;

        if (error) {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo actualizar la apertura.', life: 3000 });
            return;
        }

        this.messageService.add({ severity: 'success', summary: 'Actualizado', detail: 'Apertura actualizada correctamente.', life: 3000 });
        this.editVisible = false;
        this.buscar();
    }

    eliminar(apertura: AperturaCaja) {
        this.confirmationService.confirm({
            message: `¿Eliminar la apertura del <strong>${apertura.fecha}</strong>?`,
            header: 'Confirmar eliminación',
            icon: 'pi pi-exclamation-triangle',
            accept: async () => {
                const { error } = await this.supabase.client.from('apertura_caja').update({ deleted: 1 }).eq('id', apertura.id);

                if (error) {
                    this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar.', life: 3000 });
                    return;
                }
                this.messageService.add({ severity: 'success', summary: 'Eliminado', detail: 'Apertura eliminada.', life: 3000 });
                this.buscar();
            }
        });
    }

    get resumenAsistencia(): { nombre: string; asistencias: number }[] {
        const conteo: { [id: number]: number } = {};
        
        this.aperturas.forEach((a) => {
            if (a.trabajadoresArray) {
                a.trabajadoresArray.forEach((id) => {
                    conteo[id] = (conteo[id] || 0) + 1;
                });
            }
        });

        const resultado = Object.entries(conteo).map(([idStr, total]) => {
            const id = parseInt(idStr, 10);
            return {
                nombre: this.getNombreTrabajador(id),
                asistencias: total
            };
        });

        return resultado.sort((a, b) => b.asistencias - a.asistencias);
    }

    volver() {
        this.backToMain.emit();
    }
}
