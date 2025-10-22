import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { AppMenuitem } from './app.menuitem';

@Component({
    selector: 'app-menu',
    standalone: true,
    imports: [CommonModule, AppMenuitem, RouterModule],
    template: `<ul class="layout-menu">
        <ng-container *ngFor="let item of model; let i = index">
            <li app-menuitem *ngIf="!item.separator" [item]="item" [index]="i" [root]="true"></li>
            <li *ngIf="item.separator" class="menu-separator"></li>
        </ng-container>
    </ul> `
})
export class AppMenu {
    model: MenuItem[] = [];

    ngOnInit() {
        this.model = [
            {
                label: 'Modulos',
                items: [
                    { label: 'Mesas', icon: 'pi pi-fw pi-home', routerLink: ['/'] },
                    { label: 'Apertura Caja', icon: 'pi pi-fw pi-wallet', routerLink: ['/uikit/apertura'] },
                    { label: 'Reportes', icon: 'pi pi-fw pi-chart-bar', routerLink: ['/uikit/reportes'] },
                    { label: 'Configuración', icon: 'pi pi-fw pi-cog', routerLink: ['/uikit/configuration'] }
                    // { label: 'Configuraciones', icon: 'pi pi-fw pi-cog', routerLink: ['/uikit/configuration'] },
                    // { label: 'Apertura', icon: 'pi pi-fw pi-clock', routerLink: ['/uikit/apertura'] },
                    // { label: 'Reportes', icon: 'pi pi-chart-line', routerLink: ['/uikit/reportes'] }
                ]
            }
        ];
    }
}
