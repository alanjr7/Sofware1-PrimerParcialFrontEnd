/**
 * EnterpriseArchitectBridge
 * -------------------------------------------------------------
 * Módulo de integración bidireccional entre la Pizarra Colaborativa y
 * Sparx Systems Enterprise Architect (EA).
 * 
 * Cumple con los requerimientos específicos de Sparx EA:
 * - Identificadores GUID en formato estándar EA:
 *   - Paquetes: EAPK_XXXXXXXX_XXXX_XXXX_XXXX_XXXXXXXXXXXX (32 hex)
 *   - Elementos y Diagramas: EAID_XXXXXXXX_XXXX_XXXX_XXXX_XXXXXXXXXXXX (32 hex)
 * - Extensiones propietarias:
 *   - <xmi:Extension extender="Enterprise Architect" extenderID="6.5">
 *   - <elements> con definiciones de paquete y clases asociadas a model package.
 *   - <connectors><connector> para extracción e importación completa y confiable
 *     de todas las relaciones (Asociación, Agregación, Composición, Herencia, etc.)
 *   - <diagrams><diagram> con owner="EAPK_..." para que el diagrama se cree
 *     y aparezca visualmente dentro del árbol del paquete en el Project Browser.
 *   - Geometría Left, Top, Right, Bottom para posicionar los elementos.
 */

