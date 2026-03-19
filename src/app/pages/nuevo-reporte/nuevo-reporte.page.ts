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

// --- SOLUCIÓN DEL PIN AZUL DE LEAFLET ---
// Esto le dice a Leaflet de dónde descargar las imágenes oficiales de su pin
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
  reporte = { categoria: '', descripcion: '', latitud: 0, longitud: 0 };
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

  ngOnInit() {}

  async ionViewWillEnter() {
    const userJson = sessionStorage.getItem('usuario');
    if (userJson) {
      this.usuario = JSON.parse(userJson);
      this.cdr.detectChanges();
    }

    this.authService.verificarEstatus().subscribe({
      next: (res: any) => {
        console.log('Sincronización exitosa:', res.status);
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
        // AQUÍ USAMOS EL ICONO CREADO ARRIBA
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
    if (!this.reporte.categoria || !this.reporte.descripcion || !this.fotoCapturada) {
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