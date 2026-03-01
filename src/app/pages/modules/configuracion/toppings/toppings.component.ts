import { CommonModule } from '@angular/common';
import { Component, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ImportsModule } from '../../../imports';
import { ConfirmationService, MessageService } from 'primeng/api';
import { SupabaseService } from '../../../../services/supabase.service';

@Component({
    selector: 'app-toppings',
    imports: [CommonModule, FormsModule, ReactiveFormsModule, ImportsModule],
    templateUrl: './toppings.component.html',
    styleUrl: './toppings.component.scss',
    providers: [MessageService, ConfirmationService]
})
export class ToppingsComponent {
    @Output() backToMain = new EventEmitter<void>();

    toppings: any[] = [];
    filteredToppings: any[] = [];
    toppingDialog: boolean = false;
    topping: any = {};
    submitted: boolean = false;
    toppingForm: FormGroup;
    isEditing: boolean = false;
    searchTerm: string = '';

    constructor(private supabaseService: SupabaseService, private messageService: MessageService, private confirmationService: ConfirmationService, private fb: FormBuilder) {
        this.toppingForm = this.fb.group({
            nombre: ['', [Validators.required, Validators.minLength(2)]]
        });
    }

    goBack() {
        this.backToMain.emit();
    }
    ngOnInit(): void {
        this.loadToppings();
    }

    async loadToppings() {
        try {
            const { data, error } = await this.supabaseService.client.from('toppings').select('*').is('deleted', null).order('nombre');

            if (error) throw error;
            this.toppings = data || [];
            this.applyFilter();
        } catch (error) {
            console.error('Error loading toppings:', error);
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Error al cargar toppings'
            });
        }
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

    deleteTopping(topping: any) {
        const now = new Date();
        const fechaPeru = now.toLocaleDateString('en-CA', {
            timeZone: 'America/Lima'
        });

        this.confirmationService.confirm({
            message: `¿Está seguro de eliminar el topping ${topping.nombre}?`,
            header: 'Confirmar',
            icon: 'pi pi-exclamation-triangle',
            accept: async () => {
                try {
                    const { error } = await this.supabaseService.client.from('toppings').update({ deleted: fechaPeru }).eq('idtopings', topping.idtopings);

                    if (error) throw error;

                    this.messageService.add({
                        severity: 'success',
                        summary: 'Exitoso',
                        detail: 'Topping eliminado',
                        life: 3000
                    });
                    this.loadToppings();
                } catch (error) {
                    console.error('Error deleting topping:', error);
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Error al eliminar topping'
                    });
                }
            }
        });
    }

    async saveTopping() {
        this.submitted = true;

        if (this.toppingForm.valid) {
            const formData = this.toppingForm.value;

            try {
                if (this.isEditing) {
                    const { error } = await this.supabaseService.client
                        .from('toppings')
                        .update({
                            nombre: formData.nombre
                        })
                        .eq('idtopings', this.topping.idtopings);

                    if (error) throw error;

                    this.messageService.add({
                        severity: 'success',
                        summary: 'Exitoso',
                        detail: 'Topping actualizado',
                        life: 3000
                    });
                } else {
                    const { error } = await this.supabaseService.client.from('toppings').insert({
                        nombre: formData.nombre
                    });

                    if (error) throw error;

                    this.messageService.add({
                        severity: 'success',
                        summary: 'Exitoso',
                        detail: 'Topping creado',
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
                    detail: 'Error al guardar topping'
                });
            }
        }
    }

    hideDialog() {
        this.toppingDialog = false;
        this.submitted = false;
    }

    filterToppings(event: Event) {
        this.searchTerm = (event.target as HTMLInputElement).value;
        this.applyFilter();
    }

    applyFilter() {
        if (!this.searchTerm) {
            this.filteredToppings = [...this.toppings];
        } else {
            const term = this.searchTerm.toLowerCase();
            this.filteredToppings = this.toppings.filter(t => t.nombre?.toLowerCase().includes(term));
        }
    }
}
