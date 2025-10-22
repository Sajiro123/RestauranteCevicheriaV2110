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

export default [
    // { path: 'button', data: { breadcrumb: 'Button' }, component: ButtonDemo },
    // { path: 'charts', data: { breadcrumb: 'Charts' }, component: ChartDemo },
    // { path: 'file', data: { breadcrumb: 'File' }, component: FileDemo },
    { path: 'formlayout', data: { breadcrumb: 'Form Layout' }, component: FormLayoutDemo },
    { path: 'home', data: { breadcrumb: 'Home' }, component: HomeComponent },
    { path: 'apertura', data: { breadcrumb: 'Apertura' }, component: AperturaComponent },
    { path: 'reportes', data: { breadcrumb: 'Reportes' }, component: ReportesComponent },
    { path: 'configuration', data: { breadcrumb: 'configuration' }, component: ConfiguracionComponent }

    // { path: 'input', data: { breadcrumb: 'Input' }, component: InputDemo },
    // { path: 'list', data: { breadcrumb: 'List' }, component: ListDemo },
    // { path: 'media', data: { breadcrumb: 'Media' }, component: MediaDemo },
    // { path: 'message', data: { breadcrumb: 'Message' }, component: MessagesDemo },
    // { path: 'misc', data: { breadcrumb: 'Misc' }, component: MiscDemo },
    // { path: 'panel', data: { breadcrumb: 'Panel' }, component: PanelsDemo },
    // { path: 'timeline', data: { breadcrumb: 'Timeline' }, component: TimelineDemo },
    // { path: 'table', data: { breadcrumb: 'Table' }, component: TableDemo },
    // { path: 'overlay', data: { breadcrumb: 'Overlay' }, component: OverlayDemo },
    // { path: 'tree', data: { breadcrumb: 'Tree' }, component: TreeDemo },
    // { path: 'menu', data: { breadcrumb: 'Menu' }, component: MenuDemo },
    // { path: '**', redirectTo: '/notfound' }
] as Routes;
