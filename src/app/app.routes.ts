import { Routes } from '@angular/router';
import { AppLayout } from '../app/layout/component/app.layout';
import { Dashboard } from '../app/pages/dashboard/dashboard';
import { Documentation } from '../app/pages/documentation/documentation';
import { Landing } from '../app/pages/landing/landing';
import { HomeComponent } from '../app/pages/modules/home/home.component';
import { AuthGuard } from '../app/guards/auth.guard';

export const appRoutes: Routes = [
    {
        path: '',
        component: AppLayout,
        canActivate: [AuthGuard],
        children: [
            { path: '', component: HomeComponent },
            { path: 'uikit', loadChildren: () => import('../app/pages/uikit/uikit.routes') },
            { path: 'documentation', component: Documentation },
            { path: 'pages', loadChildren: () => import('../app/pages/pages.routes') },
            { path: 'uikit', loadChildren: () => import('../app/pages/uikit/uikit.routes'), canActivate: [AuthGuard] },
            { path: 'pages', loadChildren: () => import('../app/pages/pages.routes'), canActivate: [AuthGuard] },
            { path: 'apertura', loadChildren: () => import('../app/pages/modules/apertura/apertura.routes'), canActivate: [AuthGuard] },
            { path: 'reportes', loadChildren: () => import('../app/pages/modules/reportes/reportes.routes'), canActivate: [AuthGuard] },
            { path: 'configuracion', loadChildren: () => import('../app/pages/modules/configuracion/configuracion.routes'), canActivate: [AuthGuard] }
        ]
    },
    { path: 'landing', component: Landing },

    { path: '**', redirectTo: '/notfound' }
];
