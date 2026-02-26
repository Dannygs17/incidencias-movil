import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth.service';
import { AlertController, LoadingController } from '@ionic/angular';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule] // FormsModule es vital para el login
})
export class LoginPage implements OnInit {

  credentials = {
    email: '',
    password: ''
  };

  constructor(
    private authService: AuthService,
    private router: Router,
    private alertController: AlertController,
    private loadingController: LoadingController
  ) { }

  ngOnInit() { }

  irARegistro() {
    this.router.navigate(['/register']);
  }

  async onLogin() {
    const loading = await this.loadingController.create({
      message: 'Iniciando sesión...',
      spinner: 'crescent'
    });
    await loading.present();

    this.authService.login(this.credentials).subscribe({
      next: async (res: any) => {
        await loading.dismiss();
        
        // GUARDADO EN SESIÓN: Se borra al cerrar la app por completo
        sessionStorage.setItem('token_seguridad', res.access_token);
        sessionStorage.setItem('usuario', JSON.stringify(res.user));

        // NAVEGACIÓN: A la ruta principal de tus tabs
        this.router.navigate(['/tabs/home']); 
      },
      error: async (err) => {
        await loading.dismiss();
        
        let header = 'Error de Acceso';
        let message = 'No se pudo conectar con el servidor.';

       
        if (err.status === 403) {
          header = 'Estado de Cuenta';
          message = err.error.message; // Mensaje que configuramos en el AuthController.php
        } else if (err.status === 401) {
          header = 'Credenciales Incorrectas';
          message = 'El correo o la contraseña no coinciden con nuestros registros.';
        } else if (err.status === 0) {
          message = 'Servidor fuera de línea. Verifica tu conexión local.';
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