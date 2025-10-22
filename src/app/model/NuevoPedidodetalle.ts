export interface NuevoPedidodetalle {
    idpedido: number;
    idproducto: number;
    nombre: string;
    cantidad: number;
    preciounitario: number;
    total: number;
    lugarpedido: any;
    pedido_estado?: any;
    idtopings: { idtopings: number; nombre: string }[];
    id_created_at?: any;
    idpedidodetalle?: number;
}
