import { User } from "./auth.model";

export enum EstadoEvento {
  PENDIENTE = 'PENDIENTE',
  APROBADO = 'APROBADO',
  RECHAZADO = 'RECHAZADO',
  CANCELADO = 'CANCELADO',
  COMPLETADO = 'COMPLETADO'
}

export interface TipoRequerimientoModel {
  id: number;
  nombre: string;
  descripcion?: string;
  activo: boolean;
  cantidadDisponible: number; 
}

export interface Requerimiento {
  id?: number;
  tipo: TipoRequerimientoModel;  
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
  usuarioSolicitante?: User;
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
