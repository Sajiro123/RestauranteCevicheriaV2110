import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { SupabaseService } from './supabase.service';
import { Router, ActivatedRoute } from '@angular/router';

export interface User {
    idusuario: number;
    username: string;
    nombre: string;
    email?: string;
    rol?: string;
}

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private currentUserSubject = new BehaviorSubject<User | null>(null);
    public currentUser$ = this.currentUserSubject.asObservable();
    private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
    public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

    constructor(
        private supabaseService: SupabaseService, 
        private router: Router
    ) {
        // Verificar si hay una sesión guardada al inicializar
        this.checkStoredSession();
    }

    private checkStoredSession() {
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
            try {
                const user = JSON.parse(storedUser);
                this.currentUserSubject.next(user);
                this.isAuthenticatedSubject.next(true);
            } catch (error) {
                console.error('Error parsing stored user:', error);
                localStorage.removeItem('currentUser');
            }
        }
    }

    async login(username: string, password: string): Promise<{ success: boolean; message?: string; user?: User }> {
        try {
            const { data, error } = await this.supabaseService.client
                .from('usuario')
                .select('*')
                .eq('username', username)
                .eq('password', password)
                .is('deleted', null)
                .eq('estado', 1)
                .single();

            if (error || !data) {
                return {
                    success: false,
                    message: 'Usuario o contraseña incorrectos'
                };
            }

            const user: User = {
                idusuario: data.idusuario,
                username: data.username,
                nombre: data.nombre,
                email: data.email,
                rol: data.rol
            };

            // Guardar usuario en localStorage para persistencia
            localStorage.setItem('currentUser', JSON.stringify(user));

            // Actualizar observables
            this.currentUserSubject.next(user);
            this.isAuthenticatedSubject.next(true);

            return {
                success: true,
                user: user
            };
        } catch (error) {
            console.error('Error en login:', error);
            return {
                success: false,
                message: 'Error de conexión. Intente nuevamente.'
            };
        }
    }

    logout(redirectToLogin: boolean = true) {
        // Limpiar localStorage
        localStorage.removeItem('currentUser');

        // Actualizar observables
        this.currentUserSubject.next(null);
        this.isAuthenticatedSubject.next(false);

        // Redirigir al login solo si se especifica
        if (redirectToLogin) {
            this.router.navigate(['/auth/login']);
        }
    }

    getCurrentUser(): User | null {
        return this.currentUserSubject.value;
    }

    isAuthenticated(): boolean {
        return this.isAuthenticatedSubject.value;
    }

    // Método para verificar roles específicos si es necesario
    hasRole(role: string): boolean {
        const user = this.getCurrentUser();
        return user?.rol === role;
    }

    // Método para redirigir después del login exitoso
    redirectAfterLogin(returnUrl?: string) {
        if (returnUrl && returnUrl !== '/auth/login') {
            this.router.navigate([returnUrl]);
        } else {
            this.router.navigate(['/']);
        }
    }
}
