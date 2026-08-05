import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { AuthRequest } from '../../../../core/models/auth.model';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  credentials: AuthRequest = {
    username: '',            // Cédula
    password: '',            // Contraseña
    // Los demás campos son opcionales para login
    nombre: '',
    apellido: '',
    correoInstitucional: '',
    telefono: '',
    role: ''
  };
  loading = false;
  error = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  // Envía las credenciales y guarda la sesión antes de abrir el calendario.
  login(): void {
    if (!this.credentials.username || !this.credentials.password) {
      this.error = 'Por favor ingrese usuario y contraseña';
      return;
    }

    this.loading = true;
    this.error = '';

    this.authService.login(this.credentials).subscribe({
      next: () => {
        // Login exitoso, redirigir a eventos
        this.router.navigate(['/eventos/calendario']);
      },
      error: (err) => {
        console.error('Error en login:', err);
        
        // Mensajes de error específicos
        if (err.status === 401) {
          this.error = 'Usuario o contraseña incorrectos';
        } else if (err.status === 0) {
          this.error = 'No se pudo conectar con el servidor.';
        } else {
          this.error = 'Error al iniciar sesión. Intente nuevamente.';
        }
        
        this.loading = false;
      },
      complete: () => {
        this.loading = false;
      }
    });
  }
}
