import { Component, EventEmitter, OnInit, Output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SupabaseService } from '../../../../services/supabase.service';
import { MenuService } from '../../../service/menu.service';

// PrimeNG Components
import { TableModule, Table } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToolbarModule } from 'primeng/toolbar';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { TagModule } from 'primeng/tag';
import { SelectModule } from 'primeng/select';
import { MessageService, ConfirmationService } from 'primeng/api';

interface Usuario {
  idusuario: number;
  idperfil: number;
  username: string;
  password: string;
  newPassword?: string; // Add this property for password changes
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  id_created_at: number | null;
  id_updated_at: number | null;
  id_deleted_at: number | null;
  deleted: number;
  nombre: string;
  estado: number;
}

interface Perfil {
  idperfil: number;
  nombre: string;
}

@Component({
  selector: 'app-usuario',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    DropdownModule,
    DialogModule,
    ToastModule,
    ConfirmDialogModule,
    ToolbarModule,
    IconFieldModule,
    InputIconModule,
    TagModule,
    SelectModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './usuario.component.html',
  styleUrls: ['./usuario.component.scss']
})
export class UsuarioComponent implements OnInit {
  @ViewChild('dt') dt!: Table;

  usuarios: Usuario[] = [];
  perfiles: Perfil[] = [];
  selectedUsuario: Usuario | null = null;
  usuarioDialog: boolean = false;
  deleteUsuarioDialog: boolean = false;
  submitted: boolean = false;
  loading: boolean = true;
  @Output() backToMain = new EventEmitter<void>();

  constructor(
    private router: Router,
    private supabaseService: SupabaseService,
    private menuService: MenuService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) { }

  async ngOnInit() {
    await this.loadUsuarios();
    await this.loadPerfiles();
  }

  goBack() {
    this.backToMain.emit();
  }

  async loadUsuarios() {
    this.loading = true;
    try {
      const { data, error } = await this.supabaseService.client
        .from('usuario')
        .select('*')
        .is('deleted', null)
        .order('nombre');

      if (error) throw error;

      this.usuarios = data || [];
    } catch (error: any) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Error al cargar usuarios: ' + error.message
      });
    } finally {
      this.loading = false;
    }
  }

  async loadPerfiles() {
    try {
      const { data, error } = await this.menuService.getPerfiles();

      if (error) throw error;

      this.perfiles = data || [];
    } catch (error: any) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Error al cargar perfiles: ' + error.message
      });
    }
  }

  openNew() {
    this.selectedUsuario = {
      idusuario: 0,
      idperfil: 0,
      username: '',
      password: '',
      newPassword: '', // Initialize newPassword
      created_at: '',
      updated_at: '',
      deleted_at: null,
      id_created_at: null,
      id_updated_at: null,
      id_deleted_at: null,
      deleted: 0,
      nombre: '',
      estado: 1
    };
    this.submitted = false;
    this.usuarioDialog = true;
  }

  editUsuario(usuario: Usuario) {
    this.selectedUsuario = { ...usuario };
    this.usuarioDialog = true;
  }

  async deleteUsuario(usuario: Usuario) {
    this.confirmationService.confirm({
      message: '¿Está seguro que desea eliminar al usuario ' + usuario.nombre + '?',
      header: 'Confirmar',
      icon: 'pi pi-exclamation-triangle',
      accept: async () => {
        try {
          const { error } = await this.supabaseService.client
            .from('usuario')
            .update({ deleted: 1, deleted_at: new Date().toISOString() })
            .eq('idusuario', usuario.idusuario);

          if (error) throw error;

          await this.loadUsuarios();
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Usuario eliminado correctamente'
          });
        } catch (error: any) {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Error al eliminar usuario: ' + error.message
          });
        }
      }
    });
  }

  async saveUsuario() {
    this.submitted = true;

    if (!this.selectedUsuario?.nombre?.trim() || !this.selectedUsuario?.username?.trim() ||
      !this.selectedUsuario?.idperfil) {
      return;
    }

    try {
      if (this.selectedUsuario.idusuario) {
        // Update existing usuario
        const updateData: any = {
          idperfil: this.selectedUsuario.idperfil,
          username: this.selectedUsuario.username,
          nombre: this.selectedUsuario.nombre,
          estado: this.selectedUsuario.estado,
          updated_at: new Date().toISOString()
        };

        // Only update password if newPassword is provided
        if (this.selectedUsuario.newPassword && this.selectedUsuario.newPassword.trim() !== '') {
          updateData.password = this.selectedUsuario.newPassword;
        }

        const { error } = await this.supabaseService.client
          .from('usuario')
          .update(updateData)
          .eq('idusuario', this.selectedUsuario.idusuario);

        if (error) throw error;

        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Usuario actualizado correctamente'
        });
      } else {
        // Create new usuario
        const { error } = await this.supabaseService.client
          .from('usuario')
          .insert({
            idperfil: this.selectedUsuario.idperfil,
            username: this.selectedUsuario.username,
            password: this.selectedUsuario.password || '123456', // Default password
            nombre: this.selectedUsuario.nombre,
            estado: 1,
            created_at: new Date().toISOString()
          });

        if (error) throw error;

        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Usuario creado correctamente'
        });
      }

      this.usuarioDialog = false;
      this.selectedUsuario = null;
      await this.loadUsuarios();
    } catch (error: any) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Error al guardar usuario: ' + error.message
      });
    }
  }

  hideDialog() {
    this.usuarioDialog = false;
    this.submitted = false;
  }

  findPerfilName(idperfil: number): string {
    const perfil = this.perfiles.find(p => p.idperfil === idperfil);
    return perfil ? perfil.nombre : '';
  }

  onGlobalFilter(table: Table, event: Event) {
    table.filterGlobal((event.target as HTMLInputElement).value, 'contains');
  }
}