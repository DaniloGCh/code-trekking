import { Component, OnInit, inject } from '@angular/core';
import { EventoService } from '../core/services/evento.service';
import { AuthService, UserData } from '../core/services/auth.service';
import { Observable } from 'rxjs';
import { Evento } from '../core/models/evento.model';

import { Router } from '@angular/router';
import { AlertController, ToastController, LoadingController } from '@ionic/angular';
import { SosService } from 'src/app/core/services/sos.service';
import { Auth } from '@angular/fire/auth';

@Component({
  selector: 'app-tabs',
  templateUrl: './tabs.page.html',
  styleUrls: ['./tabs.page.scss'],
  standalone: false,
})
export class TabsPage implements OnInit {

  private eventoService = inject(EventoService);
  private authService = inject(AuthService);
  private sosService = inject(SosService);
  private auth = inject(Auth);
  private router = inject(Router);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);
  private loadingCtrl = inject(LoadingController);

  misEventos$: Observable<Evento[]> = this.eventoService.getMisEventos();
  currentUid: string | null = null;
  hayMensajesNuevos = false;
  sosActivo = false;
  misEventos: Evento[] = [];

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.currentUid = user?.uid || null;
      this.recalcularIndicador();
    });

    this.eventoService.foroVisto$.subscribe(() => {
      this.recalcularIndicador();
    });

    // ✅ Cargar eventos para el SOS
    this.eventoService.getMisEventos().subscribe(eventos => {
      this.misEventos = eventos;
    });
  }

  async recalcularIndicador() {
    if (!this.currentUid) return;

    this.misEventos$.subscribe(async (eventos) => {
      this.hayMensajesNuevos = false;

      for (const ev of eventos) {
        if (!ev.id) continue;

        const cantidad = await this.eventoService.contarMensajesNuevos(
          ev.id,
          this.currentUid!
        );

        if (cantidad > 0) {
          this.hayMensajesNuevos = true;
          break;
        }
      }
    });
  }

  // =========================
  // 🆘 SOS
  // =========================
  async onSOS() {
    const userData = await this.authService.getCurrentUserData();

    if (!userData?.contactosEmergencia?.length) {
      const alert = await this.alertCtrl.create({
        header: '⚠️ Sin contactos',
        message: 'No tienes contactos de emergencia. Ve a Configuración para agregarlos.',
        buttons: [
          { text: 'Cancelar', role: 'cancel' },
          {
            text: 'Ir a configuración',
            handler: () => this.router.navigateByUrl('/tabs/settings')
          }
        ]
      });
      await alert.present();
      return;
    }

    const confirm = await this.alertCtrl.create({
      header: '🆘 ENVIAR ALERTA SOS',
      message: `Se enviará tu ubicación GPS a ${userData.contactosEmergencia.length} contacto(s) de emergencia. ¿Confirmas?`,
      cssClass: 'sos-alert',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: '🆘 ENVIAR AHORA',
          cssClass: 'sos-confirm-btn',
          handler: () => this.ejecutarSOS(userData)
        }
      ]
    });

    await confirm.present();
  }

  private async ejecutarSOS(userData: UserData) {
    this.sosActivo = true;

    const loading = await this.loadingCtrl.create({
      message: '📡 Obteniendo ubicación GPS...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      const ubicacion = await this.sosService.obtenerUbicacion();
      await loading.dismiss();

      const eventoActivo = this.misEventos.length > 0 ? this.misEventos[0] : null;

      const mensaje = this.sosService.construirMensajeSOS(
        userData,
        ubicacion,
        eventoActivo?.nombre
      );

      await this.mostrarOpcionesEnvio(mensaje, userData);

    } catch (error: any) {
      await loading.dismiss();
      this.sosActivo = false;

      const msg = error.message === 'permiso-denegado'
        ? 'Necesitas activar el GPS para enviar tu ubicación'
        : 'No se pudo obtener tu ubicación. Verifica que el GPS esté activado';

      await this.showToast(msg, 'danger');
    }
  }

  private async mostrarOpcionesEnvio(mensaje: string, userData: UserData) {
    const contactos = userData?.contactosEmergencia || [];

    const alert = await this.alertCtrl.create({
      header: '📤 Enviar alerta SOS',
      message: `Se abrirá tu app de mensajes prellenada. Solo presiona Enviar para alertar a ${contactos.length} contacto(s).`,
      buttons: [
        {
          text: '💬 SMS (recomendado)',
          handler: () => this.enviarATodos(mensaje, 'sms', userData)
        },
        {
          text: '📱 WhatsApp',
          handler: () => this.enviarATodos(mensaje, 'whatsapp', userData)
        },
        // {
        //   text: '📲 Ambos',
        //   handler: () => this.enviarATodos(mensaje, 'ambos', userData)
        // },
        {
          text: 'Cancelar',
          role: 'cancel',
          handler: () => { this.sosActivo = false; }
        }
      ]
    });

    await alert.present();
  }

  private async enviarATodos(mensaje: string, medio: 'sms' | 'whatsapp' | 'ambos', userData: UserData) {
    const contactos = userData?.contactosEmergencia || [];
    let enviados = 0;

    if (medio === 'sms' || medio === 'ambos') {
      const telefonos = contactos.map((c: any) => c.telefono).join(',');
      this.sosService.enviarSosPorSMS(telefonos, mensaje);
      enviados = contactos.length;
      await new Promise(r => setTimeout(r, 2000));
    }

    if (medio === 'whatsapp' || medio === 'ambos') {
      for (const contacto of contactos) {
        const confirm = await this.alertCtrl.create({
          header: `📱 WhatsApp`,
          message: `Enviando a ${contacto.nombre}`,
          buttons: [
            {
              text: 'Enviar',
              handler: () => {
                this.sosService.enviarSosPorWhatsApp(contacto.telefono, mensaje);
                enviados++;
              }
            },
            { text: 'Saltar', role: 'cancel' }
          ]
        });
        await confirm.present();
        await confirm.onDidDismiss();
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    this.sosActivo = false;

    if (enviados === 0) {
      await this.showToast('No se envió ninguna alerta', 'warning');
    } else {
      await this.showToast(`✅ Alerta enviada a ${enviados} contacto(s)`, 'success');
    }
  }

  // 🍞 Toast helper
  private async showToast(message: string, color: string = 'success') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      color,
      position: 'bottom'
    });
    await toast.present();
  }
}