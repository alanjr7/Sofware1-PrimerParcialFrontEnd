/**
 * tourCatalog.js - Catálogo de Onboarding y Especificación Funcional
 * Enfoque: Redacción técnica, concisa y profesional para entornos corporativos.
 */

window.AGENT_TOURS = {
    // ==========================================
    // 1. DASHBOARD / PANEL DE CONTROL
    // ==========================================
    dashboard: {
        id: "tour_dashboard_v2",
        title: "Panel de Control Principal",
        steps: [
            {
                target: "#profile",
                title: "Sesión y Estado del Usuario",
                description: "Muestra la identidad del usuario autenticado y el estado de sincronización con el backend.",
                tip: "Las salas creadas y los permisos de colaboración están asociados a este perfil.",
                placement: "bottom"
            },
            {
                target: "#create-room-button",
                title: "Creación de Espacio de Trabajo",
                description: "Inicializa una nueva sala colaborativa para el modelado de diagramas UML en tiempo real.",
                tip: "Permite asignar una plantilla inicial XML o comenzar desde un lienzo en blanco.",
                placement: "bottom"
            },
            {
                target: "#view-shared-rooms-button",
                title: "Salas Compartidas con Invitación",
                description: "Filtra los proyectos en los que participas como colaborador invitado por otros miembros del equipo.",
                placement: "bottom"
            },
            {
                target: "#rooms",
                title: "Administrador de Salas y Permisos",
                description: "Tabla de gestión de salas: permite abrir la pizarra interactiva, modificar metadatos, enviar invitaciones por usuario o eliminar recursos.",
                placement: "top"
            },
            {
                target: "#logout-button",
                title: "Cierre Seguro de Sesión",
                description: "Invalida el token JWT de la sesión actual y redirige a la pantalla de autenticación.",
                placement: "left"
            }
        ]
    },

    // ==========================================
    // 2. CREACIÓN DE SALA
    // ==========================================
    crearSala: {
        id: "tour_crearsala_v2",
        title: "Parámetros de Nueva Sala",
        steps: [
            {
                target: "#title",
                title: "Nombre del Proyecto",
                description: "Identificador descriptivo de la sala para el catálogo de diagramas.",
                placement: "bottom"
            },
            {
                target: "#xml",
                title: "Definición Estructural (XML)",
                description: "Especificación serializada del diagrama. Admite plantillas estándar de clases, interfaces y relaciones.",
                tip: "Puedes pegar una estructura existente para restaurar un modelo previo.",
                placement: "top"
            },
            {
                target: "#description",
                title: "Alcance y Notas Técnicas",
                description: "Documentación complementaria y objetivos del diseño para el equipo de desarrollo.",
                placement: "top"
            },
            {
                target: "button[type='submit']",
                title: "Confirmar y Desplegar",
                description: "Persiste la sala en la base de datos y habilita el canal de WebSocket para trabajo simultáneo.",
                placement: "top"
            }
        ]
    },

    // ==========================================
    // 3. EDICIÓN DE SALA
    // ==========================================
    editarSala: {
        id: "tour_editarsala_v2",
        title: "Actualización de Parámetros",
        steps: [
            {
                target: "#title",
                title: "Título de la Sala",
                description: "Modifica el identificador del diagrama sin alterar los enlaces de invitación existentes.",
                placement: "bottom"
            },
            {
                target: "#xml",
                title: "Actualización de Estructura XML",
                description: "Sincroniza el esquema técnico base con los cambios acordados en la arquitectura.",
                placement: "top"
            },
            {
                target: "button[type='submit']",
                title: "Guardar Modificaciones",
                description: "Aplica las actualizaciones inmediatamente en el servidor.",
                placement: "top"
            }
        ]
    },

    // ==========================================
    // 4. PIZARRA UML
    // ==========================================
    pizarra: {
        id: "tour_pizarra_v2",
        title: "Entorno de Modelado UML",
        steps: [
            {
                target: ".tools-panel",
                title: "Caja de Herramientas UML",
                description: "Componentes estándar: Clases, Interfaces, Métodos, Atributos y conectores de Asociación, Herencia y Agregación.",
                tip: "Arrastra cualquier componente hacia el lienzo para instanciarlo.",
                placement: "right"
            },
            {
                target: ".canvas-container",
                title: "Lienzo de Diagramación (Canvas)",
                description: "Espacio de trabajo vectorial con soporte de renderizado multiusuario en tiempo real.",
                tip: "Navegación: Rueda del mouse para zoom y arrastre para paneo del lienzo.",
                placement: "bottom"
            },
            {
                target: ".canvas-header",
                title: "Barra de Control y Exportación",
                description: "Controles de estado de sincronización Socket.IO, persistencia de cambios y exportación del modelo.",
                placement: "bottom"
            }
        ]
    },

    // ==========================================
    // 5. AUTENTICACIÓN
    // ==========================================
    login: {
        id: "tour_login_v2",
        title: "Autenticación de Usuario",
        steps: [
            {
                target: "#email, input[type='email']",
                title: "Correo Institucional / Cuenta",
                description: "Dirección de correo electrónico asociada al perfil de usuario.",
                placement: "bottom"
            },
            {
                target: "#password, input[type='password']",
                title: "Clave de Acceso",
                description: "Credencial de autenticación cifrada mediante bcrypt en servidor.",
                placement: "bottom"
            },
            {
                target: "button[type='submit']",
                title: "Autenticar y Acceder",
                description: "Emite el token de sesión y da acceso al panel de control.",
                placement: "top"
            }
        ]
    }
};

