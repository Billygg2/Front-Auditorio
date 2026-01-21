import { Component, OnInit } from '@angular/core';
import { EventoService } from '../../../../core/services/evento.service';
import { EventoAuditorio } from '../../../../core/models/model';
import { Router } from '@angular/router';

interface HorarioVisual {
  horaInicio: string;
  horaFin: string;
  estado: string;
  evento?: EventoAuditorio;
  duracionHoras: number;
  puedeReservar: boolean;
}

@Component({
  selector: 'app-calendar-view',
  templateUrl: './calendar-view.component.html',
  styleUrls: ['./calendar-view.component.scss']
})
export class CalendarViewComponent implements OnInit {
  eventosAprobados: EventoAuditorio[] = [];
  eventosPendientes: EventoAuditorio[] = [];
  loading = false;
  fechaSeleccionada: Date = new Date();

  // Horarios dinámicos basados en eventos
  horariosVisuales: HorarioVisual[] = [];

  constructor(
    private eventoService: EventoService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.configurarFechaInicial();
    this.cargarCalendario();
  }

  configurarFechaInicial(): void {
    const hoy = new Date();
    const fechaInicial = new Date();
    fechaInicial.setDate(hoy.getDate() + 14);
    this.fechaSeleccionada = fechaInicial;
  }

  cargarCalendario(): void {
    this.loading = true;

    this.eventoService.listarEventosCalendarioCompleto().subscribe({
      next: (respuesta: any) => {
        this.eventosAprobados = respuesta.aprobados || [];
        this.eventosPendientes = respuesta.pendientes || [];
        this.generarHorariosVisuales();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error cargando calendario completo:', err);
        this.cargarCalendarioFallback();
      }
    });
  }

  cargarCalendarioFallback(): void {
    this.eventoService.listarEventosAprobados().subscribe({
      next: (aprobados) => {
        this.eventosAprobados = aprobados;
        this.eventoService.listarEventosPendientes().subscribe({
          next: (pendientes) => {
            this.eventosPendientes = pendientes;
            this.generarHorariosVisuales();
            this.loading = false;
          },
          error: (err) => {
            console.error('Error cargando pendientes:', err);
            this.loading = false;
          }
        });
      },
      error: (err) => {
        console.error('Error cargando aprobados:', err);
        this.loading = false;
      }
    });
  }

  generarHorariosVisuales(): void {
    this.horariosVisuales = [];
    const fechaStr = this.formatearFecha(this.fechaSeleccionada);

    // Obtener todos los eventos para la fecha seleccionada
    const todosEventos = [
      ...this.eventosAprobados.filter(e => 
        e?.fechaEvento && this.formatearFecha(e.fechaEvento) === fechaStr
      ),
      ...this.eventosPendientes.filter(e => 
        e?.fechaEvento && this.formatearFecha(e.fechaEvento) === fechaStr
      )
    ];

    if (todosEventos.length === 0) {
      // Si no hay eventos, mostrar horario completo del día (8:00-20:00)
      this.horariosVisuales.push({
        horaInicio: '08:00',
        horaFin: '20:00',
        estado: 'libre',
        duracionHoras: 12,
        puedeReservar: this.sePuedeReservar(this.fechaSeleccionada, '08:00')
      });
      return;
    }

    // Ordenar eventos por hora de inicio
    const eventosOrdenados = [...todosEventos].sort((a, b) => {
      const horaA = this.horaANumero(this.getHoraInicioFormateada(a));
      const horaB = this.horaANumero(this.getHoraInicioFormateada(b));
      return horaA - horaB;
    });

    // Hora mínima del día
    const horaMinima = 8; // 8:00 AM
    const horaMaxima = 20; // 8:00 PM

    // Procesar eventos para crear intervalos
    let horaActual = horaMinima;
    
    for (const evento of eventosOrdenados) {
      const horaInicioEvento = this.horaANumero(this.getHoraInicioFormateada(evento));
      const horaFinEvento = this.horaANumero(this.getHoraFinFormateada(evento));

      // 1. Agregar intervalo libre antes del evento (si hay espacio)
      if (horaActual < horaInicioEvento) {
        this.horariosVisuales.push({
          horaInicio: this.numeroAHora(horaActual),
          horaFin: this.numeroAHora(horaInicioEvento),
          estado: 'libre',
          duracionHoras: horaInicioEvento - horaActual,
          puedeReservar: this.sePuedeReservar(this.fechaSeleccionada, this.numeroAHora(horaActual))
        });
      }

      // 2. Agregar el evento
      const estadoEvento = evento.estado === 'APROBADO' ? 'ocupado' : 'en-proceso';
      this.horariosVisuales.push({
        horaInicio: this.getHoraInicioFormateada(evento),
        horaFin: this.getHoraFinFormateada(evento),
        estado: estadoEvento,
        evento: evento,
        duracionHoras: horaFinEvento - horaInicioEvento,
        puedeReservar: false
      });

      // 3. Actualizar hora actual
      horaActual = horaFinEvento;
    }

    // 4. Agregar intervalo libre después del último evento (si hay espacio)
    if (horaActual < horaMaxima) {
      this.horariosVisuales.push({
        horaInicio: this.numeroAHora(horaActual),
        horaFin: this.numeroAHora(horaMaxima),
        estado: 'libre',
        duracionHoras: horaMaxima - horaActual,
        puedeReservar: this.sePuedeReservar(this.fechaSeleccionada, this.numeroAHora(horaActual))
      });
    }
  }

