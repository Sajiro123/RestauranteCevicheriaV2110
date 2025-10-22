import { Routes } from '@angular/router';
import { AppLayout } from './app/layout/component/app.layout';
import { Landing } from './app/pages/landing/landing';
import { Notfound } from './app/pages/notfound/notfound';
import { HomeComponent } from './app/pages/modules/home/home.component';
import { AuthGuard } from '../src/app/guards/auth.guard';

export const appRoutes: Routes = [
    {
        path: '',
        component: AppLayout,
        canActivate: [AuthGuard],
        children: [
            { path: '', component: HomeComponent },
            { path: 'uikit', loadChildren: () => import('./app/pages/uikit/uikit.routes'), canActivate: [AuthGuard] },
            { path: 'pages', loadChildren: () => import('./app/pages/pages.routes'), canActivate: [AuthGuard] },
            { path: 'apertura', loadChildren: () => import('./app/pages/modules/apertura/apertura.routes'), canActivate: [AuthGuard] },
            { path: 'reportes', loadChildren: () => import('./app/pages/modules/reportes/reportes.routes'), canActivate: [AuthGuard] },
            { path: 'configuracion', loadChildren: () => import('./app/pages/modules/configuracion/configuracion.routes'), canActivate: [AuthGuard] }
        ]
    },
    { path: 'landing', component: Landing },
    { path: 'auth', loadChildren: () => import('./app/pages/auth/auth.routes') },
    { path: 'notfound', component: Notfound },
    { path: '**', redirectTo: '/notfound' }
];
