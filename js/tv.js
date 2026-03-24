// js/tv.js
let currentTvData = null;
let activeTab = 'config';
window.tvHasRendered = false; 

function gestionarCacheTV(id, data = null) {
    const key = `tv_cache_${id}`;
    if (data) localStorage.setItem(key, JSON.stringify(data));
    else return JSON.parse(localStorage.getItem(key));
}

window.activarRealtimeTV = function(tvId) {
    if (window.tvChannel) _supabase.removeChannel(window.tvChannel);
    window.tvChannel = _supabase.channel(`tv_${tvId}`);
    
    window.tvChannel
        .on('postgres_changes', { event: '*', schema: 'public', table: 'visibilidad_sabores' }, () => renderPantallaTV(tvId, false))
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'pantallas', filter: `id=eq.${tvId}` }, () => renderPantallaTV(tvId, false))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'sabores' }, () => renderPantallaTV(tvId, false))
        .subscribe();
};

window.renderPantallaTV = async function(id, forceAnimation = null) {
    const tv = document.getElementById('tv-container');
    const { data: pant, error } = await _supabase.from('pantallas').select('*').eq('id', id).single();
    let datos = pant || gestionarCacheTV(id);
    if (!datos) return;
    if (pant) gestionarCacheTV(id, pant);

    const style = datos.estilo || { 
        font: 'Inter', bg: '#fdfbf7', catColor: '#64748b', saborColor: '#1e293b', 
        catSize: '1.2', saborSize: '1.6', columnas: 2, marquesinaActiva: false, 
        animacionTipo: 'fadeUp', animacionDuracion: 0.5 
    };

    // Determinar si animar (Primera carga o forzado)
    const shouldAnimate = (forceAnimation === true) || !window.tvHasRendered;
    window.tvHasRendered = true;

    tv.classList.remove('hidden');
    tv.style.fontFamily = style.font || 'Inter';

    // --- BLOQUEO DE ASPECT RATIO (16:9) ---
    // Esto evita que la pantalla se deforme al aumentar la tipografía
    const animDur = style.animacionDuracion || 0.5;
    const animTipo = style.animacionTipo || 'fadeUp';
    const styleTag = document.getElementById('anim-styles') || document.createElement('style');
    styleTag.id = 'anim-styles';
    styleTag.innerHTML = `
        body, html { margin: 0; padding: 0; width: 100vw; height: 100vh; overflow: hidden; background-color: ${style.bg}; }
        #tv-container {
            width: 100vw;
            height: 100vh;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            box-sizing: border-box;
        }
        .tv-layout {
            flex: 1; 
            display: grid;
            gap: 2vw;
            padding: 3vh 3vw;
            overflow: hidden; /* CORTA EL EXCEDENTE PARA NO ROMPER LA TV */
            align-content: start;
        }
        .tv-column { display: flex; flex-direction: column; gap: 1.5vh; }
        .tv-flavor-item, .price-row { line-height: 1.2; word-break: break-word; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideInLeft { from { opacity: 0; transform: translateX(-20px); } to { opacity: 1; transform: translateX(0); } }
        .sabor-anim { animation: ${animTipo} ${animDur}s ease-out forwards; opacity: 0; }
        @keyframes ticker { 0% { transform: translate3d(0, 0, 0); } 100% { transform: translate3d(-33.33%, 0, 0); } }
    `;
    if (!document.getElementById('anim-styles')) document.head.appendChild(styleTag);

    const gridCols = datos.orientacion === '9:16' ? '1fr' : (style.columnas == 1 ? '1fr' : '1fr 1fr');
    let html = `<div class="tv-layout" style="grid-template-columns: ${gridCols};">`;
    let delay = 0;

    if (datos.tipo === 'precios') {
        const { data: catP } = await _supabase.from('categorias_precios').select('*').in('id', datos.config_categorias || []).order('orden');
        const { data: prices } = await _supabase.from('precios_globales').select('*').order('orden');
        catP?.forEach(c => {
            const items = prices.filter(p => p.categoria_precio_id === c.id);
            html += `<div class="tv-column"><div class="tv-cat-header" style="color:${style.catColor}; font-size:${style.catSize}rem; text-transform: uppercase; font-weight: 900; margin-bottom: 1vh;">${c.nombre}</div>`;
            items.forEach(p => {
                const animClass = shouldAnimate ? 'sabor-anim' : '';
                const animStyle = shouldAnimate ? `animation-delay: ${delay}s;` : 'opacity: 1;';
                html += `<div class="price-row ${animClass}" style="border-color:${style.catColor}44; display: flex; justify-content: space-between; align-items: center; padding: 1vh 0; border-bottom: 1px solid rgba(0,0,0,0.05); ${animStyle}">
                    <div class="flex items-center gap-4">${p.imagen_url ? `<img src="${p.imagen_url}" class="h-16 w-16 object-contain">` : ''}
                    <span class="price-label" style="color:${style.catColor}; font-size:${style.saborSize}rem; font-weight:700;">${p.label}</span></div>
                    <span class="price-value" style="color:${style.saborColor}; font-size:${style.saborSize}rem; font-weight:900;">$${p.valor}</span></div>`;
                delay += 0.03;
            });
            html += `</div>`;
        });
    } else {
        const { data: cats } = await _supabase.from('categorias').select('*').in('id', datos.config_categorias || []).order('orden');
        const { data: sabs } = await _supabase.from('sabores').select('*').order('nombre');
        const { data: vis } = await _supabase.from('visibilidad_sabores').select('*').eq('sucursal_id', datos.sucursal_id);
        cats?.forEach(c => {
            const disponibles = sabs.filter(s => s.categoria_id === c.id).filter(s => (vis.find(v => v.sabor_id === s.id)?.disponible !== false));
            if(disponibles.length) {
                html += `<div class="tv-column"><div class="tv-cat-header" style="color:${style.catColor}; font-size:${style.catSize}rem; text-transform: uppercase; font-weight: 900; margin-bottom: 1vh;">${c.nombre}</div><div class="tv-flavor-list">`;
                disponibles.forEach(s => {
                    const animClass = shouldAnimate ? 'sabor-anim' : '';
                    const animStyle = shouldAnimate ? `animation-delay: ${delay}s;` : 'opacity: 1;';
                    html += `<div class="tv-flavor-item ${animClass}" style="color:${style.saborColor}; font-size:${style.saborSize}rem; display: flex; align-items: center; gap: 10px; margin-bottom: 5px; ${animStyle}">
                        <span class="tv-dot" style="color: #3b82f6;">•</span> <span style="font-weight: 700;">${s.nombre.charAt(0).toUpperCase() + s.nombre.slice(1).toLowerCase()}</span>
                        <div class="flex gap-2 items-center">${s.es_sintacc ? `<img src="img/sintacc.png" style="height: 1.1em;">` : ''}${s.es_vegano ? `<img src="img/vegano.png" style="height: 1.1em;">` : ''}</div></div>`;
                    delay += 0.03;
                });
                html += `</div></div>`;
            }
        });
    }
    tv.innerHTML = html + `</div>`;

    if (style.marquesinaActiva) {
        const dur = style.marquesinaVelocidad || 20;
        const textoMarq = style.marquesinaTexto !== undefined ? style.marquesinaTexto : 'BIENVENIDOS A LA HELADERIA';
        tv.innerHTML += `<div class="tv-ticker" style="background:${style.marquesinaBg || '#1e293b'}; color:${style.marquesinaColor || '#ffffff'}; padding: 1.5vh 0; flex-shrink: 0; white-space: nowrap; width: 100%; border-top: 3px solid rgba(255,255,255,0.1);">
            <div class="ticker-content" style="display: inline-block; animation: ticker ${dur}s linear infinite; font-size: ${Math.max(1.5, style.saborSize * 0.8)}rem; font-weight: 900; letter-spacing: 2px;">
                ${textoMarq} &nbsp;&nbsp;&nbsp;&nbsp; • &nbsp;&nbsp;&nbsp;&nbsp; ${textoMarq} &nbsp;&nbsp;&nbsp;&nbsp; • &nbsp;&nbsp;&nbsp;&nbsp; ${textoMarq}
            </div></div>`;
    }
};

