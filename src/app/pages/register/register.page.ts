import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, LoadingController, AlertController } from '@ionic/angular';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth.service';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'; // Importante para las fotos

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule] // <--- Esto arregla los errores de "Not a known element"
})
export class RegisterPage implements OnInit {

  // Variables para el HTML
  datos = {
    name: '',
    email: '',
    curp: '',
    password: '',
    password_confirmation: ''
  };

  imagenFrente: string | undefined;
  imagenReverso: string | undefined;
  
  // Variable real (Blob) para enviar al servidor
  blobFrente: Blob | null = null;
  blobReverso: Blob | null = null;

  cargando: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private alertController: AlertController,
    private loadingController: LoadingController
  ) { }

  ngOnInit() {
  }

  // Función para tomar foto
  async tomarFoto(tipo: 'frente' | 'reverso') {
    try {
      const image = await Camera.getPhoto({
        quality: 70, // No muy alta para que suba rápido
        allowEditing: false,
        resultType: CameraResultType.Uri, // Obtenemos la ruta
        source: CameraSource.Prompt // Pregunta: ¿Cámara o Galería?
      });

      // Leemos el archivo y lo convertimos a Blob para enviarlo
      const response = await fetch(image.webPath!);
      const blob = await response.blob();

      if (tipo === 'frente') {
        this.imagenFrente = image.webPath; // Para mostrar en pantalla
        this.blobFrente = blob;           // Para enviar al server
      } else {
        this.imagenReverso = image.webPath;
        this.blobReverso = blob;
      }

    } catch (error) {
      console.log('El usuario canceló o hubo error', error);
    }
  }

  // Función para registrar
  async registrarUsuario() {
    // 1. Validaciones básicas
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
      message: 'Subiendo información...',
    });
    await loading.present();

    // 2. Preparar los datos como FormData (porque enviamos archivos)
    const formData = new FormData();
    formData.append('name', this.datos.name);
    formData.append('email', this.datos.email);
    formData.append('curp', this.datos.curp);
    formData.append('password', this.datos.password);
    formData.append('password_confirmation', this.datos.password_confirmation); // Laravel a veces lo pide
    
    // Adjuntar las fotos
    formData.append('ine_frente', this.blobFrente, 'frente.jpg');
    formData.append('ine_reverso', this.blobReverso, 'reverso.jpg');

    // 3. Enviar al servicio
    this.authService.register(formData).subscribe({
      next: async (res) => {
        loading.dismiss();
        this.cargando = false;
        
        // MENSAJE DE ÉXITO (El que pediste)
        const alert = await this.alertController.create({
          header: 'Registro Exitoso',
          subHeader: 'Validación requerida',
          message: 'Tus datos se han enviado correctamente. Un administrador verificará tu información. Por favor espera a ser aprobado para iniciar sesión.',
          buttons: [
            {
              text: 'Entendido',
              handler: () => {
                this.router.navigate(['/login']);
              }
            }
          ],
          backdropDismiss: false
        });
        await alert.present();
      },
      error: async (err) => {
        loading.dismiss();
        this.cargando = false;
        console.error(err);
        this.mostrarAlerta('Error', 'Hubo un problema con el registro. Verifica tu conexión o si el correo ya existe.');
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