import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor(private router: Router) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // 1. Sacamos el token del sessionStorage [cite: 2026-02-12]
    const token = sessionStorage.getItem('token_seguridad');

    // 2. Si hay token, lo inyectamos automáticamente en la cabecera [cite: 2026-02-12]
    if (token) {
      request = request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    }

    // 3. Vigilamos la respuesta de Laravel [cite: 2026-02-12]
    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        // Si Laravel responde 401, significa que el token ya no vale (usuario rechazado) [cite: 2026-02-12]
        if (error.status === 401) {
          sessionStorage.clear(); // Limpiamos la memoria [cite: 2026-02-12]
          this.router.navigate(['/login']); // Expulsamos al usuario [cite: 2026-02-12]
        }
        return throwError(() => error);
      })
    );
  }
}