let currentActiveUser = null;
let currentJitsiApi = null;
let currentView = 'my-rooms'; // 'my-rooms' | 'shared-rooms' | 'meetings'

function initDashboard() {
    fetchUserInfo();
    fetchRooms();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDashboard);
} else {
    initDashboard();
}

document.getElementById('logout-button')?.addEventListener('click', function (e) {
    e.preventDefault();
    if (typeof window.logoutUser === 'function') {
        window.logoutUser();
    } else {
        window.location.replace('./login.html');
    }
});

function fetchUserInfo() {
    fetch(`${API_URL}/apis/`, {
        method: 'GET',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
        },
    })
    .then(handleResponse)
    .then(data => {
        if (!data.error && data.data) {
            currentActiveUser = data.data;
            if (data.data.name) localStorage.setItem('userName', data.data.name);
            if (data.data.id) localStorage.setItem('userId', data.data.id);
            if (data.data.email) localStorage.setItem('userEmail', data.data.email);
            const userInfo = `
                <div class="user-info-chip">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                    <strong>Usuario:</strong> ${escapeHtml(data.data.name)}
                </div>
                <div class="user-info-chip">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                    <strong>Email:</strong> ${escapeHtml(data.data.email)}
                </div>
                <div class="user-info-chip">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="16" rx="2"></rect><line x1="7" y1="8" x2="17" y2="8"></line><line x1="7" y1="12" x2="17" y2="12"></line><line x1="7" y1="16" x2="11" y2="16"></line></svg>
                    <strong>ID:</strong> #${data.data.id}
                </div>
                <div class="sync-status-badge">
                    <span class="sync-status-dot"></span>
                    <span>Conectado</span>
                </div>
            `;
            document.getElementById('user-info').innerHTML = userInfo;
        } else {
            document.getElementById('user-info').innerHTML = '<span class="user-info-chip">Sesión no disponible</span>';
        }
    })
    .catch(error => {
        console.error('Hubo un problema con la operación fetch:', error);
        document.getElementById('user-info').innerHTML = '<span class="user-info-chip">Error al sincronizar perfil</span>';
    });
}

function updateTableHeader(type) {
    const thead = document.getElementById('rooms-thead');
    const titleElem = document.getElementById('section-view-title');

    if (type === 'meetings') {
        if (titleElem) titleElem.textContent = 'Reuniones Online Programadas (Jitsi Meet)';
        if (thead) {
            thead.innerHTML = `
                <tr>
                    <th style="width: 80px;">ID</th>
                    <th style="width: 260px;">Título de Reunión</th>
                    <th style="width: 190px;">Fecha y Hora</th>
                    <th>Pizarra / Agenda / Invitados</th>
                    <th style="width: 260px; text-align: right;">Acciones</th>
                </tr>
            `;
        }
    } else {
        if (titleElem) {
            titleElem.textContent = type === 'shared' ? 'Salas Compartidas Conmigo' : 'Salas de Trabajo Activas';
        }
        if (thead) {
            thead.innerHTML = `
                <tr>
                    <th style="width: 100px;">ID</th>
                    <th style="width: 280px;">Nombre del Proyecto</th>
                    <th>Descripción / Alcance</th>
                    <th style="width: 260px; text-align: right;">Acciones</th>
                </tr>
            `;
        }
    }
}

