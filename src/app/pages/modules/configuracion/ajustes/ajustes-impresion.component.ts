import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ImportsModule } from '../../../imports';
import { ImpresoraService, ConfiguracionImpresion } from '../../../service/impresora.service';

@Component({
    selector: 'app-ajustes-impresion',
    standalone: true,
    imports: [CommonModule, FormsModule, ImportsModule],
    providers: [MessageService],
    templateUrl: './ajustes-impresion.component.html',
    styleUrls: ['./ajustes-impresion.component.scss']
})
export class AjustesImpresionComponent implements OnInit {
    @Output() backToMain = new EventEmitter<void>();

    config: ConfiguracionImpresion = {
        impresoraCocina: '',
        impresoraCaja: '',
        tipoConexionCocina: 'bluetooth',
        tipoConexionCaja: 'usb',
        impresionDirecta: true,
        imprimirCocinaAutoAlRegistrar: true,
        agenteUrl: 'http://localhost:3333'
    };

    agenteConectado: boolean = false;
    verificandoAgente: boolean = false;
    guardando: boolean = false;

    probandoCocina: boolean = false;
    probandoCaja: boolean = false;

    impresorasDisponibles: Array<{ label: string; value: string }> = [];

    tiposConexionCocina = [
        { label: 'Bluetooth 📶', value: 'bluetooth' },
        { label: 'Cable USB 🔌', value: 'usb' },
        { label: 'Red LAN / Wi-Fi 🌐', value: 'red' }
    ];

    tiposConexionCaja = [
        { label: 'Cable USB 🔌', value: 'usb' },
        { label: 'Red LAN / Wi-Fi 🌐', value: 'red' }
    ];

    constructor(
        private impresoraService: ImpresoraService,
        private messageService: MessageService
    ) {}

    async ngOnInit(): Promise<void> {
        this.config = this.impresoraService.obtenerConfiguracion();
        await this.comprobarAgenteYListarImpresoras();
    }

    volver(): void {
        this.backToMain.emit();
    }

    async comprobarAgenteYListarImpresoras(): Promise<void> {
        this.verificandoAgente = true;
        try {
            this.agenteConectado = await this.impresoraService.verificarEstadoAgente();

            if (this.agenteConectado) {
                const lista = await this.impresoraService.listarImpresorasWindows();
                this.impresorasDisponibles = lista.map((p) => ({
                    label: p.name,
                    value: p.name
                }));

                // Si aún no hay seleccionada y hay disponibles, preseleccionar inteligente
                if (!this.config.impresoraCocina && this.impresorasDisponibles.length > 0) {
                    const cocinaMatch = this.impresorasDisponibles.find((p) => /cocina|kitchen|bluetooth|bt/i.test(p.label));
                    if (cocinaMatch) this.config.impresoraCocina = cocinaMatch.value;
                }

                if (!this.config.impresoraCaja && this.impresorasDisponibles.length > 0) {
                    const cajaMatch = this.impresorasDisponibles.find((p) => /caja|pos|receipt|ticket|usb/i.test(p.label));
                    if (cajaMatch) this.config.impresoraCaja = cajaMatch.value;
                }
            } else {
                this.impresorasDisponibles = [];
            }
        } catch (e) {
            this.agenteConectado = false;
        } finally {
            this.verificandoAgente = false;
        }
    }

    guardarAjustes(): void {
        this.guardando = true;
        this.impresoraService.guardarConfiguracion(this.config);

        setTimeout(() => {
            this.guardando = false;
            this.messageService.add({
                severity: 'success',
                summary: '¡Configuración Guardada!',
                detail: 'Los ajustes de Cocina y Caja fueron actualizados correctamente.',
                life: 3500
            });
        }, 300);
    }

    async probarImpresoraCocina(): Promise<void> {
        if (!this.config.impresoraCocina) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Seleccione Impresora',
                detail: 'Seleccione o ingrese el nombre de la impresora de Cocina.',
                life: 3000
            });
            return;
        }

        this.probandoCocina = true;
        try {
            const res = await this.impresoraService.imprimirTicketPrueba('cocina');
            if (res.success) {
                this.messageService.add({
                    severity: 'success',
                    summary: 'Ticket Enviado a Cocina',
                    detail: res.message,
                    life: 4000
                });
            } else {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Fallo al Imprimir en Cocina',
                    detail: res.message,
                    life: 5000
                });
            }
        } finally {
            this.probandoCocina = false;
        }
    }

    async probarImpresoraCaja(): Promise<void> {
        if (!this.config.impresoraCaja) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Seleccione Impresora',
                detail: 'Seleccione o ingrese el nombre de la impresora de Caja.',
                life: 3000
            });
            return;
        }

        this.probandoCaja = true;
        try {
            const res = await this.impresoraService.imprimirTicketPrueba('caja');
            if (res.success) {
                this.messageService.add({
                    severity: 'success',
                    summary: 'Ticket Enviado a Caja',
                    detail: res.message,
                    life: 4000
                });
            } else {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Fallo al Imprimir en Caja',
                    detail: res.message,
                    life: 5000
                });
            }
        } finally {
            this.probandoCaja = false;
        }
    }
}

