import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LogLevel, setLogLevel } from '@angular/fire';
import { Auth } from '@angular/fire/auth';
import { Firestore } from '@angular/fire/firestore';
import { AlertController, LoadingController, ModalController, ToastController } from '@ionic/angular';
import { FirebaseApp, initializeApp } from 'firebase/app';
import {
  Firestore as FirestoreSdk,
  connectFirestoreEmulator,
  disableNetwork,
  initializeFirestore,
  memoryLocalCache,
  terminate
} from 'firebase/firestore';
import { of } from 'rxjs';

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

/**
 * LugarService solo hace CRUD: las validaciones del catálogo viven en el panel
 * del administrador. La página llama collection() al crearse, por lo que usa un
 * Firestore real solo en memoria y sin red.
 */
describe('DashboardPage: validaciones del catálogo de lugares', () => {
  let component: DashboardPage;
  let lugarService: jasmine.SpyObj<LugarService>;
  let toastCtrl: jasmine.SpyObj<ToastController>;
  let app: FirebaseApp;
  let db: FirestoreSdk;

  const ultimoToast = () => toastCtrl.create.calls.mostRecent().args[0] as any;

  const llenar = (extra: any = {}) => component.lugarForm.patchValue({
    nombre: 'Cerro La Campana',
    informacion: 'Ascenso clásico de la costa',
    altitud: '1880 m',
    dificultad: 'Media',
    distanciaKm: 14,
    tiempoEstimadoHoras: '6 h',
    equipamiento: ['Agua (2L a 3L)'],
    DireccionPuntoInicio: 'Sector Granizo',
    requierePagoEntrada: false,
    requiereHorarioVisita: false,
    requiereMasInformacion: false,
    requierePermiso: false,
    requiereRegistroAcceso: false,
    requiereGuiaMontana: false,
    ...extra
  });

  beforeAll(() => {
    setLogLevel(LogLevel.SILENT);
    app = initializeApp({ projectId: 'demo-code-trekking', apiKey: 'fake', appId: 'fake' }, 'pruebas-dashboard-lugar');
  });

  beforeEach(async () => {
    db = initializeFirestore(app, { localCache: memoryLocalCache() });
    connectFirestoreEmulator(db, '127.0.0.1', 1);
    await disableNetwork(db);

    lugarService = jasmine.createSpyObj<LugarService>('LugarService', ['getLugares', 'agregarLugar', 'editarLugar', 'eliminarLugar']);
    lugarService.getLugares.and.returnValue(of([]));
    lugarService.agregarLugar.and.resolveTo();
    lugarService.editarLugar.and.resolveTo();

    toastCtrl = jasmine.createSpyObj<ToastController>('ToastController', ['create']);
    toastCtrl.create.and.callFake((async () => ({ present: () => Promise.resolve() })) as any);
    const loadingCtrl = jasmine.createSpyObj<LoadingController>('LoadingController', ['create']);
    loadingCtrl.create.and.callFake((async () => ({ present: () => Promise.resolve(), dismiss: () => Promise.resolve(true) })) as any);

    await TestBed.configureTestingModule({
      declarations: [DashboardPage],
      imports: [ReactiveFormsModule],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      providers: [
        { provide: Firestore, useValue: db },
        { provide: Auth, useValue: { currentUser: null } },
        { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigateByUrl']) },
        { provide: LugarService, useValue: lugarService },
        { provide: ToastController, useValue: toastCtrl },
        { provide: LoadingController, useValue: loadingCtrl },
        { provide: AlertController, useValue: {} },
        { provide: ModalController, useValue: {} },
        { provide: AuthService, useValue: { getAllUsers: () => of([]), getCurrentUserData: () => Promise.resolve(null) } },
        { provide: ConsejoService, useValue: { getConsejos: () => of([]) } },
        { provide: ManualService, useValue: { getPasos: () => of([]) } },
        { provide: KitPrimerosAuxiliosService, useValue: { getKits: () => of([]) } },
        { provide: KitSupervivenciaService, useValue: { getKits: () => of([]) } },
        { provide: SosService, useValue: {} },
        { provide: EventoService, useValue: {} },
        { provide: SessionService, useValue: { detenerTimer: () => undefined } },
        { provide: TerminosService, useValue: { obtenerVigentes: () => Promise.resolve({ version: '1.0', fechaPublicacion: null }) } },
        { provide: TerminosControlService, useValue: {} },
        { provide: TimeService, useValue: {} },
        { provide: WeatherGlobalService, useValue: { temperature: of(null), description: of(''), locationName: of(''), icon: of(''), humidity: of(null), windSpeed: of(null) } }
      ]
    }).overrideTemplate(DashboardPage, '').compileComponents();

    component = TestBed.createComponent(DashboardPage).componentInstance;
    llenar();
  });

  afterEach(async () => {
    TestBed.resetTestingModule();
    await terminate(db);
  });

  describe('campos del formulario', () => {
    it('debería ser válido con todos los datos obligatorios', () => {
      expect(component.lugarForm.valid).toBeTrue();
    });

    const invalidos: [string, any][] = [
      ['nombre', 'ab'],
      ['informacion', 'corta'],
      ['altitud', '10'],
      ['dificultad', ''],
      ['distanciaKm', 0],
      ['tiempoEstimadoHoras', '1'],
      ['equipamiento', []],
      ['DireccionPuntoInicio', 'ab']
    ];

    invalidos.forEach(([campo, valor]) => {
      it(`debería no guardar con ${campo} inválido`, async () => {
        component.lugarForm.get(campo)!.setValue(valor);
        expect(component.lugarForm.get(campo)!.valid).toBeFalse();

        await component.onGuardarLugar();

        expect(lugarService.agregarLugar).not.toHaveBeenCalled();
        expect(component.lugarForm.get(campo)!.touched).toBeTrue();
      });
    });

    it('debería exigir el valor de la entrada solo si el lugar cobra entrada', async () => {
      await component.ngOnInit();
      const valor = component.lugarForm.get('valorEntrada')!;

      component.lugarForm.get('requierePagoEntrada')!.setValue(true);
      expect(valor.valid).toBeFalse();

      valor.setValue(-1);
      expect(valor.valid).toBeFalse();

      valor.setValue(5000);
      expect(valor.valid).toBeTrue();

      component.lugarForm.get('requierePagoEntrada')!.setValue(false);
      expect(valor.value).toBeNull();
      expect(valor.valid).toBeTrue();
    });
  });

  describe('coordenadas', () => {
    const fueraDeRango: [string, string][] = [['91', '-70'], ['-33', '181'], ['abc', '-70']];

    fueraDeRango.forEach(([latitud, longitud]) => {
      it(`debería rechazar latitud ${latitud} y longitud ${longitud}`, async () => {
        llenar({ latitud, longitud });

        await component.onGuardarLugar();

        expect(lugarService.agregarLugar).not.toHaveBeenCalled();
        expect(ultimoToast().message).toContain('coordenadas ingresadas no son válidas');
      });
    });

    it('debería guardar coordenadas válidas como números', async () => {
      llenar({ latitud: '-32.95', longitud: '-71.08' });

      await component.onGuardarLugar();

      const datos = lugarService.agregarLugar.calls.mostRecent().args[0];
      expect(datos.latitud).toBe(-32.95);
      expect(datos.longitud).toBe(-71.08);
    });

    it('debería recortar a 6 decimales y quitar caracteres no numéricos al escribir', () => {
      component.formatearCoordenada({ detail: { value: '-33.12345678' } }, 'latitud');
      expect(component.lugarForm.get('latitud')!.value).toBe('-33.123456');

      component.formatearCoordenada({ detail: { value: '7a0.5b' } }, 'longitud');
      expect(component.lugarForm.get('longitud')!.value).toBe('70.5');

      component.formatearCoordenada({ detail: { value: '1.2.3' } }, 'longitud');
      expect(component.lugarForm.get('longitud')!.value).toBe('1.23');
    });

    it('debería cambiar el signo con el botón sin alterar un campo vacío', () => {
      component.lugarForm.get('latitud')!.setValue('33.4');

      component.toggleSignoCoordenada('latitud');
      expect(component.lugarForm.get('latitud')!.value).toBe('-33.4');

      component.toggleSignoCoordenada('latitud');
      expect(component.lugarForm.get('latitud')!.value).toBe('33.4');

      component.lugarForm.get('latitud')!.setValue('');
      component.toggleSignoCoordenada('latitud');
      expect(component.lugarForm.get('latitud')!.value).toBe('');
    });
  });

  describe('URL del mapa de ruta', () => {
    ['http://wikiloc.com/ruta', 'https://sitio-malo.com/ruta', 'javascript:alert(1)'].forEach(url => {
      it(`debería rechazar ${url}`, async () => {
        llenar({ mapaRutaUrl: url });

        await component.onGuardarLugar();

        expect(lugarService.agregarLugar).not.toHaveBeenCalled();
        expect(ultimoToast().message).toContain('Wikiloc');
      });
    });

    it('debería aceptar un enlace https de Wikiloc', async () => {
      llenar({ mapaRutaUrl: ' https://es.wikiloc.com/rutas/123 ' });

      await component.onGuardarLugar();

      expect(lugarService.agregarLugar.calls.mostRecent().args[0].mapaRutaUrl).toBe('https://es.wikiloc.com/rutas/123');
    });
  });

  describe('al guardar', () => {
    it('debería limpiar el texto, convertir la distancia y omitir datos que no aplican', async () => {
      llenar({ nombre: '  Cerro  ', distanciaKm: '14.5', valorEntrada: 999, horarioVisita: { apertura: '08:00', cierre: '18:00' } });

      await component.onGuardarLugar();

      const datos = lugarService.agregarLugar.calls.mostRecent().args[0];
      expect(datos.nombre).toBe('Cerro');
      expect(datos.distanciaKm).toBe(14.5);
      expect('valorEntrada' in datos).toBeFalse();
      expect('horarioVisita' in datos).toBeFalse();
      expect('MasInformacion' in datos).toBeFalse();
      expect(ultimoToast().message).toBe('Lugar agregado');
      expect(component.mostrarFormLugar).toBeFalse();
    });

    it('debería incluir los datos opcionales cuando aplican', async () => {
      llenar({
        requierePagoEntrada: true,
        valorEntrada: '5000',
        requiereHorarioVisita: true,
        horarioVisita: { apertura: '08:00', cierre: '18:00' }
      });

      await component.onGuardarLugar();

      const datos = lugarService.agregarLugar.calls.mostRecent().args[0];
      expect(datos.valorEntrada).toBe(5000);
      expect(datos.horarioVisita).toEqual({ apertura: '08:00', cierre: '18:00' });
    });

    it('debería actualizar el lugar existente en vez de crear uno nuevo', async () => {
      spyOn(component as any, 'scrollToElement');
      component.onEditarLugar({ id: 'l1', nombre: 'Viejo', equipamiento: ['Agua (2L a 3L)'] } as any);
      llenar({ nombre: 'Nombre corregido' });

      await component.onGuardarLugar();

      expect(lugarService.agregarLugar).not.toHaveBeenCalled();
      expect(lugarService.editarLugar.calls.mostRecent().args[0]).toBe('l1');
      expect(lugarService.editarLugar.calls.mostRecent().args[1].nombre).toBe('Nombre corregido');
      expect(ultimoToast().message).toBe('Lugar actualizado');
    });

    it('debería avisar y conservar el formulario si falla el guardado', async () => {
      lugarService.agregarLugar.and.rejectWith(new Error('permission-denied'));
      component.mostrarFormLugar = true;

      await component.onGuardarLugar();

      expect(ultimoToast().message).toBe('Error al guardar');
      expect(component.mostrarFormLugar).toBeTrue();
    });
  });
});
