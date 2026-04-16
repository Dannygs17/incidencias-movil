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
  reportesFiltrados: any[] = [];
  filtroActual: string = 'todos';
  cargando: boolean = true; 

  // CONTROL DE CONTEOS
  conteos = { todos: 0, activos: 0, resueltos: 0 };

  isModalOpen = false;
  reporteSeleccionado: any = null;

  constructor(
    private router: Router,
    private authService: AuthService,
    private incidenciaService: IncidenciaService
  ) {}

  ionViewWillEnter() {
    // CAMBIO CLAVE: Solo activamos la animación visual si la lista está completamente vacía
    if (this.misReportes.length === 0) {
      this.cargando = true; 
    }

    this.authService.verificarEstatus().subscribe({
      next: (res: any) => {
        // Llama a los reportes. Si ya hay datos, los actualizará silenciosamente.
        this.cargarReportes();
      },
      error: (err: any) => {
        console.log('Error de verificación', err);
        this.cargando = false;
      }
    });
  }

  cargarReportes(event?: any) {
    // CAMBIO CLAVE: Solo activamos la animación si no es un "refresh manual" y no hay datos previos
    if (!event && this.misReportes.length === 0) {
      this.cargando = true;
    }

    this.incidenciaService.getMisReportes().subscribe({
      next: (res: any) => {
        this.misReportes = res;
        
        // CÁLCULO DINÁMICO DE CONTEOS
        this.conteos.todos = res.length;
        this.conteos.activos = res.filter((r: any) => r.estado !== 'resuelto').length;
        this.conteos.resueltos = res.filter((r: any) => r.estado === 'resuelto').length;

        this.filtrar(); 
        this.cargando = false; 
        
        // Apaga la ruedita de carga si el usuario jaló la pantalla hacia abajo
        if (event) {
          event.target.complete();
        }
      },
      error: (err: any) => {
        console.error('Error al cargar reportes', err);
        this.cargando = false;
        if (event) {
          event.target.complete();
        }
      }
    });
  }

  filtrar() {
    if (this.filtroActual === 'todos') {
      this.reportesFiltrados = [...this.misReportes];
    } else if (this.filtroActual === 'activos') {
      this.reportesFiltrados = this.misReportes.filter(r => r.estado !== 'resuelto');
    } else if (this.filtroActual === 'resueltos') {
      this.reportesFiltrados = this.misReportes.filter(r => r.estado === 'resuelto');
    }
  }

  abrirDetalles(reporte: any) {
    this.reporteSeleccionado = reporte;
    this.isModalOpen = true;
  }

  cerrarModal() {
    this.isModalOpen = false;
    setTimeout(() => {
      this.reporteSeleccionado = null;
    }, 300);
  }

  getColorEstado(estado: string): string {
    switch (estado?.toLowerCase()) {
      case 'pendiente': return 'danger';    
      case 'en proceso': return 'warning';  
      case 'resuelto': return 'success';    
      default: return 'medium';            
    }
  }

  cerrarSesion() {
    this.authService.logout().subscribe({
      next: (res: any) => {
        this.router.navigate(['/login']);
      },
      error: (err: any) => {
        localStorage.clear();
        this.router.navigate(['/login']);
      }
    });
  }
}