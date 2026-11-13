// Servidor local SIN dependencias para abrir la interfaz desde WebStorm.
// Ejecutar en la raíz: node frontend-server.cjs
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const root = path.resolve(__dirname, 'docs');
const mime = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.png':'image/png','.ico':'image/x-icon'};
http.createServer(async(req,res)=>{
  try {
    const url=new URL(req.url, 'http://127.0.0.1:5500');
    const filename=decodeURIComponent(url.pathname==='/' ? '/index.html' : url.pathname);
    const file=path.resolve(root,'.'+filename);
    if(!file.startsWith(root+path.sep)){res.writeHead(403).end('Acceso denegado');return;}
    const stat=await fs.stat(file);
    if(!stat.isFile()){res.writeHead(404).end('No existe');return;}
    res.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream','cache-control':'no-cache'});
    res.end(await fs.readFile(file));
  }catch(e){res.writeHead(404,{'content-type':'text/plain'}).end('Archivo no encontrado');}
}).listen(5500,'127.0.0.1',()=>console.log('Interfaz lista en http://127.0.0.1:5500'));
