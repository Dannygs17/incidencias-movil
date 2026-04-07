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

  irARegistro() {
    this.router.navigate(['/register']);
  }

  // --- LOGIN CON GOOGLE (FIREBASE + LARAVEL) ---
  async loginGoogle() {
    const loading = await this.loadingController.create({
      message: 'Validando credenciales...',
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

        // 3. Enviamos a Laravel para autenticar
        this.authService.loginGoogleBackend(googleData).subscribe({
          next: async (laravelRes: any) => {
            await loading.dismiss();

            sessionStorage.setItem('login_method', 'google');
            if (googleData.photoURL) {
              sessionStorage.setItem('user_photo', googleData.photoURL);
            }

            // Solo navegamos al Home si TODO salió perfecto
            this.router.navigate(['/tabs/home']); 
          },
          error: async (err) => {
            // Cerramos el loading circular
            await loading.dismiss();
            // Limpiamos Firebase por seguridad
            await this.firebaseSvc.signOut(); 
            
            // NO MOSTRAMOS ALERTA AQUÍ
            // Dejamos que auth.service.ts muestre la alerta detallada del rechazo
          }
        });
      }
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        return; 
      }
      
      const alert = await this.alertController.create({
        header: 'Error Google',
        message: 'Hubo un problema al conectar con Google.',
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
        
        sessionStorage.setItem('login_method', 'normal');
        sessionStorage.removeItem('user_photo');
        
        // Solo navega si Laravel lo aprueba
        this.router.navigate(['/tabs/home']); 
      },
      error: async (err) => {
        await loading.dismiss();
        
        // SOLO manejamos el error 401 (Contraseña incorrecta) aquí
        // El error 403 (Rechazado) lo maneja en automático auth.service.ts
        if (err.status === 401) {
          const alert = await this.alertController.create({
            header: 'Credenciales Incorrectas',
            message: 'El correo o la contraseña no coinciden.',
            buttons: ['Entendido']
          });
          await alert.present();
        }
      }
    });
  }
}