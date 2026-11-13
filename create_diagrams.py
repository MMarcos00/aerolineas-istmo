from xml.etree.ElementTree import Element,SubElement,ElementTree
from xml.dom import minidom
from pathlib import Path

root=Element('mxfile',{'host':'app.diagrams.net','modified':'2026-11-12T20:10:00.000Z','agent':'ChatGPT','version':'24.7.17','type':'device'})

colors={'core':'#e2f4fd','support':'#edf5f9','generic':'#e9f8f3','external':'#fff1da','user':'#eae6ff','neutral':'#ffffff'}
borders={'core':'#0879b2','support':'#528bb1','generic':'#168e72','external':'#d79227','user':'#7468bc','neutral':'#8aa1b6'}

def page(name,n):
    diagram=SubElement(root,'diagram',{'name':name,'id':str(n)})
    model=SubElement(diagram,'mxGraphModel',{'dx':'1300','dy':'900','grid':'1','gridSize':'10','guides':'1','tooltips':'1','connect':'1','arrows':'1','fold':'1','page':'1','pageScale':'1','pageWidth':'1600','pageHeight':'1000','math':'0','shadow':'0'})
    rt=SubElement(model,'root');SubElement(rt,'mxCell',{'id':'0'});SubElement(rt,'mxCell',{'id':'1','parent':'0'})
    def node(id,title,x,y,w=245,h=80,type='support'):
        style=f'rounded=1;whiteSpace=wrap;html=1;fillColor={colors[type]};strokeColor={borders[type]};strokeWidth=2;fontFamily=Helvetica;fontSize=16;fontColor=#16354b;align=center;verticalAlign=middle;spacing=9;'
        cel=SubElement(rt,'mxCell',{'id':str(id),'value':title,'style':style,'vertex':'1','parent':'1'})
        SubElement(cel,'mxGeometry',{'x':str(x),'y':str(y),'width':str(w),'height':str(h),'as':'geometry'})
    def txt(id,title,x,y,w=1200,h=40,size=23):
        cel=SubElement(rt,'mxCell',{'id':str(id),'value':title,'style':f'text;whiteSpace=wrap;html=1;fillColor=none;strokeColor=none;fontFamily=Helvetica;fontSize={size};fontStyle=1;fontColor=#0c3358;align=left;verticalAlign=middle;','vertex':'1','parent':'1'})
        SubElement(cel,'mxGeometry',{'x':str(x),'y':str(y),'width':str(w),'height':str(h),'as':'geometry'})
    def edge(id,a,b,label='',dashed=False,color='#56798e'):
        style=f'edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=block;endFill=1;strokeColor={color};strokeWidth=2;fontColor=#19485e;fontSize=12;'
        if dashed: style+='dashed=1;dashPattern=7 5;'
        cel=SubElement(rt,'mxCell',{'id':str(id),'value':label,'style':style,'edge':'1','parent':'1','source':str(a),'target':str(b)})
        SubElement(cel,'mxGeometry',{'relative':'1','as':'geometry'})
    return node,txt,edge

n,t,e=page('1 - Context Map DDD',1)
t('t','MAPA DE CONTEXTOS | DDD estratégico',55,24);t('sub','Flechas: proveedor → consumidor. ACL y kernel compartido son fronteras explícitas.',55,62,1300,35,13)
n('v','VUELOS<br/><font style="font-size:12px">Horarios · Rutas · Puertas</font>',110,145,260,86,'support')
n('p','PASAJEROS Y CLIENTES<br/><font style="font-size:12px">Identidad · Crédito</font>',110,330,260,86,'support')
n('i','INVENTARIO DE ASIENTOS<br/><font style="font-size:12px">Cupos · Sobreventa</font>',110,530,260,86,'support')
n('r','RESERVAS Y TARIFAS<br/><font style="font-size:12px">CORE: reglas comerciales</font>',600,305,285,105,'core')
n('a','OPERACIONES AEROPUERTO<br/><font style="font-size:12px">Check-in · Abordaje</font>',1035,170,310,90,'support')
n('no','NOTIFICACIONES<br/><font style="font-size:12px">Buzón interno</font>',1040,470,260,85,'generic')
n('pag','PASARELA DE PAGOS<br/><font style="font-size:12px">Sistema externo (futuro)</font>',600,660,275,85,'external')
n('mig','MIGRACIÓN<br/><font style="font-size:12px">Sistema externo (futuro)</font>',1055,680,270,85,'external')
e('e1','v','r','Cliente / Proveedor');e('e2','p','r','Cliente / Proveedor');e('e3','i','r','Cliente / Proveedor');e('e4','r','a','Conformista');e('e5','v','no','Evento de cambio');e('e6','r','pag','ACL (traductor)',True,'#c18a2d');e('e7','a','mig','ACL (traductor)',True,'#c18a2d');e('e8','r','i','Kernel: VueloId / ReservaId',True,'#3388bb')

