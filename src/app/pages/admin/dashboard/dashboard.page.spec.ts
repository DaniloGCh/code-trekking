// 🔹 Importaciones necesarias para pruebas unitarias en Angular
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LogLevel, setLogLevel } from '@angular/fire';
import { Auth } from '@angular/fire/auth';
import { Firestore } from '@angular/fire/firestore';
import { IonicModule } from '@ionic/angular';
import { FirebaseApp, initializeApp } from 'firebase/app';
import {
  Firestore as FirestoreSdk,
  connectFirestoreEmulator,
  disableNetwork,
  initializeFirestore,
  memoryLocalCache,
  terminate
} from 'firebase/firestore';
import { EMPTY, of } from 'rxjs';

// 🔹 Importación del componente que se va a testear
import { DashboardPage } from './dashboard.page';
import { AuthService } from 'src/app/core/services/auth.service';
import { ConsejoService } from 'src/app/core/services/consejo.service';
import { EventoService } from 'src/app/core/services/evento.service';
import { KitPrimerosAuxiliosService } from 'src/app/core/services/kit-primeros-auxilios.service';
import { KitSupervivenciaService } from 'src/app/core/services/kit-supervivencia.service';
import { LugarService } from 'src/app/core/services/lugar.service';
import { ManualService } from 'src/app/core/services/manual.service';
import { SessionService } from 'src/app/core/services/session.service';
import { SosService } from 'src/app/core/services/sos.service';
import { TerminosControlService } from 'src/app/core/services/terminos-control.service';
import { TerminosService } from 'src/app/core/services/terminos.service';
import { TimeService } from 'src/app/core/services/time.service';
import { WeatherGlobalService } from 'src/app/core/services/weather-global.service';

// 🧪 Describe el conjunto de pruebas para DashboardPage
describe('DashboardPage', () => {

  // 🔹 Instancia del componente
  let component: DashboardPage;

  // 🔹 Fixture: entorno de prueba que permite interactuar con el componente y su template
  let fixture: ComponentFixture<DashboardPage>;

  // 🔹 La página llama collection() en un inicializador de campo, que exige una instancia
  // real de Firestore: se usa una solo en memoria y sin red (nunca sale a internet)
  let app: FirebaseApp;
  let db: FirestoreSdk;

  beforeAll(() => {
    setLogLevel(LogLevel.SILENT);
    app = initializeApp({ projectId: 'demo-code-trekking', apiKey: 'fake', appId: 'fake' }, 'pruebas-dashboard');
  });

  // =========================
  // ⚙️ CONFIGURACIÓN INICIAL
  // =========================
  beforeEach(async () => {
    db = initializeFirestore(app, { localCache: memoryLocalCache() });
    connectFirestoreEmulator(db, '127.0.0.1', 1);
    await disableNetwork(db);

    await TestBed.configureTestingModule({
      declarations: [DashboardPage],
      imports: [IonicModule.forRoot(), ReactiveFormsModule],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      providers: [
        { provide: Firestore, useValue: db },
        { provide: Auth, useValue: { currentUser: null } },
        { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigateByUrl', 'navigate'], { url: '/', events: EMPTY }) },
        {
          provide: AuthService,
          useValue: jasmine.createSpyObj('AuthService', {
            getCurrentUserData: Promise.resolve(null),
            getAllUsers: of([])
          })
        },
        { provide: LugarService, useValue: { getLugares: () => of([]) } },
        { provide: ConsejoService, useValue: { getConsejos: () => of([]) } },
        { provide: ManualService, useValue: { getPasos: () => of([]) } },
        { provide: KitPrimerosAuxiliosService, useValue: { getKits: () => of([]) } },
        { provide: KitSupervivenciaService, useValue: { getKits: () => of([]) } },
        { provide: SosService, useValue: {} },
        { provide: EventoService, useValue: {} },
        { provide: SessionService, useValue: jasmine.createSpyObj('SessionService', ['iniciarTimerAdmin', 'detenerTimer']) },
        { provide: TerminosService, useValue: { obtenerVigentes: () => Promise.resolve({ version: '1.0', fechaPublicacion: null }) } },
        { provide: TerminosControlService, useValue: {} },
        {
          provide: WeatherGlobalService,
          useValue: { temperature: of(null), description: of(''), locationName: of(''), icon: of(''), humidity: of(null), windSpeed: of(null) }
        },
        { provide: TimeService, useValue: { dateTime: of('') } }
      ]
    }).compileComponents();

    // Crea una instancia del componente dentro del entorno de pruebas
    fixture = TestBed.createComponent(DashboardPage);

    // Obtiene la instancia del componente
    component = fixture.componentInstance;

    // Detecta cambios iniciales (ejecuta ngOnInit y renderiza el HTML)
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(async () => {
    fixture.destroy();
    await terminate(db);
  });

  // =========================
  // ✅ PRUEBA BÁSICA
  // =========================
  it('should create', () => {

    // Verifica que el componente se haya creado correctamente
    expect(component).toBeTruthy();
  });
});
