import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { AuthRequest } from '../../../../core/models/auth.model';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent {
  userData: AuthRequest = {
    username: '',
    password: '',
    role: 'USER'
  };
  confirmPassword = '';
  loading = false;
  message = '';
  error = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  register(): void {
    // Validaciones
    if (this.userData.password !== this.confirmPassword) {
      this.error = 'Las contraseñas no coinciden';
      return;
    }

    if (!this.userData.username || !this.userData.password) {
      this.error = 'Todos los campos son requeridos';
      return;
    }

    this.loading = true;
    this.error = '';
    this.message = '';

    this.authService.register(this.userData).subscribe({
      next: (response) => {
        this.message = 'Usuario registrado exitosamente. Ahora puedes iniciar sesión.';
        this.userData = { username: '', password: '', role: 'USER' };
        this.confirmPassword = '';
        
        // Auto-login opcional
        setTimeout(() => {
          this.router.navigate(['/auth/login']);
        }, 2000);
      },
      error: (err) => {
        this.error = err.error || 'Error al registrar usuario';
        console.error('Error en registro:', err);
      },
      complete: () => {
        this.loading = false;
      }
    });
  }
}