import { Component } from '@angular/core';
import { ToppingsComponent } from './toppings/toppings.component';
import { ProductosComponent } from './productos/productos.component';
import { PersonalComponent } from './personal/personal.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ImportsModule } from '../../imports';

@Component({
    selector: 'app-configuracion',
    imports: [ToppingsComponent, ProductosComponent, PersonalComponent, CommonModule, FormsModule, ImportsModule],
    templateUrl: './configuracion.component.html',
    styleUrl: './configuracion.component.scss'
})
export class ConfiguracionComponent {
    selector: boolean = false;
    seleccciontext: string = '';
}
