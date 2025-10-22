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
                                <span class="font-medium">Cliente:</span>
                                <span>{{ getClienteName(voucherInfo.persona) }}</span>
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
                            
                                <!-- <p *ngIf="foundVoucher.pedido"><strong>Pedido:</strong> #{{ foundVoucher.pedido.idpedido }} - Mesa {{ foundVoucher.pedido.mesa }}</p>
                                <p *ngIf="foundVoucher.pedido && foundVoucher.pedido.cliente"><strong>Cliente:</strong> {{ foundVoucher.pedido.cliente }}</p>
                                <p *ngIf="foundVoucher.pedido"><strong>Total Pedido:</strong> {{ foundVoucher.pedido.total | currency:'S/ ' }}</p> -->
                            <div class="flex justify-between" *ngIf="voucherInfo.fecha_uso">
                                <span class="font-medium">Fecha de uso:</span>
                                <span>{{ voucherInfo.fecha_uso | date:'dd/MM/yyyy HH:mm' }}</span>
                            </div>
                        </div>
                        
                        <!-- Botón para usar el vale si está activo -->
                        <div class="mt-4" *ngIf="voucherInfo.estado === 1 && !isVoucherExpired(voucherInfo.fecha_vencimiento)">
                            <p-button 
                                label="Usar Vale" 
                                icon="pi pi-check" 
                                severity="success"
                                [loading]="isUsingVoucher"
                                (onClick)="useVoucher()" 
                                class="w-full" />
                        </div>
                        
                        <!-- Mensaje si el vale está vencido -->
                        <div class="mt-4" *ngIf="isVoucherExpired(voucherInfo.fecha_vencimiento)">
                            <p class="text-red-600 text-center font-medium">
                                ⚠️ Este vale ha expirado
                            </p>
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
                this.voucherInfo.estado = 0;
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

    getClienteName(persona: any): string {
        if (!persona) return 'Cliente no especificado';
        return `${persona.nombres} ${persona.apellidopat} ${persona.apellidomat}`;
    }

    getEstadoLabel(estado: number): string {
        return estado == 1 ? 'Activo' : 'Usado';
    }

    getEstadoSeverity(estado: number): string {
        return estado == 1 ? 'success' : 'secondary';
    }

    isVoucherExpired(fechaVencimiento: string): boolean {
        const now = new Date();
        const expiration = new Date(fechaVencimiento);
        return now > expiration;
    }
}