// ----------------------------------------------------
// Gestión de Salas Creadas y Compartidas
// ----------------------------------------------------
function fetchRooms() {
    currentView = 'my-rooms';
    updateTableHeader('my-rooms');

    fetch(`${API_URL}/apis/sala`, {
        method: 'GET',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
        },
    })
    .then(handleResponse)
    .then(data => {
        const roomsBody = document.getElementById('rooms-body');
        roomsBody.innerHTML = '';
    
        if (!data.error && data.data && data.data.length > 0) {
            const countElem = document.getElementById('rooms-count');
            if (countElem) countElem.textContent = `${data.data.length} salas`;

            data.data.forEach(room => {
                const row = createRoomRow(room);
                roomsBody.appendChild(row);
            });            
        } else {
            const countElem = document.getElementById('rooms-count');
            if (countElem) countElem.textContent = `0 salas`;
            roomsBody.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align: center; padding: 32px; color: var(--text-muted);">
                        No se encontraron salas creadas. ¡Crea una nueva sala para comenzar!
                    </td>
                </tr>
            `;
        }
    })
    .catch(error => {
        console.error('Hubo un problema con la operación fetch para salas:', error);
        const roomsBody = document.getElementById('rooms-body');
        roomsBody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 24px; color: var(--danger);">Error al cargar las salas.</td></tr>';
    });
}

function fetchSharedRooms() {
    currentView = 'shared-rooms';
    updateTableHeader('shared');

    fetch(`${API_URL}/apis/userSala/`, {
        method: 'GET',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
        },
    })
    .then(handleResponse)
    .then(data => {
        const roomsBody = document.getElementById('rooms-body');
        roomsBody.innerHTML = '';

        if (!data.error && data.data && data.data.length > 0) {
            const countElem = document.getElementById('rooms-count');
            if (countElem) countElem.textContent = `${data.data.length} compartidas`;

            data.data.forEach(room => {
                const id = encodeURIComponent(room.id);
                const title = encodeURIComponent(room.title || 'Sala Compartida');
                const description = encodeURIComponent(room.description || '');

                const url = `pizarra.html?id=${id}&title=${title}&description=${description}`;

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td><span class="room-id-badge">#${room.id}</span></td>
                    <td>
                        <a href="${url}" class="room-title-link">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                            ${escapeHtml(room.title || 'Sala Compartida')}
                        </a>
                    </td>
                    <td><span class="room-desc-text">${escapeHtml(room.description || 'Sin descripción')}</span></td>
                    <td class="room-actions-cell" style="text-align: right;">
                        <a href="${url}" class="action-button open-button">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                            Abrir Pizarra
                        </a>
                    </td>
                `;
                roomsBody.appendChild(row);
            });   
        } else {
            const countElem = document.getElementById('rooms-count');
            if (countElem) countElem.textContent = `0 compartidas`;
            roomsBody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 32px; color: var(--text-muted);">No tienes salas compartidas por otros usuarios actualmente.</td></tr>';
        }
    })
    .catch(error => {
        console.error('Hubo un problema con la operación fetch para salas compartidas:', error);
        const roomsBody = document.getElementById('rooms-body');
        roomsBody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 24px; color: var(--danger);">Error al cargar las salas compartidas.</td></tr>';
    });
}

function createRoomRow(room) {
    const row = document.createElement('tr');
    row.innerHTML = `
        <td><span class="room-id-badge">#${room.id}</span></td>
        <td>
            <a href="pizarra.html?id=${room.id}" class="room-title-link">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                ${escapeHtml(room.title || 'Sala Sin Título')}
            </a>
        </td>
        <td><span class="room-desc-text">${escapeHtml(room.description || 'Sin descripción técnica')}</span></td>
        <td class="room-actions-cell" style="text-align: right;">
            <div class="action-buttons-group">
                <a href="pizarra.html?id=${room.id}" class="action-button open-button" title="Abrir Pizarra de Modelado">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                    Abrir
                </a>
                <button class="action-button edit-button" onclick="editRoom(${room.id})" title="Editar Metadatos de Sala">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    Editar
                </button>
                <button class="action-button invite-button" onclick="inviteToRoom(${room.id})" title="Invitar Usuarios">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>
                    Invitar
                </button>
                <button class="action-button delete-button" onclick="deleteRoom(${room.id})" title="Eliminar Sala">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    Eliminar
                </button>
            </div>
        </td>
    `;
    return row;
}

