import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http'; 
import { tap, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { Firebase } from './firebase'; 
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private router = inject(Router);
  private http = inject(HttpClient);
  private firebaseSvc = inject(Firebase);

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

  private manejarErrorAuth(err: any) {
    // Si el error es 403 (Rechazado) o 401 (Token inválido/vencido)
    if (err.status === 403 || err.status === 401) {
      this.limpiarTodo();
    }
    return throwError(() => err);
  }
}