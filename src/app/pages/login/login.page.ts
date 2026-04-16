import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, AlertController, LoadingController } from '@ionic/angular';
import { Router } from '@angular/router';

import { AuthService } from '../../services/auth.service';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth'; 

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

  // ==========================================
  // VARIABLES PARA RECUPERAR CONTRASEÑA
  // ==========================================
  isForgotModalOpen = false;
  isResetModalOpen = false;
  recoveryEmail = '';
  resetData = {
    pin: '',
    password: '',
    password_confirmation: ''
  };

  constructor(
    private authService: AuthService,
    private router: Router,
    private alertController: AlertController,
    private loadingController: LoadingController
  ) { }

  ngOnInit() { 
    // Inicializamos el plugin nativo de Google al cargar la pantalla
    GoogleAuth.initialize();
  }

  irARegistro() {
    this.router.navigate(['/register']);
  }

  // ==========================================
  // LÓGICA DE RECUPERACIÓN DE CONTRASEÑA
  // ==========================================

  // 1. Abre la primera ventana para pedir el correo
  abrirModalCorreo() {
    this.recoveryEmail = ''; 
    this.isForgotModalOpen = true;
  }

  // 2. Envía el correo a Laravel para que genere y envíe el PIN
  async enviarPin() {
    if (!this.recoveryEmail || !this.recoveryEmail.includes('@')) {
      const alert = await this.alertController.create({
        header: 'Correo inválido',
        message: 'Por favor, ingresa un correo electrónico válido.',
        buttons: ['OK']
      });
      await alert.present();
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Buscando cuenta...',
      spinner: 'crescent'
    });
    await loading.present();

    this.authService.requestPasswordReset(this.recoveryEmail).subscribe({
      next: async (res: any) => {
        await loading.dismiss();
        
        // Cerramos el modal del correo y abrimos el del PIN
        this.isForgotModalOpen = false;
        
        // Limpiamos los campos de la contraseña por si acaso
        this.resetData = { pin: '', password: '', password_confirmation: '' };
        this.isResetModalOpen = true;

        const alert = await this.alertController.create({
          header: 'Código Enviado',
          message: 'Si el correo está registrado, recibirás un PIN de 6 dígitos en tu bandeja de entrada en breve.',
          buttons: ['Entendido']
        });
        await alert.present();
      },
      error: async (err) => {
        await loading.dismiss();
        const alert = await this.alertController.create({
          header: 'Error',
          message: 'Hubo un problema de conexión. Intenta de nuevo más tarde.',
          buttons: ['OK']
        });
        await alert.present();
      }
    });
  }

  // 3. Envía el PIN y la nueva contraseña a Laravel para actualizar
  async guardarNuevaPasswordPin() {
    // Validaciones rápidas
    if (this.resetData.pin.length !== 6) {
      this.mostrarAlertaRapida('PIN Inválido', 'El PIN debe tener exactamente 6 dígitos.');
      return;
    }
    if (this.resetData.password.length < 6) {
      this.mostrarAlertaRapida('Contraseña Corta', 'La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (this.resetData.password !== this.resetData.password_confirmation) {
      this.mostrarAlertaRapida('Error', 'Las contraseñas no coinciden.');
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Actualizando...',
      spinner: 'crescent'
    });
    await loading.present();

    // Empaquetamos los datos que espera Laravel
    const payload = {
      email: this.recoveryEmail,
      pin: this.resetData.pin,
      password: this.resetData.password,
      password_confirmation: this.resetData.password_confirmation
    };

    this.authService.resetPasswordWithPin(payload).subscribe({
      next: async (res: any) => {
        await loading.dismiss();
        
        this.isResetModalOpen = false; // Cerramos la ventana
        
        // Rellenamos el correo en el login normal para ahorrarle tiempo al usuario
        this.credentials.email = this.recoveryEmail;
        this.credentials.password = ''; // Limpiamos la anterior

        const alert = await this.alertController.create({
          header: '¡Éxito! ✅',
          message: 'Tu contraseña ha sido actualizada correctamente. Ya puedes iniciar sesión.',
          buttons: ['Genial']
        });
        await alert.present();
      },
      error: async (err) => {
        await loading.dismiss();
        const mensajeError = err.error?.message || 'El PIN es incorrecto o ha expirado. Por favor, intenta de nuevo.';
        this.mostrarAlertaRapida('Operación Fallida', mensajeError);
      }
    });
  }

  // Función de apoyo para no repetir tanto código de alertas
  private async mostrarAlertaRapida(titulo: string, mensaje: string) {
    const alert = await this.alertController.create({
      header: titulo,
      message: mensaje,
      buttons: ['OK']
    });
    await alert.present();
  }


  // ==========================================
  // LÓGICA NORMAL DE LOGIN
  // ==========================================

  // --- LOGIN CON GOOGLE (NATIVO + LARAVEL) ---
  async loginGoogle() {
    try {
      const user = await GoogleAuth.signIn();
      
      if (user) {
        const loading = await this.loadingController.create({
          message: 'Validando credenciales...',
          spinner: 'crescent'
        });
        await loading.present();

        const googleData = {
          name: (user as any).name || (user as any).displayName || 'Usuario Google',
          email: user.email,
          photoURL: (user as any).imageUrl || null 
        };

        this.authService.loginGoogleBackend(googleData).subscribe({
          next: async (laravelRes: any) => {
            await loading.dismiss();

            localStorage.setItem('login_method', 'google');
            if (googleData.photoURL) {
              localStorage.setItem('user_photo', googleData.photoURL);
            }

            this.router.navigate(['/tabs/home']); 
          },
          error: async (err) => {
            await loading.dismiss();
            await GoogleAuth.signOut(); 
          }
        });
      }
    } catch (error: any) {
      if (error.type === 'user_cancelled' || String(error).includes('canceled')) {
        return; 
      }
      
      const alert = await this.alertController.create({
        header: 'Error Google',
        message: 'Hubo un problema al conectar con Google. Verifica tu conexión.',
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
        
        localStorage.setItem('login_method', 'normal');
        localStorage.removeItem('user_photo');
        
        this.router.navigate(['/tabs/home']); 
      },
      error: async (err) => {
        await loading.dismiss();
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