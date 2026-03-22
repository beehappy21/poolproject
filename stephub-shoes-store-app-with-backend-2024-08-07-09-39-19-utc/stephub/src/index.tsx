import 'reset-css';
import App from './App';
import './css/index.scss';
import React from 'react';
import './assets/fonts/fonts.css';
import {Provider} from 'react-redux';
import ReactDOM from 'react-dom/client';
import {persistor, store} from './store/index';
import {PersistGate} from 'redux-persist/integration/react';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement,
);
root.render(
  <React.StrictMode>
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <App />
      </PersistGate>
    </Provider>
  </React.StrictMode>,
);