// ----------------------------------------------------
// Gestión de Reuniones Online con Jitsi Meet
// ----------------------------------------------------
function fetchMeetings() {
    currentView = 'meetings';
    updateTableHeader('meetings');

    fetch(`${API_URL}/apis/reuniones`, {
        method: 'GET',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
        },
    })
    .then(handleResponse)
    .then(data => {
        const roomsBody = document.getElementById('rooms-body');
        roomsBody.innerHTML = '';

        if (!data.error && data.data) {
            const creadas = data.data.creadas || [];
            const invitadas = data.data.invitadas || [];
            const todas = [...creadas, ...invitadas];

            const countElem = document.getElementById('rooms-count');
            if (countElem) countElem.textContent = `${todas.length} reuniones`;

            if (todas.length > 0) {
                todas.forEach(reunion => {
                    const isOwner = currentActiveUser && reunion.userId === currentActiveUser.id;
                    const row = createMeetingRow(reunion, isOwner);
                    roomsBody.appendChild(row);
                });
            } else {
                roomsBody.innerHTML = `
                    <tr>
                        <td colspan="5" style="text-align: center; padding: 36px; color: var(--text-muted);">
                            No tienes reuniones programadas actualmente. ¡Haz clic en "Programar Reunión" para crear una!
                        </td>
                    </tr>
                `;
            }
        }
    })
    .catch(error => {
        console.error('Error al cargar reuniones:', error);
        const roomsBody = document.getElementById('rooms-body');
        roomsBody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 24px; color: var(--danger);">Error al cargar reuniones.</td></tr>';
    });
}

function createMeetingRow(reunion, isOwner) {
    const row = document.createElement('tr');
    const fechaObj = new Date(reunion.fecha_reunion);
    const fechaFormateada = fechaObj.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
    const horaFormateada = fechaObj.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit'
    });

    const isToday = fechaObj.toDateString() === new Date().toDateString();
    const statusBadge = isToday
        ? `<span class="meeting-status-badge meeting-status-today">Hoy</span>`
        : `<span class="meeting-status-badge meeting-status-upcoming">Programada</span>`;

    const salaInfo = reunion.sala_id && reunion.salaTitulo
        ? `<div style="margin-top:4px; font-size:12px; color:var(--brand-primary);">
             <a href="pizarra.html?id=${reunion.sala_id}" style="color:inherit; text-decoration:underline;">
               📐 Pizarra: ${escapeHtml(reunion.salaTitulo)}
             </a>
           </div>`
        : '';

    const invitadosList = Array.isArray(reunion.invitados) && reunion.invitados.length > 0
        ? `<div style="margin-top:4px; font-size:11px; color:var(--text-muted);">
             👥 ${reunion.invitados.length} invitado(s): ${reunion.invitados.map(i => escapeHtml(i.name)).join(', ')}
           </div>`
        : '<div style="margin-top:4px; font-size:11px; color:var(--text-muted);">👥 Sin invitados aún</div>';

    const creadorBadge = isOwner
        ? `<span style="font-size:11px; color:#10b981; font-weight:600;">(Organizador: Tú)</span>`
        : `<span style="font-size:11px; color:#6366f1; font-weight:600;">(Por: ${escapeHtml(reunion.creadorNombre || 'Usuario')})</span>`;

    row.innerHTML = `
        <td><span class="room-id-badge">#${reunion.id}</span></td>
        <td>
            <div style="font-weight: 600; color: var(--text-primary); font-size: 14px;">
                ${escapeHtml(reunion.title)}
            </div>
            <div style="margin-top: 2px;">
                ${creadorBadge} ${statusBadge}
            </div>
        </td>
        <td>
            <div class="meeting-date-badge">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                ${fechaFormateada} - ${horaFormateada}
            </div>
        </td>
        <td>
            <span class="room-desc-text">${escapeHtml(reunion.description || 'Reunión colaborativa de arquitectura')}</span>
            ${salaInfo}
            ${invitadosList}
        </td>
        <td class="room-actions-cell" style="text-align: right;">
            <div class="action-buttons-group">
                <button class="action-button meeting-join-btn" onclick="startJitsiMeeting('${reunion.jitsi_room_name}', '${escapeHtml(reunion.title)}')" title="Unirse a la llamada Jitsi">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
                    Unirse
                </button>
                <button class="action-button invite-button" onclick="openInviteToMeetingModal(${reunion.id}, '${escapeHtml(reunion.title)}')" title="Invitar más usuarios">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>
                    Invitar
                </button>
                ${isOwner ? `
                    <button class="action-button delete-button" onclick="deleteMeeting(${reunion.id})" title="Cancelar Reunión">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        Cancelar
                    </button>
                ` : ''}
            </div>
        </td>
    `;
    return row;
}

