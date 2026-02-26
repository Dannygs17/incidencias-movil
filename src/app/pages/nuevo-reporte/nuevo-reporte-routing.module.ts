import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { NuevoReportePage } from './nuevo-reporte.page';

const routes: Routes = [
  {
    path: '',
    component: NuevoReportePage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class NuevoReportePageRoutingModule {}
