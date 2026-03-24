// js/tv.js
let currentTvData = null;
let activeTab = 'config';
window.tvHasRendered = false;
window.animIntervalTV = null;

// --- GESTIÓN DE CACHÉ PARA MODO OFFLINE ---
function gestionarCacheTV(id, data = null) {
    const cacheKey = `tv_cache_${id}`;
    if (data) {
        localStorage.setItem(cacheKey, JSON.stringify(data));
    } else {
        const cached = localStorage.getItem(cacheKey);
        return cached ? JSON.parse(cached) : null;
    }
}

// --- ACTIVAR ESCUCHA EN TIEMPO REAL (100% TU VERSIÓN ORIGINAL Y FUNCIONAL) ---
window.activarRealtimeTV = function(tvId) {
    console.log("Conectando Realtime para TV:", tvId);

    // Canal para cambios en la configuración de la pantalla o estilos
    _supabase
        .channel('public:pantallas')
        .on('postgres_changes', { 
            event: 'UPDATE', 
            schema: 'public', 
            table: 'pantallas', 
            filter: `id=eq.${tvId}` 
        }, () => {
            console.log('Cambio de diseño detectado...');
            renderPantallaTV(tvId, true); // true = Anima para mostrar el nuevo diseño
        })
        .subscribe();

    // Canal para cambios en la disponibilidad de sabores (stock)
    _supabase
        .channel('public:visibilidad_sabores')
        .on('postgres_changes', { 
            event: '*', 
            schema: 'public', 
            table: 'visibilidad_sabores' 
        }, () => {
            console.log('Cambio de stock detectado...');
            renderPantallaTV(tvId, false); // false = Sin repetir animación
        })
        .subscribe();

    // Canal para escuchar cambios al editar un sabor (nombre, vegano, sintacc)
    _supabase
        .channel('public:sabores')
        .on('postgres_changes', { 
            event: '*', 
            schema: 'public', 
            table: 'sabores' 
        }, () => {
            console.log('Cambio en datos de sabor detectado...');
            renderPantallaTV(tvId, false); // false = Sin repetir animación
        })
        .subscribe();
};

