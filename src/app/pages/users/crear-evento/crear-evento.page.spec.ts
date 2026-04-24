import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CrearEventoPage } from './crear-evento.page';

describe('CrearEventoPage', () => {
  let component: CrearEventoPage;
  let fixture: ComponentFixture<CrearEventoPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(CrearEventoPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
