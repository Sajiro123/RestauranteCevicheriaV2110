import { Injectable, Inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { SupabaseService } from './supabase.service';
import { Router, ActivatedRoute } from '@angular/router';
import { MenuService } from '../pages/service/menu.service';

export interface User {
    idusuario: number;
    username: string;
    nombre: string;
    email?: string;
    rol?: string;
    idperfil?: number;
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
        @Inject(MenuService) private menuService: MenuService,
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
                rol: data.rol,
                idperfil: data.idperfil
            };

            // Fetch menu data for this user profile
            const menuData = await this.fetchAndStoreMenuData(data.idperfil);

            // Guardar usuario en localStorage para persistencia
            const userData = {
                ...user,
                menuData: menuData // Include menu data in user object
            };
            localStorage.setItem('currentUser', JSON.stringify(userData));

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

    private async fetchAndStoreMenuData(idperfil: number) {
        try {
            const { data, error } = await this.menuService.getMenuByPerfil(idperfil);

            if (error) {
                console.error('Error fetching menu data:', error);
                return [];
            }

            // Store menu data in localStorage
            const menuData = data || [];
            localStorage.setItem('userMenuData', JSON.stringify(menuData));

            return menuData;
        } catch (error) {
            console.error('Error fetching menu data:', error);
            return [];
        }
    }

    logout(redirectToLogin: boolean = true) {
        // Limpiar localStorage
        localStorage.removeItem('currentUser');
        localStorage.removeItem('userMenuData');

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
    redirectAfterLogin(returnUrl?: string, idperfil?: number) {
        if (returnUrl && returnUrl !== '/auth/login') {
            if (idperfil == 3 || idperfil == 1) {
                this.router.navigate(['/mesas']);
            } else {
                this.router.navigate([returnUrl]);
            }

        } else {
            this.router.navigate(['/']);
        }
    }
}