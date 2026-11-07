import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { Auth } from '@angular/fire/auth';
import { Firestore } from '@angular/fire/firestore';
import { EMPTY, of } from 'rxjs';

import { ProfilePage } from './profile.page';
import { AuthService } from 'src/app/core/services/auth.service';
import { FotoService } from 'src/app/core/services/foto.service';

// Sin sesión (currentUser null): ngOnInit termina temprano y no consulta datos.
describe('ProfilePage', () => {
  let component: ProfilePage;
  let fixture: ComponentFixture<ProfilePage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ProfilePage],
      imports: [IonicModule.forRoot()],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      providers: [
        { provide: AuthService, useValue: jasmine.createSpyObj('AuthService', ['getCurrentUserData'], { currentUser$: of(null) }) },
        { provide: FotoService, useValue: {} },
        { provide: Auth, useValue: { currentUser: null } },
        { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigateByUrl', 'navigate'], { url: '/', events: EMPTY }) },
        { provide: Firestore, useValue: {} }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ProfilePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
