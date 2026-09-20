// Configuración dinámica de API_URL para soportar tanto desarrollo local como AWS con Nginx Reverse Proxy
const isLocalCustomPort = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') 
    && window.location.port !== '' 
    && window.location.port !== '80' 
    && window.location.port !== '443'
    && window.location.port !== '8083';

const API_URL = isLocalCustomPort ? 'http://localhost:8083' : '';
