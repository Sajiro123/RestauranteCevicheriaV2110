import { ChangeDetectorRef, Component, DebugElement } from '@angular/core';
import { AperturaService } from '../../service/apertura.service';
import { PedidoService } from '../../service/pedido.service';
import { ImportsModule } from '../../imports';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, Validators } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';

@Component({
    selector: 'app-apertura',
    imports: [CommonModule, ImportsModule, FormsModule], // <-- Add this
    providers: [MessageService, ConfirmationService],
    templateUrl: './apertura.component.html',
    styleUrl: './apertura.component.scss'
})
export class AperturaComponent {
    data_apertura: any = [];
    fecha_actual: string = '';
    cajaForm: FormGroup;
    texto_estado_caja: any = '';
    estado_caja: number | null = null;
    GastosForm: FormGroup;
    EditGastoForm: FormGroup;
    CategoriaGastosList: { descripcion: string; idcategoriagastos: number }[] = [];
    GastosList: { monto: number; descripcion: string; fecha: Date; idcategoriagastos: number; notas: string }[] = [];
    fechaActual: string = new Date()
        .toLocaleDateString('es-PE', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        })
        .split('/')
        .reverse()
        .join('-');
    Resumenventahoy: any = [];
    isSubmitting = false;
    trabajadoresList: any[] = [];
    editDialogVisible = false;
    gastoEditando: any = null;
    modoEdicion = false;

    constructor(
        private AperturaService_: AperturaService,
        private pedidoService_: PedidoService,
        private fb: FormBuilder,
        private messageService: MessageService,
        private confirmationService: ConfirmationService,
        private cd: ChangeDetectorRef
    ) {
        this.cajaForm = this.fb.group({
            estado: [1],
            caja: ['1', Validators.required],
            turno: ['', Validators.required],
            responsable: ['', Validators.required],
            trabajadores: [[], Validators.required],
            monto: ['', [Validators.required, Validators.min(0)]]
        });

        let dateHoy = new Date();
        dateHoy.setDate(dateHoy.getDate());
        let hoy = new Date().toLocaleDateString('es-PE', { year: 'numeric', month: '2-digit', day: '2-digit' }).split('/').reverse().join('-');

        this.GastosForm = this.fb.group({
            descripcion: ['', Validators.required],
            monto: [0.0, Validators.required],
            // fecha: [hoy, Validators.required],
            categoria: ['', Validators.required],
            notas: ['']
        });

        this.EditGastoForm = this.fb.group({
            descripcion: ['', Validators.required],
            monto: [0.0, Validators.required],
            categoria: ['', Validators.required],
            notas: ['']
        });
    }

    ngOnInit(): void {
        const date = new Date();
        this.fecha_actual = new Date().toLocaleDateString('es-PE', { year: 'numeric', month: '2-digit', day: '2-digit' }).split('/').reverse().join('-');

        const opciones: Intl.DateTimeFormatOptions = {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        };
        // Convertir la fecha a texto en español
        const fechaFormateada = date.toLocaleDateString('es-PE', opciones);

        // Reemplazar "de junio de 2025" por "de junio del 2025"
        this.fecha_actual = fechaFormateada.replace(' de ', ' de ').replace(' de ', ' del ');
        this.ListAperturaNow();
        this.ListGastos();
        this.ListarTrabajadores();
    }

    GuardarCaja() {
        debugger;
        if (this.estado_caja == null) {
            // ── SIN APERTURA: Abrir caja ──────────────────────────
            if (this.cajaForm.invalid) {
                this.cajaForm.markAllAsTouched();
                return;
            }
            this.AperturaService_.registrarCaja(this.cajaForm.value).subscribe(() => {
                this.messageService.add({
                    severity: 'success',
                    summary: 'Apertura registrada',
                    detail: 'Apertura registrada para el día de hoy',
                    life: 3000
                });
                this.ListAperturaNow();
            });
        } else if (this.estado_caja == 1) {
            // ── ESTADO 1 (Abierta): Cerrar caja ──────────────────
            this.confirmationService.confirm({
                message: '¿Estás seguro de cerrar la caja?',
                header: 'Cerrar Caja',
                icon: 'pi pi-exclamation-triangle',
                accept: () => {
                    this.AperturaService_.cerrarCaja(this.cajaForm.value).subscribe(() => {
                        this.messageService.add({
                            severity: 'success',
                            summary: 'Caja cerrada',
                            detail: 'La caja fue cerrada correctamente',
                            life: 3000
                        });
                        this.modoEdicion = false;
                        this.ListAperturaNow();
                    });
                }
            });
        }
        // estado_caja === 2 (Cerrada): el botón no aparece en el HTML
    }

    activarEdicion() {
        this.modoEdicion = true;
        this.cajaForm.enable();
        // Mantener estado bloqueado (no editable)
        this.cajaForm.get('estado')?.disable();
        this.cajaForm.get('caja')?.disable();
    }

    cancelarEdicion() {
        this.modoEdicion = false;
        this.cajaForm.disable();
        // Recargar datos originales
        this.ListAperturaNow();
    }

    ActualizarCaja() {
        if (this.cajaForm.invalid) {
            this.cajaForm.markAllAsTouched();
            return;
        }
        this.AperturaService_.actualizarCaja(this.cajaForm.getRawValue()).subscribe((response) => {
            if (response.success) {
                this.messageService.add({
                    severity: 'success',
                    summary: 'Datos actualizados',
                    detail: 'Los datos de la caja fueron actualizados correctamente',
                    life: 3000
                });
                this.modoEdicion = false;
                this.cajaForm.disable();
                this.ListAperturaNow();
            } else {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'No se pudo actualizar la caja',
                    life: 3000
                });
            }
        });
    }

    GuardarGastos() {
        if (this.GastosForm.valid) {
            this.AperturaService_.registrarGastos(this.GastosForm.value).subscribe((response) => {
                this.messageService.add({
                    severity: 'success',
                    summary: 'Successful',
                    detail: 'Gasto registrado',
                    life: 3000
                });
                this.ListGastos();
                this.GastosForm.reset();
                this.GastosForm.markAsUntouched(); // ¡Importante! Limpia estados de validación
                this.GastosForm.updateValueAndValidity(); // Forzar revalidación
                this.cd.detectChanges(); // Forza detección de cambios

                this.isSubmitting = false;

                // this.ListAperturaNow();
            });
        }
    }

    abrirEditarGasto(gasto: any) {
        this.gastoEditando = gasto;
        this.EditGastoForm.patchValue({
            descripcion: gasto.descripcion,
            monto: gasto.monto,
            categoria: gasto.idcategoriagastos,
            notas: gasto.notas || ''
        });
        this.editDialogVisible = true;
    }

    guardarEdicion() {
        if (this.EditGastoForm.valid && this.gastoEditando) {
            const data = {
                descripcion: this.EditGastoForm.value.descripcion,
                monto: this.EditGastoForm.value.monto,
                idcategoriagastos: this.EditGastoForm.value.categoria,
                notas: this.EditGastoForm.value.notas
            };
            this.AperturaService_.editarGasto(this.gastoEditando.idgastos, data).subscribe((response) => {
                if (response.success) {
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Actualizado',
                        detail: 'Gasto actualizado correctamente',
                        life: 3000
                    });
                    this.editDialogVisible = false;
                    this.gastoEditando = null;
                    this.ListGastos();
                } else {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'No se pudo actualizar el gasto',
                        life: 3000
                    });
                }
            });
        }
    }

    eliminarGasto(gasto: any) {
        this.confirmationService.confirm({
            message: '¿Estás seguro de eliminar este gasto?',
            header: 'Confirmar Eliminación',
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                this.AperturaService_.eliminarGasto(gasto.idgastos).subscribe((response) => {
                    if (response.success) {
                        this.messageService.add({
                            severity: 'success',
                            summary: 'Eliminado',
                            detail: 'Gasto eliminado correctamente',
                            life: 3000
                        });
                        this.ListGastos();
                    } else {
                        this.messageService.add({
                            severity: 'error',
                            summary: 'Error',
                            detail: 'No se pudo eliminar el gasto',
                            life: 3000
                        });
                    }
                });
            }
        });
    }

    ListarReporteHoy() {
        const fecha = new Date().toLocaleDateString('es-PE', { year: 'numeric', month: '2-digit', day: '2-digit' }).split('/').reverse().join('-');
        this.pedidoService_.ReporteDiario(fecha).subscribe((response) => {
            if (response.success) {
                if (response.data) {
                    this.Resumenventahoy = response.data;
                    console.log(this.Resumenventahoy);
                }
            }
        });
    }

    totalGastos() {
        return this.GastosList.reduce((total: number, gasto: any) => total + (gasto.monto || 0), 0);
    }
    resumenGastosPorCategoria(): string {
        if (!this.GastosList) return '';
        const resumen: { [key: string]: number } = {};
        this.GastosList.forEach((gasto: any) => {
            if (!resumen[gasto.idcategoriagastos]) {
                resumen[gasto.idcategoriagastos] = 0;
            }
            resumen[gasto.idcategoriagastos] += gasto.monto || 0;
        });
        // Para mostrar saltos de línea en HTML, usa <br> y luego en el template usa [innerHTML]
        return Object.entries(resumen)
            .map(([idcategoriagastos, total]) => `${this.getCategoriaDescripcion(Number(idcategoriagastos))}: ${total}`)
            .join('     ||    ');
    }

    ListAperturaNow() {
        this.AperturaService_.ListarAperturaHoy().subscribe((response) => {
            if (response.success) {
                this.data_apertura = []; // Limpiar antes de asignar
                if (response.data && response.data.length > 0) {
                    const apertura = response.data[0];
                    this.estado_caja = apertura.estado ?? null;

                    switch (this.estado_caja) {
                        case 2:
                            this.texto_estado_caja = 'Caja ya se Cerro (Hoy)';
                            this.cajaForm.disable();
                            break;
                        case 1:
                            this.texto_estado_caja = 'Caja Abierta deseas cerrarla?';
                            this.cajaForm.enable();
                            break;
                        default:
                            this.cajaForm.enable();
                            this.texto_estado_caja = 'Abrir Caja?';
                            break;
                    }

                    this.data_apertura = [apertura];

                    // Convertir trabajadores de string a array de números
                    let trabajadoresArray: number[] = [];
                    if (apertura.trabajadores) {
                        trabajadoresArray = apertura.trabajadores
                            .split(',')
                            .map((id: string) => parseInt(id.trim()))
                            .filter((id: number) => !isNaN(id));
                    }

                    this.cajaForm.patchValue({
                        caja: 1,
                        responsable: apertura.responsable,
                        monto: apertura.total,
                        turno: apertura.turno || 'Mañana',
                        estado: apertura.estado,
                        trabajadores: trabajadoresArray
                    });
                } else {
                    // No hay registro hoy — caja aún no abierta
                    this.estado_caja = null;
                    this.texto_estado_caja = 'Abrir Caja?';
                    this.cajaForm.enable();
                }
            } else {
                alert('Hubo un problema al conectar con el servidor');
            }
        });
    }

    ListCategoriasGastos() {
        this.AperturaService_.ListCategoriasGastos().subscribe((response) => {
            if (response.success) {
                if (response.data) {
                    this.CategoriaGastosList = response.data;
                }
            } else {
                alert('Hubo un problema al conectar con el servidor');
            }
        });
    }

    getCategoriaDescripcion(idcategoria: number) {
        const categoria = this.CategoriaGastosList.find((d: { idcategoriagastos: any }) => d.idcategoriagastos === idcategoria);
        var estus = categoria ? categoria.descripcion : '';

        return estus;
    }

    ListGastos() {
        const fecha = new Date()
            .toLocaleDateString('es-PE', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            })
            .split('/')
            .reverse()
            .join('-');
        this.AperturaService_.ListGastos(fecha).subscribe((response) => {
            if (response.success) {
                if (response.data) {
                    this.GastosList = response.data;
                }
                this.ListCategoriasGastos();
                this.ListarReporteHoy();
            } else {
                alert('Hubo un problema al conectar con el servidor');
            }
        });
    }

    getWorkerName(idpersona: number): string {
        const worker = this.trabajadoresList.find((t: any) => t.idpersona === idpersona);
        return worker ? worker.nombres : `Trabajador #${idpersona}`;
    }

    getWorkerInitials(idpersona: number): string {
        const name = this.getWorkerName(idpersona);
        return name
            .split(' ')
            .slice(0, 2)
            .map((w: string) => w[0])
            .join('')
            .toUpperCase();
    }

    ListarTrabajadores() {
        this.AperturaService_.ListarTrabajadores().subscribe((response) => {
            if (response.success) {
                if (response.data) {
                    this.trabajadoresList = response.data;
                }
            } else {
                alert('Hubo un problema al conectar con el servidor');
            }
        });
    }
}
