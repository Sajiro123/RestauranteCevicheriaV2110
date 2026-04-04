import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
    selector: 'app-emitir-comprobante',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './emitir-comprobante.component.html',
    styleUrls: ['./emitir-comprobante.component.css']
})
export class EmitirComprobanteComponent {
    private http = inject(HttpClient);
    private sanitizer = inject(DomSanitizer);

    // ID del pedido que viene de tu tabla o vista anterior
    idPedidoActual: number = 123; // Ejemplo

    // Estado del UI
    tipoComprobante: '01' | '03' = '03'; // '03' = Boleta (por defecto), '01' = Factura
    documentoBusqueda: string = '';
    clienteEncontrado: any = null;

    // Modal de registro
    mostrarModalCliente: boolean = false;
    nuevoCliente = {
        tipo_doc: '1', // 1 = DNI, 6 = RUC
        num_doc: '',
        razon_social: '',
        direccion: ''
    };

    // PDF Modal
    pdfDialog: boolean = false;
    pdfUrl: SafeResourceUrl | null = null;
    comprobanteTicket: string = '';
    comprobanteMessage: string = '';

    // 1. Cambiar entre Boleta y Factura
    seleccionarTipo(tipo: '01' | '03') {
        this.tipoComprobante = tipo;
        this.clienteEncontrado = null; // Limpiamos si cambia de tipo
        this.documentoBusqueda = '';

        // Preconfigurar el modal según el tipo
        this.nuevoCliente.tipo_doc = tipo === '01' ? '6' : '1';
    }

    // 2. Simular búsqueda en tu BD
    buscarCliente() {
        if (!this.documentoBusqueda) return;

        // Aquí harías un this.http.get('/api/clientes/' + this.documentoBusqueda)
        // Para el ejemplo, simularemos que no lo encuentra para abrir el modal
        const encontrado = false;

        if (encontrado) {
            // Asignar datos si existe
            this.clienteEncontrado = { /* datos de tu BD */ };
        } else {
            // Si no existe, pre-llenamos el modal y lo abrimos
            this.nuevoCliente.num_doc = this.documentoBusqueda;
            this.nuevoCliente.razon_social = '';
            this.nuevoCliente.direccion = '';
            this.mostrarModalCliente = true;
        }
    }

    // 3. Guardar cliente nuevo
    guardarCliente() {
        // Aquí harías un this.http.post('/api/clientes', this.nuevoCliente)

        // Simulamos éxito
        this.clienteEncontrado = { ...this.nuevoCliente };
        this.mostrarModalCliente = false;
    }

    // 4. EL PASO FINAL: Enviar a Laravel
    emitirComprobante() {
        if (!this.clienteEncontrado) {
            alert('Debes seleccionar o registrar un cliente primero');
            return;
        }

        const payload = {
            idpedido: this.idPedidoActual,
            tipo_doc: this.tipoComprobante,
            cliente: this.clienteEncontrado
        };

        // Llamada a la API de Laravel
        this.http.post('http://127.0.0.1:8000/api/emitir-comprobante-prueba', payload)
            .subscribe({
                next: (res: any) => {
                    console.log('¡Éxito!', res);
                    if (res.success && res.pdf) {
                        // Abrir modal con el PDF
                        this.pdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(res.pdf);
                        this.comprobanteTicket = res.ticket || '';
                        this.comprobanteMessage = res.message || 'Comprobante emitido';
                        this.pdfDialog = true;
                    }
                },
                error: (err) => {
                    console.error('Error al emitir', err);
                    alert('Hubo un error con SUNAT o la BD');
                }
            });
    }

    cerrarPdfDialog() {
        this.pdfDialog = false;
        this.pdfUrl = null;
    }
}