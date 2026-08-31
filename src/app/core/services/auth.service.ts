// =========================
// 🔹 IMPORTACIONES ANGULAR
// =========================
import { Injectable, inject } from '@angular/core'; // Importa los decoradores y funciones esenciales de Angular para Inyección de Dependencias

// =========================
// 🔹 FIREBASE AUTH
// =========================
import {
  Auth, // Interface principal para el manejo del estado de autenticación en Firebase
  createUserWithEmailAndPassword, // Método para registrar usuarios con correo y contraseña
  signInWithEmailAndPassword, // Método para iniciar sesión con credenciales
  signOut, // Método para cerrar la sesión activa del usuario
  user, // Observable de RxJS que emite cambios en el estado del usuario en tiempo real
  updatePassword, // Método para actualizar la contraseña del usuario autenticado
  reauthenticateWithCredential, // Método para reautenticar al usuario antes de acciones sensibles
  EmailAuthProvider, // Proveedor de credenciales basado en email y contraseña
  deleteUser, // Método para eliminar la cuenta de usuario activa en Firebase Auth
  sendPasswordResetEmail // Método para enviar correos de recuperación de contraseña
} from '@angular/fire/auth';

// =========================
// 🔹 FIRESTORE
// =========================
import {
  Firestore, // Instancia principal del servicio de base de datos Firestore
  doc, // Función para crear referencias a documentos específicos
  setDoc, // Función para crear o sobrescribir un documento
  getDoc, // Función para obtener la captura de un único documento
  getDocs, // Función para obtener la captura de una colección completa
  collection, // Función para crear referencias a colecciones
  collectionData, // Función que convierte las capturas de una colección a Observables de RxJS
  updateDoc, // Función para actualizar campos específicos de un documento existente
  deleteDoc // Función para eliminar un documento de Firestore
} from '@angular/fire/firestore';

// =========================
// 🔹 RXJS
// =========================
import { Observable } from 'rxjs'; // Importa la clase Observable para manejo de flujos asíncronos
import { SecurityService } from './security.service'; // Importa el servicio personalizado con utilidades de seguridad
import { environment } from 'src/environments/environment'; // Importa las variables de entorno de la aplicación

export interface ContactoEmergencia {
  nombre: string; // Define el nombre del contacto de emergencia
  telefono: string; // Define el número telefónico del contacto de emergencia
}


// =========================
// 📊 ESTADÍSTICAS USUARIO
// =========================
export interface EstadisticasUsuario {
  eventosCreados: number;
  eventosCreadosMes: number;
  ultimoMes: string;
}

// =========================
// 👤 MODELO USUARIO
// =========================
export interface UserData {
  uid: string;
  email: string;
  nombre: string;
  rol: 'admin' | 'user';

  fotoBase64?: string;
  estado?: string;

  // ⭐ INFORMACIÓN PERSONAL OPCIONAL
  sobreMi?: string;
  ocupacion?: string;
  lugarSonado?: string;
  mascotas?: string;
  actividadesFavoritas?: string;
  trekkingFavorito?: string;
  proximoDesafio?: string;

  preguntaSeguridad?: string;
  respuestaSeguridad?: string;
  contactosEmergencia?: ContactoEmergencia[];
  ultimoCambioNombre?: string;

  // 📊 ESTADÍSTICAS
  estadisticas?: EstadisticasUsuario;

  // 📄 TÉRMINOS Y CONDICIONES
  terminosAceptados?: boolean;
  fechaAceptacionTerminos?: string;
  versionTerminos?: string;
}


@Injectable({
  providedIn: 'root' // Define que el servicio se instanciará como un Singleton accesible en toda la app
})
export class AuthService {

  // =========================
  // 🔹 DEPENDENCIAS
  // =========================
  private auth = inject(Auth); // Inyecta el SDK de Firebase Authentication
  private firestore = inject(Firestore); // Inyecta la instancia de la base de datos Firestore
  private security = inject(SecurityService); // Inyecta el servicio con utilidades de sanitización y reglas
  private loginAttempts = 0; // Contador privado de intentos fallidos de inicio de sesión
  private lastLoginAttempt = 0; // Registro de la marca de tiempo del último intento de inicio de sesión

  // =========================
  // 👤 USUARIO EN TIEMPO REAL
  // =========================
  currentUser$ = user(this.auth); // Flujo ejecutable que emite la sesión activa actual del usuario

