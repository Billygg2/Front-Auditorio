import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { 
  EventoAuditorio, 
  AprobacionEventoDTO, 
  EstadoEvento 
} from '../models/model';
import { environment } from '../../../environments/environment';
import { Pagina } from '../models/pagina.model';

@Injectable({
  providedIn: 'root'
})
export class EventoService {
  private apiUrl        = `${environment.apiUrl}/api/eventos`;
  private calendarioUrl = `${environment.apiUrl}/api/calendario`;
  private disponibilidadUrl = `${environment.apiUrl}/api/disponibilidad`;

  constructor(private http: HttpClient) {}

  // ========== EVENTOS - USUARIO ==========

  crearEvento(evento: EventoAuditorio): Observable<EventoAuditorio> {
    return this.http.post<EventoAuditorio>(this.apiUrl, evento);
  }

  listarMisEventos(): Observable<EventoAuditorio[]> {
    return this.http.get<EventoAuditorio[]>(`${this.apiUrl}/mis-eventos`);
  }

  listarEventosPaginados(
    pagina: number,
    tamanio: number,
    buscar = '',
    estado = ''
  ): Observable<Pagina<EventoAuditorio>> {
    let params = new HttpParams()
      .set('pagina', pagina)
      .set('tamanio', tamanio);
    if (buscar.trim()) params = params.set('buscar', buscar.trim());
    if (estado) params = params.set('estado', estado);
    return this.http.get<Pagina<EventoAuditorio>>(`${this.apiUrl}/paginado`, { params });
  }

  obtenerEventoPorId(id: number): Observable<EventoAuditorio> {
    return this.http.get<EventoAuditorio>(`${this.apiUrl}/${id}`);
  }

  eliminarEvento(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  // ========== EVENTOS - ADMIN ==========

  listarTodosEventos(): Observable<EventoAuditorio[]> {
    return this.http.get<EventoAuditorio[]>(this.apiUrl);
  }

  listarEventosPendientes(): Observable<EventoAuditorio[]> {
    return this.http.get<EventoAuditorio[]>(`${this.apiUrl}/pendientes`);
  }

  listarEventosRechazados(): Observable<EventoAuditorio[]> {
    return this.http.get<EventoAuditorio[]>(`${this.apiUrl}/rechazados`);
  }

  listarEventosCompletados(): Observable<EventoAuditorio[]> {
    return this.http.get<EventoAuditorio[]>(`${this.apiUrl}/completados`);
  }

  aprobarRechazarEvento(id: number, aprobacionDTO: AprobacionEventoDTO): Observable<EventoAuditorio> {
    return this.http.put<EventoAuditorio>(`${this.apiUrl}/${id}/aprobar-rechazar`, aprobacionDTO);
  }

  cancelarEvento(id: number, motivo: string): Observable<EventoAuditorio> {
    const params = new HttpParams().set('motivo', motivo);
    return this.http.put<EventoAuditorio>(`${this.apiUrl}/${id}/cancelar`, null, { params });
  }

  actualizarEvento(id: number, evento: EventoAuditorio): Observable<EventoAuditorio> {
    return this.http.put<EventoAuditorio>(`${this.apiUrl}/${id}`, evento);
  }

  // ========== EVENTOS - PÚBLICOS ==========

  listarEventosAprobados(): Observable<EventoAuditorio[]> {
    return this.http.get<EventoAuditorio[]>(`${this.apiUrl}/aprobados`);
  }

  // ========== CALENDARIO ==========

  listarEventosCalendarioCompleto(fechaInicio?: string, fechaFin?: string): Observable<{ aprobados: EventoAuditorio[], pendientes: EventoAuditorio[] }> {
    let params = new HttpParams();
    if (fechaInicio) params = params.set('fechaInicio', fechaInicio);
    if (fechaFin) params = params.set('fechaFin', fechaFin);
    return this.http.get<{ aprobados: EventoAuditorio[], pendientes: EventoAuditorio[] }>(
      `${this.calendarioUrl}/completo`, { params }
    );
  }

  obtenerEventosProximos(dias: number = 7): Observable<EventoAuditorio[]> {
    const params = new HttpParams().set('dias', dias.toString());
    return this.http.get<EventoAuditorio[]>(`${this.calendarioUrl}/proximos`, { params });
  }

  listarEventosPorFecha(fecha: string): Observable<EventoAuditorio[]> {
    return this.http.get<EventoAuditorio[]>(`${this.calendarioUrl}/fecha/${fecha}`);
  }

  // ========== DISPONIBILIDAD ==========

  verificarDisponibilidad(fecha: string, horaInicio: string, horaFin: string): Observable<boolean> {
    const params = new HttpParams()
      .set('fecha', fecha)
      .set('horaInicio', horaInicio)
      .set('horaFin', horaFin);
    return this.http.get<boolean>(this.disponibilidadUrl, { params });
  }

  // ========== HELPERS ==========

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
}
