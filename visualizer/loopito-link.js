// LOOPITO → VISUALIZADOR. Módulo para la página del navegador (3DEU5 Visual).
//
//   import { conectarLoopito } from './loopito-link.js';
//   const lp = conectarLoopito('ws://192.168.1.13:8765', { onEstado: console.log });
//   video.srcObject = lp.stream;          // la cámara del teléfono, ya derecha
//   const { graves, medios, agudos } = lp.pulso;   // 0..1, ~60 veces por segundo
//
// La cámara llega como cuadros JPEG; aquí se pintan en un canvas girado y
// canvas.captureStream() lo vuelve un MediaStream normal, así que cualquier
// código que ya usa una webcam (VideoTexture, <video>) funciona igual.
// OJO: ese stream NO trae audio. El audio es el objeto `pulso`.
//
// Se reconecta solo si el teléfono se cae del Wi-Fi o se apaga ⚙ → VISUALES.

export function conectarLoopito(url, { onEstado = () => {}, onPulso = null, fps = 30 } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = 320; canvas.height = 240;
  const g = canvas.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, canvas.width, canvas.height);
  const stream = canvas.captureStream(fps);

  const pulso = { graves: 0, medios: 0, agudos: 0, nivel: 0, bpm: 0, fase: -1, golpe: 0, canales: [] };
  const cam = { w: 320, h: 240, giro: 0, frontal: true, apagada: true };
  let ws = null, vivo = true, ocupado = false, reintento = null;
  const estado = { conectado: false, cuadros: 0 };

  function acomodar() {
    const lado = cam.giro === 90 || cam.giro === 270;
    const w = lado ? cam.h : cam.w, h = lado ? cam.w : cam.h;
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  }

  async function pintar(blob) {
    if (ocupado) return;            // si el anterior no ha terminado, se tira éste
    ocupado = true;
    try {
      const img = await createImageBitmap(blob);
      acomodar();
      g.save();
      g.translate(canvas.width / 2, canvas.height / 2);
      g.rotate(cam.giro * Math.PI / 180);
      g.drawImage(img, -img.width / 2, -img.height / 2);
      g.restore();
      img.close();
      estado.cuadros++;
    } catch (_) { /* cuadro roto: se ignora */ }
    ocupado = false;
  }

  function abrir() {
    if (!vivo) return;
    ws = new WebSocket(url);
    ws.binaryType = 'blob';
    ws.onopen = () => { estado.conectado = true; onEstado('conectado'); };
    ws.onmessage = (e) => {
      if (typeof e.data !== 'string') { pintar(e.data); return; }
      let m; try { m = JSON.parse(e.data); } catch (_) { return; }
      if (m.t === 'p') { Object.assign(pulso, m); if (onPulso) onPulso(pulso); }
      else if (m.t === 'cam') { Object.assign(cam, { apagada: false }, m); acomodar(); }
      else if (m.t === 'hola') onEstado('hola v' + m.v);
    };
    ws.onclose = () => {
      estado.conectado = false;
      onEstado('desconectado');
      if (vivo) reintento = setTimeout(abrir, 1500);
    };
    ws.onerror = () => { /* onclose se encarga */ };
  }
  abrir();

  return {
    stream, canvas, pulso, cam, estado,
    cerrar() { vivo = false; clearTimeout(reintento); if (ws) ws.close(); stream.getTracks().forEach(t => t.stop()); }
  };
}
