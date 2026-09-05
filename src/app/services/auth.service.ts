import { Injectable, Inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { SupabaseService } from './supabase.service';
import { Router } from '@angular/router';
import { MenuService } from '../pages/service/menu.service';
import { SaasMasterService } from './saas-master.service';

export interface User {
    idusuario: number | string;
    username: string;
    nombre: string;
    email?: string;
    rol?: string;
    idperfil?: number;
    tenantId?: string;
    subdominio?: string;
    verticalId?: string;
    planId?: string;
    rolCodigo?: string;
    rolNombre?: string;
    token?: string;
    pinSeguridad?: string;
    esSuperadmin?: boolean;
    esPropietario?: boolean;
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
        private saasMasterService: SaasMasterService,
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
        localStorage.removeItem('auth_token');
        localStorage.removeItem('saas_master_token');
        localStorage.removeItem('tenant_id');
        localStorage.removeItem('subdominio');
        this.unsubscribeRealtime();
    }

    // ─────────────────────────────────────────────────────────────
    // Realtime: vigilar session_token
    // ─────────────────────────────────────────────────────────────

    private watchSessionToken(idusuario: number | string, myToken: string) {
        this.unsubscribeRealtime();

        if (typeof idusuario !== 'number' || isNaN(idusuario)) {
            return;
        }

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
    // Login con SaaS Master
    // ─────────────────────────────────────────────────────────────

    async login(usernameOrEmail: string, password: string): Promise<{ success: boolean; message?: string; user?: User }> {
        try {
            const res = await this.saasMasterService.login(usernameOrEmail, password);

            if (!res.success || !res.data) {
                return { success: false, message: res.message || 'Usuario o contraseña incorrectos en SaaS Master' };
            }

            const authData = res.data;

            // Validar que pertenezca a la vertical gastronómica
            if (authData.verticalId && authData.verticalId !== 'RESTAURANTE') {
                return { 
                    success: false, 
                    message: `Este usuario pertenece a la vertical ${authData.verticalId}, no a RESTAURANTE.` 
                };
            }

            // Mapeo inteligente de roles a idperfil para compatibilidad con la app existente
            let idperfil = 1;
            const rolCode = (authData.rolCodigo || '').toUpperCase();
            if (rolCode.includes('ADMIN') || authData.esSuperadmin || authData.esPropietario) {
                idperfil = 1;
            } else if (rolCode.includes('MOZO') || rolCode.includes('MESERO')) {
                idperfil = 2;
            } else if (rolCode.includes('COCIN') || rolCode.includes('CHEF')) {
                idperfil = 3;
            } else if (rolCode.includes('CAJER')) {
                idperfil = 4;
            }

            const cleanUsername = usernameOrEmail.includes('@') ? usernameOrEmail.split('@')[0] : usernameOrEmail;

            const user: User = {
                idusuario: authData.usuarioId,
                username: cleanUsername,
                nombre: authData.nombreCompleto || cleanUsername,
                email: authData.email,
                rol: authData.rolNombre || 'Colaborador',
                idperfil: idperfil,
                tenantId: authData.tenantId,
                subdominio: authData.subdominio,
                verticalId: authData.verticalId,
                planId: authData.planId,
                rolCodigo: authData.rolCodigo,
                rolNombre: authData.rolNombre,
                token: authData.token,
                pinSeguridad: authData.pinSeguridad,
                esSuperadmin: authData.esSuperadmin,
                esPropietario: authData.esPropietario
            };

            // Fetch menu data correspondiente al perfil
            const menuData = await this.fetchAndStoreMenuData(idperfil);

            // Generar sessionToken
            const sessionToken = this.generateSessionToken();

            // Guardar sesión en localStorage
            const userData = {
                ...user,
                menuData,
                loginAt: Date.now(),
                sessionToken
            };

            localStorage.setItem('currentUser', JSON.stringify(userData));
            localStorage.setItem('auth_token', authData.token);
            localStorage.setItem('saas_master_token', authData.token);
            localStorage.setItem('tenant_id', authData.tenantId);
            localStorage.setItem('subdominio', authData.subdominio);

            // Actualizar observables
            this.currentUserSubject.next(user);
            this.isAuthenticatedSubject.next(true);

            return { success: true, user };
        } catch (error: any) {
            console.error('[AuthService] Error en autenticación SaaS Master:', error);
            const msg = error?.message || 'Error de conexión con SaaS Master. Intente nuevamente.';
            return { success: false, message: msg };
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
