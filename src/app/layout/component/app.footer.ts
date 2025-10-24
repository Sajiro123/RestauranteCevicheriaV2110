import { Component } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { VoucherService } from '../../services/voucher.service';
import { TagModule } from 'primeng/tag';
import { CommonModule } from '@angular/common';

@Component({
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule, ButtonModule, DialogModule, InputTextModule, ToastModule, TagModule],
    providers: [MessageService],
    selector: 'app-footer',
    template: `<footer class="bg-white shadow-md p-6 mt-4">
        <div class="flex justify-center space-x-8">
            <a href="uikit/home" class="text-gray-600">Home</a>
            <div class="flex items-center justify-between w-full">
                <div class="flex items-center">
                    <img src="https://primefaces.org/cdn/templates/sakai/layout/images/logo-dark.svg" alt="Logo" height="20" class="mr-2" />
                    by
                    <span class="font-medium ml-2">PrimeTek</span>
                </div>
                
                <p-button 
                    label="Consultar QR" 
                    icon="pi pi-qrcode" 
                    severity="info"
                    [outlined]="true"
                    (onClick)="openQrDialog()" />
            </div>
        </div>

        <!-- Modal para consultar QR -->
        <p-dialog 
            [(visible)]="qrDialog" 
            [position]="'top'" 
            header="Consultar Vale QR" 
            [style]="{ width: '500px' }" 
            [modal]="true" 
            [draggable]="false" 
            [resizable]="false" 
            styleClass="p-fluid">
            
            <ng-template pTemplate="content">
                <div class="px-6 py-4 space-y-6" [formGroup]="qrForm">
                    <div>
                        <label for="codigo" class="block text-sm font-medium text-gray-700 mb-2">
                            Código del Vale *
                        </label>
                        <input 
                            id="codigo" 
                            type="text" 
                            formControlName="codigo"
                            placeholder="Ingrese el código del vale QR"
                            class="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                            [class.border-red-500]="qrForm.get('codigo')?.invalid && qrForm.get('codigo')?.touched" />
                        <small 
                            class="text-red-500 block mt-1" 
                            *ngIf="qrForm.get('codigo')?.invalid && qrForm.get('codigo')?.touched">
                            El código es requerido
                        </small>
                    </div>

                    <!-- Mostrar información del vale si se encuentra -->
                    <div *ngIf="voucherInfo" class="bg-gray-50 p-4 rounded-lg border">
                        <h4 class="text-lg font-semibold text-gray-800 mb-3">Información del Vale</h4>
                        
                        <div class="space-y-2">
                            <div class="flex justify-between">
                                <span class="font-medium">Código:</span>
                                <span class="font-mono">{{ voucherInfo.codigo }}</span>
                            </div>
                            
                            <div class="flex justify-between">
                                <span class="font-medium">Descripción:</span>
                                <span>{{ voucherInfo.descripcion || 'Sin descripción' }}</span>
                            </div>
                            
                            <div class="flex justify-between">
                                <span class="font-medium">Fecha de creación:</span>
                                <span>{{ voucherInfo.fecha_creacion | date:'dd/MM/yyyy HH:mm' }}</span>
                            </div>
                            
                            <div class="flex justify-between">
                                <span class="font-medium">Fecha de vencimiento:</span>
                                <span>{{ voucherInfo.fecha_vencimiento | date:'dd/MM/yyyy' }}</span>
                            </div>
                            
                            <div class="flex justify-between">
                                <span class="font-medium">Estado:</span>
                                <p-tag 
                                    [value]="getEstadoLabel(voucherInfo.estado)" 
                                    [severity]="getEstadoSeverity(voucherInfo.estado)" />
                            </div>
                            
                            <div class="flex justify-between" *ngIf="voucherInfo.fecha_uso">
                                <span class="font-medium">Fecha de uso:</span>
                                <span>{{ voucherInfo.fecha_uso | date:'dd/MM/yyyy HH:mm' }}</span>
                            </div>
                            
                            <!-- Información del pedido -->
                            <div *ngIf="voucherInfo.pedido" class="mt-4 pt-4 border-t border-gray-300">
                                <h5 class="font-semibold text-gray-700 mb-2">Pedido Relacionado</h5>
                                <div class="space-y-1 text-sm">
                                    <div class="flex justify-between">
                                        <span class="font-medium">ID Pedido:</span>
                                        <span>#{{ voucherInfo.pedido.idpedido }}</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span class="font-medium">Fecha:</span>
                                        <span>{{ voucherInfo.pedido.fecha | date:'dd/MM/yyyy HH:mm' }}</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span class="font-medium">Total:</span>
                                        <span class="font-semibold">{{ voucherInfo.pedido.total | currency:'S/ ' }}</span>
                                    </div>
                                    <div class="flex justify-between" *ngIf="voucherInfo.pedido.mozo">
                                        <span class="font-medium">Mozo:</span>
                                        <span>{{ voucherInfo.pedido.mozo.nombres }}</span>
                                    </div>
                                </div>
                                
                                <!-- Detalles del pedido -->
                                <div *ngIf="voucherInfo.pedido.pedidodetalle && voucherInfo.pedido.pedidodetalle.length > 0" class="mt-3">
                                    <h6 class="font-semibold text-gray-600 mb-2 text-xs">Productos del Pedido:</h6>
                                    <div class="bg-white rounded border border-gray-200 max-h-40 overflow-y-auto">
                                        <div *ngFor="let detalle of voucherInfo.pedido.pedidodetalle" class="px-2 py-1.5 border-b border-gray-100 last:border-b-0">
                                            <div class="flex justify-between items-start text-xs">
                                                <div class="flex-1">
                                                    <div class="font-medium text-gray-800">{{ detalle.producto?.nombre || 'Producto' }}</div>
                                                    <div class="text-gray-500 text-xs" *ngIf="detalle.producto?.categoria">
                                                        {{ detalle.producto.categoria.nombre }}
                                                    </div>
                                                </div>
                                                <div class="text-right ml-2">
                                                    <div class="text-gray-600">x{{ detalle.cantidad || 1 }}</div>
                                                    <div class="font-semibold" *ngIf="detalle.precio">S/ {{ detalle.precio }}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Botón para usar el vale si está activo y no vencido -->
                        <div class="mt-4" *ngIf="voucherInfo.estado == '1' && !isVoucherExpired(voucherInfo.fecha_vencimiento)">
                            <p-button 
                                label="Usar Vale" 
                                icon="pi pi-check" 
                                severity="success"
                                [loading]="isUsingVoucher"
                                (onClick)="useVoucher()" 
                                styleClass="w-full" />
                        </div>
                        
                        <!-- Mensaje si el vale ya fue usado -->
                        <div class="mt-4" *ngIf="voucherInfo.estado == '2'">
                            <div class="bg-gray-200 text-gray-700 p-3 rounded text-center font-medium">
                                ✓ Este vale ya ha sido utilizado
                            </div>
                        </div>
                        
                        <!-- Mensaje si el vale está vencido -->
                        <div class="mt-4" *ngIf="voucherInfo.estado == '1' && isVoucherExpired(voucherInfo.fecha_vencimiento)">
                            <div class="bg-red-100 text-red-700 p-3 rounded text-center font-medium">
                                ⚠️ Este vale ha expirado
                            </div>
                        </div>
                    </div>
                </div>
            </ng-template>

            <ng-template pTemplate="footer">
                <div class="flex justify-end gap-4 px-6 pb-4">
                    <p-button 
                        styleClass="p-button-raised p-button-primary" 
                        icon="pi pi-search" 
                        label="Consultar" 
                        [loading]="isSearching"
                        [disabled]="qrForm.invalid || isSearching"
                        (onClick)="searchVoucher()" />
                    <p-button 
                        styleClass="p-button-raised p-button-secondary" 
                        icon="pi pi-times" 
                        label="Cerrar" 
                        (onClick)="hideQrDialog()" />
                </div>
            </ng-template>
        </p-dialog>

        <p-toast />
    </footer>`
})
export class AppFooter {
    qrDialog: boolean = false;
    qrForm: FormGroup;
    voucherInfo: any = null;
    isSearching: boolean = false;
    isUsingVoucher: boolean = false;

