import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';
import { PedidoService } from '../../pages/service/pedido.service';
import { ImportsModule } from '../../pages/imports';

@Component({
    selector: 'app-alerta-whatsapp',
    standalone: true,
    imports: [CommonModule, ImportsModule],
    template: `
        <!-- DIÁLOGO MODAL GIGANTE DE ALERTA ROJA URGENTE -->
        <p-dialog
            [(visible)]="visible"
            [modal]="true"
            [closable]="false"
            [draggable]="false"
            [resizable]="false"
            [style]="{ width: '92vw', maxWidth: '650px' }"
            styleClass="alerta-whatsapp-dialog"
        >
            <ng-template pTemplate="header">
                <div class="flex items-center justify-between w-full p-2 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white rounded-t-lg -m-6 mb-0 px-6 py-4 shadow-xl border-b-2 border-red-500 animate-pulse">
                    <div class="flex items-center gap-3">
                        <div class="w-12 h-12 rounded-full bg-white text-red-600 flex items-center justify-center text-2xl shadow-lg font-bold">
                            <i class="pi pi-bell text-2xl animate-bounce"></i>
                        </div>
                        <div>
                            <div class="flex items-center gap-2">
                                <span class="text-xs uppercase tracking-wider font-extrabold bg-red-800/90 px-2 py-0.5 rounded text-red-100 border border-red-400/40">
                                    ¡ALERTA URGENTE!
                                </span>
                                <span class="text-xs font-bold text-red-200">DELIVERY WHATSAPP</span>
                            </div>
                            <h2 class="text-xl sm:text-2xl font-black text-white m-0 leading-tight">
                                NUEVO PEDIDO #{{ pedido?.idpedido }}
                            </h2>
                        </div>
                    </div>
                    <button
                        (click)="silenciar()"
                        class="px-3 py-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow"
                        title="Silenciar sonido de alarma"
                    >
                        <i [ngClass]="sonando ? 'pi pi-volume-up animate-spin' : 'pi pi-volume-off'"></i>
                        {{ sonando ? 'Silenciar Alarma' : 'Silenciado' }}
                    </button>
                </div>
            </ng-template>

            <div class="flex flex-col gap-4 mt-6" *ngIf="pedido">
                <!-- Tarjeta de Cliente y Pago -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div class="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                        <span class="text-xs text-slate-500 font-semibold uppercase tracking-wider flex items-center gap-1.5 mb-1">
                            <i class="pi pi-user text-red-600"></i> Cliente
                        </span>
                        <div class="text-base font-black text-slate-800">{{ pedido.cliente || 'Cliente WhatsApp' }}</div>
                        <div class="text-xs text-slate-600 mt-1 flex items-center gap-2" *ngIf="pedido.telefono">
                            <i class="pi pi-whatsapp text-emerald-600 text-sm"></i>
                            <span class="font-bold font-mono">{{ pedido.telefono }}</span>
                            <a
                                [href]="'https://wa.me/' + cleanPhone(pedido.telefono)"
                                target="_blank"
                                class="text-[11px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold hover:bg-emerald-200"
                            >
                                Abrir Chat
                            </a>
                        </div>
                    </div>

                    <div class="p-3.5 bg-red-50/80 border border-red-200 rounded-xl">
                        <span class="text-xs text-red-700 font-semibold uppercase tracking-wider flex items-center gap-1.5 mb-1">
                            <i class="pi pi-wallet text-red-600"></i> Pago (Cobro pendiente)
                        </span>
                        <div class="text-base font-black text-red-900 flex items-center gap-2">
                            <span>{{ pedido.metodo_pago || 'Por coordinar' }}</span>
                            <span class="text-xs px-2 py-0.5 bg-red-100 text-red-800 border border-red-300 rounded font-black">
                                NO COBRADO
                            </span>
                        </div>
                        <div class="text-xs text-red-800 mt-1" *ngIf="pedido.metodo_pago === 'Efectivo' && pedido.paga_con > 0">
                            Paga con: <b>S/ {{ pedido.paga_con | number:'1.2-2' }}</b> | Vuelto: <b class="text-red-700 font-black">S/ {{ calcularVuelto() | number:'1.2-2' }}</b>
                        </div>
                    </div>
                </div>

                <!-- Dirección / GPS -->
                <div class="p-3 bg-rose-50/60 border border-rose-200 rounded-xl flex items-start justify-between gap-3" *ngIf="pedido.direccion || pedido.latitud">
                    <div class="flex items-start gap-2">
                        <i class="pi pi-map-marker text-red-600 text-lg mt-0.5"></i>
                        <div>
                            <span class="text-xs font-bold text-red-900 uppercase tracking-wider block">Dirección de Entrega:</span>
                            <p class="text-sm font-semibold text-slate-800 m-0">{{ pedido.direccion || 'Ubicación GPS' }}</p>
                        </div>
                    </div>
                    <a
                        *ngIf="pedido.latitud && pedido.longitud"
                        [href]="'https://maps.google.com/?q=' + pedido.latitud + ',' + pedido.longitud"
                        target="_blank"
                        class="flex-shrink-0 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow"
                    >
                        <i class="pi pi-external-link"></i> Ver Mapa GPS
                    </a>
                </div>

                <!-- Detalle de Platos -->
                <div class="border border-slate-200 rounded-xl overflow-hidden">
                    <div class="bg-slate-100 px-3.5 py-2 border-b border-slate-200 flex justify-between items-center">
                        <span class="text-xs font-black text-slate-700 uppercase tracking-wider">
                            <i class="pi pi-list mr-1"></i> Platos Solicitados ({{ detalles.length }})
                        </span>
                        <span class="text-xs text-slate-500 font-semibold">Total Ítems: {{ pedido.total_pedidos }}</span>
                    </div>
                    <div class="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                        <div *ngFor="let item of detalles" class="px-3.5 py-2.5 flex justify-between items-center hover:bg-slate-50 text-sm">
                            <div class="flex items-center gap-2.5">
                                <span class="w-6 h-6 rounded-full bg-red-100 text-red-800 font-black text-xs flex items-center justify-center">
                                    {{ item.cantidad }}
                                </span>
                                <div>
                                    <span class="font-bold text-slate-800">{{ item.producto?.nombre || 'Plato' }}</span>
                                    <span class="text-xs text-slate-400 block" *ngIf="item.toppings">Extra: {{ item.toppings }}</span>
                                </div>
                            </div>
                            <span class="font-bold text-slate-700">S/ {{ item.total | number:'1.2-2' }}</span>
                        </div>
                        <div *ngIf="detalles.length === 0" class="p-3 text-center text-xs text-slate-400">
                            Cargando platos...
                        </div>
                    </div>
                    <div class="bg-red-50 px-4 py-3 border-t border-red-200 flex justify-between items-center">
                        <span class="text-sm font-black text-red-950 uppercase">TOTAL A COBRAR:</span>
                        <span class="text-2xl font-black text-red-600 font-mono">S/ {{ pedido.total | number:'1.2-2' }}</span>
                    </div>
                </div>

                <div class="text-xs text-slate-400 italic" *ngIf="pedido.comentario">
                    Nota: {{ pedido.comentario }}
                </div>
            </div>

            <ng-template pTemplate="footer">
                <div class="flex items-center justify-between gap-2.5 pt-3 border-t border-slate-100 w-full flex-wrap sm:flex-nowrap">
                    <button
                        pButton
                        label="Cerrar y Silenciar"
                        icon="pi pi-times"
                        class="p-button-outlined p-button-secondary font-bold text-sm"
                        (click)="cerrarAlerta()"
                    ></button>
                    <button
                        pButton
                        label="🚨 Atender Pedido e Imprimir Comanda"
                        icon="pi pi-print"
                        class="p-button-danger font-black shadow-lg shadow-red-500/40 text-sm sm:text-base px-4 py-2.5 animate-pulse"
                        (click)="atenderPedido()"
                    ></button>
                </div>
            </ng-template>
        </p-dialog>
    `,
    styles: [`
        :host ::ng-deep .alerta-whatsapp-dialog .p-dialog {
            border: 3px solid #dc2626 !important;
            box-shadow: 0 0 45px rgba(220, 38, 38, 0.45), 0 25px 50px -12px rgba(0, 0, 0, 0.25) !important;
            border-radius: 1.25rem !important;
            overflow: hidden;
        }
        :host ::ng-deep .alerta-whatsapp-dialog .p-dialog-header {
            padding: 0 !important;
            border: none !important;
        }
        :host ::ng-deep .alerta-whatsapp-dialog .p-dialog-content {
            padding: 1.25rem 1.5rem !important;
        }
    `]
})
export class AlertaWhatsappComponent implements OnInit, OnDestroy {
    visible: boolean = false;
    pedido: any = null;
    detalles: any[] = [];
    sonando: boolean = false;

