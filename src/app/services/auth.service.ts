import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http'; 
import { tap, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { Firebase } from './firebase'; 
import { Router } from '@angular/router';
import { AlertController } from '@ionic/angular'; // Ya no necesitamos IonicSafeString

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private router = inject(Router);
  private http = inject(HttpClient);
  private firebaseSvc = inject(Firebase);
  private alertController = inject(AlertController);

  apiUrl = 'http://localhost:8000/api';

  constructor() { }

  // --- REGISTRO MANUAL ---
  register(datos: any) {
    return this.http.post(`${this.apiUrl}/register`, datos);
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

  // --- SINCRONIZACIÓN: Pregunta a Laravel el estatus real ---
  verificarEstatus() {
    const token = sessionStorage.getItem('token_seguridad');
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });
    return this.http.get(`${this.apiUrl}/user`, { headers }).pipe(
      catchError(err => this.manejarErrorAuth(err))
    );
  }

  // --- VERIFICAR CUENTA (ENVÍO DE INE) ---
  verificarCuenta(formData: FormData) {
    const token = sessionStorage.getItem('token_seguridad');
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });
    return this.http.post(`${this.apiUrl}/verificar-cuenta`, formData, { headers });
  }

  // --- CAMBIAR CONTRASEÑA ---
  updatePassword(data: any) {
    const token = sessionStorage.getItem('token_seguridad');
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });
    return this.http.post(`${this.apiUrl}/user/profile/password`, data, { headers });
  }

  // --- LOGOUT SEGURO ---
  logout() {
    const token = sessionStorage.getItem('token_seguridad');
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
      sessionStorage.setItem('token_seguridad', res.access_token);
      sessionStorage.setItem('usuario', JSON.stringify(res.user));
    }
  }

  private async limpiarTodo() {
    await this.firebaseSvc.signOut();
    sessionStorage.clear();
    localStorage.clear();
    this.router.navigate(['/login']);
  }

  // --- MANEJO DE ERRORES CORREGIDO (Sin "async" para no confundir a RxJS) ---
  private manejarErrorAuth(err: any) {
    // Si el error es 403 (Acceso denegado)
    if (err.status === 403 && err.error) {
      // Usamos un fallback por si el usuario es viejo y su motivo es null en la base de datos
      const motivo = err.error.motivo || 'Tus documentos fueron marcados como inválidos o falsos.';
      
      // Llamamos a la alerta asíncrona sin detener el hilo actual
      this.mostrarAlertaRechazo(motivo);
      
      // Devolvemos el error real para que login.page.ts atrape el error inmediatamente
      return throwError(() => err);
    }

    // Si es un 401 normal (Token vencido o sesión cerrada)
    if (err.status === 401) {
      this.limpiarTodo();
    }
    
    return throwError(() => err);
  }

  // --- NUEVA FUNCIÓN EXCLUSIVA PARA MOSTRAR LA ALERTA VISUAL ---
  private async mostrarAlertaRechazo(motivo: string) {
    const alert = await this.alertController.create({
      header: 'Acceso Denegado',
      subHeader: 'Cuenta Rechazada',
      // Texto plano con \n\n (100% seguro contra fallos de HTML)
      message: `Motivo: ${motivo}\n\nSi consideras que es un error, por favor acude a las oficinas del Ayuntamiento.`,
      buttons: [{
        text: 'Entendido',
        handler: () => {
          this.limpiarTodo(); // Solo expulsa visualmente al darle click al botón
        }
      }],
      backdropDismiss: false // Obliga al usuario a presionar "Entendido"
    });
    await alert.present();
  }
}