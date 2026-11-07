import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { Auth } from '@angular/fire/auth';
import { EMPTY, of } from 'rxjs';

import { CrearEventoPage } from './crear-evento.page';
import { EventoService } from 'src/app/core/services/evento.service';
import { AuthService } from 'src/app/core/services/auth.service';

// Sin sesión (currentUser null): ngOnInit termina temprano y no consulta datos.
describe('CrearEventoPage', () => {
  let component: CrearEventoPage;
  let fixture: ComponentFixture<CrearEventoPage>;

  beforeEach(async () => {
    const eventoService = jasmine.createSpyObj('EventoService', ['getMisEventos', 'getLugares', 'contarMensajesNuevos'], { foroVisto$: EMPTY });
    eventoService.getLugares.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      declarations: [CrearEventoPage],
      imports: [IonicModule.forRoot(), ReactiveFormsModule],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      providers: [
        { provide: EventoService, useValue: eventoService },
        { provide: AuthService, useValue: jasmine.createSpyObj('AuthService', ['getCurrentUserData'], { currentUser$: of(null) }) },
        { provide: Auth, useValue: { currentUser: null } },
        { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigateByUrl', 'navigate'], { url: '/', events: EMPTY }) }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CrearEventoPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
