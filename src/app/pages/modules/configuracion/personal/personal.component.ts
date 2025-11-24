import { CommonModule } from '@angular/common';
import { Component, ViewChild, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ImportsModule } from '../../../imports';
import { ConfirmationService, MessageService } from 'primeng/api';
import { SupabaseService } from '../../../../services/supabase.service';
import { Table } from 'primeng/table';

@Component({
    selector: 'app-personal',
    imports: [CommonModule, FormsModule, ReactiveFormsModule, ImportsModule],
    templateUrl: './personal.component.html',
    styleUrl: './personal.component.scss',
    providers: [MessageService, ConfirmationService]
})
export class PersonalComponent {
    @ViewChild('dt') dt!: Table;
    @Output() backToMain = new EventEmitter<void>();

    personal: any[] = [];
    perfiles: any[] = [];
    estados: any[] = [];
    personalDialog: boolean = false;
    persona: any = {};
    submitted: boolean = false;
    selectedPersonal: any[] = [];
    personalForm: FormGroup;
    isEditing: boolean = false;

    constructor(
        private supabaseService: SupabaseService,
        private messageService: MessageService,
        private confirmationService: ConfirmationService,
        private fb: FormBuilder
    ) {
        this.personalForm = this.fb.group({
            nombres: ['', [Validators.required, Validators.minLength(2)]],
            apellidopat: ['', [Validators.required, Validators.minLength(2)]],
            apellidomat: ['', [Validators.required, Validators.minLength(2)]],
            direccion: [''],
            referencia: [''],
            cumpleanos: [''],
            idperfil: ['', Validators.required],
            idestado: [1, Validators.required]
        });

        // Initialize estados options
        this.estados = [
            { label: 'Activo', value: 1 },
            { label: 'Inactivo', value: 0 }
        ];
    }

    goBack() {
        this.backToMain.emit();
    }

    ngOnInit(): void {
        this.loadPersonal();
        this.loadPerfiles();
    }

    async loadPersonal() {
        try {
            const { data, error } = await this.supabaseService.client
                .from('persona')
                .select(`
                    *,
                    perfil:idperfil(nombre)
                `)
                .is('deleted', null)
                .order('nombres');

            if (error) throw error;
            this.personal = data || [];
        } catch (error) {
            console.error('Error loading personal:', error);
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Error al cargar personal'
            });
        }
    }

    async loadPerfiles() {
        try {
            // Assuming there's a perfil table, if not we'll create sample data
            const { data, error } = await this.supabaseService.client
                .from('perfil')
                .select('*')
                .order('nombre');

            if (error) {
                // If perfil table doesn't exist, create sample data
                this.perfiles = [
                    { idperfil: 1, nombre: 'Administrador' },
                    { idperfil: 2, nombre: 'Mesero' },
                    { idperfil: 3, nombre: 'Cajero' },
                    { idperfil: 4, nombre: 'Cocinero' }
                ];
            } else {
                this.perfiles = data || [];
            }
        } catch (error) {
            console.error('Error loading perfiles:', error);
            // Fallback to sample data
            this.perfiles = [
                { idperfil: 1, nombre: 'Administrador' },
                { idperfil: 2, nombre: 'Mesero' },
                { idperfil: 3, nombre: 'Cajero' },
                { idperfil: 4, nombre: 'Cocinero' }
            ];
        }
    }

    openNew() {
        this.persona = {};
        this.personalForm.reset();
        this.personalForm.patchValue({ idestado: 1 }); // Default to active
        this.submitted = false;
        this.isEditing = false;
        this.personalDialog = true;
    }

    editPersona(persona: any) {
        this.persona = { ...persona };

        // Format birthday for date input
        let cumpleanos = '';
        if (persona.cumpleanos) {
            const date = new Date(persona.cumpleanos);
            cumpleanos = date.toISOString().split('T')[0];
        }

        this.personalForm.patchValue({
            nombres: persona.nombres,
            apellidopat: persona.apellidopat,
            apellidomat: persona.apellidomat,
            direccion: persona.direccion,
            referencia: persona.referencia,
            cumpleanos: cumpleanos,
            idperfil: persona.idperfil,
            idestado: persona.idestado
        });
        this.isEditing = true;
        this.personalDialog = true;
    }

    deletePersona(persona: any) {
        this.confirmationService.confirm({
            message: `¿Está seguro de eliminar a ${persona.nombres} ${persona.apellidopat}?`,
            header: 'Confirmar',
            icon: 'pi pi-exclamation-triangle',
            accept: async () => {
                try {
                    const { error } = await this.supabaseService.client
                        .from('persona')
                        .delete()
                        .eq('idpersona', persona.idpersona);

                    if (error) throw error;

                    this.messageService.add({
                        severity: 'success',
                        summary: 'Exitoso',
                        detail: 'Personal eliminado',
                        life: 3000
                    });
                    this.loadPersonal();
                } catch (error) {
                    console.error('Error deleting persona:', error);
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Error al eliminar personal'
                    });
                }
            }
        });
    }

    async savePersona() {
        this.submitted = true;

        if (this.personalForm.valid) {
            const formData = this.personalForm.value;

            try {
                if (this.isEditing) {
                    const { error } = await this.supabaseService.client
                        .from('persona')
                        .update({
                            nombres: formData.nombres,
                            apellidopat: formData.apellidopat,
                            apellidomat: formData.apellidomat,
                            direccion: formData.direccion,
                            referencia: formData.referencia,
                            cumpleanos: formData.cumpleanos || null,
                            idperfil: formData.idperfil,
                            idestado: formData.idestado
                        })
                        .eq('idpersona', this.persona.idpersona);

                    if (error) throw error;

                    this.messageService.add({
                        severity: 'success',
                        summary: 'Exitoso',
                        detail: 'Personal actualizado',
                        life: 3000
                    });
                } else {
                    const { error } = await this.supabaseService.client
                        .from('persona')
                        .insert({
                            nombres: formData.nombres,
                            apellidopat: formData.apellidopat,
                            apellidomat: formData.apellidomat,
                            direccion: formData.direccion,
                            referencia: formData.referencia,
                            cumpleanos: formData.cumpleanos || null,
                            idperfil: formData.idperfil,
                            idestado: formData.idestado
                        });

                    if (error) throw error;

                    this.messageService.add({
                        severity: 'success',
                        summary: 'Exitoso',
                        detail: 'Personal creado',
                        life: 3000
                    });
                }

                this.personalDialog = false;
                this.loadPersonal();
            } catch (error) {
                console.error('Error saving persona:', error);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Error al guardar personal'
                });
            }
        }
    }

    hideDialog() {
        this.personalDialog = false;
        this.submitted = false;
    }

    onGlobalFilter(table: Table, event: Event) {
        table.filterGlobal((event.target as HTMLInputElement).value, 'contains');
    }

    getPerfilName(idperfil: number): string {
        const perfil = this.perfiles.find(p => p.idperfil === idperfil);
        return perfil ? perfil.nombre : '';
    }

    getEstadoLabel(idestado: number): string {
        const estado = this.estados.find(e => e.value === idestado);
        return estado ? estado.label : '';
    }

    getEstadoSeverity(idestado: any): string {
        return idestado == '1' ? 'success' : 'danger';
    }
}