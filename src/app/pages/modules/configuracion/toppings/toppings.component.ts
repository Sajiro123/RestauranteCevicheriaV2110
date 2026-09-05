import { CommonModule } from '@angular/common';
import { Component, Output, EventEmitter, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ImportsModule } from '../../../imports';
import { ConfirmationService, MessageService } from 'primeng/api';
import { SupabaseService } from '../../../../services/supabase.service';

@Component({
    selector: 'app-toppings',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule, ImportsModule],
    templateUrl: './toppings.component.html',
    styleUrl: './toppings.component.scss',
    providers: [MessageService, ConfirmationService]
})
export class ToppingsComponent implements OnInit {
    @Output() backToMain = new EventEmitter<void>();

    toppings: any[] = [];
    filteredToppings: any[] = [];
    toppingDialog: boolean = false;
    topping: any = {};
    submitted: boolean = false;
    toppingForm: FormGroup;
    isEditing: boolean = false;
    searchTerm: string = '';
    loading: boolean = false;
    selectedCategoryFilter: string = 'TODOS';

    // Sugerencias rápidas al registrar
    sugerencias: string[] = [
        'SIN AJI',
        'SIN CEBOLLA',
        'SIN CAMOTE',
        'SIN YUCA',
        'SIN ARROZ',
        'CHICHARRON POTA',
        'CEVICHE POTA',
        'CHICHARRON PESCADO',
        'ENSALADA APARTE',
        'LECHE DE TIGRE APARTE'
    ];

    constructor(
        private supabaseService: SupabaseService,
        private messageService: MessageService,
        private confirmationService: ConfirmationService,
        private fb: FormBuilder
    ) {
        this.toppingForm = this.fb.group({
            nombre: ['', [Validators.required, Validators.minLength(2)]]
        });
    }

    ngOnInit(): void {
        this.loadToppings();
    }

    goBack() {
        this.backToMain.emit();
    }

