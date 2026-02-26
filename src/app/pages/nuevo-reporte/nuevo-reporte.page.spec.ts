import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NuevoReportePage } from './nuevo-reporte.page';

describe('NuevoReportePage', () => {
  let component: NuevoReportePage;
  let fixture: ComponentFixture<NuevoReportePage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(NuevoReportePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
