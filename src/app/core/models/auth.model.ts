export interface AuthRequest {
  username: string;          // Cédula (10 dígitos) - REQUERIDO
  password: string;          
  role: string;            
  nombre: string;           
  apellido: string;        
  correoInstitucional: string; 
  telefono: string;
}

export interface AuthResponse {
  token: string;
  username: string;
  nombre: string;
  apellido: string;
  nombreCompleto: string;
  role: string;             
  correoInstitucional: string;
  telefono: string;
  activo?: boolean;
  debeCambiarPassword?: boolean;
}

export interface User {
  username: string;
  role: string;              
  nombre: string;
  apellido: string;
  nombreCompleto: string;
  correoInstitucional: string;
  telefono: string;
  activo?: boolean;
  debeCambiarPassword?: boolean;
}

export interface DecodedToken {
  sub: string;
  authorities: string[];
  exp: number;
  iat: number;
}
