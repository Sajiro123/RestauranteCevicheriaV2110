import { Injectable, Inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { SupabaseService } from './supabase.service';
import { Router } from '@angular/router';
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

    private readonly SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 horas

    /** Razón del cierre de sesión forzado (para mostrar mensaje en login) */
    public sessionClosedReason: string | null = null;

    /** Canal Realtime activo */
    private realtimeChannel: any = null;

    constructor(
        private supabaseService: SupabaseService,
        @Inject(MenuService) private menuService: MenuService,
        private router: Router
    ) {
        this.checkStoredSession();
    }

    // ─────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────

    /** Genera un UUID v4 simple */
    private generateSessionToken(): string {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
        });
    }

    // ─────────────────────────────────────────────────────────────
    // Sesión almacenada
    // ─────────────────────────────────────────────────────────────

    private checkStoredSession() {
        const storedUser = localStorage.getItem('currentUser');
        if (!storedUser) return;

        try {
            const parsed = JSON.parse(storedUser);

            // Verificar expiración (24 horas)
            const elapsed = Date.now() - (parsed.loginAt ?? 0);
            if (elapsed > this.SESSION_DURATION_MS) {
                console.warn('Sesión expirada. Se requiere nuevo inicio de sesión.');
                this.clearLocalSession();
                return;
            }

            const { loginAt: _, menuData: __, ...user } = parsed;
            this.currentUserSubject.next(user);
            this.isAuthenticatedSubject.next(true);

            // Reanudar vigilancia Realtime
            if (parsed.sessionToken && parsed.idusuario) {
                this.watchSessionToken(parsed.idusuario, parsed.sessionToken);
            }
        } catch (err) {
            console.error('Error parsing stored user:', err);
            this.clearLocalSession();
        }
    }

    private clearLocalSession() {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('userMenuData');
        this.unsubscribeRealtime();
    }

    // ─────────────────────────────────────────────────────────────
    // Realtime: vigilar session_token
    // ─────────────────────────────────────────────────────────────

    private watchSessionToken(idusuario: number, myToken: string) {
        this.unsubscribeRealtime();

        console.log(`[Auth] Iniciando vigilancia Realtime para usuario ${idusuario}. Mi token: ${myToken.substring(0, 8)}...`);

        this.realtimeChannel = this.supabaseService.client
            .channel(`session_watch_${idusuario}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'usuario',
                    filter: `idusuario=eq.${idusuario}`
                },
                (payload: any) => {
                    const newToken = payload.new?.session_token;
                    console.log(`[Auth] Cambio detectado en usuario. Nuevo token: ${newToken?.substring(0, 8)}... | Mi token: ${myToken.substring(0, 8)}...`);
                    if (newToken && newToken !== myToken) {
                        console.warn('[Auth] ⚠️ Sesión desplazada. Cerrando esta sesión...');
                        this.sessionClosedReason = 'Tu sesión fue cerrada porque iniciaste sesión desde otro dispositivo.';
                        this.logout(true);
                    } else if (newToken === myToken) {
                        console.log('[Auth] Token coincide. Esta sesión sigue activa.');
                    }
                }
            )
            .subscribe((status: string) => {
                console.log(`[Auth] Estado Realtime: ${status}`);
            });
    }

    private unsubscribeRealtime() {
        if (this.realtimeChannel) {
            this.supabaseService.client.removeChannel(this.realtimeChannel);
            this.realtimeChannel = null;
        }
    }

    // ─────────────────────────────────────────────────────────────
    // Login
    // ─────────────────────────────────────────────────────────────

    async login(username: string, password: string): Promise<{ success: boolean; message?: string; user?: User }> {
        try {
            const { data, error } = await this.supabaseService.client.from('usuario').select('*').eq('username', username).eq('password', password).is('deleted', null).eq('estado', 1).single();

            if (error || !data) {
                return { success: false, message: 'Usuario o contraseña incorrectos' };
            }

            // Generar token único para esta sesión
            const sessionToken = this.generateSessionToken();
            console.log(`[Auth] Login: generando session_token para usuario ${data.idusuario}: ${sessionToken.substring(0, 8)}...`);

            // Actualizar session_token en la BD → invalida otras sesiones activas
            const { error: updateError } = await this.supabaseService.client.from('usuario').update({ session_token: sessionToken }).eq('idusuario', data.idusuario);

            if (updateError) {
                console.error('[Auth] ❌ Error actualizando session_token en BD:', updateError);
                console.error('[Auth] Detalle:', JSON.stringify(updateError));
            } else {
                console.log('[Auth] ✅ session_token actualizado en BD correctamente.');
            }

            const user: User = {
                idusuario: data.idusuario,
                username: data.username,
                nombre: data.nombre,
                email: data.email,
                rol: data.rol,
                idperfil: data.idperfil
            };

            // Fetch menu data
            const menuData = await this.fetchAndStoreMenuData(data.idperfil);

            // Guardar sesión en localStorage con token y timestamp
            const userData = {
                ...user,
                menuData,
                loginAt: Date.now(),
                sessionToken
            };
            localStorage.setItem('currentUser', JSON.stringify(userData));

            // Actualizar observables
            this.currentUserSubject.next(user);
            this.isAuthenticatedSubject.next(true);

            // Iniciar vigilancia Realtime para detectar desplazamiento
            this.watchSessionToken(data.idusuario, sessionToken);

            return { success: true, user };
        } catch (error) {
            console.error('Error en login:', error);
            return { success: false, message: 'Error de conexión. Intente nuevamente.' };
        }
    }

    // ─────────────────────────────────────────────────────────────
    // Menu data
    // ─────────────────────────────────────────────────────────────

    private async fetchAndStoreMenuData(idperfil: number) {
        try {
            const { data, error } = await this.menuService.getMenuByPerfil(idperfil);
            if (error) {
                console.error('Error fetching menu data:', error);
                return [];
            }
            const menuData = data || [];
            localStorage.setItem('userMenuData', JSON.stringify(menuData));
            return menuData;
        } catch (error) {
            console.error('Error fetching menu data:', error);
            return [];
        }
    }

    // ─────────────────────────────────────────────────────────────
    // Logout
    // ─────────────────────────────────────────────────────────────

    logout(redirectToLogin: boolean = true) {
        this.clearLocalSession();
        this.currentUserSubject.next(null);
        this.isAuthenticatedSubject.next(false);

        if (redirectToLogin) {
            this.router.navigate(['/auth/login']);
        }
    }

    // ─────────────────────────────────────────────────────────────
    // Helpers públicos
    // ─────────────────────────────────────────────────────────────

    getCurrentUser(): User | null {
        return this.currentUserSubject.value;
    }

    isAuthenticated(): boolean {
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
            try {
                const parsed = JSON.parse(storedUser);
                const elapsed = Date.now() - (parsed.loginAt ?? 0);
                if (elapsed > this.SESSION_DURATION_MS) {
                    this.logout(false);
                    return false;
                }
            } catch {
                this.logout(false);
                return false;
            }
        }
        return this.isAuthenticatedSubject.value;
    }

    hasRole(role: string): boolean {
        return this.getCurrentUser()?.rol === role;
    }

    redirectAfterLogin(returnUrl?: string, idperfil?: number) {
        let hasMesas = false;
        try {
            const storedMenuData = localStorage.getItem('userMenuData');
            if (storedMenuData) {
                const menuData = JSON.parse(storedMenuData);
                hasMesas = menuData.some((m: any) => m.menu && (m.menu.ruta === '/mesas' || m.menu.ruta === 'mesas' || (m.menu.nombre && m.menu.nombre.toLowerCase().includes('mesa'))));
            }
        } catch (e) {
            console.error('Error al verificar menu de mesas:', e);
        }

        if (hasMesas) {
            this.router.navigate(['/mesas']);
        } else if (returnUrl && returnUrl !== '/auth/login') {
            this.router.navigate([returnUrl]);
        } else {
            this.router.navigate(['/']);
        }
    }
}