/**
 * Reglas de Inspección Técnica
 */
window.AGENT_INSPECTOR_RULES = [
    {
        selector: "#create-room-button, [data-agent='btn-crear-sala']",
        title: "Crear Nueva Sala",
        description: "Abre el asistente de configuración para instanciar un nuevo espacio de trabajo colaborativo."
    },
    {
        selector: "#view-shared-rooms-button",
        title: "Filtrar: Salas Compartidas",
        description: "Muestra únicamente las salas donde tienes permisos de colaborador invitado."
    },
    {
        selector: "#created-rooms-button",
        title: "Filtrar: Mis Salas",
        description: "Muestra los proyectos donde tu cuenta es propietaria y administradora."
    },
    {
        selector: "#logout-button",
        title: "Cerrar Sesión",
        description: "Finaliza la sesión activa y limpia los identificadores locales de autorización."
    },
    {
        selector: "#save-invitation-button",
        title: "Confirmar Invitación",
        description: "Registra los privilegios de lectura y edición para el usuario seleccionado en esta sala."
    },
    {
        selector: "#cancel-invitation-button",
        title: "Cancelar Acción",
        description: "Cierra el cuadro de diálogo de invitación sin aplicar modificaciones."
    },
    {
        selector: ".btn-danger, [onclick*='deleteRoom']",
        title: "Eliminar Sala",
        description: "Operación destructiva: remueve el espacio de trabajo y la estructura XML asociada de la base de datos."
    },
    {
        selector: "[onclick*='editRoom']",
        title: "Editar Metadatos",
        description: "Permite ajustar el título, notas y esquema XML de la sala seleccionada."
    },
    {
        selector: "[onclick*='inviteToRoom']",
        title: "Gestionar Colaboradores",
        description: "Despliega el diálogo para añadir integrantes al equipo de trabajo de este diagrama."
    },
    {
        selector: ".tool-item",
        title: "Componente UML",
        description: "Arrastra este elemento hacia el lienzo para agregarlo al modelo de clases."
    },
    {
        selector: "input, textarea, select",
        title: "Entrada de Datos",
        description: "Campo de formulario para configuración o entrada de datos del sistema."
    }
];
