// MÓDULO DE CUENTA: contiene la consulta y actualización de información personal.
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { MiCuentaComponent } from './mi-cuenta/mi-cuenta.component';

const routes: Routes = [{ path: '', component: MiCuentaComponent }];

@NgModule({ declarations: [MiCuentaComponent], imports: [CommonModule, ReactiveFormsModule, RouterModule.forChild(routes)] })
export class CuentaModule {}
