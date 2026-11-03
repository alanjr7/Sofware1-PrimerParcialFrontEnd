import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const EnterpriseArchitectBridge = require('../src/public/js/enterpriseArchitectBridge.js');

test('EnterpriseArchitectBridge - 1. Exporta diagrama a OMG XMI 2.1 con extensiones de Enterprise Architect', () => {
    const diagramData = {
        elements: [
            {
                id: 'elem_user',
                name: 'Usuario',
                type: 'class',
                visibility: 'public',
                stereotype: 'entity',
                x: 120,
                y: 150,
                width: 220,
                height: 180,
                attributes: [
                    { name: 'id', type: 'Integer', visibility: 'private', isPrimaryKey: true },
                    { name: 'email', type: 'String', visibility: 'private' },
                    { name: 'activo', type: 'Boolean', visibility: 'public' }
                ],
                methods: [
                    {
                        name: 'autenticar',
                        visibility: 'public',
                        returnType: 'Boolean',
                        isStatic: false,
                        parameters: [
                            { name: 'password', type: 'String' }
                        ]
                    }
                ]
            },
            {
                id: 'elem_client',
                name: 'Cliente',
                type: 'class',
                visibility: 'public',
                x: 450,
                y: 150,
                width: 200,
                height: 160,
                attributes: [
                    { name: 'telefono', type: 'String', visibility: 'protected' }
                ],
                methods: []
            },
            {
                id: 'elem_order',
                name: 'Pedido',
                type: 'class',
                visibility: 'public',
                x: 450,
                y: 400,
                width: 200,
                height: 160,
                attributes: [
                    { name: 'total', type: 'Real', visibility: 'private' }
                ],
                methods: []
            }
        ],
        connections: [
            {
                id: 'conn_1',
                source: 'elem_client',
                target: 'elem_user',
                type: 'inheritance',
                sourceMultiplicity: '',
                targetMultiplicity: '',
                label: 'es un'
            },
            {
                id: 'conn_2',
                source: 'elem_client',
                target: 'elem_order',
                type: 'composition',
                sourceMultiplicity: '1',
                targetMultiplicity: '0..*',
                label: 'realiza'
            }
        ]
    };

    const xmi = EnterpriseArchitectBridge.diagramToXMI(diagramData, { diagramName: 'ModeloVentas' });

    assert.ok(typeof xmi === 'string', 'Debe retornar un string XML');
    assert.ok(xmi.includes('<?xml version="1.0" encoding="UTF-8"?>'), 'Debe incluir encabezado XML');
    assert.ok(xmi.includes('xmlns:uml="http://schema.omg.org/spec/UML/2.1"'), 'Debe incluir namespace UML 2.1');
    assert.ok(xmi.includes('xmlns:xmi="http://schema.omg.org/spec/XMI/2.1"'), 'Debe incluir namespace XMI 2.1');
    assert.ok(xmi.includes('exporter="Enterprise Architect"'), 'Debe incluir metadatos de Enterprise Architect');
    assert.ok(xmi.includes('name="ModeloVentas"'), 'Debe contener el nombre del paquete/diagrama');

    // Clases y atributos
    assert.ok(xmi.includes('name="Usuario"'), 'Debe contener la clase Usuario');
    assert.ok(xmi.includes('name="Cliente"'), 'Debe contener la clase Cliente');
    assert.ok(xmi.includes('name="Pedido"'), 'Debe contener la clase Pedido');
    assert.ok(xmi.includes('name="email"'), 'Debe contener el atributo email');
    assert.ok(xmi.includes('name="autenticar"'), 'Debe contener el método autenticar');
    assert.ok(xmi.includes('name="password"'), 'Debe contener el parámetro password');

    // Herencia y composición
    assert.ok(xmi.includes('generalization'), 'Debe contener tag generalization para herencia');
    assert.ok(xmi.includes('composite'), 'Debe contener aggregation="composite" para la composición');
    assert.ok(xmi.includes('value="*"'), 'Debe contener multiplicidad *');

    // Geometría y extensiones de Enterprise Architect
    assert.ok(xmi.includes('<xmi:Extension extender="Enterprise Architect"'), 'Debe incluir extensión EA');
    assert.ok(xmi.includes('geometry="Left=120;Top=150;Right=340;Bottom=330;"'), 'Debe incluir la geometría exacta calculada');
});

