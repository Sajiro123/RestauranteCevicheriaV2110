import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { StyleClassModule } from 'primeng/styleclass';
import { AppConfigurator } from './app.configurator';
import { AuthService, User } from '../../services/auth.service';
import { LayoutService } from '../service/layout.service';
import { ImportsModule } from '../../pages/imports';

@Component({
    selector: 'app-topbar',
    standalone: true,
    imports: [ImportsModule, RouterModule, CommonModule, StyleClassModule, AppConfigurator],
    template: ` <div class="layout-topbar">
        <div class="layout-topbar-logo-container">
            <button class="layout-menu-button layout-topbar-action" (click)="layoutService.onMenuToggle()">
                <i class="pi pi-bars"></i>
            </button>
            <a class="layout-topbar-logo" routerLink="/">
            <img src="assets/img/logo.png" width="25%" />
                <span style="width: 100% !important;">Cevicheria Willy Norteño Sac</span>
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
                    <span class="text-surface-900 dark:text-surface-0 font-medium">{{ currentUser.nombre }}</span>
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
                    <button type="button" class="layout-topbar-action">
                        <i class="pi pi-calendar"></i>
                        <span>Calendar</span>
                    </button>
                    <button type="button" class="layout-topbar-action">
                        <i class="pi pi-inbox"></i>
                        <span>Messages</span>
                    </button>
                    <button type="button" class="layout-topbar-action">
                        <i class="pi pi-user"></i>
                        <span>Profile</span>
                    </button>
                </div>
            </div>
        </div>
    </div>`
})
export class AppTopbar {
    items!: MenuItem[];
    currentUser: User | null = null;

    constructor(public layoutService: LayoutService, private authService: AuthService, private router: Router) {}

    ngOnInit() {
        // Suscribirse a cambios del usuario actual
        this.authService.currentUser$.subscribe((user) => {
            this.currentUser = user;
        });
    }

    toggleDarkMode() {
        this.layoutService.layoutConfig.update((state) => ({ ...state, darkTheme: !state.darkTheme }));
    }

    logout() {
        this.authService.logout();
    }
}
