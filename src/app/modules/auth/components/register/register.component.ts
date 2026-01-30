import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { AuthRequest } from '../../../../core/models/auth.model';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit {
  userData: AuthRequest = {
    username: '',            // Cédula
    password: '',
    role: 'USER',           // Por defecto USER
    nombre: '',
    apellido: '',
    correoInstitucional: '',
    telefono: ''
  };
  confirmPassword = '';
  loading = false;
  message = '';
  error = '';
  isAdminRegistration = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Detecta si estamos en /auth/register-admin
    this.route.url.subscribe(url => {
      const path = url[0]?.path;
      this.isAdminRegistration = path === 'register-admin';
      if (this.isAdminRegistration) {
        this.userData.role = 'ADMIN'; 
      }
    });
  }

  register(): void {
    // Validaciones básicas
    if (this.userData.password !== this.confirmPassword) {
      this.error = 'Las contraseñas no coinciden';
      return;
    }

    if (!this.validateForm()) {
      return;
    }

    this.loading = true;
    this.error = '';
    this.message = '';

    // Decide qué endpoint usar
    const registerObservable = this.isAdminRegistration 
      ? this.authService.registerAdmin(this.userData)
      : this.authService.register(this.userData);

    registerObservable.subscribe({
      next: (response: any) => {
        const userType = this.isAdminRegistration ? 'Administrador' : 'Usuario';
        this.message = response.message || `${userType} registrado exitosamente`;
        this.resetForm();
        
        setTimeout(() => {
          this.goToLogin();
        }, 2000);
      },
      error: (err) => {
        if (err.error && err.error.error) {
          this.error = err.error.error;
        } else {
          const userType = this.isAdminRegistration ? 'administrador' : 'usuario';
          this.error = `Error al registrar ${userType}`;
        }
        console.error('Error en registro:', err);
        this.loading = false;
      },
      complete: () => {
        this.loading = false;
      }
    });
  }

  goToLogin(): void {
    this.router.navigate(['/auth/login']);
  }

  private validateForm(): boolean {
    // Validar cédula (10 dígitos)
    const cedula = this.userData.username;
    if (!cedula || !/^\d{10}$/.test(cedula)) {
      this.error = 'La cédula debe tener 10 dígitos numéricos';
      return false;
    }

    // Validar correo institucional
    const correo = this.userData.correoInstitucional;
    if (!correo || !correo.endsWith('@unibe.edu.ec')) {
      this.error = 'El correo debe terminar en @unibe.edu.ec';
      return false;
    }

    // Validar teléfono (10 dígitos)
    const telefono = this.userData.telefono;
    if (!telefono || !/^\d{10}$/.test(telefono)) {
      this.error = 'El teléfono debe tener 10 dígitos numéricos';
      return false;
    }

    // Campos requeridos
    if (!this.userData.nombre || !this.userData.nombre.trim()) {
      this.error = 'El nombre es requerido';
      return false;
    }

    if (!this.userData.apellido || !this.userData.apellido.trim()) {
      this.error = 'El apellido es requerido';
      return false;
    }

    if (!this.userData.password || !this.userData.password.trim()) {
      this.error = 'La contraseña es requerida';
      return false;
    }

    return true;
  }

  private resetForm(): void {
    this.userData = {
      username: '',
      password: '',
      role: this.isAdminRegistration ? 'ADMIN' : 'USER',
      nombre: '',
      apellido: '',
      correoInstitucional: '',
      telefono: ''
    };
    this.confirmPassword = '';
  }
}