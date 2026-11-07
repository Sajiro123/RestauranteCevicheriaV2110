import { Injectable } from '@angular/core';
import { SupabaseService } from '../../services/supabase.service';
import { Observable, from } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AperturaService {
    constructor(private supabaseService: SupabaseService) { }

    ListarAperturaHoy(): Observable<any> {
        return from(this.supabaseService.getAperturaHoy());
    }

    ListCategoriasGastos(): Observable<any> {
        return from(this.supabaseService.getCategoriasGastos());
    }

    ListGastos(fecha: string): Observable<any> {
        return from(this.supabaseService.getGastos(fecha));
    }

    ListGastosApp(fecha: string): Observable<any> {
        return from(this.supabaseService.getGastosApp(fecha));
    }

    registrarCaja(value: any): Observable<any> {
        return from((async () => {
            const fechaPeru = await this.supabaseService.getFechaPeruHoy();
            let trabajadores = '';

            (value.trabajadores || []).forEach((element: any) => {
                trabajadores += element + ',';
            });
            trabajadores = trabajadores.replace(/,\s*$/, '');
            const aperturaData = {
                fecha: fechaPeru,
                total: value.monto,
                estado: 1,
                responsable: value.responsable,
                trabajadores: trabajadores,
                turno: value.turno,
                id_created_at: 1
            };

            return await this.supabaseService.insertAperturaCaja(aperturaData);
        })());
    }

    registrarGastos(value: any): Observable<any> {
        return from((async () => {
            const fechaPeru = await this.supabaseService.getFechaPeruHoy();
            const gastoData = {
                descripcion: value.descripcion,
                idcategoriagastos: value.categoria,
                monto: value.monto,
                fecha: fechaPeru,
                notas: value.notas,
                id_created_at: 1
            };

            return await this.supabaseService.insertGasto(gastoData);
        })());
    }

    cerrarCaja(value?: any): Observable<any> {
        return from((async () => {
            const fechaPeru = await this.supabaseService.getFechaPeruHoy();
            return await this.supabaseService.cerrarCaja(fechaPeru);
        })());
    }

    actualizarCaja(value: any): Observable<any> {
        return from((async () => {
            const fechaPeru = await this.supabaseService.getFechaPeruHoy();
            let trabajadores = '';
            (value.trabajadores || []).forEach((element: any) => {
                trabajadores += element + ',';
            });
            trabajadores = trabajadores.replace(/,\s*$/, '');

            const updateData = {
                total: value.monto,
                responsable: value.responsable,
                trabajadores: trabajadores,
                turno: value.turno
            };
            return await this.supabaseService.updateAperturaCaja(fechaPeru, updateData);
        })());
    }

    eliminarGasto(idgastos: number): Observable<any> {
        return from(this.supabaseService.softDeleteGasto(idgastos));
    }

    editarGasto(idgastos: number, data: any): Observable<any> {
        return from(this.supabaseService.updateGasto(idgastos, data));
    }

    ListarTrabajadores(): Observable<any> {
        return from(this.supabaseService.getTrabajadores());
    }

    calcularResumenCaja(fecha: string): Observable<any> {
        return from(this.supabaseService.calcularResumenCaja(fecha));
    }

    guardarCierreCaja(cierreData: any): Observable<any> {
        return from(this.supabaseService.guardarCierreCaja(cierreData));
    }
}
