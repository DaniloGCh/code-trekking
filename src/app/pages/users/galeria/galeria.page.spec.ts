import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { EMPTY, of } from 'rxjs';

import { GaleriaPage } from './galeria.page';
import { AuthService } from 'src/app/core/services/auth.service';
import { GaleriaFotosService } from 'src/app/core/services/galeria-fotos.service';
import { FotoService } from 'src/app/core/services/foto.service';

// Sin sesión (currentUser null): ngOnInit termina temprano y no consulta datos.
describe('GaleriaPage', () => {
  let component: GaleriaPage;
  let fixture: ComponentFixture<GaleriaPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [GaleriaPage],
      imports: [IonicModule.forRoot()],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      providers: [
        { provide: AuthService, useValue: jasmine.createSpyObj('AuthService', ['getCurrentUserData'], { currentUser$: of(null) }) },
        { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigateByUrl', 'navigate'], { url: '/', events: EMPTY }) },
        { provide: GaleriaFotosService, useValue: {} },
        { provide: FotoService, useValue: {} }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(GaleriaPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
