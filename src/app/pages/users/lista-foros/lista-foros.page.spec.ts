import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ListaForosPage } from './lista-foros.page';

describe('ListaForosPage', () => {
  let component: ListaForosPage;
  let fixture: ComponentFixture<ListaForosPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ListaForosPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
