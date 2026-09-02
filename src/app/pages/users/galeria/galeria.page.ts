import { Component, OnInit, OnDestroy, inject, NgZone, EnvironmentInjector, runInInjectionContext, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, UserData, SuscripcionData } from 'src/app/core/services/auth.service';
import { GaleriaFotosService, FotoGaleria } from 'src/app/core/services/galeria-fotos.service';
import { FotoService } from 'src/app/core/services/foto.service';
import { AlertController, LoadingController, ActionSheetController, ToastController } from '@ionic/angular';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-galeria',
  templateUrl: './galeria.page.html',
  styleUrls: ['./galeria.page.scss'],
  standalone: false,
})
export class GaleriaPage implements OnInit, OnDestroy {

  private router = inject(Router);
  private alertCtrl = inject(AlertController);
  private loadingCtrl = inject(LoadingController);
  private actionSheetCtrl = inject(ActionSheetController);
  private toastCtrl = inject(ToastController);
  private authService = inject(AuthService);
  private galeriaFotosService = inject(GaleriaFotosService);
  private fotoService = inject(FotoService);
  private ngZone = inject(NgZone);
  private injector = inject(EnvironmentInjector);
  private cdr = inject(ChangeDetectorRef);

  userData: UserData | null = null;
  suscripcionActiva = false;
  diasGracia: number | null = null;

  planActivoNombre: string = '';
  fechaFinSuscripcion: Date | null = null;

  verPlanesManualmente = false;

  fotos: FotoGaleria[] = [];
  private fotosSub?: Subscription;

  mostrarVisor = false;
  fotoInicialIndex = 0;
  currentVisorIndex = 0;

  selectionMode = false;
  fotosSeleccionadas = new Set<string>();

  hideHeader = false;
  lastScrollTop = 0;

  constructor() { }

  ngOnInit() {
    this.authService.currentUser$.subscribe(async user => {
      if (!user) return;
      await this.cargarTodoElEstado();
    });
  }

  // 🔹 Se ejecuta cada vez que presiona el botón de la pestaña Galería
  async ionViewWillEnter() {
    this.verPlanesManualmente = false;
    this.suscripcionActiva = false; // Limpia estado previo
    await this.cargarTodoElEstado();
  }

  ngOnDestroy() {
    this.fotosSub?.unsubscribe();
  }

  private async cargarTodoElEstado() {
    await runInInjectionContext(this.injector, async () => {
      this.userData = await this.authService.getCurrentUserData();
      if (!this.userData) return;

      const sub = await this.authService.verificarYActualizarSuscripcion();

      this.ngZone.run(() => {
        this.aplicarEstadoSuscripcion(sub);

        if (this.suscripcionActiva) {
          this.verPlanesManualmente = false;
          this.escucharFotos(this.userData!.uid);
        }

        this.cdr.markForCheck();
        this.cdr.detectChanges();
      });
    });
  }

  private aplicarEstadoSuscripcion(sub: SuscripcionData | null) {
    this.suscripcionActiva = !!sub?.activa;
    this.diasGracia = this.authService.diasRestantesDeGracia(sub);

    if (sub && sub.activa) {
      const planRaw = sub.plan ? sub.plan.charAt(0).toUpperCase() + sub.plan.slice(1) : '';
      this.planActivoNombre = sub.nombrePlan || sub.planNombre || (planRaw ? `Plan ${planRaw}` : 'Plan Premium');

      const rawFecha = sub.fechaFin || sub.fechaVencimiento;

      if (rawFecha) {
        this.fechaFinSuscripcion = rawFecha.toDate 
          ? rawFecha.toDate() 
          : new Date(rawFecha);
      } else {
        this.fechaFinSuscripcion = null;
      }
    } else {
      this.planActivoNombre = '';
      this.fechaFinSuscripcion = null;
    }

    if (this.diasGracia !== null) {
      this.avisarPagoPendiente(this.diasGracia);
    }
  }

  private async avisarPagoPendiente(dias: number) {
    const alert = await this.alertCtrl.create({
      header: 'Tu suscripción venció',
      message: `Tienes ${dias} día(s) para renovar tu pago antes de perder el acceso a Galería.`,
      buttons: ['Entendido']
    });
    await alert.present();
  }

