// js/tv.js
let currentTvData = null;
let activeTab = 'config';

function gestionarCacheTV(id, data = null) {
    const cacheKey = `tv_cache_${id}`;
    if (data) localStorage.setItem(cacheKey, JSON.stringify(data));
    else return JSON.parse(localStorage.getItem(cacheKey));
}

// --- SISTEMA REALTIME OPTIMIZADO ---
let tvChannel = null;

window.activarRealtimeTV = function(tvId) {
    console.log("Iniciando conexión Realtime para TV:", tvId);

    // Si ya hay un canal abierto, lo cerramos para evitar conflictos
    if (tvChannel) {
        _supabase.removeChannel(tvChannel);
    }

    tvChannel = _supabase.channel(`tv_${tvId}`);

    tvChannel
        .on('postgres_changes', { event: '*', schema: 'public', table: 'visibilidad_sabores' }, (payload) => {
            console.log('🔄 REALTIME: Cambio detectado en Stock', payload);
            renderPantallaTV(tvId);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'sabores' }, (payload) => {
            console.log('🔄 REALTIME: Sabor modificado', payload);
            renderPantallaTV(tvId);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'pantallas', filter: `id=eq.${tvId}` }, (payload) => {
            console.log('🔄 REALTIME: Diseño de pantalla modificado', payload);
            renderPantallaTV(tvId);
        })
        .subscribe((status, err) => {
            if (status === 'SUBSCRIBED') {
                console.log('✅ REALTIME: TV Conectada y escuchando cambios al instante.');
            } else if (status === 'CHANNEL_ERROR') {
                console.error('❌ REALTIME: Error de canal.', err);
            }
        });
};

