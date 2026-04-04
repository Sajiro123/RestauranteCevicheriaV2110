import { CommonModule } from '@angular/common';
import { Component, ViewChild, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ImportsModule } from '../../../imports';
import { ConfirmationService, MessageService } from 'primeng/api';
import { SupabaseService } from '../../../../services/supabase.service';
import { Table } from 'primeng/table';

@Component({
    selector: 'app-clientes',
    imports: [CommonModule, FormsModule, ReactiveFormsModule, ImportsModule],
    templateUrl: './clientes.component.html',
    styleUrl: './clientes.component.scss',
    providers: [MessageService, ConfirmationService]
})
export class ClientesComponent {
    @ViewChild('dt') dt!: Table;
    @Output() backToMain = new EventEmitter<void>();

    clientes: any[] = [];
    estados: any[] = [];
    tiposdoc: any[] = [];
    clienteDialog: boolean = false;
    cliente: any = {};
    submitted: boolean = false;
    selectedClientes: any[] = [];
    clienteForm: FormGroup;
    isEditing: boolean = false;

    // Search by numerodoc
    searchDoc: string = '';

    constructor(
        private supabaseService: SupabaseService,
        private messageService: MessageService,
        private confirmationService: ConfirmationService,
        private fb: FormBuilder
    ) {
        this.clienteForm = this.fb.group({
            tipodoc: ['', Validators.required],
            numerodoc: ['', [Validators.required]],
            nombres: ['', [Validators.required, Validators.minLength(2)]],
            apellidopat: ['', [Validators.required, Validators.minLength(2)]],
            apellidomat: ['', [Validators.minLength(2)]],
            correo: ['', [Validators.required, Validators.email]],
            celular: ['', [Validators.required]],
            direccion: [''],
            referencia: [''],
            cumpleanos: [''],
            idestado: [1, Validators.required]
        });

        this.estados = [
            { label: 'Activo', value: 1 },
            { label: 'Inactivo', value: 0 }
        ];

        this.tiposdoc = [
            { label: 'DNI', value: 1 },
            { label: 'RUC', value: 2 },
            { label: 'CARNET EXT.', value: 3 },
            { label: 'PASAPORTE', value: 4 }
        ];
    }

    goBack() {
        this.backToMain.emit();
    }

    ngOnInit(): void {
        this.loadClientes();
    }

