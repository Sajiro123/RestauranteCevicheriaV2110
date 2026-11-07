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

    // Modal regularizar / nueva apertura
    nuevaAperturaVisible = false;
    guardandoNueva = false;
    nuevaForm: FormGroup;

    constructor(
        private supabase: SupabaseService,
        private aperturaService: AperturaService,
        private fb: FormBuilder,
        private messageService: MessageService,
        private confirmationService: ConfirmationService
    ) {
        // Rango por defecto: últimos 30 días en horario de Perú
        const hoy = new Date();
        const hoyStr = hoy.toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
        const hace30 = new Date();
        hace30.setDate(hoy.getDate() - 30);
        this.fechaHasta = hoyStr;
        this.fechaDesde = hace30.toLocaleDateString('en-CA', { timeZone: 'America/Lima' });

        this.editForm = this.fb.group({
            responsable: ['', Validators.required],
            turno: ['', Validators.required],
            total: [0, [Validators.required, Validators.min(0)]],
            trabajadores: [[], Validators.required],
            estado: [1, Validators.required]
        });

        this.nuevaForm = this.fb.group({
            fecha: [hoyStr, Validators.required],
            turno: ['Mañana', Validators.required],
            responsable: ['', Validators.required],
            total: [0, [Validators.required, Validators.min(0)]],
            trabajadores: [[], Validators.required],
            estado: [2, Validators.required] // Por defecto 2 (Cerrada) para regularizaciones
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
        const { data, error } = await this.supabase.client
            .from('apertura_caja')
            .select('*')
            .gte('fecha', this.fechaDesde)
            .lte('fecha', this.fechaHasta)
            .is('deleted', null)
            .order('fecha', { ascending: false });

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
                      .map((id: string) => parseInt(id.trim(), 10))
                      .filter((id: number) => !isNaN(id))
                : []
        }));
    }

    getEstadoBadge(estado: number): { label: string; cls: string } {
        return Number(estado) === 1 ? { label: 'Abierta', cls: 'badge-open' } : { label: 'Cerrada', cls: 'badge-closed' };
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

    // ── GESTIÓN DE NUEVA / REGULARIZAR APERTURA ──────────────────────
    async abrirNuevaApertura() {
        if (!this.trabajadoresList || this.trabajadoresList.length === 0) {
            await this.cargarTrabajadores();
        }

        const hoyPeru = await this.supabase.getFechaPeruHoy();
        this.nuevaForm.reset({
            fecha: hoyPeru,
            turno: 'Mañana',
            responsable: '',
            total: 0,
            trabajadores: [],
            estado: 1 // Si es hoy, sugerir abierta
        });
        this.nuevaAperturaVisible = true;
    }

    async onFechaNuevaChange(nuevaFecha: string) {
        if (!nuevaFecha) return;
        const hoyPeru = await this.supabase.getFechaPeruHoy();
        if (nuevaFecha < hoyPeru) {
            // Fecha anterior: sugerir estado Cerrada (2) para regularizaciones
            this.nuevaForm.patchValue({ estado: 2 });
        } else if (nuevaFecha === hoyPeru) {
            // Fecha de hoy: sugerir estado Abierta (1)
            this.nuevaForm.patchValue({ estado: 1 });
        }
    }

    async guardarNuevaApertura() {
        if (this.nuevaForm.invalid) {
            this.nuevaForm.markAllAsTouched();
            this.messageService.add({
                severity: 'warn',
                summary: 'Campos requeridos',
                detail: 'Por favor completa todos los campos obligatorios.',
                life: 3500
            });
            return;
        }

        const val = this.nuevaForm.value;
        const trabajadoresArr = Array.isArray(val.trabajadores) ? val.trabajadores : [];
        if (trabajadoresArr.length === 0) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Personal requerido',
                detail: 'Debes seleccionar al menos un colaborador asignado a la jornada.',
                life: 3500
            });
            return;
        }

        this.guardandoNueva = true;

        // Verificar si ya existe una apertura para esta fecha y turno
        try {
            const { data: existing, error: checkError } = await this.supabase.client
                .from('apertura_caja')
                .select('id, fecha, turno, responsable, total, estado')
                .eq('fecha', val.fecha)
                .eq('turno', val.turno)
                .is('deleted', null)
                .maybeSingle();

            if (checkError) {
                console.error('Error verificando apertura existente:', checkError);
            }

            if (existing) {
                this.guardandoNueva = false;
                this.confirmationService.confirm({
                    message: `Ya existe una apertura registrada para el día <strong>${val.fecha}</strong> en el turno <strong>${val.turno}</strong> (Responsable: ${existing.responsable || 'Sin asignar'}).<br><br>¿Deseas registrar esta nueva apertura de todas formas?`,
                    header: 'Apertura Existente',
                    icon: 'pi pi-exclamation-triangle',
                    acceptLabel: 'Sí, registrar',
                    rejectLabel: 'Cancelar',
                    accept: () => {
                        this.ejecutarGuardadoApertura(val, trabajadoresArr);
                    }
                });
                return;
            }

            await this.ejecutarGuardadoApertura(val, trabajadoresArr);
        } catch (err: any) {
            this.guardandoNueva = false;
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: err.message || 'Error inesperado al verificar duplicidad.',
                life: 3500
            });
        }
    }

    private async ejecutarGuardadoApertura(val: any, trabajadoresArr: number[]) {
        this.guardandoNueva = true;
        try {
            const trabajadoresStr = trabajadoresArr.join(',');
            const payload = {
                fecha: val.fecha,
                total: Number(val.total) || 0,
                estado: Number(val.estado),
                responsable: val.responsable,
                trabajadores: trabajadoresStr,
                turno: val.turno,
                id_created_at: 1,
                created_at: new Date().toISOString()
            };

            const { data, error } = await this.supabase.client
                .from('apertura_caja')
                .insert(payload)
                .select()
                .single();

            this.guardandoNueva = false;

            if (error) {
                console.error('Error insertando en apertura_caja:', error);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: error.message || 'No se pudo registrar la apertura en la base de datos.',
                    life: 3500
                });
                return;
            }

            this.messageService.add({
                severity: 'success',
                summary: 'Apertura Regularizada',
                detail: `Apertura del ${val.fecha} (${val.turno}) registrada correctamente.`,
                life: 3500
            });

            this.nuevaAperturaVisible = false;

            // Ajustar rango de fechas si la fecha está fuera de la búsqueda actual
            if (val.fecha < this.fechaDesde) {
                this.fechaDesde = val.fecha;
            }
            if (val.fecha > this.fechaHasta) {
                this.fechaHasta = val.fecha;
            }

            await this.buscar();
        } catch (err: any) {
            this.guardandoNueva = false;
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: err.message || 'Error al procesar el guardado de la apertura.',
                life: 3500
            });
        }
    }

    // ── GESTIÓN DE EDICIÓN ──────────────────────────────────────────
    abrirEditar(apertura: AperturaCaja) {
        this.aperturaEditando = apertura;
        this.editForm.patchValue({
            responsable: apertura.responsable,
            turno: apertura.turno,
            total: Number(apertura.total),
            trabajadores: apertura.trabajadoresArray || [],
            estado: Number(apertura.estado) // forzar int para que [ngValue] coincida
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

        const trabajadoresArr = Array.isArray(val.trabajadores) ? val.trabajadores : [];
        let trabajadoresStr = trabajadoresArr.join(',');

        const { error } = await this.supabase.client
            .from('apertura_caja')
            .update({
                responsable: val.responsable,
                turno: val.turno,
                total: val.total,
                trabajadores: trabajadoresStr,
                estado: Number(val.estado) // guardar como int en Supabase
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
