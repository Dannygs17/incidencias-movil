import { Component, OnInit, AfterViewInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, AlertController, ToastController } from '@ionic/angular'; 
import { Router } from '@angular/router'; 
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';
import { addIcons } from 'ionicons';
import { 
  cameraOutline, locationOutline, map, locate, send, trashOutline, 
  shieldCheckmark, flash, notifications, ribbon, arrowForwardOutline,
  timeOutline, hourglassOutline 
} from 'ionicons/icons';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
import { AuthService } from '../../services/auth.service'; 

import * as L from 'leaflet';

const iconDefault = L.icon({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41]
});

@Component({
  selector: 'app-nuevo-reporte',
  templateUrl: './nuevo-reporte.page.html',
  styleUrls: ['./nuevo-reporte.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, HttpClientModule]
})
export class NuevoReportePage implements OnInit, AfterViewInit {

  private http = inject(HttpClient);
  private router = inject(Router);
  private alertController = inject(AlertController);
  private toastController = inject(ToastController);
  private authService = inject(AuthService); 
  private cdr = inject(ChangeDetectorRef); 
  
  private apiUrl = 'http://localhost:8000/api/incidencias';

  usuario: any = { status: '' }; 
  
  // NUEVO: Arreglo para guardar las categorías que vienen de Laravel
  categorias: any[] = []; 

  // MODIFICADO: Cambiamos 'categoria' por 'categoria_id' (iniciado en null)
  reporte: any = { categoria_id: null, descripcion: '', latitud: 0, longitud: 0 };
  
  fotoCapturada: string | undefined;
  map: L.Map | undefined;
  marker: L.Marker | undefined;

  constructor() {
    addIcons({ 
      cameraOutline, locationOutline, map, locate, send, trashOutline, 
      shieldCheckmark, flash, notifications, ribbon, arrowForwardOutline,
      timeOutline, hourglassOutline
    });
  }

  ngOnInit() {
    // NUEVO: Llamamos a la función al abrir la pantalla
    this.cargarCategorias();
  }

  // NUEVO: Función que descarga las categorías reales de tu base de datos
  cargarCategorias() {
    // Asegúrate de tener esta ruta abierta en tu api.php de Laravel
    this.http.get('http://localhost:8000/api/categorias').subscribe({
      next: (res: any) => {
        this.categorias = res;
      },
      error: (err) => {
        console.error('Error al cargar categorías', err);
        this.mostrarToast('No se pudieron cargar las categorías', 'danger');
      }
    });
  }

  async ionViewWillEnter() {
    const userJson = sessionStorage.getItem('usuario');
    if (userJson) {
      this.usuario = JSON.parse(userJson);
      this.cdr.detectChanges();
    }

    this.authService.verificarEstatus().subscribe({
      next: (res: any) => {
        this.usuario = res;
        sessionStorage.setItem('usuario', JSON.stringify(res));
        this.cdr.detectChanges(); 

        if (res.status === 'approved') {
          setTimeout(() => this.initMap(), 500);
        }
      },
      error: (err) => console.error('Error sincronizando', err)
    });
  }

  async ngAfterViewInit() {
    if (this.usuario.status === 'approved') {
      setTimeout(() => this.initMap(), 800);
    }
  }

  async initMap() {
    const container = document.getElementById('mapa-leaflet');
    if (!container) {
      setTimeout(() => this.initMap(), 500);
      return;
    }
    if (this.map) {
      this.map.invalidateSize();
      return;
    }

    try {
      const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
      this.reporte.latitud = position.coords.latitude;
      this.reporte.longitud = position.coords.longitude;
    } catch (error) {
      this.reporte.latitud = 20.5333; 
      this.reporte.longitud = -97.4500;
    }

    this.map = L.map('mapa-leaflet').setView([this.reporte.latitud, this.reporte.longitud], 18);
    L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
      maxZoom: 20,
      attribution: '© Google Maps'
    }).addTo(this.map);
    
    this.actualizarMarcador(this.reporte.latitud, this.reporte.longitud);
    setTimeout(() => this.map?.invalidateSize(), 600);
  }

  actualizarMarcador(lat: number, lng: number) {
    if (this.map) {
      if (this.marker) {
        this.marker.setLatLng([lat, lng]);
      } else {
        this.marker = L.marker([lat, lng], { 
          draggable: true,
          icon: iconDefault 
        }).addTo(this.map);

        this.marker.on('dragend', (event: any) => {
          const nuevaPosicion = event.target.getLatLng();
          this.reporte.latitud = nuevaPosicion.lat;
          this.reporte.longitud = nuevaPosicion.lng;
        });
      }
      this.map.setView([lat, lng]);
    }
  }

  async centrarMapa() {
    try {
      const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
      this.reporte.latitud = position.coords.latitude;
      this.reporte.longitud = position.coords.longitude;
      if (this.map) {
        this.map.flyTo([this.reporte.latitud, this.reporte.longitud], 18);
        this.actualizarMarcador(this.reporte.latitud, this.reporte.longitud);
      }
    } catch (e) { this.mostrarToast('GPS no disponible', 'danger'); }
  }

  async tomarFoto() {
    try {
      const image = await Camera.getPhoto({
        quality: 60,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Prompt,
        correctOrientation: true
      });
      this.fotoCapturada = image.dataUrl;
    } catch (e) {}
  }

  borrarFoto() { this.fotoCapturada = undefined; }

  async mostrarToast(msj: string, color: string) {
    const t = await this.toastController.create({ 
      message: msj, color: color, duration: 2500, position: 'bottom' 
    });
    t.present();
  }

  enviarReporte() {
    if (this.usuario.status !== 'approved') return;
    
    // MODIFICADO: Ahora validamos que 'categoria_id' exista en lugar de 'categoria'
    if (!this.reporte.categoria_id || !this.reporte.descripcion || !this.fotoCapturada) {
      this.mostrarToast('Faltan datos o la foto', 'warning');
      return;
    }
    
    const token = sessionStorage.getItem('token_seguridad');
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });
    const body = { ...this.reporte, imagen: this.fotoCapturada };

    this.http.post(this.apiUrl, body, { headers }).subscribe({
      next: () => {
        this.mostrarToast('Reporte enviado con éxito', 'success');
        this.router.navigate(['/tabs/home']);
      },
      error: () => this.mostrarToast('Error al conectar con el servidor', 'danger')
    });
  }

  irAPerfil() { this.router.navigate(['/tabs/perfil']); }
}