    async loadClientes() {
        try {
            const { data, error } = await this.supabaseService.client
                .from('persona')
                .select('*')
                .is('deleted', null)
                .eq('tipo', 2)
                .order('nombres');

            if (error) throw error;
            this.clientes = data || [];
        } catch (error) {
            console.error('Error loading clientes:', error);
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Error al cargar clientes'
            });
        }
    }

    async searchByDoc() {
        if (!this.searchDoc || this.searchDoc.trim() === '') {
            this.loadClientes();
            return;
        }

        try {
            const docBuscar = this.searchDoc.trim();

            // Buscar en Supabase: persona con tipo=2 y deleted IS NULL
            const { data, error } = await this.supabaseService.client
                .from('persona')
                .select('*')
                .is('deleted', null)
                .eq('tipo', 2)
                .eq('numerodoc', docBuscar)
                .maybeSingle();

            if (error) throw error;

            if (data) {
                // Cliente encontrado → abrir formulario de edición con los datos
                this.messageService.add({
                    severity: 'success',
                    summary: 'Cliente encontrado',
                    detail: `${data.nombres} ${data.apellidopat}`,
                    life: 3000
                });
                this.editCliente(data);
            } else {
                // No encontrado → abrir formulario nuevo con numerodoc pre-llenado
                this.messageService.add({
                    severity: 'info',
                    summary: 'Cliente no encontrado',
                    detail: `No existe cliente con documento "${docBuscar}". Se abrirá el formulario para registrarlo.`,
                    life: 4000
                });
                this.cliente = {};
                this.clienteForm.reset();
                this.clienteForm.patchValue({
                    numerodoc: docBuscar,
                    idestado: 1
                });
                this.submitted = false;
                this.isEditing = false;
                this.clienteDialog = true;
            }
        } catch (error) {
            console.error('Error searching clientes:', error);
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Error al buscar cliente'
            });
        }
    }

    clearSearch() {
        this.searchDoc = '';
        this.loadClientes();
    }

    openNew() {
        this.cliente = {};
        this.clienteForm.reset();
        this.clienteForm.patchValue({ idestado: 1 });
        this.submitted = false;
        this.isEditing = false;
        this.clienteDialog = true;
    }

    editCliente(cliente: any) {
        this.cliente = { ...cliente };

        let cumpleanos = '';
        if (cliente.cumpleanos) {
            const date = new Date(cliente.cumpleanos);
            cumpleanos = date.toISOString().split('T')[0];
        }

        this.clienteForm.patchValue({
            tipodoc: cliente.tipodoc,
            numerodoc: cliente.numerodoc,
            nombres: cliente.nombres,
            apellidopat: cliente.apellidopat,
            apellidomat: cliente.apellidomat,
            correo: cliente.correo,
            celular: cliente.celular,
            direccion: cliente.direccion,
            referencia: cliente.referencia,
            cumpleanos: cumpleanos,
            idestado: cliente.idestado
        });
        this.isEditing = true;
        this.clienteDialog = true;
    }

    deleteCliente(cliente: any) {
        this.confirmationService.confirm({
            message: `¿Está seguro de eliminar a ${cliente.nombres} ${cliente.apellidopat}?`,
            header: 'Confirmar',
            icon: 'pi pi-exclamation-triangle',
            accept: async () => {
                try {
                    // Soft delete: set deleted = 1
                    const { error } = await this.supabaseService.client
                        .from('persona')
                        .update({ deleted: 1 })
                        .eq('idpersona', cliente.idpersona);

                    if (error) throw error;

                    this.messageService.add({
                        severity: 'success',
                        summary: 'Exitoso',
                        detail: 'Cliente eliminado',
                        life: 3000
                    });
                    this.loadClientes();
                } catch (error) {
                    console.error('Error deleting cliente:', error);
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Error al eliminar cliente'
                    });
                }
            }
        });
    }

    async saveCliente() {
        this.submitted = true;

        if (this.clienteForm.valid) {
            const formData = this.clienteForm.value;

            try {
                if (this.isEditing) {
                    const { error } = await this.supabaseService.client
                        .from('persona')
                        .update({
                            tipodoc: formData.tipodoc,
                            numerodoc: formData.numerodoc,
                            nombres: formData.nombres,
                            apellidopat: formData.apellidopat,
                            apellidomat: formData.apellidomat,
                            correo: formData.correo,
                            celular: formData.celular,
                            direccion: formData.direccion,
                            referencia: formData.referencia,
                            cumpleanos: formData.cumpleanos || null,
                            idestado: formData.idestado
                        })
                        .eq('idpersona', this.cliente.idpersona);

                    if (error) throw error;

                    this.messageService.add({
                        severity: 'success',
                        summary: 'Exitoso',
                        detail: 'Cliente actualizado',
                        life: 3000
                    });
                } else {
                    const { error } = await this.supabaseService.client
                        .from('persona')
                        .insert({
                            tipodoc: formData.tipodoc,
                            numerodoc: formData.numerodoc,
                            nombres: formData.nombres,
                            apellidopat: formData.apellidopat,
                            apellidomat: formData.apellidomat,
                            correo: formData.correo,
                            celular: formData.celular,
                            direccion: formData.direccion,
                            referencia: formData.referencia,
                            cumpleanos: formData.cumpleanos || null,
                            idestado: formData.idestado,
                            tipo: 2
                        });

                    if (error) throw error;

                    this.messageService.add({
                        severity: 'success',
                        summary: 'Exitoso',
                        detail: 'Cliente creado',
                        life: 3000
                    });
                }

                this.clienteDialog = false;
                this.loadClientes();
            } catch (error) {
                console.error('Error saving cliente:', error);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Error al guardar cliente'
                });
            }
        }
    }

    hideDialog() {
        this.clienteDialog = false;
        this.submitted = false;
    }

    onGlobalFilter(table: Table, event: Event) {
        table.filterGlobal((event.target as HTMLInputElement).value, 'contains');
    }

    getEstadoLabel(idestado: number): string {
        const estado = this.estados.find(e => e.value === idestado);
        return estado ? estado.label : '';
    }

    getEstadoSeverity(idestado: any): string {
        return idestado == '1' ? 'success' : 'danger';
    }

    getTipoDocLabel(tipodoc: number): string {
        const tipo = this.tiposdoc.find(t => t.value === tipodoc);
        return tipo ? tipo.label : '';
    }
}