n,t,e=page('2 - C4 Nivel 1 Contexto',2)
t('t','C4 · NIVEL 1 | Contexto del sistema',55,25)
n('sales','AGENTE DE VENTAS<br/><font style="font-size:12px">Mostrador / Call center</font>',105,180,240,100,'user')
n('airport','PERSONAL DE AEROPUERTO<br/><font style="font-size:12px">Check-in y abordaje</font>',105,510,240,100,'user')
n('system','SISTEMA DE GESTIÓN<br/>DE RESERVAS Y ABORDAJE<br/><font style="font-size:12px">Aerolíneas del Istmo</font>',570,290,360,185,'core')
n('gateway','PASARELA DE PAGO<br/><font style="font-size:12px">Futura · ACL</font>',1155,175,270,95,'external')
n('migracion','SISTEMA MIGRATORIO<br/><font style="font-size:12px">Futuro · ACL</font>',1155,505,270,95,'external')
e('e1','sales','system','Cotiza / reserva / emite');e('e2','airport','system','Check-in / aborda');e('e3','system','gateway','Solicita pago (futuro)',True);e('e4','system','migracion','Verifica documento (futuro)',True)
t('foot','Alcance del prototipo: pagos simulados y notificaciones internas. No se integran sistemas externos.',60,790,1350,40,14)

n,t,e=page('3 - C4 Nivel 2 Contenedores',3)
t('t','C4 · NIVEL 2 | Contenedores desplegables',55,25)
n('user','USUARIO EN NAVEGADOR<br/><font style="font-size:12px">Agente / Aeropuerto</font>',90,270,240,96,'user')
n('front','FRONTEND ESTÁTICO<br/><font style="font-size:12px">HTML · CSS · JavaScript<br/>GitHub Pages</font>',470,250,260,132,'support')
n('api','API REST<br/><font style="font-size:12px">TypeScript · Cloudflare Workers<br/>Hexagonal + DDD</font>',870,250,280,132,'core')
n('db','BASE DE DATOS SQL<br/><font style="font-size:12px">Cloudflare D1 · SQLite<br/>Pasajeros / vuelos / reservas</font>',895,560,300,135,'generic')
n('future','INTEGRACIONES FUTURAS<br/><font style="font-size:12px">Pagos / migración / WhatsApp<br/>Adaptadores ACL</font>',430,590,290,115,'external')
e('e1','user','front','Interfaz web');e('e2','front','api','HTTPS + JSON');e('e3','api','db','Puerto repositorio / SQL');e('e4','api','future','ACL / Proveedores',True)
t('foot','GitHub Pages no ejecuta backend: el Worker procesa solicitudes y D1 persiste los datos.',65,790,1370,40,14)

n,t,e=page('4 - C4 Nivel 3 Componentes',4)
t('t','C4 · NIVEL 3 | Componentes internos del Worker',55,25)
n('front','NAVEGADOR<br/><font style="font-size:12px">Adaptador de entrada</font>',60,325,220,100,'user')
n('router','CONTROLADOR HTTP<br/><font style="font-size:12px">api/src/index.ts<br/>Rutas REST y JSON</font>',355,320,265,105,'support')
n('service','AerolineaService<br/><font style="font-size:12px">Casos de uso / coordinación</font>',735,315,270,120,'core')
n('pol','PoliticaDeReservas<br/><font style="font-size:12px">Dominio RN-01…RN-08</font>',1070,130,295,130,'core')
n('port','PuertoRepositorioAerolinea<br/><font style="font-size:12px">Interfaz (puerto de salida)</font>',1080,360,290,115,'support')
n('adapt','D1Repositorio<br/><font style="font-size:12px">Adaptador SQL (infraestructura)</font>',1065,585,310,115,'generic')
n('db','BASE DE DATOS D1<br/><font style="font-size:12px">SQLite</font>',695,635,270,95,'generic')
e('e1','front','router','HTTP');e('e2','router','service','Ejecuta caso de uso');e('e3','service','pol','Aplica políticas');e('e4','service','port','Llama interfaz');e('e5','port','adapt','Implementada por',True);e('e6','adapt','db','Consultas SQL')
t('foot','El dominio (azul) no importa código de Cloudflare, HTTP ni SQL.',60,800,1300,40,14)

