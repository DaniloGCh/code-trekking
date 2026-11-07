import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, flush } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { of, EMPTY } from 'rxjs';

import { PagosPage } from './pagos.page';
import { AuthService } from 'src/app/core/services/auth.service';
import { TerminosControlService } from 'src/app/core/services/terminos-control.service';
import { TipoCambioService } from 'src/app/core/services/tipo-cambio.service';

describe('PagosPage', () => {
  let component: PagosPage;
  let fixture: ComponentFixture<PagosPage>;
  let cargarSdk: jasmine.Spy;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PagosPage],
      imports: [IonicModule.forRoot()],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      providers: [
        { provide: ActivatedRoute, useValue: { queryParamMap: of(convertToParamMap({})) } },
        { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigateByUrl', 'navigate'], { url: '/', events: EMPTY }) },
        { provide: AuthService, useValue: jasmine.createSpyObj('AuthService', ['getCurrentUserData']) },
        { provide: TerminosControlService, useValue: jasmine.createSpyObj('TerminosControlService', { obtenerEstado: Promise.resolve(null) }) },
        { provide: TipoCambioService, useValue: { TASA_RESPALDO: 950, obtenerTasaClpPorUsd: () => Promise.resolve(950) } }
      ]
    }).compileComponents();
  });

  it('should create', fakeAsync(() => {
    fixture = TestBed.createComponent(PagosPage);
    component = fixture.componentInstance;

    // Sin esto se agregaría el script de paypal.com a la página de pruebas
    cargarSdk = spyOn(component as any, 'cargarSdkPaypal').and.returnValue(new Promise(() => { /* nunca termina */ }));

    fixture.detectChanges();
    flush();

    expect(component).toBeTruthy();
    expect(cargarSdk).toHaveBeenCalled();
  }));
});