function openScheduleMeetingModal() {
    const overlay = document.getElementById('meeting-overlay');
    if (!overlay) return;
    overlay.style.display = 'flex';
    document.getElementById('main-content')?.classList.add('blur');

    // Inicializar fecha y hora sugerida (+15 min)
    const now = new Date(Date.now() + 15 * 60 * 1000);
    const tzOffset = now.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(now - tzOffset)).toISOString().slice(0, 16);
    const dateInput = document.getElementById('meeting-datetime');
    if (dateInput) dateInput.value = localISOTime;

    // Cargar salas existentes del usuario para el select de vinculación
    const salaSelect = document.getElementById('meeting-sala-select');
    if (salaSelect) {
        salaSelect.innerHTML = '<option value="">-- Sin pizarra vinculada --</option>';
        fetch(`${API_URL}/apis/sala`, {
            method: 'GET',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
        })
        .then(handleResponse)
        .then(data => {
            if (data.data && data.data.length > 0) {
                data.data.forEach(s => {
                    const opt = document.createElement('option');
                    opt.value = s.id;
                    opt.textContent = `#${s.id} - ${s.title}`;
                    salaSelect.appendChild(opt);
                });
            }
        })
        .catch(err => console.error('Error al cargar salas para reunión:', err));
    }

    // Cargar colaboradores disponibles con checkboxes
    const usersListContainer = document.getElementById('meeting-users-list');
    if (usersListContainer) {
        usersListContainer.innerHTML = '<span style="color:var(--text-muted); font-size:12px;">Cargando colaboradores...</span>';

        fetch(`${API_URL}/apis/notEmail`, {
            method: 'GET',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
        })
        .then(handleResponse)
        .then(data => {
            usersListContainer.innerHTML = '';
            if (data.data && data.data.length > 0) {
                data.data.forEach(user => {
                    const item = document.createElement('label');
                    item.className = 'user-check-item';
                    item.innerHTML = `
                        <input type="checkbox" value="${user.id}" class="meeting-invite-checkbox">
                        <span><strong>${escapeHtml(user.name)}</strong> (${escapeHtml(user.email || 'Colaborador')})</span>
                    `;
                    usersListContainer.appendChild(item);
                });
            } else {
                usersListContainer.innerHTML = '<span style="color:var(--text-muted); font-size:12px;">No hay otros usuarios registrados en el sistema.</span>';
            }
        })
        .catch(err => {
            console.error('Error al cargar usuarios:', err);
            usersListContainer.innerHTML = '<span style="color:var(--danger); font-size:12px;">Error al cargar usuarios.</span>';
        });
    }
}

function closeScheduleMeetingModal() {
    const overlay = document.getElementById('meeting-overlay');
    if (overlay) overlay.style.display = 'none';
    document.getElementById('main-content')?.classList.remove('blur');
}

function closeInviteMeetingModal() {
    const overlay = document.getElementById('invite-meeting-overlay');
    if (overlay) overlay.style.display = 'none';
    document.getElementById('main-content')?.classList.remove('blur');
}

