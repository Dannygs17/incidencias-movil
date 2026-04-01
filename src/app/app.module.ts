import { NgModule, LOCALE_ID } from '@angular/core'; // <--- MODIFICADO: Agregamos LOCALE_ID
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { AuthInterceptor } from './interceptors/auth.interceptor'; 

import { IonicModule, IonicRouteStrategy } from '@ionic/angular';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';

// --- NUEVAS IMPORTACIONES DE FIREBASE ---
import { AngularFireModule } from '@angular/fire/compat';
import { AngularFireAuthModule } from '@angular/fire/compat/auth';
import { environment } from '../environments/environment'; 
// -----------------------------------------

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule, 
    IonicModule.forRoot(), 
    AppRoutingModule,
    HttpClientModule,
    
    // --- CONFIGURACIÓN DE FIREBASE ---
    AngularFireModule.initializeApp(environment.firebase),
    AngularFireAuthModule
    // ---------------------------------
  ],
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true 
    },
    // --- NUEVO: Proveedor para idioma español ---
    { provide: LOCALE_ID, useValue: 'es' }
    // --------------------------------------------
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}