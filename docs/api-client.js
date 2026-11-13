/** Cliente HTTP: adaptador de salida del frontend (sin reglas del dominio). */
export class ApiClient {
  constructor(url) { this.url = String(url || '').replace(/\/$/, ''); }
  async request(path, method='GET', data) {
    let response;
    try {
      response=await fetch(`${this.url}${path}`,{method,headers:{'content-type':'application/json'},body:data===undefined?undefined:JSON.stringify(data)});
    } catch(e) { throw new Error('No se puede conectar con la API. Verifica Cloudflare Workers y docs/config.js.'); }
    const json=await response.json().catch(()=>({}));
    if(!response.ok) throw new Error(json.error || `Error HTTP ${response.status}`);
    return json;
  }
  get(path) {return this.request(path);}
  post(path,data={}) {return this.request(path,'POST',data);}
  delete(path) {return this.request(path,'DELETE');}
}
