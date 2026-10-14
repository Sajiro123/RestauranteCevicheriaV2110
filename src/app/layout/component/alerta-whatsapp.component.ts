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
        <!-- DIÁLOGO MODAL ELEGANTE DE ALERTA DELIVERY WHATSAPP -->
        <p-dialog
            [(visible)]="visible"
            [modal]="true"
            [closable]="false"
            [draggable]="false"
            [resizable]="false"
            [style]="{ width: '92vw', maxWidth: '640px' }"
            styleClass="alerta-whatsapp-dialog"
        >
            <ng-template pTemplate="header">
                <div class="flex items-center justify-between w-full p-2 bg-gradient-to-r from-rose-600 to-rose-700 text-white rounded-t-lg -m-6 mb-0 px-5 py-3.5 shadow-md border-b border-rose-400/30">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-full bg-white text-rose-600 flex items-center justify-center text-xl shadow-md font-bold flex-shrink-0">
                            <i class="pi pi-bell text-xl"></i>
                        </div>
                        <div>
                            <div class="flex items-center gap-2">
                                <span class="text-[11px] uppercase tracking-wider font-extrabold bg-rose-800/80 px-2 py-0.5 rounded text-rose-100 border border-rose-400/30">
                                    NUEVO PEDIDO
                                </span>
                                <span class="text-xs font-bold text-rose-200">DELIVERY WHATSAPP</span>
                            </div>
                            <h2 class="text-lg sm:text-xl font-black text-white m-0 leading-tight">
                                PEDIDO #{{ pedido?.idpedido }}
                            </h2>
                        </div>
                    </div>
                    <button
                        (click)="silenciar()"
                        class="px-3 py-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
                        title="Silenciar sonido de alarma"
                    >
                        <i [ngClass]="sonando ? 'pi pi-volume-up' : 'pi pi-volume-off'"></i>
                        {{ sonando ? 'Silenciar Alarma' : 'Silenciado' }}
                    </button>
                </div>
            </ng-template>

            <div class="flex flex-col gap-3.5 mt-5" *ngIf="pedido">
                <!-- Tarjeta de Cliente y Pago -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <!-- Tarjeta Cliente con Teléfono -->
                    <div class="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-between">
                        <div>
                            <div class="flex items-center justify-between mb-1">
                                <span class="text-[11px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
                                    <i class="pi pi-user text-rose-600"></i> Cliente
                                </span>
                                <span class="text-[10px] bg-rose-100 text-rose-800 font-extrabold px-1.5 py-0.5 rounded border border-rose-200">
                                    Delivery
                                </span>
                            </div>
                            <div class="text-base sm:text-lg font-black text-slate-800 leading-tight">
                                {{ pedido.cliente || 'Cliente WhatsApp' }}
                            </div>
                        </div>

                        <!-- Número de Teléfono / WhatsApp -->
                        <div class="mt-2.5 pt-2 border-t border-slate-200/70 flex items-center justify-between gap-2 flex-wrap">
                            <div class="flex items-center gap-1.5">
                                <i class="pi pi-whatsapp text-emerald-600 text-base font-bold"></i>
                                <span class="text-sm font-black text-slate-800 font-mono">
                                    {{ formatTelefono(pedido.telefono) }}
                                </span>
                            </div>
                            <a
                                *ngIf="pedido.telefono"
                                [href]="'https://wa.me/' + cleanPhone(pedido.telefono)"
                                target="_blank"
                                class="text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-0.5 rounded-md font-bold shadow-xs transition-colors inline-flex items-center gap-1"
                            >
                                <i class="pi pi-comments text-[10px]"></i> Chat
                            </a>
                        </div>
                    </div>

                    <!-- Tarjeta Pago -->
                    <div class="p-3 bg-rose-50/70 border border-rose-200/80 rounded-xl flex flex-col justify-between">
                        <div>
                            <span class="text-[11px] text-rose-800 font-bold uppercase tracking-wider flex items-center gap-1.5 mb-1">
                                <i class="pi pi-wallet text-rose-600"></i> Pago
                            </span>
                            <div class="text-base font-black text-rose-950 flex items-center gap-2">
                                <span>{{ pedido.metodo_pago || 'Por coordinar' }}</span>
                                <span class="text-[10px] px-1.5 py-0.5 bg-rose-100 text-rose-800 border border-rose-300 rounded font-black">
                                    NO COBRADO
                                </span>
                            </div>
                        </div>
                        <div class="text-xs text-rose-900 font-bold mt-2 pt-2 border-t border-rose-200/60" *ngIf="pedido.metodo_pago === 'Efectivo' && pedido.paga_con > 0">
                            Paga con: <b>S/ {{ pedido.paga_con | number:'1.2-2' }}</b> | Vuelto: <b class="text-rose-700 font-black">S/ {{ calcularVuelto() | number:'1.2-2' }}</b>
                        </div>
                    </div>
                </div>

                <!-- Dirección / GPS -->
                <div class="p-2.5 bg-rose-50/50 border border-rose-200/70 rounded-xl flex items-start justify-between gap-3" *ngIf="pedido.direccion || pedido.latitud">
                    <div class="flex items-start gap-2">
                        <i class="pi pi-map-marker text-rose-600 text-base mt-0.5"></i>
                        <div>
                            <span class="text-[11px] font-bold text-rose-950 uppercase tracking-wider block">Dirección de Entrega:</span>
                            <p class="text-xs sm:text-sm font-semibold text-slate-800 m-0 leading-snug">{{ pedido.direccion || 'Ubicación GPS' }}</p>
                        </div>
                    </div>
                    <a
                        *ngIf="pedido.latitud && pedido.longitud"
                        [href]="'https://maps.google.com/?q=' + pedido.latitud + ',' + pedido.longitud"
                        target="_blank"
                        class="flex-shrink-0 px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs"
                    >
                        <i class="pi pi-external-link text-[10px]"></i> Ver GPS
                    </a>
                </div>

                <!-- Detalle de Platos -->
                <div class="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                    <div class="bg-slate-100 px-3 py-1.5 border-b border-slate-200 flex justify-between items-center">
                        <span class="text-xs font-black text-slate-700 uppercase tracking-wider">
                            <i class="pi pi-list mr-1"></i> Platos Solicitados ({{ detalles.length }})
                        </span>
                        <span class="text-xs text-slate-500 font-semibold">Total Ítems: {{ pedido.total_pedidos }}</span>
                    </div>
                    <div class="divide-y divide-slate-100 max-h-40 overflow-y-auto">
                        <div *ngFor="let item of detalles" class="px-3 py-2 flex justify-between items-center hover:bg-slate-50 text-sm">
                            <div class="flex items-center gap-2">
                                <span class="w-5 h-5 rounded-full bg-rose-100 text-rose-800 font-black text-xs flex items-center justify-center">
                                    {{ item.cantidad }}
                                </span>
                                <div>
                                    <span class="font-bold text-slate-800 text-xs sm:text-sm">{{ item.producto?.nombre || 'Plato' }}</span>
                                    <span class="text-[11px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-1 py-0.5 rounded block mt-0.5" *ngIf="formatToppings(item.toppings)">
                                        ⚠️ {{ formatToppings(item.toppings) }}
                                    </span>
                                </div>
                            </div>
                            <span class="font-bold text-slate-700 text-xs sm:text-sm">S/ {{ item.total | number:'1.2-2' }}</span>
                        </div>
                        <div *ngIf="detalles.length === 0" class="p-3 text-center text-xs text-slate-400">
                            Cargando platos...
                        </div>
                    </div>
                    <div class="bg-rose-50/60 px-3.5 py-2.5 border-t border-rose-200 flex justify-between items-center">
                        <span class="text-xs sm:text-sm font-black text-rose-950 uppercase">TOTAL A COBRAR:</span>
                        <span class="text-xl sm:text-2xl font-black text-rose-700 font-mono">S/ {{ pedido.total | number:'1.2-2' }}</span>
                    </div>
                </div>

                <!-- NOTA COCINA DESTACADA (GRANDE Y EN NEGRITA) -->
                <div class="p-3 bg-amber-50 border-2 border-amber-400 rounded-xl flex flex-col gap-1 shadow-xs" *ngIf="obtenerNotaCocina(pedido.comentario)">
                    <div class="flex items-center gap-1.5 text-xs font-black uppercase text-amber-900 tracking-wider">
                        <i class="pi pi-exclamation-triangle text-amber-600 text-base"></i>
                        <span>INDICACIÓN ESPECIAL DE COCINA:</span>
                    </div>
                    <div class="text-base sm:text-lg font-black text-amber-950 tracking-wide leading-snug">
                        "{{ obtenerNotaCocina(pedido.comentario) }}"
                    </div>
                </div>

                <!-- OBSERVACIONES / DETALLES DEL PEDIDO (TEXTO MÁS GRANDE Y EN NEGRITA) -->
                <div class="p-3 bg-slate-100 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 flex items-start gap-2 shadow-xs" *ngIf="pedido.comentario">
                    <i class="pi pi-info-circle text-rose-600 text-base mt-0.5 flex-shrink-0"></i>
                    <div class="flex flex-col gap-0.5">
                        <span class="text-[11px] font-bold uppercase tracking-wider text-slate-500">Nota / Detalle del Pedido:</span>
                        <span class="font-bold text-slate-900 leading-snug">{{ pedido.comentario }}</span>
                    </div>
                </div>
            </div>

            <ng-template pTemplate="footer">
                <div class="flex items-center justify-between gap-2.5 pt-3 border-t border-slate-100 w-full flex-wrap sm:flex-nowrap">
                    <button
                        pButton
                        label="Cerrar y Silenciar"
                        icon="pi pi-times"
                        class="p-button-outlined p-button-secondary font-bold text-xs sm:text-sm"
                        (click)="cerrarAlerta()"
                    ></button>
                    <button
                        pButton
                        label="🚨 Atender Pedido e Imprimir Comanda"
                        icon="pi pi-print"
                        class="p-button-danger font-black shadow-md text-xs sm:text-sm px-4 py-2.5 bg-rose-600 hover:bg-rose-700 border-none"
                        (click)="atenderPedido()"
                    ></button>
                </div>
            </ng-template>
        </p-dialog>
    `,
    styles: [`
        :host ::ng-deep .alerta-whatsapp-dialog .p-dialog {
            border: 2px solid #fda4af !important;
            box-shadow: 0 20px 35px -10px rgba(0, 0, 0, 0.18), 0 10px 15px -3px rgba(225, 29, 72, 0.12) !important;
            border-radius: 1.25rem !important;
            overflow: hidden;
        }
        :host ::ng-deep .alerta-whatsapp-dialog .p-dialog-header {
            padding: 0 !important;
            border: none !important;
        }
        :host ::ng-deep .alerta-whatsapp-dialog .p-dialog-content {
            padding: 1rem 1.25rem !important;
        }
    `]
})
export class AlertaWhatsappComponent implements OnInit, OnDestroy {
    visible: boolean = false;
    pedido: any = null;
    detalles: any[] = [];
    sonando: boolean = false;

    // Control para que un pedido cerrado o atendido NUNCA vuelva a disparar el modal
    private pedidosSilenciadosOCerrados: Set<number> = new Set<number>();

    private audioCtx: any = null;
    private soundInterval: any = null;
    private channel: any = null;

    constructor(
        private supabaseService: SupabaseService,
        private pedidoService: PedidoService,
        private router: Router
    ) {}

    ngOnInit(): void {
        this.cargarPedidosSilenciados();
        this.iniciarListenerRealtime();
    }

    ngOnDestroy(): void {
        this.silenciar();
        if (this.channel) {
            this.supabaseService.client.removeChannel(this.channel);
        }
    }

    private cargarPedidosSilenciados(): void {
        try {
            const guardados = sessionStorage.getItem('pedidos_wa_silenciados');
            if (guardados) {
                const arr = JSON.parse(guardados);
                this.pedidosSilenciadosOCerrados = new Set(arr);
            }
        } catch {}
    }

    private guardarPedidosSilenciados(): void {
        try {
            sessionStorage.setItem(
                'pedidos_wa_silenciados',
                JSON.stringify(Array.from(this.pedidosSilenciadosOCerrados))
            );
        } catch {}
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
                        if (!nuevo?.idpedido) return;
                        if (this.pedidosSilenciadosOCerrados.has(Number(nuevo.idpedido))) {
                            return;
                        }

                        // Solo pedidos de Delivery (mesa 0) generados por el Chatbot
                        const esChatbot = nuevo && (
                            nuevo.es_chatbot === true ||
                            nuevo.es_chatbot === 'true' ||
                            (nuevo.comentario && nuevo.comentario.includes('WHATSAPP'))
                        );

                        if (String(nuevo.mesa) === '0' && esChatbot) {
                            await this.activarAlerta(nuevo);
                        }
                    }
                )
                .on(
                    'postgres_changes',
                    { event: 'UPDATE', schema: 'public', table: 'pedido' },
                    async (payload: any) => {
                        const nuevo = payload.new;
                        if (!nuevo?.idpedido) return;
                        if (this.pedidosSilenciadosOCerrados.has(Number(nuevo.idpedido))) {
                            return;
                        }

                        // Si se actualizó con es_chatbot = true y es mesa 0, y la alerta aún no se activó
                        const esChatbot = nuevo && (
                            nuevo.es_chatbot === true ||
                            nuevo.es_chatbot === 'true' ||
                            (nuevo.comentario && nuevo.comentario.includes('WHATSAPP'))
                        );

                        if (String(nuevo.mesa) === '0' && esChatbot) {
                            if (!this.visible && (!this.pedido || this.pedido.idpedido !== nuevo.idpedido)) {
                                await this.activarAlerta(nuevo);
                            }
                        }
                    }
                )
                .subscribe();
        } catch (error) {
            console.error('Error iniciando Realtime en AlertaWhatsapp:', error);
        }
    }

    async activarAlerta(pedidoData: any): Promise<void> {
        if (!pedidoData?.idpedido) return;
        if (this.pedidosSilenciadosOCerrados.has(Number(pedidoData.idpedido))) {
            return;
        }

        // Asegurar cargar los datos más actualizados del pedido
        try {
            const { data: pedidoActualizado } = await this.supabaseService.client
                .from('pedido')
                .select('*')
                .eq('idpedido', pedidoData.idpedido)
                .single();
            this.pedido = pedidoActualizado || pedidoData;
        } catch {
            this.pedido = pedidoData;
        }

        // Si telefono no vino en pedido, buscarlo en wa_sesiones o en comentario
        if (!this.pedido.telefono) {
            try {
                if (this.pedido.cliente) {
                    const { data: sesionData } = await this.supabaseService.client
                        .from('wa_sesiones')
                        .select('telefono')
                        .eq('nombre', this.pedido.cliente)
                        .order('actualizado_en', { ascending: false })
                        .limit(1)
                        .maybeSingle();
                    if (sesionData?.telefono) {
                        this.pedido.telefono = sesionData.telefono;
                    }
                }
                if (!this.pedido.telefono && this.pedido.comentario) {
                    const matchTel = this.pedido.comentario.match(/(\+?51)?\s*(9\d{8})/);
                    if (matchTel && matchTel[2]) {
                        this.pedido.telefono = matchTel[2];
                    }
                }
            } catch (err) {
                console.warn('Error buscando teléfono alternativo:', err);
            }
        }

        this.detalles = [];
        this.visible = true;

        // Iniciar sonido de campana en bucle
        this.iniciarSonido();

        // Notificar inmediatamente a HomeComponent para actualizar la lista de pedidos en tiempo real
        this.pedidoService.notificarNuevoPedidoWhatsApp(this.pedido);

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

    private iniciarSonido(): void {
        this.sonando = true;
        this.reproducirCampana();
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
        if (this.pedido?.idpedido) {
            this.pedidosSilenciadosOCerrados.add(Number(this.pedido.idpedido));
            this.guardarPedidosSilenciados();
        }
        this.silenciar();
        this.visible = false;
    }

    atenderPedido(): void {
        const pedidoSeleccionado = this.pedido;
        if (pedidoSeleccionado?.idpedido) {
            this.pedidosSilenciadosOCerrados.add(Number(pedidoSeleccionado.idpedido));
            this.guardarPedidosSilenciados();
        }
        this.cerrarAlerta();

        // Redireccionar a /mesas y autoseleccionar el pedido delivery abriendo la comanda de cocina
        if (!this.router.url.includes('/mesas')) {
            this.router.navigate(['/mesas']).then(() => {
                setTimeout(() => {
                    this.pedidoService.ejecutarSeleccionEImpresion(pedidoSeleccionado);
                }, 450);
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

    formatTelefono(telefono: string): string {
        if (!telefono) return 'Sin número';
        const clean = telefono.replace(/[^0-9]/g, '');
        if (clean.length === 9) {
            return `${clean.substring(0, 3)} ${clean.substring(3, 6)} ${clean.substring(6)}`;
        }
        if (clean.length === 11 && clean.startsWith('51')) {
            const num = clean.substring(2);
            return `+51 ${num.substring(0, 3)} ${num.substring(3, 6)} ${num.substring(6)}`;
        }
        return telefono;
    }

    obtenerNotaCocina(comentario: string): string {
        if (!comentario) return '';
        const match = comentario.match(/NOTA COCINA:\s*([^|]+)/i);
        return match && match[1] ? match[1].trim() : '';
    }

    formatToppings(toppings: any): string {
        if (!toppings || toppings === '0') return '';
        const mapaToppings: { [key: string]: string } = {
            '1': 'SIN AJÍ',
            '4': 'SIN CEBOLLA',
            '5': 'SIN CAMOTE',
            '7': 'SIN YUCA',
            '8': 'SIN ARROZ',
            '9': 'ENSALADA APARTE',
            '11': 'BAJO AJÍ',
            '29': 'BIEN PICANTE'
        };
        const ids = String(toppings).split(',').map((s: string) => s.trim());
        const nombres = ids.map((id: string) => mapaToppings[id] || '').filter(Boolean);
        return nombres.join(', ');
    }
}
