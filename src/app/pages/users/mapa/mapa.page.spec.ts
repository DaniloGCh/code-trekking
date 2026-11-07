import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { Auth } from '@angular/fire/auth';
import { EMPTY, of } from 'rxjs';

import { MapaPage } from './mapa.page';
import { TrackingService } from 'src/app/core/services/tracking.service';
import { AuthService } from 'src/app/core/services/auth.service';

// Sin sesión (currentUser null): ngOnInit termina temprano y no consulta datos.
describe('MapaPage', () => {
  let component: MapaPage;
  let fixture: ComponentFixture<MapaPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MapaPage],
      imports: [IonicModule.forRoot()],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      providers: [
        { provide: TrackingService, useValue: jasmine.createSpyObj('TrackingService', { detenerWatcherPosicion: Promise.resolve() }, {
          estadoActual: { activo: false, puntos: [], distanciaTotal: 0, tiempoSegundos: 0, posicionActual: null },
          estado$: EMPTY
        }) },
        { provide: Auth, useValue: { currentUser: null } },
        { provide: AuthService, useValue: jasmine.createSpyObj('AuthService', ['getCurrentUserData'], { currentUser$: of(null) }) },
        { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigateByUrl', 'navigate'], { url: '/', events: EMPTY }) }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MapaPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
