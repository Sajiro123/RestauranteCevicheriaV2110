import { Routes } from '@angular/router';
import { AppLayout } from './layout/component/app.layout';
import { Dashboard } from './pages/dashboard/dashboard';
import { Documentation } from './pages/documentation/documentation';
import { Landing } from './pages/landing/landing';
import { HomeComponent } from './pages/modules/home/home.component';
import { AuthGuard } from './guards/auth.guard';
import { PermisoGuard } from './guards/permiso.guard';
import { ProductosComponent } from './pages/modules/configuracion/productos/productos.component';
import { MenuListComponent } from './pages/modules/configuracion/menu/menu-list/menu-list.component';
import { Notfound } from './pages/notfound/notfound';
import { CajaComponent } from './pages/modules/cierre_dia/caja.component';
import { EmpresaComponent } from './pages/modules/empresa/empresa.component';
export const appRoutes: Routes = [
    {
        path: '',
        component: AppLayout,
        canActivate: [AuthGuard],
        children: [
            { path: 'mesas', loadChildren: () => import('./pages/modules/home/home.routes'), canActivate: [AuthGuard] },
            // { path: 'uikit', loadChildren: () => import('./pages/uikit/uikit.routes') },
            { path: 'documentation', component: Documentation },
            { path: 'pages', loadChildren: () => import('./pages/pages.routes') },
            { path: 'uikit', loadChildren: () => import('./pages/uikit/uikit.routes'), canActivate: [AuthGuard] },
            { path: 'pages', loadChildren: () => import('./pages/pages.routes'), canActivate: [AuthGuard] },
            { path: 'apertura', loadChildren: () => import('./pages/modules/apertura/apertura.routes'), canActivate: [AuthGuard] },
            { path: 'reportes', loadChildren: () => import('./pages/modules/reportes/reportes.routes'), canActivate: [AuthGuard] },
            { path: 'configuracion', loadChildren: () => import('./pages/modules/configuracion/configuracion.routes'), canActivate: [AuthGuard] },
            { path: 'menulista', loadChildren: () => import('./pages/modules/configuracion/menu/menu-list/menu-list.component').then(m => m.MenuListComponent), canActivate: [PermisoGuard], data: { menuRuta: 'menulista' } },
            { path: 'menuperfil', loadChildren: () => import('./pages/modules/configuracion/menu/perfil-permisos/perfil-permisos.component').then(m => m.PerfilPermisosComponent), canActivate: [PermisoGuard], data: { menuRuta: 'menuperfil' } },
            { path: 'caja', loadChildren: () => import('./pages/modules/cierre_dia/caja.routes'), canActivate: [AuthGuard] },
            { path: 'empresa', loadChildren: () => import('./pages/modules/empresa/empresa.routes'), canActivate: [AuthGuard] },

        ]
    },
    { path: 'landing', component: Landing },
    { path: 'notfound', component: Notfound },
    // Add auth routes
    { path: 'auth', loadChildren: () => import('./pages/auth/auth.routes') },
    { path: '**', redirectTo: '/notfound' }
];
