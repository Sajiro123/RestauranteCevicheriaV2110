// Session validation utility functions

/**
 * Gets the current user's perfil ID from localStorage
 * @returns number - perfil ID or 0 if not found
 */
export function getCurrentUserPerfilId(): number {
    try {
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        return currentUser.idperfil || 0;
    } catch (error) {
        console.error('Error getting current user perfil ID:', error);
        return 0;
    }
}

/**
 * Validates if user has a specific perfil permission
 * @param requiredPerfilId - The perfil ID to check against
 * @returns boolean - true if user has the required perfil
 */
export function hasPerfilPermission(requiredPerfilId: number): boolean {
    const currentUserPerfilId = getCurrentUserPerfilId();
    return currentUserPerfilId === requiredPerfilId;
}

/**
 * Checks if user is logged in (has a valid perfil)
 * @returns boolean - true if user is logged in
 */
export function isUserLoggedIn(): boolean {
    return getCurrentUserPerfilId() > 0;
}

/**
 * Gets complete current user object from localStorage
 * @returns any - current user object or empty object if not found
 */
export function getCurrentUser(): any {
    try {
        return JSON.parse(localStorage.getItem('currentUser') || '{}');
    } catch (error) {
        console.error('Error getting current user:', error);
        return {};
    }
}

/**
 * Validates session and redirects if invalid
 * @param router - Angular Router instance
 * @param redirectUrl - URL to redirect to if session is invalid (default: '/auth/login')
 * @returns boolean - true if session is valid, false if redirected
 */
export function validateSession(router: any, redirectUrl: string = '/auth/login'): boolean {
    if (!isUserLoggedIn()) {
        router.navigate([redirectUrl]);
        return false;
    }
    return true;
}
