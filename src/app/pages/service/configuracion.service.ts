import { Injectable } from '@angular/core';
import { SupabaseService } from '../../services/supabase.service';
import { Observable, from } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ConfiguracionService {
    constructor(private supabaseService: SupabaseService) {}

    ListarToppingPedido(): Observable<any> {
        return from(this.supabaseService.getToppings());
    }
}
