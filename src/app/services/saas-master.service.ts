import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export interface SaasAuthData {
    token: string;
    tipoToken: string;
    usuarioId: string;
    email: string;
    tenantId: string;
    subdominio: string;
    nombreComercial: string;
    verticalId: string;
    planId: string;
    esPropietario: boolean;
    esSuperadmin: boolean;
    dbHost: string;
    rolCodigo: string;
    rolNombre: string;
    nombreCompleto: string;
    nroColegiatura?: string | null;
    pinSeguridad?: string;
    acciones: string[];
}

export interface SaasApiResponse<T> {
    success: boolean;
    message: string;
    data: T;
    timestamp?: string;
}

export interface SaasUsuarioNegocio {
    id: string;
    usuarioId?: string;
    negocioId: string;
    negocioNombre?: string;
    email: string;
    pinSeguridad?: string;
    estaActivo: boolean;
    esMaster?: boolean;
    perfilCodigo: string;
    perfilNombre: string;
    acciones?: string[];
    personaId?: string;
    tipoDocumento?: string;
    numeroDocumento?: string;
    nombres?: string;
    apellidos?: string;
    nombreCompleto?: string;
    telefono?: string;
    direccion?: string;
    nroColegiatura?: string | null;
    tieneUsuario?: boolean;
    fechanacimiento?: string;
}

export interface CrearUsuarioRequest {
    negocioId?: string;
    perfilCodigo: string;
    email?: string | null;
    password?: string;
    pinSeguridad?: string;
    estaActivo?: boolean;
    tipoDocumento?: string;
    numeroDocumento?: string;
    nombres?: string;
    apellidos?: string;
    telefono?: string;
    direccion?: string;
    fechanacimiento?: string | null;
    tieneUsuario?: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class SaasMasterService {
    private readonly apiUrl = environment.saasMasterApiUrl || 'http://localhost:8081/api/v1';
    public readonly tenantId = environment.defaultTenantId || 'a0000000-0000-0000-0000-000000000004';
    public readonly defaultDomain = environment.defaultEmailDomain || '@willys.com';

    constructor(private http: HttpClient) {}

    /**
     * Resuelve el email a partir de un username o email
     * Ej: 'alex' -> 'alex@willys.com'
     */
    public resolveEmail(identifier: string): string {
        const trimmed = (identifier || '').trim();
        if (!trimmed) return '';
        if (trimmed.includes('@')) {
            return trimmed.toLowerCase();
        }
        return `${trimmed}${this.defaultDomain}`.toLowerCase();
    }

    /**
     * Autenticación central en SaaS Master API
     */
    async login(usernameOrEmail: string, password: string): Promise<SaasApiResponse<SaasAuthData>> {
        const email = this.resolveEmail(usernameOrEmail);

        try {
            const response = await firstValueFrom(
                this.http.post<SaasApiResponse<SaasAuthData>>(`${this.apiUrl}/auth/login`, {
                    email,
                    password
                })
            );
            return response;
        } catch (error: any) {
            console.error('[SaasMasterService] Error de login:', error);
            const msg = error?.error?.message || error?.message || 'Error al conectar con SaaS Master API';
            throw new Error(msg);
        }
    }

    /**
     * Listar colaboradores del negocio desde SaaS Master
     */
    async getUsuariosNegocio(negocioId?: string): Promise<SaasUsuarioNegocio[]> {
        const id = negocioId || this.tenantId;
        try {
            const res = await firstValueFrom(
                this.http.get<SaasApiResponse<SaasUsuarioNegocio[]>>(`${this.apiUrl}/usuarios-negocio`, {
                    params: { negocioId: id }
                })
            );
            return res.data || [];
        } catch (error) {
            console.error('[SaasMasterService] Error al listar usuarios:', error);
            throw error;
        }
    }

    /**
     * Listar perfiles/roles disponibles en SaaS Master
     */
    async getPerfiles(negocioId?: string): Promise<any[]> {
        const id = negocioId || this.tenantId;
        try {
            const res = await firstValueFrom(
                this.http.get<SaasApiResponse<any[]>>(`${this.apiUrl}/usuarios-negocio/perfiles`, {
                    params: { negocioId: id }
                })
            );
            return res.data || [];
        } catch (error) {
            console.error('[SaasMasterService] Error al listar perfiles:', error);
            throw error;
        }
    }

    /**
     * Crear usuario y persona en SaaS Master
     */
    async crearUsuario(request: CrearUsuarioRequest): Promise<SaasUsuarioNegocio> {
        const payload = {
            ...request,
            negocioId: request.negocioId || this.tenantId
        };
        try {
            const res = await firstValueFrom(
                this.http.post<SaasApiResponse<SaasUsuarioNegocio>>(`${this.apiUrl}/usuarios-negocio`, payload)
            );
            return res.data;
        } catch (error: any) {
            console.error('[SaasMasterService] Error al crear usuario:', error);
            const msg = error?.error?.message || error?.message || 'Error al crear usuario en SaaS Master';
            throw new Error(msg);
        }
    }

    /**
     * Actualizar usuario y persona en SaaS Master
     */
    async actualizarUsuario(id: string, request: Partial<CrearUsuarioRequest>): Promise<SaasUsuarioNegocio> {
        const payload = {
            ...request,
            negocioId: request.negocioId || this.tenantId
        };
        try {
            const res = await firstValueFrom(
                this.http.put<SaasApiResponse<SaasUsuarioNegocio>>(`${this.apiUrl}/usuarios-negocio/${id}`, payload)
            );
            return res.data;
        } catch (error: any) {
            console.error('[SaasMasterService] Error al actualizar usuario:', error);
            const msg = error?.error?.message || error?.message || 'Error al actualizar usuario en SaaS Master';
            throw new Error(msg);
        }
    }

    /**
     * Activar o desactivar usuario en SaaS Master
     */
    async cambiarEstado(id: string, activo: boolean): Promise<void> {
        try {
            await firstValueFrom(
                this.http.patch<SaasApiResponse<string>>(`${this.apiUrl}/usuarios-negocio/${id}/estado`, null, {
                    params: { activo: activo.toString() }
                })
            );
        } catch (error: any) {
            console.error('[SaasMasterService] Error al cambiar estado de usuario:', error);
            const msg = error?.error?.message || error?.message || 'Error al cambiar estado';
            throw new Error(msg);
        }
    }

    /**
     * Eliminar usuario en SaaS Master
     */
    async eliminarUsuario(id: string): Promise<void> {
        try {
            await firstValueFrom(
                this.http.delete<SaasApiResponse<string>>(`${this.apiUrl}/usuarios-negocio/${id}`)
            );
        } catch (error: any) {
            console.error('[SaasMasterService] Error al eliminar usuario:', error);
            const msg = error?.error?.message || error?.message || 'Error al eliminar usuario';
            throw new Error(msg);
        }
    }
}
