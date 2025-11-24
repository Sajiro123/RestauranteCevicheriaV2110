import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { MenuService } from '../../../../service/menu.service';
import { Menu } from '../../../../../model/Menu';
import { MenuFormComponent } from '../menu-form/menu-form/menu-form.component';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { ToolbarModule } from 'primeng/toolbar';
import { RippleModule } from 'primeng/ripple';
import { Router } from '@angular/router';


@Component({
  selector: 'app-menu-list',
  templateUrl: './menu-list.component.html',
  styleUrls: ['./menu-list.component.scss'],
  standalone: true,
  imports: [
    ButtonModule,
    TableModule,
    ConfirmDialogModule,
    DialogModule,
    ToolbarModule,
    RippleModule,
    MenuFormComponent
  ]
})
export class MenuListComponent implements OnInit {
  menus: Menu[] = [];
  displayedColumns = ['nombre', 'ruta', 'es_submenu', 'orden', 'activo', 'acciones'];
  showDialog = false;
  selectedMenu: Menu | null = null;
  @Output() backToMain = new EventEmitter<void>();


  constructor(private menuService: MenuService, private router: Router,) { }

  goBack() {
    this.backToMain.emit();
  }
  ngOnInit() {
    this.load();
  }


  async load() {
    const res: any = await this.menuService.getMenus();
    this.menus = res.data || [];
  }


  add() {
    this.selectedMenu = null;
    this.showDialog = true;
  }


  edit(menu: Menu) {
    this.selectedMenu = { ...menu }; // Create a copy to avoid direct mutation
    this.showDialog = true;
  }


  onDialogSave() {
    this.showDialog = false;
    this.load(); // Refresh the list
  }


  onDialogClose() {
    this.showDialog = false;
  }


  async remove(idmenu: number | undefined) {
    if (!idmenu) return;
    if (!confirm('¿Eliminar menu?')) return;
    await this.menuService.deleteMenu(idmenu);
    this.load();
  }
}

// Add default export for routing
export default MenuListComponent;