import { Routes } from '@angular/router';
import { ButtonDemo } from './buttondemo';
import { ChartDemo } from './chartdemo';
import { FileDemo } from './filedemo';
import { FormLayoutDemo } from './formlayoutdemo';
import { InputDemo } from './inputdemo';
import { ListDemo } from './listdemo';
import { MediaDemo } from './mediademo';
import { MessagesDemo } from './messagesdemo';
import { MiscDemo } from './miscdemo';
import { PanelsDemo } from './panelsdemo';
import { TimelineDemo } from './timelinedemo';
import { TableDemo } from './tabledemo';
import { OverlayDemo } from './overlaydemo';
import { TreeDemo } from './treedemo';
import { MenuDemo } from './menudemo';
import { HomeComponent } from '../modules/home/home.component';
import { AperturaComponent } from '../modules/apertura/apertura.component';
import { ReportesComponent } from '../modules/reportes/reportes.component';
import { ConfiguracionComponent } from '../modules/configuracion/configuracion.component';
import { MenuListComponent } from '../modules/configuracion/menu/menu-list/menu-list.component';
import { MenuFormComponent } from '../modules/configuracion/menu/menu-form/menu-form/menu-form.component';
import { PerfilPermisosComponent } from '../modules/configuracion/menu/perfil-permisos/perfil-permisos.component';
import { UsuarioComponent } from '../modules/configuracion/administracion/usuario.component';

export default [
    { path: 'formlayout', data: { breadcrumb: 'Form Layout' }, component: FormLayoutDemo },
    { path: 'home', data: { breadcrumb: 'Home' }, component: HomeComponent },
    { path: 'apertura', data: { breadcrumb: 'Apertura' }, component: AperturaComponent },
    { path: 'reportes', data: { breadcrumb: 'Reportes' }, component: ReportesComponent },
    { path: 'configuration', data: { breadcrumb: 'configuration' }, component: ConfiguracionComponent },
    { path: 'menulista', data: { breadcrumb: 'menulista' }, component: MenuListComponent },
    { path: 'perfilpermiso', data: { breadcrumb: 'Perfil Permiso' }, component: PerfilPermisosComponent },
    { path: 'usuario', data: { breadcrumb: 'Usuario' }, component: UsuarioComponent },
    { path: 'mesas', data: { breadcrumb: 'Mesas' }, component: HomeComponent },


] as Routes;
