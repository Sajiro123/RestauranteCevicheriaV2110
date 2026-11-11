import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import jsPDF from 'jspdf';

export interface ConfiguracionImpresion {
    impresoraCocina: string;
    impresoraCaja: string;
    tipoConexionCocina: 'bluetooth' | 'red' | 'usb';
    tipoConexionCaja: 'usb' | 'red';
    impresionDirecta: boolean; // Si es true, imprime silenciosamente sin ventana de Chrome
    imprimirCocinaAutoAlRegistrar: boolean; // Si es true, al dar "Registrar Pedido" envía la comanda a cocina
    agenteUrl: string;
}

const STORAGE_KEY = 'willy_config_impresion';

@Injectable({
    providedIn: 'root'
})
export class ImpresoraService {
    private defaultConfig: ConfiguracionImpresion = {
        impresoraCocina: '',
        impresoraCaja: '',
        tipoConexionCocina: 'bluetooth',
        tipoConexionCaja: 'usb',
        impresionDirecta: true,
        imprimirCocinaAutoAlRegistrar: true,
        agenteUrl: 'http://localhost:3333'
    };

    constructor(private http: HttpClient) {}

    /**
     * Obtiene la configuración guardada localmente o la por defecto
     */
    obtenerConfiguracion(): ConfiguracionImpresion {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                return { ...this.defaultConfig, ...JSON.parse(raw) };
            }
        } catch (e) {
            console.warn('Error leyendo configuración de impresoras:', e);
        }
        return { ...this.defaultConfig };
    }

    /**
     * Guarda la configuración de forma persistente en localStorage
     */
    guardarConfiguracion(config: ConfiguracionImpresion): void {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
        } catch (e) {
            console.error('Error guardando configuración de impresoras:', e);
        }
    }

    /**
     * Verifica si el microservicio de impresión local está activo en localhost:3333
     */
    async verificarEstadoAgente(): Promise<boolean> {
        const config = this.obtenerConfiguracion();
        const url = (config.agenteUrl || 'http://localhost:3333').replace(/\/+$/, '') + '/api/status';
        try {
            const res = await firstValueFrom(this.http.get<any>(url));
            return Boolean(res && res.ok);
        } catch {
            return false;
        }
    }

    /**
     * Obtiene la lista de impresoras físicas/virtuales instaladas en Windows
     */
    async listarImpresorasWindows(): Promise<Array<{ name: string; deviceId: string; paperSizes?: string[] }>> {
        const config = this.obtenerConfiguracion();
        const url = (config.agenteUrl || 'http://localhost:3333').replace(/\/+$/, '') + '/api/printers';
        try {
            const res = await firstValueFrom(this.http.get<{ ok: boolean; printers: any[] }>(url));
            if (res && res.ok && Array.isArray(res.printers)) {
                return res.printers;
            }
            return [];
        } catch (err) {
            console.warn('No se pudo conectar con el agente local de impresoras:', err);
            return [];
        }
    }

    /**
     * Convierte un Blob PDF a Base64
     */
    blobToBase64(blob: Blob): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = (reader.result as string) || '';
                resolve(base64String);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    /**
     * Imprime una Comanda en la impresora asignada a COCINA
     */
    async imprimirEnCocina(pdfBlobOrBase64: Blob | string, docName: string = 'Comanda_Cocina'): Promise<{ success: boolean; fallback: boolean; message: string }> {
        const config = this.obtenerConfiguracion();

        // Si la impresión directa está desactivada o no hay impresora configurada, usar visor del navegador
        if (!config.impresionDirecta || !config.impresoraCocina) {
            return {
                success: false,
                fallback: true,
                message: !config.impresoraCocina ? 'No hay impresora de cocina configurada' : 'Impresión directa desactivada'
            };
        }

        return this.enviarAlAgente(config.impresoraCocina, pdfBlobOrBase64, docName);
    }

    /**
     * Imprime un Ticket/Pre-cuenta/Comprobante en la impresora asignada a CAJA
     */
    async imprimirEnCaja(pdfBlobOrBase64: Blob | string, docName: string = 'Ticket_Caja'): Promise<{ success: boolean; fallback: boolean; message: string }> {
        const config = this.obtenerConfiguracion();

        // Si la impresión directa está desactivada o no hay impresora configurada, usar visor del navegador
        if (!config.impresionDirecta || !config.impresoraCaja) {
            return {
                success: false,
                fallback: true,
                message: !config.impresoraCaja ? 'No hay impresora de caja configurada' : 'Impresión directa desactivada'
            };
        }

        return this.enviarAlAgente(config.impresoraCaja, pdfBlobOrBase64, docName);
    }

    /**
     * Envía la petición de impresión al microservicio local en Windows
     */
    private async enviarAlAgente(printerName: string, pdfBlobOrBase64: Blob | string, docName: string): Promise<{ success: boolean; fallback: boolean; message: string }> {
        const config = this.obtenerConfiguracion();
        const url = (config.agenteUrl || 'http://localhost:3333').replace(/\/+$/, '') + '/api/print';

        try {
            let base64 = '';
            if (typeof pdfBlobOrBase64 === 'string') {
                base64 = pdfBlobOrBase64;
            } else if (pdfBlobOrBase64 instanceof Blob) {
                base64 = await this.blobToBase64(pdfBlobOrBase64);
            }

            const payload = {
                printer: printerName,
                pdfBase64: base64,
                docName: docName
            };

            const res = await firstValueFrom(this.http.post<any>(url, payload));

            if (res && res.ok) {
                return {
                    success: true,
                    fallback: false,
                    message: res.message || `Impreso en ${printerName}`
                };
            }

            return {
                success: false,
                fallback: true,
                message: res?.message || 'Error en agente de impresión'
            };
        } catch (err: any) {
            console.warn(`Error al imprimir en '${printerName}'. Haciendo fallback al visor PDF:`, err);
            return {
                success: false,
                fallback: true,
                message: err?.message || 'No se pudo conectar con el agente local'
            };
        }
    }

    /**
     * Genera un ticket de prueba y lo envía a la impresora seleccionada
     */
    async imprimirTicketPrueba(destino: 'cocina' | 'caja'): Promise<{ success: boolean; message: string }> {
        const config = this.obtenerConfiguracion();
        const nombreImpresora = destino === 'cocina' ? config.impresoraCocina : config.impresoraCaja;

        if (!nombreImpresora) {
            return {
                success: false,
                message: `Primero debe seleccionar la impresora para ${destino === 'cocina' ? 'Cocina' : 'Caja'}`
            };
        }

        // Crear documento PDF de prueba de 80mm
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: [80, 95]
        });

        const now = new Date();
        const fechaHora = now.toLocaleString('es-PE', { timeZone: 'America/Lima' });

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text('CEVICHERIA WILLY', 40, 10, { align: 'center' });

        doc.setFontSize(11);
        const titulo = destino === 'cocina' ? 'PRUEBA - IMPRESORA COCINA' : 'PRUEBA - IMPRESORA CAJA';
        doc.text(titulo, 40, 18, { align: 'center' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.text(`Fecha y Hora: ${fechaHora}`, 40, 25, { align: 'center' });
        doc.text(`Destino: ${nombreImpresora}`, 40, 30, { align: 'center' });
        doc.text(`Conexión: ${destino === 'cocina' ? config.tipoConexionCocina.toUpperCase() : config.tipoConexionCaja.toUpperCase()}`, 40, 35, { align: 'center' });

        doc.setLineWidth(0.3);
        doc.line(5, 38, 75, 38);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.text('ESTADO DEL SISTEMA:', 5, 45);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text('✔ Comunicacion bidireccional OK', 5, 52);
        doc.text('✔ Driver de Windows configurado', 5, 58);
        doc.text('✔ Impresion silenciosa 1-clic activa', 5, 64);

        doc.line(5, 68, 75, 68);

        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        doc.text('¡Configuracion exitosa lista para operar!', 40, 75, { align: 'center' });
        doc.text('-----------------------------------', 40, 80, { align: 'center' });

        const pdfBlob = doc.output('blob');
        const res = await this.enviarAlAgente(nombreImpresora, pdfBlob, `Test_${destino}`);

        if (res.success) {
            return {
                success: true,
                message: `Ticket de prueba enviado con éxito a ${nombreImpresora}`
            };
        } else {
            return {
                success: false,
                message: res.message || 'No se pudo enviar el ticket de prueba'
            };
        }
    }
}

