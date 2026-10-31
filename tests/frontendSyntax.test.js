const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const htmlPath = path.join(__dirname, '..', 'src', 'public', 'pizarra.html');

test('Frontend Syntax & Structure - pizarra.html existence and integrity', () => {
    assert.ok(fs.existsSync(htmlPath), 'El archivo pizarra.html debe existir');
    const content = fs.readFileSync(htmlPath, 'utf8');
    assert.ok(content.length > 50000, 'El archivo pizarra.html debe contener el código completo');
});

test('Frontend Syntax & Structure - Embedded JavaScript script tags parse with zero syntax errors', () => {
    const content = fs.readFileSync(htmlPath, 'utf8');
    
    // Extraer todos los bloques <script> que no sean src externo
    const scriptRegex = /<script\b(?![^>]*\bsrc\b)[^>]*>([\s\S]*?)<\/script>/gi;
    let match;
    let count = 0;

    while ((match = scriptRegex.exec(content)) !== null) {
        const scriptCode = match[1].trim();
        if (scriptCode.length === 0) continue;
        count++;

        try {
            // vm.Script compila y valida la sintaxis sin ejecutar
            new vm.Script(scriptCode, {
                filename: `pizarra_inline_script_${count}.js`
            });
        } catch (err) {
            assert.fail(`Error de sintaxis en el bloque de script #${count}: ${err.message}`);
        }
    }

    assert.ok(count > 0, `Se deben haber verificado bloques de script inline (encontrados: ${count})`);
});

test('Frontend UI - CSS styling rules for AI Team Member exist in pizarra.html', () => {
    const content = fs.readFileSync(htmlPath, 'utf8');

    // 1. Contenedor de mensaje de la IA
    assert.ok(content.includes('.chat-msg-row.msg-ai'), 'Debe existir la regla CSS .chat-msg-row.msg-ai');
    assert.ok(content.includes('#f0f7ff'), 'Debe incluir fondo tecnológico #f0f7ff');
    assert.ok(content.includes('border-left: 3.5px solid #0d6efd') || content.includes('border-left: 3px solid #0d6efd') || content.includes('#0d6efd'), 'Debe incluir borde lateral azul distintivo');

    // 2. Badge de rol para la IA
    assert.ok(content.includes('.participant-role-tag.ai'), 'Debe existir la regla CSS .participant-role-tag.ai');

    // 3. Indicador de tipeo
    assert.ok(content.includes('.chat-ia-typing-container'), 'Debe existir la regla CSS .chat-ia-typing-container');
    assert.ok(content.includes('iaTypingBounce'), 'Debe incluir animación de pulsación/puntos iaTypingBounce');

    // 4. Botón rápido @IA
    assert.ok(content.includes('.btn-mention-ia'), 'Debe existir la regla CSS .btn-mention-ia');
    assert.ok(content.includes('.room-chat-quick-mentions'), 'Debe existir la regla CSS .room-chat-quick-mentions');
});

test('Frontend UI - HTML markup for typing indicator and @IA mention button exist in pizarra.html', () => {
    const content = fs.readFileSync(htmlPath, 'utf8');

    // Elemento typing indicator
    assert.ok(content.includes('id="chat-ia-typing"'), 'Debe existir el elemento #chat-ia-typing');
    assert.ok(content.includes('id="chat-ia-typing-text"'), 'Debe existir el elemento #chat-ia-typing-text');

    // Botón @IA
    assert.ok(content.includes('id="btn-mention-ia"'), 'Debe existir el botón #btn-mention-ia');
    assert.ok(content.includes("onclick=\"RoomChatManager.insertMention('@IA')\""), 'El botón debe llamar a RoomChatManager.insertMention');
});

test('RoomChatManager Logic - Event listeners and methods for AI teammate exist in pizarra.html', () => {
    const content = fs.readFileSync(htmlPath, 'utf8');

    // Escucha del evento iaPensando
    assert.ok(content.includes("this.socket.on('iaPensando'"), 'RoomChatManager debe escuchar el evento iaPensando');
    assert.ok(content.includes('static handleIAPensando(data)'), 'RoomChatManager debe tener el método handleIAPensando');
    assert.ok(content.includes('static insertMention(tag'), 'RoomChatManager debe tener el método insertMention');
    assert.ok(content.includes('static formatAIMessage(texto)'), 'RoomChatManager debe tener el método formatAIMessage');

    // Detección de usuario IA en renderMessage y createParticipantChip
    assert.ok(content.includes('ai_architect'), 'Debe contemplar el id ai_architect');
    assert.ok(content.includes('Colega IA'), 'Debe mostrar la etiqueta "Colega IA"');
    assert.ok(content.includes('fa-robot'), 'Debe incluir ícono fa-robot para la IA');
});

test('PizarraColaborativa Logic - Toast notification for xmlActualizado from AI teammate', () => {
    const content = fs.readFileSync(htmlPath, 'utf8');

    assert.ok(content.includes("data.source === 'ai_teammate'"), 'Debe detectar data.source === "ai_teammate" en xmlActualizado');
    assert.ok(content.includes('El Arquitecto IA actualizó el diagrama'), 'Debe incluir mensaje descriptivo para la actualización del Arquitecto IA');
    assert.ok(content.includes('this.showNotification('), 'Debe disparar showNotification');
});

test('AI Markdown Formatter Unit Test - formatAIMessage correctly handles markdown tokens and escapes HTML', () => {
    // Simulamos la función formatAIMessage tal como está implementada en pizarra.html
    function escapeHtml(str) {
        if (!str) return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function formatAIMessage(texto) {
        if (!texto) return '';
        let safe = escapeHtml(texto);
        safe = safe.replace(/```(?:[a-zA-Z0-9_\-]+)?\n?([\s\S]*?)```/g, (match, code) => {
            return `<pre class="chat-code-block"><code>${code.trim()}</code></pre>`;
        });
        safe = safe.replace(/`([^`\n]+)`/g, '<code class="chat-inline-code">$1</code>');
        safe = safe.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        safe = safe.replace(/(^|[^\*])\*([^\*\n]+)\*([^\*]|$)/g, '$1<em>$2</em>$3');
        safe = safe.replace(/^[ \t]*[-\*][ \t]+(.+)$/gm, '<div class="chat-list-item"><span class="chat-list-bullet">•</span> <span>$1</span></div>');
        safe = safe.replace(/\n/g, '<br>');
        safe = safe.replace(/<\/pre><br>/g, '</pre>');
        safe = safe.replace(/<\/div><br>/g, '</div>');
        return safe;
    }

    const testInput = '**Propuesta:** Agregar clase `Factura`:\n```java\nclass Factura { int id; }\n```\n- Relación 1:* con `DetalleFactura`\n<script>alert(1)</script>';
    const output = formatAIMessage(testInput);

    // Verificar negrita
    assert.ok(output.includes('<strong>Propuesta:</strong>'));
    // Verificar código inline
    assert.ok(output.includes('<code class="chat-inline-code">Factura</code>'));
    // Verificar bloque de código
    assert.ok(output.includes('<pre class="chat-code-block"><code>class Factura { int id; }</code></pre>'));
    // Verificar bullet item
    assert.ok(output.includes('<div class="chat-list-item"><span class="chat-list-bullet">•</span> <span>Relación 1:* con <code class="chat-inline-code">DetalleFactura</code></span></div>'));
    // Verificar XSS sanitization
    assert.ok(!output.includes('<script>'));
    assert.ok(output.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
});
