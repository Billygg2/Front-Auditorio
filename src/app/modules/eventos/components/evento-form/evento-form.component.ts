import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, AbstractControl } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { EventoService } from "../../../../core/services/evento.service";
import { AuthService } from '../../../../core/services/auth.service';
import { EventoAuditorio, EstadoEvento } from '../../../../core/models/model';
import { Subscription } from 'rxjs';
import { TipoRequerimientoService } from '../../../../core/services/TipoRequerimiento.Service'
import { TipoRequerimientoModel } from '../../../../core/models/model';

@Component({
  selector: 'app-evento-form',
  templateUrl: './evento-form.component.html',
  styleUrls: ['./evento-form.component.scss']
})
export class EventoFormComponent implements OnInit, OnDestroy {
  eventoForm: FormGroup;
  tiposRequerimiento: TipoRequerimientoModel[] = [];
  isEditMode = false;
  eventoId?: number;
  loading = false;
  disponibilidadVerificada = false;
  disponible = false;
  minDate: string;
  maxDate: string;
  formErrors: any = {};
  private subscriptions: Subscription = new Subscription();
  private readonly draftKey = 'unibe-reserva-borrador';


  // Nueva propiedad para controlar si se puede editar
  puedeEditar = true;
  mensajeNoEditable = '';

  constructor(
    private fb: FormBuilder,
    private eventoService: EventoService,
    private authService: AuthService,
    private tipoRequerimientoService: TipoRequerimientoService,
    private route: ActivatedRoute,
    public router: Router
  ) {
    this.eventoForm = this.createForm();
    this.minDate = this.getFechaMinima();
    this.maxDate = this.getFechaMaxima();
  }

