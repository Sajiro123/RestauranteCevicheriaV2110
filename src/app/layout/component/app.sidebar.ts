import { Component, ElementRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AppMenu } from './app.menu';
import { EmpresaService } from '../../pages/service/empresa.service';

@Component({
    selector: 'app-sidebar',
    standalone: true,
    imports: [CommonModule, RouterModule, AppMenu],
    template: `
    <div class="layout-sidebar">
        <!-- Brand Header (Large & Visible Circular Logo) -->
        <div class="sidebar-brand-header">
            <a routerLink="/" class="brand-link">
                <div class="brand-logo-circle">
                    <img [src]="empresaLogo" [alt]="empresaNombre" class="brand-logo-img" />
                </div>

                <!-- Tipo de Rol debajo de la imagen -->
                <div class="brand-user-role">
                    <i class="pi pi-user"></i>
                    <span>{{ userRole }}</span>
                </div>

                <span class="brand-name">{{ empresaNombre }}</span>
                <span class="brand-address" *ngIf="empresaDireccion">
                    <i class="pi pi-map-marker"></i> {{ empresaDireccion }}
                </span>
            </a>
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
    userRole: string = 'Administrador';
    userInitials: string = 'A';
    empresaLogo: string = 'assets/img/logo.png';
    empresaNombre: string = 'Sistema';
    empresaDireccion: string = '';

    constructor(
        public el: ElementRef,
        private empresaService: EmpresaService
    ) { }

    async ngOnInit() {
        await this.loadEmpresaData();

        try {
            const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
            if (currentUser && currentUser.nombre) {
                this.userName = currentUser.nombre;
            }
            // Set role based on profile
            if (currentUser.idperfil === 1) {
                this.userRole = 'Administrador';
                this.userInitials = 'A';
            } else if (currentUser.idperfil === 2) {
                this.userRole = 'Cajero';
                this.userInitials = 'C';
            } else if (currentUser.idperfil === 3) {
                this.userRole = 'Mozo';
                this.userInitials = 'M';
            } else {
                this.userRole = 'Operador';
                this.userInitials = 'O';
            }
        } catch (e) {
            // fallback defaults
        }
    }

    async loadEmpresaData() {
        try {
            const response = await this.empresaService.getAll();
            if (response.data && response.data.length > 0) {
                const empresa = response.data[0];
                this.empresaNombre = empresa.nombre_empresa || 'Sistema';
                this.empresaDireccion = empresa.direccion || '';

                const savedLogo = localStorage.getItem('logo');
                if (savedLogo) {
                    this.empresaLogo = savedLogo;
                } else if (empresa.imagen) {
                    this.empresaLogo = empresa.imagen;
                }
            }
        } catch (error) {
            this.empresaNombre = 'Sistema';
            this.empresaLogo = 'assets/img/logo.png';
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
