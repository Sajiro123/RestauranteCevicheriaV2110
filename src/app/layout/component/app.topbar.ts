import { Component, OnInit } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { StyleClassModule } from 'primeng/styleclass';
import { AppConfigurator } from './app.configurator';
import { AuthService, User } from '../../services/auth.service';
import { LayoutService } from '../service/layout.service';
import { EmpresaService } from '../../pages/service/empresa.service';
import { ImportsModule } from '../../pages/imports';

@Component({
    selector: 'app-topbar',
    standalone: true,
    imports: [ImportsModule, RouterModule, CommonModule, StyleClassModule, AppConfigurator],
    template: ` <div class="layout-topbar">
        <div class="layout-topbar-logo-container flex items-center gap-3 min-w-0">
            <button class="layout-menu-button layout-topbar-action flex-shrink-0" (click)="layoutService.onMenuToggle()" title="Menú">
                <i class="pi pi-bars text-lg"></i>
            </button>
            <a class="layout-topbar-logo flex items-center min-w-0" routerLink="/">
                <span class="text-xl sm:text-2xl font-black text-surface-900 dark:text-surface-0 tracking-tight whitespace-nowrap overflow-hidden text-ellipsis">{{empresaNombre}}</span>
            </a>
        </div>

        <div class="layout-topbar-actions">
            <div class="layout-config-menu">
                <button type="button" class="layout-topbar-action" (click)="toggleDarkMode()">
                    <i [ngClass]="{ 'pi ': true, 'pi-moon': layoutService.isDarkTheme(), 'pi-sun': !layoutService.isDarkTheme() }"></i>
                </button>
                <div class="relative">
                    <button
                        class="layout-topbar-action layout-topbar-action-highlight"
                        pStyleClass="@next"
                        enterFromClass="hidden"
                        enterActiveClass="animate-scalein"
                        leaveToClass="hidden"
                        leaveActiveClass="animate-fadeout"
                        [hideOnOutsideClick]="true"
                    >
                        <i class="pi pi-palette"></i>
                    </button>
                    <app-configurator />
                </div>
            </div>

            <div class="flex items-center gap-4 ml-4">
                <div class="flex items-center gap-2" *ngIf="currentUser">
                    <i class="pi pi-user text-primary"></i>
                    <span class="text-surface-900 dark:text-surface-0 font-medium">{{ userRole }}</span>
                </div>
                <p-button
                    icon="pi pi-sign-out"
                    [rounded]="true"
                    [text]="true"
                    severity="secondary"
                    (click)="logout()"
                    pTooltip="Cerrar Sesión"
                    tooltipPosition="bottom">
                </p-button>
            </div>

            <button class="layout-topbar-menu-button layout-topbar-action" pStyleClass="@next" enterFromClass="hidden" enterActiveClass="animate-scalein" leaveToClass="hidden" leaveActiveClass="animate-fadeout" [hideOnOutsideClick]="true">
                <i class="pi pi-ellipsis-v"></i>
            </button>

            <div class="layout-topbar-menu hidden lg:block">
                <div class="layout-topbar-menu-content">
                    <button type="button" class="layout-topbar-action" *ngIf="showProfileButton" (click)="navigateToEmpresa()">
                        <i class="pi pi-building"></i>
                        <span>Empresa</span>
                    </button>
                </div>
            </div>
        </div>
    </div>`
})
export class AppTopbar implements OnInit {
    items!: MenuItem[];
    currentUser: User | null = null;
    showProfileButton: boolean = false;
    empresaLogo: string = 'assets/img/logo.png';
    empresaNombre: string = 'Sistema';

    get userRole(): string {
        try {
            const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
            if (currentUser.idperfil === 1) return 'Administrador';
            if (currentUser.idperfil === 2) return 'Cajero';
            if (currentUser.idperfil === 3) return 'Mozo';
            return 'Operador';
        } catch (e) {
            return 'Administrador';
        }
    }

    constructor(
        public layoutService: LayoutService,
        private authService: AuthService,
        private empresaService: EmpresaService
    ) {
        // Get current user perfil
        const idperfil = JSON.parse(localStorage.getItem('currentUser') || '{}').idperfil || 0;
        this.showProfileButton = idperfil === 1;
    }

    async ngOnInit() {
        await this.loadEmpresaData();

        // Subscribe to current user changes
        this.authService.currentUser$.subscribe((user) => {
            this.currentUser = user;
        });
    }

    async loadEmpresaData() {
        try {
            const response = await this.empresaService.getAll();
            if (response.data && response.data.length > 0) {
                const empresa = response.data[0];
                this.empresaNombre = empresa.nombre_empresa || 'Sistema';

                // Check for custom logo in localStorage
                const savedLogo = localStorage.getItem('logo');
                if (savedLogo) {
                    this.empresaLogo = savedLogo;
                } else if (empresa.imagen) {
                    this.empresaLogo = empresa.imagen;
                }
            }
        } catch (error) {
            console.error('Error loading empresa data:', error);
            // Fallback to default values
            this.empresaNombre = 'Sistema';
            this.empresaLogo = 'assets/img/logo.png';
        }
    }

    toggleDarkMode() {
        this.layoutService.layoutConfig.update((state) => ({ ...state, darkTheme: !state.darkTheme }));
    }

    logout() {
        this.authService.logout();
    }

    navigateToEmpresa() {
        // Navigate to empresa page
        window.location.href = '/empresa';
    }
}