  ngOnInit(): void {
    this.tipoRequerimientoService.listarActivos().subscribe({
      next: (tipos) => this.tiposRequerimiento = tipos,
      error: () => alert('Error cargando tipos de requerimiento')
    });
    const paramSub = this.route.params.subscribe(params => {
      if (params['id']) {
        this.isEditMode = true;
        this.eventoId = +params['id'];
        this.cargarEvento();
      }
    });
    this.subscriptions.add(paramSub);

    if (!this.isEditMode) {
      this.restaurarBorrador();
      const fechaCalendario = this.route.snapshot.queryParamMap.get('fecha');
      const horaCalendario = this.route.snapshot.queryParamMap.get('hora');
      if (fechaCalendario || horaCalendario) {
        this.eventoForm.patchValue({
          ...(fechaCalendario ? { fechaEvento: fechaCalendario } : {}),
          ...(horaCalendario ? { horaInicio: horaCalendario } : {})
        });
      }
    }

    const cambiosSub = this.eventoForm.valueChanges.subscribe(() => {
      this.actualizarErroresFormulario();
      if (!this.isEditMode) this.guardarBorrador();
    });
    this.subscriptions.add(cambiosSub);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private createForm(): FormGroup {
    return this.fb.group({
      nombreEvento: ['', [Validators.required, Validators.maxLength(200), Validators.minLength(3)]],
      descripcion: ['', [Validators.required, Validators.maxLength(500), Validators.minLength(10)]],
      fechaEvento: ['', [Validators.required, this.fechaMinimaValidator.bind(this)]],
      horaInicio: ['08:00', [Validators.required, this.horaValidator.bind(this)]],
      horaFin: ['09:00', [Validators.required, this.horaValidator.bind(this)]],
      numeroAsistentes: [1, [Validators.required, Validators.min(1), Validators.max(500)]],
      publicoExterno: [false],
      requiereRegistroPrevio: [false],
      tipoDisposicion: ['TEATRO', Validators.required],
      responsable: this.fb.group({
        nombre: ['', [Validators.required, Validators.minLength(3)]],
        correo: ['', [Validators.required, Validators.email]],
        telefono: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]]
      }),
      requerimientos: this.fb.array([])
    }, { validators: this.horaFinPosteriorValidator });
  }

  // Validadores personalizados
  private fechaMinimaValidator(control: AbstractControl): { [key: string]: boolean } | null {
    if (!control.value) return null;

    const fechaEvento = new Date(control.value);
    const hoy = new Date();
    const fechaMinima = new Date();
    fechaMinima.setDate(hoy.getDate() + 14);

    fechaEvento.setHours(0, 0, 0, 0);
    fechaMinima.setHours(0, 0, 0, 0);

    return fechaEvento < fechaMinima ? { fechaMinima: true } : null;
  }

  private horaValidator(control: AbstractControl): { [key: string]: boolean } | null {
    if (!control.value) return null;

    const horaRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!horaRegex.test(control.value)) {
      return { formatoHoraInvalido: true };
    }

    const [horas, minutos] = control.value.split(':').map(Number);
    const horaDate = new Date(2000, 0, 1, horas, minutos);
    const minTime = new Date(2000, 0, 1, 8, 0);
    const maxTime = new Date(2000, 0, 1, 20, 0);

    if (horaDate < minTime || horaDate > maxTime) {
      return { horaFueraRango: true };
    }

    return null;
  }

  private horaFinPosteriorValidator(group: FormGroup): { [key: string]: boolean } | null {
    const horaInicio = group.get('horaInicio')?.value;
    const horaFin = group.get('horaFin')?.value;

    if (!horaInicio || !horaFin) return null;

    const inicio = new Date(`2000-01-01T${horaInicio}`);
    const fin = new Date(`2000-01-01T${horaFin}`);

    return fin <= inicio ? { horaFinAnterior: true } : null;
  }

  get requerimientos(): FormArray {
    return this.eventoForm.get('requerimientos') as FormArray;
  }

  compararTipos(tipoA: TipoRequerimientoModel | null, tipoB: TipoRequerimientoModel | null): boolean {
    return tipoA?.id === tipoB?.id;
  }

  cantidadDisponibleRecurso(index: number): number {
    return this.requerimientos.at(index).get('tipo')?.value?.cantidadDisponible || 100;
  }

  // Guarda temporalmente lo escrito para no perderlo al consultar el calendario.
  private guardarBorrador(): void {
    try {
      sessionStorage.setItem(this.draftKey, JSON.stringify(this.eventoForm.getRawValue()));
    } catch (error) {
      console.warn('No se pudo guardar el borrador de la reserva', error);
    }
  }

  // Recupera el borrador cuando el usuario regresa al formulario.
  private restaurarBorrador(): void {
    try {
      const contenido = sessionStorage.getItem(this.draftKey);
      if (!contenido) return;
      const borrador = JSON.parse(contenido);
      const recursos = Array.isArray(borrador.requerimientos) ? borrador.requerimientos : [];
      this.eventoForm.patchValue({ ...borrador, requerimientos: [] }, { emitEvent: false });
      recursos.forEach((recurso: any) => {
        this.agregarRequerimiento();
        this.requerimientos.at(this.requerimientos.length - 1).patchValue(recurso, { emitEvent: false });
      });
    } catch (error) {
      sessionStorage.removeItem(this.draftKey);
      console.warn('No se pudo restaurar el borrador de la reserva', error);
    }
  }

  private borrarBorrador(): void {
    sessionStorage.removeItem(this.draftKey);
  }

agregarRequerimiento(): void {
  const grupo = this.fb.group({
    tipo: [null, Validators.required],
    cantidad: [1, [Validators.required, Validators.min(1)]],
    requerido: [true]
  });

  // Cuando cambia el tipo, actualizar el validador max de cantidad
  grupo.get('tipo')!.valueChanges.subscribe((tipoSeleccionado: TipoRequerimientoModel | null) => {
    const cantidadControl = grupo.get('cantidad')!;
    if (tipoSeleccionado) {
      cantidadControl.setValidators([
        Validators.required,
        Validators.min(1),
        Validators.max(tipoSeleccionado.cantidadDisponible)
      ]);
    } else {
      cantidadControl.setValidators([Validators.required, Validators.min(1)]);
    }
    cantidadControl.updateValueAndValidity();
  });

  this.requerimientos.push(grupo);
}

  eliminarRequerimiento(index: number): void {
    this.requerimientos.removeAt(index);
  }

  // En edición, consulta la reserva y llena todos sus campos y recursos.
  private cargarEvento(): void {
    if (!this.eventoId) return;

    this.loading = true;
    const eventoSub = this.eventoService.obtenerEventoPorId(this.eventoId).subscribe({
      next: (evento) => {
        // Verificar si el evento puede ser editado (debe faltar más de 14 días)
        this.verificarSiPuedeEditar(evento);

        if (this.puedeEditar) {
          this.patchFormWithEvento(evento);
        } else {
          // Deshabilitar el formulario
          this.eventoForm.disable();
        }
      },
      error: (err) => {
        console.error('Error cargando evento:', err);
        alert('Error cargando evento. Por favor, intente nuevamente.');
        this.router.navigate(['/eventos']);
      },
      complete: () => this.loading = false
    });
    this.subscriptions.add(eventoSub);
  }

  /**
   * NUEVO: Verifica si el evento puede ser editado
   * Solo se puede editar si faltan más de 14 días para el evento
   */
