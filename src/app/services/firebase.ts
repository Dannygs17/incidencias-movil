import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { GoogleAuthProvider } from '@angular/fire/auth'; 

@Injectable({
  providedIn: 'root',
})
export class Firebase {

  constructor(private afAuth: AngularFireAuth) { }

  loginWithGoogle() {
    const provider = new GoogleAuthProvider();
    
    // --- LÍNEA AGREGADA: Fuerza a Google a preguntar qué cuenta usar ---
    provider.setCustomParameters({ prompt: 'select_account' });
    
    return this.afAuth.signInWithPopup(provider);
  }

  // Cierra la sesión activa de Google en el navegador
  signOut() {
    return this.afAuth.signOut();
  }
}