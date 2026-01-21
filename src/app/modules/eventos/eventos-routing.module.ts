import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { EventoListComponent } from './components/evento-list/evento-list.component';
import { EventoFormComponent } from './components/evento-form/evento-form.component';
import { EventoDetailComponent } from './components/evento-detail/evento-detail.component';
import { CalendarViewComponent } from './components/calendar-view/calendar-view.component';

const routes: Routes = [
  { path: '', component: EventoListComponent },
  { path: 'nuevo', component: EventoFormComponent },
  { path: 'editar/:id', component: EventoFormComponent },
  { path: 'detalle/:id', component: EventoDetailComponent },
  { path: 'calendario', component: CalendarViewComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class EventosRoutingModule { }