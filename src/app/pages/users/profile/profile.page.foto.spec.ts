import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TestBed, fakeAsync, flush } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { Firestore } from '@angular/fire/firestore';
import { ActionSheetController, AlertController, LoadingController, ModalController, ToastController } from '@ionic/angular';
import { CameraSource } from '@capacitor/camera';
import { CameraWeb } from '@capacitor/camera/dist/esm/web';

import { ProfilePage } from './profile.page';
import { AuthService } from 'src/app/core/services/auth.service';
import { FotoService } from 'src/app/core/services/foto.service';

/** Orden al cambiar la foto de perfil: formato → comprimir → tamaño. Cámara simulada. */
describe('ProfilePage: orden de validación de la foto', () => {
  let component: ProfilePage;
  let foto: jasmine.SpyObj<FotoService>;
  let authService: jasmine.SpyObj<AuthService>;
  let toastCtrl: jasmine.SpyObj<ToastController>;
  let auth: { currentUser: { uid: string } | null };
  let pasos: string[];

  const COMPRIMIDA = 'data:image/jpeg;base64,COMPRIMIDA';

  const ultimoToast = () => toastCtrl.create.calls.mostRecent().args[0] as any;

  /** takePicture es privado: se accede solo para la prueba. */
  const tomarFoto = async () => {
    await (component as any).takePicture(CameraSource.Camera);
  };

  beforeEach(async () => {
    pasos = [];
    auth = { currentUser: { uid: 'u1' } };

    spyOn(CameraWeb.prototype, 'getPhoto').and.resolveTo({ base64String: 'ORIGINAL', format: 'jpeg', saved: false });

    foto = jasmine.createSpyObj<FotoService>('FotoService', ['validarFormato', 'comprimirFoto', 'validarFoto', 'guardarFoto', 'cargarFoto']);
    foto.validarFormato.and.callFake(() => { pasos.push('formato'); return { valid: true, message: '' }; });
    foto.comprimirFoto.and.callFake(async () => { pasos.push('comprimir'); return COMPRIMIDA; });
    foto.validarFoto.and.callFake(() => { pasos.push('tamaño'); return { valid: true, message: '' }; });
    foto.guardarFoto.and.callFake(async (_uid: string, base64: string) => { pasos.push('guardar'); return base64; });

    authService = jasmine.createSpyObj<AuthService>('AuthService', ['updateProfile']);
    authService.updateProfile.and.resolveTo();

    toastCtrl = jasmine.createSpyObj<ToastController>('ToastController', ['create']);
    toastCtrl.create.and.callFake((async () => ({ present: () => Promise.resolve() })) as any);
    const loadingCtrl = jasmine.createSpyObj<LoadingController>('LoadingController', ['create']);
    loadingCtrl.create.and.callFake((async () => ({ present: () => Promise.resolve(), dismiss: () => Promise.resolve(true) })) as any);

    await TestBed.configureTestingModule({
      declarations: [ProfilePage],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      providers: [
        { provide: FotoService, useValue: foto },
        { provide: AuthService, useValue: authService },
        { provide: Auth, useValue: auth },
        { provide: Firestore, useValue: {} },
        { provide: Router, useValue: {} },
        { provide: AlertController, useValue: {} },
        { provide: ActionSheetController, useValue: {} },
        { provide: ModalController, useValue: {} },
        { provide: ToastController, useValue: toastCtrl },
        { provide: LoadingController, useValue: loadingCtrl }
      ]
    }).overrideTemplate(ProfilePage, '').compileComponents();

    component = TestBed.createComponent(ProfilePage).componentInstance;
    component.userData = { uid: 'u1' } as any;
  });

  it('debería validar formato, comprimir, validar tamaño y recién entonces guardar', async () => {
    await tomarFoto();

    expect(pasos).toEqual(['formato', 'comprimir', 'tamaño', 'guardar']);
    expect(foto.validarFormato).toHaveBeenCalledWith('data:image/jpeg;base64,ORIGINAL');
    expect(foto.validarFoto).toHaveBeenCalledWith(COMPRIMIDA);
  });

  it('debería guardar la versión comprimida en el perfil y en la pantalla', async () => {
    await tomarFoto();

    expect(foto.guardarFoto).toHaveBeenCalledWith('u1', COMPRIMIDA);
    expect(authService.updateProfile).toHaveBeenCalledWith({ fotoBase64: COMPRIMIDA });
    expect(component.userData?.fotoBase64).toBe(COMPRIMIDA);
    expect(ultimoToast().message).toBe('Foto actualizada');
  });

  it('debería no comprimir si el formato no es válido', async () => {
    foto.validarFormato.and.returnValue({ valid: false, message: 'Solo se permiten imágenes JPG, PNG o WebP' });

    await tomarFoto();

    expect(foto.comprimirFoto).not.toHaveBeenCalled();
    expect(foto.guardarFoto).not.toHaveBeenCalled();
    expect(ultimoToast().message).toBe('Solo se permiten imágenes JPG, PNG o WebP');
  });

  it('debería no guardar si la foto comprimida sigue superando el tamaño', async () => {
    foto.validarFoto.and.returnValue({ valid: false, message: 'La imagen no puede superar 2MB' });

    await tomarFoto();

    expect(foto.comprimirFoto).toHaveBeenCalled();
    expect(foto.guardarFoto).not.toHaveBeenCalled();
    expect(ultimoToast().message).toBe('La imagen no puede superar 2MB');
  });

  it('debería avisar si falla la compresión, sin guardar', async () => {
    foto.comprimirFoto.and.callFake(async () => { throw new Error('Error al cargar la imagen'); });

    await tomarFoto();

    expect(foto.guardarFoto).not.toHaveBeenCalled();
    expect(ultimoToast().message).toBe('Error al procesar la foto');
  });

  it('debería no guardar si la sesión se cerró mientras se procesaba', async () => {
    auth.currentUser = null;

    await tomarFoto();

    expect(foto.guardarFoto).not.toHaveBeenCalled();
    expect(ultimoToast().message).toBe('Error al procesar la foto');
  });

  it('debería avisar si la cámara falla o se cancela', async () => {
    (CameraWeb.prototype.getPhoto as jasmine.Spy).and.rejectWith(new Error('User cancelled photos app'));

    await tomarFoto();

    expect(foto.validarFormato).not.toHaveBeenCalled();
    expect(ultimoToast().message).toBe('Error al obtener la foto');
  });
});
