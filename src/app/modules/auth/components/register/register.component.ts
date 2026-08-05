import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { AuthRequest } from '../../../../core/models/auth.model';
import { NgForm } from '@angular/forms';

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
  mostrarPassword = false;
  mostrarConfirmPassword = false;

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

  // Valida todos los datos y solicita la creación de la cuenta.
  register(form: NgForm): void {
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
        this.resetForm(form);
        
        setTimeout(() => {
          this.goToLogin();
        }, 2000);
      },
      error: (err) => {
        if (err.error && err.error.error) {
          this.error = err.error.error;
        } else if (err.error?.errors?.length) {
          this.error = err.error.errors[0].message;
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
    // Validar teléfono (10 dígitos)
    const telefono = this.userData.telefono;
    if (!telefono || !/^\d{10}$/.test(telefono)) {
      this.error = 'El teléfono debe tener 10 dígitos numéricos';
      return false;
    }

    const nombreRegex = /^[\p{L}]+$/u;
    if (!nombreRegex.test(this.userData.nombre.trim())) {
      this.error = 'El nombre debe contener solo letras';
      return false;
    }

    if (!nombreRegex.test(this.userData.apellido.trim())) {
      this.error = 'El apellido debe contener solo letras';
      return false;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9\s])\S{8,64}$/;
    if (!passwordRegex.test(this.userData.password)) {
      this.error = 'La contraseña debe tener mínimo 8 caracteres e incluir mayúscula, minúscula, número y símbolo';
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

  // Limpia caracteres no permitidos en cédula y teléfono.
  soloNumeros(campo: 'username' | 'telefono'): void {
    this.userData[campo] = this.userData[campo].replace(/\D/g, '').slice(0, 10);
  }

  // Limpia caracteres no permitidos en nombre y apellido.
  soloLetras(campo: 'nombre' | 'apellido'): void {
    this.userData[campo] = this.userData[campo].replace(/[^\p{L}]/gu, '');
  }

  alternarPassword(): void {
    this.mostrarPassword = !this.mostrarPassword;
  }

  alternarConfirmPassword(): void {
    this.mostrarConfirmPassword = !this.mostrarConfirmPassword;
  }

  passwordTieneLongitud(): boolean {
    return this.userData.password.length >= 8 && this.userData.password.length <= 64;
  }

  passwordTieneMayuscula(): boolean {
    return /[A-Z]/.test(this.userData.password);
  }

  passwordTieneMinuscula(): boolean {
    return /[a-z]/.test(this.userData.password);
  }

  passwordTieneNumero(): boolean {
    return /\d/.test(this.userData.password);
  }

  passwordTieneSimbolo(): boolean {
    return /[^A-Za-z0-9\s]/.test(this.userData.password);
  }

  private resetForm(form: NgForm): void {
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
    this.mostrarPassword = false;
    this.mostrarConfirmPassword = false;
    form.resetForm({
      ...this.userData,
      confirmPassword: ''
    });
  }
}
