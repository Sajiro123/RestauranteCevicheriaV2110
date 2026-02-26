import { Component, ElementRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppMenu } from './app.menu';

@Component({
    selector: 'app-sidebar',
    standalone: true,
    imports: [CommonModule, AppMenu],
    template: `
    <div class="layout-sidebar">
        <!-- User Profile Section -->
        <div class="sidebar-user-profile">
            <div class="user-avatar">{{ userInitials }}</div>
            <div class="user-info">
                <span class="user-name">{{ userName }}</span>
                <span class="user-role">{{ userRole }}</span>
            </div>
        </div>

        <!-- Menu -->
        <app-menu></app-menu>

        <!-- Sidebar Footer -->
        <div class="sidebar-footer">
            <i class="pi pi-shield sidebar-footer-icon"></i>
            <span class="sidebar-footer-text">Sistema 1910</span>
        </div>
    </div>`
})
export class AppSidebar implements OnInit {
    userName: string = 'Usuario';
    userRole: string = 'Sistema';
    userInitials: string = 'U';

    constructor(public el: ElementRef) { }

    ngOnInit() {
        try {
            const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
            if (currentUser && currentUser.nombre) {
                this.userName = currentUser.nombre;
                this.userInitials = this.getInitials(currentUser.nombre);
            }
            // Set role based on profile
            if (currentUser.idperfil === 1) {
                this.userRole = 'Administrador';
            } else if (currentUser.idperfil === 2) {
                this.userRole = 'Cajero';
            } else if (currentUser.idperfil === 3) {
                this.userRole = 'Mozo';
            } else {
                this.userRole = 'Operador';
            }
        } catch (e) {
            // fallback defaults
        }
    }

    private getInitials(name: string): string {
        if (!name) return 'U';
        const parts = name.trim().split(/\s+/);
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return parts[0][0].toUpperCase();
    }
}
