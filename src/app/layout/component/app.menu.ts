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
        .redirect-link {
            display: flex;
            align-items: center;
            position: relative;
            outline: 0 none;
            color: var(--text-color);
            cursor: pointer;
            padding: 0.85rem 1.25rem;
            border-radius: var(--content-border-radius);
            transition: all 0.2s ease;
            text-decoration: none;
            background: linear-gradient(to right, rgba(0,0,0,0.02) 0%, rgba(0,0,0,0.0) 100%);
            border-left: 3px solid var(--primary-color);
            margin: 0.25rem 0;
            box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        }
        
        .redirect-link:hover {
            background: linear-gradient(to right, var(--primary-100) 0%, var(--primary-50) 100%);
            color: var(--primary-700);
            transform: translateX(3px);
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .redirect-link:focus {
            box-shadow: inset 0 0 0 1px var(--focus-ring-color), 0 0 0 2px var(--focus-ring-color-transparent);
        }
        
        .redirect-link .layout-menuitem-icon {
            margin-right: 0.75rem;
            color: var(--primary-color);
            font-size: 1.1rem;
        }
        
        .redirect-link .layout-menuitem-text {
            font-weight: 600;
            flex-grow: 1;
            letter-spacing: 0.2px;
        }
        
        .redirect-link:hover .layout-menuitem-text {
            color: var(--primary-800);
        }
        
        .redirect-link .redirect-indicator {
            font-size: 0.8rem;
            margin-left: auto;
            color: var(--primary-color);
            opacity: 0.7;
            transition: transform 0.3s ease;
        }
        
        .redirect-link:hover .redirect-indicator {
            transform: translateX(2px);
            opacity: 1;
        }
        
        .layout-menuitem {
            margin-bottom: 3px;
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
            this.router.navigate([item.routerLink[0]]);
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