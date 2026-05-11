import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ImportsModule } from '../../imports';
import { MessageService } from 'primeng/api';
import { AuthService } from '../../../services/auth.service';
import { AsistenciaService, Asistencia } from '../../../services/asistencia.service';

@Component({
    selector: 'app-asistencia',
    standalone: true,
    imports: [CommonModule, ImportsModule],
    providers: [MessageService],
    templateUrl: './asistencia.component.html',
    styleUrl: './asistencia.component.scss'
})
export class AsistenciaComponent implements OnInit {
    /** Estado de la acción principal */
    loading       = false;
    checkingState = true;

    /** ¿Ya marcó asistencia hoy? */
    yaMarco = false;

    /** Historial de asistencias del usuario */
    historial: Asistencia[] = [];
    loadingHistorial = false;

    /** Datos del último registro exitoso */
    ultimoRegistro: Asistencia | null = null;

    /** IP pública detectada */
    ipActual = '';
    checkingIp = false;

    /** Tab activo */
    tabActivo = 0;

    constructor(
        private authService: AuthService,
        private asistenciaService: AsistenciaService,
        private messageService: MessageService
    ) {}

    ngOnInit(): void {
        this.inicializar();
    }

    async inicializar() {
        this.checkingState = true;
        const user = this.authService.getCurrentUser();
        if (!user) { this.checkingState = false; return; }

        // Verificar si ya marcó hoy
        this.yaMarco = await this.asistenciaService.yaMarcoHoy(user.idusuario);

        // Detectar IP actual
        this.checkingIp = true;
        this.ipActual = await this.asistenciaService.obtenerIpPublica();
        this.checkingIp = false;

        // Cargar historial
        await this.cargarHistorial();

        this.checkingState = false;
    }

    async cargarHistorial() {
        const user = this.authService.getCurrentUser();
        if (!user) return;

        this.loadingHistorial = true;
        const result = await this.asistenciaService.getMisAsistencias(user.idusuario, 20);
        if (result.success) {
            this.historial = result.data;
            // Si hay registros de hoy, guardar el último
            if (result.data.length > 0) {
                const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
                this.ultimoRegistro = result.data.find(a => a.fecha === hoy) ?? null;
            }
        }
        this.loadingHistorial = false;
    }

    async marcarAsistencia() {
        const user = this.authService.getCurrentUser();
        if (!user) {
            this.messageService.add({
                severity: 'error',
                summary: 'Sin sesión',
                detail: 'Debes iniciar sesión para registrar tu asistencia.',
                life: 4000
            });
            return;
        }

        this.loading = true;

        try {
            const result = await this.asistenciaService.registrar(user.idusuario);

            if (result.success && result.data) {
                this.yaMarco = true;
                this.ultimoRegistro = result.data;
                // Actualizar IP mostrada
                this.ipActual = result.data.ip_cliente;

                this.messageService.add({
                    severity: 'success',
                    summary: '✅ Asistencia registrada',
                    detail: `Bienvenido/a, ${user.nombre}. Registrado a las ${result.data.hora_registro}`,
                    life: 5000
                });

                await this.cargarHistorial();

            } else if (result.forbidden) {
                this.messageService.add({
                    severity: 'error',
                    summary: '🚫 Red no autorizada',
                    detail: 'Debes estar conectado al Wi-Fi de la casa.',
                    life: 6000
                });
            } else {
                this.messageService.add({
                    severity: 'warn',
                    summary: 'Aviso',
                    detail: result.error ?? 'No se pudo registrar la asistencia.',
                    life: 5000
                });
            }
        } catch (err) {
            this.messageService.add({
                severity: 'error',
                summary: 'Error inesperado',
                detail: 'Ocurrió un problema. Intenta nuevamente.',
                life: 4000
            });
        } finally {
            this.loading = false;
        }
    }

    get nombreUsuario(): string {
        return this.authService.getCurrentUser()?.nombre ?? 'Usuario';
    }

    get fechaHoy(): string {
        return new Date().toLocaleDateString('es-PE', {
            timeZone: 'America/Lima',
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    get horaActual(): string {
        return new Date().toLocaleTimeString('es-PE', {
            timeZone: 'America/Lima',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });
    }

    formatFecha(fecha: string): string {
        if (!fecha) return '-';
        const d = new Date(fecha + 'T00:00:00');
        return d.toLocaleDateString('es-PE', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: '2-digit'
        });
    }
}
