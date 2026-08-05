import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TipoRequerimientoModel } from '../models/model';
import { environment } from '../../../environments/environment';
import { Pagina } from '../models/pagina.model';

@Injectable({ providedIn: 'root' })
export class TipoRequerimientoService {
  private apiUrl = `${environment.apiUrl}/api/tipos-requerimiento`;

  constructor(private http: HttpClient) {}

  // Para el formulario de reservas (solo activos)
  listarActivos(): Observable<TipoRequerimientoModel[]> {
    return this.http.get<TipoRequerimientoModel[]>(`${this.apiUrl}/activos`);
  }

  // Para el panel admin (todos)
  listarTodos(): Observable<TipoRequerimientoModel[]> {
    return this.http.get<TipoRequerimientoModel[]>(this.apiUrl);
  }

  listarPaginado(pagina: number, tamanio: number): Observable<Pagina<TipoRequerimientoModel>> {
    const params = new HttpParams()
      .set('pagina', pagina)
      .set('tamanio', tamanio);
    return this.http.get<Pagina<TipoRequerimientoModel>>(`${this.apiUrl}/paginado`, { params });
  }

  crear(tipo: Partial<TipoRequerimientoModel>): Observable<TipoRequerimientoModel> {
    return this.http.post<TipoRequerimientoModel>(this.apiUrl, tipo);
  }

  actualizar(id: number, tipo: Partial<TipoRequerimientoModel>): Observable<TipoRequerimientoModel> {
    return this.http.put<TipoRequerimientoModel>(`${this.apiUrl}/${id}`, tipo);
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
