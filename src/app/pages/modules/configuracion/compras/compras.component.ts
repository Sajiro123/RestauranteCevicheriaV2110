import { Component, Output, EventEmitter, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ImportsModule } from '../../../imports';
import { MessageService, ConfirmationService } from 'primeng/api';

export type Prioridad = 'Alta' | 'Media' | 'Baja';
export type Categoria = 'Descartables' | 'Verduras' | 'Aseo' | 'Lácteos' | 'Carnes' | 'Bebidas' | 'Condimentos' | 'Otros';
export type EstadoItem = 'pendiente' | 'comprado';

export interface CompraItem {
    id: string;
    categoria: Categoria;
    producto: string;
    cantidad: string;
    prioridad: Prioridad;
    estado: EstadoItem;
    fechaCreado: string;
}

@Component({
    selector: 'app-compras',
    imports: [CommonModule, FormsModule, ImportsModule],
    templateUrl: './compras.component.html',
    styleUrl: './compras.component.scss',
    providers: [MessageService, ConfirmationService]
})
export class ComprasComponent implements OnInit {
    @Output() backToMain = new EventEmitter<void>();
    @ViewChild('inputProducto') inputProducto!: ElementRef;
    @ViewChild('inputCantidad') inputCantidad!: ElementRef;

    // ─── Lista de items ───────────────────────────────────────────
    items: CompraItem[] = [];

    // ─── Formulario inline ────────────────────────────────────────
    nuevoProducto: string = '';
    nuevaCantidad: string = '';
    nuevaCategoria: Categoria = 'Otros';
    nuevaPrioridad: Prioridad = 'Media';
    mostrarFormulario: boolean = false;

    // ─── Filtro & búsqueda ────────────────────────────────────────
    filtroCategoria: string = 'Todas';
    filtroEstado: string = 'Todos';
    busqueda: string = '';

    // ─── Opciones ─────────────────────────────────────────────────
    categorias: { label: string; value: Categoria }[] = [
        { label: '🛒 Descartables', value: 'Descartables' },
        { label: '🥬 Verduras', value: 'Verduras' },
        { label: '🧹 Aseo', value: 'Aseo' },
        { label: '🥛 Lácteos', value: 'Lácteos' },
        { label: '🥩 Carnes', value: 'Carnes' },
        { label: '🥤 Bebidas', value: 'Bebidas' },
        { label: '🧂 Condimentos', value: 'Condimentos' },
        { label: '📦 Otros', value: 'Otros' },
    ];

    prioridades: { label: string; value: Prioridad; color: string }[] = [
        { label: '🔴 Alta', value: 'Alta', color: 'alta' },
        { label: '🟡 Media', value: 'Media', color: 'media' },
        { label: '🟢 Baja', value: 'Baja', color: 'baja' },
    ];

    filtrosCategorias: string[] = ['Todas', 'Descartables', 'Verduras', 'Aseo', 'Lácteos', 'Carnes', 'Bebidas', 'Condimentos', 'Otros'];
    filtrosEstado: string[] = ['Todos', 'Pendiente', 'Comprado'];

    private readonly STORAGE_KEY = 'willy_compras_lista';

    constructor(
        private messageService: MessageService,
        private confirmationService: ConfirmationService
    ) {}

    ngOnInit(): void {
        this.loadFromStorage();
    }

    goBack(): void {
        this.backToMain.emit();
    }

    // ─── Persistencia ─────────────────────────────────────────────
    private loadFromStorage(): void {
        try {
            const raw = localStorage.getItem(this.STORAGE_KEY);
            this.items = raw ? JSON.parse(raw) : this.getItemsEjemplo();
        } catch {
            this.items = this.getItemsEjemplo();
        }
    }

