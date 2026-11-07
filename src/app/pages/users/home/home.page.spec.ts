import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { Auth } from '@angular/fire/auth';
import { EMPTY, of } from 'rxjs';

import { HomePage } from './home.page';
import { AuthService } from 'src/app/core/services/auth.service';
import { EventoService } from 'src/app/core/services/evento.service';
import { SosService } from 'src/app/core/services/sos.service';
import { KitPrimerosAuxiliosService } from 'src/app/core/services/kit-primeros-auxilios.service';
import { KitSupervivenciaService } from 'src/app/core/services/kit-supervivencia.service';
import { WeatherGlobalService } from 'src/app/core/services/weather-global.service';
import { TimeService } from 'src/app/core/services/time.service';
import { ConsejoService } from 'src/app/core/services/consejo.service';
import { WeatherService } from 'src/app/core/services/weather.service';

// Sin sesión (currentUser null): ngOnInit termina temprano y no consulta datos.
describe('HomePage', () => {
  let component: HomePage;
  let fixture: ComponentFixture<HomePage>;

  beforeEach(async () => {
    const eventoService = jasmine.createSpyObj('EventoService', ['getMisEventos', 'getLugares', 'contarMensajesNuevos'], { foroVisto$: EMPTY });

    await TestBed.configureTestingModule({
      declarations: [HomePage],
      imports: [IonicModule.forRoot()],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: jasmine.createSpyObj('AuthService', ['getCurrentUserData'], { currentUser$: of(null) }) },
        { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigateByUrl', 'navigate'], { url: '/', events: EMPTY }) },
        { provide: Auth, useValue: { currentUser: null } },
        { provide: EventoService, useValue: eventoService },
        { provide: SosService, useValue: {} },
        { provide: KitPrimerosAuxiliosService, useValue: { getKits: () => of([]) } },
        { provide: KitSupervivenciaService, useValue: { getKits: () => of([]) } },
        { provide: WeatherGlobalService, useValue: jasmine.createSpyObj('WeatherGlobalService', ['startLocationTracking', 'stopLocationTracking'], {
          temperature: of(null), description: of(''), locationName: of(''), icon: of(''), humidity: of(null), windSpeed: of(null)
        }) },
        { provide: TimeService, useValue: { dateTime: of('') } },
        { provide: ConsejoService, useValue: { getConsejos: () => of([]) } },
        { provide: WeatherService, useValue: {} }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(HomePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
