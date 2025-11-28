import { CommonModule } from '@angular/common';
import { Component, ViewChild, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ImportsModule } from '../../../imports';
import { ConfirmationService, MessageService } from 'primeng/api';
import { SupabaseService } from '../../../../services/supabase.service';
import { Table } from 'primeng/table';

@Component({
    selector: 'app-productos',
    imports: [CommonModule, FormsModule, ReactiveFormsModule, ImportsModule],
    templateUrl: './productos.component.html',
    styleUrl: './productos.component.scss',
    providers: [MessageService, ConfirmationService]
})
export class ProductosComponent {
    @ViewChild('dt') dt!: Table;
    @Output() backToMain = new EventEmitter<void>();

    productos: any[] = [];
    categorias: any[] = [];
    productoDialog: boolean = false;
    producto: any = {};
    submitted: boolean = false;
    selectedProductos: any[] = [];
    productoForm: FormGroup;
    isEditing: boolean = false;
    selectedCategory: any = null;
    filteredProductos: any[] = [];

    constructor(private supabaseService: SupabaseService, private messageService: MessageService, private confirmationService: ConfirmationService, private fb: FormBuilder) {
        this.productoForm = this.fb.group({
            nombre: ['', [Validators.required, Validators.minLength(2)]],
            preciounitario: [0, [Validators.required, Validators.min(0)]],
            idcategoria: ['', Validators.required],
            acronimo: ['', [Validators.required, Validators.maxLength(10)]],
            numero_carta: [0, [Validators.required, Validators.min(0)]]
        });
    }

    goBack() {
        this.backToMain.emit();
    }
    ngOnInit(): void {
        this.loadProductos();
        this.loadCategorias();
    }

    async loadProductos() {
        try {
            const { data, error } = await this.supabaseService.client
                .from('producto')
                .select(
                    `
                    *,
                    categoria:idcategoria(nombre)
                `
                )
                .is('deleted', null)
                .not('preciounitario', 'is', null)
                .order('numero_carta');

            if (error) throw error;
            this.productos = data || [];
            this.filteredProductos = [...this.productos];
        } catch (error) {
            console.error('Error loading productos:', error);
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Error al cargar productos'
            });
        }
    }

    onCategoryChange() {
        if (this.selectedCategory) {
            this.filteredProductos = this.productos.filter(producto =>
                producto.idcategoria === this.selectedCategory.idcategoria
            );
        } else {
            this.filteredProductos = [...this.productos];
        }
    }

    clearCategoryFilter() {
        this.selectedCategory = null;
        this.filteredProductos = [...this.productos];
    }
    async loadCategorias() {
        try {
            const { data, error } = await this.supabaseService.client.from('categoria').select('*').is('deleted', null).order('nombre');

            if (error) throw error;
            this.categorias = data || [];
        } catch (error) {
            console.error('Error loading categorias:', error);
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Error al cargar categorías'
            });
        }
    }

    openNew() {
        this.producto = {};
        this.productoForm.reset();
        this.submitted = false;
        this.isEditing = false;
        this.productoDialog = true;
    }

    editProducto(producto: any) {
        this.producto = { ...producto };
        this.productoForm.patchValue({
            numero_carta: producto.numero_carta,
            nombre: producto.nombre,
            preciounitario: producto.preciounitario,
            idcategoria: producto.idcategoria,
            acronimo: producto.acronimo
        });
        this.isEditing = true;
        this.productoDialog = true;
    }

    deleteProducto(producto: any) {
        const now = new Date();
        const fechaPeru = now.toLocaleDateString('en-CA', {
            timeZone: 'America/Lima'
        });

        this.confirmationService.confirm({
            message: `¿Está seguro de eliminar el producto ${producto.nombre}?`,
            header: 'Confirmar',
            icon: 'pi pi-exclamation-triangle',
            accept: async () => {
                try {
                    const { error } = await this.supabaseService.client.from('producto').update({ deleted: 1 }).eq('idproducto', producto.idproducto);

                    if (error) throw error;

                    this.messageService.add({
                        severity: 'success',
                        summary: 'Exitoso',
                        detail: 'Producto eliminado',
                        life: 3000
                    });
                    this.loadProductos();
                } catch (error) {
                    console.error('Error deleting producto:', error);
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Error al eliminar producto'
                    });
                }
            }
        });
    }

    async saveProducto() {
        this.submitted = true;

        if (this.productoForm.valid) {
            const formData = this.productoForm.value;

            try {
                if (this.isEditing) {
                    const { error } = await this.supabaseService.client
                        .from('producto')
                        .update({
                            nombre: formData.nombre,
                            preciounitario: formData.preciounitario,
                            idcategoria: formData.idcategoria,
                            acronimo: formData.acronimo,
                            numero_carta: formData.numero_carta
                        })
                        .eq('idproducto', this.producto.idproducto);

                    if (error) throw error;

                    this.messageService.add({
                        severity: 'success',
                        summary: 'Exitoso',
                        detail: 'Producto actualizado',
                        life: 3000
                    });
                } else {
                    const { error } = await this.supabaseService.client.from('producto').insert({
                        nombre: formData.nombre,
                        preciounitario: formData.preciounitario,
                        idcategoria: formData.idcategoria,
                        acronimo: formData.acronimo,
                        numero_carta: formData.numero_carta
                    });

                    if (error) throw error;

                    this.messageService.add({
                        severity: 'success',
                        summary: 'Exitoso',
                        detail: 'Producto creado',
                        life: 3000
                    });
                }

                this.productoDialog = false;
                this.loadProductos();
            } catch (error) {
                console.error('Error saving producto:', error);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Error al guardar producto'
                });
            }
        }
    }

    hideDialog() {
        this.productoDialog = false;
        this.submitted = false;
    }

    onGlobalFilter(table: Table, event: Event) {
        table.filterGlobal((event.target as HTMLInputElement).value, 'contains');
    }

    getCategoriaName(idcategoria: number): string {
        const categoria = this.categorias.find((c) => c.idcategoria === idcategoria);
        return categoria ? categoria.nombre : '';
    }
}
