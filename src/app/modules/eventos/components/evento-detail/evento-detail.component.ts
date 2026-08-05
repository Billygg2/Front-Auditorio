import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { EventoService } from '../../../../core/services/evento.service';
import { AuthService } from '../../../../core/services/auth.service';
import { EventoAuditorio, EstadoEvento, AprobacionEventoDTO } from '../../../../core/models/model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-evento-detail',
  templateUrl: './evento-detail.component.html',
  styleUrls: ['./evento-detail.component.scss']
})
export class EventoDetailComponent implements OnInit, OnDestroy {
  evento: EventoAuditorio | null = null;
  loading = false;
  error = '';
  isAdmin = false;
  mostrarModalRechazo = false;
  motivoRechazoInput = '';
  private subscriptions: Subscription = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private eventoService: EventoService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.checkAdminRole();
    this.loadEvento();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private checkAdminRole(): void {
    const user = this.authService.getCurrentUser();
    this.isAdmin = user?.role === 'ADMIN';
  }

  private loadEvento(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error = 'No se especificó ID del evento';
      return;
    }

    this.loading = true;
    const eventoSub = this.eventoService.obtenerEventoPorId(+id).subscribe({
      next: (evento: EventoAuditorio) => {
        this.evento = evento;
      },
      error: (err: any) => {
        console.error('Error cargando evento:', err);
        this.error = 'Error cargando los detalles del evento';
        this.loading = false;
      },
      complete: () => {
        this.loading = false;
      }
    });
    this.subscriptions.add(eventoSub);
  }

  getEstadoBadgeClass(estado: EstadoEvento): string {
    switch (estado) {
      case EstadoEvento.APROBADO:   return 'badge-success';
      case EstadoEvento.PENDIENTE:  return 'badge-warning';
      case EstadoEvento.RECHAZADO:  return 'badge-danger';
      case EstadoEvento.CANCELADO:  return 'badge-secondary';
      case EstadoEvento.COMPLETADO: return 'badge-info';
      default:                      return 'badge-light';
    }
  }

  getEstadoText(estado: EstadoEvento): string {
    const estadoMap: Record<EstadoEvento, string> = {
      [EstadoEvento.PENDIENTE]:  'Pendiente',
      [EstadoEvento.APROBADO]:   'Aprobado',
      [EstadoEvento.RECHAZADO]:  'Rechazado',
      [EstadoEvento.CANCELADO]:  'Cancelado',
      [EstadoEvento.COMPLETADO]: 'Completado'
    };
    return estadoMap[estado] || estado;
  }

  getDisposicionText(disposicion: string): string {
    const disposiciones: Record<string, string> = {
      AULA: 'Aula',
      TEATRO: 'Teatro',
      CONFERENCIA: 'Conferencia',
      U: 'Mesas en U',
      CABALLERO: 'Mesas paralelas',
      CIRCULO: 'Mesas en círculo'
    };
    return disposiciones[disposicion] || disposicion;
  }

  editarEvento(): void {
    if (this.evento?.id) {
      this.router.navigate(['/eventos/editar', this.evento.id]);
    }
  }

  eliminarEvento(): void {
    if (!this.evento?.id) return;
    if (!confirm('¿Está seguro de eliminar este evento?')) return;

    this.loading = true;
    const eliminarSub = this.eventoService.eliminarEvento(this.evento.id).subscribe({
      next: () => {
        alert('Evento eliminado correctamente');
        this.router.navigate(['/eventos']);
      },
      error: (err: any) => {
        console.error('Error eliminando evento:', err);
        alert('Error al eliminar el evento: ' + (err.error?.error || err.message));
        this.loading = false;
      },
      complete: () => {
        this.loading = false;
      }
    });
    this.subscriptions.add(eliminarSub);
  }

  puedeEliminar(): boolean {
    if (!this.evento) return false;
    return this.evento.estado === EstadoEvento.PENDIENTE ||
      this.evento.estado === EstadoEvento.RECHAZADO;
  }

  volverALista(): void {
    this.router.navigate(['/eventos']);
  }

  // Aprueba una solicitud pendiente y activa las notificaciones del backend.
  aprobarEvento(): void {
    if (!this.evento?.id || !this.isAdmin) return;
    if (!confirm('¿Está seguro de aprobar este evento?')) return;

    this.loading = true;
    const aprobacionDTO: AprobacionEventoDTO = {
      estado: EstadoEvento.APROBADO
    };

    const aprobarSub = this.eventoService.aprobarRechazarEvento(this.evento.id, aprobacionDTO).subscribe({
      next: (eventoActualizado: EventoAuditorio) => {
        this.evento = eventoActualizado;
        alert('Evento aprobado. El usuario será notificado automáticamente por correo.');
      },
      error: (err: any) => {
        console.error('Error aprobando evento:', err);
        alert('Error al aprobar el evento: ' + (err.error?.error || err.message));
        this.loading = false;
      },
      complete: () => {
        this.loading = false;
      }
    });
    this.subscriptions.add(aprobarSub);
  }

  // Abre el modal donde el administrador debe escribir el motivo.
  rechazarEvento(): void {
    if (!this.evento?.id || !this.isAdmin) return;
    this.motivoRechazoInput = '';
    this.mostrarModalRechazo = true;
  }

  cerrarModalRechazo(): void {
    this.mostrarModalRechazo = false;
    this.motivoRechazoInput = '';
  }

  // Envía al backend el rechazo confirmado desde el modal.
  confirmarRechazo(): void {
    if (!this.evento?.id || !this.isAdmin || !this.motivoRechazoInput.trim()) return;

    this.loading = true;
    this.mostrarModalRechazo = false;
    const aprobacionDTO: AprobacionEventoDTO = {
      estado: EstadoEvento.RECHAZADO,
      motivoRechazo: this.motivoRechazoInput.trim()
    };

    const rechazarSub = this.eventoService.aprobarRechazarEvento(this.evento.id, aprobacionDTO).subscribe({
      next: (eventoActualizado: EventoAuditorio) => {
        this.evento = eventoActualizado;
        this.motivoRechazoInput = '';
        alert('Evento rechazado. El usuario será notificado automáticamente por correo.');
      },
      error: (err: any) => {
        console.error('Error rechazando evento:', err);
        alert('Error al rechazar el evento: ' + (err.error?.error || err.message));
        this.loading = false;
      },
      complete: () => {
        this.loading = false;
      }
    });
    this.subscriptions.add(rechazarSub);
  }

  // Anula una reserva previamente aprobada que todavía no ha finalizado.
  cancelarReserva(): void {
    if (!this.evento?.id || !this.isAdmin) return;

    const motivo = prompt('Ingrese el motivo de la cancelación:');
    if (motivo === null) return;
    if (!motivo.trim()) {
      alert('Debe ingresar un motivo para cancelar la reserva.');
      return;
    }

    if (!confirm('¿Confirma la cancelación de esta reserva?')) return;

    this.loading = true;
    const cancelarSub = this.eventoService.cancelarEvento(this.evento.id, motivo.trim()).subscribe({
      next: (eventoActualizado: EventoAuditorio) => {
        this.evento = eventoActualizado;
        alert('Reserva cancelada. El usuario será notificado automáticamente por correo.');
      },
      error: (err: any) => {
        console.error('Error cancelando evento:', err);
        alert('Error al cancelar la reserva: ' + (err.error?.error || err.message));
        this.loading = false;
      },
      complete: () => {
        this.loading = false;
      }
    });
    this.subscriptions.add(cancelarSub);
  }

  formatFecha(fecha: string | Date): string {
    if (!fecha) return 'N/A';
    if (typeof fecha === 'string') {
      const [year, month, day] = fecha.split('T')[0].split('-').map(Number);
      const fechaLocal = new Date(year, month - 1, day);
      return fechaLocal.toLocaleDateString('es-ES', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      });
    }
    return new Date(fecha).toLocaleDateString('es-ES', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  }

  formatHora(hora: string | Date): string {
    if (!hora) return 'N/A';
    if (typeof hora === 'string') return hora.substring(0, 5);
    const horaDate = new Date(hora);
    const horas = horaDate.getHours().toString().padStart(2, '0');
    const minutos = horaDate.getMinutes().toString().padStart(2, '0');
    return `${horas}:${minutos}`;
  }
}