(function (global) {
    'use strict';

    // Mapeo de tipos comunes a tipos primitivos UML estándar
    const UML_PRIMITIVE_TYPES = {
        'int': 'Integer',
        'integer': 'Integer',
        'smallint': 'Integer',
        'tinyint': 'Integer',
        'bigint': 'Integer',
        'number': 'Integer',
        'float': 'Real',
        'double': 'Real',
        'real': 'Real',
        'decimal': 'Real',
        'numeric': 'Real',
        'string': 'String',
        'text': 'String',
        'char': 'String',
        'varchar': 'String',
        'boolean': 'Boolean',
        'bool': 'Boolean',
        'date': 'Date',
        'datetime': 'DateTime',
        'timestamp': 'DateTime',
        'time': 'Time',
        'void': 'void'
    };

    function escapeXML(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }

    function unescapeXML(str) {
        if (!str) return '';
        return String(str)
            .replace(/&quot;/g, '"')
            .replace(/&apos;/g, "'")
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&');
    }

    /**
     * Genera un GUID hexadecimal de 32 caracteres con formato estándar 8_4_4_4_12
     * compatible con la base de datos interna y motor XMI de Enterprise Architect.
     */
    function generateEAGUID(seed) {
        let d = Date.now();
        let d2 = (typeof performance !== 'undefined' && performance.now && (performance.now() * 1000)) || 0;

        if (seed && typeof seed === 'string') {
            const hexOnly = seed.replace(/[^a-fA-F0-9]/g, '');
            if (hexOnly.length >= 32) {
                const h = hexOnly.substring(0, 32).toUpperCase();
                return `${h.substring(0, 8)}_${h.substring(8, 12)}_${h.substring(12, 16)}_${h.substring(16, 20)}_${h.substring(20, 32)}`;
            }
        }

        return 'xxxxxxxx_xxxx_4xxx_yxxx_xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            let r = Math.random() * 16;
            if (d > 0) {
                r = (d + r) % 16 | 0;
                d = Math.floor(d / 16);
            } else {
                r = (d2 + r) % 16 | 0;
                d2 = Math.floor(d2 / 16);
            }
            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16).toUpperCase();
        });
    }

    const guidCache = new Map();

    /**
     * Obtiene o genera un GUID con prefijo EAID_ o EAPK_
     */
    function toEAID(id, prefix = 'EAID_') {
        if (!id) return prefix + generateEAGUID();
        const strId = String(id);
        if (guidCache.has(strId)) {
            return guidCache.get(strId);
        }

        const eaGuidRegex = /^(EAID_|EAPK_)[0-9A-Fa-f]{8}_[0-9A-Fa-f]{4}_[0-9A-Fa-f]{4}_[0-9A-Fa-f]{4}_[0-9A-Fa-f]{12}$/;
        if (eaGuidRegex.test(strId)) {
            guidCache.set(strId, strId);
            return strId;
        }

        const newGuid = prefix + generateEAGUID(strId);
        guidCache.set(strId, newGuid);
        guidCache.set(newGuid, newGuid);
        return newGuid;
    }

    function fromEAID(eaId) {
        if (!eaId) return '';
        const str = String(eaId);
        if (str.startsWith('EAID_') || str.startsWith('EAPK_')) {
            return str.substring(5);
        }
        return str;
    }

    function mapToUMLType(type) {
        if (!type) return 'String';
        const key = String(type).trim().toLowerCase();
        return UML_PRIMITIVE_TYPES[key] || type;
    }

    function formatMultiplicityXML(multiplicity, baseId) {
        if (!multiplicity) return '';
        const clean = String(multiplicity).trim();
        let lower = '1';
        let upper = '1';
        if (clean === '*') {
            lower = '0';
            upper = '*';
        } else if (clean.includes('..')) {
            const parts = clean.split('..');
            lower = parts[0].trim();
            upper = parts[1].trim();
        } else {
            lower = clean;
            upper = clean;
        }

        const lowerXml = `<lowerValue xmi:type="uml:LiteralInteger" xmi:id="EAID_LO_${baseId}" value="${escapeXML(lower)}"/>`;
        const upperXml = upper === '*'
            ? `<upperValue xmi:type="uml:LiteralUnlimitedNatural" xmi:id="EAID_UP_${baseId}" value="*"/>`
            : `<upperValue xmi:type="uml:LiteralInteger" xmi:id="EAID_UP_${baseId}" value="${escapeXML(upper)}"/>`;

        return `${lowerXml}\n            ${upperXml}`;
    }

    function getNodeId(node) {
        if (!node) return null;
        return node.getAttribute('xmi:id') ||
               node.getAttribute('xmi.id') ||
               node.getAttribute('id') ||
               node.getAttribute('xmi:idref') ||
               node.getAttribute('xmi.idref') ||
               node.getAttribute('idref') ||
               null;
    }

    function getEndClassifierId(endNode) {
        if (!endNode) return null;
        let t = endNode.getAttribute('type');
        if (t) return t;

        const typeNodes = endNode.getElementsByTagName('type') || [];
        if (typeNodes.length > 0) {
            const tn = typeNodes[0];
            t = tn.getAttribute('xmi:idref') || tn.getAttribute('idref') || tn.getAttribute('href') || tn.getAttribute('name');
            if (t) {
                if (t.includes('#')) t = t.split('#')[1];
                return t;
            }
        }
        return endNode.getAttribute('xmi:idref') || endNode.getAttribute('idref') || null;
    }

    function extractMultiplicity(endNode) {
        if (!endNode) return '';
        const low = endNode.getElementsByTagName('lowerValue') || [];
        const up = endNode.getElementsByTagName('upperValue') || [];
        if (low.length > 0 || up.length > 0) {
            const lVal = low.length > 0 ? (low[0].getAttribute('value') || '0') : '1';
            const uVal = up.length > 0 ? (up[0].getAttribute('value') || '1') : '1';
            return lVal === uVal ? lVal : `${lVal}..${uVal}`;
        }
        return endNode.getAttribute('multiplicity') || '';
    }

    /**
     * Helper para buscar tags en un nodo deduplicando resultados
     */
    function queryUniqueTags(node, tagNames) {
        if (!node) return [];
        const seen = new Set();
        const result = [];
        for (let i = 0; i < tagNames.length; i++) {
            const found = node.getElementsByTagName(tagNames[i]) || [];
            for (let j = 0; j < found.length; j++) {
                const item = found[j];
                if (!seen.has(item)) {
                    seen.add(item);
                    result.push(item);
                }
            }
        }
        return result;
    }

    /**
     * Parser XML universal basado en pila (Stack-based)
     * Funciona idénticamente en navegador (o como fallback de DOMParser) y en Node.js
     */
    function parseXMLTree(xmlText) {
        if (typeof window !== 'undefined' && window.DOMParser) {
            try {
                const parser = new window.DOMParser();
                const doc = parser.parseFromString(xmlText, 'text/xml');
                const parseError = doc.getElementsByTagName('parsererror');
                if (!parseError || parseError.length === 0) {
                    return wrapStandardDOM(doc);
                }
            } catch (e) {
                // Continuar a fallback de árbol en caso de cualquier detalle
            }
        }

        return buildXMLTree(xmlText);
    }

    function wrapStandardDOM(doc) {
        return {
            getElementsByTagName: function (tag) {
                const cleanTag = tag.replace(/^.*:/, '').toLowerCase();
                const all = doc.getElementsByTagName('*');
                const matched = [];
                for (let i = 0; i < all.length; i++) {
                    const el = all[i];
                    const local = (el.localName || el.tagName.replace(/^.*:/, '')).toLowerCase();
                    if (local === cleanTag || el.tagName.toLowerCase() === tag.toLowerCase()) {
                        matched.push(wrapStandardElement(el));
                    }
                }
                return matched;
            }
        };
    }

    function wrapStandardElement(el) {
        return {
            tagName: el.tagName,
            nodeName: el.tagName,
            textContent: el.textContent || '',
            getAttribute: function (name) {
                const val = el.getAttribute(name);
                if (val !== null) return val;
                const clean = name.replace(/^.*:/, '');
                return el.getAttribute(clean);
            },
            getElementsByTagName: function (tag) {
                const cleanTag = tag.replace(/^.*:/, '').toLowerCase();
                const all = el.getElementsByTagName('*');
                const matched = [];
                for (let i = 0; i < all.length; i++) {
                    const item = all[i];
                    const local = (item.localName || item.tagName.replace(/^.*:/, '')).toLowerCase();
                    if (local === cleanTag || item.tagName.toLowerCase() === tag.toLowerCase()) {
                        matched.push(wrapStandardElement(item));
                    }
                }
                return matched;
            }
        };
    }

    function buildXMLTree(xmlText) {
        const root = {
            tagName: '#root',
            children: [],
            attrs: {},
            textContent: ''
        };

        const stack = [root];
        let clean = xmlText.replace(/<!--[\s\S]*?-->/g, '').replace(/<\?[\s\S]*?\?>/g, '');

        const tokenRegex = /<(\/)?([a-zA-Z0-9_:.-]+)([^>]*?)(\/?)>|([^<]+)/g;
        let match;

        while ((match = tokenRegex.exec(clean)) !== null) {
            const isClosing = Boolean(match[1]);
            const tagName = match[2];
            const rawAttrs = match[3];
            const isSelfClosing = Boolean(match[4]);
            const textContent = match[5];

            if (textContent) {
                if (stack.length > 0) {
                    stack[stack.length - 1].textContent += textContent.trim();
                }
                continue;
            }

            if (isClosing) {
                if (stack.length > 1) {
                    stack.pop();
                }
            } else {
                const attrs = {};
                if (rawAttrs) {
                    const attrRegex = /([a-zA-Z0-9_:.-]+)=["']([^"']*)["']/g;
                    let aMatch;
                    while ((aMatch = attrRegex.exec(rawAttrs)) !== null) {
                        const aName = aMatch[1];
                        const aVal = unescapeXML(aMatch[2]);
                        attrs[aName] = aVal;
                        const cleanName = aName.replace(/^.*:/, '');
                        if (attrs[cleanName] === undefined) attrs[cleanName] = aVal;
                    }
                }

                const node = {
                    tagName: tagName,
                    nodeName: tagName,
                    localName: tagName.replace(/^.*:/, ''),
                    attrs: attrs,
                    children: [],
                    textContent: '',
                    getAttribute: function (attrName) {
                        if (this.attrs[attrName] !== undefined) return this.attrs[attrName];
                        const cleanAttr = attrName.replace(/^.*:/, '');
                        return this.attrs[cleanAttr] !== undefined ? this.attrs[cleanAttr] : null;
                    },
                    getElementsByTagName: function (childTag) {
                        return searchDescendants(this, childTag);
                    }
                };

                const parent = stack[stack.length - 1];
                parent.children.push(node);

                if (!isSelfClosing) {
                    stack.push(node);
                }
            }
        }

        return {
            getElementsByTagName: function (tag) {
                return searchDescendants(root, tag);
            }
        };
    }

    function searchDescendants(parent, tag) {
        const cleanTag = tag.replace(/^.*:/, '').toLowerCase();
        const results = [];

        function traverse(curr) {
            if (!curr) return;
            for (let i = 0; i < curr.children.length; i++) {
                const child = curr.children[i];
                const childLocal = (child.localName || child.tagName.replace(/^.*:/, '')).toLowerCase();
                if (childLocal === cleanTag || child.tagName.toLowerCase() === tag.toLowerCase()) {
                    results.push(child);
                }
                traverse(child);
            }
        }

        traverse(parent);
        return results;
    }

    const EnterpriseArchitectBridge = {
        /**
         * Exporta un diagrama ({ elements, connections }) a formato OMG XMI 2.1
         * compatible con Sparx Systems Enterprise Architect.
         */
        diagramToXMI: function (diagramData, options = {}) {
            const elements = (diagramData && diagramData.elements)
                ? (Array.isArray(diagramData.elements) ? diagramData.elements : Object.values(diagramData.elements))
                : [];
            const connections = (diagramData && diagramData.connections && Array.isArray(diagramData.connections))
                ? diagramData.connections
                : [];

            const diagramName = options.diagramName || 'DiagramaClases';
            const author = options.author || 'Collaborative Canvas';
            const now = new Date();
            const dateStr = now.toISOString().replace('T', ' ').substring(0, 19);

            guidCache.clear();
            const packageEAID = toEAID('pkg_' + diagramName, 'EAPK_');
            const diagramEAID = toEAID('diag_' + diagramName, 'EAID_');

            let classesXml = '';
            let associationsXml = '';
            let eaConnectorsXml = '';
            let eaDiagramElementsXml = '';

            // 1. Inicializar metadatos de Enterprise Architect para el paquete contenedor
            let eaElementsXml = `
            <element xmi:idref="${escapeXML(packageEAID)}" xmi:type="uml:Package" name="${escapeXML(diagramName)}" scope="public">
                <model package2="${escapeXML(packageEAID)}" package="${escapeXML(packageEAID)}" tpos="0" ea_localid="1" ea_eleType="package"/>
                <properties isSpecification="false" sType="Package" nType="0" scope="public"/>
                <project author="${escapeXML(author)}" version="1.0" phase="1.0" created="${dateStr}" modified="${dateStr}" complexity="1" status="Proposed"/>
            </element>`;

            let seqNo = 1;

            // 2. Procesar Elementos (Clases, Enumeraciones, Paquetes, Notas)
            elements.forEach((elem, index) => {
                if (!elem) return;
                const rawId = elem.id || `elem_${index + 1}`;
                const eaId = toEAID(rawId, 'EAID_');
                const name = elem.name || rawId;
                const elemType = elem.type || 'class';

                const x = Math.round(Number(elem.x) || (100 + (index % 3) * 260));
                const y = Math.round(Number(elem.y) || (100 + Math.floor(index / 3) * 220));
                const width = Math.round(Number(elem.width) || 200);
                const height = Math.round(Number(elem.height) || 160);

                // Enterprise Architect Geometry (Left, Top, Right, Bottom)
                eaDiagramElementsXml += `
                    <element subject="${escapeXML(eaId)}" geometry="Left=${x};Top=${y};Right=${x + width};Bottom=${y + height};" seqno="${seqNo++}" style="DUID=${eaId};"/>`;

                if (elemType === 'class') {
                    eaElementsXml += `
            <element xmi:idref="${escapeXML(eaId)}" xmi:type="uml:Class" name="${escapeXML(name)}" scope="${escapeXML(elem.visibility || 'public')}">
                <model package="${escapeXML(packageEAID)}" tpos="0" ea_localid="${index + 2}" ea_eleType="element"/>
                <properties isSpecification="false" sType="Class" nType="0" scope="${escapeXML(elem.visibility || 'public')}" stereotype="${escapeXML(elem.stereotype || '')}"/>
                <project author="${escapeXML(author)}" version="1.0" phase="1.0" created="${dateStr}" modified="${dateStr}" complexity="1" status="Proposed"/>
            </element>`;

                    // Atributos de la clase
                    let attributesXml = '';
                    if (elem.attributes && Array.isArray(elem.attributes)) {
                        elem.attributes.forEach((attr, attrIdx) => {
                            if (!attr) return;
                            const attrName = attr.name || `attr${attrIdx + 1}`;
                            const attrType = attr.type || 'String';
                            const umlType = mapToUMLType(attrType);
                            const attrVis = attr.visibility || 'private';
                            const attrEAID = toEAID(`${eaId}_ATTR_${attrIdx + 1}`, 'EAID_');

                            attributesXml += `
                <ownedAttribute xmi:type="uml:Property" xmi:id="${escapeXML(attrEAID)}" name="${escapeXML(attrName)}" visibility="${escapeXML(attrVis)}">
                    <type xmi:type="uml:PrimitiveType" href="http://schema.omg.org/spec/UML/2.1/uml.xml#${escapeXML(umlType)}" name="${escapeXML(attrType)}"/>
                </ownedAttribute>`;
                        });
                    }

                    // Métodos / Operaciones de la clase
                    let operationsXml = '';
                    if (elem.methods && Array.isArray(elem.methods)) {
                        elem.methods.forEach((op, opIdx) => {
                            if (!op) return;
                            const opName = op.name || `method${opIdx + 1}`;
                            const opVis = op.visibility || 'public';
                            const isStatic = op.isStatic ? 'true' : 'false';
                            const opEAID = toEAID(`${eaId}_OP_${opIdx + 1}`, 'EAID_');

                            let paramsXml = '';
                            if (op.parameters && Array.isArray(op.parameters)) {
                                op.parameters.forEach((param, pIdx) => {
                                    if (!param) return;
                                    const pName = param.name || `param${pIdx + 1}`;
                                    const pType = param.type || 'String';
                                    const paramEAID = toEAID(`${opEAID}_P${pIdx + 1}`, 'EAID_');
                                    paramsXml += `
                    <ownedParameter xmi:type="uml:Parameter" xmi:id="${escapeXML(paramEAID)}" name="${escapeXML(pName)}" direction="in">
                        <type xmi:type="uml:PrimitiveType" href="http://schema.omg.org/spec/UML/2.1/uml.xml#${escapeXML(mapToUMLType(pType))}" name="${escapeXML(pType)}"/>
                    </ownedParameter>`;
                                });
                            }

                            if (op.returnType && op.returnType !== 'void') {
                                const retEAID = toEAID(`${opEAID}_RET`, 'EAID_');
                                paramsXml += `
                    <ownedParameter xmi:type="uml:Parameter" xmi:id="${escapeXML(retEAID)}" name="return" direction="return">
                        <type xmi:type="uml:PrimitiveType" href="http://schema.omg.org/spec/UML/2.1/uml.xml#${escapeXML(mapToUMLType(op.returnType))}" name="${escapeXML(op.returnType)}"/>
                    </ownedParameter>`;
                            }

                            operationsXml += `
                <ownedOperation xmi:type="uml:Operation" xmi:id="${escapeXML(opEAID)}" name="${escapeXML(opName)}" visibility="${escapeXML(opVis)}" isStatic="${isStatic}">
                    ${paramsXml}
                </ownedOperation>`;
                        });
                    }

                    // Herencias (Generalizaciones) donde esta clase es hija (source)
                    let generalizationsXml = '';
                    connections.forEach((conn) => {
                        if (conn.type === 'inheritance' && (conn.source === rawId || conn.source === eaId || conn.source === name)) {
                            const targetTarget = conn.target;
                            const targetElem = elements.find(el => el.id === targetTarget || el.name === targetTarget);
                            const targetEAID = toEAID(targetElem ? targetElem.id : targetTarget, 'EAID_');
                            const genEAID = toEAID(`gen_${conn.id || rawId}_${targetTarget}`, 'EAID_');

                            generalizationsXml += `
                <generalization xmi:type="uml:Generalization" xmi:id="${escapeXML(genEAID)}" general="${escapeXML(targetEAID)}"/>`;

                            eaConnectorsXml += `
            <connector xmi:idref="${escapeXML(genEAID)}">
                <source xmi:idref="${escapeXML(eaId)}"/>
                <target xmi:idref="${escapeXML(targetEAID)}"/>
                <properties ea_type="Generalization" direction="Source -&gt; Destination"/>
            </connector>`;
                        }
                    });

                    classesXml += `
            <packagedElement xmi:type="uml:Class" xmi:id="${escapeXML(eaId)}" name="${escapeXML(name)}" visibility="${escapeXML(elem.visibility || 'public')}">
                ${attributesXml}
                ${operationsXml}
                ${generalizationsXml}
            </packagedElement>`;

                } else if (elemType === 'enum') {
                    eaElementsXml += `
            <element xmi:idref="${escapeXML(eaId)}" xmi:type="uml:Enumeration" name="${escapeXML(name)}" scope="public">
                <model package="${escapeXML(packageEAID)}" tpos="0" ea_localid="${index + 2}" ea_eleType="element"/>
                <properties isSpecification="false" sType="Enumeration" nType="0" scope="public"/>
                <project author="${escapeXML(author)}" version="1.0" phase="1.0" created="${dateStr}" modified="${dateStr}" complexity="1" status="Proposed"/>
            </element>`;

                    let literalsXml = '';
                    if (elem.values && Array.isArray(elem.values)) {
                        elem.values.forEach((val, vIdx) => {
                            const litName = typeof val === 'object' ? (val.name || val.value) : val;
                            const litEAID = toEAID(`${eaId}_LIT_${vIdx + 1}`, 'EAID_');
                            literalsXml += `
                <ownedLiteral xmi:type="uml:EnumerationLiteral" xmi:id="${escapeXML(litEAID)}" name="${escapeXML(litName)}"/>`;
                        });
                    }

                    classesXml += `
            <packagedElement xmi:type="uml:Enumeration" xmi:id="${escapeXML(eaId)}" name="${escapeXML(name)}">
                ${literalsXml}
            </packagedElement>`;

                } else if (elemType === 'package') {
                    classesXml += `
            <packagedElement xmi:type="uml:Package" xmi:id="${escapeXML(eaId)}" name="${escapeXML(name)}"/>`;
                    eaElementsXml += `
            <element xmi:idref="${escapeXML(eaId)}" xmi:type="uml:Package" name="${escapeXML(name)}" scope="public">
                <model package="${escapeXML(packageEAID)}" tpos="0" ea_localid="${index + 2}" ea_eleType="package"/>
                <properties isSpecification="false" sType="Package" nType="0" scope="public"/>
            </element>`;
                } else if (elemType === 'note') {
                    const noteText = elem.text || '';
                    classesXml += `
            <packagedElement xmi:type="uml:Comment" xmi:id="${escapeXML(eaId)}" body="${escapeXML(noteText)}"/>`;
                    eaElementsXml += `
            <element xmi:idref="${escapeXML(eaId)}" xmi:type="uml:Comment" name="Nota" scope="public">
                <model package="${escapeXML(packageEAID)}" tpos="0" ea_localid="${index + 2}" ea_eleType="element"/>
                <properties isSpecification="false" sType="Note" nType="0" scope="public"/>
            </element>`;
                }
            });

            // 3. Procesar Conexiones (Asociaciones, Agregaciones, Composiciones, Dependencias)
            connections.forEach((conn, index) => {
                if (!conn || conn.type === 'inheritance') return;

                const connId = conn.id || `conn_${index + 1}`;
                const connEAID = toEAID(connId, 'EAID_');
                const sourceElem = elements.find(el => el.id === conn.source || el.name === conn.source);
                const targetElem = elements.find(el => el.id === conn.target || el.name === conn.target);

                const sourceEAID = toEAID(sourceElem ? sourceElem.id : conn.source, 'EAID_');
                const targetEAID = toEAID(targetElem ? targetElem.id : conn.target, 'EAID_');
                const label = conn.label || '';
                const type = conn.type || 'association';

                if (type === 'dependency') {
                    associationsXml += `
            <packagedElement xmi:type="uml:Dependency" xmi:id="${escapeXML(connEAID)}" name="${escapeXML(label)}" client="${escapeXML(sourceEAID)}" supplier="${escapeXML(targetEAID)}"/>`;
                    eaConnectorsXml += `
            <connector xmi:idref="${escapeXML(connEAID)}">
                <source xmi:idref="${escapeXML(sourceEAID)}"/>
                <target xmi:idref="${escapeXML(targetEAID)}"/>
                <properties ea_type="Dependency" direction="Source -&gt; Destination"/>
            </connector>`;
                } else if (type === 'implementation' || type === 'realization') {
                    associationsXml += `
            <packagedElement xmi:type="uml:Realization" xmi:id="${escapeXML(connEAID)}" name="${escapeXML(label)}" client="${escapeXML(sourceEAID)}" supplier="${escapeXML(targetEAID)}"/>`;
                    eaConnectorsXml += `
            <connector xmi:idref="${escapeXML(connEAID)}">
                <source xmi:idref="${escapeXML(sourceEAID)}"/>
                <target xmi:idref="${escapeXML(targetEAID)}"/>
                <properties ea_type="Realisation" direction="Source -&gt; Destination"/>
            </connector>`;
                } else {
                    let sourceAgg = 'none';
                    let targetAgg = 'none';
                    let eaType = 'Association';

                    if (type === 'aggregation') {
                        targetAgg = 'shared';
                        eaType = 'Aggregation';
                    } else if (type === 'composition') {
                        targetAgg = 'composite';
                        eaType = 'Composition';
                    } else if (type === 'many-to-many') {
                        eaType = 'Association';
                    }

                    const end1Id = toEAID(`${connEAID}_END1`, 'EAID_');
                    const end2Id = toEAID(`${connEAID}_END2`, 'EAID_');

                    const end1MultXml = formatMultiplicityXML(conn.sourceMultiplicity, `${connEAID}_S`);
                    const end2MultXml = formatMultiplicityXML(conn.targetMultiplicity, `${connEAID}_T`);

                    associationsXml += `
            <packagedElement xmi:type="uml:Association" xmi:id="${escapeXML(connEAID)}" name="${escapeXML(label)}">
                <memberEnd xmi:idref="${escapeXML(end1Id)}"/>
                <memberEnd xmi:idref="${escapeXML(end2Id)}"/>
                <ownedEnd xmi:type="uml:Property" xmi:id="${escapeXML(end1Id)}" type="${escapeXML(sourceEAID)}" association="${escapeXML(connEAID)}" aggregation="${sourceAgg}">
                    ${end1MultXml}
                </ownedEnd>
                <ownedEnd xmi:type="uml:Property" xmi:id="${escapeXML(end2Id)}" type="${escapeXML(targetEAID)}" association="${escapeXML(connEAID)}" aggregation="${targetAgg}">
                    ${end2MultXml}
                </ownedEnd>
            </packagedElement>`;

                    eaConnectorsXml += `
            <connector xmi:idref="${escapeXML(connEAID)}">
                <source xmi:idref="${escapeXML(sourceEAID)}">
                    <role multiplicity="${escapeXML(conn.sourceMultiplicity || '')}"/>
                </source>
                <target xmi:idref="${escapeXML(targetEAID)}">
                    <role multiplicity="${escapeXML(conn.targetMultiplicity || '')}"/>
                </target>
                <properties ea_type="${eaType}" name="${escapeXML(label)}" direction="Unspecified"/>
            </connector>`;
                }
            });

            // 4. Ensamblar documento XMI 2.1 completo con extensiones de Enterprise Architect
            const xmiDocument = `<?xml version="1.0" encoding="UTF-8"?>
<xmi:XMI xmi:version="2.1" xmlns:uml="http://schema.omg.org/spec/UML/2.1" xmlns:xmi="http://schema.omg.org/spec/XMI/2.1">
    <xmi:Documentation exporter="Enterprise Architect" exporterVersion="6.5"/>
    <uml:Model xmi:type="uml:Model" name="EA_Model">
        <packagedElement xmi:type="uml:Package" xmi:id="${escapeXML(packageEAID)}" name="${escapeXML(diagramName)}">
            ${classesXml}
            ${associationsXml}
        </packagedElement>
    </uml:Model>
    <xmi:Extension extender="Enterprise Architect" extenderID="6.5">
        <elements>
            ${eaElementsXml}
        </elements>
        <connectors>
            ${eaConnectorsXml}
        </connectors>
        <diagrams>
            <diagram xmi:id="${escapeXML(diagramEAID)}">
                <model package="${escapeXML(packageEAID)}" localID="1" owner="${escapeXML(packageEAID)}"/>
                <properties name="${escapeXML(diagramName)}" type="Logical" ea_type="Class"/>
                <project author="${escapeXML(author)}" version="1.0" created="${dateStr}" modified="${dateStr}"/>
                <elements>
                    ${eaDiagramElementsXml}
                </elements>
            </diagram>
        </diagrams>
    </xmi:Extension>
</xmi:XMI>`;

            return xmiDocument.trim();
        },

        /**
         * Parsea un archivo XMI / XML exportado por Enterprise Architect
         * y retorna un objeto de diagrama ({ elements: [...], connections: [...] }).
         */
        xmiToDiagram: function (xmlString) {
            if (!xmlString || typeof xmlString !== 'string') {
                throw new Error('El archivo XML/XMI proporcionado está vacío o no es una cadena válida.');
            }

            const doc = parseXMLTree(xmlString);

            // Mapa para registrar geometrías de diagramas de EA
            // subject/idref -> { x, y, width, height }
            const geometryMap = new Map();

            // 1. Extraer geometrías de diagramas de Enterprise Architect
            const diagElements = queryUniqueTags(doc, ['element', 'DiagramElement']);
            for (let i = 0; i < diagElements.length; i++) {
                const el = diagElements[i];
                const subject = el.getAttribute('subject') || getNodeId(el);
                const geometry = el.getAttribute('geometry');
                if (subject && geometry && !geometryMap.has(subject)) {
                    const lMatch = geometry.match(/Left=(-?\d+)/i) || geometry.match(/l=(-?\d+)/i);
                    const tMatch = geometry.match(/Top=(-?\d+)/i) || geometry.match(/t=(-?\d+)/i);
                    const rMatch = geometry.match(/Right=(-?\d+)/i) || geometry.match(/r=(-?\d+)/i);
                    const bMatch = geometry.match(/Bottom=(-?\d+)/i) || geometry.match(/b=(-?\d+)/i);

                    if (lMatch && tMatch) {
                        const left = parseInt(lMatch[1], 10);
                        const top = parseInt(tMatch[1], 10);
                        const right = rMatch ? parseInt(rMatch[1], 10) : left + 200;
                        const bottom = bMatch ? parseInt(bMatch[1], 10) : top + 160;

                        geometryMap.set(subject, {
                            x: Math.abs(left),
                            y: Math.abs(top),
                            width: Math.max(140, Math.abs(right - left)),
                            height: Math.max(100, Math.abs(bottom - top))
                        });
                    }
                }
            }

            const elements = [];
            const connections = [];
            const connectionSet = new Set();
            const idToElementMap = new Map();

            // 2. Extraer Clases (UML 2.1 packagedElement Class y UML 1.1 UML:Class)
            let classNodes = [];
            const allPackaged = doc.getElementsByTagName('packagedElement') || [];
            for (let i = 0; i < allPackaged.length; i++) {
                const p = allPackaged[i];
                const type = p.getAttribute('xmi:type') || p.getAttribute('type');
                if (type === 'uml:Class' || type === 'Class') {
                    classNodes.push(p);
                }
            }

            if (classNodes.length === 0) {
                classNodes = queryUniqueTags(doc, ['Class']);
            }

            let gridIndex = 0;

            classNodes.forEach(cNode => {
                const rawId = getNodeId(cNode) || `class_${Date.now()}_${gridIndex}`;
                const name = cNode.getAttribute('name') || fromEAID(rawId) || `Clase${gridIndex + 1}`;
                const visibility = cNode.getAttribute('visibility') || 'public';
                const stereotype = cNode.getAttribute('stereotype') || '';

                let geom = geometryMap.get(rawId) || geometryMap.get(toEAID(rawId, 'EAID_'));
                let x = geom ? geom.x : (100 + (gridIndex % 3) * 280);
                let y = geom ? geom.y : (100 + Math.floor(gridIndex / 3) * 220);

                gridIndex++;

                // Atributos de la clase
                const attributes = [];
                const attrNodes = queryUniqueTags(cNode, ['ownedAttribute', 'Attribute']);

                attrNodes.forEach(aNode => {
                    const aName = aNode.getAttribute('name');
                    if (!aName) return;

                    const aVis = aNode.getAttribute('visibility') || 'private';
                    let aType = aNode.getAttribute('type');

                    if (!aType) {
                        const typeNodes = aNode.getElementsByTagName('type') || [];
                        if (typeNodes.length > 0) {
                            aType = typeNodes[0].getAttribute('name');
                            if (!aType && typeNodes[0].getAttribute('href')) {
                                const href = typeNodes[0].getAttribute('href');
                                const hash = href.split('#')[1];
                                if (hash) aType = hash;
                            }
                        }
                    }

                    if (!aType) aType = 'String';

                    const isPrimaryKey = aName.toLowerCase() === 'id' ||
                        aName.toLowerCase() === `id_${name.toLowerCase()}` ||
                        aName.toLowerCase().startsWith('id') ||
                        aNode.getAttribute('isPrimaryKey') === 'true';

                    attributes.push({
                        name: aName,
                        type: aType,
                        visibility: aVis,
                        isPrimaryKey: isPrimaryKey,
                        isForeignKey: false
                    });
                });

                // Métodos / Operaciones de la clase
                const methods = [];
                const opNodes = queryUniqueTags(cNode, ['ownedOperation', 'Operation']);

                opNodes.forEach(oNode => {
                    const oName = oNode.getAttribute('name');
                    if (!oName) return;

                    const oVis = oNode.getAttribute('visibility') || 'public';
                    const isStatic = oNode.getAttribute('isStatic') === 'true';

                    const parameters = [];
                    let returnType = 'void';

                    const paramNodes = queryUniqueTags(oNode, ['ownedParameter', 'Parameter']);

                    paramNodes.forEach(pNode => {
                        const direction = pNode.getAttribute('direction') || 'in';
                        const pName = pNode.getAttribute('name');
                        let pType = pNode.getAttribute('type');

                        if (!pType) {
                            const pTypeNodes = pNode.getElementsByTagName('type') || [];
                            if (pTypeNodes.length > 0) {
                                pType = pTypeNodes[0].getAttribute('name');
                                if (!pType && pTypeNodes[0].getAttribute('href')) {
                                    const hash = pTypeNodes[0].getAttribute('href').split('#')[1];
                                    if (hash) pType = hash;
                                }
                            }
                        }
                        if (!pType) pType = 'String';

                        if (direction === 'return') {
                            returnType = pType;
                        } else {
                            parameters.push({
                                name: pName || 'param',
                                type: pType
                            });
                        }
                    });

                    methods.push({
                        name: oName,
                        visibility: oVis,
                        returnType: returnType,
                        parameters: parameters,
                        isStatic: isStatic
                    });
                });

                // Herencia directa en la clase (<generalization general="TARGET_ID"/>)
                const genNodes = queryUniqueTags(cNode, ['generalization']);

                genNodes.forEach((gNode, gIdx) => {
                    const generalTarget = gNode.getAttribute('general') || gNode.getAttribute('generalization');
                    if (generalTarget) {
                        const connKey = `${rawId}->${generalTarget}:inheritance`;
                        if (!connectionSet.has(connKey)) {
                            connectionSet.add(connKey);
                            connections.push({
                                id: `gen_${rawId}_${gIdx}`,
                                source: rawId,
                                target: generalTarget,
                                type: 'inheritance',
                                sourceMultiplicity: '',
                                targetMultiplicity: '',
                                label: ''
                            });
                        }
                    }
                });

                const umlClass = {
                    id: rawId,
                    type: 'class',
                    name: name,
                    stereotype: stereotype,
                    visibility: visibility,
                    attributes: attributes,
                    methods: methods,
                    x: x,
                    y: y
                };

                elements.push(umlClass);
                idToElementMap.set(rawId, umlClass);
                idToElementMap.set(fromEAID(rawId), umlClass);
                idToElementMap.set(toEAID(rawId, 'EAID_'), umlClass);
                idToElementMap.set(name, umlClass);
                idToElementMap.set(name.toLowerCase(), umlClass);
            });

            // 3. Extraer Enumeraciones (<packagedElement xmi:type="uml:Enumeration"> o <Enumeration>)
            for (let i = 0; i < allPackaged.length; i++) {
                const p = allPackaged[i];
                const type = p.getAttribute('xmi:type') || p.getAttribute('type');
                if (type === 'uml:Enumeration' || type === 'Enumeration') {
                    const rawId = getNodeId(p) || `enum_${Date.now()}_${gridIndex}`;
                    const name = p.getAttribute('name') || `Enum${gridIndex + 1}`;
                    const geom = geometryMap.get(rawId) || geometryMap.get(toEAID(rawId, 'EAID_'));
                    const x = geom ? geom.x : (100 + (gridIndex % 3) * 280);
                    const y = geom ? geom.y : (100 + Math.floor(gridIndex / 3) * 220);
                    gridIndex++;

                    const values = [];
                    const litNodes = queryUniqueTags(p, ['ownedLiteral', 'EnumerationLiteral']);
                    litNodes.forEach(lit => {
                        const lName = lit.getAttribute('name');
                        if (lName) values.push(lName);
                    });

                    const enumElem = {
                        id: rawId,
                        type: 'enum',
                        name: name,
                        values: values,
                        x: x,
                        y: y
                    };
                    elements.push(enumElem);
                    idToElementMap.set(rawId, enumElem);
                    idToElementMap.set(fromEAID(rawId), enumElem);
                    idToElementMap.set(toEAID(rawId, 'EAID_'), enumElem);
                    idToElementMap.set(name, enumElem);
                    idToElementMap.set(name.toLowerCase(), enumElem);
                }
            }

            // 4. Extraer Paquetes y Notas
            for (let i = 0; i < allPackaged.length; i++) {
                const p = allPackaged[i];
                const type = p.getAttribute('xmi:type') || p.getAttribute('type');
                if (type === 'uml:Package' && p.getAttribute('name') !== 'EA_Model' && p.getAttribute('name') !== 'Model') {
                    const rawId = getNodeId(p) || `pkg_${Date.now()}_${gridIndex}`;
                    const geom = geometryMap.get(rawId) || geometryMap.get(toEAID(rawId, 'EAPK_'));
                    if (geom) {
                        elements.push({
                            id: rawId,
                            type: 'package',
                            name: p.getAttribute('name') || 'Paquete',
                            x: geom.x,
                            y: geom.y
                        });
                    }
                } else if (type === 'uml:Comment' || type === 'Comment') {
                    const rawId = getNodeId(p) || `note_${Date.now()}_${gridIndex}`;
                    const geom = geometryMap.get(rawId) || geometryMap.get(toEAID(rawId, 'EAID_'));
                    elements.push({
                        id: rawId,
                        type: 'note',
                        text: p.getAttribute('body') || p.textContent || 'Nota',
                        x: geom ? geom.x : 100,
                        y: geom ? geom.y : 100
                    });
                }
            }

            // 5.a Extraer Conectores desde la extensión nativa de Enterprise Architect (<connectors><connector>)
            // Este es el repositorio más completo y confiable de relaciones de Sparx Systems EA
            const connectorNodes = queryUniqueTags(doc, ['connector']);
            connectorNodes.forEach(cNode => {
                const connId = getNodeId(cNode) || cNode.getAttribute('xmi:idref') || `conn_${Date.now()}_${connections.length}`;

                const sourceNodes = queryUniqueTags(cNode, ['source']);
                const targetNodes = queryUniqueTags(cNode, ['target']);

                if (sourceNodes.length === 0 || targetNodes.length === 0) return;

                const sNode = sourceNodes[0];
                const tNode = targetNodes[0];

                const sourceId = sNode.getAttribute('xmi:idref') || sNode.getAttribute('idref') || getNodeId(sNode);
                const targetId = tNode.getAttribute('xmi:idref') || tNode.getAttribute('idref') || getNodeId(tNode);

                if (!sourceId || !targetId) return;

                // Propiedades del conector
                const propNodes = queryUniqueTags(cNode, ['properties']);
                const eaType = propNodes.length > 0 
                    ? (propNodes[0].getAttribute('ea_type') || propNodes[0].getAttribute('type') || '')
                    : (cNode.getAttribute('ea_type') || '');
                const label = (propNodes.length > 0 ? propNodes[0].getAttribute('name') : null) || cNode.getAttribute('name') || '';

                // Determinar tipo de relación
                let relType = 'association';
                const eaTypeLower = eaType.toLowerCase();

                const sTypeNodes = queryUniqueTags(sNode, ['type']);
                const tTypeNodes = queryUniqueTags(tNode, ['type']);
                const sAgg = sTypeNodes.length > 0 ? (sTypeNodes[0].getAttribute('aggregation') || 'none') : 'none';
                const tAgg = tTypeNodes.length > 0 ? (tTypeNodes[0].getAttribute('aggregation') || 'none') : 'none';

                if (eaTypeLower === 'generalization' || eaTypeLower === 'inheritance') {
                    relType = 'inheritance';
                } else if (eaTypeLower === 'composition' || sAgg === 'composite' || tAgg === 'composite') {
                    relType = 'composition';
                } else if (eaTypeLower === 'aggregation' || sAgg === 'shared' || tAgg === 'shared') {
                    relType = 'aggregation';
                } else if (eaTypeLower === 'dependency') {
                    relType = 'dependency';
                } else if (eaTypeLower === 'realisation' || eaTypeLower === 'realization' || eaTypeLower === 'implementation') {
                    relType = 'implementation';
                } else {
                    relType = 'association';
                }

                // Multiplicidades
                let sMult = '';
                const sRoleNodes = queryUniqueTags(sNode, ['role']);
                if (sRoleNodes.length > 0) {
                    sMult = sRoleNodes[0].getAttribute('multiplicity') || '';
                }

                let tMult = '';
                const tRoleNodes = queryUniqueTags(tNode, ['role']);
                if (tRoleNodes.length > 0) {
                    tMult = tRoleNodes[0].getAttribute('multiplicity') || '';
                }

                if (!sMult || !tMult) {
                    const labelNodes = queryUniqueTags(cNode, ['labels']);
                    if (labelNodes.length > 0) {
                        if (!sMult) sMult = labelNodes[0].getAttribute('lb') || '';
                        if (!tMult) tMult = labelNodes[0].getAttribute('rb') || '';
                    }
                }

                const connKey = `${sourceId}->${targetId}:${relType}`;
                const revKey = `${targetId}->${sourceId}:${relType}`;

                if (!connectionSet.has(connKey) && !connectionSet.has(revKey)) {
                    connectionSet.add(connKey);
                    connections.push({
                        id: connId,
                        source: sourceId,
                        target: targetId,
                        type: relType,
                        sourceMultiplicity: sMult,
                        targetMultiplicity: tMult,
                        label: label
                    });
                }
            });

            // 5.b Extraer Asociaciones desde packagedElement xmi:type="uml:Association"
            for (let i = 0; i < allPackaged.length; i++) {
                const p = allPackaged[i];
                const type = p.getAttribute('xmi:type') || p.getAttribute('type');

                if (type === 'uml:Association' || type === 'Association') {
                    const connId = getNodeId(p) || `assoc_${Date.now()}_${connections.length}`;
                    const label = p.getAttribute('name') || '';

                    const ends = queryUniqueTags(p, ['ownedEnd', 'AssociationEnd']);

                    let sourceId = null;
                    let targetId = null;
                    let agg1 = 'none';
                    let agg2 = 'none';
                    let mult1 = '';
                    let mult2 = '';

                    if (ends.length >= 2) {
                        const end1 = ends[0];
                        const end2 = ends[1];

                        sourceId = getEndClassifierId(end1);
                        targetId = getEndClassifierId(end2);

                        agg1 = end1.getAttribute('aggregation') || 'none';
                        agg2 = end2.getAttribute('aggregation') || 'none';

                        mult1 = extractMultiplicity(end1);
                        mult2 = extractMultiplicity(end2);
                    }

                    if (sourceId && targetId) {
                        let relType = 'association';
                        if (agg1 === 'composite' || agg2 === 'composite') {
                            relType = 'composition';
                        } else if (agg1 === 'shared' || agg2 === 'shared') {
                            relType = 'aggregation';
                        }

                        const connKey = `${sourceId}->${targetId}:${relType}`;
                        const revKey = `${targetId}->${sourceId}:${relType}`;
                        if (!connectionSet.has(connKey) && !connectionSet.has(revKey)) {
                            connectionSet.add(connKey);
                            connections.push({
                                id: connId,
                                source: sourceId,
                                target: targetId,
                                type: relType,
                                sourceMultiplicity: mult1,
                                targetMultiplicity: mult2,
                                label: label
                            });
                        }
                    }
                } else if (type === 'uml:Dependency' || type === 'Dependency') {
                    const connId = getNodeId(p) || `dep_${Date.now()}_${connections.length}`;
                    const s = p.getAttribute('client');
                    const t = p.getAttribute('supplier');
                    const connKey = `${s}->${t}:dependency`;
                    if (!connectionSet.has(connKey)) {
                        connectionSet.add(connKey);
                        connections.push({
                            id: connId,
                            source: s,
                            target: t,
                            type: 'dependency',
                            sourceMultiplicity: '',
                            targetMultiplicity: '',
                            label: p.getAttribute('name') || ''
                        });
                    }
                } else if (type === 'uml:Realization' || type === 'Realization') {
                    const connId = getNodeId(p) || `real_${Date.now()}_${connections.length}`;
                    const s = p.getAttribute('client');
                    const t = p.getAttribute('supplier');
                    const connKey = `${s}->${t}:implementation`;
                    if (!connectionSet.has(connKey)) {
                        connectionSet.add(connKey);
                        connections.push({
                            id: connId,
                            source: s,
                            target: t,
                            type: 'implementation',
                            sourceMultiplicity: '',
                            targetMultiplicity: '',
                            label: p.getAttribute('name') || ''
                        });
                    }
                }
            }

            function resolveElementId(ref) {
                if (!ref) return null;
                const cleanRef = String(ref).trim();
                const el = idToElementMap.get(cleanRef) ||
                           idToElementMap.get(cleanRef.toLowerCase()) ||
                           idToElementMap.get(toEAID(cleanRef, 'EAID_')) ||
                           idToElementMap.get(fromEAID(cleanRef));
                if (el) return el.id;

                if (cleanRef.includes('#')) {
                    const hash = cleanRef.split('#')[1];
                    const elHash = idToElementMap.get(hash) || idToElementMap.get(fromEAID(hash));
                    if (elHash) return elHash.id;
                }
                return cleanRef;
            }

            // 6. Normalizar y resolver IDs de conexiones que referencien nombres o EAID
            connections.forEach(conn => {
                if (conn.source) {
                    conn.source = resolveElementId(conn.source);
                }
                if (conn.target) {
                    conn.target = resolveElementId(conn.target);
                }
            });

            return {
                elements: elements,
                connections: connections
            };
        },

        /**
         * Dispara la descarga directa de un archivo .xmi en el navegador
         */
        exportDiagramFile: function (diagramData, filename = 'diagrama_enterprise_architect.xmi') {
            const xmiContent = this.diagramToXMI(diagramData, {
                diagramName: 'DiagramaClases'
            });

            if (typeof window !== 'undefined' && typeof Blob !== 'undefined') {
                const blob = new Blob([xmiContent], {
                    type: 'application/xml;charset=utf-8'
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename.endsWith('.xmi') ? filename : `${filename}.xmi`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }

            return xmiContent;
        }
    };

    // Exportación universal (Browser window + Node.js module)
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = EnterpriseArchitectBridge;
    }
    if (typeof window !== 'undefined') {
        window.EnterpriseArchitectBridge = EnterpriseArchitectBridge;
    }

})(typeof globalThis !== 'undefined' ? globalThis : this);