  private escucharFotos(uid: string) {
    this.fotosSub?.unsubscribe();
    this.fotosSub = this.galeriaFotosService.obtenerFotosUsuario(uid).subscribe((fotos: FotoGaleria[]) => {
      this.ngZone.run(() => {
        this.fotos = fotos;
        this.fotosSeleccionadas.forEach(id => {
          if (!fotos.some(f => f.id === id)) this.fotosSeleccionadas.delete(id);
        });
        this.cdr.detectChanges();
      });
    });
  }

  get mostrarGaleria(): boolean {
    return this.suscripcionActiva && !this.verPlanesManualmente;
  }

  toggleVistaPlanes() {
    this.verPlanesManualmente = !this.verPlanesManualmente;

    if (!this.mostrarGaleria) {
      this.salirModoSeleccion();
    }
    this.cdr.detectChanges();
  }

  onScroll(event: CustomEvent) {
    const scrollTop = event.detail?.scrollTop || 0;
    this.hideHeader = scrollTop > this.lastScrollTop && scrollTop > 50;
    this.lastScrollTop = scrollTop;
  }

  goProfile() {
    this.router.navigateByUrl('/profile');
  }

  seleccionarPlan(planKey: 'mensual' | 'trimestral' | 'anual') {
    this.router.navigate(['/pagos'], { queryParams: { plan: planKey } });
  }

