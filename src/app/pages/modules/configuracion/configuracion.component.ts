import { Component } from '@angular/core';
import { ToppingsComponent } from './toppings/toppings.component';
import { ProductosComponent } from './productos/productos.component';
import { PersonalComponent } from './personal/personal.component';
import { ClientesComponent } from './clientes/clientes.component';
import { VouchersComponent } from './vouchers/vouchers.component';
import { UsuarioComponent } from './administracion/usuario.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ImportsModule } from '../../imports';
import { MenuFormComponent } from './menu/menu-form/menu-form/menu-form.component';
import { PerfilPermisosComponent } from './menu/perfil-permisos/perfil-permisos.component';
import MenuListComponent from "./menu/menu-list/menu-list.component";
import { RouterModule } from '@angular/router';

@Component({
    selector: 'app-configuracion',
    imports: [
        ToppingsComponent,
        ProductosComponent,
        PersonalComponent,
        ClientesComponent,
        VouchersComponent,
        UsuarioComponent,
        MenuListComponent,
        PerfilPermisosComponent,
        CommonModule,
        FormsModule,
        ImportsModule,
        MenuListComponent,
        RouterModule
    ],
    templateUrl: './configuracion.component.html',
    styleUrl: './configuracion.component.scss'
})
export class ConfiguracionComponent {
    selector: boolean = false;
    seleccciontext: string = '';
}