test('EnterpriseArchitectBridge - 2. Importa XMI y reconstruye elementos, métodos, atributos y conexiones', () => {
    const xmiInput = `<?xml version="1.0" encoding="UTF-8"?>
<xmi:XMI xmi:version="2.1" xmlns:uml="http://schema.omg.org/spec/UML/2.1" xmlns:xmi="http://schema.omg.org/spec/XMI/2.1">
    <uml:Model xmi:type="uml:Model" name="EA_Model">
        <packagedElement xmi:type="uml:Package" xmi:id="EAPK_1" name="DiagramaClases">
            <packagedElement xmi:type="uml:Class" xmi:id="EAID_PRODUCTO" name="Producto" visibility="public">
                <ownedAttribute xmi:type="uml:Property" xmi:id="EAID_P_ID" name="id" visibility="private">
                    <type name="Integer"/>
                </ownedAttribute>
                <ownedAttribute xmi:type="uml:Property" xmi:id="EAID_P_PRECIO" name="precio" visibility="public">
                    <type name="Real"/>
                </ownedAttribute>
                <ownedOperation xmi:type="uml:Operation" xmi:id="EAID_P_CALC" name="calcularImpuesto" visibility="public">
                    <ownedParameter name="tasa" direction="in">
                        <type name="Real"/>
                    </ownedParameter>
                    <ownedParameter name="return" direction="return">
                        <type name="Real"/>
                    </ownedParameter>
                </ownedOperation>
            </packagedElement>
            <packagedElement xmi:type="uml:Class" xmi:id="EAID_CATEGORIA" name="Categoria" visibility="public">
                <ownedAttribute xmi:type="uml:Property" xmi:id="EAID_C_NAME" name="nombre" visibility="private">
                    <type name="String"/>
                </ownedAttribute>
            </packagedElement>
            <packagedElement xmi:type="uml:Association" xmi:id="EAID_ASSOC_1" name="pertenece">
                <ownedEnd type="EAID_PRODUCTO" aggregation="none">
                    <lowerValue value="0"/>
                    <upperValue value="*"/>
                </ownedEnd>
                <ownedEnd type="EAID_CATEGORIA" aggregation="shared">
                    <lowerValue value="1"/>
                    <upperValue value="1"/>
                </ownedEnd>
            </packagedElement>
        </packagedElement>
    </uml:Model>
    <xmi:Extension extender="Enterprise Architect" extenderID="6.5">
        <diagrams>
            <diagram xmi:id="EAID_DIAG_1">
                <elements>
                    <element subject="EAID_PRODUCTO" geometry="Left=80;Top=100;Right=280;Bottom=260;" seqno="1"/>
                    <element subject="EAID_CATEGORIA" geometry="Left=400;Top=100;Right=600;Bottom=240;" seqno="2"/>
                </elements>
            </diagram>
        </diagrams>
    </xmi:Extension>
</xmi:XMI>`;

    const diagram = EnterpriseArchitectBridge.xmiToDiagram(xmiInput);

    assert.ok(diagram.elements && diagram.elements.length === 2, 'Debe importar exactamente 2 clases');
    
    const prod = diagram.elements.find(e => e.name === 'Producto');
    assert.ok(prod, 'Debe encontrar la clase Producto');
    assert.equal(prod.x, 80, 'Coordenada X de Producto debe ser 80');
    assert.equal(prod.y, 100, 'Coordenada Y de Producto debe ser 100');
    assert.equal(prod.attributes.length, 2, 'Producto debe tener 2 atributos');
    assert.equal(prod.attributes[0].name, 'id');
    assert.equal(prod.attributes[0].isPrimaryKey, true, 'id debe ser detectado como primary key');
    assert.equal(prod.methods.length, 1, 'Producto debe tener 1 método');
    assert.equal(prod.methods[0].name, 'calcularImpuesto');
    assert.equal(prod.methods[0].parameters.length, 1);
    assert.equal(prod.methods[0].parameters[0].name, 'tasa');

    assert.ok(diagram.connections && diagram.connections.length === 1, 'Debe haber 1 conexión');
    const conn = diagram.connections[0];
    assert.equal(conn.type, 'aggregation', 'Debe detectar tipo agregación por aggregation="shared"');
    assert.equal(conn.sourceMultiplicity, '0..*');
    assert.equal(conn.targetMultiplicity, '1');
    assert.equal(conn.label, 'pertenece');
});

