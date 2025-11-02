import { NuevoPedidodetalle } from './NuevoPedidodetalle';

export interface NuevoPedido {
    idpedido: number;
    lugarpedido: any;
    pedido_estado: any;
    nombre: any;
    cantidad: number;
    descripcion: string;
    estado: boolean;
    lugar: string;
    preciounitario: number;
    total: number;
    descuento: number;
    comentario: string;
    pedidodetalle: NuevoPedidodetalle[];
    visa: number;
    yape: number;
    plin: number;
    efectivo: number;
    cliente?: string | null;
    delivery?: number | null;
    idmozo?: number | null;
    fecha?: string;
    mesa?: string;
}