async function saveScheduleMeeting() {
    const title = document.getElementById('meeting-title').value.trim();
    const description = document.getElementById('meeting-description').value.trim();
    const fecha_reunion = document.getElementById('meeting-datetime').value;
    const sala_id = document.getElementById('meeting-sala-select').value;

    if (!title) {
        alert('Por favor introduce un título para la reunión.');
        document.getElementById('meeting-title').focus();
        return;
    }
    if (!fecha_reunion) {
        alert('Por favor selecciona la fecha y hora de la reunión.');
        document.getElementById('meeting-datetime').focus();
        return;
    }

    const selectedCheckboxes = document.querySelectorAll('.meeting-invite-checkbox:checked');
    const invitados = Array.from(selectedCheckboxes).map(cb => parseInt(cb.value, 10));

    try {
        const response = await fetch(`${API_URL}/apis/reuniones`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                title,
                description,
                fecha_reunion: new Date(fecha_reunion).toISOString(),
                sala_id: sala_id ? parseInt(sala_id, 10) : null,
                invitados
            })
        });

        const data = await handleResponse(response);

        if (!data.error) {
            alert('¡Reunión programada exitosamente!');
            closeScheduleMeetingModal();
            
            // Limpiar formulario
            document.getElementById('meeting-title').value = '';
            document.getElementById('meeting-description').value = '';

            // Mostrar la lista de reuniones actualizada
            fetchMeetings();
        } else {
            alert(`Error: ${data.message}`);
        }
    } catch (error) {
        console.error('Error al programar reunión:', error);
        alert(`Error al registrar la reunión: ${error.message}`);
    }
}

function openInviteToMeetingModal(meetingId, meetingTitle) {
    const overlay = document.getElementById('invite-meeting-overlay');
    if (!overlay) return;
    overlay.style.display = 'flex';
    document.getElementById('main-content')?.classList.add('blur');
    
    const label = document.getElementById('invite-meeting-title-label');
    if (label) label.textContent = `Reunión: ${meetingTitle}`;

    const userSelect = document.getElementById('meeting-user-select');
    userSelect.innerHTML = '<option disabled selected>Cargando usuarios...</option>';

    fetch(`${API_URL}/apis/notEmail`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
    })
    .then(handleResponse)
    .then(data => {
        userSelect.innerHTML = '';
        if (data.data && data.data.length > 0) {
            data.data.forEach(user => {
                const opt = document.createElement('option');
                opt.value = user.id;
                opt.textContent = `${user.name} (${user.email || 'Colaborador'})`;
                userSelect.appendChild(opt);
            });
        } else {
            userSelect.innerHTML = '<option disabled>No hay más usuarios disponibles</option>';
        }
    });

    document.getElementById('confirm-invite-meeting-btn').onclick = async function() {
        const userId = userSelect.value;
        if (!userId) {
            alert('Por favor selecciona un colaborador.');
            return;
        }

        try {
            const resp = await fetch(`${API_URL}/apis/reuniones/${meetingId}/invitar`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: parseInt(userId, 10) })
            });

            if (resp.ok) {
                alert('Colaborador invitado a la reunión exitosamente.');
                closeInviteMeetingModal();
                if (currentView === 'meetings') fetchMeetings();
            } else {
                alert('No se pudo enviar la invitación.');
            }
        } catch (e) {
            alert(`Error: ${e.message}`);
        }
    };
}

async function deleteMeeting(meetingId) {
    if (confirm(`¿Estás seguro de cancelar y eliminar la reunión #${meetingId}?`)) {
        try {
            const response = await fetch(`${API_URL}/apis/reuniones/${meetingId}`, {
                method: 'DELETE',
                credentials: 'include',
            });
            if (response.ok) {
                fetchMeetings();
            } else {
                alert('No se pudo cancelar la reunión.');
            }
        } catch (error) {
            alert(`Error de red: ${error.message}`);
        }
    }
}

