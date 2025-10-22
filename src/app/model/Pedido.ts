export interface Pedido {
    [x: string]: any;
    idproducto: number;
    lugarpedido: any;
    pedido_estado: any;
    idpedido: number;
    nombre: any;
    categoria: string;
    cantidad: number;
    descripcion: string;
    estado: boolean;
    lugar: string;
    precioU: number;
    total: number;
    total_pedidos: number;
    mesa: string;
    descuento: number;
    comentario: string;
    visa: number;
    yape: number;
    plin: number;
    efectivo: number;
    seleccionado?: boolean;
    pedidodetalle?: any;
    persona?: any;
}
