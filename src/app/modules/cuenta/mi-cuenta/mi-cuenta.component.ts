import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { UsuarioGestion } from '../../../core/models/usuario.model';
import { UsuarioService } from '../../../core/services/usuario.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({ selector: 'app-mi-cuenta', templateUrl: './mi-cuenta.component.html', styleUrls: ['./mi-cuenta.component.scss'] })
export class MiCuentaComponent implements OnInit {
  usuario: UsuarioGestion | null = null;
  cargando = true; error = ''; mensaje = ''; mostrarActual = false; mostrarNueva = false;
  telefonoForm = this.fb.group({ telefono: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]] });
  passwordForm = this.fb.group({
    passwordActual: ['', Validators.required],
    nuevaPassword: ['', [Validators.required, Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9\s])\S{8,64}$/)]],
    confirmarPassword: ['', Validators.required]
  });

  constructor(private fb: FormBuilder, private usuarioService: UsuarioService, private authService: AuthService) {}
  ngOnInit(): void { this.cargarCuenta(); }
  cargarCuenta(): void {
    this.cargando = true;
    this.usuarioService.obtenerMiCuenta().subscribe({
      next: u => { this.usuario = u; this.telefonoForm.reset({ telefono: u.telefono }); this.authService.updateCurrentUser({ username:u.username, nombre:u.nombre, apellido:u.apellido, nombreCompleto:u.nombreCompleto, correoInstitucional:u.correoInstitucional, telefono:u.telefono, role:u.role, activo:u.activo, debeCambiarPassword:u.debeCambiarPassword }); },
      error: e => { this.error = this.obtenerError(e, 'No fue posible cargar tu cuenta.'); this.cargando = false; },
      complete: () => this.cargando = false
    });
  }
  guardarTelefono(): void {
    if (this.telefonoForm.invalid) { this.telefonoForm.markAllAsTouched(); return; }
    this.usuarioService.actualizarMiTelefono(this.telefonoForm.controls.telefono.value!).subscribe({
      next: u => { this.usuario = u; this.mensaje = 'Teléfono actualizado correctamente.'; this.authService.updateCurrentUser({ telefono:u.telefono }); },
      error: e => this.error = this.obtenerError(e, 'No fue posible actualizar el teléfono.')
    });
  }
  cambiarPassword(): void {
    if (this.passwordForm.invalid) { this.passwordForm.markAllAsTouched(); return; }
    const d = this.passwordForm.getRawValue();
    if (d.nuevaPassword !== d.confirmarPassword) { this.error = 'Las contraseñas nuevas no coinciden.'; return; }
    this.usuarioService.cambiarMiPassword(d.passwordActual!, d.nuevaPassword!).subscribe({
      next: () => { this.mensaje = 'Contraseña actualizada correctamente.'; this.passwordForm.reset(); this.mostrarActual=false; this.mostrarNueva=false; this.authService.updateCurrentUser({ debeCambiarPassword:false }); },
      error: e => this.error = this.obtenerError(e, 'No fue posible cambiar la contraseña.')
    });
  }
  private obtenerError(e:any,f:string):string { if(e.error?.error&&e.error.error!=='Datos inválidos')return e.error.error;const c=e.error?.campos;return c?Object.values(c)[0] as string:f; }
}