n,t,e=page('5 - C4 Nivel 4 Clases',5)
t('t','C4 · NIVEL 4 | Clases y dependencias',55,25)
n('controller','HTTP (adaptador entrada)<br/><font style="font-size:13px">GET/POST/DELETE<br/>request → AerolineaService</font>',70,280,255,150,'support')
n('service','AerolineaService<br/><font style="font-size:13px">crearReserva()<br/>cotizar() · confirmar()<br/>emitir() · checkin()</font>',425,270,300,175,'core')
n('rules','PoliticaDeReservas<br/><font style="font-size:13px">validarCantidad()<br/>validarCapacidad()<br/>validarCancelacion()<br/>validarDocumento()</font>',825,100,305,188,'core')
n('models','Pasajero · Vuelo · Reserva<br/><font style="font-size:13px">Entidades DDD<br/>Boleto · Tramo · Cotizacion</font>',1210,115,280,140,'core')
n('port','PuertoRepositorioAerolinea<br/><font style="font-size:13px">interfaz<br/>pasajero() · vuelo()<br/>confirmar() · emitir()</font>',815,420,320,178,'support')
n('repo','D1Repositorio<br/><font style="font-size:13px">implements Puerto…<br/>SQL con parámetros</font>',1205,520,270,145,'generic')
n('d1','Base de datos D1<br/><font style="font-size:13px">SQLite</font>',870,720,250,94,'generic')
e('e1','controller','service','Invoca');e('e2','service','rules','Aplica');e('e3','service','port','Depende de interfaz');e('e4','rules','models','Consulta entidades');e('e5','repo','port','Implementa',True);e('e6','repo','d1','Persiste')

n,t,e=page('6 - Modelo de Datos',6)
t('t','MODELO RELACIONAL | Persistencia D1 (SQLite)',55,25)
n('agent','AGENTES<br/><font style="font-size:12px">PK id<br/>nombre</font>',80,135,255,105,'support')
n('pass','PASAJEROS<br/><font style="font-size:12px">PK id · documento<br/>tipo_cliente · crédito</font>',80,430,255,125,'support')
n('booking','RESERVAS<br/><font style="font-size:12px">PK id<br/>FK agente_id, titular_id<br/>estado, total, fecha</font>',510,245,290,150,'core')
n('bp','RESERVA_PASAJEROS<br/><font style="font-size:12px">PK (reserva_id,pasajero_id)</font>',520,540,275,95,'generic')
n('flight','VUELOS<br/><font style="font-size:12px">PK id<br/>ruta, fecha, capacidad, tarifas</font>',975,130,295,125,'support')
n('leg','RESERVA_TRAMOS<br/><font style="font-size:12px">PK (reserva_id,vuelo_id)<br/>clase</font>',975,350,295,105,'generic')
n('ticket','BOLETOS<br/><font style="font-size:12px">PK id · FK reserva/pasajero/vuelo<br/>tarifa_cents (snapshot)</font>',965,550,305,110,'generic')
n('check','CHECKINS<br/><font style="font-size:12px">PK id · FK reserva/pasajero/vuelo<br/>asiento · abordado</font>',110,745,305,120,'generic')
n('pay','PAGOS<br/><font style="font-size:12px">PK id · FK reserva_id<br/>monto · fecha</font>',540,750,265,110,'generic')
e('e1','agent','booking','1:N');e('e2','pass','booking','Titular 1:N');e('e3','booking','bp','1:N');e('e4','pass','bp','1:N');e('e5','booking','leg','1:N');e('e6','flight','leg','1:N');e('e7','booking','ticket','1:N');e('e8','booking','pay','1:N');e('e9','booking','check','1:N');e('e10','leg','ticket','vuelo');

out=Path('/mnt/data/aerolineas-istmo/diagrams/Arquitectura_Aerolineas_Istmo.drawio')
xml=minidom.parseString(__import__('xml.etree.ElementTree',fromlist=['tostring']).tostring(root,encoding='utf-8')).toprettyxml(indent='  ')
out.write_text(xml,encoding='utf-8')
print(out, len(xml),'bytes',len(root),'pages')
