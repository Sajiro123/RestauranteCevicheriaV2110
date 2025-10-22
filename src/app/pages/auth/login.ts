import { Component } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Router, ActivatedRoute } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { RippleModule } from 'primeng/ripple';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { AppFloatingConfigurator } from '../../layout/component/app.floatingconfigurator';
import { AuthService } from '../../services/auth.service';
import { ImportsModule } from '../imports';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [ImportsModule, ButtonModule, CheckboxModule, InputTextModule, PasswordModule, FormsModule, ReactiveFormsModule, RouterModule, RippleModule, AppFloatingConfigurator, ToastModule],
    providers: [MessageService],
    template: `
        <app-floating-configurator />
        <p-toast />
        <div class="bg-surface-50 dark:bg-surface-950 flex items-center justify-center min-h-screen min-w-[100vw] overflow-hidden">
            <div class="flex flex-col items-center justify-center">
                <div style="border-radius: 56px; padding: 0.3rem; background: linear-gradient(180deg, var(--primary-color) 10%, rgba(33, 150, 243, 0) 30%)">
                    <div class="w-full bg-surface-0 dark:bg-surface-900 py-20 px-8 sm:px-20" style="border-radius: 53px" [formGroup]="loginForm">
                    <img style="margin-left: 30%;" src="assets/img/logo.png" width="200px" />
                        <div class="text-center mb-8"> 
                            <div class="text-surface-900 dark:text-surface-0 text-3xl font-medium mb-4">¡Bienvenido al Sistema!</div>
                            <span class="text-muted-color font-medium">Inicia sesión para continuar</span>
                        </div>

                        <form (ngSubmit)="onSubmit()" [formGroup]="loginForm">
                            <div class="mb-6">
                                <label for="username" class="block text-surface-900 dark:text-surface-0 text-xl font-medium mb-2">Usuario</label>
                                <input 
                                    pInputText 
                                    id="username" 
                                    type="text" 
                                    placeholder="Nombre de usuario" 
                                    class="w-full md:w-[30rem]" 
                                    formControlName="username"
                                    [class.ng-invalid]="loginForm.get('username')?.invalid && loginForm.get('username')?.touched" />
                                <small 
                                    class="text-red-500 block mt-1" 
                                    *ngIf="loginForm.get('username')?.invalid && loginForm.get('username')?.touched">
                                    El usuario es requerido
                                </small>
                            </div>

                            <div class="mb-6">
                                <label for="password1" class="block text-surface-900 dark:text-surface-0 font-medium text-xl mb-2">Contraseña</label>
                                <p-password 
                                    id="password1" 
                                    formControlName="password"
                                    placeholder="Contraseña" 
                                    [toggleMask]="true" 
                                    [fluid]="true" 
                                    [feedback]="false"
                                    [class.ng-invalid]="loginForm.get('password')?.invalid && loginForm.get('password')?.touched">
                                </p-password>
                                <small 
                                    class="text-red-500 block mt-1" 
                                    *ngIf="loginForm.get('password')?.invalid && loginForm.get('password')?.touched">
                                    La contraseña es requerida
                                </small>
                            </div>

                            <div class="flex items-center justify-between mt-2 mb-8 gap-8">
                                <div class="flex items-center">
                                    <p-checkbox formControlName="rememberMe" id="rememberme1" binary class="mr-2"></p-checkbox>
                                    <label for="rememberme1">Recordarme</label>
                                </div>
                                <span class="font-medium no-underline ml-2 text-right cursor-pointer text-primary">¿Olvidaste tu contraseña?</span>
                            </div>
                            
                            <p-button 
                                label="Iniciar Sesión" 
                                styleClass="w-full" 
                                type="submit"
                                [loading]="isLoading"
                                [disabled]="loginForm.invalid || isLoading">
                            </p-button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    `
})
export class Login {
    loginForm: FormGroup;
    isLoading: boolean = false;
    returnUrl: string = '/';

    constructor(private fb: FormBuilder, private authService: AuthService, private router: Router, private route: ActivatedRoute, private messageService: MessageService) {
        this.loginForm = this.fb.group({
            username: ['', [Validators.required]],
            password: ['', [Validators.required]],
            rememberMe: [false]
        });

        // Obtener la URL de retorno de los query parameters
        this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
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
                        this.authService.redirectAfterLogin(this.returnUrl);
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
