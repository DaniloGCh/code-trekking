import { Component, inject, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { AuthService } from 'src/app/core/services/auth.service';

@Component({
  selector: 'app-terminos-modal',
  templateUrl: './terminos-modal.component.html',
  styleUrls: ['./terminos-modal.component.scss'],
  standalone: false,
})
export class TerminosModalComponent implements OnInit {

  // =========================
  // 🔹 DEPENDENCIAS
  // =========================

  private modalCtrl = inject(ModalController);
  private authService = inject(AuthService);


  // =========================
  // 📄 TÉRMINOS
  // =========================

  terminosAceptados = false;

  readonly versionTerminos = '1.0';


  // =========================
  // 📅 FECHA ACTUAL
  // =========================

  hoy = new Date().toLocaleDateString('es-CL', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });


  // =========================
  // 🚀 INICIALIZACIÓN
  // =========================

  async ngOnInit() {

    try {

      const userData = await this.authService.getCurrentUserData();

      if (userData) {

        this.terminosAceptados =
          userData.terminosAceptados === true;

      }

    } catch (error) {

      console.error(
        'Error al cargar el estado de los términos:',
        error
      );

    }

  }


  // =========================
  // ❌ CERRAR
  // =========================

  cerrar() {

    this.modalCtrl.dismiss({
      aceptado: this.terminosAceptados
    });

  }


  // =========================
  // ✅ ACEPTAR TÉRMINOS
  // =========================

  async aceptar() {

    try {

      const fechaAceptacion = new Date().toISOString();

      // 💾 Guardar aceptación en Firebase
      await this.authService.updateProfile({

        terminosAceptados: true,

        fechaAceptacionTerminos: fechaAceptacion,

        versionTerminos: this.versionTerminos

      });

      // 🔄 Actualizar inmediatamente el estado local
      this.terminosAceptados = true;


      // 📤 Informar a la pantalla que abrió el modal
      this.modalCtrl.dismiss({

        aceptado: true,

        fechaAceptacionTerminos: fechaAceptacion,

        versionTerminos: this.versionTerminos

      });

    } catch (error) {

      console.error(
        'Error al guardar la aceptación de términos:',
        error
      );

    }

  }

}