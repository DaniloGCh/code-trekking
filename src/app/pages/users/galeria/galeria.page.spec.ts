import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GaleriaPage } from './galeria.page';

describe('GaleriaPage', () => {
  let component: GaleriaPage;
  let fixture: ComponentFixture<GaleriaPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(GaleriaPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
