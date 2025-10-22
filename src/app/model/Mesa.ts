import { Pedido } from './Pedido';

export interface Mesa {
    numero: string;
    estado: '1' | '0';
    pedidos: Pedido[];
    idpedido?: number | null; // ID del pedido activo asociado a la mesa, si existe
}
