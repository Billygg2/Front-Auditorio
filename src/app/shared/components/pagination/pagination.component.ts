import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-pagination',
  templateUrl: './pagination.component.html'
})
export class PaginationComponent {
  @Input() pagina = 0;
  @Input() tamanio = 10;
  @Input() totalElementos = 0;
  @Input() totalPaginas = 0;
  @Output() paginaChange = new EventEmitter<number>();
  @Output() tamanioChange = new EventEmitter<number>();
  
// PAGINADOR REUTILIZABLE: recibe totales y comunica los cambios al componente padre.

  get permitirCambioTamanio(): boolean {
    return this.tamanioChange.observed;
  }

  get paginasVisibles(): number[] {
    const inicio = Math.max(0, Math.min(this.pagina - 2, this.totalPaginas - 5));
    const fin = Math.min(this.totalPaginas, inicio + 5);
    return Array.from({ length: Math.max(0, fin - inicio) }, (_, indice) => inicio + indice);
  }

  get primerRegistro(): number {
    return this.totalElementos === 0 ? 0 : this.pagina * this.tamanio + 1;
  }

  get ultimoRegistro(): number {
    return Math.min((this.pagina + 1) * this.tamanio, this.totalElementos);
  }

  cambiarPagina(nuevaPagina: number): void {
    if (nuevaPagina >= 0 && nuevaPagina < this.totalPaginas && nuevaPagina !== this.pagina) {
      this.paginaChange.emit(nuevaPagina);
    }
  }

  cambiarTamanio(valor: string): void {
    this.tamanioChange.emit(Number(valor));
  }
}