  // =========================
  // ✅ REGISTRO
  // =========================
  async register(
    email: string, // Dirección de correo electrónico a registrar
    password: string, // Contraseña para la nueva cuenta
    nombre: string, // Nombre del usuario
    rol: 'admin' | 'user' = 'user', // Rol asignado con 'user' como valor por defecto
    terminosAceptados: boolean = false // Indicador de aceptación de términos con false por defecto
  ): Promise<void> {

    // Validaciones de seguridad
    if (!this.security.isValidEmail(email)) { // Revisa el patrón estándar del correo electrónico
      throw new Error('invalid-email'); // Dispara una excepción si el correo no cumple la expresión regular
    }

    if (!this.security.isSafeText(nombre, 50)) { // Evalúa que el nombre no contenga scripts o caracteres dañinos
      throw new Error('invalid-nombre'); // Lanza error si el texto sobrepasa los 50 caracteres o no es seguro
    }

    const passwordCheck = this.security.isStrongPassword(password); // Analiza los requisitos de complejidad de la clave

    if (!passwordCheck.valid) { // Comprueba si la contraseña no es suficientemente sólida
      throw new Error(passwordCheck.message); // Dispara el error con la razón específica entregada por el validador
    }

    // 📄 Validar aceptación de términos
    if (!terminosAceptados) { // Revisa que la casilla de términos haya sido marcada explícitamente
      throw new Error('terminos-no-aceptados'); // Cancela la operación si no se han aceptado los términos
    }

    // Sanitizar nombre
    const nombreSeguro = this.security.sanitizeInput(nombre); // Remueve caracteres especiales o potenciales ataques XSS

    // 🔥 Crear usuario en Firebase Authentication
    const credential = await createUserWithEmailAndPassword( // Registra las credenciales en Firebase Auth
      this.auth, // Pasa la instancia de autenticación
      email, // Pasa el email validado
      password // Pasa la contraseña validada
    );

    const uid = credential.user.uid; // Extrae el UID único asignado al nuevo usuario

    const userRef = doc( // Construye la referencia del documento en Firestore
      this.firestore, // Instancia de la BD
      `usuarios/${uid}` // Ruta específica basada en el UID generado
    );

    // 💾 Crear documento en Firestore
    await setDoc(userRef, {
      uid,
      email,
      nombre: nombreSeguro,
      rol,
      fotoBase64: '',
      estado: '',
      // 📅 Fecha de creación del documento
      creadoEn: new Date().toISOString(),
      // 📊 Estadísticas iniciales
      estadisticas: {
        eventosCreados: 0,
        eventosCreadosMes: 0,
        ultimoMes: new Date().toISOString().substring(0, 7)
      },
      // 📄 TÉRMINOS Y CONDICIONES
      terminosAceptados: terminosAceptados,
      fechaAceptacionTerminos: new Date().toISOString(),
      versionTerminos: '1.0'
    } as UserData);
  }

  // =========================
  // 🔑 LOGIN
  // =========================
  // ✅ LOGIN con rate limiting
  async login(email: string, password: string): Promise<void> {
    // Rate limiting: max 5 intentos por minuto
    if (!this.security.checkRateLimit('login', 5, 60000)) { // Verifica que no haya superado los 5 intentos en un minuto
      throw new Error('too-many-attempts'); // Lanza excepción para prevenir ataques de fuerza bruta
    }

    // Validar email
    if (!this.security.isValidEmail(email)) { // Valida el formato del correo
      throw new Error('invalid-email'); // Dispara un error si el correo está mal escrito
    }

    await signInWithEmailAndPassword(this.auth, email, password); // Autentica las credenciales con Firebase
    this.security.resetRateLimit('login'); // Reinicia el contador de limitaciones en caso de éxito
  }

  // =========================
  // 🚪 LOGOUT
  // =========================
  async logout(): Promise<void> {
    await signOut(this.auth); // Cierra la sesión del usuario activo en Firebase Auth
  }

  // =========================
  // 👤 DATOS USUARIO
  // =========================
  async getCurrentUserData(): Promise<UserData | null> {
    const currentUser = this.auth.currentUser; // Obtiene el usuario autenticado en la sesión activa
    if (!currentUser) return null; // Retorna null si no hay un usuario autenticado

    const userRef = doc(this.firestore, `usuarios/${currentUser.uid}`); // Apunta al documento Firestore del usuario
    const userSnap = await getDoc(userRef); // Obtiene una captura del documento de la base de datos

    return userSnap.exists() // Evalúa si la información del usuario existe en Firestore
      ? (userSnap.data() as UserData) // Formatea y retorna los datos mapeados
      : null; // Devuelve null si el documento no fue encontrado
  }

  // =========================
  // 🎭 ROL USUARIO
  // =========================
  async getUserRole(): Promise<'admin' | 'user' | null> {
    const currentUser = this.auth.currentUser; // Obtiene el usuario actual
    if (!currentUser) return null; // Retorna null si el usuario no ha iniciado sesión

    const userRef = doc(this.firestore, `usuarios/${currentUser.uid}`); // Crea la referencia al documento del usuario
    const userSnap = await getDoc(userRef); // Recupera la captura del documento

    return userSnap.exists() // Comprueba que el usuario exista
      ? (userSnap.data() as UserData).rol // Retorna la propiedad específica 'rol'
      : null; // Retorna null si no se encuentra
  }

  // =========================
  // 👥 TODOS LOS USUARIOS
  // =========================
  getAllUsers(): Observable<UserData[]> {
    const ref = collection(this.firestore, 'usuarios'); // Referencia a la colección completa de 'usuarios'
    return collectionData(ref) as Observable<UserData[]>; // Convierte la colección en un flujo de datos continuo (Observable)
  }

