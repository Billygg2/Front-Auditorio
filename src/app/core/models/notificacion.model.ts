export type TipoNotificacion =
  | 'NUEVA_RESERVA'
  | 'RESERVA_APROBADA'
  | 'RESERVA_RECHAZADA'
  | 'RESERVA_CANCELADA'
  | 'RESERVA_COMPLETADA';

export interface Notificacion {
  id: number;
  tipo: TipoNotificacion;
  titulo: string;
  mensaje: string;
  leida: boolean;
  creadaEn: string;
  eventoId: number | null;
}
