import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { jwtDecode } from 'jwt-decode';
import { AuthRequest, AuthResponse, DecodedToken, User } from '../models/auth.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}/auth`;
  private tokenKey = 'auth_token';
  private userKey = 'user_data';

  private currentUserSubject = new BehaviorSubject<User | null>(this.getStoredUser());
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router
  ) { }

  // ========== MÉTODOS DE AUTENTICACIÓN ==========
  setCurrentUser(user: User | null): void {
    this.currentUserSubject.next(user);
  }
  register(userData: AuthRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, userData);
  }

  registerAdmin(userData: AuthRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/register-admin`, userData);
  }

  login(credentials: AuthRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, credentials)
      .pipe(
        tap(response => {
          this.storeToken(response.token);
          const user = this.decodeToken(response.token);
          this.storeUser(user);
          this.currentUserSubject.next(user);
        })
      );
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    this.currentUserSubject.next(null);
    this.router.navigate(['/auth/login']);
  }

  // ========== MÉTODOS DE VERIFICACIÓN ==========

  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;

    try {
      const decoded: DecodedToken = jwtDecode(token);
      return decoded.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  }

  isAdmin(): boolean {
    const user = this.currentUserSubject.value;
    return user?.role === 'ROLE_ADMIN' || user?.role === 'ADMIN';
  }

  isUser(): boolean {
    const user = this.currentUserSubject.value;
    return user?.role === 'ROLE_USER' || user?.role === 'USER';
  }

  // ========== MÉTODOS DE OBTENCIÓN ==========

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  // ========== MÉTODOS PRIVADOS ==========

  private storeToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
  }

  private decodeToken(token: string): User {
    const decoded: DecodedToken = jwtDecode(token);
    const authorities = decoded.authorities || [];

    // Determinar el rol principal
    let role = 'USER';
    if (authorities.includes('ROLE_ADMIN')) {
      role = 'ADMIN';
    } else if (authorities.includes('ROLE_USER')) {
      role = 'USER';
    }

    return {
      username: decoded.sub,
      role: role,
      nombre: '',
      apellido: '',
      nombreCompleto: '',
      correoInstitucional: '',
      telefono: ''
    };
  }

  private storeUser(user: User): void {
    localStorage.setItem(this.userKey, JSON.stringify(user));
  }

  private getStoredUser(): User | null {
    const userStr = localStorage.getItem(this.userKey);
    return userStr ? JSON.parse(userStr) : null;
  }
}