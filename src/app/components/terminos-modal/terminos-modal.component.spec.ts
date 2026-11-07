import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { TerminosModalComponent } from './terminos-modal.component';
import { AuthService } from 'src/app/core/services/auth.service';
import { TerminosService } from 'src/app/core/services/terminos.service';

describe('TerminosModalComponent', () => {
  let component: TerminosModalComponent;
  let fixture: ComponentFixture<TerminosModalComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ TerminosModalComponent ],
      imports: [IonicModule.forRoot()],
      providers: [
        { provide: AuthService, useValue: jasmine.createSpyObj('AuthService', { getCurrentUserData: Promise.resolve(null) }) },
        {
          provide: TerminosService,
          useValue: jasmine.createSpyObj('TerminosService', {
            obtenerVigentes: Promise.resolve({ version: '1.0', fechaPublicacion: null }),
            estaExento: false,
            aceptoVersionVigente: false
          })
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TerminosModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