    constructor(private fb: FormBuilder, private voucherService: VoucherService, private messageService: MessageService) {
        this.qrForm = this.fb.group({
            codigo: ['', [Validators.required, Validators.minLength(3)]]
        });
    }

    openQrDialog() {
        this.qrDialog = true;
        this.voucherInfo = null;
        this.qrForm.reset();
    }

    hideQrDialog() {
        this.qrDialog = false;
        this.voucherInfo = null;
        this.qrForm.reset();
    }

    async searchVoucher() {
        debugger;
        if (this.qrForm.valid) {
            this.isSearching = true;
            const codigo = this.qrForm.get('codigo')?.value;
            try {
                const result = await this.voucherService.searchVoucher(codigo);

                if (!result.success) {
                    this.messageService.add({
                        severity: 'warn',
                        summary: 'Vale no encontrado',
                        detail: 'No se encontró un vale con ese código',
                        life: 5000
                    });
                    this.voucherInfo = null;
                } else {
                    this.voucherInfo = result.data;
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Vale encontrado',
                        detail: 'Información del vale cargada correctamente',
                        life: 3000
                    });
                }
            } catch (error) {
                console.error('Error searching voucher:', error);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Error al buscar el vale',
                    life: 5000
                });
            } finally {
                this.isSearching = false;
            }
        }
    }

    async useVoucher() {
        if (!this.voucherInfo) return;

        // Validar que el vale esté disponible (estado 1)
        if (this.voucherInfo.estado != 1) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Vale no disponible',
                detail: 'Este vale ya ha sido utilizado',
                life: 5000
            });
            return;
        }

        // Validar que el vale no esté vencido
        if (this.isVoucherExpired(this.voucherInfo.fecha_vencimiento)) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Vale vencido',
                detail: 'Este vale ha expirado y no puede ser utilizado',
                life: 5000
            });
            return;
        }

        this.isUsingVoucher = true;

        try {
            const result = await this.voucherService.useVoucher(this.voucherInfo.codigo);

            if (result.success) {
                this.messageService.add({
                    severity: 'success',
                    summary: 'Vale utilizado',
                    detail: 'El vale ha sido marcado como usado exitosamente',
                    life: 3000
                });

                // Actualizar la información del vale
                this.voucherInfo.estado = 2;
                this.voucherInfo.fecha_uso = new Date().toISOString();
            } else {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'No se pudo usar el vale. Puede que ya haya sido utilizado.',
                    life: 5000
                });
            }
        } catch (error) {
            console.error('Error using voucher:', error);
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Error al usar el vale',
                life: 5000
            });
        } finally {
            this.isUsingVoucher = false;
        }
    }

    getEstadoLabel(estado: any): string {
        if (estado === '1') return 'Disponible';
        if (estado === '2') return 'Usado';
        return 'Desconocido';
    }

    getEstadoSeverity(estado: any): string {
        return estado === '1' ? 'success' : 'secondary';
    }

    isVoucherExpired(fechaVencimiento: string): boolean {
        const now = new Date();
        const expiration = new Date(fechaVencimiento);
        return now > expiration;
    }
}
