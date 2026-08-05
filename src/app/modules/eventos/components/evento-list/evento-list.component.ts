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
  filtroBusqueda: string = '';
  filtroEstado: string = '';
  paginaActual = 0;
  tamanioPagina = 3;
  totalElementos = 0;
  totalPaginas = 0;

  constructor(
    private eventoService: EventoService,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.esAdmin = this.authService.isAdmin();
    this.cargarResumen();
    this.cargarEventos();
  }

  // Obtiene todos los eventos únicamente para calcular los contadores superiores.
  cargarResumen(): void {
    const request = this.esAdmin
      ? this.eventoService.listarTodosEventos()
      : this.eventoService.listarMisEventos();
    request.subscribe({ next: eventos => this.eventos = eventos });
  }

  // Consulta al backend la página actual aplicando búsqueda y estado.
  cargarEventos(): void {
    this.loading = true;
    this.eventoService.listarEventosPaginados(
      this.paginaActual,
      this.tamanioPagina,
      this.filtroBusqueda,
      this.filtroEstado
    ).subscribe({
      next: pagina => {
        this.eventosFiltrados = pagina.contenido;
        this.totalElementos = pagina.totalElementos;
        this.totalPaginas = pagina.totalPaginas;
      },
      error: (err) => {
        this.loading = false;
        alert('Error al cargar las reservas');
        console.error(err);
      },
      complete: () => this.loading = false
    });
  }

  cargarTodos(): void {
    this.filtroEstado = '';
    this.filtroBusqueda = '';
    this.paginaActual = 0;
    this.cargarEventos();
  }

  cargarPorEstado(estado: string): void {
    this.filtroEstado = estado;
    this.paginaActual = 0;
    this.cargarEventos();
  }

  // Reinicia la página y vuelve a consultar cuando cambia un filtro.
  aplicarFiltros(): void {
    this.paginaActual = 0;
    this.cargarEventos();
  }

  cambiarPagina(pagina: number): void {
    this.paginaActual = pagina;
    this.cargarEventos();
  }

  cambiarTamanio(tamanio: number): void {
    this.tamanioPagina = tamanio;
    this.paginaActual = 0;
    this.cargarEventos();
  }

  limpiarFiltros(): void {
    this.filtroBusqueda = '';
    this.filtroEstado = '';
    this.aplicarFiltros();
  }

  contarPorEstado(estado: string): number {
    return this.eventos.filter(evento => evento.estado === estado).length;
  }

  obtenerParteFecha(fecha: string | Date, parte: 'dia' | 'mes' | 'anio'): string {
    if (!fecha) return '--';
    let fechaLocal: Date;
    if (typeof fecha === 'string') {
      const [anio, mes, dia] = fecha.split('T')[0].split('-').map(Number);
      fechaLocal = new Date(anio, mes - 1, dia);
    } else {
      fechaLocal = new Date(fecha);
    }
    if (parte === 'dia') return String(fechaLocal.getDate()).padStart(2, '0');
    if (parte === 'anio') return String(fechaLocal.getFullYear());
    return fechaLocal.toLocaleDateString('es-EC', { month: 'short' }).replace('.', '').toUpperCase();
  }

  // Elimina una reserva permitida y evita dejar una última página vacía.
  eliminarEvento(id: number): void {
    if (!confirm('¿Está seguro de eliminar este evento?')) return;
    this.eventoService.eliminarEvento(id).subscribe({
      next: () => {
        alert('Evento eliminado correctamente');
        if (this.eventosFiltrados.length === 1 && this.paginaActual > 0) {
          this.paginaActual--;
        }
        this.cargarResumen();
        this.cargarEventos();
      },
      error: (err: any) => {
        alert('Error eliminando evento');
        console.error(err);
      }
    });
  }

  getEstadoBadgeClass(estado: EstadoEvento): string {
    return this.eventoService.getEstadoBadgeClass(estado);
  }

  getEstadoText(estado: EstadoEvento): string {
    return this.eventoService.getEstadoText(estado);
  }

  puedeEditar(evento: EventoAuditorio): boolean {
    if (!this.esAdmin) return false;
    return evento.estado !== EstadoEvento.COMPLETADO &&
      evento.estado !== EstadoEvento.RECHAZADO &&
      evento.estado !== EstadoEvento.CANCELADO;
  }

  puedeEliminar(evento: EventoAuditorio): boolean {
    return evento.estado === EstadoEvento.PENDIENTE ||
      evento.estado === EstadoEvento.RECHAZADO;
  }

  formatearFecha(fecha: string | Date): string {
    if (!fecha) return 'N/A';
    if (typeof fecha === 'string') {
      const [year, month, day] = fecha.split('T')[0].split('-').map(Number);
      const fechaLocal = new Date(year, month - 1, day);
      return fechaLocal.toLocaleDateString('es-EC', {
        year: 'numeric', month: '2-digit', day: '2-digit'
      });
    }
    return new Date(fecha).toLocaleDateString('es-EC', {
      year: 'numeric', month: '2-digit', day: '2-digit'
    });
  }

  formatearHora(hora: string | Date): string {
    if (!hora) return 'N/A';
    if (typeof hora === 'string') return hora.substring(0, 5);
    const horaDate = new Date(hora);
    const horas = horaDate.getHours().toString().padStart(2, '0');
    const minutos = horaDate.getMinutes().toString().padStart(2, '0');
    return `${horas}:${minutos}`;
  }
}
