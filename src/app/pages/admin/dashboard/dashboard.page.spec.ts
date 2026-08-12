// 🔹 Importaciones necesarias para pruebas unitarias en Angular
import { ComponentFixture, TestBed } from '@angular/core/testing';

// 🔹 Importación del componente que se va a testear
import { DashboardPage } from './dashboard.page';

// 🧪 Describe el conjunto de pruebas para DashboardPage
describe('DashboardPage', () => {

  // 🔹 Instancia del componente
  let component: DashboardPage;

  // 🔹 Fixture: entorno de prueba que permite interactuar con el componente y su template
  let fixture: ComponentFixture<DashboardPage>;

  // =========================
  // ⚙️ CONFIGURACIÓN INICIAL
  // =========================
  beforeEach(() => {

    // Crea una instancia del componente dentro del entorno de pruebas
    fixture = TestBed.createComponent(DashboardPage);

    // Obtiene la instancia del componente
    component = fixture.componentInstance;

    // Detecta cambios iniciales (ejecuta ngOnInit y renderiza el HTML)
    fixture.detectChanges();
  });

  // =========================
  // ✅ PRUEBA BÁSICA
  // =========================
  it('should create', () => {

    // Verifica que el componente se haya creado correctamente
    expect(component).toBeTruthy();
  });
});