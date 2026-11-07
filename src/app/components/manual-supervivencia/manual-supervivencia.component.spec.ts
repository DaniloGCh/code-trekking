import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { of } from 'rxjs';

import { ManualSupervivenciaComponent } from './manual-supervivencia.component';
import { ManualService } from 'src/app/core/services/manual.service';

describe('ManualSupervivenciaComponent', () => {
  let component: ManualSupervivenciaComponent;
  let fixture: ComponentFixture<ManualSupervivenciaComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ ManualSupervivenciaComponent ],
      imports: [IonicModule.forRoot()],
      providers: [
        { provide: ManualService, useValue: { getPasos: () => of([]) } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ManualSupervivenciaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
