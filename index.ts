import { registerRootComponent } from 'expo';
import * as AppModule from './App';

const App: any = (AppModule as any).default ?? (AppModule as any).App;

registerRootComponent(App);