// ----------------------------------------------------
// Integración con Jitsi Meet External API
// ----------------------------------------------------
function startJitsiMeeting(roomName, meetingTitle) {
    const overlay = document.getElementById('jitsi-overlay');
    const container = document.getElementById('jitsi-container');
    const titleElem = document.getElementById('jitsi-meeting-title');
    const externalBtn = document.getElementById('jitsi-open-external-btn');

    if (titleElem) titleElem.textContent = meetingTitle || 'Videollamada UML Studio';
    if (overlay) overlay.style.display = 'flex';
    document.getElementById('main-content')?.classList.add('blur');

    // Configurar botón para abrir en pestaña externa
    if (externalBtn) {
        externalBtn.onclick = () => {
            window.open(`https://meet.jit.si/${roomName}`, '_blank');
        };
    }

    // Limpiar instancia previa si existe
    if (currentJitsiApi) {
        currentJitsiApi.dispose();
        currentJitsiApi = null;
    }
    if (container) container.innerHTML = '';

    if (typeof JitsiMeetExternalAPI === 'undefined') {
        if (container) {
            container.innerHTML = `
                <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; color:#ffffff; gap:16px;">
                    <p>Cargando cliente de videollamada...</p>
                    <a href="https://meet.jit.si/${roomName}" target="_blank" class="btn meeting-button">Abrir Reunión Directamente</a>
                </div>
            `;
        }
        return;
    }

    const domain = 'meet.jit.si';
    const displayName = currentActiveUser ? currentActiveUser.name : 'Usuario UML';
    const email = currentActiveUser ? currentActiveUser.email : '';

    const options = {
        roomName: roomName,
        width: '100%',
        height: '100%',
        parentNode: container,
        userInfo: {
            displayName: displayName,
            email: email
        },
        configOverwrite: {
            startWithAudioMuted: false,
            startWithVideoMuted: false,
            prejoinPageEnabled: false,
            disableDeepLinking: true
        },
        interfaceConfigOverwrite: {
            TOOLBAR_BUTTONS: [
                'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen',
                'fodeviceselection', 'hangup', 'profile', 'chat', 'recording',
                'livestreaming', 'etherpad', 'sharedvideo', 'settings', 'raisehand',
                'videoquality', 'filmstrip', 'invite', 'feedback', 'stats', 'shortcuts',
                'tileview', 'videobackgroundblur', 'download', 'help', 'mute-everyone',
                'security'
            ],
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            SHOW_BRAND_WATERMARK: false,
            DEFAULT_BACKGROUND: '#0f172a'
        }
    };

    try {
        currentJitsiApi = new JitsiMeetExternalAPI(domain, options);
        
        currentJitsiApi.addEventListeners({
            readyToClose: () => {
                closeJitsiMeeting();
            }
        });
    } catch (e) {
        console.error('Error al inicializar Jitsi Meet:', e);
        if (container) {
            container.innerHTML = `<p style="color:white; padding:20px;">Error al cargar la videollamada: ${e.message}</p>`;
        }
    }
}

function closeJitsiMeeting() {
    if (currentJitsiApi) {
        currentJitsiApi.dispose();
        currentJitsiApi = null;
    }
    const container = document.getElementById('jitsi-container');
    if (container) container.innerHTML = '';
    
    const overlay = document.getElementById('jitsi-overlay');
    if (overlay) overlay.style.display = 'none';
    document.getElementById('main-content')?.classList.remove('blur');
}

function toggleJitsiFullscreen() {
    const modal = document.getElementById('jitsi-modal-container');
    if (!document.fullscreenElement) {
        modal?.requestFullscreen?.().catch(err => {
            console.error(`Error al intentar pantalla completa: ${err.message}`);
        });
    } else {
        document.exitFullscreen?.();
    }
}

