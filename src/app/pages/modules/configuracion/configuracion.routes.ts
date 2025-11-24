import { Routes } from '@angular/router';
import { ConfiguracionComponent } from './configuracion.component';
import { AdministracionComponent } from './administracion/administracion.component';

export default [
    { 
        path: '', 
        component: ConfiguracionComponent
    },
    {
        path: 'administracion',
        component: AdministracionComponent,
        loadChildren: () => import('./administracion/administracion.routes')
    },
    {
        path: 'menulista',
        loadChildren: () => import('./menu/menu-list/menu-list.component').then(m => m.default)
    },
    {
        path: 'perfil-permisos',
        loadChildren: () => import('./menu/perfil-permisos/perfil-permisos.component').then(m => m.default)
    }
] as Routes;