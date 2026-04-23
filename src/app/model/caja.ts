export interface Caja {
  id?: number;
  semana: number;
  trabajo: string;
  fecha: string; // YYYY-MM-DD
  dia: number;
  yape: number;
  efectivo: number;
  tarjeta: number;
  total?: number; // calculado en DB si usas columna generada
  gastos: number;
  notas?: string;
  plin: number;
}