export interface AuthRequest {
  username: string;
  password: string;
  role?: string;
}

export interface AuthResponse {
  token: string;
}

export interface User {
  username: string;
  role: string;
}

export interface DecodedToken {
  sub: string;
  authorities: string[];
  exp: number;
  iat: number;
}