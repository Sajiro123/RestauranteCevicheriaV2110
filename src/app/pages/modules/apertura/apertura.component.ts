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
    estado_caja = 0;
    GastosForm: FormGroup;
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
    trabajadoresList: { id: number; nombre: string }[] = [
        { id: 1, nombre: 'Juan Pérez' },
        { id: 2, nombre: 'María García' },
        { id: 3, nombre: 'Carlos López' },
        { id: 4, nombre: 'Ana Martínez' },
        { id: 5, nombre: 'Luis Rodríguez' },
        { id: 6, nombre: 'Sofia Torres' },
        { id: 7, nombre: 'Diego Ramírez' },
        { id: 8, nombre: 'Laura Fernández' }
    ];

    constructor(private AperturaService_: AperturaService, private pedidoService_: PedidoService, private fb: FormBuilder, private messageService: MessageService, private confirmationService: ConfirmationService, private cd: ChangeDetectorRef) {
        this.cajaForm = this.fb.group({
            estado: [1],
            caja: ['', Validators.required],
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
    }

    GuardarCaja(data: any) {
        if (data == 0) {
            if (this.cajaForm.invalid) {
                this.cajaForm.markAllAsTouched(); // 👈 fuerza mostrar todos los errores
                return;
            }
            if (this.cajaForm.valid) {
                this.AperturaService_.registrarCaja(this.cajaForm.value).subscribe((response) => {
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Successful',
                        detail: 'Apertura registrada para el dia de hoy',
                        life: 3000
                    });
                    this.ListAperturaNow();
                });
            }
        } else {
            this.confirmationService.confirm({
                message: 'Estas seguro de cerrar la caja ?',
                header: 'Confirm',
                icon: 'pi pi-exclamation-triangle',
                accept: () => {
                    this.AperturaService_.cerrarCaja(this.cajaForm.value).subscribe((response) => {
                        this.messageService.add({
                            severity: 'success',
                            summary: 'Successful',
                            detail: 'Cerrar Caja para el dia de hoy',
                            life: 3000
                        });
                        this.ListAperturaNow();
                    });
                }
            });
        }
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
            debugger;
            if (response.success) {
                if (response.data) {
                    if (response.data.length != 0) {
                        this.estado_caja = response.data[0]?.estado;
                        switch (response.data[0]?.estado) {
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

                        this.data_apertura.push(response.data[0]);
                        this.cajaForm.patchValue({
                            caja: 1,
                            responsable: response.data[0]?.responsable,
                            monto: response.data[0]?.total,
                            turno: 'Mañana',
                            estado: response.data[0]?.estado
                        });
                    } else {
                        this.cajaForm.enable();
                        this.texto_estado_caja = 'Abrir Caja?';
                    }
                } else {
                    this.texto_estado_caja = 'Abrir Caja Cerrada';
                    this.estado_caja = 0;
                }
                // else {
                //     this.texto_estado_caja = 'Abrir Caja Cerrada';
                //     this.estado_caja = 0;
                //     this.cajaForm.enable();
                // }
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
}