  // =========================
  // ✏️ ACTUALIZAR ROL
  // =========================
  async updateUserRole(uid: string, nuevoRol: 'admin' | 'user'): Promise<void> {
    const userRef = doc(this.firestore, `usuarios/${uid}`); // Apunta al documento del usuario identificado por su UID
    await updateDoc(userRef, { rol: nuevoRol }); // Modifica únicamente el atributo de rol en Firestore
  }

  // =========================
  // 🧑 PERFIL
  // =========================
  async updateProfile(data: Partial<UserData>): Promise<void> {
    const currentUser = this.auth.currentUser; // Verifica el usuario en sesión
    if (!currentUser) return; // Cancela la operación si no está autenticado

    const userRef = doc(this.firestore, `usuarios/${currentUser.uid}`); // Apunta al documento de perfil del usuario
    await updateDoc(userRef, { ...data }); // Aplica una actualización parcial con los campos provistos
  }

  // =========================
  // 🔒 CAMBIAR CONTRASEÑA
  // =========================
  async changePassword(
    currentPassword: string, // Clave que el usuario usa actualmente
    newPassword: string // Nueva clave a establecer
  ): Promise<void> {
    const currentUser = this.auth.currentUser; // Obtiene la sesión activa
    if (!currentUser?.email) { // Comprueba que el usuario posea un correo asociado
      throw new Error('No hay usuario autenticado'); // Lanza error de falta de sesión
    }

    const credential = EmailAuthProvider.credential( // Crea las credenciales necesarias para reautenticación
      currentUser.email, // Email del usuario
      currentPassword // Contraseña actual ingresada
    );

    await reauthenticateWithCredential(currentUser, credential); // Revalida la identidad del usuario por seguridad
    await updatePassword(currentUser, newPassword); // Actualiza la contraseña en el proveedor de Firebase Auth
  }

  // =========================
  // 🔁 RECUPERAR CONTRASEÑA
  // =========================
  async resetPassword(email: string): Promise<void> {
    await sendPasswordResetEmail(this.auth, email); // Solicita a Firebase enviar un correo de restablecimiento de contraseña
  }

  // =========================
  // 🔍 VERIFICAR SESIÓN
  // =========================
  isLoggedIn(): boolean {
    return !!this.auth.currentUser; // Convierte la presencia del usuario actual a un valor booleano (true/false)
  }

  // =========================
  // 🗑️ ELIMINAR CUENTA
  // =========================
  async deleteAccount(password: string, respuesta: string): Promise<void> {
    const currentUser = this.auth.currentUser; // Consulta el usuario en sesión
    if (!currentUser?.email) { // Verifica si el usuario existe y tiene email
      throw new Error('No hay usuario autenticado'); // Retorna error si no hay sesión
    }

    const userRef = doc(this.firestore, `usuarios/${currentUser.uid}`); // Referencia del documento en Firestore
    const userSnap = await getDoc(userRef); // Carga la información guardada del usuario

    if (!userSnap.exists()) { // Evalúa que la cuenta esté registrada en la base de datos
      throw new Error('Usuario no encontrado'); // Notifica la invalidez del registro
    }

    const userData = userSnap.data() as UserData; // Extrae los datos del documento

    const respuestaGuardada = userData.respuestaSeguridad?.toLowerCase().trim(); // Normaliza la respuesta registrada
    const respuestaIngresada = respuesta.toLowerCase().trim(); // Normaliza la respuesta ingresada por el usuario

    if (respuestaGuardada !== respuestaIngresada) { // Valida la coincidencia exacta de la pregunta de seguridad
      throw new Error('respuesta-incorrecta'); // Lanza error si la respuesta no coincide
    }

    const credential = EmailAuthProvider.credential( // Prepara la credencial para reautenticar al usuario
      currentUser.email, // Correo del usuario
      password // Contraseña actual ingresada para confirmar la eliminación
    );

    await reauthenticateWithCredential(currentUser, credential); // Ejecuta reautenticación previa a acciones destructivas
    await deleteDoc(userRef); // Elimina el registro de la base de datos Firestore
    await deleteUser(currentUser); // Elimina la cuenta del catálogo de autenticación de Firebase
  }

  // ✅ VERIFICAR SI NOMBRE ESTÁ EN USO
  async isNombreDisponible(nombre: string): Promise<boolean> {
    const usuariosRef = collection(this.firestore, 'usuarios'); // Hace referencia a la colección de usuarios
    const snapshot = await getDocs(usuariosRef); // Recupera todos los registros existentes
    const nombres = snapshot.docs.map(d => (d.data() as UserData).nombre?.toLowerCase().trim()); // Mapea todos los nombres a minúsculas sin espacios
    return !nombres.includes(nombre.toLowerCase().trim()); // Retorna true si el nombre no se encuentra registrado
  }

  // ✅ Agrega este método privado
  private log(mensaje: string, data?: any) {
    if (!environment.production) { // Condición para ejecutar únicamente en entornos de desarrollo
      console.log(`[AuthService] ${mensaje}`, data ?? ''); // Muestra el mensaje en la consola del navegador
    }
  }
}