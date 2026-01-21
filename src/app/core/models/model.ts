export enum EstadoEvento {
  PENDIENTE = 'PENDIENTE',
  APROBADO = 'APROBADO',
  RECHAZADO = 'RECHAZADO',
  CANCELADO = 'CANCELADO',
  COMPLETADO = 'COMPLETADO'
}

export enum TipoRequerimiento {
  PROYECTOR = 'PROYECTOR',
  MICRÓFONO = 'MICRÓFONO',
  PANTALLA = 'PANTALLA',
  SISTEMA_DE_SONIDO = 'SISTEMA_DE_SONIDO',
  LAPTOP = 'LAPTOP',
  INTERNET = 'INTERNET',
  SILLAS_ADICIONALES = 'SILLAS_ADICIONALES',
  MESA_PRINCIPAL = 'MESA_PRINCIPAL',
  PIZARRA = 'PIZARRA',
  CAFETERÍA = 'CAFETERÍA',
  AIRE_ACONDICIONADO = 'AIRE_ACONDICIONADO',
  ILUMINACIÓN_ESPECIAL = 'ILUMINACIÓN_ESPECIAL'
}

export interface Requerimiento {
  id?: number;
  tipo: TipoRequerimiento;
  cantidad: number;
  requerido: boolean;
}

export interface Responsable {
  id?: number;
  nombre: string;
  correo: string;
  telefono: string;
}

export interface EventoAuditorio {
  id?: number;
  nombreEvento: string;
  descripcion: string;
  fechaEvento: string | Date;
  horaInicio: string | Date;
  horaFin: string | Date;
  numeroAsistentes: number;
  publicoExterno: boolean;
  requiereRegistroPrevio: boolean;
  tipoDisposicion: string;
  estado: EstadoEvento;
  responsable: Responsable;
  requerimientos: Requerimiento[];
  motivoRechazo?: string;
}

export interface AprobacionEventoDTO {
  estado: EstadoEvento;
  motivoRechazo?: string;
}

export interface DisponibilidadRequest {
  fecha: string;
  horaInicio: string;
  horaFin: string;
}