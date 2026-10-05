import './src/themeBoot'; // palette claire / sombre : doit passer avant le chargement des écrans
import { registerRootComponent } from 'expo';
import App from './App';

// Point d'entrée explicite : fonctionne à l'identique sur Android, iOS et le web (expo start --web).
registerRootComponent(App);