// --- CRUD ADMIN ---
window.verPantallasSucursal = async function(sucId, sucName) {
    window.currentSucId = sucId; window.currentSucName = sucName;
    const { data: pants } = await _supabase.from('pantallas').select('*').eq('sucursal_id', sucId);
    const container = document.getElementById('view-content');
    const header = document.getElementById('view-header');
    header.innerHTML = `<div class="flex items-center gap-4"><button onclick="showPage('pantallas')" class="text-slate-400 text-2xl">←</button><h1 class="text-xl font-black uppercase italic">${sucName}</h1></div><button onclick="abrirModalPantalla('${sucId}')" class="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase shadow-lg">+ NUEVA TV</button>`;
    container.innerHTML = `<div class="grid gap-4">${(pants || []).map(p => `<div class="bg-white p-5 rounded-2xl shadow-sm flex justify-between items-center border-2 border-slate-100"><div><p class="font-black italic text-slate-700">${p.nombre}</p><p class="text-[10px] text-blue-500 uppercase font-black">${p.tipo} - ${p.orientacion || '16:9'}</p></div><div class="flex gap-2"><button onclick="window.open('?mode=tv&id=${p.id}', '_blank')" class="bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase">VER</button><button onclick='abrirModalPantalla("${sucId}", ${JSON.stringify(p)})' class="bg-blue-500 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase">DISEÑO</button><button onclick="eliminarTV('${p.id}')" class="text-red-500 text-xs font-black">✕</button></div></div>`).join('')}</div>`;
};

