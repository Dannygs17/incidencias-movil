import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class IncidenciaService {
  apiUrl = 'https://incidenciassmart.site/api'; 

  constructor(private http: HttpClient) { }

  getMisReportes() {

    const token = sessionStorage.getItem('token_seguridad');
    
    
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

   
    return this.http.get(`${this.apiUrl}/mis-reportes`, { headers });
  }
}