// --- RENDERIZADO DE PANTALLA ---
window.renderPantallaTV = async function(id, forceAnimation = null) {
    const tv = document.getElementById('tv-container');
    
    const { data: pant, error } = await _supabase.from('pantallas').select('*').eq('id', id).single();
    let datos = pant;

    if (error || !pant) {
        datos = gestionarCacheTV(id);
        if (!datos) return console.error("Sin conexión y sin datos en caché.");
    } else {
        gestionarCacheTV(id, pant); 
    }

    const style = datos.estilo || { 
        font: 'Inter', bg: '#fdfbf7', catColor: '#64748b', saborColor: '#1e293b', 
        catSize: 24, saborSize: 18, columnas: 2, 
        animacionTipo: 'fadeUp', animacionDuracion: 0.5, animacionCiclo: 0,
        marquesinaActiva: false, marquesinaBg: '#1e293b', marquesinaColor: '#ffffff', marquesinaVelocidad: 20, marquesinaTexto: 'BIENVENIDOS'
    };

    const shouldAnimate = (forceAnimation === true) || !window.tvHasRendered;
    window.tvHasRendered = true;

    // --- CICLO DE REPETICIÓN DEL EFECTO ---
    if (window.animIntervalTV) {
        clearInterval(window.animIntervalTV);
        window.animIntervalTV = null;
    }
    const cicloSegundos = parseInt(style.animacionCiclo) || 0;
    if (cicloSegundos > 0) {
        window.animIntervalTV = setInterval(() => {
            renderPantallaTV(id, true);
        }, cicloSegundos * 1000);
    }
    
    tv.classList.remove('hidden');
    tv.style.backgroundColor = style.bg;
    tv.style.fontFamily = style.font;

    const altoMq = style.marquesinaActiva ? (style.marquesinaAlto || 80) : 0;
    const layoutHeight = `calc(100vh - ${altoMq}px)`;

    const animDur = style.animacionDuracion || 0.5;
    const animTipo = style.animacionTipo || 'fadeUp';
    const styleTag = document.getElementById('anim-styles') || document.createElement('style');
    styleTag.id = 'anim-styles';
    
    // --- CSS CORREGIDO: MARGEN A LA IZQUIERDA Y ARRIBA (20px y 25px) ---
    styleTag.innerHTML = `
        body, html { margin: 0; padding: 0; width: 100vw; height: 100vh; overflow: hidden; background-color: ${style.bg}; }
        #tv-container { width: 100vw; height: 100vh; display: flex; flex-direction: column; overflow: hidden; box-sizing: border-box; margin: 0; padding: 0; }
        
        .tv-layout {
            height: ${layoutHeight}; 
            display: flex;
            flex-direction: column;
            flex-wrap: wrap; 
            column-gap: 2vw;
            row-gap: 0;
            
            /* PADDING CORREGIDO: 20px arriba, 10px derecha, 10px abajo, 25px izquierda */
            padding: 20px 10px 10px 25px; 
            margin: 0;
            box-sizing: border-box;
            
            align-content: flex-start;
            justify-content: flex-start;
        }

        .tv-category-container { 
            break-inside: avoid; 
            page-break-inside: avoid;
            width: ${datos.orientacion === '9:16' || style.columnas == 1 ? '100%' : 'calc(50% - 1.5vw)'}; 
            display: flex; 
            flex-direction: column;
            margin: 0 0 1.5vh 0; 
            padding: 0;
        }

        .tv-cat-header {
            color: ${style.catColor}; 
            font-size: ${style.catSize}px; 
            text-transform: uppercase; 
            font-weight: 900; 
            margin: 0 0 0.8vh 0; 
            border-bottom: 2px solid ${style.catColor}44;
            padding: 0 0 3px 0;
        }

        .tv-flavor-list {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 1vh 1vw;
            margin: 0; padding: 0;
        }

        .tv-flavor-item { 
            font-size: ${style.saborSize}px;
            color: ${style.saborColor};
            line-height: 1.1; 
            display: flex; 
            align-items: center; 
            margin: 0; padding: 0;
        }

        .price-row { 
            font-size: ${style.saborSize}px;
            color: ${style.saborColor};
            grid-column: span 2; 
            display: flex;
            justify-content: space-between; 
            align-items: center; 
            border-bottom: 1px solid rgba(0,0,0,0.05); 
            padding: 4px 0;
            margin: 0 0 0.5vh 0;
        }

        .price-label { font-weight: 700; color: ${style.catColor}; margin: 0; }
        .price-value { font-weight: 900; margin: 0; }

        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideInLeft { from { opacity: 0; transform: translateX(-20px); } to { opacity: 1; transform: translateX(0); } }
        .sabor-anim { animation: ${animTipo} ${animDur}s ease-out forwards; opacity: 0; }
        @keyframes ticker { 0% { transform: translate3d(0, 0, 0); } 100% { transform: translate3d(-33.33%, 0, 0); } }
    `;
    if (!document.getElementById('anim-styles')) document.head.appendChild(styleTag);

    let html = `<div class="tv-layout">`;
    let delay = 0; 

    if (datos.tipo === 'precios') {
        const { data: catPrecios } = await _supabase.from('categorias_precios').select('*').in('id', datos.config_categorias || []).order('orden');
        const { data: prices } = await _supabase.from('precios_globales').select('*').order('orden');
        
        catPrecios?.forEach(c => {
            const items = prices.filter(p => p.categoria_precio_id === c.id);
            html += `<div class="tv-category-container"><div class="tv-cat-header">${c.nombre}</div><div class="tv-flavor-list">`;
            items.forEach(p => {
                const animClass = shouldAnimate ? 'sabor-anim' : '';
                const animStyle = shouldAnimate ? `animation-delay: ${delay}s;` : 'opacity: 1;';
                
                html += `
                <div class="price-row ${animClass}" style="${animStyle}">
                    <div class="flex items-center gap-4">
                        ${p.imagen_url ? `<img src="${p.imagen_url}" class="h-12 w-12 object-contain">` : ''}
                        <span class="price-label">${p.label}</span>
                    </div>
                    <span class="price-value">$${p.valor}</span>
                </div>`;
                delay += 0.03;
            });
            html += `</div></div>`;
        });
        
    } else {
        const { data: cats } = await _supabase.from('categorias').select('*').in('id', datos.config_categorias || []).order('orden');
        const { data: sabs = [] } = await _supabase.from('sabores').select('*').order('nombre');
        const { data: vis = [] } = await _supabase.from('visibilidad_sabores').select('*').eq('sucursal_id', datos.sucursal_id);
        
        cats?.forEach(c => {
            const disponibles = sabs.filter(s => s.categoria_id === c.id).filter(s => {
                const v = vis.find(v => v.sabor_id === s.id);
                return v ? v.disponible !== false : true;
            });
            
            if(disponibles.length) {
                html += `<div class="tv-category-container"><div class="tv-cat-header">${c.nombre}</div><div class="tv-flavor-list">`;
                disponibles.forEach(s => {
                    const nombreFormateado = s.nombre.charAt(0).toUpperCase() + s.nombre.slice(1).toLowerCase();
                    const currentDelay = delay;
                    delay += 0.03;
                    
                    const animClass = shouldAnimate ? 'sabor-anim' : '';
                    const animStyle = shouldAnimate ? `animation-delay: ${currentDelay}s;` : 'opacity: 1;';
                    
                    // --- CÁLCULO DE ALINEACIÓN PERFECTA (PUNTO VS ICONOS) ---
                    // Se crea un contenedor de ancho fijo (aumentado a 75px) para alojar los íconos o el punto.
                    // Las imágenes tienen un tamaño fijo AUMENTADO A 35px.
                    const tieneIcono = s.es_sintacc || s.es_vegano;
                    let bulletHtml = '';
                    
                    if (tieneIcono) {
                        bulletHtml = `
                        <div style="width: 50px; flex-shrink: 0; display: flex; gap: 4px; align-items: center; justify-content: flex-start;">
                            ${s.es_sintacc ? `<img src="img/sintacc.png" style="height: 35px; width: 35px; object-fit: contain; flex-shrink: 0;">` : ''}
                            ${s.es_vegano ? `<img src="img/vegano.png" style="height: 35px; width: 35px; object-fit: contain; flex-shrink: 0;">` : ''}
                        </div>`;
                    } else {
                        bulletHtml = `
                        <div style="width: 75px; flex-shrink: 0; display: flex; align-items: center; justify-content: flex-start; padding-left: 5px;">
                            <span class="tv-dot" style="color: #3b82f6; font-size: 0.9em;">•</span>
                        </div>`;
                    }

                    html += `
                    <div class="tv-flavor-item ${animClass}" style="${animStyle}">
                        ${bulletHtml}
                        <span style="font-weight: 700; flex: 1;">${nombreFormateado}</span>
                    </div>`;
                });
                html += `</div></div>`;
            }
        });
    }
    
    tv.innerHTML = html + `</div>`;
    
    if (style.marquesinaActiva) {
        const dur = style.marquesinaVelocidad || 20;
        const txt = style.marquesinaTexto || 'BIENVENIDOS';
        const sizeMq = style.marquesinaSize || 36;
        
        tv.innerHTML += `
            <div class="tv-ticker" style="height: ${altoMq}px; background:${style.marquesinaBg}; color:${style.marquesinaColor}; display: flex; align-items: center; overflow: hidden; white-space: nowrap; width: 100vw; border-top: 3px solid rgba(255,255,255,0.1); margin: 0; padding: 0;">
                <div class="ticker-content" style="display: inline-block; animation: ticker ${dur}s linear infinite; font-size: ${sizeMq}px; font-weight: 900; letter-spacing: 2px;">
                    ${txt} &nbsp;&nbsp;&nbsp;&nbsp; • &nbsp;&nbsp;&nbsp;&nbsp; ${txt} &nbsp;&nbsp;&nbsp;&nbsp; • &nbsp;&nbsp;&nbsp;&nbsp; ${txt}
                </div>
            </div>`;
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
                <select id="p-tipo" class="w-full border-2 p-4 rounded-2xl bg-slate-50 outline-none">
                    <option value="sabores" ${currentTvData?.tipo === 'sabores' ? 'selected':''}>Sabores</option>
                    <option value="precios" ${currentTvData?.tipo === 'precios' ? 'selected':''}>Precios</option>
                </select>
                <select id="p-ori" class="w-full border-2 p-4 rounded-2xl bg-slate-50 outline-none">
                    <option value="16:9" ${currentTvData?.orientacion === '16:9' ? 'selected':''}>Horizontal (16:9)</option>
                    <option value="9:16" ${currentTvData?.orientacion === '9:16' ? 'selected':''}>Vertical (9:16)</option>
                </select>
            </div>
            <div id="list-cont" class="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 bg-slate-50 rounded-2xl border mt-4">
                ${(currentTvData?.tipo === 'precios' ? prices : cats).map(i => `
                    <label class="flex items-center gap-2 p-2 bg-white rounded-xl cursor-pointer">
                        <input type="checkbox" class="tv-check" value="${i.id}" ${configActiva.includes(i.id) ? 'checked' : ''}>
                        <span class="text-[10px] font-bold uppercase">${i.nombre}</span>
                    </label>`).join('')}
            </div>`;
    } else {
        const est = currentTvData?.estilo || { font: 'Inter', bg: '#fdfbf7', catColor: '#64748b', saborColor: '#1e293b', catSize: 24, saborSize: 18, columnas: 2, animacionTipo: 'fadeUp', animacionDuracion: 0.5, animacionCiclo: 0, marquesinaActiva: false, marquesinaBg: '#1e293b', marquesinaColor: '#ffffff', marquesinaVelocidad: 20, marquesinaAlto: 80, marquesinaSize: 30, marquesinaTexto: 'BIENVENIDOS' };
        
        body.innerHTML = `
            <div class="grid grid-cols-2 gap-4">
                <div><label class="text-[10px] font-bold uppercase">Tipografía</label><select id="s-font" class="w-full border p-2 rounded-xl"><option value="Inter" ${est.font==='Inter'?'selected':''}>Inter</option><option value="Oswald" ${est.font==='Oswald'?'selected':''}>Oswald</option><option value="Montserrat" ${est.font==='Montserrat'?'selected':''}>Montserrat</option></select></div>
                <div><label class="text-[10px] font-bold uppercase">Columnas</label><select id="s-col" class="w-full border p-2 rounded-xl"><option value="2" ${est.columnas==2?'selected':''}>2 Columnas</option><option value="1" ${est.columnas==1?'selected':''}>1 Columna</option></select></div>
                <div><label class="text-[10px] font-bold uppercase">Fondo Pantalla</label><input type="color" id="s-bg" value="${est.bg}" class="w-full h-10 cursor-pointer"></div>
                <div><label class="text-[10px] font-bold uppercase">Color Categorías</label><input type="color" id="s-catC" value="${est.catColor}" class="w-full h-10 cursor-pointer"></div>
                <div><label class="text-[10px] font-bold uppercase">Color Sabores</label><input type="color" id="s-sabC" value="${est.saborColor}" class="w-full h-10 cursor-pointer"></div>
                <div><label class="text-[10px] font-bold uppercase">Tipo Animación</label><select id="s-anim-T" class="w-full border p-2 rounded-xl"><option value="fadeUp" ${est.animacionTipo==='fadeUp'?'selected':''}>Deslizar Arriba</option><option value="fadeIn" ${est.animacionTipo==='fadeIn'?'selected':''}>Solo Aparecer</option><option value="slideInLeft" ${est.animacionTipo==='slideInLeft'?'selected':''}>Deslizar Lado</option></select></div>
                
                <div class="col-span-2 bg-blue-50 p-3 rounded-xl border border-blue-100 flex gap-4">
                    <div class="w-1/2">
                        <label class="text-[10px] font-bold uppercase text-blue-700">Velocidad Efecto (seg)</label>
                        <input type="number" step="0.1" id="s-anim-D" value="${est.animacionDuracion}" class="w-full border p-2 rounded-xl mt-1">
                    </div>
                    <div class="w-1/2">
                        <label class="text-[10px] font-bold uppercase text-blue-700">Repetir Ciclo (seg)</label>
                        <input type="number" id="s-anim-C" value="${est.animacionCiclo || 0}" placeholder="0 = No repetir" class="w-full border p-2 rounded-xl mt-1">
                    </div>
                </div>

                <div><label class="text-[10px] font-bold uppercase">Tamaño Categoría (px)</label><input type="number" id="s-catS" value="${est.catSize}" class="w-full border p-2 rounded-xl"></div>
                <div><label class="text-[10px] font-bold uppercase">Tamaño Sabor (px)</label><input type="number" id="s-sabS" value="${est.saborSize}" class="w-full border p-2 rounded-xl"></div>
                
                <div class="col-span-2 border-t border-slate-200 pt-4 mt-2">
                    <label class="flex items-center gap-2 font-black text-sm mb-3 text-blue-700 uppercase">
                        <input type="checkbox" id="s-mqA" class="w-5 h-5 cursor-pointer" ${est.marquesinaActiva?'checked':''}> HABILITAR MARQUESINA
                    </label>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <div class="col-span-2 md:col-span-4">
                            <label class="text-[10px] font-bold uppercase text-slate-500">Texto a mostrar</label>
                            <input id="s-mqT" value="${est.marquesinaTexto || 'BIENVENIDOS'}" class="w-full border p-2 rounded-xl text-xs font-bold" placeholder="Escribe aquí el texto...">
                        </div>
                        <div><label class="text-[9px] font-bold uppercase text-slate-500">Fondo Barra</label><input type="color" id="s-mqB" value="${est.marquesinaBg}" class="w-full h-8 cursor-pointer border-none rounded"></div>
                        <div><label class="text-[9px] font-bold uppercase text-slate-500">Color Letra</label><input type="color" id="s-mqC" value="${est.marquesinaColor}" class="w-full h-8 cursor-pointer border-none rounded"></div>
                        <div><label class="text-[9px] font-bold uppercase text-slate-500">Velocidad</label><input type="number" id="s-mqV" value="${est.marquesinaVelocidad}" class="w-full border p-2 text-xs rounded-xl"></div>
                        <div><label class="text-[9px] font-bold uppercase text-slate-500">Alto Barra (px)</label><input type="number" id="s-mqH" value="${est.marquesinaAlto}" class="w-full border p-2 text-xs rounded-xl"></div>
                        <div class="col-span-2"><label class="text-[9px] font-bold uppercase text-slate-500">Tamaño Letra (px)</label><input type="number" id="s-mqS" value="${est.marquesinaSize}" class="w-full border p-2 text-xs rounded-xl"></div>
                    </div>
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
                    catSize: parseInt(document.getElementById('s-catS').value) || 24, 
                    saborSize: parseInt(document.getElementById('s-sabS').value) || 18, 
                    columnas: document.getElementById('s-col').value, 
                    animacionTipo: document.getElementById('s-anim-T').value, 
                    animacionDuracion: parseFloat(document.getElementById('s-anim-D').value) || 0.5, 
                    animacionCiclo: parseInt(document.getElementById('s-anim-C').value) || 0,
                    marquesinaActiva: document.getElementById('s-mqA').checked, 
                    marquesinaBg: document.getElementById('s-mqB').value, 
                    marquesinaColor: document.getElementById('s-mqC').value, 
                    marquesinaTexto: document.getElementById('s-mqT').value.trim() || 'BIENVENIDOS', 
                    marquesinaVelocidad: parseInt(document.getElementById('s-mqV').value) || 20,
                    marquesinaAlto: parseInt(document.getElementById('s-mqH').value) || 80,
                    marquesinaSize: parseInt(document.getElementById('s-mqS').value) || 30
                } 
              };
        
        if (currentTvData) await _supabase.from('pantallas').update(upd).eq('id', currentTvData.id);
        else await _supabase.from('pantallas').insert([{ ...upd, sucursal_id: window.currentSucId }]);
        closeModal(); verPantallasSucursal(window.currentSucId, window.currentSucName);
    };
}

window.eliminarTV = async function(id) { if(confirm('¿BORRAR TV?')) { await _supabase.from('pantallas').delete().eq('id', id); verPantallasSucursal(window.currentSucId, window.currentSucName); } };
function switchTab(tab) { activeTab = tab; renderModalContent(); }
