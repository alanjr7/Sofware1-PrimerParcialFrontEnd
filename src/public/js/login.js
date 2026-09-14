/**
 * Controlador de Autenticación - Inicio de Sesión
 * Ingeniería de Software
 */

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const togglePasswordBtn = document.getElementById('toggle-password');
    const alertContainer = document.getElementById('alert-container');
    const alertMessage = document.getElementById('alert-message');
    const btnLogin = document.getElementById('btn-login');
    const btnText = document.getElementById('btn-text');

    // Alternar visibilidad de la contraseña
    if (togglePasswordBtn && passwordInput) {
        togglePasswordBtn.addEventListener('click', () => {
            const isPassword = passwordInput.getAttribute('type') === 'password';
            passwordInput.setAttribute('type', isPassword ? 'text' : 'password');
            
            // Actualizar icono SVG
            togglePasswordBtn.innerHTML = isPassword
                ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                     <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                     <line x1="1" y1="1" x2="23" y2="23"></line>
                   </svg>`
                : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                     <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                     <circle cx="12" cy="12" r="3"></circle>
                   </svg>`;
            
            togglePasswordBtn.setAttribute('title', isPassword ? 'Ocultar contraseña' : 'Mostrar contraseña');
            togglePasswordBtn.setAttribute('aria-label', isPassword ? 'Ocultar contraseña' : 'Mostrar contraseña');
        });
    }

    // Función auxiliar para mostrar alertas en interfaz
    function showAlert(message) {
        if (alertContainer && alertMessage) {
            alertMessage.textContent = message;
            alertContainer.classList.add('show');
        }
    }

    function hideAlert() {
        if (alertContainer) {
            alertContainer.classList.remove('show');
        }
    }

    // Ocultar alerta al escribir
    if (emailInput) emailInput.addEventListener('input', hideAlert);
    if (passwordInput) passwordInput.addEventListener('input', hideAlert);

    // Procesamiento del formulario de login
    if (loginForm) {
        loginForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            hideAlert();

            const email = emailInput.value.trim();
            const password = passwordInput.value;

            if (!email || !password) {
                showAlert('Por favor, ingresa tanto el correo como la contraseña.');
                return;
            }

            // Estado de carga en el botón
            btnLogin.disabled = true;
            btnText.textContent = 'Iniciando sesión...';

            try {
                const response = await fetch(`${API_URL}/apis/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email, password }),
                    credentials: 'include'
                });

                if (response.ok) {
                    const data = await response.json().catch(() => ({}));
                    const user = data.data?.user || data.user || data.data;
                    if (user && user.name) {
                        localStorage.setItem('userName', user.name);
                        localStorage.setItem('userId', user.id);
                        if (user.email) localStorage.setItem('userEmail', user.email);
                    }
                    window.location.href = './dashboard.html';
                } else {
                    const errorData = await response.json().catch(() => ({}));
                    const msg = errorData.message || 'Credenciales inválidas o error de autenticación.';
                    showAlert(msg);
                }
            } catch (error) {
                console.error('Error en la conexión con el servidor:', error);
                showAlert('No se pudo conectar con el servidor. Verifica que el backend esté en ejecución.');
            } finally {
                btnLogin.disabled = false;
                btnText.textContent = 'Iniciar Sesión';
            }
        });
    }
});