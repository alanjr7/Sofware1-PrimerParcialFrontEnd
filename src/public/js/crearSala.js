document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('logout-button');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function (e) { 
            e.preventDefault();
            if (typeof window.logoutUser === 'function') {
                window.logoutUser();
            } else {
                window.location.replace('./login.html');
            }
        });
    }
});

document.getElementById('create-room-form').addEventListener('submit', async function (event) {
    event.preventDefault();
    const title = document.getElementById('title').value;
    const xml = document.getElementById('xml').value;
    const description = document.getElementById('description').value;
    
    if (!title.trim()) {
        alert('Por favor, ingresa el título de la sala.');
        return;
    }

    const roomData = {
        title: title.trim(),
        xml: xml.trim(),
        description: description.trim()
    };

    try {
        const response = await fetch(`${API_URL}/apis/sala/`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(roomData)
        });
        if (response.status === 401 || response.status === 403) {
            window.location.replace('./login.html');
            return;
        }

        if (response.ok) {
            alert('Sala creada exitosamente.');
            window.location.href = './dashboard.html';
        } else {
            const errorData = await response.json().catch(() => ({}));
            alert('Error al crear sala: ' + (errorData.message || response.statusText));
        }
    } catch (error) {
        console.error('Error en la solicitud:', error);
        alert('Error en la solicitud: ' + error.message);
    }
});
