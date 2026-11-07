import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { EMPTY, of } from 'rxjs';

import { TabsPage } from './tabs.page';
import { AuthService } from 'src/app/core/services/auth.service';
import { EventoService } from 'src/app/core/services/evento.service';
import { SosService } from 'src/app/core/services/sos.service';

describe('TabsPage', () => {
  let component: TabsPage;
  let fixture: ComponentFixture<TabsPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TabsPage],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      providers: [
        { provide: Auth, useValue: { currentUser: null } },
        { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigateByUrl'], { url: '/', events: EMPTY }) },
        { provide: AuthService, useValue: jasmine.createSpyObj('AuthService', ['getCurrentUserData'], { currentUser$: of(null) }) },
        { provide: EventoService, useValue: { getMisEventos: () => of([]), foroVisto$: EMPTY } },
        { provide: SosService, useValue: {} }
      ]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TabsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
