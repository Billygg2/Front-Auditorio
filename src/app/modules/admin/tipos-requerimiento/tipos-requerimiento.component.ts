import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { TipoRequerimientoModel } from '../../../core/models/model';
import { TipoRequerimientoService } from '../../../core/services/TipoRequerimiento.Service';

@Component({
    selector: 'app-tipos-requerimiento',
    templateUrl: './tipos-requerimiento.component.html',
    styleUrls: ['./tipos-requerimiento.component.scss']
})
export class TiposRequerimientoComponent implements OnInit, OnDestroy {
    tipos: TipoRequerimientoModel[] = [];
    tiposResumen: TipoRequerimientoModel[] = [];
    loading = false;
    guardando = false;
    modoEdicion = false;
    tipoSeleccionadoId?: number;
    mostrarFormulario = false;
    paginaActual = 0;
    tamanioPagina = 10;
    totalElementos = 0;
    totalPaginas = 0;

    tipoForm: FormGroup;
    private subs = new Subscription();

    constructor(
        private fb: FormBuilder,
        private tipoService: TipoRequerimientoService
    ) {
        this.tipoForm = this.fb.group({
            nombre: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
            descripcion: ['', Validators.maxLength(255)],
            activo: [true],
            cantidadDisponible: [1, [Validators.required, Validators.min(1)]] // NUEVO
        });
    }

    ngOnInit(): void {
        this.cargarResumen();
        this.cargarTipos();
    }

    ngOnDestroy(): void {
        this.subs.unsubscribe();
    }

    cargarTipos(): void {
        this.loading = true;
        this.subs.add(
            this.tipoService.listarPaginado(this.paginaActual, this.tamanioPagina).subscribe({
                next: (pagina) => {
                    this.tipos = pagina.contenido;
                    this.totalElementos = pagina.totalElementos;
                    this.totalPaginas = pagina.totalPaginas;
                    this.loading = false;
                },
                error: () => { alert('Error cargando tipos de requerimiento'); this.loading = false; }
            })
        );
    }

    cargarResumen(): void {
        this.subs.add(this.tipoService.listarTodos().subscribe({
            next: tipos => this.tiposResumen = tipos
        }));
    }

    cambiarPagina(pagina: number): void {
        this.paginaActual = pagina;
        this.cargarTipos();
    }

    cambiarTamanio(tamanio: number): void {
        this.tamanioPagina = tamanio;
        this.paginaActual = 0;
        this.cargarTipos();
    }

    abrirFormularioNuevo(): void {
        this.modoEdicion = false;
        this.tipoSeleccionadoId = undefined;
        this.tipoForm.reset({ nombre: '', descripcion: '', activo: true, cantidadDisponible: 1 });
        this.mostrarFormulario = true;
    }

    abrirFormularioEditar(tipo: TipoRequerimientoModel): void {
        this.modoEdicion = true;
        this.tipoSeleccionadoId = tipo.id;
        this.tipoForm.patchValue({
            nombre: tipo.nombre,
            descripcion: tipo.descripcion || '',
            activo: tipo.activo,
            cantidadDisponible: tipo.cantidadDisponible 
        });
        this.mostrarFormulario = true;
    }

    cerrarFormulario(): void {
        this.mostrarFormulario = false;
        this.tipoForm.reset();
    }

    guardar(): void {
        if (this.tipoForm.invalid) {
            this.tipoForm.markAllAsTouched();
            return;
        }

        this.guardando = true;
        const datos = this.tipoForm.value;

        const request = this.modoEdicion && this.tipoSeleccionadoId
            ? this.tipoService.actualizar(this.tipoSeleccionadoId, datos)
            : this.tipoService.crear(datos);

        this.subs.add(
            request.subscribe({
                next: () => {
                    alert(this.modoEdicion ? 'Tipo actualizado correctamente' : 'Tipo creado correctamente');
                    this.cerrarFormulario();
                    this.cargarResumen();
                    this.cargarTipos();
                    this.guardando = false;
                },
                error: (err) => {
                    const msg = err.error?.error || 'Error guardando el tipo de requerimiento';
                    alert(msg);
                    this.guardando = false;
                }
            })
        );
    }

    eliminar(tipo: TipoRequerimientoModel): void {
        if (!confirm(`¿Eliminar "${tipo.nombre}"? Esta acción no se puede deshacer.`)) return;

        this.subs.add(
            this.tipoService.eliminar(tipo.id).subscribe({
                next: () => { this.cargarResumen(); this.cargarTipos(); },
                error: (err) => {
                    const msg = err.error?.error || 'Error eliminando el tipo';
                    alert(msg);
                }
            })
        );
    }

    contarActivos(): number {
        return this.tiposResumen.filter(tipo => tipo.activo).length;
    }

    totalDisponible(): number {
        return this.tiposResumen.reduce((total, tipo) => total + (tipo.cantidadDisponible || 0), 0);
    }

    // Getters para validación en template
    get nombre() { return this.tipoForm.get('nombre')!; }
    get descripcion() { return this.tipoForm.get('descripcion')!; }
}
