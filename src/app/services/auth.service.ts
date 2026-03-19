import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http'; 
import { tap } from 'rxjs/operators';
import { Firebase } from './firebase'; 

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  apiUrl = 'http://localhost:8000/api';

  constructor(private http: HttpClient, private firebaseSvc: Firebase) { }

  // --- REGISTRO MANUAL ---
  register(datos: any) {
    // Al ser FormData, el navegador pone el Content-Type solo
    return this.http.post(`${this.apiUrl}/register`, datos);
  }

  // --- LOGIN NORMAL ---
  login(credenciales: any) {
    return this.http.post(`${this.apiUrl}/login`, credenciales).pipe(
      tap((res: any) => {
        if (res.access_token) {
          sessionStorage.setItem('token_seguridad', res.access_token);
          sessionStorage.setItem('usuario', JSON.stringify(res.user));
        }
      })
    );
  }

  // --- LOGIN CON GOOGLE ---
  loginGoogleBackend(datosGoogle: any) {
    return this.http.post(`${this.apiUrl}/login-google`, datosGoogle).pipe(
      tap((res: any) => {
        if (res.access_token) {
          sessionStorage.setItem('token_seguridad', res.access_token);
          sessionStorage.setItem('usuario', JSON.stringify(res.user));
        }
      })
    );
  }

  // --- SINCRONIZACIÓN: Pregunta a Laravel el estatus real ---
  verificarEstatus() {
    const token = sessionStorage.getItem('token_seguridad');
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });
    return this.http.get(`${this.apiUrl}/user`, { headers });
  }

  // --- VERIFICAR CUENTA (ENVÍO DE INE PARA GOOGLE USERS) ---
  verificarCuenta(formData: FormData) {
    const token = sessionStorage.getItem('token_seguridad');
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });
    return this.http.post(`${this.apiUrl}/verificar-cuenta`, formData, { headers });
  }

  // --- CAMBIAR CONTRASEÑA ---
  updatePassword(data: any) {
    const token = sessionStorage.getItem('token_seguridad');
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });
    
    // AQUÍ ESTÁ LA CORRECCIÓN: Apuntamos a la ruta correcta de Laravel
    return this.http.post(`${this.apiUrl}/user/profile/password`, data, { headers });
  }

  // --- LOGOUT SEGURO (Mata rastro en Laravel y Google) ---
  logout() {
    const token = sessionStorage.getItem('token_seguridad');
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });

    // 1. Avisamos a Laravel
    // Usamos pipe(tap) para limpiar el storage local antes de que el componente lo reciba
    return this.http.post(`${this.apiUrl}/logout`, {}, { headers }).pipe(
      tap(async () => {
        await this.firebaseSvc.signOut();
        sessionStorage.clear();
        localStorage.clear();
      })
    );
  }
}