  async onAgregarFoto() {
    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Agregar foto',
      buttons: [
        {
          text: 'Tomar foto',
          icon: 'camera-outline',
          handler: () => this.capturarYSubir(CameraSource.Camera)
        },
        {
          text: 'Elegir de la galería',
          icon: 'image-outline',
          handler: () => this.capturarYSubir(CameraSource.Photos)
        },
        { text: 'Cancelar', role: 'cancel' }
      ]
    });
    await actionSheet.present();
  }

  private async capturarYSubir(source: CameraSource) {
    if (!this.userData) return;

    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source,
        correctOrientation: true,
        presentationStyle: 'fullscreen',
      });

      if (!image.base64String) return;

      const base64Original = `data:image/jpeg;base64,${image.base64String}`;

      const validacion = this.fotoService.validarFoto(base64Original);
      if (!validacion.valid) {
        await this.mostrarToast(validacion.message, 'warning');
        return;
      }

      const loading = await this.loadingCtrl.create({ message: 'Subiendo foto...' });
      await loading.present();

      try {
        let base64Comprimida = await this.fotoService.comprimirFoto(base64Original);

        if (!base64Comprimida.startsWith('data:image/')) {
          base64Comprimida = `data:image/jpeg;base64,${base64Comprimida}`;
        }

        await runInInjectionContext(this.injector, async () => {
          await this.galeriaFotosService.subirFoto({
            uid: this.userData!.uid,
            nombreUsuario: this.userData!.nombre,
            imageUrl: base64Comprimida,
            fechaSubida: new Date().toISOString()
          });
        });

        await loading.dismiss();
        await this.mostrarToast('Foto subida a tu galería', 'success');

      } catch {
        await loading.dismiss();
        await this.mostrarToast('Error al subir la foto', 'danger');
      }

    } catch {
      await this.mostrarToast('No se pudo obtener la foto', 'danger');
    }
  }

  private async mostrarToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({ message, color, duration: 2500 });
    await toast.present();
  }

  abrirFoto(index: number) {
    this.fotoInicialIndex = index;
    this.currentVisorIndex = index;
    this.mostrarVisor = true;
  }

  cerrarVisor() {
    this.mostrarVisor = false;
  }

  onSlideChange(event: any) {
    const swiper = event?.target?.swiper;
    if (swiper) {
      this.currentVisorIndex = swiper.activeIndex;
    }
  }

  onClickFoto(foto: FotoGaleria, index: number) {
    if (this.selectionMode) {
      this.toggleSeleccion(foto);
    } else {
      this.abrirFoto(index);
    }
  }

  entrarModoSeleccion(foto?: FotoGaleria) {
    this.selectionMode = true;
    this.fotosSeleccionadas.clear();
    if (foto) this.toggleSeleccion(foto);
  }

  salirModoSeleccion() {
    this.selectionMode = false;
    this.fotosSeleccionadas.clear();
  }

  toggleSeleccion(foto: FotoGaleria) {
    if (!foto.id) return;
    if (this.fotosSeleccionadas.has(foto.id)) {
      this.fotosSeleccionadas.delete(foto.id);
    } else {
      this.fotosSeleccionadas.add(foto.id);
    }
  }

  estaSeleccionada(foto: FotoGaleria): boolean {
    return !!foto.id && this.fotosSeleccionadas.has(foto.id);
  }

  get todasSeleccionadas(): boolean {
    return this.fotos.length > 0 && this.fotosSeleccionadas.size === this.fotos.length;
  }

  toggleSeleccionarTodas() {
    if (this.todasSeleccionadas) {
      this.fotosSeleccionadas.clear();
    } else {
      this.fotosSeleccionadas = new Set(
        this.fotos.map(f => f.id).filter((id): id is string => !!id)
      );
    }
  }

  async confirmarEliminarSeleccionadas() {
    const cantidad = this.fotosSeleccionadas.size;
    if (cantidad === 0) return;

    const alert = await this.alertCtrl.create({
      header: 'Eliminar fotos',
      message: `¿Seguro que quieres eliminar ${cantidad} foto(s)? Esta acción no se puede deshacer.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: () => this.eliminarSeleccionadas()
        }
      ]
    });
    await alert.present();
  }

  private async eliminarSeleccionadas() {
    const loading = await this.loadingCtrl.create({ message: 'Eliminando fotos...' });
    await loading.present();

    try {
      const ids = Array.from(this.fotosSeleccionadas);

      await runInInjectionContext(this.injector, async () => {
        await Promise.all(ids.map(id => this.galeriaFotosService.eliminarFoto(id)));
      });

      await loading.dismiss();
      await this.mostrarToast(`${ids.length} foto(s) eliminada(s)`, 'success');
      this.salirModoSeleccion();

    } catch {
      await loading.dismiss();
      await this.mostrarToast('Error al eliminar las fotos', 'danger');
    }
  }

  async confirmarEliminarFotoDesdeGrid(foto: FotoGaleria, event: Event) {
    event.stopPropagation();

    const alert = await this.alertCtrl.create({
      header: 'Eliminar foto',
      message: '¿Seguro que quieres eliminar esta foto? Esta acción no se puede deshacer.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: () => this.eliminarFoto(foto)
        }
      ]
    });
    await alert.present();
  }

  async confirmarEliminarFotoDesdeVisor() {
    const foto = this.fotos[this.currentVisorIndex];
    if (!foto) return;

    const alert = await this.alertCtrl.create({
      header: 'Eliminar foto',
      message: '¿Seguro que quieres eliminar esta foto? Esta acción no se puede deshacer.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: async () => {
            await this.eliminarFoto(foto);
            this.cerrarVisor();
          }
        }
      ]
    });
    await alert.present();
  }

  private async eliminarFoto(foto: FotoGaleria) {
    if (!foto.id) return;

    const loading = await this.loadingCtrl.create({ message: 'Eliminando foto...' });
    await loading.present();

    try {
      await runInInjectionContext(this.injector, async () => {
        await this.galeriaFotosService.eliminarFoto(foto.id!);
      });
      await loading.dismiss();
      await this.mostrarToast('Foto eliminada', 'success');
    } catch {
      await loading.dismiss();
      await this.mostrarToast('Error al eliminar la foto', 'danger');
    }
  }

  async onLogout() {
    const alert = await this.alertCtrl.create({
      header: 'Cerrar sesión',
      message: '¿Estás seguro que deseas cerrar sesión?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Cerrar sesión',
          role: 'confirm',
          handler: async () => {
            await runInInjectionContext(this.injector, async () => {
              await this.authService.logout();
            });
            this.ngZone.run(() => {
              this.router.navigateByUrl('/tabs/home', { replaceUrl: true });
            });
          }
        }
      ]
    });
    await alert.present();
  }

}