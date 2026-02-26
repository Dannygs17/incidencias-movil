import { Component, OnInit, AfterViewInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';
import { addIcons } from 'ionicons';
import { cameraOutline, locationOutline, map, locate, send, trashOutline } from 'ionicons/icons';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';

import * as L from 'leaflet';

const iconRetinaUrl = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png';
const iconUrl = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png';
const shadowUrl = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png';

const iconDefault = L.icon({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = iconDefault;

@Component({
  selector: 'app-nuevo-reporte',
  templateUrl: './nuevo-reporte.page.html',
  styleUrls: ['./nuevo-reporte.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, HttpClientModule]
})
export class NuevoReportePage implements OnInit, AfterViewInit {

  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8000/api/incidencias';

  reporte = {
    categoria: '',
    descripcion: '',
    latitud: 0,
    longitud: 0
  };

  fotoCapturada: string | undefined;
  map: L.Map | undefined;
  marker: L.Marker | undefined;

  constructor() {
    addIcons({ cameraOutline, locationOutline, map, locate, send, trashOutline });
  }

  ngOnInit() {}

  async ngAfterViewInit() {
    setTimeout(() => {
      this.initMap();
    }, 500);
  }

  async initMap() {
    try {
      // 1. FORZAMOS EL USO DE GPS REAL CON OPCIONES
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true, // Fuerza a usar el chip GPS en celulares
        timeout: 10000,           // Si tarda más de 10 seg, lanza error
        maximumAge: 0             // No usa caché viejo
      });
      
      this.reporte.latitud = position.coords.latitude;
      this.reporte.longitud = position.coords.longitude;

    } catch (error) {
      console.warn('GPS falló o tardó mucho, usando coordenadas de respaldo', error);
      // 2. COORDENADAS DE RESPALDO (Poza Rica) PARA QUE EL MAPA NO SE ROMPA
      this.reporte.latitud = 20.5333;
      this.reporte.longitud = -97.4500;
    }

    // Inicializamos el mapa con la ubicación obtenida (o la de respaldo)
    if (!this.map) {
      this.map = L.map('mapa-leaflet').setView(
        [this.reporte.latitud, this.reporte.longitud], 
        16
      );

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(this.map);
    }

    this.actualizarMarcador(this.reporte.latitud, this.reporte.longitud);
  }

  actualizarMarcador(lat: number, lng: number) {
    if (this.map) {
      if (this.marker) {
        this.marker.setLatLng([lat, lng]);
      } else {
        // 3. HACEMOS EL MARCADOR ARRASTRABLE (draggable: true)
        this.marker = L.marker([lat, lng], { draggable: true })
          .addTo(this.map)
          .bindPopup(' Arrastra el pin a la ubicación exacta')
          .openPopup();

        // Escuchamos el evento cuando el usuario suelta el pin
        this.marker.on('dragend', (event) => {
          const nuevaPosicion = event.target.getLatLng();
          this.reporte.latitud = nuevaPosicion.lat;
          this.reporte.longitud = nuevaPosicion.lng;
          console.log('Nueva ubicación manual:', this.reporte.latitud, this.reporte.longitud);
        });
      }
      this.map.setView([lat, lng]);
    }
  }

  async centrarMapa() {
    try {
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      });
      this.reporte.latitud = position.coords.latitude;
      this.reporte.longitud = position.coords.longitude;

      if (this.map) {
        this.map.flyTo([this.reporte.latitud, this.reporte.longitud], 18);
        this.actualizarMarcador(this.reporte.latitud, this.reporte.longitud);
      }
    } catch (e) {
      alert('No pudimos acceder a tu GPS. Por favor, mueve el pin manualmente en el mapa.');
    }
  }

  async tomarFoto() {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Prompt
      });
      this.fotoCapturada = image.dataUrl;
    } catch (error) {
      console.log('Error al tomar foto', error);
    }
  }

  borrarFoto() {
    this.fotoCapturada = undefined;
  }

  enviarReporte() {
    if (!this.reporte.categoria || !this.reporte.descripcion) {
      alert('Por favor, selecciona una categoría y escribe una descripción.');
      return;
    }

    const token = sessionStorage.getItem('token_seguridad');

    if (!token) {
      alert('No hay una sesión activa. Por favor, inicia sesión.');
      return;
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    const body = {
      categoria: this.reporte.categoria,
      descripcion: this.reporte.descripcion,
      latitud: this.reporte.latitud,
      longitud: this.reporte.longitud,
      imagen: this.fotoCapturada 
    };

    console.log('Enviando reporte con token...', body);

    this.http.post(this.apiUrl, body, { headers }).subscribe({
      next: (response: any) => {
        console.log('Respuesta de Laravel:', response);
        alert('¡Reporte enviado con éxito!');
        
        this.reporte.descripcion = '';
        this.fotoCapturada = undefined;
      },
      error: (error) => {
        console.error('Error al enviar:', error);
        if (error.status === 401) {
          alert('Tu sesión ha expirado. Inicia sesión de nuevo.');
        } else {
          alert('Error al conectar con el servidor.');
        }
      }
    });
  }
}