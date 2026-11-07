import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { EMPTY, of } from 'rxjs';

import { ListaForosPage } from './lista-foros.page';
import { EventoService } from 'src/app/core/services/evento.service';
import { AuthService } from 'src/app/core/services/auth.service';

// Sin sesión (currentUser null): ngOnInit termina temprano y no consulta datos.
describe('ListaForosPage', () => {
  let component: ListaForosPage;
  let fixture: ComponentFixture<ListaForosPage>;

  beforeEach(async () => {
    const eventoService = jasmine.createSpyObj('EventoService', ['getMisEventos', 'getLugares', 'contarMensajesNuevos'], { foroVisto$: EMPTY });
    eventoService.getMisEventos.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      declarations: [ListaForosPage],
      imports: [IonicModule.forRoot()],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      providers: [
        { provide: EventoService, useValue: eventoService },
        { provide: AuthService, useValue: jasmine.createSpyObj('AuthService', ['getCurrentUserData'], { currentUser$: of(null) }) },
        { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigateByUrl', 'navigate'], { url: '/', events: EMPTY }) }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ListaForosPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
