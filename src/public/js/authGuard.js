/**
 * Auth Guard & Security Interceptor
 * Arquitectura de Autenticación y Protección de Rutas en Frontend
 */

(function () {
    // Configuración base de API si no estuviese cargada
    const BASE_URL = typeof API_URL !== 'undefined' ? API_URL : '';

    /**
     * Guardia de Ruta Inmediato:
     * Verifica que exista el token en localStorage y lo valida con el backend.
     * Si no está autenticado, redirige de inmediato a login.html.
     */
    async function verifySession() {
        const token = localStorage.getItem('token');

        if (!token) {
            console.warn('Token no encontrado en localStorage. Redirigiendo al login...');
            window.location.replace('./login.html');
            return null;
        }

        try {
            const response = await fetch(`${BASE_URL}/apis/`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.status === 401 || response.status === 403 || !response.ok) {
                console.warn('Acceso no autorizado o sesión expirada. Redirigiendo al login...');
                localStorage.clear();
                window.location.replace('./login.html');
                return null;
            }

            const data = await response.json();
            window.currentUser = data.data || data;
            
            // Disparar evento personalizado para que otras vistas puedan reaccionar con el usuario ya autenticado
            window.dispatchEvent(new CustomEvent('auth:userReady', { detail: window.currentUser }));
            return window.currentUser;
        } catch (error) {
            console.error('Error de red al validar la sesión:', error);
            localStorage.clear();
            window.location.replace('./login.html');
            return null;
        }
    }

    /**
     * Helper global para obtener encabezados con el token Bearer
     */
    window.getAuthHeaders = function (extraHeaders = {}) {
        const token = localStorage.getItem('token');
        return {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            ...extraHeaders
        };
    };

    /**
     * Interceptor Global para peticiones HTTP
     * Centraliza el manejo de 401/403 para expulsar sesiones caducadas.
     */
    window.handleApiResponse = async function (response) {
        if (response.status === 401 || response.status === 403) {
            console.warn('Respuesta 401/403 detectada en petición API. Redirigiendo a login...');
            localStorage.clear();
            window.location.replace('./login.html');
            throw new Error('Sesión expirada o no autorizada');
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Error en la petición: ${response.statusText}`);
        }

        return response.json();
    };

    /**
     * Función Idempotente y Resiliente de Cierre de Sesión
     */
    window.logoutUser = async function () {
        try {
            const token = localStorage.getItem('token');
            await fetch(`${BASE_URL}/apis/logout`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                }
            });
        } catch (err) {
            console.warn('Advertencia en llamada al endpoint de logout:', err);
        } finally {
            // Limpieza preventiva de almacenamiento local/sesión
            sessionStorage.clear();
            localStorage.clear();
            window.location.replace('./login.html');
        }
    };

    // Ejecutar verificación de sesión inmediatamente
    verifySession();

    // Vincular automáticamente botones de logout cuando el DOM esté listo
    document.addEventListener('DOMContentLoaded', () => {
        const logoutButtons = document.querySelectorAll('#logout-button, .btn-logout, [data-action="logout"]');
        logoutButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                window.logoutUser();
            });
        });
    });
})();
