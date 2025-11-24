import { Routes } from '@angular/router';
import { UsuarioComponent } from './usuario.component';
import { MenuFormComponent } from '../menu/menu-form/menu-form/menu-form.component';
import { PerfilPermisosComponent } from '../menu/perfil-permisos/perfil-permisos.component';

export default [
    { path: '', component: UsuarioComponent },
    { path: 'menu-form', component: MenuFormComponent },
    { path: 'perfil-permisos', component: PerfilPermisosComponent }
] as Routes;