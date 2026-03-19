import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, AlertController, ToastController, LoadingController } from '@ionic/angular';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { addIcons } from 'ionicons';
import { 
  cardOutline, 
  cameraReverseOutline, 
  shieldCheckmarkOutline, 
  cloudUploadOutline, 
  person, 
  mailOutline, 
  lockClosedOutline, 
  logOutOutline,
  checkmarkCircle,
  alertCircleOutline,
  checkmarkOutline,
  fingerPrintOutline,
  timeOutline,
  lockOpenOutline, // <-- Agregados para el modal de contraseña
  keyOutline       // <-- Agregados para el modal de contraseña
} from 'ionicons/icons';

@Component({
  selector: 'app-perfil',
  templateUrl: './perfil.page.html',
  styleUrls: ['./perfil.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA] 
})
export class PerfilPage implements OnInit {

  usuario: any = { name: '', email: '', curp: '', status: '', photoURL: null };
  ineFrente: string | null = null;
  ineReverso: string | null = null;

  isModalPasswordOpen = false;
  passData = { current_password: '', password: '', password_confirmation: '' };

  constructor(
    private alertController: AlertController,
    private toastController: ToastController,
    private loadingController: LoadingController,
    private router: Router,
    private authService: AuthService
  ) { 
    addIcons({ 
      cardOutline, cameraReverseOutline, shieldCheckmarkOutline, cloudUploadOutline, 
      person, mailOutline, lockClosedOutline, logOutOutline, checkmarkCircle,
      alertCircleOutline, checkmarkOutline, fingerPrintOutline, timeOutline,
      lockOpenOutline, keyOutline
    });
  }

  ngOnInit() {}

  ionViewWillEnter() {
    this.cargarDatosUsuario();
  }

  cargarDatosUsuario() {
    const userString = sessionStorage.getItem('usuario'); 
    if (userString) {
      this.usuario = JSON.parse(userString);
      const fotoGoogle = sessionStorage.getItem('user_photo');
      if (fotoGoogle) { this.usuario.photoURL = fotoGoogle; }
      
      // === LÍNEA MODIFICADA: Ahora es 100% exacto leyendo el método de login ===
      this.usuario.is_google = (sessionStorage.getItem('login_method') === 'google');

    } else {
      this.ejecutarCerrarSesion();
    }
  }

  calcularPorcentaje() {
    let p = 50; 
    if (this.usuario.curp && this.usuario.curp.length >= 18) p += 10;
    if (this.ineFrente) p += 20;
    if (this.ineReverso) p += 20;
    return p;
  }

  async capturarINE(lado: 'frente' | 'reverso') {
    try {
      const image = await Camera.getPhoto({
        quality: 60, 
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Prompt
      });

      if (lado === 'frente') this.ineFrente = image.dataUrl || null;
      else this.ineReverso = image.dataUrl || null;
      
    } catch (e) {
      console.log('Captura cancelada');
    }
  }

  async enviarADatos() {
    if(!this.usuario.curp || this.usuario.curp.length < 18){
      this.mostrarToast('Por favor ingresa una CURP válida', 'warning');
      return;
    }

    const loading = await this.loadingController.create({ 
      message: 'Subiendo archivos reales...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      const formData = new FormData();
      formData.append('curp', this.usuario.curp.toUpperCase());

      if (this.ineFrente) {
        const blobFrente = await (await fetch(this.ineFrente)).blob();
        formData.append('ine_frente', blobFrente, 'frente.jpg');
      }

      if (this.ineReverso) {
        const blobReverso = await (await fetch(this.ineReverso)).blob();
        formData.append('ine_reverso', blobReverso, 'reverso.jpg');
      }

      this.authService.verificarCuenta(formData).subscribe({
        next: async (res: any) => {
          await loading.dismiss();
          
          this.ineFrente = null;
          this.ineReverso = null;
          
          // Sincronización real con la respuesta de Laravel
          if (res.user) {
            this.usuario = res.user;
          } else {
            this.usuario.status = 'pending';
          }

          sessionStorage.setItem('usuario', JSON.stringify(this.usuario));

          const alert = await this.alertController.create({
            header: '¡Hecho!',
            subHeader: 'Documentación guardada',
            message: 'Tu información ha sido recibida y ahora tu estatus es PENDIENTE. Un administrador te validará pronto.',
            buttons: ['Entendido']
          });
          await alert.present();
          
          this.cargarDatosUsuario();
        },
        error: async (err: any) => {
          await loading.dismiss();
          console.error('Error:', err);
          this.mostrarToast('Error al conectar con el servidor', 'danger');
        }
      });

    } catch (e) {
      await loading.dismiss();
      this.mostrarToast('Error al procesar las imágenes', 'danger');
    }
  }

  // ==========================================
  // LÓGICA DE CONTRASEÑA RECUPERADA
  // ==========================================

  cambiarPassword() {
    // Validamos que sea ciudadano o approved para permitirle abrir el modal
    if (this.usuario.status !== 'ciudadano' && this.usuario.status !== 'approved') {
      this.mostrarToast('Función solo disponible para usuarios verificados.', 'info');
      return;
    }
    
    // Limpiamos los campos antes de abrir el modal
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

  // ==========================================
  // UTILIDADES
  // ==========================================

  async mostrarToast(mensaje: string, color: string) {
    const toast = await this.toastController.create({ message: mensaje, duration: 2000, color: color, position: 'bottom' });
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
    sessionStorage.clear();
    this.router.navigate(['/login']);
  }
}