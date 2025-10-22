import { Injectable } from '@angular/core';
import { SupabaseService } from '../../services/supabase.service';
import { Observable, from } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AperturaService {
    constructor(private supabaseService: SupabaseService) {}

    ListarAperturaHoy(): Observable<any> {
        return from(this.supabaseService.getAperturaHoy());
    }

    ListCategoriasGastos(): Observable<any> {
        return from(this.supabaseService.getCategoriasGastos());
    }

    ListGastos(fecha: string): Observable<any> {
        return from(this.supabaseService.getGastos(fecha));
    }

    registrarCaja(value: any): Observable<any> {
        const now = new Date();
        const fechaPeru = now.toLocaleDateString('en-CA', {
            timeZone: 'America/Lima'
        });

        const aperturaData = {
            fecha: fechaPeru,
            total: value.monto,
            estado: 1,
            responsable: value.responsable,
            id_created_at: 1
        };

        return from(this.supabaseService.insertAperturaCaja(aperturaData));
    }

    registrarGastos(value: any): Observable<any> {
        const now = new Date();
        const fechaPeru = now.toLocaleDateString('en-CA', {
            timeZone: 'America/Lima'
        });

        const gastoData = {
            descripcion: value.descripcion,
            idcategoriagastos: value.categoria,
            monto: value.monto,
            fecha: fechaPeru,
            notas: value.notas,
            id_created_at: 1
        };

        return from(this.supabaseService.insertGasto(gastoData));
    }

    cerrarCaja(value: any): Observable<any> {
        const now = new Date();
        const fechaPeru = now.toLocaleDateString('en-CA', {
            timeZone: 'America/Lima'
        });
        return from(this.supabaseService.cerrarCaja(fechaPeru));
    }
}