    private saveToStorage(): void {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.items));
    }

    private getItemsEjemplo(): CompraItem[] {
        return [
            { id: this.genId(), categoria: 'Descartables', producto: 'Servilletas', cantidad: '2 paquetes', prioridad: 'Alta', estado: 'pendiente', fechaCreado: new Date().toISOString() },
            { id: this.genId(), categoria: 'Verduras', producto: 'Cebolla Roja', cantidad: '2 kg', prioridad: 'Media', estado: 'pendiente', fechaCreado: new Date().toISOString() },
            { id: this.genId(), categoria: 'Aseo', producto: 'Papel Higiénico', cantidad: '1 paquete', prioridad: 'Alta', estado: 'pendiente', fechaCreado: new Date().toISOString() },
        ];
    }

    private genId(): string {
        return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    }

    // ─── CRUD ─────────────────────────────────────────────────────
    toggleFormulario(): void {
        this.mostrarFormulario = !this.mostrarFormulario;
        if (this.mostrarFormulario) {
            this.resetForm();
            setTimeout(() => this.inputProducto?.nativeElement?.focus(), 100);
        }
    }

    onProductoEnter(): void {
        if (this.nuevoProducto.trim()) {
            setTimeout(() => this.inputCantidad?.nativeElement?.focus(), 50);
        }
    }

    onCantidadEnter(): void {
        this.agregarItem();
    }

    agregarItem(): void {
        if (!this.nuevoProducto.trim() || !this.nuevaCantidad.trim()) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Campos requeridos',
                detail: 'Completa el producto y la cantidad.',
                life: 3000
            });
            return;
        }

        const nuevo: CompraItem = {
            id: this.genId(),
            categoria: this.nuevaCategoria,
            producto: this.nuevoProducto.trim(),
            cantidad: this.nuevaCantidad.trim(),
            prioridad: this.nuevaPrioridad,
            estado: 'pendiente',
            fechaCreado: new Date().toISOString()
        };

        this.items.unshift(nuevo);
        this.saveToStorage();

        this.messageService.add({
            severity: 'success',
            summary: 'Agregado',
            detail: `"${nuevo.producto}" añadido a la lista.`,
            life: 2500
        });

        this.resetForm();
        // Mantener formulario abierto y volver al foco del producto para agregar rápido
        setTimeout(() => this.inputProducto?.nativeElement?.focus(), 100);
    }

    resetForm(): void {
        this.nuevoProducto = '';
        this.nuevaCantidad = '';
        this.nuevaCategoria = 'Otros';
        this.nuevaPrioridad = 'Media';
    }

    toggleEstado(item: CompraItem): void {
        item.estado = item.estado === 'pendiente' ? 'comprado' : 'pendiente';
        this.saveToStorage();
    }

    marcarSeleccionadosComprado(): void {
        const pendientes = this.itemsFiltrados.filter(i => i.estado === 'pendiente');
        if (pendientes.length === 0) {
            this.messageService.add({ severity: 'info', summary: 'Sin pendientes', detail: 'No hay ítems pendientes visibles.', life: 3000 });
            return;
        }
        pendientes.forEach(i => { i.estado = 'comprado'; });
        this.saveToStorage();
        this.messageService.add({ severity: 'success', summary: 'Listo', detail: `${pendientes.length} ítem(s) marcados como comprados.`, life: 3000 });
    }

    eliminarItem(item: CompraItem): void {
        this.confirmationService.confirm({
            message: `¿Eliminar "${item.producto}" de la lista?`,
            header: 'Confirmar eliminación',
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                this.items = this.items.filter(i => i.id !== item.id);
                this.saveToStorage();
                this.messageService.add({ severity: 'success', summary: 'Eliminado', detail: 'Ítem eliminado de la lista.', life: 2500 });
            }
        });
    }

    limpiarComprados(): void {
        const comprados = this.items.filter(i => i.estado === 'comprado').length;
        if (comprados === 0) {
            this.messageService.add({ severity: 'info', summary: 'Sin comprados', detail: 'No hay ítems comprados que eliminar.', life: 3000 });
            return;
        }
        this.confirmationService.confirm({
            message: `¿Eliminar ${comprados} ítem(s) marcados como comprados?`,
            header: 'Limpiar lista',
            icon: 'pi pi-trash',
            accept: () => {
                this.items = this.items.filter(i => i.estado !== 'comprado');
                this.saveToStorage();
                this.messageService.add({ severity: 'success', summary: 'Lista limpiada', detail: 'Ítems comprados eliminados.', life: 3000 });
            }
        });
    }

    vaciarLista(): void {
        if (this.items.length === 0) return;
        this.confirmationService.confirm({
            message: '¿Vaciar toda la lista de compras? Esta acción no se puede deshacer.',
            header: 'Vaciar lista',
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                this.items = [];
                this.saveToStorage();
                this.messageService.add({ severity: 'warn', summary: 'Lista vaciada', detail: 'Se eliminaron todos los ítems.', life: 3000 });
            }
        });
    }

    // ─── Filtrado ─────────────────────────────────────────────────
    get itemsFiltrados(): CompraItem[] {
        return this.items.filter(item => {
            const matchCategoria = this.filtroCategoria === 'Todas' || item.categoria === this.filtroCategoria;
            const matchEstado =
                this.filtroEstado === 'Todos' ||
                (this.filtroEstado === 'Pendiente' && item.estado === 'pendiente') ||
                (this.filtroEstado === 'Comprado' && item.estado === 'comprado');
            const matchBusqueda = !this.busqueda.trim() ||
                item.producto.toLowerCase().includes(this.busqueda.toLowerCase()) ||
                item.categoria.toLowerCase().includes(this.busqueda.toLowerCase());
            return matchCategoria && matchEstado && matchBusqueda;
        });
    }

    get totalPendientes(): number {
        return this.items.filter(i => i.estado === 'pendiente').length;
    }

    get totalComprados(): number {
        return this.items.filter(i => i.estado === 'comprado').length;
    }

    get progreso(): number {
        if (this.items.length === 0) return 0;
        return Math.round((this.totalComprados / this.items.length) * 100);
    }

    // ─── Helpers de vista ─────────────────────────────────────────
    getPrioridadClass(prioridad: Prioridad): string {
        return { Alta: 'badge-alta', Media: 'badge-media', Baja: 'badge-baja' }[prioridad] ?? '';
    }

    getPrioridadEmoji(prioridad: Prioridad): string {
        return { Alta: '🔴', Media: '🟡', Baja: '🟢' }[prioridad] ?? '';
    }

    getCategoriaEmoji(categoria: Categoria): string {
        const map: Record<string, string> = {
            Descartables: '🛒', Verduras: '🥬', Aseo: '🧹', Lácteos: '🥛',
            Carnes: '🥩', Bebidas: '🥤', Condimentos: '🧂', Otros: '📦'
        };
        return map[categoria] ?? '📦';
    }

    trackById(_: number, item: CompraItem): string {
        return item.id;
    }
}
