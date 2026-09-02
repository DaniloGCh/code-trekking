import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app/app.module';

// 1. Importa la función desde @ionic/pwa-elements
import { defineCustomElements } from '@ionic/pwa-elements/loader';

// 2. Registra los elementos web de Capacitor
defineCustomElements(window);

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.log(err));