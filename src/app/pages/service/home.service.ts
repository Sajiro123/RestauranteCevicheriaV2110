import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { Mesa } from '../../model/Mesa';
import { SupabaseService } from '../../services/supabase.service';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class HomeService {

    constructor(
        private supabaseService: SupabaseService,
        private router: Router
    ) {}

    getMesas(): Observable<any> {
        return from(this.supabaseService.getMesas());
    }
}
