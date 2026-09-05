import { CommonModule } from '@angular/common';
import { Component, ViewChild, Output, EventEmitter, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ImportsModule } from '../../../imports';
import { ConfirmationService, MessageService } from 'primeng/api';
import { SupabaseService } from '../../../../services/supabase.service';
import { SaasMasterService } from '../../../../services/saas-master.service';
import { Table } from 'primeng/table';

@Component({
    selector: 'app-personal',
    imports: [CommonModule, FormsModule, ReactiveFormsModule, ImportsModule],
    templateUrl: './personal.component.html',
    styleUrl: './personal.component.scss',
    providers: [MessageService, ConfirmationService]
})
export class PersonalComponent implements OnInit {
    @ViewChild('dt') dt!: Table;
    @Output() backToMain = new EventEmitter<void>();

    personal: any[] = [];
    filteredPersonal: any[] = [];
    perfiles: any[] = [];
    estados: any[] = [];
    personalDialog: boolean = false;
    persona: any = {};
    submitted: boolean = false;
    selectedPersonal: any[] = [];
    personalForm: FormGroup;
    isEditing: boolean = false;
    loading: boolean = false;

    selectedStateFilter: string = 'TODOS';
    selectedPerfilId: number | null = null;
    searchTerm: string = '';

    constructor(
        private supabaseService: SupabaseService,
        private saasMasterService: SaasMasterService,
        private messageService: MessageService,
        private confirmationService: ConfirmationService,
        private fb: FormBuilder
    ) {
        this.personalForm = this.fb.group({
            nombres: ['', [Validators.required, Validators.minLength(2)]],
            apellidopat: ['', [Validators.required, Validators.minLength(2)]],
            apellidomat: [''],
            numerodoc: [''],
            correo: ['', [Validators.email]],
            celular: [''],
            direccion: [''],
            referencia: [''],
            cumpleanos: [''],
            idperfil: ['', Validators.required],
            idestado: [1, Validators.required],
            tieneUsuario: [false],
            password: [''],
            pinSeguridad: ['1234']
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

    // ── GETTERS PARA KPIS ──────────────────────────────────────────
    get totalPersonal(): number {
        return this.personal.length;
    }

    get totalActivos(): number {
        return this.personal.filter(p => p.idestado === 1 || p.idestado === '1').length;
    }

    get totalInactivos(): number {
        return this.personal.filter(p => p.idestado === 0 || p.idestado === '0').length;
    }

    get totalPerfiles(): number {
        return this.perfiles.length;
    }

    // ── MÉTODOS DE FILTRADO ────────────────────────────────────────
    filterByState(state: string) {
        this.selectedStateFilter = state;
        this.applyFilter();
    }

    selectPerfilChip(idperfil: number | null) {
        if (this.selectedPerfilId === idperfil) {
            this.selectedPerfilId = null;
        } else {
            this.selectedPerfilId = idperfil;
        }
        this.applyFilter();
    }

    onSearch(event: Event) {
        this.searchTerm = (event.target as HTMLInputElement).value;
        this.applyFilter();
    }

    applyFilter() {
        let list = [...this.personal];

        if (this.selectedStateFilter === 'ACTIVOS') {
            list = list.filter(p => p.idestado === 1 || p.idestado === '1');
        } else if (this.selectedStateFilter === 'INACTIVOS') {
            list = list.filter(p => p.idestado === 0 || p.idestado === '0');
        }

        if (this.selectedPerfilId !== null) {
            list = list.filter(p => p.idperfil === this.selectedPerfilId);
        }

        if (this.searchTerm) {
            const term = this.searchTerm.toLowerCase().trim();
            list = list.filter(p =>
                (p.nombres || '').toLowerCase().includes(term) ||
                (p.apellidopat || '').toLowerCase().includes(term) ||
                (p.apellidomat || '').toLowerCase().includes(term) ||
                (p.direccion || '').toLowerCase().includes(term) ||
                (p.referencia || '').toLowerCase().includes(term) ||
                (this.getPerfilName(p.idperfil) || '').toLowerCase().includes(term) ||
                String(p.idpersona || '').includes(term)
            );
        }

        this.filteredPersonal = list;
    }

    getInitials(nombres: string, apellidopat: string): string {
        const n = (nombres || '').trim().charAt(0).toUpperCase();
        const a = (apellidopat || '').trim().charAt(0).toUpperCase();
        return `${n}${a}` || 'P';
    }

    mapPerfilCodeToId(codigo: string): number {
        const c = (codigo || '').toUpperCase();
        if (c.includes('ADMIN')) return 1;
        if (c.includes('MOZO') || c.includes('MESERO')) return 2;
        if (c.includes('COCIN') || c.includes('CHEF')) return 3;
        if (c.includes('CAJER')) return 4;
        return 2;
    }

    mapIdToPerfilCode(id: number): string {
        switch (Number(id)) {
            case 1: return 'ADMIN_RESTAURANTE';
            case 2: return 'MOZO_RESTAURANTE';
            case 3: return 'COCINERO_RESTAURANTE';
            case 4: return 'CAJERO_RESTAURANTE';
            default: return 'MOZO_RESTAURANTE';
        }
    }

    async loadPersonal() {
        this.loading = true;
        try {
            const usuarios = await this.saasMasterService.getUsuariosNegocio();
            if (usuarios && usuarios.length > 0) {
                this.personal = usuarios.map((u, idx) => {
                    const apellidosParts = (u.apellidos || '').trim().split(' ');
                    const idperfil = this.mapPerfilCodeToId(u.perfilCodigo);
                    return {
                        idpersona: idx + 1,
                        saasId: u.id,
                        saasUsuarioId: u.usuarioId,
                        personaId: u.personaId,
                        tieneUsuario: !!u.tieneUsuario,
                        nombres: u.nombres || u.nombreCompleto || u.email,
                        apellidopat: apellidosParts[0] || u.apellidos || '',
                        apellidomat: apellidosParts.slice(1).join(' ') || '',
                        numerodoc: u.numeroDocumento || '',
                        tipodoc: u.tipoDocumento || 'DNI',
                        correo: u.email,
                        email: u.email,
                        celular: u.telefono || '',
                        direccion: u.direccion || '',
                        referencia: '',
                        cumpleanos: u.fechanacimiento || null,
                        fechanacimiento: u.fechanacimiento || null,
                        idestado: u.estaActivo ? 1 : 0,
                        idperfil: idperfil,
                        perfilCodigo: u.perfilCodigo,
                        perfilNombre: u.perfilNombre || this.getPerfilName(idperfil),
                        perfil: { nombre: u.perfilNombre || this.getPerfilName(idperfil) },
                        pin: u.pinSeguridad,
                        esMaster: u.esMaster
                    };
                });
                this.applyFilter();
                return;
            }
            await this.loadPersonalFallback();
        } catch (error) {
            console.warn('[Personal] Fallback a Supabase local para personal:', error);
            await this.loadPersonalFallback();
        } finally {
            this.loading = false;
        }
    }

    private async loadPersonalFallback() {
        try {
            const { data, error } = await this.supabaseService.client
                .from('persona')
                .select(`
                    *,
                    perfil:idperfil(nombre)
                `)
                .is('deleted', null)
                .eq('tipo', 1)
                .order('nombres');

            if (error) throw error;
            this.personal = data || [];
            this.applyFilter();
        } catch (error) {
            console.error('Error loading local personal:', error);
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Error al cargar personal'
            });
        }
    }

    async loadPerfiles() {
        try {
            const perfilesSaaS = await this.saasMasterService.getPerfiles();
            if (perfilesSaaS && perfilesSaaS.length > 0) {
                this.perfiles = perfilesSaaS.map(p => ({
                    idperfil: this.mapPerfilCodeToId(p.codigo),
                    codigo: p.codigo,
                    nombre: p.nombre,
                    descripcion: p.descripcion
                }));
                return;
            }
            this.setDefaultPerfiles();
        } catch (error) {
            this.setDefaultPerfiles();
        }
    }

    private setDefaultPerfiles() {
        this.perfiles = [
            { idperfil: 1, codigo: 'ADMIN_RESTAURANTE', nombre: 'Administrador' },
            { idperfil: 2, codigo: 'MOZO_RESTAURANTE', nombre: 'Mozo / Mesero' },
            { idperfil: 3, codigo: 'COCINERO_RESTAURANTE', nombre: 'Cocinero / Chef' },
            { idperfil: 4, codigo: 'CAJERO_RESTAURANTE', nombre: 'Cajero' }
        ];
    }

    openNew() {
        this.persona = {};
        this.personalForm.reset();
        this.personalForm.patchValue({ 
            idestado: 1, 
            idperfil: 2,
            tieneUsuario: false,
            pinSeguridad: '1234'
        });
        this.submitted = false;
        this.isEditing = false;
        this.personalDialog = true;
    }

    editPersona(persona: any) {
        this.persona = { ...persona };

        let cumpleanos: any = '';
        if (persona.cumpleanos || persona.fechanacimiento) {
            const d = new Date(persona.cumpleanos || persona.fechanacimiento);
            cumpleanos = !isNaN(d.getTime()) ? d : '';
        }

        this.personalForm.patchValue({
            nombres: persona.nombres,
            apellidopat: persona.apellidopat,
            apellidomat: persona.apellidomat || '',
            numerodoc: persona.numerodoc || '',
            correo: persona.correo || persona.email || '',
            celular: persona.celular || '',
            direccion: persona.direccion || '',
            referencia: persona.referencia || '',
            cumpleanos: cumpleanos,
            idperfil: persona.idperfil,
            idestado: persona.idestado,
            tieneUsuario: !!persona.tieneUsuario,
            password: '',
            pinSeguridad: persona.pin || '1234'
        });
        this.isEditing = true;
        this.personalDialog = true;
    }

    deletePersona(persona: any) {
        this.confirmationService.confirm({
            message: `¿Está seguro de desactivar a ${persona.nombres} ${persona.apellidopat}?`,
            header: 'Confirmar',
            icon: 'pi pi-exclamation-triangle',
            accept: async () => {
                try {
                    const targetId = persona.saasId || persona.saasUsuarioId || persona.personaId;
                    if (targetId) {
                        await this.saasMasterService.cambiarEstado(targetId, false);
                    } else if (persona.idpersona) {
                        await this.supabaseService.client
                            .from('persona')
                            .update({ deleted: new Date().toISOString() })
                            .eq('idpersona', persona.idpersona);
                    }

                    this.messageService.add({
                        severity: 'success',
                        summary: 'Exitoso',
                        detail: 'Personal desactivado correctamente',
                        life: 3000
                    });
                    this.loadPersonal();
                } catch (error: any) {
                    console.error('Error deleting persona:', error);
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: error?.message || 'Error al desactivar personal'
                    });
                }
            }
        });
    }

    async savePersona() {
        this.submitted = true;

        if (this.personalForm.valid) {
            const formData = this.personalForm.value;
            const perfilCodigo = this.mapIdToPerfilCode(Number(formData.idperfil));
            const cleanName = (formData.nombres || '').trim().toLowerCase().replace(/\s+/g, '');
            const email = formData.correo || (formData.tieneUsuario ? `${cleanName}@willys.com` : null);
            const apellidos = `${formData.apellidopat} ${formData.apellidomat || ''}`.trim();

            let fechanacimiento: string | null = null;
            if (formData.cumpleanos) {
                const date = new Date(formData.cumpleanos);
                if (!isNaN(date.getTime())) {
                    fechanacimiento = date.toISOString().split('T')[0];
                }
            }

            const targetId = this.persona?.saasId || this.persona?.saasUsuarioId || this.persona?.personaId;

            const payload: any = {
                perfilCodigo,
                email,
                nombres: formData.nombres,
                apellidos,
                numeroDocumento: formData.numerodoc,
                telefono: formData.celular,
                direccion: formData.direccion,
                fechanacimiento,
                estaActivo: formData.idestado === 1,
                tieneUsuario: !!formData.tieneUsuario
            };

            if (formData.tieneUsuario) {
                if (formData.password) payload.password = formData.password;
                if (formData.pinSeguridad) payload.pinSeguridad = formData.pinSeguridad;
            }

            try {
                if (this.isEditing && targetId) {
                    await this.saasMasterService.actualizarUsuario(targetId, payload);
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Exitoso',
                        detail: formData.tieneUsuario ? 'Colaborador y cuenta de acceso actualizados en SaaS Master' : 'Colaborador actualizado en SaaS Master',
                        life: 3000
                    });
                } else {
                    if (formData.tieneUsuario && !payload.password) {
                        payload.password = '123456';
                    }
                    await this.saasMasterService.crearUsuario(payload);
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Exitoso',
                        detail: formData.tieneUsuario ? 'Colaborador con cuenta registrado en SaaS Master' : 'Colaborador registrado en SaaS Master',
                        life: 3000
                    });
                }

                this.personalDialog = false;
                this.loadPersonal();
            } catch (error: any) {
                console.error('Error saving persona in SaaS Master:', error);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: error?.message || 'Error al guardar personal en SaaS Master'
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
        if (perfil) return perfil.nombre;
        switch (Number(idperfil)) {
            case 1: return 'Administrador';
            case 2: return 'Mozo / Mesero';
            case 3: return 'Cocinero / Chef';
            case 4: return 'Cajero';
            default: return 'Colaborador';
        }
    }

    getEstadoLabel(idestado: number): string {
        const estado = this.estados.find(e => e.value === idestado);
        return estado ? estado.label : '';
    }

    getEstadoSeverity(idestado: any): string {
        return idestado == '1' ? 'success' : 'danger';
    }
}