import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MenuItem, MenuItemCommandEvent } from 'primeng/api';
import { AppMenuitem } from './app.menuitem';
import { MenuService } from '../../pages/service/menu.service';
import { Router } from '@angular/router';

// Extend MenuItem interface to include our custom properties
interface CustomMenuItem extends MenuItem {
    redirectOnly?: boolean;
    command?: (event: MenuItemCommandEvent) => void;
}

@Component({
    selector: 'app-menu',
    standalone: true,
    imports: [CommonModule, AppMenuitem, RouterModule],
    template: `
        <ul class="layout-menu">
            <ng-container *ngFor="let module of model; let i = index">
                <div class="layout-menuitem-root-text">{{ module.label }}</div>
                <ng-container *ngFor="let item of module.items; let j = index">
                    <!-- <pre>{{ item | json }}</pre> -->
                    <!-- Show redirectOnly items as direct links -->
                    <li *ngIf="item['redirectOnly']" class="layout-menuitem">
                        <a (click)="handleRedirect(item, $event)" class="redirect-link layout-menuitem-link" tabindex="0">
                            <i [ngClass]="item.icon" class="layout-menuitem-icon"></i>
                            <span class="layout-menuitem-text">{{ item.label }}</span>
                            <i class="pi pi-fw pi-arrow-right redirect-indicator"></i>
                        </a>
                    </li>

                    <!-- Show non-redirectOnly items with their children -->
                    <li app-menuitem *ngIf="!item['redirectOnly']" [item]="item" [index]="j" [root]="true"></li>
                </ng-container>
            </ng-container>
        </ul>
    `,
    styles: [`
        :host {
            display: block;
        }

        .layout-menuitem {
            margin-bottom: 2px;
        }
    `]
})
export class AppMenu {
    model: CustomMenuItem[] = [];

    constructor(
        private menuService: MenuService,
        private router: Router
    ) { }

    async ngOnInit() {
        // Try to get menu data from localStorage first
        const storedMenuData = localStorage.getItem('userMenuData');
        const idperfil = JSON.parse(localStorage.getItem('currentUser') || '{}').idperfil || 0;

        let menuData: any[] = [];

        if (storedMenuData) {
            // Use cached menu data
            try {
                menuData = JSON.parse(storedMenuData);
                console.log('Using cached menu data from localStorage');
            } catch (error) {
                console.error('Error parsing stored menu data:', error);
                // Fallback to fetching from service
                menuData = await this.fetchMenuData(idperfil);
            }
        } else {
            // Fetch menu data from service if not in localStorage
            menuData = await this.fetchMenuData(idperfil);
        }

        // Process menu data into tree structure
        const menuItems = this.buildMenuTree(menuData);
        console.log('Processed menu items:', menuItems);

        this.model = [
            {
                label: 'Modulos',
                items: menuItems
            }
        ];
    }

    private async fetchMenuData(idperfil: number): Promise<any[]> {
        const { data, error } = await this.menuService.getMenuByPerfil(idperfil);

        if (error) {
            console.error('Error cargando menús:', error);
            return [];
        }

        // Handle case when data is null or undefined
        const menuData = data || [];
        console.log('Menu data from service:', menuData);

        // Store in localStorage for future use
        localStorage.setItem('userMenuData', JSON.stringify(menuData));

        return menuData;
    }

    handleRedirect(item: CustomMenuItem, event: Event) {
        event.preventDefault();
        console.log('Redirecting to:', item.routerLink);

        if (item.routerLink && item.routerLink.length > 0) {
            const route = item.routerLink[0];

            // Handle external URLs
            if (route.startsWith('http')) {
                window.location.href = route;
                return;
            }

            // Handle internal Angular routes
            // Remove leading slash if present and ensure proper navigation
            const cleanRoute = route.startsWith('/') ? route.substring(1) : route;

            // Navigate relative to current route or use absolute path
            if (cleanRoute.includes('/')) {
                // If it's a full path like '/empresa', navigate absolutely
                this.router.navigateByUrl(cleanRoute);
            } else {
                // If it's just 'empresa', navigate relatively
                this.router.navigate([cleanRoute]);
            }
        }
    }

    buildMenuTree(menus: any[]): CustomMenuItem[] {
        // Handle empty or undefined menus
        if (!menus || menus.length === 0) {
            return [];
        }

        const map: any = {};
        const roots: CustomMenuItem[] = [];

        menus.forEach(m => {
            const item: CustomMenuItem = {
                label: m.menu.nombre,
                icon: m.menu.icono,
                routerLink: [m.menu.ruta],
                items: [],
                // Add a flag to indicate if this item should redirect directly
                // An item should redirect directly if it's a submenu with a valid route
                redirectOnly: m.menu.es_submenu && m.menu.ruta && m.menu.ruta !== '#' && m.menu.ruta !== ''
            };
            console.log(`Processing menu item: ${m.menu.nombre}, redirectOnly: ${item.redirectOnly}`);
            map[m.menu.idmenu] = item;
        });

        menus.forEach(m => {
            const item = map[m.menu.idmenu];

            if (m.menu.idmenu_padre) {
                // Asignar como hijo
                const parent = map[m.menu.idmenu_padre];
                if (parent) {
                    // Add all items to their parent, both redirectOnly and regular items
                    parent.items.push(item);
                }
            } else {
                // Es menú raíz
                roots.push(item);
            }
        });

        return roots;
    }
}
