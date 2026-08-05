import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { UsuarioService } from '../../../core/services/usuario.service';
import { UsuarioGestion } from '../../../core/models/usuario.model';
import { AuthService } from '../../../core/services/auth.service';

@Component({ selector: 'app-usuarios', templateUrl: './usuarios.component.html', styleUrls: ['./usuarios.component.scss'] })
export class UsuariosComponent implements OnInit {
  usuarios: UsuarioGestion[] = [];
  seleccionado: UsuarioGestion | null = null;
  buscar = ''; cargando = false; guardando = false; error = ''; mensaje = ''; mostrarPassword = false;
  paginaActual = 0; readonly tamanioPagina = 5; totalElementos = 0; totalPaginas = 0;

  usuarioForm = this.fb.group({
    username: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
    nombre: ['', [Validators.required, Validators.minLength(2), Validators.pattern(/^[A-Za-zÁÉÍÓÚáéíóúÑñÜü]+$/)]],
    apellido: ['', [Validators.required, Validators.minLength(2), Validators.pattern(/^[A-Za-zÁÉÍÓÚáéíóúÑñÜü]+$/)]],
    correoInstitucional: ['', [Validators.required, Validators.email]],
    telefono: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
    role: ['USER', Validators.required], activo: [true]
  });
  passwordForm = this.fb.group({ nuevaPassword: ['', [Validators.required, Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9\s])\S{8,64}$/)]] });

  constructor(private fb: FormBuilder, private usuarioService: UsuarioService, private authService: AuthService) { }
  ngOnInit(): void { this.cargarUsuarios(); }

  // Solicita al backend cinco usuarios por página aplicando el texto de búsqueda.
  cargarUsuarios(): void {
    this.cargando = true; this.error = '';
    this.usuarioService.listarPaginado(this.paginaActual, this.tamanioPagina, this.buscar).subscribe({
      next: pagina => {
        this.usuarios = pagina.contenido;
        this.totalElementos = pagina.totalElementos;
        this.totalPaginas = pagina.totalPaginas;
      },
      error: error => { this.error = this.obtenerError(error, 'No fue posible cargar los usuarios.'); this.cargando = false; },
      complete: () => this.cargando = false
    });
  }
  buscarUsuarios(): void { this.paginaActual = 0; this.cargarUsuarios(); }
  limpiarBusqueda(): void { this.buscar = ''; this.buscarUsuarios(); }
  cambiarPagina(pagina: number): void { this.paginaActual = pagina; this.cargarUsuarios(); }
  // Carga los datos del usuario seleccionado dentro del panel lateral.
  editar(usuario: UsuarioGestion): void {
    this.seleccionado = usuario; this.error = ''; this.mensaje = '';
    this.usuarioForm.reset({ username: usuario.username, nombre: usuario.nombre, apellido: usuario.apellido, correoInstitucional: usuario.correoInstitucional, telefono: usuario.telefono, role: usuario.role, activo: usuario.activo });
    const controlesProtegidos = [
      this.usuarioForm.controls.role,
      this.usuarioForm.controls.activo
    ];
    controlesProtegidos.forEach(control =>
      this.esCuentaActual(usuario) ? control.disable() : control.enable()
    );
    this.passwordForm.reset();
  }
  cerrarEdicion(): void { this.seleccionado = null; this.passwordForm.reset(); }
  // Guarda las correcciones realizadas por el administrador.
  guardar(): void {
    if (!this.seleccionado || this.usuarioForm.invalid) { this.usuarioForm.markAllAsTouched(); return; }
    this.guardando = true; this.error = '';
    const d = this.usuarioForm.getRawValue();
    this.usuarioService.actualizar(this.seleccionado.id, { username: d.username!, nombre: d.nombre!, apellido: d.apellido!, correoInstitucional: d.correoInstitucional!, telefono: d.telefono!, role: d.role as 'USER' | 'ADMIN', activo: !!d.activo }).subscribe({
      next: actualizado => { this.reemplazar(actualizado); this.mensaje = 'Información actualizada correctamente.'; this.seleccionado = actualizado; },
      error: error => { this.error = this.obtenerError(error, 'No fue posible actualizar el usuario.'); this.guardando = false; },
      complete: () => this.guardando = false
    });
  }
  // Activa o desactiva una cuenta, excepto la del administrador autenticado.
  cambiarEstado(usuario: UsuarioGestion): void {
    const accion = usuario.activo ? 'desactivar' : 'activar';
    if (!confirm(`¿Deseas ${accion} la cuenta de ${usuario.nombreCompleto}?`)) return;
    this.usuarioService.cambiarEstado(usuario.id, !usuario.activo).subscribe({ next: u => this.reemplazar(u), error: e => this.error = this.obtenerError(e, `No fue posible ${accion} la cuenta.`) });
  }
  // Establece una clave temporal sin consultar ni mostrar la contraseña anterior.
  restablecerPassword(): void {
    if (!this.seleccionado || this.passwordForm.invalid) { this.passwordForm.markAllAsTouched(); return; }
    if (!confirm('¿Confirmas el restablecimiento de la contraseña?')) return;
    this.usuarioService.restablecerPassword(this.seleccionado.id, this.passwordForm.controls.nuevaPassword.value!).subscribe({
      next: () => { this.mensaje = 'Contraseña temporal establecida. El usuario deberá cambiarla al ingresar.'; this.passwordForm.reset(); this.mostrarPassword = false; this.seleccionado = { ...this.seleccionado!, debeCambiarPassword: true }; this.reemplazar(this.seleccionado); },
      error: e => this.error = this.obtenerError(e, 'No fue posible restablecer la contraseña.')
    });
  }
  esCuentaActual(u: UsuarioGestion): boolean { return u.username === this.authService.getCurrentUser()?.username; }
  controlInvalido(nombre: string): boolean { const c = this.usuarioForm.get(nombre); return !!c && c.invalid && c.touched; }
  private reemplazar(u: UsuarioGestion): void { this.usuarios = this.usuarios.map(x => x.id === u.id ? u : x); }
  private obtenerError(e: any, fallback: string): string { if (e.error?.error && e.error.error !== 'Datos inválidos') return e.error.error; const campos = e.error?.campos; return campos ? Object.values(campos)[0] as string : fallback; }
}
