import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { 
  EventoAuditorio, 
  AprobacionEventoDTO, 
  EstadoEvento 
} from '../models/model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class EventoService {
  private apiUrl = `${environment.apiUrl}/api/eventos`;

  constructor(private http: HttpClient) {}

  // ========== ENDPOINTS PARA USUARIOS ==========
  
  crearEvento(evento: EventoAuditorio): Observable<EventoAuditorio> {
    return this.http.post<EventoAuditorio>(this.apiUrl, evento);
  }

  listarMisEventos(): Observable<EventoAuditorio[]> {
    return this.http.get<EventoAuditorio[]>(`${this.apiUrl}/mis-eventos`);
  }

  // ========== ENDPOINTS PARA ADMINISTRADORES ==========
  
  listarTodosEventos(): Observable<EventoAuditorio[]> {
    return this.http.get<EventoAuditorio[]>(this.apiUrl);
  }

  listarEventosPendientes(): Observable<EventoAuditorio[]> {
    return this.http.get<EventoAuditorio[]>(`${this.apiUrl}/pendientes`);
  }

  listarEventosRechazados(): Observable<EventoAuditorio[]> {
    return this.http.get<EventoAuditorio[]>(`${this.apiUrl}/rechazados`);
  }

  aprobarRechazarEvento(id: number, aprobacionDTO: AprobacionEventoDTO): Observable<EventoAuditorio> {
    return this.http.put<EventoAuditorio>(
      `${this.apiUrl}/${id}/aprobar-rechazar`, 
      aprobacionDTO
    );
  }

  // ========== ENDPOINTS PÚBLICOS O PARA TODOS ==========
  
  listarEventosAprobados(): Observable<EventoAuditorio[]> {
    return this.http.get<EventoAuditorio[]>(`${this.apiUrl}/aprobados`);
  }

  // NUEVO: Calendario completo (aprobados + pendientes)
  listarEventosCalendarioCompleto(fechaInicio?: string, fechaFin?: string): Observable<any> {
    let params = new HttpParams();
    if (fechaInicio) params = params.set('fechaInicio', fechaInicio);
    if (fechaFin) params = params.set('fechaFin', fechaFin);
    
    return this.http.get<any>(`${this.apiUrl}/calendario-completo`, { params });
  }

  // ========== ENDPOINTS GENERALES ==========
  
  obtenerEventoPorId(id: number): Observable<EventoAuditorio> {
    return this.http.get<EventoAuditorio>(`${this.apiUrl}/${id}`);
  }

  actualizarEvento(id: number, evento: EventoAuditorio): Observable<EventoAuditorio> {
    return this.http.put<EventoAuditorio>(`${this.apiUrl}/${id}`, evento);
  }

  eliminarEvento(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  verificarDisponibilidad(fecha: string, horaInicio: string, horaFin: string): Observable<boolean> {
    const params = new HttpParams()
      .set('fecha', fecha)
      .set('horaInicio', horaInicio)
      .set('horaFin', horaFin);
    
    return this.http.get<boolean>(`${this.apiUrl}/disponibilidad`, { params });
  }

  cancelarEvento(id: number, motivo?: string): Observable<EventoAuditorio> {
    let params = new HttpParams();
    if (motivo) params = params.set('motivo', motivo);
    
    return this.http.put<EventoAuditorio>(`${this.apiUrl}/${id}/cancelar`, null, { params });
  }

  obtenerEventosProximos(dias: number = 7): Observable<EventoAuditorio[]> {
    return this.http.get<EventoAuditorio[]>(`${this.apiUrl}/proximos?dias=${dias}`);
  }

  // Métodos auxiliares
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
}