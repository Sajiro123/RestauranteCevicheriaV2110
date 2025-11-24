import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
// import { PerfilMenuService } from '../../services/perfil-menu.service';
import { MenuService } from '../../../../service/menu.service';

// PrimeNG Components
import { DropdownModule } from 'primeng/dropdown';
import { TableModule } from 'primeng/table';
import { CheckboxModule } from 'primeng/checkbox';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-perfil-permisos',
  templateUrl: './perfil-permisos.component.html',
  standalone: true,
  imports: [
    ButtonModule,
    TableModule,
    // ConfirmDialogModule,
    // DialogModule,
    // ToolbarModule,
    // RippleModule,

    CommonModule,
    FormsModule,
    DropdownModule,
    TableModule,
    CheckboxModule,
    CardModule
  ]
})
export class PerfilPermisosComponent implements OnInit {
  perfiles: any[] = [];
  menus: any[] = [];
  selectedPerfil: number | null = null;
  @Output() backToMain = new EventEmitter<void>();


  constructor(private perfilMenuService: MenuService, private menuService: MenuService) { }
  goBack() {
    this.backToMain.emit();
  }

  async ngOnInit() {
    const res: any = await this.perfilMenuService.getPerfiles();
    this.perfiles = res.data || [];
  }


  async onPerfilChange() {
    if (!this.selectedPerfil) return;
    const resMenus: any = await this.menuService.getMenus();
    const resPerm: any = await this.perfilMenuService.getPermisosByPerfil(this.selectedPerfil);


    const permisosMap = new Map<number, any>();
    (resPerm.data || []).forEach((p: any) => permisosMap.set(p.idmenu, p));


    this.menus = (resMenus.data || []).map((m: any) => ({
      ...m,
      permisos: permisosMap.get(m.idmenu) || { puede_ver: false, puede_editar: false, puede_eliminar: false }
    }));
  }


  async togglePermiso(menu: any, campo: 'puede_ver' | 'puede_editar' | 'puede_eliminar', valor: boolean) {
    if (!this.selectedPerfil) return;
    const payload = {
      idperfil: this.selectedPerfil,
      idmenu: menu.idmenu,
      puede_ver: campo === 'puede_ver' ? valor : menu.permisos.puede_ver,
      puede_editar: campo === 'puede_editar' ? valor : menu.permisos.puede_editar,
      puede_eliminar: campo === 'puede_eliminar' ? valor : menu.permisos.puede_eliminar
    };


    await this.perfilMenuService.savePermiso(payload);
    // actualizar UI local
    menu.permisos = payload;
  }
}

// Add default export for routing
export default PerfilPermisosComponent;