window.renderPantallaTV = async function(id) {
    const tv = document.getElementById('tv-container');
    const { data: pant, error } = await _supabase.from('pantallas').select('*').eq('id', id).single();
    let datos = pant || gestionarCacheTV(id);
    if (!datos) return;
    if (pant) gestionarCacheTV(id, pant);

    const style = datos.estilo || { font: 'Inter', bg: '#fdfbf7', catColor: '#64748b', saborColor: '#1e293b', catSize: '1.2', saborSize: '1.6', columnas: 2, marquesinaActiva: false };
    tv.classList.remove('hidden');
    tv.style.backgroundColor = style.bg;
    tv.style.fontFamily = style.font;

    const animDur = style.animacionDuracion || 0.5;
    const animTipo = style.animacionTipo || 'fadeUp';
    const styleTag = document.getElementById('anim-styles') || document.createElement('style');
    styleTag.id = 'anim-styles';
    styleTag.innerHTML = `
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
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
            html += `<div class="tv-column"><div class="tv-cat-header" style="color:${style.catColor}; font-size:${style.catSize}rem; text-transform: uppercase;">${c.nombre}</div>`;
            items.forEach(p => {
                html += `<div class="price-row sabor-anim" style="border-color:${style.catColor}44; animation-delay: ${delay}s"><div class="flex items-center gap-4">${p.imagen_url ? `<img src="${p.imagen_url}" class="h-16 w-16 object-contain">` : ''}<span class="price-label" style="color:${style.catColor}; font-size:${style.saborSize}rem; font-weight:700;">${p.label}</span></div><span class="price-value" style="color:${style.saborColor || '#1e293b'}; font-size:${style.saborSize}rem; font-weight:900;">$${p.valor}</span></div>`;
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
                html += `<div class="tv-column"><div class="tv-cat-header" style="color:${style.catColor}; font-size:${style.catSize}rem; text-transform: uppercase;">${c.nombre}</div><div class="tv-flavor-list">`;
                disponibles.forEach(s => {
                    html += `<div class="tv-flavor-item sabor-anim" style="color:${style.saborColor || '#1e293b'}; font-size:${style.saborSize}rem; animation-delay: ${delay}s"><span class="tv-dot" style="color: #3b82f6;">•</span> <span style="font-weight: 700;">${s.nombre.charAt(0).toUpperCase() + s.nombre.slice(1).toLowerCase()}</span><div class="flex gap-2 items-center">${s.es_sintacc ? `<img src="img/sintacc.png" style="height: 1.1em;">` : ''}${s.es_vegano ? `<img src="img/vegano.png" style="height: 1.1em;">` : ''}</div></div>`;
                    delay += 0.03;
                });
                html += `</div></div>`;
            }
        });
    }
    tv.innerHTML = html + `</div>`;

    if (style.marquesinaActiva) {
        const dur = style.marquesinaVelocidad || 20;
        tv.innerHTML += `<div class="tv-ticker" style="background:${style.marquesinaBg || '#1e293b'}; color:${style.marquesinaColor || '#ffffff'}"><div class="ticker-content" style="animation: ticker ${dur}s linear infinite;">${style.marquesinaTexto} • ${style.marquesinaTexto} • ${style.marquesinaTexto}</div></div>`;
    }
};

window.verPantallasSucursal = async function(sucId, sucName) {
    window.currentSucId = sucId; window.currentSucName = sucName;
    const { data: pants } = await _supabase.from('pantallas').select('*').eq('sucursal_id', sucId);
    const container = document.getElementById('view-content');
    const header = document.getElementById('view-header');
    header.innerHTML = `<div class="flex items-center gap-4"><button onclick="showPage('pantallas')" class="text-slate-400 text-2xl">←</button><h1 class="text-xl font-black uppercase italic">${sucName}</h1></div><button onclick="abrirModalPantalla('${sucId}')" class="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase shadow-lg">+ TV</button>`;
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
        body.innerHTML = `<input id="p-nom" value="${currentTvData?.nombre || ''}" placeholder="Nombre TV" class="w-full border-2 p-4 rounded-2xl bg-slate-50 outline-none"><div class="grid grid-cols-2 gap-4"><select id="p-tipo" class="w-full border-2 p-4 rounded-2xl bg-slate-50 outline-none"><option value="sabores" ${currentTvData?.tipo === 'sabores' ? 'selected':''}>Sabores</option><option value="precios" ${currentTvData?.tipo === 'precios' ? 'selected':''}>Precios</option></select><select id="p-ori" class="w-full border-2 p-4 rounded-2xl bg-slate-50 outline-none"><option value="16:9" ${currentTvData?.orientacion === '16:9' ? 'selected':''}>16:9</option><option value="9:16" ${currentTvData?.orientacion === '9:16' ? 'selected':''}>9:16</option></select></div><div id="list-cont" class="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 bg-slate-50 rounded-2xl border">${(currentTvData?.tipo === 'precios' ? prices : cats).map(i => `<label class="flex items-center gap-2 p-2 bg-white rounded-xl"><input type="checkbox" class="tv-check" value="${i.id}" ${configActiva.includes(i.id) ? 'checked' : ''}><span class="text-[10px] font-bold uppercase">${i.nombre}</span></label>`).join('')}</div>`;
    } else {
        const est = currentTvData?.estilo || { font: 'Inter', bg: '#fdfbf7', saborColor: '#1e293b', animacionTipo: 'fadeUp', animacionDuracion: 0.5 };
        body.innerHTML = `<div class="grid grid-cols-2 gap-4"><div><label class="text-[10px] font-bold uppercase">Fondo</label><input type="color" id="s-bg" value="${est.bg}" class="w-full h-10"></div><div><label class="text-[10px] font-bold uppercase">Texto</label><input type="color" id="s-sabC" value="${est.saborColor}" class="w-full h-10"></div><div><label class="text-[10px] font-bold">Animación</label><select id="s-anim-T" class="w-full border p-2 rounded-xl"><option value="fadeUp" ${est.animacionTipo==='fadeUp'?'selected':''}>Deslizar</option><option value="fadeIn" ${est.animacionTipo==='fadeIn'?'selected':''}>Aparecer</option></select></div><div><label class="text-[10px] font-bold">Segundos</label><input type="number" step="0.1" id="s-anim-D" value="${est.animacionDuracion}" class="w-full border p-2"></div><div class="col-span-2 border-t pt-4"><label class="flex items-center gap-2 font-black italic text-xs"><input type="checkbox" id="s-mqA" ${est.marquesinaActiva?'checked':''}> MARQUESINA</label><input id="s-mqT" value="${est.marquesinaTexto || 'BIENVENIDOS'}" class="w-full border p-3 rounded-xl mt-2 text-xs"></div></div>`;
    }

    btn.onclick = async () => {
        let upd = (activeTab === 'config') ? { nombre: document.getElementById('p-nom').value, tipo: document.getElementById('p-tipo').value, orientacion: document.getElementById('p-ori').value, config_categorias: Array.from(document.querySelectorAll('.tv-check:checked')).map(c => c.value) } : { estilo: { font: 'Inter', bg: document.getElementById('s-bg').value, catColor: '#64748b', saborColor: document.getElementById('s-sabC').value, catSize: '1.2', saborSize: '1.6', columnas: 2, animacionTipo: document.getElementById('s-anim-T').value, animacionDuracion: parseFloat(document.getElementById('s-anim-D').value), marquesinaActiva: document.getElementById('s-mqA').checked, marquesinaTexto: document.getElementById('s-mqT').value, marquesinaBg: '#1e293b', marquesinaColor: '#ffffff', marquesinaVelocidad: 20 } };
        if (currentTvData) await _supabase.from('pantallas').update(upd).eq('id', currentTvData.id);
        else await _supabase.from('pantallas').insert([{ ...upd, sucursal_id: window.currentSucId }]);
        closeModal(); verPantallasSucursal(window.currentSucId, window.currentSucName);
    };
}

window.eliminarTV = async function(id) { if(confirm('¿BORRAR TV?')) { await _supabase.from('pantallas').delete().eq('id', id); verPantallasSucursal(window.currentSucId, window.currentSucName); } };
function switchTab(tab) { activeTab = tab; renderModalContent(); }