    private audioCtx: any = null;
    private soundInterval: any = null;
    private channel: any = null;

    constructor(
        private supabaseService: SupabaseService,
        private pedidoService: PedidoService,
        private router: Router
    ) {}

    ngOnInit(): void {
        this.iniciarListenerRealtime();
    }

    ngOnDestroy(): void {
        this.silenciar();
        if (this.channel) {
            this.supabaseService.client.removeChannel(this.channel);
        }
    }

    private iniciarListenerRealtime(): void {
        try {
            this.channel = this.supabaseService.client
                .channel('realtime-pedidos-whatsapp')
                .on(
                    'postgres_changes',
                    { event: 'INSERT', schema: 'public', table: 'pedido' },
                    async (payload: any) => {
                        const nuevo = payload.new;
                        // Solo pedidos de Delivery (mesa 0)
                        if (nuevo && String(nuevo.mesa) === '0') {
                            await this.activarAlerta(nuevo);
                        }
                    }
                )
                .subscribe();
        } catch (error) {
            console.error('Error iniciando Realtime en AlertaWhatsapp:', error);
        }
    }

    async activarAlerta(pedidoData: any): Promise<void> {
        this.pedido = pedidoData;
        this.detalles = [];
        this.visible = true;

        // Iniciar sonido de campana en bucle
        this.iniciarSonido();

        // Notificar inmediatamente a HomeComponent para actualizar la lista de pedidos en tiempo real
        this.pedidoService.notificarNuevoPedidoWhatsApp(pedidoData);

        // Cargar platos del pedido
        try {
            const { data } = await this.supabaseService.client
                .from('pedidodetalle')
                .select(`
                    idpedidodetalle,
                    cantidad,
                    precioU,
                    total,
                    toppings,
                    producto:idproducto (nombre, acronimo)
                `)
                .eq('idpedido', pedidoData.idpedido);

            this.detalles = data || [];
        } catch (e) {
            console.error('Error cargando detalles del pedido para alerta:', e);
        }
    }

