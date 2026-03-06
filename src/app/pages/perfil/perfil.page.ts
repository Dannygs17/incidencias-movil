import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, AlertController } from '@ionic/angular';
import { Router } from '@angular/router';

@Component({
  selector: 'app-perfil',
  templateUrl: './perfil.page.html',
  styleUrls: ['./perfil.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class PerfilPage implements OnInit {

  // Aquí guardaremos los datos para mostrarlos en el HTML
  usuario = {
    name: '',
    email: '',
    curp: ''
  };

  constructor(
    private alertController: AlertController,
    private router: Router
  ) { }

  ngOnInit() {
  }

  // Usamos ionViewWillEnter para asegurar que cargue cada vez que entramos a la pestaña
  ionViewWillEnter() {
    this.cargarDatosUsuario();
  }

  // --- FUNCIÓN PARA CARGAR LOS DATOS ---
  cargarDatosUsuario() {
    // Leemos exactamente la llave 'usuario' que creaste en el login.page.ts
    const userString = sessionStorage.getItem('usuario'); 
    
    if (userString) {
      this.usuario = JSON.parse(userString);
      
      // PASO 3: TRUCO DE LA CONSOLA PARA DEPURAR
      console.log('👀 REVISIÓN DE DATOS DEL USUARIO:', this.usuario);

    } else {
      console.warn('No se encontraron datos. Redirigiendo al login por seguridad.');
      this.ejecutarCerrarSesion();
    }
  }

  // --- FUNCIÓN PARA NAVEGAR A MIS REPORTES ---
  verMisReportes() {
    // Más adelante crearemos esta pantalla para que vea su historial
    this.router.navigate(['/tabs/mis-reportes']); 
  }

  // --- FUNCIONES PARA CERRAR SESIÓN ---
  async confirmarCerrarSesion() {
    const alert = await this.alertController.create({
      header: 'Cerrar Sesión',
      message: '¿Estás seguro de que deseas salir de tu cuenta?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
          cssClass: 'secondary'
        },
        {
          text: 'Sí, salir',
          handler: () => {
            this.ejecutarCerrarSesion();
          }
        }
      ]
    });
    await alert.present();
  }

  ejecutarCerrarSesion() {
    // Borramos exactamente las llaves que configuraste en tu login
    sessionStorage.removeItem('token_seguridad');
    sessionStorage.removeItem('usuario');

    // Redirigimos al inicio
    this.router.navigate(['/login']);
  }
}