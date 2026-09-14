let t = 0;
let canvas = document.querySelector('canvas');
let plano2D = canvas ? canvas.getContext('2d') : null;

let video = document.querySelector('#video');

function resizeCanvas() {
    if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
}

if (canvas) {
    resizeCanvas();
}

function draw() {
    if (!canvas || !plano2D) return;
    plano2D.fillStyle = 'hsla(0,0%,0%,.1)';
    plano2D.fillRect(0, 0, canvas.width, canvas.height);
    let f, r;
    f = Math.sin(t) * 6;
    for (let i = 0; i < 500; ++i) {
        r = 400 * Math.sin(i * f);
        plano2D.fillStyle = 'hsla(' + (i + 12) + ',100%,60%,1)';
        plano2D.beginPath();
        plano2D.arc(
            Math.sin(i) * r + (canvas.width / 2),
            Math.cos(i) * r + (canvas.height / 2),
            1.5, 0, Math.PI * 2
        );
        plano2D.fill();
    }
    t += 0.000005;
}

function playVideo() {
    if (video) {
        video.play();
    }
}

window.addEventListener('load', playVideo);

function correr() {
    if (!canvas) return;
    window.requestAnimationFrame(correr);
    draw();
}

if (canvas) {
    window.addEventListener('resize', resizeCanvas);
    correr();
}

// ===== FUNCIONALIDAD DE REGISTRO =====
document.addEventListener('DOMContentLoaded', function() {
    const registrationForm = document.getElementById('registration-form');
    
    if (registrationForm) {
        registrationForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            // Validaciones básicas
            if (!name || !email || !password) {
                alert('Por favor, completa todos los campos');
                return;
            }

            if (password.length < 6) {
                alert('La contraseña debe tener al menos 6 caracteres');
                return;
            }

            try {
                console.log('Enviando registro a:', `${API_URL}/apis/register`);
                console.log('Datos:', { name, email, password: '***' });

                const response = await fetch(`${API_URL}/apis/register`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ name, email, password }),
                    credentials: 'include'
                });

                console.log('Respuesta HTTP:', response.status);
                const responseData = await response.json();
                console.log('Respuesta del servidor:', responseData);

                if (response.ok) {
                    alert('Registro exitoso. Redirigiendo al dashboard...');
                    window.location.href = './dashboard.html'; 
                } else {
                    alert(`Error en el registro: ${responseData.message || 'Error desconocido'}`);
                }
            } catch (error) {
                console.error('Error en la solicitud de registro:', error);
                alert('Error de conexión. Verifica que el servidor esté funcionando.');
            }
        });
    }
});
