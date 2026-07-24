import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ActualizarUsuarioAdmin, UsuarioGestion } from '../models/usuario.model';
import { Pagina } from '../models/pagina.model';

@Injectable({ providedIn: 'root' })
export class UsuarioService {
  private readonly adminUrl = `${environment.apiUrl}/api/admin/usuarios`;
  private readonly miCuentaUrl = `${environment.apiUrl}/api/usuarios/mi-cuenta`;

  constructor(private http: HttpClient) {}

  listar(buscar = ''): Observable<UsuarioGestion[]> {
    const options = buscar.trim()
      ? { params: new HttpParams().set('buscar', buscar.trim()) }
      : {};
    return this.http.get<UsuarioGestion[]>(this.adminUrl, options);
  }

  listarPaginado(pagina: number, tamanio: number, buscar = ''): Observable<Pagina<UsuarioGestion>> {
    let params = new HttpParams()
      .set('pagina', pagina)
      .set('tamanio', tamanio);
    if (buscar.trim()) params = params.set('buscar', buscar.trim());
    return this.http.get<Pagina<UsuarioGestion>>(`${this.adminUrl}/paginado`, { params });
  }

  actualizar(id: number, datos: ActualizarUsuarioAdmin): Observable<UsuarioGestion> {
    return this.http.put<UsuarioGestion>(`${this.adminUrl}/${id}`, datos);
  }

  cambiarEstado(id: number, activo: boolean): Observable<UsuarioGestion> {
    const params = new HttpParams().set('activo', String(activo));
    return this.http.patch<UsuarioGestion>(`${this.adminUrl}/${id}/estado`, null, { params });
  }

  restablecerPassword(id: number, nuevaPassword: string): Observable<void> {
    return this.http.put<void>(`${this.adminUrl}/${id}/password`, { nuevaPassword });
  }

  obtenerMiCuenta(): Observable<UsuarioGestion> {
    return this.http.get<UsuarioGestion>(this.miCuentaUrl);
  }

  actualizarMiTelefono(telefono: string): Observable<UsuarioGestion> {
    return this.http.put<UsuarioGestion>(`${this.miCuentaUrl}/telefono`, { telefono });
  }

  cambiarMiPassword(passwordActual: string, nuevaPassword: string): Observable<void> {
    return this.http.put<void>(`${this.miCuentaUrl}/password`, { passwordActual, nuevaPassword });
  }
}