test('EnterpriseArchitectBridge - 3. Round-trip completo (App -> XMI -> App)', () => {
    const originalDiagram = {
        elements: [
            {
                id: 'cls_A',
                name: 'Vehiculo',
                type: 'class',
                visibility: 'public',
                x: 150,
                y: 120,
                width: 200,
                height: 160,
                attributes: [
                    { name: 'matricula', type: 'String', visibility: 'private', isPrimaryKey: true }
                ],
                methods: [
                    { name: 'encender', visibility: 'public', returnType: 'void', parameters: [] }
                ]
            },
            {
                id: 'cls_B',
                name: 'Auto',
                type: 'class',
                visibility: 'public',
                x: 150,
                y: 350,
                width: 200,
                height: 160,
                attributes: [
                    { name: 'puertas', type: 'Integer', visibility: 'private' }
                ],
                methods: []
            }
        ],
        connections: [
            {
                id: 'rel_herencia',
                source: 'cls_B',
                target: 'cls_A',
                type: 'inheritance',
                sourceMultiplicity: '',
                targetMultiplicity: '',
                label: 'hereda de'
            }
        ]
    };

    // 1. Exportar a XMI
    const exportedXMI = EnterpriseArchitectBridge.diagramToXMI(originalDiagram);

    // 2. Reimportar desde XMI
    const reimported = EnterpriseArchitectBridge.xmiToDiagram(exportedXMI);

    assert.equal(reimported.elements.length, 2, 'Deben reimportarse 2 clases');
    const vehiculo = reimported.elements.find(e => e.name === 'Vehiculo');
    const auto = reimported.elements.find(e => e.name === 'Auto');

    assert.ok(vehiculo, 'Vehiculo debe existir');
    assert.ok(auto, 'Auto debe existir');
    assert.equal(vehiculo.x, 150);
    assert.equal(vehiculo.y, 120);
    assert.equal(auto.x, 150);
    assert.equal(auto.y, 350);

    assert.equal(vehiculo.attributes[0].name, 'matricula');
    assert.equal(vehiculo.methods[0].name, 'encender');

    assert.equal(reimported.connections.length, 1, 'Debe reimportarse 1 conexión');
    assert.equal(reimported.connections[0].type, 'inheritance');
});

test('EnterpriseArchitectBridge - 4. Soporta Enumeraciones y Dependencias', () => {
    const originalDiagram = {
        elements: [
            {
                id: 'cls_order',
                name: 'Pedido',
                type: 'class',
                x: 100,
                y: 100,
                attributes: [],
                methods: []
            },
            {
                id: 'enum_status',
                name: 'EstadoPedido',
                type: 'enum',
                x: 400,
                y: 100,
                values: ['PENDIENTE', 'PAGADO', 'ENVIADO', 'CANCELADO']
            }
        ],
        connections: [
            {
                id: 'dep_1',
                source: 'cls_order',
                target: 'enum_status',
                type: 'dependency',
                label: 'usa'
            }
        ]
    };

    const xmi = EnterpriseArchitectBridge.diagramToXMI(originalDiagram);
    assert.ok(xmi.includes('uml:Enumeration'));
    assert.ok(xmi.includes('PENDIENTE'));
    assert.ok(xmi.includes('uml:Dependency'));

    const parsed = EnterpriseArchitectBridge.xmiToDiagram(xmi);
    assert.equal(parsed.elements.length, 2);
    const enumElem = parsed.elements.find(e => e.type === 'enum');
    assert.ok(enumElem);
    assert.equal(enumElem.values.length, 4);
    assert.deepEqual(enumElem.values, ['PENDIENTE', 'PAGADO', 'ENVIADO', 'CANCELADO']);

    assert.equal(parsed.connections.length, 1);
    assert.equal(parsed.connections[0].type, 'dependency');
});

test('EnterpriseArchitectBridge - 5. Soporta formato legacy XMI 1.1 de Enterprise Architect (<UML:Class>)', () => {
    const legacyXMI = `<?xml version="1.0" encoding="windows-1252"?>
<XMI xmi.version="1.1" xmlns:UML="omg.org/UML1.3">
    <XMI.content>
        <UML:Model name="EA Model">
            <UML:Namespace.ownedElement>
                <UML:Class xmi.id="EAID_PERSONA" name="Persona" visibility="public">
                    <UML:Classifier.feature>
                        <UML:Attribute name="nombre" type="String"/>
                        <UML:Operation name="caminar"/>
                    </UML:Classifier.feature>
                </UML:Class>
            </UML:Namespace.ownedElement>
        </UML:Model>
        <UML:Diagram name="Logical Diagram">
            <UML:Diagram.element>
                <UML:DiagramElement geometry="Left=50;Top=60;Right=250;Bottom=220;" subject="EAID_PERSONA"/>
            </UML:Diagram.element>
        </UML:Diagram>
    </XMI.content>
</XMI>`;

    const parsed = EnterpriseArchitectBridge.xmiToDiagram(legacyXMI);
    assert.equal(parsed.elements.length, 1);
    const persona = parsed.elements[0];
    assert.equal(persona.name, 'Persona');
    assert.equal(persona.x, 50);
    assert.equal(persona.y, 60);
    assert.equal(persona.attributes[0].name, 'nombre');
    assert.equal(persona.methods[0].name, 'caminar');
});
