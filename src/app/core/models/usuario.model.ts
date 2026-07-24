export type RolUsuario = 'USER' | 'ADMIN';

export interface UsuarioGestion {
  id: number;
  username: string;
  nombre: string;
  apellido: string;
  nombreCompleto: string;
  correoInstitucional: string;
  telefono: string;
  role: RolUsuario;
  activo: boolean;
  debeCambiarPassword: boolean;
}

export interface ActualizarUsuarioAdmin {
  username: string;
  nombre: string;
  apellido: string;
  correoInstitucional: string;
  telefono: string;
  role: RolUsuario;
  activo: boolean;
}
