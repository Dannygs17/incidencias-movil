import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { tap, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { Firebase } from './firebase';
import { Router } from '@angular/router';
import { AlertController } from '@ionic/angular';
// 1. IMPORTA EL ARCHIVO DE ENTORNOS
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private router = inject(Router);
  private http = inject(HttpClient);
  private firebaseSvc = inject(Firebase);
  private alertController = inject(AlertController);

  // 2. CAMBIA ESTA LÍNEA PARA QUE LEA DEL ARCHIVO ENVIRONMENT
  apiUrl = environment.apiUrl;

  constructor() { }

  // --- REGISTRO MANUAL ---
  register(datos: any) {
    return this.http.post(`${this.apiUrl}/register`, datos).pipe(
      tap((res: any) => this.guardarSesion(res)),
      catchError(err => this.manejarErrorAuth(err))
    );
  }

  // --- LOGIN NORMAL ---
  login(credenciales: any) {
    return this.http.post(`${this.apiUrl}/login`, credenciales).pipe(
      tap((res: any) => this.guardarSesion(res)),
      catchError(err => this.manejarErrorAuth(err))
    );
  }

  // --- LOGIN CON GOOGLE ---
  loginGoogleBackend(datosGoogle: any) {
    return this.http.post(`${this.apiUrl}/login-google`, datosGoogle).pipe(
      tap((res: any) => this.guardarSesion(res)),
      catchError(err => this.manejarErrorAuth(err))
    );
  }

  // ==========================================
  // --- RECUPERAR CONTRASEÑA (NUEVOS MÉTODOS) ---
  // ==========================================
  
  // --- PASO 1 (Pedir PIN) ---
  requestPasswordReset(email: string) {
    return this.http.post(`${this.apiUrl}/forgot-password`, { email });
  }

  // --- PASO 2 (Enviar PIN y nueva contraseña) ---
  resetPasswordWithPin(data: any) {
    return this.http.post(`${this.apiUrl}/reset-password-pin`, data);
  }

  // ==========================================

  // --- SINCRONIZACIÓN: Pregunta a Laravel el estatus real (PUNTO 2: LOCALSTORAGE) ---
  verificarEstatus() {
    const token = localStorage.getItem('token_seguridad');
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });
    return this.http.get(`${this.apiUrl}/user`, { headers }).pipe(
      catchError(err => this.manejarErrorAuth(err))
    );
  }

  // --- VERIFICAR CUENTA (ENVÍO DE INE) (PUNTO 2: LOCALSTORAGE) ---
  verificarCuenta(formData: FormData) {
    const token = localStorage.getItem('token_seguridad');
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });
    return this.http.post(`${this.apiUrl}/verificar-cuenta`, formData, { headers });
  }

  // --- CAMBIAR CONTRASEÑA (PUNTO 2: LOCALSTORAGE) ---
  updatePassword(data: any) {
    const token = localStorage.getItem('token_seguridad');
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });
    return this.http.post(`${this.apiUrl}/user/profile/password`, data, { headers });
  }

  // --- NUEVO: GUARDAR TOKEN DE NOTIFICACIONES EN LARAVEL (PUNTO 2: LOCALSTORAGE) ---
  saveFcmToken(fcmToken: string) {
    const token = localStorage.getItem('token_seguridad');
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });
    // Enviamos el objeto con el nombre exacto que espera Laravel ('fcm_token')
    return this.http.post(`${this.apiUrl}/user/fcm-token`, { fcm_token: fcmToken }, { headers });
  }

  // --- LOGOUT SEGURO (PUNTO 2: LOCALSTORAGE) ---
  logout() {
    const token = localStorage.getItem('token_seguridad');
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });

    return this.http.post(`${this.apiUrl}/logout`, {}, { headers }).pipe(
      tap(async () => {
        await this.limpiarTodo();
      }),
      catchError(() => {
        this.limpiarTodo();
        return throwError(() => 'Sesión cerrada localmente');
      })
    );
  }

  // ==========================================
  // FUNCIONES DE APOYO (Lógica interna)
  // ==========================================

  private guardarSesion(res: any) {
    if (res.access_token) {
      // 1. Guardamos la sesión normal en LOCALSTORAGE
      localStorage.setItem('token_seguridad', res.access_token);
      localStorage.setItem('usuario', JSON.stringify(res.user));

      // 2. ¡EL TOQUE FINAL! Rescatamos el token de Firebase que estaba esperando
      const fcmToken = localStorage.getItem('fcm_token_temp');
      
      if (fcmToken) {
        console.log('🔄 Sesión iniciada. Enviando Token a Laravel...');
        this.saveFcmToken(fcmToken).subscribe({
          next: () => console.log('✅ ¡CORRECTO! Token inyectado en la Base de Datos'),
          error: (err) => console.error('❌ Error inyectando token en Laravel: ', err)
        });
      }
    }
  }

  private async limpiarTodo() {
    await this.firebaseSvc.signOut();
    localStorage.clear(); // LIMPIA TODO EL LOCALSTORAGE
    this.router.navigate(['/login']);
  }

  // --- MANEJO DE ERRORES CORREGIDO ---
  private manejarErrorAuth(err: any) {
    // Si el error es 403 (Acceso denegado)
    if (err.status === 403 && err.error) {
      const motivo = err.error.motivo || 'Tus documentos fueron marcados como inválidos o falsos.';
      this.mostrarAlertaRechazo(motivo);
      return throwError(() => err);
    }

    // Si es un 401 normal (Token vencido o sesión cerrada)
    if (err.status === 401) {
      this.limpiarTodo();
    }
    
    return throwError(() => err);
  }

  // --- ALERTA VISUAL ---
  private async mostrarAlertaRechazo(motivo: string) {
    const alert = await this.alertController.create({
      header: 'Acceso Denegado',
      subHeader: 'Cuenta Rechazada',
      message: `Motivo: ${motivo}\n\nSi consideras que es un error, por favor acude a las oficinas del Ayuntamiento.`,
      buttons: [{
        text: 'Entendido',
        handler: () => {
          this.limpiarTodo();
        }
      }],
      backdropDismiss: false 
    });
    await alert.present();
  }
}