function handleResponse(response) {
    if (response.status === 401 || response.status === 403) {
        window.location.replace('./login.html');
        throw new Error('Sesión expirada o no autorizada');
    }
    if (!response.ok) {
        throw new Error('Network response was not ok: ' + response.statusText);
    }
    return response.json();
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// ==========================================
// GESTIÓN DE PERFIL DE USUARIO
// ==========================================
function openProfileModal() {
    const overlay = document.getElementById('profile-overlay');
    const mainContent = document.getElementById('main-content');
    const feedback = document.getElementById('profile-feedback');
    if (feedback) feedback.style.display = 'none';

    if (currentActiveUser) {
        const nameInput = document.getElementById('profile-name');
        const emailInput = document.getElementById('profile-email');
        if (nameInput) nameInput.value = currentActiveUser.name || '';
        if (emailInput) emailInput.value = currentActiveUser.email || '';
    }
    const passInput = document.getElementById('profile-password');
    if (passInput) passInput.value = '';

    if (overlay) overlay.style.display = 'flex';
    if (mainContent) mainContent.classList.add('blur');
}

function closeProfileModal() {
    const overlay = document.getElementById('profile-overlay');
    const mainContent = document.getElementById('main-content');
    if (overlay) overlay.style.display = 'none';
    if (mainContent) mainContent.classList.remove('blur');
}

async function saveUserProfile() {
    const nameInput = document.getElementById('profile-name');
    const emailInput = document.getElementById('profile-email');
    const passInput = document.getElementById('profile-password');
    const saveBtn = document.getElementById('save-profile-btn');

    const name = nameInput ? nameInput.value.trim() : '';
    const email = emailInput ? emailInput.value.trim() : '';
    const password = passInput ? passInput.value : '';

    if (!name || !email) {
        showProfileFeedback('Por favor completa tu nombre y correo electrónico.', 'error');
        return;
    }

    try {
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.textContent = 'Guardando...';
        }

        const bodyPayload = { name, email };
        if (password && password.trim() !== '') {
            bodyPayload.password = password;
        }

        const response = await fetch(`${API_URL}/apis/`, {
            method: 'PUT',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(bodyPayload)
        });

        const result = await response.json();

        if (response.ok && (result.success || !result.error)) {
            showProfileFeedback('¡Perfil actualizado exitosamente!', 'success');
            setTimeout(() => {
                closeProfileModal();
                fetchUserInfo();
            }, 1200);
        } else {
            showProfileFeedback(result.message || 'Error al actualizar el perfil.', 'error');
        }
    } catch (err) {
        console.error('Error al actualizar perfil:', err);
        showProfileFeedback(`Error de red: ${err.message}`, 'error');
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Guardar Cambios';
        }
    }
}

async function deleteUserAccount() {
    const confirmation = confirm('¿Estás seguro de que deseas dar de baja y eliminar tu cuenta definitivamente? Esta acción es irreversible.');
    if (!confirmation) return;

    try {
        const response = await fetch(`${API_URL}/apis/`, {
            method: 'DELETE',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const result = await response.json();
        if (response.ok) {
            alert('Tu cuenta ha sido dada de baja correctamente.');
            if (typeof window.logoutUser === 'function') {
                window.logoutUser();
            } else {
                window.location.replace('./login.html');
            }
        } else {
            alert(result.message || 'No se pudo eliminar la cuenta.');
        }
    } catch (err) {
        console.error('Error al eliminar cuenta:', err);
        alert(`Error de red: ${err.message}`);
    }
}

function showProfileFeedback(msg, type) {
    const feedback = document.getElementById('profile-feedback');
    if (!feedback) return;
    feedback.style.display = 'block';
    feedback.textContent = msg;
    if (type === 'success') {
        feedback.style.backgroundColor = '#ecfdf5';
        feedback.style.color = '#065f46';
        feedback.style.border = '1px solid #a7f3d0';
    } else {
        feedback.style.backgroundColor = '#fef2f2';
        feedback.style.color = '#991b1b';
        feedback.style.border = '1px solid #fecaca';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('profile-btn')?.addEventListener('click', (e) => {
        e.preventDefault();
        openProfileModal();
    });
});

// Exponer funciones globales en window
window.openProfileModal = openProfileModal;
window.closeProfileModal = closeProfileModal;
window.saveUserProfile = saveUserProfile;
window.deleteUserAccount = deleteUserAccount;
window.fetchRooms = fetchRooms;
window.fetchSharedRooms = fetchSharedRooms;
window.fetchMeetings = fetchMeetings;
window.startJitsiMeeting = startJitsiMeeting;
window.openInviteToMeetingModal = openInviteToMeetingModal;
window.closeInviteMeetingModal = closeInviteMeetingModal;
window.deleteMeeting = deleteMeeting;
window.closeJitsiMeeting = closeJitsiMeeting;
window.toggleJitsiFullscreen = toggleJitsiFullscreen;
window.openScheduleMeetingModal = openScheduleMeetingModal;
window.closeScheduleMeetingModal = closeScheduleMeetingModal;
window.saveScheduleMeeting = saveScheduleMeeting;
