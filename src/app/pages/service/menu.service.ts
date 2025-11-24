import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';
import { Menu } from '../../model/Menu';

@Injectable({
    providedIn: 'root'
})
export class MenuService {
    private supabase: SupabaseClient;

    constructor() {
        this.supabase = createClient(environment.supabaseUrl, environment.supabaseAnonKey, {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                storageListener: false
            } as any // 👈 forzamos a TypeScript a no quejarse,
        });
    }


    async getMenuByPerfil(idperfil: number) {
        const { data, error } = await this.supabase
            .from('perfil_menu')
            .select(`
                puede_ver,
                menu:menu (
                    idmenu,
                    nombre,
                    icono,
                    ruta,
                    idmenu_padre,
                    es_submenu,
                    orden
                )
            `)
            .eq('idperfil', idperfil)
            .eq('puede_ver', true);

        return { data, error };
    }
    // // ELIMINAR
    // async deleteMenu(idmenu: number) {
    //     const { data, error } = await this.supabase
    //         .from('menu')
    //         .delete()
    //         .eq('idmenu', idmenu);

    //     return { data, error };
    // }

    // OBTENER perfiles
    async getPerfiles() {
        return this.supabase.from('perfil').select('*');
    }

    // OBTENER permisos de un perfil
    async getPermisosByPerfil(idperfil: number) {
        return this.supabase
            .from('perfil_menu')
            .select('*, menu(*)')
            .eq('idperfil', idperfil);
    }

    // ASIGNAR o ACTUALIZAR permisos
    async savePermiso(perfilMenu: any) {
        const { data, error } = await this.supabase
            .from('perfil_menu')
            .upsert(perfilMenu, { onConflict: 'idperfil,idmenu' });

        return { data, error };
    }

    // ELIMINAR asignación
    async removeMenuPerfil(idperfil: number, idmenu: number) {
        return this.supabase
            .from('perfil_menu')
            .delete()
            .match({ idperfil, idmenu });
    }
    async getMenus() {
        return this.supabase.from('menu').select('*').order('orden', { ascending: true });
    }


    async getMenu(idmenu: number) {
        return this.supabase.from('menu').select('*').eq('idmenu', idmenu).single();
    }


    async addMenu(menu: Menu) {
        return this.supabase.from('menu').insert(menu).select();
    }


    async assignMenuToProfile(pm: any) {
        return this.supabase.from('perfil_menu').insert(pm).select();
    }


    async updateMenu(idmenu: number, updateData: Partial<Menu>) {
        return this.supabase.from('menu').update(updateData).eq('idmenu', idmenu).select();
    }


    async deleteMenu(idmenu: number) {
        return this.supabase.from('menu').delete().eq('idmenu', idmenu).select();
    }
}