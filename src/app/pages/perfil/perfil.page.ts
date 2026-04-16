import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, AlertController, ToastController, LoadingController, ActionSheetController } from '@ionic/angular';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { addIcons } from 'ionicons';
import { 
  cardOutline, cameraReverseOutline, shieldCheckmarkOutline, cloudUploadOutline, 
  person, mailOutline, lockClosedOutline, logOutOutline, checkmarkCircle,
  alertCircleOutline, checkmarkOutline, fingerPrintOutline, timeOutline,
  lockOpenOutline, keyOutline, cameraOutline, imageOutline, close
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

  usuario: any = { name: '', email: '', curp: '', status: '', photoURL: null, rejection_reason: '', correction_fields: [] };
  ineFrente: string | null = null;
  ineReverso: string | null = null;

  isModalPasswordOpen = false;
  passData = { current_password: '', password: '', password_confirmation: '' };

  constructor(
    private alertController: AlertController,
    private toastController: ToastController,
    private loadingController: LoadingController,
    private router: Router,
    private authService: AuthService,
    private actionSheetCtrl: ActionSheetController 
  ) { 
    addIcons({ 
      cardOutline, cameraReverseOutline, shieldCheckmarkOutline, cloudUploadOutline, 
      person, mailOutline, lockClosedOutline, logOutOutline, checkmarkCircle,
      alertCircleOutline, checkmarkOutline, fingerPrintOutline, timeOutline,
      lockOpenOutline, keyOutline, cameraOutline, imageOutline, close
    });
  }

  ngOnInit() {}

  ionViewWillEnter() {
    this.cargarDatosUsuario();
  }

  cargarDatosUsuario() {
    const userString = localStorage.getItem('usuario'); 
    if (userString) {
      this.usuario = JSON.parse(userString);
      const fotoGoogle = localStorage.getItem('user_photo');
      if (fotoGoogle) { this.usuario.photoURL = fotoGoogle; }
      this.usuario.is_google = (localStorage.getItem('login_method') === 'google');
    } else {
      this.ejecutarCerrarSesion();
      return;
    }

    this.authService.verificarEstatus().subscribe({
      next: (userFromDB: any) => {
        this.usuario.status = userFromDB.status;
        this.usuario.rejection_reason = userFromDB.rejection_reason;
        this.usuario.correction_fields = userFromDB.correction_fields || []; 
        localStorage.setItem('usuario', JSON.stringify(this.usuario));
      },
      error: (err) => console.error('Error al sincronizar estatus:', err)
    });
  }

  calcularPorcentaje() {
    let p = 50; 
    if (this.usuario.curp && this.usuario.curp.length >= 18) p += 10;
    if (this.ineFrente) p += 20;
    if (this.ineReverso) p += 20;
    return p;
  }

  necesitaCorregir(campo: string): boolean {
    if (this.usuario.status === 'invitado') return true; 
    if (this.usuario.status === 'action_required' && this.usuario.correction_fields) {
      return this.usuario.correction_fields.includes(campo); 
    }
    return false;
  }

  formularioValido(): boolean {
    if (this.usuario.status === 'invitado') {
      return !!(this.usuario.curp && this.usuario.curp.length >= 18 && this.ineFrente && this.ineReverso);
    }
    
    if (this.usuario.status === 'action_required') {
      if (this.necesitaCorregir('curp') && (!this.usuario.curp || this.usuario.curp.length < 18)) return false;
      if (this.necesitaCorregir('ine_frente') && !this.ineFrente) return false;
      if (this.necesitaCorregir('ine_reverso') && !this.ineReverso) return false;
      return true; 
    }
    return false;
  }

  async mostrarMenuFoto(lado: 'frente' | 'reverso') {
    const actionSheet = await this.actionSheetCtrl.create({
      header: `Actualizar foto del INE (${lado})`,
      buttons: [
        {
          text: 'Tomar foto con la cámara',
          icon: 'camera-outline',
          handler: () => { this.ejecutarCamara(lado, CameraSource.Camera); }
        },
        {
          text: 'Elegir de la galería',
          icon: 'image-outline',
          handler: () => { this.ejecutarCamara(lado, CameraSource.Photos); }
        },
        { text: 'Cancelar', icon: 'close', role: 'cancel' }
      ]
    });
    await actionSheet.present();
  }

  async ejecutarCamara(lado: 'frente' | 'reverso', fuente: CameraSource) {
    try {
      const image = await Camera.getPhoto({
        quality: 60, 
        resultType: CameraResultType.DataUrl,
        source: fuente 
      });
      if (lado === 'frente') this.ineFrente = image.dataUrl || null;
      else this.ineReverso = image.dataUrl || null;
    } catch (e) {
      console.log('Captura cancelada');
    }
  }

  async enviarADatos() {
    if(!this.formularioValido()){
      this.mostrarToast('Por favor completa todos los campos solicitados', 'warning');
      return;
    }

    // LÓGICA: Guardamos el estado previo para personalizar el mensaje final
    const estatusPrevio = this.usuario.status;

    const loading = await this.loadingController.create({ 
      message: 'Enviando actualización...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      const formData = new FormData();
      if (this.necesitaCorregir('curp')) {
        formData.append('curp', this.usuario.curp.toUpperCase());
      }
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
          
          if (res.user) {
            this.usuario = res.user;
          } else {
            this.usuario.status = 'pending';
          }

          localStorage.setItem('usuario', JSON.stringify(this.usuario));

          // PERSONALIZACIÓN DEL MENSAJE SEGÚN EL CASO
          let subHeaderMsg = 'Documentación enviada';
          let bodyMsg = 'Tus datos han sido recibidos. Espera la validación del administrador.';

          if (estatusPrevio === 'action_required') {
            subHeaderMsg = 'Documentación actualizada';
            bodyMsg = 'Tus correcciones han sido enviadas exitosamente. Espera la validación del administrador.';
          }

          const alert = await this.alertController.create({
            header: '¡Hecho!',
            subHeader: subHeaderMsg,
            message: bodyMsg,
            buttons: ['Entendido']
          });
          await alert.present();
          this.cargarDatosUsuario();
        },
        error: async (err: any) => {
          await loading.dismiss();
          this.mostrarToast('Error al conectar con el servidor', 'danger');
        }
      });
    } catch (e) {
      await loading.dismiss();
      this.mostrarToast('Error al procesar las imágenes', 'danger');
    }
  }

  // ... (cambiarPassword, guardarNuevaPassword, mostrarToast, etc. se mantienen igual)
  cambiarPassword() {
    if (this.usuario.status !== 'ciudadano' && this.usuario.status !== 'approved') {
      this.mostrarToast('Función solo disponible para usuarios verificados.', 'info');
      return;
    }
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
    localStorage.clear();
    this.router.navigate(['/login']);
  }
}