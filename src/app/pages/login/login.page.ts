import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, AlertController, LoadingController } from '@ionic/angular';
import { Router } from '@angular/router';

import { AuthService } from '../../services/auth.service';
import { Firebase } from '../../services/firebase'; 

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class LoginPage implements OnInit {

  credentials = { 
    email: '', 
    password: '' 
  };

  constructor(
    private authService: AuthService,
    private firebaseSvc: Firebase, 
    private router: Router,
    private alertController: AlertController,
    private loadingController: LoadingController
  ) { }

  ngOnInit() { }

  // --- REDIRECCIÓN A REGISTRO ---
  irARegistro() {
    this.router.navigate(['/register']);
  }

  // --- LOGIN CON GOOGLE (FIREBASE + LARAVEL) ---
  async loginGoogle() {
    const loading = await this.loadingController.create({
      message: 'Conectando con Google...',
      spinner: 'crescent'
    });
    
    try {
      // 1. Obtenemos datos de Firebase
      const res = await this.firebaseSvc.loginWithGoogle();
      
      if (res.user) {
        await loading.present();
        
        // 2. Preparamos el paquete para Laravel
        const googleData = {
          name: res.user.displayName || 'Usuario Google',
          email: res.user.email || '',
          photoURL: res.user.photoURL || null 
        };

        // 3. Enviamos a Laravel para autenticar en el Backend
        this.authService.loginGoogleBackend(googleData).subscribe({
          next: async (laravelRes: any) => {
            await loading.dismiss();

            // === LÍNEA AGREGADA: Dejamos la marca de que entró con Google ===
            sessionStorage.setItem('login_method', 'google');

            // Guardamos la foto en local para acceso rápido si existe
            if (googleData.photoURL) {
              sessionStorage.setItem('user_photo', googleData.photoURL);
            }

            // Redirigimos al Home (AuthService ya guardó token y usuario)
            this.router.navigate(['/tabs/home']); 
          },
          error: async (err) => {
            await loading.dismiss();
            
            // --- LIMPIEZA CLAVE PARA EVITAR BUGS ---
            // Si Laravel falla (ej. borraste al usuario de la DB), 
            // cerramos sesión en Firebase para que no quede "colgada".
            await this.firebaseSvc.signOut(); 
            
            console.error('Error Laravel:', err);
            const alert = await this.alertController.create({
              header: 'Acceso Denegado',
              message: 'Tu cuenta no está registrada o fue eliminada de nuestro sistema.',
              buttons: ['Entendido']
            });
            await alert.present();
          }
        });
      }
    } catch (error: any) { // <-- Se agregó el ": any" para poder leer el código de error
      console.error('Error Firebase:', error);
      
      // --- BLOQUE AGREGADO: Ignorar errores de cancelación ---
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        return; // Detiene la ejecución sin mostrar la alerta
      }
      
      const alert = await this.alertController.create({
        header: 'Error Google',
        message: 'Se canceló el inicio de sesión o hubo un problema con el popup.',
        buttons: ['OK']
      });
      await alert.present();
    }
  }

  // --- LOGIN NORMAL (CORREO Y CONTRASEÑA) ---
  async onLogin() {
    const loading = await this.loadingController.create({
      message: 'Iniciando sesión...',
      spinner: 'crescent'
    });
    await loading.present();

    this.authService.login(this.credentials).subscribe({
      next: async (res: any) => {
        await loading.dismiss();
        
        // === LÍNEA AGREGADA: Dejamos la marca de que entró normal ===
        sessionStorage.setItem('login_method', 'normal');

        // Limpiamos rastro de fotos de google previas si entramos con cuenta normal
        sessionStorage.removeItem('user_photo');
        
        // Redirigimos al Home
        this.router.navigate(['/tabs/home']); 
      },
      error: async (err) => {
        await loading.dismiss();
        
        let header = 'Error de Acceso';
        let message = 'No se pudo conectar con el servidor.';

        if (err.status === 403) {
          header = 'Estado de Cuenta';
          message = err.error.message || 'Tu cuenta está en revisión o rechazada.';
        } else if (err.status === 401) {
          header = 'Credenciales Incorrectas';
          message = 'El correo o la contraseña no coinciden.';
        }

        const alert = await this.alertController.create({
          header: header,
          message: message,
          buttons: ['Entendido']
        });
        await alert.present();
      }
    });
  }
}