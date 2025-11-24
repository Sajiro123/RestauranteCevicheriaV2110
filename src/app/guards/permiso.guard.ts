import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree, ActivatedRouteSnapshot } from '@angular/router';
import { Observable } from 'rxjs';
import { MenuService } from '../pages/service/menu.service';
import { AuthService } from '../services/auth.service';

@Injectable({
    providedIn: 'root'
})
export class PermisoGuard implements CanActivate {
    constructor(
        private menuService: MenuService, 
        private authService: AuthService,
        private router: Router
    ) {}

    canActivate(route: ActivatedRouteSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
        // Check if user is authenticated first
        if (!this.authService.isAuthenticated()) {
            return this.router.createUrlTree(['/auth/login']);
        }
        
        // Get the route data to check required permissions
        const requiredPermission = route.data?.['menuRuta'];
        
        // If no specific permission is required, allow access
        if (!requiredPermission) {
            return true;
        }
        
        // For now, we'll allow access to menu-related routes
        // In a real implementation, you would check the user's permissions
        return true;
    }
}