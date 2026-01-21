import { Component, OnInit } from '@angular/core';
import { EventoService } from '../../../../core/services/evento.service';
import { AuthService } from '../../../../core/services/auth.service';
import { EventoAuditorio, EstadoEvento } from '../../../../core/models/model';

@Component({
  selector: 'app-evento-list',
  templateUrl: './evento-list.component.html',
  styleUrls: ['./evento-list.component.scss']
})
export class EventoListComponent implements OnInit {
  eventos: EventoAuditorio[] = [];
  eventosFiltrados: EventoAuditorio[] = [];
  loading = false;
  esAdmin = false;
  today = new Date();
  // Filtros
  filtroEstado: string = '';
  filtroBusqueda: string = '';
  estados = Object.values(EstadoEvento);

  constructor(
    private eventoService: EventoService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.esAdmin = this.authService.isAdmin();
    this.cargarEventos();
  }

  // ========== MÉTODOS DE CARGA ==========
  
  cargarEventos(): void {
    this.loading = true;
    
    const request = this.esAdmin 
      ? this.eventoService.listarTodosEventos()
      : this.eventoService.listarMisEventos();

    request.subscribe({
      next: (eventos) => {
        this.eventos = eventos;
        this.eventosFiltrados = [...eventos];
        this.aplicarFiltros();
      },
      error: (err) => {
        alert('Error cargando eventos');
        console.error(err);
      },
      complete: () => this.loading = false
    });
  }

  cargarPendientes(): void {
    if (!this.esAdmin) return;
    
    this.loading = true;
    this.eventoService.listarEventosPendientes().subscribe({
      next: (eventos) => {
        this.eventos = eventos;
        this.eventosFiltrados = [...eventos];
        this.filtroEstado = 'PENDIENTE';
      },
      error: (err) => console.error(err),
      complete: () => this.loading = false
    });
  }

  cargarAprobados(): void {
    this.loading = true;
    this.eventoService.listarEventosAprobados().subscribe({
      next: (eventos) => {
        this.eventos = eventos;
        this.eventosFiltrados = [...eventos];
        this.filtroEstado = 'APROBADO';
      },
      error: (err) => console.error(err),
      complete: () => this.loading = false
    });
  }

  // ========== MÉTODOS DE FILTRO ==========
  
  aplicarFiltros(): void {
    let filtrados = [...this.eventos];

    // Filtrar por estado
    if (this.filtroEstado) {
      filtrados = filtrados.filter(e => 
        e.estado.toString() === this.filtroEstado
      );
    }

    // Filtrar por búsqueda
    if (this.filtroBusqueda) {
      const busqueda = this.filtroBusqueda.toLowerCase();
      filtrados = filtrados.filter(e =>
        e.nombreEvento.toLowerCase().includes(busqueda) ||
        e.descripcion.toLowerCase().includes(busqueda) ||
        e.responsable?.nombre.toLowerCase().includes(busqueda)
      );
    }

    this.eventosFiltrados = filtrados;
  }

  limpiarFiltros(): void {
    this.filtroEstado = '';
    this.filtroBusqueda = '';
    this.eventosFiltrados = [...this.eventos];
  }

  // ========== MÉTODOS DE ACCIÓN ==========
  
  eliminarEvento(id: number): void {
    if (!confirm('¿Está seguro de eliminar este evento?')) return;
    
    this.eventoService.eliminarEvento(id).subscribe({
      next: () => {
        alert('Evento eliminado correctamente');
        this.cargarEventos();
      },
      error: (err) => {
        alert('Error eliminando evento');
        console.error(err);
      }
    });
  }

  cancelarEvento(id: number): void {
    const motivo = prompt('Ingrese el motivo de la cancelación (opcional):');
    this.eventoService.cancelarEvento(id, motivo || undefined).subscribe({
      next: () => {
        alert('Evento cancelado correctamente');
        this.cargarEventos();
      },
      error: (err) => {
        alert('Error cancelando evento');
        console.error(err);
      }
    });
  }

  // ========== MÉTODOS AUXILIARES ==========
  
  getEstadoBadgeClass(estado: EstadoEvento): string {
    return this.eventoService.getEstadoBadgeClass(estado);
  }

  getEstadoText(estado: EstadoEvento): string {
    return this.eventoService.getEstadoText(estado);
  }

  puedeEditar(evento: EventoAuditorio): boolean {
    if (this.esAdmin) return true;
    return evento.estado === EstadoEvento.PENDIENTE || 
           evento.estado === EstadoEvento.RECHAZADO;
  }

  puedeEliminar(evento: EventoAuditorio): boolean {
    if (this.esAdmin) return true;
    return evento.estado === EstadoEvento.PENDIENTE || 
           evento.estado === EstadoEvento.RECHAZADO;
  }

  puedeCancelar(evento: EventoAuditorio): boolean {
    return evento.estado === EstadoEvento.PENDIENTE || 
           evento.estado === EstadoEvento.APROBADO;
  }

  formatearFecha(fecha: string | Date): string {
    return new Date(fecha).toLocaleDateString('es-EC');
  }

  formatearHora(hora: string | Date): string {
    if (typeof hora === 'string') {
      return hora.substring(0, 5);
    }
    return hora.toString().substring(0, 5);
  }
}