import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router'; 
import { AuthService } from 'src/app/services/auth.service';
import { IncidenciaService } from '../services/incidencia.service';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class HomePage {

  misReportes: any[] = []; 
  
  // --- VARIABLES PARA EL MODAL ---
  isModalOpen = false;
  reporteSeleccionado: any = null;

  constructor(
    private router: Router,
    private authService: AuthService,
    private incidenciaService: IncidenciaService 
  ) {}

  ionViewWillEnter() {
    this.authService.verificarEstatus().subscribe({
      next: (res) => {
        this.cargarReportes(); 
      },
      error: (err) => {
        console.log('Error de verificación');
      }
    });
  }

  cargarReportes(event?: any) {
    this.incidenciaService.getMisReportes().subscribe({
      next: (res: any) => {
        this.misReportes = res; 
        if (event) event.target.complete(); 
      },
      error: (err) => {
        console.error('Error al cargar reportes', err);
        if (event) event.target.complete();
      }
    });
  }

  // --- FUNCIONES DEL MODAL ---
  abrirDetalles(reporte: any) {
    this.reporteSeleccionado = reporte;
    this.isModalOpen = true; // Abre la ventana emergente
  }

  cerrarModal() {
    this.isModalOpen = false; // Cierra la ventana emergente
    setTimeout(() => {
      this.reporteSeleccionado = null;
    }, 300);
  }

  // --- FUNCIONES DE DISEÑO ---
  getColorEstado(estado: string): string {
    switch (estado?.toLowerCase()) {
      case 'pendiente': return 'danger';    
      case 'en proceso': return 'warning';  
      case 'resuelto': return 'success';    
      default: return 'medium';            
    }
  }

  getIconoCategoria(categoria: string): string {
    switch (categoria?.toLowerCase()) {
      case 'agua': return 'water-outline';
      case 'alumbrado': return 'bulb-outline';
      case 'bacheo': return 'construct-outline'; 
      case 'basura': return 'trash-outline';
      default: return 'clipboard-outline';
    }
  }

  getColorCategoria(categoria: string): string {
    switch (categoria?.toLowerCase()) {
      case 'agua': return 'primary';      
      case 'alumbrado': return 'warning'; 
      case 'bacheo': return 'medium';     
      case 'basura': return 'success';    
      default: return 'dark';
    }
  }

  cerrarSesion() {
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/login']);
      },
      error: (err) => {
        sessionStorage.clear();
        this.router.navigate(['/login']);
      }
    });
  }
}