private verificarSiPuedeEditar(evento: EventoAuditorio): void {
  if (this.authService.isAdmin()) {
    this.puedeEditar = true;
    return;
  }

  if (evento.estado === EstadoEvento.APROBADO ||
    evento.estado === EstadoEvento.COMPLETADO ||
    evento.estado === EstadoEvento.RECHAZADO ||
    evento.estado === EstadoEvento.CANCELADO) {
    this.puedeEditar = false;
    this.mensajeNoEditable = 'No se puede editar un evento en estado ' + evento.estado.toLowerCase();
    return;
  }

  const fechaEvento = typeof evento.fechaEvento === 'string'
    ? new Date(evento.fechaEvento)
    : evento.fechaEvento;

  const hoy = new Date();
  const limite14Dias = new Date();
  limite14Dias.setDate(hoy.getDate() + 14);

  fechaEvento.setHours(0, 0, 0, 0);
  limite14Dias.setHours(0, 0, 0, 0);

  if (fechaEvento < limite14Dias) {
    this.puedeEditar = false;
    const diasRestantes = Math.ceil((fechaEvento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
    this.mensajeNoEditable = `No se puede editar este evento porque faltan solo ${diasRestantes} días. Se requieren mínimo 14 días de anticipación para realizar cambios.`;
  }
}

  private patchFormWithEvento(evento: EventoAuditorio): void {
    // Limpiar requerimientos existentes
    while (this.requerimientos.length) {
      this.requerimientos.removeAt(0);
    }

    // Parsear fechas y horas
    let fechaEventoStr: string;
    let horaInicioStr: string;
    let horaFinStr: string;

    if (typeof evento.fechaEvento === 'string') {
      fechaEventoStr = evento.fechaEvento.split('T')[0];
    } else {
      fechaEventoStr = (evento.fechaEvento as Date).toISOString().split('T')[0];
    }

    if (typeof evento.horaInicio === 'string') {
      horaInicioStr = evento.horaInicio.substring(0, 5);
    } else {
      horaInicioStr = (evento.horaInicio as Date).toISOString().substring(11, 16);
    }

    if (typeof evento.horaFin === 'string') {
      horaFinStr = evento.horaFin.substring(0, 5);
    } else {
      horaFinStr = (evento.horaFin as Date).toISOString().substring(11, 16);
    }

    // Agregar requerimientos
    if (evento.requerimientos && evento.requerimientos.length > 0) {
      evento.requerimientos.forEach(req => {
        this.requerimientos.push(this.fb.group({
          tipo: [req.tipo, Validators.required],
          cantidad: [req.cantidad, [Validators.required, Validators.min(1)]],
          requerido: [req.requerido]
        }));
      });
    }

    // Patch del formulario
    this.eventoForm.patchValue({
      nombreEvento: evento.nombreEvento,
      descripcion: evento.descripcion,
      fechaEvento: fechaEventoStr,
      horaInicio: horaInicioStr,
      horaFin: horaFinStr,
      numeroAsistentes: evento.numeroAsistentes,
      publicoExterno: evento.publicoExterno,
      requiereRegistroPrevio: evento.requiereRegistroPrevio,
      tipoDisposicion: evento.tipoDisposicion,
      responsable: {
        nombre: evento.responsable?.nombre || '',
        correo: evento.responsable?.correo || '',
        telefono: evento.responsable?.telefono || ''
      }
    });
  }

  /**
   * ACTUALIZADO: Calcula la fecha mínima (14 días desde hoy)
   */
  getFechaMinima(): string {
    const hoy = new Date();
    const fechaMinima = new Date();
    fechaMinima.setDate(hoy.getDate() + 14); // 14 días de anticipación
    return fechaMinima.toISOString().split('T')[0];
  }

  getFechaMaxima(): string {
    const hoy = new Date();
    const fechaMaxima = new Date();
    fechaMaxima.setMonth(hoy.getMonth() + 6);
    return fechaMaxima.toISOString().split('T')[0];
  }

  // Comprueba con el backend que no exista un cruce de fechas y horarios.
  verificarDisponibilidad(): void {
    if (this.eventoForm.get('fechaEvento')?.invalid) {
      alert('Por favor, seleccione una fecha válida (mínimo 14 días de anticipación desde hoy)');
      return;
    }

    if (this.eventoForm.hasError('horaFinAnterior')) {
      alert('La hora de fin debe ser posterior a la hora de inicio');
      return;
    }

    const formValue = this.eventoForm.value;
    if (!formValue.fechaEvento || !formValue.horaInicio || !formValue.horaFin) {
      alert('Complete fecha y horarios para verificar disponibilidad');
      return;
    }

    this.loading = true;

    const disponibilidadSub = this.eventoService.verificarDisponibilidad(
      formValue.fechaEvento,
      formValue.horaInicio,
      formValue.horaFin
    ).subscribe({
      next: (disponible) => {
        this.disponibilidadVerificada = true;
        this.disponible = disponible;
        if (disponible) {
          alert('✅ ¡Horario disponible! No hay conflictos con eventos aprobados ni pendientes. Puede proceder con la solicitud.');
        } else {
          alert('❌ El auditorio NO está disponible en ese horario.\n\n' +
            'Ya existe un evento APROBADO o PENDIENTE en esa fecha/hora.\n\n' +
            '📅 Seleccione otra fecha u horario diferente.');
        }
      },
      error: (err) => {
        console.error('Error verificando disponibilidad:', err);
        alert('Error verificando disponibilidad. Por favor, intente nuevamente.');
      },
      complete: () => this.loading = false
    });

    this.subscriptions.add(disponibilidadSub);
  }

  // Valida todo el formulario y decide entre crear una reserva o actualizarla.
  onSubmit(): void {
    // Verificar si puede editar (en modo edición)
    if (this.isEditMode && !this.puedeEditar) {
      alert(this.mensajeNoEditable);
      return;
    }

    if (this.eventoForm.invalid) {
      this.markAllAsTouched();
      alert('Por favor complete todos los campos requeridos correctamente. Recuerde que la fecha debe ser con mínimo 14 días de anticipación.');
      return;
    }

    // Validar horas manualmente
    if (this.eventoForm.hasError('horaFinAnterior')) {
      alert('La hora de fin debe ser posterior a la hora de inicio');
      return;
    }

    // Validar duración máxima (8 horas)
    const horaInicio = this.eventoForm.get('horaInicio')?.value;
    const horaFin = this.eventoForm.get('horaFin')?.value;

    if (horaInicio && horaFin) {
      const inicio = new Date(`2000-01-01T${horaInicio}`);
      const fin = new Date(`2000-01-01T${horaFin}`);
      const duracionHoras = (fin.getTime() - inicio.getTime()) / (1000 * 60 * 60);

      if (duracionHoras > 8) {
        alert('La duración máxima permitida es de 8 horas');
        return;
      }
    }

    // NUEVA VALIDACIÓN: Verificar que el horario esté disponible
    if (!this.isEditMode && this.disponibilidadVerificada && !this.disponible) {
      alert('❌ No puede enviar la reserva porque el horario NO está disponible.\n\n' +
        'Ya existe un evento APROBADO o PENDIENTE en esa fecha/hora.\n\n' +
        'Por favor, seleccione otra fecha u horario.');
      return;
    }

    if (!this.isEditMode && !this.disponibilidadVerificada) {
      const confirmar = confirm('⚠️ No ha verificado la disponibilidad del horario.\n\n' +
        'Recomendamos verificar antes de enviar para asegurar que no hay conflictos.\n\n' +
        '¿Desea continuar sin verificar?');
      if (!confirmar) return;
    }

    this.loading = true;
    const eventoData = this.prepararDatosEvento();

    const request = this.isEditMode && this.eventoId
      ? this.eventoService.actualizarEvento(this.eventoId, eventoData)
      : this.eventoService.crearEvento(eventoData);

    const submitSub = request.subscribe({
      next: (response) => {
        const mensaje = this.isEditMode
          ? 'Evento actualizado correctamente'
          : 'Solicitud de reserva enviada exitosamente. La universidad revisará su solicitud en los próximos días y recibirá una confirmación por correo electrónico.';

        this.borrarBorrador();
        alert(mensaje);
        this.router.navigate(['/eventos']);
      },
      error: (err) => {
        console.error('Error procesando solicitud:', err);
        let errorMsg = 'Error procesando la solicitud. Por favor, intente nuevamente.';

        if (err.error?.error) {
          errorMsg = err.error.error;
        } else if (err.error?.message) {
          errorMsg = err.error.message;
        } else if (err.message) {
          errorMsg = err.message;
        }

        alert(errorMsg);
        this.loading = false;
      },
      complete: () => this.loading = false
    });

    this.subscriptions.add(submitSub);
  }

  private prepararDatosEvento(): any {
    const eventoData = { ...this.eventoForm.value };

    // Formatear fecha correctamente
    if (eventoData.fechaEvento) {
      const fecha = new Date(eventoData.fechaEvento);
      // Asegurar que la fecha esté en formato YYYY-MM-DD
      eventoData.fechaEvento = fecha.toISOString().split('T')[0];
    }

    // Asegurar que requerimientos tengan la estructura correcta
    if (eventoData.requerimientos) {
      eventoData.requerimientos = eventoData.requerimientos.map((req: any) => ({
        tipo: req.tipo,
        cantidad: req.cantidad,
        requerido: req.requerido
      }));
    }

    // Asegurar que responsable tenga la estructura correcta
    if (eventoData.responsable) {
      eventoData.responsable = {
        nombre: eventoData.responsable.nombre,
        correo: eventoData.responsable.correo,
        telefono: eventoData.responsable.telefono
      };
    }

    return eventoData;
  }

  private markAllAsTouched(): void {
    Object.values(this.eventoForm.controls).forEach(control => {
      if (control instanceof FormGroup) {
        Object.values(control.controls).forEach(subControl => {
          subControl.markAsTouched();
        });
      } else {
        control.markAsTouched();
      }
    });
  }

  cancelar(): void {
    if (confirm('¿Está seguro de cancelar? Los cambios no guardados se perderán.')) {
      this.borrarBorrador();
      this.router.navigate(['/eventos']);
    }
  }

  private actualizarErroresFormulario(): void {
    this.formErrors = {
      fecha: this.fechaEvento?.errors,
      horaInicio: this.horaInicio?.errors,
      horaFin: this.horaFin?.errors,
      formulario: this.eventoForm.errors,
      responsable: this.eventoForm.get('responsable')?.errors,
      nombre: this.nombreEvento?.errors,
      descripcion: this.descripcion?.errors
    };
  }

  // Getters para validación
  get nombreEvento() { return this.eventoForm.get('nombreEvento')!; }
  get descripcion() { return this.eventoForm.get('descripcion')!; }
  get fechaEvento() { return this.eventoForm.get('fechaEvento')!; }
  get horaInicio() { return this.eventoForm.get('horaInicio')!; }
  get horaFin() { return this.eventoForm.get('horaFin')!; }
  get numeroAsistentes() { return this.eventoForm.get('numeroAsistentes')!; }
  get responsableNombre() { return this.eventoForm.get('responsable.nombre')!; }
  get responsableCorreo() { return this.eventoForm.get('responsable.correo')!; }
  get responsableTelefono() { return this.eventoForm.get('responsable.telefono')!; }
  get tipoDisposicion() { return this.eventoForm.get('tipoDisposicion')!; }
}
