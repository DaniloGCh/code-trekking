import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { EMPTY, of } from 'rxjs';

import { AppComponent } from './app.component';
import { AuthService } from './core/services/auth.service';
import { TerminosControlService } from './core/services/terminos-control.service';
import { TimeService } from './core/services/time.service';
import { WeatherGlobalService } from './core/services/weather-global.service';

describe('AppComponent', () => {

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AppComponent],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      providers: [
        { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigateByUrl'], { url: '/', events: EMPTY }) },
        { provide: AuthService, useValue: jasmine.createSpyObj('AuthService', ['getCurrentUserData'], { currentUser$: of(null) }) },
        { provide: TerminosControlService, useValue: jasmine.createSpyObj('TerminosControlService', ['verificarAlNavegar', 'reiniciarSesion']) },
        { provide: TimeService, useValue: jasmine.createSpyObj('TimeService', ['startClock', 'stopClock']) },
        { provide: WeatherGlobalService, useValue: jasmine.createSpyObj('WeatherGlobalService', ['startLocationTracking', 'stopLocationTracking']) }
      ]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

});
