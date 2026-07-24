import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

// Componentes
import { EventoListComponent } from './components/evento-list/evento-list.component';
import { EventoFormComponent } from './components/evento-form/evento-form.component';
import { EventoDetailComponent } from './components/evento-detail/evento-detail.component';
import { CalendarViewComponent } from './components/calendar-view/calendar-view.component';

// Módulo de rutas
import { EventosRoutingModule } from './eventos-routing.module';
import { SharedModule } from '../../shared/shared.module';

@NgModule({
  declarations: [
    EventoListComponent,
    EventoFormComponent,
    EventoDetailComponent,
    CalendarViewComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    SharedModule,
    EventosRoutingModule
  ]
})
export class EventosModule { }
