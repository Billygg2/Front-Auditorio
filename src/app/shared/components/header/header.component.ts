import { Component, ElementRef, HostListener, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { NotificacionService } from '../../../core/services/notificacion.service';
import { Notificacion, TipoNotificacion } from '../../../core/models/notificacion.model';
import { Subscription, catchError, of, switchMap, timer } from 'rxjs';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit, OnDestroy {
  isAuthenticated = false;
  isAdmin = false;
  username = '';
  nombreCompleto = '';
  notificaciones: Notificacion[] = [];
  cantidadNoLeidas = 0;
  panelNotificacionesAbierto = false;
  cargandoNotificaciones = false;
  private subscriptions = new Subscription();
  private pollingSubscription?: Subscription;

  constructor(
    private authService: AuthService,
    private router: Router,
    private notificacionService: NotificacionService,
    private elementRef: ElementRef<HTMLElement>
  ) {}

  // Al iniciar, recupera la sesión y consulta las notificaciones del usuario.
  ngOnInit(): void {
    const usuarioSub = this.authService.currentUser$.subscribe(user => {
      this.isAuthenticated = !!user;
      this.isAdmin = this.authService.isAdmin();
      this.username = user?.username || '';
      this.nombreCompleto = user?.nombreCompleto ||
        [user?.nombre, user?.apellido].filter(Boolean).join(' ');

      if (user) {
        this.iniciarConsultaNotificaciones();
      } else {
        this.detenerConsultaNotificaciones();
        this.notificaciones = [];
        this.cantidadNoLeidas = 0;
      }
    });
    this.subscriptions.add(usuarioSub);
  }

  ngOnDestroy(): void {
    this.detenerConsultaNotificaciones();
    this.subscriptions.unsubscribe();
  }

  alternarNotificaciones(event: MouseEvent): void {
    event.stopPropagation();
    this.panelNotificacionesAbierto = !this.panelNotificacionesAbierto;
  }

  abrirNotificacion(notificacion: Notificacion): void {
    this.panelNotificacionesAbierto = false;

    if (!notificacion.leida) {
      notificacion.leida = true;
      this.actualizarContador();
      this.notificacionService.marcarComoLeida(notificacion.id).subscribe({
        error: () => {
          notificacion.leida = false;
          this.actualizarContador();
        }
      });
    }

    if (notificacion.eventoId) {
      this.router.navigate(['/eventos/detalle', notificacion.eventoId]);
    }
  }

  marcarTodasComoLeidas(event: MouseEvent): void {
    event.stopPropagation();
    if (this.cantidadNoLeidas === 0) return;

    this.notificacionService.marcarTodasComoLeidas().subscribe({
      next: () => {
        this.notificaciones.forEach(notificacion => notificacion.leida = true);
        this.actualizarContador();
      }
    });
  }

  iconoNotificacion(tipo: TipoNotificacion): string {
    const iconos: Record<TipoNotificacion, string> = {
      NUEVA_RESERVA: 'fa-calendar-plus',
      RESERVA_APROBADA: 'fa-circle-check',
      RESERVA_RECHAZADA: 'fa-circle-xmark',
      RESERVA_CANCELADA: 'fa-ban',
      RESERVA_COMPLETADA: 'fa-flag-checkered'
    };
    return iconos[tipo];
  }

  @HostListener('document:click', ['$event'])
  cerrarPanelAlHacerClickFuera(event: Event): void {
    if (!this.elementRef.nativeElement.contains(event.target as Node)) {
      this.panelNotificacionesAbierto = false;
    }
  }

  // Elimina la sesión local y devuelve al usuario a la pantalla de acceso.
  logout(): void {
    this.detenerConsultaNotificaciones();
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }

  private iniciarConsultaNotificaciones(): void {
    this.detenerConsultaNotificaciones();
    this.pollingSubscription = timer(0, 30000).pipe(
      switchMap(() => {
        this.cargandoNotificaciones = this.notificaciones.length === 0;
        return this.notificacionService.listar().pipe(
          catchError(() => of(this.notificaciones))
        );
      })
    ).subscribe(notificaciones => {
      this.notificaciones = notificaciones;
      this.actualizarContador();
      this.cargandoNotificaciones = false;
    });
  }

  private detenerConsultaNotificaciones(): void {
    this.pollingSubscription?.unsubscribe();
    this.pollingSubscription = undefined;
  }

  private actualizarContador(): void {
    this.cantidadNoLeidas = this.notificaciones.filter(notificacion => !notificacion.leida).length;
  }
}
