import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-administracion',
  standalone: true,
  imports: [RouterModule, CommonModule, ButtonModule],
  template: `
    <div class="card">
      <div class="flex flex-wrap gap-2 mb-4">
        <p-button label="Usuarios" routerLink="." [outlined]="true"></p-button>
        <p-button label="Gestión de Menú" routerLink="menu-form" [outlined]="true"></p-button>
        <p-button label="Permisos por Perfil" routerLink="perfil-permisos" [outlined]="true"></p-button>
      </div>
      <router-outlet></router-outlet>
    </div>
  `
})
export class AdministracionComponent {}