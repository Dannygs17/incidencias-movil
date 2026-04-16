import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, LoadingController, AlertController, ActionSheetController } from '@ionic/angular';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth.service';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'; 

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule] 
})
export class RegisterPage implements OnInit {

  datos = {
    name: '',
    email: '',
    curp: '',
    password: '',
    password_confirmation: ''
  };

  imagenFrente: string | undefined;
  imagenReverso: string | undefined;
  blobFrente: Blob | null = null;
  blobReverso: Blob | null = null;
  cargando: boolean = false;
  mostrarClave: boolean = false;
  mostrarConfClave: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private actionSheetCtrl: ActionSheetController // Agregado para el menú
  ) { }

  ngOnInit() {}

  ionViewWillEnter() {
    this.limpiarFormulario();
  }

  limpiarFormulario() {
    this.datos = {
      name: '',
      email: '',
      curp: '',
      password: '',
      password_confirmation: ''
    };
    this.imagenFrente = undefined;
    this.imagenReverso = undefined;
    this.blobFrente = null;
    this.blobReverso = null;
    this.mostrarClave = false;
    this.mostrarConfClave = false;
    this.cargando = false;
  }

  // --- NUEVO MENÚ DE FOTOS ---
  async mostrarMenuFoto(tipo: 'frente' | 'reverso') {
    const actionSheet = await this.actionSheetCtrl.create({
      header: '¿De dónde quieres obtener la foto?',
      buttons: [
        {
          text: 'Tomar foto con la cámara',
          icon: 'camera-outline',
          handler: () => { this.ejecutarCamara(tipo, CameraSource.Camera); }
        },
        {
          text: 'Elegir de la galería',
          icon: 'image-outline',
          handler: () => { this.ejecutarCamara(tipo, CameraSource.Photos); }
        },
        {
          text: 'Cancelar',
          icon: 'close',
          role: 'cancel'
        }
      ]
    });
    await actionSheet.present();
  }

  // --- EJECUCIÓN DE CÁMARA SILENCIOSA ---
  async ejecutarCamara(tipo: 'frente' | 'reverso', fuente: CameraSource) {
    try {
      const image = await Camera.getPhoto({
        quality: 70, 
        allowEditing: false,
        resultType: CameraResultType.Uri, 
        source: fuente 
      });

      const response = await fetch(image.webPath!);
      const blob = await response.blob();

      if (tipo === 'frente') {
        this.imagenFrente = image.webPath; 
        this.blobFrente = blob;           
      } else {
        this.imagenReverso = image.webPath;
        this.blobReverso = blob;
      }

    } catch (error) {
      console.log('Captura cancelada');
    }
  }

  async registrarUsuario() {
    if (!this.datos.name || !this.datos.email || !this.datos.curp || !this.datos.password) {
      this.mostrarAlerta('Faltan datos', 'Por favor llena todos los campos de texto.');
      return;
    }
    if (this.datos.password !== this.datos.password_confirmation) {
      this.mostrarAlerta('Error', 'Las contraseñas no coinciden.');
      return;
    }
    if (!this.blobFrente || !this.blobReverso) {
      this.mostrarAlerta('Faltan fotos', 'Debes tomar foto de ambos lados de tu INE.');
      return;
    }

    this.cargando = true;
    const loading = await this.loadingController.create({
      message: 'Creando cuenta...',
    });
    await loading.present();

    const formData = new FormData();
    formData.append('name', this.datos.name);
    formData.append('email', this.datos.email);
    formData.append('curp', this.datos.curp.toUpperCase());
    formData.append('password', this.datos.password);
    formData.append('password_confirmation', this.datos.password_confirmation); 
    formData.append('ine_frente', this.blobFrente, 'frente.jpg');
    formData.append('ine_reverso', this.blobReverso, 'reverso.jpg');

    this.authService.register(formData).subscribe({
      next: async (res: any) => {
        await loading.dismiss();
        this.cargando = false;
        
        if (res.access_token) {
          localStorage.setItem('token_seguridad', res.access_token);
          localStorage.setItem('usuario', JSON.stringify(res.user));
          localStorage.setItem('login_method', 'normal'); 
        }
        
        const alert = await this.alertController.create({
          header: '¡Bienvenido!',
          message: 'Tu cuenta ha sido creada. Estamos validando tu documentación, mientras tanto, ya puedes explorar la app.',
          buttons: [
            {
              text: 'Entendido',
              handler: () => {
                this.limpiarFormulario();
                this.router.navigate(['/tabs/home']);
              }
            }
          ],
          backdropDismiss: false
        });
        await alert.present();
      },
      error: async (err: any) => {
        await loading.dismiss();
        this.cargando = false;
        console.error(err);
        
        let mensaje = 'Hubo un problema con el registro.';
        if (err.error?.errors?.email) {
          mensaje = 'Este correo electrónico ya está registrado.';
        } else if (err.error?.errors?.curp) {
          mensaje = 'Esta CURP ya se encuentra en nuestro sistema.';
        }

        this.mostrarAlerta('Error de Registro', mensaje);
      }
    });
  }

  async mostrarAlerta(header: string, message: string) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['OK']
    });
    await alert.present();
  }
}