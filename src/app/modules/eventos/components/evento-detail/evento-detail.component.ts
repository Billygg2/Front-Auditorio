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
      next: (evento) => {
        this.evento = evento;
      },
      error: (err) => {
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
      case EstadoEvento.APROBADO:
        return 'badge-success';
      case EstadoEvento.PENDIENTE:
        return 'badge-warning';
      case EstadoEvento.RECHAZADO:
        return 'badge-danger';
      case EstadoEvento.CANCELADO:
        return 'badge-secondary';
      case EstadoEvento.COMPLETADO:
        return 'badge-info';
      default:
        return 'badge-light';
    }
  }

  getEstadoText(estado: EstadoEvento): string {
    const estadoMap: Record<EstadoEvento, string> = {
      [EstadoEvento.PENDIENTE]: 'Pendiente',
      [EstadoEvento.APROBADO]: 'Aprobado',
      [EstadoEvento.RECHAZADO]: 'Rechazado',
      [EstadoEvento.CANCELADO]: 'Cancelado',
      [EstadoEvento.COMPLETADO]: 'Completado'
    };
    return estadoMap[estado] || estado;
  }

  editarEvento(): void {
    if (this.evento?.id) {
      this.router.navigate(['/eventos/editar', this.evento.id]);
    }
  }

  cancelarEvento(): void {
    if (!this.evento?.id) return;

    const motivo = prompt('Ingrese el motivo de cancelación:');
    if (motivo === null) return; // Usuario canceló

    this.loading = true;
    const cancelSub = this.eventoService.cancelarEvento(this.evento.id, motivo).subscribe({
      next: (eventoActualizado) => {
        this.evento = eventoActualizado;
        alert('Evento cancelado exitosamente');
      },
      error: (err) => {
        console.error('Error cancelando evento:', err);
        alert('Error al cancelar el evento: ' + (err.error?.error || err.message));
        this.loading = false;
      },
      complete: () => {
        this.loading = false;
      }
    });
    this.subscriptions.add(cancelSub);
  }

  volverALista(): void {
    this.router.navigate(['/eventos']);
  }

  // Métodos para administradores
  aprobarEvento(): void {
    if (!this.evento?.id || !this.isAdmin) return;

    const confirmar = confirm('¿Está seguro de aprobar este evento?');
    if (!confirmar) return;

    this.loading = true;
    
    const aprobacionDTO: AprobacionEventoDTO = {
      estado: EstadoEvento.APROBADO
    };

    const aprobarSub = this.eventoService.aprobarRechazarEvento(this.evento.id, aprobacionDTO).subscribe({
      next: (eventoActualizado) => {
        this.evento = eventoActualizado;
        alert('Evento aprobado exitosamente');
      },
      error: (err) => {
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

  rechazarEvento(): void {
    if (!this.evento?.id || !this.isAdmin) return;

    const motivo = prompt('Ingrese el motivo de rechazo:');
    if (motivo === null || motivo.trim() === '') {
      alert('Debe ingresar un motivo para rechazar');
      return;
    }

    this.loading = true;
    
    const aprobacionDTO: AprobacionEventoDTO = {
      estado: EstadoEvento.RECHAZADO,
      motivoRechazo: motivo.trim()
    };

    const rechazarSub = this.eventoService.aprobarRechazarEvento(this.evento.id, aprobacionDTO).subscribe({
      next: (eventoActualizado) => {
        this.evento = eventoActualizado;
        alert('Evento rechazado exitosamente');
      },
      error: (err) => {
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

  // Método para formatear fecha
  formatFecha(fecha: string | Date): string {
    if (!fecha) return 'N/A';
    
    if (typeof fecha === 'string') {
      return new Date(fecha).toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
    
    return fecha.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  // Método para formatear hora
  formatHora(hora: string | Date): string {
    if (!hora) return 'N/A';
    
    if (typeof hora === 'string') {
      return hora.substring(0, 5);
    }
    
    return hora.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  }
}