    // Generador de sonido de campana de restaurante usando Web Audio API
    private iniciarSonido(): void {
        this.sonando = true;
        this.reproducirCampana();
        // Repetir cada 3.2 segundos hasta que lo atiendan o silencien
        if (this.soundInterval) clearInterval(this.soundInterval);
        this.soundInterval = setInterval(() => {
            if (this.visible && this.sonando) {
                this.reproducirCampana();
            } else {
                this.silenciar();
            }
        }, 3200);
    }

    private reproducirCampana(): void {
        try {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioContextClass) return;
            if (!this.audioCtx) {
                this.audioCtx = new AudioContextClass();
            }
            if (this.audioCtx.state === 'suspended') {
                this.audioCtx.resume();
            }

            const ctx = this.audioCtx;
            const now = ctx.currentTime;

            // Secuencia armónica ding-dong-dong de alta atención
            const notas = [880, 1046.5, 1318.5]; // La5, Do6, Mi6
            notas.forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, now + idx * 0.14);

                gain.gain.setValueAtTime(0.35, now + idx * 0.14);
                gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.14 + 1.2);

                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.start(now + idx * 0.14);
                osc.stop(now + idx * 0.14 + 1.25);
            });
        } catch (err) {
            console.warn('AudioContext no disponible o bloqueado:', err);
        }
    }

    silenciar(): void {
        this.sonando = false;
        if (this.soundInterval) {
            clearInterval(this.soundInterval);
            this.soundInterval = null;
        }
    }

    cerrarAlerta(): void {
        this.silenciar();
        this.visible = false;
    }

    atenderPedido(): void {
        const pedidoSeleccionado = this.pedido;
        this.cerrarAlerta();

        if (this.router.url !== '/') {
            this.router.navigate(['/']).then(() => {
                setTimeout(() => {
                    this.pedidoService.ejecutarSeleccionEImpresion(pedidoSeleccionado);
                }, 400);
            });
        } else {
            this.pedidoService.ejecutarSeleccionEImpresion(pedidoSeleccionado);
        }
    }

    calcularVuelto(): number {
        if (!this.pedido) return 0;
        const total = Number(this.pedido.total) || 0;
        const pagaCon = Number(this.pedido.paga_con) || 0;
        return Math.max(0, pagaCon - total);
    }

    cleanPhone(phone: string): string {
        if (!phone) return '';
        return phone.replace(/[^0-9]/g, '');
    }
}