  // Convertir número a hora (ej: 8.5 -> "08:30")
  numeroAHora(numero: number): string {
    const horas = Math.floor(numero);
    const minutos = Math.round((numero - horas) * 60);
    return `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;
  }

  // Métodos auxiliares
  formatearFecha(fecha: string | Date): string {
    if (!fecha) return '';
    if (typeof fecha === 'string') {
      return fecha.split('T')[0];
    }
    return fecha.toISOString().split('T')[0];
  }

  horaANumero(hora: string): number {
    if (!hora) return 0;
    const partes = hora.toString().split(':');
    const horas = parseInt(partes[0]) || 0;
    const minutos = partes[1] ? parseInt(partes[1]) : 0;
    return horas + (minutos / 60);
  }

  cambiarFecha(dias: number): void {
    const nuevaFecha = new Date(this.fechaSeleccionada);
    nuevaFecha.setDate(nuevaFecha.getDate() + dias);

    const hoy = new Date();
    const fechaMinima = new Date();
    fechaMinima.setDate(hoy.getDate() + 14);

    hoy.setHours(0, 0, 0, 0);
    fechaMinima.setHours(0, 0, 0, 0);
    const fechaComparar = new Date(nuevaFecha);
    fechaComparar.setHours(0, 0, 0, 0);

    if (fechaComparar < fechaMinima) {
      alert('El calendario solo muestra fechas a partir de 2 semanas adelante');
      return;
    }

    this.fechaSeleccionada = nuevaFecha;
    this.generarHorariosVisuales();
  }

  irAFechaMinima(): void {
    const hoy = new Date();
    const fechaMinima = new Date();
    fechaMinima.setDate(hoy.getDate() + 14);

    const fechaComparar = new Date(this.fechaSeleccionada);
    fechaComparar.setHours(0, 0, 0, 0);
    fechaMinima.setHours(0, 0, 0, 0);

    if (fechaComparar.getTime() !== fechaMinima.getTime()) {
      this.fechaSeleccionada = fechaMinima;
      this.generarHorariosVisuales();
    }
  }

  getHoraInicioFormateada(evento?: EventoAuditorio): string {
    if (!evento || !evento.horaInicio) return '';
    
    const horaInicioStr = typeof evento.horaInicio === 'string' 
      ? evento.horaInicio 
      : (evento.horaInicio as Date).toISOString().substring(11, 16);
    
    return horaInicioStr.substring(0, 5);
  }

  getHoraFinFormateada(evento?: EventoAuditorio): string {
    if (!evento || !evento.horaFin) return '';
    
    const horaFinStr = typeof evento.horaFin === 'string' 
      ? evento.horaFin 
      : (evento.horaFin as Date).toISOString().substring(11, 16);
    
    return horaFinStr.substring(0, 5);
  }

  esFechaMinima(): boolean {
    const hoy = new Date();
    const fechaMinima = new Date();
    fechaMinima.setDate(hoy.getDate() + 14);

    const fechaComparar = new Date(this.fechaSeleccionada);
    fechaComparar.setHours(0, 0, 0, 0);
    fechaMinima.setHours(0, 0, 0, 0);

    return fechaComparar.getTime() === fechaMinima.getTime();
  }

  esFechaValidaParaReserva(fecha: Date): boolean {
    const hoy = new Date();
    const fechaMinima = new Date();
    fechaMinima.setDate(hoy.getDate() + 14);

    hoy.setHours(0, 0, 0, 0);
    fechaMinima.setHours(0, 0, 0, 0);
    const fechaComparar = new Date(fecha);
    fechaComparar.setHours(0, 0, 0, 0);

    return fechaComparar >= fechaMinima;
  }

  sePuedeReservar(fecha: Date, hora: string): boolean {
    // Verificar que la fecha sea válida para reserva
    if (!this.esFechaValidaParaReserva(fecha)) {
      return false;
    }

    // El horario es reservable si está libre
    const horario = this.horariosVisuales.find(h => 
      this.horaANumero(hora) >= this.horaANumero(h.horaInicio) &&
      this.horaANumero(hora) < this.horaANumero(h.horaFin) &&
      h.estado === 'libre'
    );

    return !!horario;
  }

  getClaseEstado(estado: string): string {
    switch (estado) {
      case 'ocupado': return 'estado-ocupado';
      case 'en-proceso': return 'estado-en-proceso';
      case 'libre': return 'estado-libre';
      default: return 'estado-libre';
    }
  }

  getIconoEstado(estado: string): string {
    switch (estado) {
      case 'ocupado': return '🔴';
      case 'en-proceso': return '🟡';
      case 'libre': return '🟢';
      default: return '🟢';
    }
  }

  getTextoEstado(estado: string): string {
    switch (estado) {
      case 'ocupado': return 'Ocupado';
      case 'en-proceso': return 'En proceso';
      case 'libre': return 'Libre';
      default: return 'Libre';
    }
  }

  getClaseBotonReserva(horario: HorarioVisual): string {
    if (horario.puedeReservar) {
      return 'btn-outline-primary';
    } else {
      return 'btn-outline-secondary disabled';
    }
  }

  getTooltipReserva(horario: HorarioVisual): string {
    if (horario.estado !== 'libre') {
      return horario.estado === 'ocupado' ? 'Horario ocupado' : 'Hay una solicitud en proceso';
    }

    if (!this.esFechaValidaParaReserva(this.fechaSeleccionada)) {
      return 'Solo se pueden reservar fechas a partir de 2 semanas adelante';
    }

    return 'Hacer reserva para este horario';
  }

  contarHorarios(estado: string): number {
    return this.horariosVisuales.filter(h => h.estado === estado).length;
  }

  hoy = new Date();

  getFechaActualFormateada(): string {
    const hoy = new Date();
    return hoy.toLocaleDateString('es-EC', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  getFechaMostrar(): string {
    return this.fechaSeleccionada.toLocaleDateString('es-EC', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  navegarAReserva(horario: HorarioVisual): void {
    if (horario.puedeReservar) {
      this.router.navigate(['/eventos/nuevo'], {
        queryParams: { 
          fecha: this.formatearFecha(this.fechaSeleccionada), 
          hora: horario.horaInicio 
        }
      });
    }
  }

  // Calcular la altura en píxeles según duración
  getAlturaCelda(horario: HorarioVisual): string {
    // Cada hora = 60px, mínimo 60px
    const alturaBase = 60;
    return `${Math.max(alturaBase, horario.duracionHoras * 60)}px`;
  }
}