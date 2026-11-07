import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { Auth } from '@angular/fire/auth';
import { Firestore } from '@angular/fire/firestore';
import { EMPTY, of } from 'rxjs';

import { EventosPage } from './eventos.page';
import { EventoService } from 'src/app/core/services/evento.service';
import { AuthService } from 'src/app/core/services/auth.service';

// Sin sesión (currentUser null): ngOnInit termina temprano y no consulta datos.
describe('EventosPage', () => {
  let component: EventosPage;
  let fixture: ComponentFixture<EventosPage>;

  beforeEach(async () => {
    const eventoService = jasmine.createSpyObj('EventoService', ['getMisEventos', 'getLugares', 'contarMensajesNuevos'], { foroVisto$: EMPTY });
    eventoService.getMisEventos.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      declarations: [EventosPage],
      imports: [IonicModule.forRoot()],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      providers: [
        { provide: EventoService, useValue: eventoService },
        { provide: AuthService, useValue: jasmine.createSpyObj('AuthService', ['getCurrentUserData'], { currentUser$: of(null) }) },
        { provide: Auth, useValue: { currentUser: null } },
        { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigateByUrl', 'navigate'], { url: '/', events: EMPTY }) },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({}) }, queryParamMap: of(convertToParamMap({})) } },
        { provide: Firestore, useValue: {} }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(EventosPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
