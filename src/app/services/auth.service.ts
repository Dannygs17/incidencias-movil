import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http'; 
import { tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  // Api local
 apiUrl = 'http://localhost:8000/api';

  //  apiUrl = 'http://192.168.1.66:8000/api';

  
  constructor(private http: HttpClient) { }

  // --- REGISTRO ---
  register(datos: any) {
    return this.http.post(`${this.apiUrl}/register`, datos);
  }

  // --- LOGIN ---
  login(credenciales: any) {
    return this.http.post(`${this.apiUrl}/login`, credenciales).pipe(
      tap((res: any) => {
        if (res.access_token) {
          // Guardamos la llave y los datos del usuario
          sessionStorage.setItem('token_seguridad', res.access_token);
          sessionStorage.setItem('usuario', JSON.stringify(res.user));
        }
      })
    );
  }

  verificarEstatus() {
    return this.http.get(`${this.apiUrl}/user`);
  }

  
  estaLogueado(): boolean {
    return sessionStorage.getItem('token_seguridad') !== null;
  }

  logout() {

    return this.http.post(`${this.apiUrl}/logout`, {}).pipe(
      tap(() => {
        sessionStorage.clear();
      })
    );
  }
  

  // --- ACTUALIZAR CONTRASEÑA ---
  updatePassword(data: any) {
    // 1. Recuperamos el token que guardaste en el login
    const token = sessionStorage.getItem('token_seguridad');

    // 2. Configuramos las cabeceras para que Laravel nos deje pasar
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    };

    // 3. Enviamos la petición POST a la ruta que creamos en api.php
    return this.http.post(`${this.apiUrl}/user/profile/password`, data, { headers });
  }




}