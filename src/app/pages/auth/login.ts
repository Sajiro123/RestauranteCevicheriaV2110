import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { RippleModule } from 'primeng/ripple';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { AppFloatingConfigurator } from '../../layout/component/app.floatingconfigurator';
import { AuthService } from '../../services/auth.service';
import { EmpresaService } from '../service/empresa.service';
import { ImportsModule } from '../imports';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [CommonModule, ImportsModule, ButtonModule, CheckboxModule, InputTextModule, PasswordModule, FormsModule, ReactiveFormsModule, RouterModule, RippleModule, AppFloatingConfigurator, ToastModule],
    providers: [MessageService],
    template: `
        <app-floating-configurator />
        <p-toast />
        <div class="flex min-h-screen min-w-full overflow-hidden bg-surface-50 dark:bg-surface-950">

            <!-- LEFT PANEL (Gastronomic Showcase) -->
            <div class="hidden lg:flex lg:w-1/2 xl:w-[55%] relative items-center justify-center p-12 overflow-hidden bg-surface-900 select-none">
                <!-- Background Image with Overlay -->
                <!-- Imagen gastronómica premium de Unsplash optimizada -->
                <div class="absolute inset-0 bg-cover bg-center bg-no-repeat" style="background-image: url('https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=1974&auto=format&fit=crop');"></div>
                <div class="absolute inset-0 bg-gradient-to-t from-surface-950/95 via-surface-900/70 to-surface-800/40"></div>

                <!-- Content -->
                <div class="relative z-10 w-full max-w-2xl text-white flex flex-col justify-end h-full pb-10">
                    <div class="mb-6 flex flex-wrap gap-3">
                        <span class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/20 border border-primary/30 text-primary-200 text-sm font-medium backdrop-blur-md">
                            <i class="pi pi-bolt text-primary-300"></i> Gestión Rápida
                        </span>
                        <span class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-surface-500/30 border border-surface-400/30 text-surface-100 text-sm font-medium backdrop-blur-md">
                            <i class="pi pi-chart-pie text-surface-200"></i> Control Total
                        </span>
                        <span class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-surface-500/30 border border-surface-400/30 text-surface-100 text-sm font-medium backdrop-blur-md">
                            <i class="pi pi-desktop text-surface-200"></i> Sistema Integrado
                        </span>
                    </div>
                    <h1 class="text-4xl xl:text-5xl font-bold leading-tight mb-4 text-white drop-shadow-lg">
                        Optimiza la atención <br>
                        <span class="text-primary-400">en tu restaurante</span>
                    </h1>
                    <p class="text-surface-300 text-lg max-w-lg mb-10 leading-relaxed drop-shadow-md">
                        Sistema integral para gestión de pedidos, control de mesas, inventario y facturación. Diseñado específicamente para negocios gastronómicos.
                    </p>

                    <!-- Floating Glass Card Info -->
                    <div class="bg-surface-800/40 border border-surface-600/30 backdrop-blur-md rounded-2xl p-5 shadow-2xl flex items-start gap-4 w-fit hover:bg-surface-800/50 transition-colors">
                        <div class="bg-primary-500/20 p-3 rounded-xl flex items-center justify-center">
                            <i class="pi pi-star-fill text-primary-400 text-xl"></i>
                        </div>
                        <div>
                            <h4 class="text-white font-medium text-lg m-0 leading-none mb-2">Experiencia Premium</h4>
                            <p class="text-surface-300 text-sm m-0 leading-snug">Interfaz intuitiva, moderna y <br>fácil de usar para tu equipo.</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- RIGHT PANEL (Login Form) -->
            <div class="w-full lg:w-1/2 xl:w-[45%] flex flex-col justify-center bg-surface-0 dark:bg-surface-900 relative shadow-[-20px_0_40px_rgba(0,0,0,0.1)] z-10 px-6 sm:px-12 md:px-20 lg:px-16 xl:px-24 transition-colors duration-300">
                <div class="max-w-[26rem] w-full mx-auto">
                    <!-- Logo con Precarga y Circular -->
                    <div class="flex justify-center mb-10">
                        <div class="relative w-40 h-40 sm:w-48 sm:h-48 rounded-full shadow-lg border-4 border-surface-0 dark:border-surface-800 bg-surface-50 dark:bg-surface-900 flex items-center justify-center overflow-hidden">
                            <!-- Skeleton/Spinner -->
                            <div *ngIf="!isLogoLoaded" class="absolute inset-0 flex flex-col items-center justify-center bg-surface-100 dark:bg-surface-800 animate-pulse">
                                <i class="pi pi-spin pi-spinner text-primary text-3xl mb-2"></i>
                            </div>
                            <!-- Imagen -->
                            <img [src]="empresaLogo" alt="Logo de {{empresaNombre}}" 
                                 class="w-full h-full object-cover transition-opacity duration-500"
                                 [ngClass]="{'opacity-0': !isLogoLoaded, 'opacity-100': isLogoLoaded}"
                                 (load)="isLogoLoaded = true" />
                        </div>
                    </div>

                    <!-- Header -->
                    <div class="text-center mb-10">
                        <h2 class="text-surface-900 dark:text-surface-0 text-3xl font-bold mb-3 tracking-tight">¡Bienvenido!</h2>
                        <p class="text-surface-500 dark:text-surface-400 text-base m-0">Ingresa tus credenciales para acceder al sistema</p>
                    </div>

                    <!-- Form -->
                    <form (ngSubmit)="onSubmit()" [formGroup]="loginForm" class="flex flex-col gap-6">
                        <!-- Username -->
                        <div class="flex flex-col gap-2">
                            <label for="username" class="font-medium text-surface-900 dark:text-surface-100 text-sm">Usuario o Correo</label>
                            <div class="relative username-container-custom">
                                <i class="pi pi-user absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 z-10"></i>
                                <input pInputText id="username" type="text" formControlName="username" placeholder="Tu usuario o correo (ej. alex o maria@willys.com)" class="w-full py-3" style="padding-left: 2.5rem !important;" [class.ng-invalid]="loginForm.get('username')?.invalid && loginForm.get('username')?.touched" />
                            </div>
                            <small class="text-red-500" *ngIf="loginForm.get('username')?.invalid && loginForm.get('username')?.touched">
                                El usuario o correo es requerido.
                            </small>
                        </div>

                        <!-- Password -->
                        <div class="flex flex-col gap-2">
                            <label for="password" class="font-medium text-surface-900 dark:text-surface-100 text-sm">Contraseña</label>
                            <div class="relative password-container-custom">
                                <i class="pi pi-lock absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 z-10"></i>
                                <p-password id="password" formControlName="password" placeholder="Tu contraseña" [toggleMask]="true" [fluid]="true" [feedback]="false" styleClass="w-full" inputStyleClass="w-full pl-10 py-3" [class.ng-invalid]="loginForm.get('password')?.invalid && loginForm.get('password')?.touched">
                                </p-password>
                            </div>
                            <small class="text-red-500" *ngIf="loginForm.get('password')?.invalid && loginForm.get('password')?.touched">
                                La contraseña es requerida.
                            </small>
                        </div>

                        <!-- Options -->
                        <div class="flex items-center justify-between mt-1 mb-2">
                            <div class="flex items-center gap-2">
                                <p-checkbox formControlName="rememberMe" inputId="rememberme1" [binary]="true"></p-checkbox>
                                <label for="rememberme1" class="text-surface-700 dark:text-surface-300 cursor-pointer select-none text-sm mt-1">Recordarme</label>
                            </div>
                            <a class="font-medium text-primary hover:text-primary-600 dark:hover:text-primary-400 transition-colors cursor-pointer text-sm">¿Olvidó su clave?</a>
                        </div>

                        <!-- Submit -->
                        <p-button label="Iniciar Sesión" icon="pi pi-sign-in" iconPos="right" type="submit" [loading]="isLoading" [disabled]="loginForm.invalid || isLoading" styleClass="w-full py-3.5 text-lg rounded-xl shadow-md font-semibold mt-2"></p-button>
                    </form>

                    <!-- Footer -->
                    <div class="mt-14 text-center">
                        <div class="text-sm text-surface-500 dark:text-surface-400 font-medium mb-1.5">
                            &copy; 2024 {{empresaNombre}}. Todos los derechos reservados.
                        </div>
                        <div class="text-xs text-surface-400 dark:text-surface-500 flex flex-col items-center justify-center gap-0.5">
                            <span>Desarrollado por</span>
                            <span class="font-bold text-primary tracking-wide">LightN0tail &mdash; IA & Cloud Solutions</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,
    styles: [`
        /* Ajuste para que el input the password respete el padding izquierdo del icono */
        ::ng-deep .password-container-custom .p-password-input {
            padding-left: 2.5rem !important;
        }
    `]
})
export class Login implements OnInit {
    loginForm: FormGroup;
    isLoading: boolean = false;
    returnUrl: string = '/';
    empresaLogo: string = '';
    empresaNombre: string = 'Sistema';
    logoError: boolean = false;
    isLogoLoaded: boolean = false;

    constructor(
        private fb: FormBuilder,
        private authService: AuthService,
        private empresaService: EmpresaService,
        private router: Router,
        private route: ActivatedRoute,
        private messageService: MessageService
    ) {
        this.loginForm = this.fb.group({
            username: ['', [Validators.required]],
            password: ['', [Validators.required]],
            rememberMe: [false]
        });

        // Obtener la URL de retorno de los query parameters
        this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
    }

    async ngOnInit() {
        await this.loadEmpresaData();
        this.checkSessionClosedMessage();
    }

    checkSessionClosedMessage() {
        const reason = this.authService.sessionClosedReason;
        if (reason) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Sesión cerrada',
                detail: reason,
                life: 8000
            });
            this.authService.sessionClosedReason = null;
        }
    }

    async loadEmpresaData() {
        try {
            const response = await this.empresaService.getAll();
            if (response.data && response.data.length > 0) {
                const empresa = response.data[0];
                this.empresaNombre = empresa.nombre_empresa || 'Sistema';
                localStorage.setItem('nombre_empresa', this.empresaNombre);
                localStorage.setItem('empresa_ruc', empresa.ruc || '');
                localStorage.setItem('empresa_direccion', empresa.direccion || '');
                localStorage.setItem('empresa_celular', empresa.celular || '');

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

    onLogoError() {
        this.logoError = true;
    }

    async onSubmit() {
        if (this.loginForm.valid) {
            this.isLoading = true;

            const { username, password } = this.loginForm.value;

            try {
                const result = await this.authService.login(username, password);

                if (result.success) {
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Éxito',
                        detail: `¡Bienvenido ${result.user?.nombre}!`,
                        life: 3000
                    });

                    // Redirigir al dashboard después de un breve delay
                    setTimeout(() => {
                        this.authService.redirectAfterLogin(this.returnUrl, result.user?.idperfil);
                    }, 1000);
                } else {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error de Autenticación',
                        detail: result.message || 'Credenciales incorrectas',
                        life: 5000
                    });
                }
            } catch (error) {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Error de conexión. Intente nuevamente.',
                    life: 5000
                });
            } finally {
                this.isLoading = false;
            }
        } else {
            this.loginForm.markAllAsTouched();
        }
    }
}
