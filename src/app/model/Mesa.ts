import { Pedido } from './Pedido';

export interface Mesa {
    numero: string;
    estado: '1' | '0';
    pedidos: Pedido[];
    idpedido?: number | null; // ID del pedido activo asociado a la mesa, si existe
    piso?: string; // Piso de la mesa (1 para primer piso, 2 para segundo piso)
}