    async loadToppings() {
        this.loading = true;
        try {
            const { data, error } = await this.supabaseService.client
                .from('toppings')
                .select('*')
                .is('deleted', null)
                .order('nombre');

            if (error) throw error;
            this.toppings = data || [];
            this.applyFilter();
        } catch (error) {
            console.error('Error loading toppings:', error);
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Error al cargar toppings de la base de datos'
            });
        } finally {
            this.loading = false;
        }
    }

    // Clasificación visual del modificador
    getToppingType(nombre: string): { label: string; tagClass: string; icon: string; category: string } {
        if (!nombre) return { label: 'Modificador', tagClass: 'badge-modificador', icon: 'pi pi-sliders-h', category: 'MODIFICADORES' };
        const n = nombre.trim().toUpperCase();
        if (n.startsWith('SIN ') || n.startsWith('NO ')) {
            return { label: 'Exclusión', tagClass: 'badge-exclusion', icon: 'pi pi-ban', category: 'EXCLUSIONES' };
        }
        if (n.includes('CHICHARRON') || n.includes('CEVICHE') || n.includes('EXTRA') || n.includes('DOBLE') || n.includes('PORCION') || n.includes('PESCADO') || n.includes('POTA') || n.includes('ARROZ') || n.includes('CHAUFA') || n.includes('YUCA') || n.includes('LECHE') || n.startsWith('CON ')) {
            return { label: 'Adicional', tagClass: 'badge-adicional', icon: 'pi pi-plus-circle', category: 'ADICIONALES' };
        }
        return { label: 'Modificador', tagClass: 'badge-modificador', icon: 'pi pi-sliders-h', category: 'MODIFICADORES' };
    }

    // Métricas / Resumen superior
    get totalToppings(): number {
        return this.toppings.length;
    }

    get totalExclusiones(): number {
        return this.toppings.filter(t => this.getToppingType(t.nombre).category === 'EXCLUSIONES').length;
    }

    get totalAdicionales(): number {
        return this.toppings.filter(t => this.getToppingType(t.nombre).category === 'ADICIONALES').length;
    }

    get totalModificadores(): number {
        return this.toppings.filter(t => this.getToppingType(t.nombre).category === 'MODIFICADORES').length;
    }

    filterByCategory(category: string) {
        this.selectedCategoryFilter = category;
        this.applyFilter();
    }

    filterToppings(event: Event) {
        this.searchTerm = (event.target as HTMLInputElement).value;
        this.applyFilter();
    }

    onGlobalFilter(table: any, event: Event) {
        table.filterGlobal((event.target as HTMLInputElement).value, 'contains');
    }

    applyFilter() {
        let list = [...this.toppings];

        if (this.selectedCategoryFilter === 'EXCLUSIONES') {
            list = list.filter(t => this.getToppingType(t.nombre).category === 'EXCLUSIONES');
        } else if (this.selectedCategoryFilter === 'ADICIONALES') {
            list = list.filter(t => this.getToppingType(t.nombre).category === 'ADICIONALES');
        } else if (this.selectedCategoryFilter === 'MODIFICADORES') {
            list = list.filter(t => this.getToppingType(t.nombre).category === 'MODIFICADORES');
        }

        if (this.searchTerm) {
            const term = this.searchTerm.toLowerCase().trim();
            list = list.filter((t) => (t.nombre || '').toLowerCase().includes(term) || String(t.idtoppings).includes(term));
        }

        this.filteredToppings = list;
    }

    openNew() {
        this.topping = {};
        this.toppingForm.reset();
        this.submitted = false;
        this.isEditing = false;
        this.toppingDialog = true;
    }

    editTopping(topping: any) {
        this.topping = { ...topping };
        this.toppingForm.patchValue({
            nombre: topping.nombre
        });
        this.isEditing = true;
        this.toppingDialog = true;
    }

    setSugerencia(nombre: string) {
        this.toppingForm.patchValue({ nombre });
    }

    deleteTopping(topping: any) {
        this.confirmationService.confirm({
            message: `¿Está seguro de eliminar el modificador "${topping.nombre}"?`,
            header: 'Confirmar Eliminación',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Sí, Eliminar',
            rejectLabel: 'Cancelar',
            acceptButtonStyleClass: 'p-button-danger',
            rejectButtonStyleClass: 'p-button-secondary p-button-outlined',
            accept: async () => {
                try {
                    const { error } = await this.supabaseService.client
                        .from('toppings')
                        .update({ deleted: 1 })
                        .eq('idtoppings', topping.idtoppings);

                    if (error) throw error;

                    this.messageService.add({
                        severity: 'success',
                        summary: 'Eliminado',
                        detail: `Topping "${topping.nombre}" eliminado correctamente`,
                        life: 3000
                    });
                    this.loadToppings();
                } catch (error) {
                    console.error('Error deleting topping:', error);
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'No se pudo eliminar el topping'
                    });
                }
            }
        });
    }

    async saveTopping() {
        this.submitted = true;

        if (this.toppingForm.valid) {
            const formData = this.toppingForm.value;
            const nombreNormalizado = formData.nombre.trim().toUpperCase();

            try {
                if (this.isEditing) {
                    const { error } = await this.supabaseService.client
                        .from('toppings')
                        .update({
                            nombre: nombreNormalizado
                        })
                        .eq('idtoppings', this.topping.idtoppings);

                    if (error) throw error;

                    this.messageService.add({
                        severity: 'success',
                        summary: 'Actualizado',
                        detail: 'Topping actualizado con éxito',
                        life: 3000
                    });
                } else {
                    const { error } = await this.supabaseService.client.from('toppings').insert({
                        nombre: nombreNormalizado
                    });

                    if (error) throw error;

                    this.messageService.add({
                        severity: 'success',
                        summary: 'Registrado',
                        detail: 'Nuevo topping creado con éxito',
                        life: 3000
                    });
                }

                this.toppingDialog = false;
                this.loadToppings();
            } catch (error) {
                console.error('Error saving topping:', error);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Error al guardar el topping'
                });
            }
        }
    }

    hideDialog() {
        this.toppingDialog = false;
        this.submitted = false;
    }
}
