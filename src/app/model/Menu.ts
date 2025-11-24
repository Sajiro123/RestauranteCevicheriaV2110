export interface Menu {
    idmenu?: number;
    nombre: string;
    icono?: string;
    ruta?: string;
    idmenu_padre?: number | null;
    es_submenu?: boolean;
    orden?: number;
    activo?: boolean;
    fecha_creacion?: string;
}