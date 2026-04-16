import { Component, OnInit } from '@angular/core';
import { Platform } from '@ionic/angular';
import { PushNotifications } from '@capacitor/push-notifications';
import { AuthService } from './services/auth.service'; 
import { Router } from '@angular/router'; // 1. IMPORTAMOS EL ROUTER

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit {
  
  constructor(
    private platform: Platform,
    private authService: AuthService,
    private router: Router // 2. INYECTAMOS EL ROUTER
  ) {}

  ngOnInit() {
    this.platform.ready().then(() => {
      // 3. PRIMERO: Verificamos si ya hay sesión para decidir a dónde mandar al usuario
      this.verificarSesionExistente();
      
      // 4. SEGUNDO: Inicializamos las notificaciones
      this.inicializarNotificaciones();
    });
  }

  // --- FUNCIÓN CRUCIAL: Decide si el usuario va al Login o al Home ---
  verificarSesionExistente() {
    const token = localStorage.getItem('token_seguridad');
    const usuario = localStorage.getItem('usuario');

    if (token && usuario) {
      console.log('✅ Sesión detectada en localStorage. Entrando directo...');
      // Si existen los datos, lo mandamos al Home de inmediato
      this.router.navigate(['/tabs/home']); 
    } else {
      console.log('❌ No hay sesión activa. Dirigiendo al Login.');
      // Si no hay nada, aseguramos que esté en el login
      this.router.navigate(['/login']);
    }
  }

  inicializarNotificaciones() {
    // 1. Pedir permiso al usuario
    PushNotifications.requestPermissions().then(result => {
      if (result.receive === 'granted') {
        PushNotifications.register();
      } else {
        console.log('El usuario bloqueó las notificaciones');
      }
    });

    // 2. Recibir el Token de Firebase
    PushNotifications.addListener('registration', (token) => {
      console.log('🔥 Token de Firebase recibido: ', token.value);
      
      localStorage.setItem('fcm_token_temp', token.value);
      this.enviarTokenALaravel(token.value);
    });

    // 3. Manejar errores de registro
    PushNotifications.addListener('registrationError', (error: any) => {
      console.error('Error al registrar en Firebase: ', JSON.stringify(error));
    });

    // 4. Escuchar cuando llega una notificación y la app está abierta
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('¡Llegó una notificación!: ', notification);
    });

    // 5. Escuchar cuando el usuario toca la notificación
    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      console.log('El usuario tocó la notificación: ', action);
    });
  }

  // --- EVALÚA SI HAY SESIÓN Y MANDA EL TOKEN ---
  enviarTokenALaravel(fcmToken: string) {
    const tokenSeguridad = localStorage.getItem('token_seguridad');
    
    if (tokenSeguridad && fcmToken) {
      this.authService.saveFcmToken(fcmToken).subscribe({
        next: () => console.log('✅ Laravel: Token sincronizado correctamente'),
        error: (err) => console.error('❌ Laravel: Error sincronizando token: ', err)
      });
    } else {
      console.log('Token recibido, pero esperando inicio de sesión para sincronizar con Laravel.');
    }
  }
}