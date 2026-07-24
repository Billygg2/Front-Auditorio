import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { EventoService } from '../../../../core/services/evento.service';
import { EventoAuditorio } from '../../../../core/models/model';
import { Router } from '@angular/router';

interface HorarioVisual {
  horaInicio: string;
  horaFin: string;
  estado: string; // 'libre' | 'en-proceso' | 'ocupado' | 'completado'
  evento?: EventoAuditorio;
  duracionHoras: number;
  puedeReservar: boolean;
}

// Tipo de celda del calendario
type TipoDia = 'pasado-vacio' | 'pasado-con-eventos' | 'bloqueado' | 'libre' | 'parcial' | 'lleno';

@Component({
  selector: 'app-calendar-view',
  templateUrl: './calendar-view.component.html',
  styleUrls: ['./calendar-view.component.scss']
})
export class CalendarViewComponent implements OnInit {

  eventosAprobados: EventoAuditorio[] = [];
  eventosPendientes: EventoAuditorio[] = [];
  eventosCompletados: EventoAuditorio[] = [];
  loading = true;

  mesActual: number;
  anioActual: number;
  diasDelMes: (Date | null)[] = [];
  diasSemana = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];

  // Panel
  diaSeleccionadoStr = '';
  diaSeleccionadoObj: Date | null = null;
  panelVisible = false;
  horariosVisuales: HorarioVisual[] = [];

  constructor(
    private eventoService: EventoService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {
    const hoy = new Date();
    this.mesActual = hoy.getMonth();
    this.anioActual = hoy.getFullYear();
  }

  ngOnInit(): void {
    this.generarDiasDelMes();
    this.cargarCalendario();
  }

  // ── CARGA ─────────────────────────────────────────

  cargarCalendario(): void {
    this.loading = true;
    this.eventoService.listarEventosCalendarioCompleto().subscribe({
      next: (r: any) => {
        this.ngZone.run(() => {
          this.eventosAprobados = r.aprobados || [];
          this.eventosPendientes = r.pendientes || [];
          this.eventosCompletados = r.completados || [];
          this.loading = false;
          if (this.diaSeleccionadoStr) this.generarHorariosVisuales();
          this.cdr.markForCheck();
        });
      },
      error: () => this.cargarCalendarioFallback()
    });
  }

  cargarCalendarioFallback(): void {
    this.eventoService.listarEventosAprobados().subscribe({
      next: (aprobados) => {
        this.eventoService.listarEventosPendientes().subscribe({
          next: (pendientes) => {
            this.ngZone.run(() => {
              this.eventosAprobados = aprobados;
              this.eventosPendientes = pendientes;
              this.loading = false;
              if (this.diaSeleccionadoStr) this.generarHorariosVisuales();
              this.cdr.markForCheck();
            });
          },
          error: () => this.ngZone.run(() => { this.loading = false; this.cdr.markForCheck(); })
        });
      },
      error: () => this.ngZone.run(() => { this.loading = false; this.cdr.markForCheck(); })
    });
  }

  // ── CALENDARIO MENSUAL ────────────────────────────

  generarDiasDelMes(): void {
    this.diasDelMes = [];
    const primerDia = new Date(this.anioActual, this.mesActual, 1);
    const ultimoDia = new Date(this.anioActual, this.mesActual + 1, 0);
    const inicioDow = primerDia.getDay();
    for (let i = 0; i < inicioDow; i++) this.diasDelMes.push(null);
    for (let d = 1; d <= ultimoDia.getDate(); d++)
      this.diasDelMes.push(new Date(this.anioActual, this.mesActual, d));
  }

  cambiarMes(delta: number): void {
    const f = new Date(this.anioActual, this.mesActual + delta, 1);
    this.mesActual = f.getMonth();
    this.anioActual = f.getFullYear();
    this.generarDiasDelMes();
    this.diaSeleccionadoStr = '';
    this.diaSeleccionadoObj = null;
    this.panelVisible = false;
    this.horariosVisuales = [];
  }

  getNombreMes(): string {
    return new Date(this.anioActual, this.mesActual, 1)
      .toLocaleDateString('es-EC', { month: 'long' })
      .replace(/^\w/, c => c.toUpperCase());
  }

  // ── SELECCIÓN DE DÍA (arreglado el doble-click) ──

  seleccionarDia(dia: Date | null): void {
    if (!dia) return;

    const str = this.fechaAStr(dia);
    this.diaSeleccionadoStr = str;
    this.diaSeleccionadoObj = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate());
    this.panelVisible = true;
    this.horariosVisuales = [];

    if (!this.loading) {
      this.generarHorariosVisuales();
    }
    // Sin setTimeout ni detectChanges complejos — NgZone se encarga
  }

  // ── TIPO DE DÍA (para el calendario) ─────────────

  getTipoDia(dia: Date): TipoDia {
    const str = this.fechaAStr(dia);
    const hoy = this.fechaAStr(new Date());
    const minStr = this.fechaAStr(this.getFechaMinima());
    const aprobados = [
      ...this.eventosAprobados,
      ...this.eventosCompletados
    ].filter(e =>
      e?.fechaEvento &&
      this.formatearFecha(e.fechaEvento) === str
    );

    // Pasado
    if (str < hoy) {
      return aprobados.length > 0 ? 'pasado-con-eventos' : 'pasado-vacio';
    }
    // Bloqueado (menos de 2 semanas)
    if (str < minStr) {
      return 'bloqueado';
    }
    // Futuro reservable
    const todos = [
      ...aprobados,
      ...this.eventosPendientes.filter(e =>
        e?.fechaEvento && this.formatearFecha(e.fechaEvento) === str
      )
    ];
    if (todos.length === 0) return 'libre';
    if (this.calcularTieneHuecoLibre(todos)) return 'parcial';
    return 'lleno';
  }

  calcularTieneHuecoLibre(eventos: EventoAuditorio[]): boolean {
    const ord = [...eventos].sort((a, b) =>
      this.horaANum(this.getHoraIni(a)) - this.horaANum(this.getHoraIni(b))
    );
    let cur = 8;
    for (const e of ord) {
      const ini = this.horaANum(this.getHoraIni(e));
      const fin = this.horaANum(this.getHoraFin(e));
      if (cur < ini) return true;
      cur = Math.max(cur, fin);
    }
    return cur < 20;
  }

  esMismoDia(dia: Date, str: string): boolean {
    return this.fechaAStr(dia) === str;
  }

  // ── LÓGICA DE FECHAS ──────────────────────────────

  getFechaMinima(): Date {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  esFechaReservable(dia: Date | null): boolean {
    if (!dia) return false;
    return this.fechaAStr(dia) >= this.fechaAStr(this.getFechaMinima());
  }

  esPasado(dia: Date): boolean {
    return this.fechaAStr(dia) < this.fechaAStr(new Date());
  }

  irAFechaMinima(): void {
    const min = this.getFechaMinima();
    this.mesActual = min.getMonth();
    this.anioActual = min.getFullYear();
    this.generarDiasDelMes();
    this.seleccionarDia(min);
  }

  // ── HORARIOS VISUALES ─────────────────────────────

  generarHorariosVisuales(): void {
    this.horariosVisuales = [];
    if (!this.diaSeleccionadoStr || !this.diaSeleccionadoObj) return;

    const str = this.diaSeleccionadoStr;
    const esPasado = this.esPasado(this.diaSeleccionadoObj);
    const reservable = this.esFechaReservable(this.diaSeleccionadoObj);

    const aprobados = this.eventosAprobados.filter(e =>
      e?.fechaEvento &&
      this.formatearFecha(e.fechaEvento) === str
    );

    const completados = this.eventosCompletados.filter(e =>
      e?.fechaEvento &&
      this.formatearFecha(e.fechaEvento) === str
    );

    const pendientes = this.eventosPendientes.filter(e =>
      e?.fechaEvento &&
      this.formatearFecha(e.fechaEvento) === str
    );
    // DÍAS PASADOS — mostrar solo eventos aprobados como "Completado"
    if (esPasado) {

      const eventosPasados = [
        ...aprobados,
        ...completados
      ];

      if (eventosPasados.length === 0) {
        return;
      }

      const ord = [...eventosPasados].sort((a, b) =>
        this.horaANum(this.getHoraIni(a)) -
        this.horaANum(this.getHoraIni(b))
      );

      for (const ev of ord) {

        const ini = this.horaANum(this.getHoraIni(ev));
        const fin = this.horaANum(this.getHoraFin(ev));

        this.horariosVisuales.push({
          horaInicio: this.numAHora(ini),
          horaFin: this.numAHora(fin),
          estado: 'completado',
          evento: ev,
          duracionHoras: fin - ini,
          puedeReservar: false
        });
      }

      return;
    }

    // DÍAS BLOQUEADOS (menos de 2 semanas) que tienen aprobados — igual mostrar
    if (!reservable) {
      if (aprobados.length === 0 && pendientes.length === 0) return;
    }

    // DÍAS NORMALES — generar bloques libres + eventos
    const todos = [
      ...aprobados.map(e => ({ ...e, _tipo: 'ocupado' as string })),
      ...pendientes.map(e => ({ ...e, _tipo: 'en-proceso' as string }))
    ].sort((a, b) => this.horaANum(this.getHoraIni(a)) - this.horaANum(this.getHoraIni(b)));

    const HORA_MIN = 8;
    const HORA_MAX = 20;
    let cur = HORA_MIN;

    for (const ev of todos) {
      const ini = this.horaANum(this.getHoraIni(ev));
      const fin = this.horaANum(this.getHoraFin(ev));

      if (cur < ini && reservable) {
        this.horariosVisuales.push({
          horaInicio: this.numAHora(cur),
          horaFin: this.numAHora(ini),
          estado: 'libre',
          duracionHoras: ini - cur,
          puedeReservar: true
        });
      }

      this.horariosVisuales.push({
        horaInicio: this.getHoraIni(ev),
        horaFin: this.getHoraFin(ev),
        estado: (ev as any)._tipo,
        evento: ev,
        duracionHoras: fin - ini,
        puedeReservar: false
      });

      cur = fin;
    }

    if (cur < HORA_MAX && reservable) {
      this.horariosVisuales.push({
        horaInicio: this.numAHora(cur),
        horaFin: this.numAHora(HORA_MAX),
        estado: 'libre',
        duracionHoras: HORA_MAX - cur,
        puedeReservar: true
      });
    }
  }

  // ── NAVEGACIÓN ────────────────────────────────────

  navegarAReserva(h: HorarioVisual): void {
    if (!h.puedeReservar || !this.diaSeleccionadoStr) return;
    this.router.navigate(['/eventos/nuevo'], {
      queryParams: { fecha: this.diaSeleccionadoStr, hora: h.horaInicio }
    });
  }

  // ── HELPERS ───────────────────────────────────────

  fechaAStr(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  formatearFecha(f: string | Date): string {
    if (!f) return '';
    if (typeof f === 'string') return f.split('T')[0];
    return this.fechaAStr(f);
  }

  horaANum(h: string): number {
    if (!h) return 0;
    const p = h.split(':');
    return parseInt(p[0]) + (parseInt(p[1]) || 0) / 60;
  }

  numAHora(n: number): string {
    const h = Math.floor(n);
    const m = Math.round((n - h) * 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  getHoraIni(ev: EventoAuditorio): string {
    if (!ev?.horaInicio) return '';
    const s = typeof ev.horaInicio === 'string'
      ? ev.horaInicio
      : (ev.horaInicio as Date).toISOString().substring(11, 16);
    return s.substring(0, 5);
  }

  getHoraFin(ev: EventoAuditorio): string {
    if (!ev?.horaFin) return '';
    const s = typeof ev.horaFin === 'string'
      ? ev.horaFin
      : (ev.horaFin as Date).toISOString().substring(11, 16);
    return s.substring(0, 5);
  }

  getTextoEstado(estado: string): string {
    const m: Record<string, string> = {
      libre: 'Libre',
      'en-proceso': 'Pendiente',
      ocupado: 'Ocupado',
      completado: 'Completado'
    };
    return m[estado] ?? estado;
  }

  contarHorarios(estado: string): number {
    return this.horariosVisuales.filter(h => h.estado === estado).length;
  }

  getFechaActualFormateada(): string {
    return new Date().toLocaleDateString('es-EC', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  }
}