window.abrirModalPantalla = async function(sucId, data = null) {
    currentTvData = data; activeTab = 'config'; window.currentSucId = sucId;
    document.getElementById('modal-tabs').classList.toggle('hidden', !data);
    document.getElementById('modal-form').classList.add('active');
    renderModalContent();
};

async function renderModalContent() {
    const body = document.getElementById('modal-body');
    const btn = document.getElementById('btn-save');
    const title = document.getElementById('modal-title');
    title.innerText = currentTvData ? "EDITOR DE TV" : "NUEVA PANTALLA";
    document.getElementById('tab-config').className = activeTab === 'config' ? 'font-bold text-blue-600 border-b-2 border-blue-600 pb-1' : 'font-bold text-slate-400 pb-1';
    document.getElementById('tab-style').className = activeTab === 'style' ? 'font-bold text-blue-600 border-b-2 border-blue-600 pb-1' : 'font-bold text-slate-400 pb-1';

    if (activeTab === 'config') {
        const { data: cats } = await _supabase.from('categorias').select('*').order('orden');
        const { data: prices } = await _supabase.from('categorias_precios').select('*').order('orden');
        const configActiva = currentTvData?.config_categorias || [];
        body.innerHTML = `
            <input id="p-nom" value="${currentTvData?.nombre || ''}" placeholder="Nombre TV" class="w-full border-2 p-4 rounded-2xl bg-slate-50 outline-none">
            <div class="grid grid-cols-2 gap-4 mt-4">
                <select id="p-tipo" class="w-full border-2 p-4 rounded-2xl bg-slate-50 outline-none"><option value="sabores" ${currentTvData?.tipo === 'sabores' ? 'selected':''}>Sabores</option><option value="precios" ${currentTvData?.tipo === 'precios' ? 'selected':''}>Precios</option></select>
                <select id="p-ori" class="w-full border-2 p-4 rounded-2xl bg-slate-50 outline-none"><option value="16:9" ${currentTvData?.orientacion === '16:9' ? 'selected':''}>Horizontal (16:9)</option><option value="9:16" ${currentTvData?.orientacion === '9:16' ? 'selected':''}>Vertical (9:16)</option></select>
            </div>
            <div id="list-cont" class="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 bg-slate-50 rounded-2xl border mt-4">
                ${(currentTvData?.tipo === 'precios' ? prices : cats).map(i => `<label class="flex items-center gap-2 p-2 bg-white rounded-xl cursor-pointer"><input type="checkbox" class="tv-check" value="${i.id}" ${configActiva.includes(i.id) ? 'checked' : ''}><span class="text-[10px] font-bold uppercase">${i.nombre}</span></label>`).join('')}
            </div>`;
    } else {
        const est = currentTvData?.estilo || { font: 'Inter', bg: '#fdfbf7', catColor: '#64748b', saborColor: '#1e293b', catSize: '1.2', saborSize: '1.6', columnas: 2, marquesinaActiva: false, animacionTipo: 'fadeUp', animacionDuracion: 0.5 };
        const mqText = est.marquesinaTexto !== undefined ? est.marquesinaTexto : 'BIENVENIDOS';
        
        body.innerHTML = `
            <div class="grid grid-cols-2 gap-4">
                <div><label class="text-[10px] font-bold uppercase">Tipografía</label><select id="s-font" class="w-full border p-2 rounded-xl"><option value="Inter" ${est.font==='Inter'?'selected':''}>Inter</option><option value="Oswald" ${est.font==='Oswald'?'selected':''}>Oswald</option><option value="Montserrat" ${est.font==='Montserrat'?'selected':''}>Montserrat</option></select></div>
                <div><label class="text-[10px] font-bold uppercase">Distribución</label><select id="s-col" class="w-full border p-2 rounded-xl"><option value="2" ${est.columnas==2?'selected':''}>2 Columnas</option><option value="1" ${est.columnas==1?'selected':''}>1 Columna</option></select></div>
                <div><label class="text-[10px] font-bold uppercase">Fondo TV</label><input type="color" id="s-bg" value="${est.bg}" class="w-full h-10"></div>
                <div><label class="text-[10px] font-bold uppercase">Color Categoría</label><input type="color" id="s-catC" value="${est.catColor}" class="w-full h-10"></div>
                <div><label class="text-[10px] font-bold uppercase">Color Sabores</label><input type="color" id="s-sabC" value="${est.saborColor}" class="w-full h-10"></div>
                <div><label class="text-[10px] font-bold uppercase">Tipo Animación</label><select id="s-anim-T" class="w-full border p-2 rounded-xl"><option value="fadeUp" ${est.animacionTipo==='fadeUp'?'selected':''}>Deslizar Arriba</option><option value="fadeIn" ${est.animacionTipo==='fadeIn'?'selected':''}>Solo Aparecer</option><option value="slideInLeft" ${est.animacionTipo==='slideInLeft'?'selected':''}>Deslizar Lado</option></select></div>
                <div><label class="text-[10px] font-bold uppercase">Duración Anim. (s)</label><input type="number" step="0.1" id="s-anim-D" value="${est.animacionDuracion}" class="w-full border p-2 rounded-xl"></div>
                <div><label class="text-[10px] font-bold uppercase">Tamaño Categoría</label><input type="number" step="0.1" id="s-catS" value="${est.catSize}" class="w-full border p-2 rounded-xl"></div>
                <div><label class="text-[10px] font-bold uppercase">Tamaño Sabor</label><input type="number" step="0.1" id="s-sabS" value="${est.saborSize}" class="w-full border p-2 rounded-xl"></div>
                
                <div class="col-span-2 border-t pt-4">
                    <label class="flex items-center gap-2 font-black italic text-xs mb-2"><input type="checkbox" id="s-mqA" ${est.marquesinaActiva?'checked':''}> HABILITAR MARQUESINA</label>
                    <div class="grid grid-cols-3 gap-2">
                        <div><label class="text-[9px] font-bold uppercase">Fondo</label><input type="color" id="s-mqB" value="${est.marquesinaBg || '#1e293b'}" class="w-full h-8"></div>
                        <div><label class="text-[9px] font-bold uppercase">Color Letra</label><input type="color" id="s-mqC" value="${est.marquesinaColor || '#ffffff'}" class="w-full h-8"></div>
                        <div><label class="text-[9px] font-bold uppercase">Velocidad</label><input type="number" id="s-mqV" value="${est.marquesinaVelocidad || 20}" class="w-full border p-1 text-xs"></div>
                    </div>
                    <input id="s-mqT" value="${mqText}" placeholder="Texto Marquesina" class="w-full border p-3 rounded-xl mt-2 text-xs">
                </div>
            </div>`;
    }

    btn.onclick = async () => {
        let upd = (activeTab === 'config') 
            ? { 
                nombre: document.getElementById('p-nom').value, 
                tipo: document.getElementById('p-tipo').value, 
                orientacion: document.getElementById('p-ori').value, 
                config_categorias: Array.from(document.querySelectorAll('.tv-check:checked')).map(c => c.value) 
              } 
            : { 
                estilo: { 
                    font: document.getElementById('s-font').value, 
                    bg: document.getElementById('s-bg').value, 
                    catColor: document.getElementById('s-catC').value, 
                    saborColor: document.getElementById('s-sabC').value, 
                    catSize: document.getElementById('s-catS').value, 
                    saborSize: document.getElementById('s-sabS').value, 
                    columnas: document.getElementById('s-col').value, 
                    animacionTipo: document.getElementById('s-anim-T').value, 
                    animacionDuracion: parseFloat(document.getElementById('s-anim-D').value), 
                    marquesinaActiva: document.getElementById('s-mqA').checked, 
                    marquesinaBg: document.getElementById('s-mqB').value, 
                    marquesinaColor: document.getElementById('s-mqC').value, 
                    marquesinaTexto: document.getElementById('s-mqT').value.trim(), 
                    marquesinaVelocidad: parseInt(document.getElementById('s-mqV').value) 
                } 
              };
        
        if (currentTvData) await _supabase.from('pantallas').update(upd).eq('id', currentTvData.id);
        else await _supabase.from('pantallas').insert([{ ...upd, sucursal_id: window.currentSucId }]);
        closeModal(); verPantallasSucursal(window.currentSucId, window.currentSucName);
    };
}

window.eliminarTV = async function(id) { if(confirm('¿BORRAR TV?')) { await _supabase.from('pantallas').delete().eq('id', id); verPantallasSucursal(window.currentSucId, window.currentSucName); } };
function switchTab(tab) { activeTab = tab; renderModalContent(); }
