import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { EMPTY } from 'rxjs';

import { SettingsPage } from './settings.page';
import { AuthService } from 'src/app/core/services/auth.service';
import { TerminosService } from 'src/app/core/services/terminos.service';
import { TerminosControlService } from 'src/app/core/services/terminos-control.service';

// Sin sesión (currentUser null): ngOnInit termina temprano y no consulta datos.
describe('SettingsPage', () => {
  let component: SettingsPage;
  let fixture: ComponentFixture<SettingsPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SettingsPage],
      imports: [IonicModule.forRoot()],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      providers: [
        { provide: AuthService, useValue: jasmine.createSpyObj('AuthService', { getCurrentUserData: Promise.resolve(null) }) },
        { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigateByUrl', 'navigate'], { url: '/', events: EMPTY }) },
        { provide: TerminosService, useValue: jasmine.createSpyObj('TerminosService', {
          obtenerVigentes: Promise.resolve({ version: '1.0', fechaPublicacion: null }),
          estaExento: false,
          aceptoVersionVigente: false
        }) },
        { provide: TerminosControlService, useValue: {} }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SettingsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
