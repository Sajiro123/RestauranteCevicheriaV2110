import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

export interface Empresa {
  id?: number;
  nombre_empresa: string;
  imagen?: string;
  ruc: string;
  direccion: string;
  celular: string;
  correo: string;
  sedes?: number;
  created_at?: string;
}

@Injectable({
  providedIn: 'root'
})
export class EmpresaService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseAnonKey);
  }

  // GET ALL
  async getAll() {
    const { data, error } = await this.supabase
      .from('empresa')
      .select('*')
      .order('created_at', { ascending: false });

    return { data, error };
  }

  // GET BY ID
  async getById(id: number) {
    const { data, error } = await this.supabase
      .from('empresa')
      .select('*')
      .eq('id', id)
      .single();

    return { data, error };
  }

  // CREATE
  async create(empresa: Empresa) {
    const { data, error } = await this.supabase
      .from('empresa')
      .insert(empresa)
      .select();

    return { data, error };
  }

  // UPDATE
  async update(id: number, empresa: Partial<Empresa>) {
    const { data, error } = await this.supabase
      .from('empresa')
      .update(empresa)
      .eq('id', id)
      .select();

    return { data, error };
  }

  // DELETE
  async delete(id: number) {
    const { data, error } = await this.supabase
      .from('empresa')
      .delete()
      .eq('id', id)
      .select();

    return { data, error };
  }
}
