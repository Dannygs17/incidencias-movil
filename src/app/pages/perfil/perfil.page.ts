import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core'; // Importamos el Schema
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, AlertController, ToastController } from '@ionic/angular';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-perfil',
  templateUrl: './perfil.page.html',
  styleUrls: ['./perfil.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA] // Esto permite que [passwordToggle] funcione sin errores
})
export class PerfilPage implements OnInit {

  usuario = {
    name: '',
    email: '',
    curp: ''
  };

  // Variables para el Modal
  isModalPasswordOpen = false;
  passData = {
    current_password: '',
    password: '',
    password_confirmation: ''
  };

  constructor(
    private alertController: AlertController,
    private toastController: ToastController,
    private router: Router,
    private authService: AuthService 
  ) { }

  ngOnInit() {}

  ionViewWillEnter() {
    this.cargarDatosUsuario();
  }

  cargarDatosUsuario() {
    const userString = sessionStorage.getItem('usuario'); 
    if (userString) {
      this.usuario = JSON.parse(userString);
    } else {
      this.ejecutarCerrarSesion();
    }
  }

  cambiarPassword() {
    this.passData = { current_password: '', password: '', password_confirmation: '' };
    this.isModalPasswordOpen = true;
  }

  guardarNuevaPassword() {
    if (!this.passData.current_password || !this.passData.password || !this.passData.password_confirmation) {
      this.mostrarToast('Todos los campos son obligatorios', 'warning');
      return;
    }

    if (this.passData.password !== this.passData.password_confirmation) {
      this.mostrarToast('Las nuevas contraseñas no coinciden', 'danger');
      return;
    }

    this.authService.updatePassword(this.passData).subscribe({
      next: (res: any) => {
        this.mostrarToast('Tu contraseña fue actualizada correctamente', 'success');
        this.isModalPasswordOpen = false;
      },
      error: (err: any) => {
        const errorMsg = err.error?.message || 'Error al actualizar. Verifica tu clave actual.';
        this.mostrarToast(errorMsg, 'danger');
      }
    });
  }

  async mostrarToast(mensaje: string, color: string) {
    const toast = await this.toastController.create({
      message: mensaje,
      duration: 2000,
      color: color,
      position: 'bottom'
    });
    toast.present();
  }

  async confirmarCerrarSesion() {
    const alert = await this.alertController.create({
      header: 'Cerrar Sesión',
      message: '¿Estás seguro de que deseas salir de tu cuenta?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Sí, salir', handler: () => this.ejecutarCerrarSesion() }
      ]
    });
    await alert.present();
  }

  ejecutarCerrarSesion() {
    sessionStorage.removeItem('token_seguridad');
    sessionStorage.removeItem('usuario');
    this.router.navigate(['/login']);
  }
}