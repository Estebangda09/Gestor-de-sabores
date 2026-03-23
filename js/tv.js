let currentTvData = null;
let activeTab = 'config';

window.verPantallasSucursal = async function(sucId, sucName) {
    window.currentSucId = sucId;
    window.currentSucName = sucName;
    const { data: pants } = await _supabase.from('pantallas').select('*').eq('sucursal_id', sucId);
    const container = document.getElementById('view-content');
    const header = document.getElementById('view-header');
    
    header.innerHTML = `
        <div class="flex items-center gap-4">
            <button onclick="showPage('pantallas')" class="text-slate-400 text-2xl">←</button>
            <h1 class="text-xl font-black uppercase italic">${sucName}</h1>
        </div>
        <button onclick="abrirModalPantalla('${sucId}')" class="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase">+ TV</button>`;
    
    container.innerHTML = `<div class="grid gap-4">
        ${pants.map(p => `
            <div class="bg-white p-5 rounded-2xl shadow-sm flex justify-between items-center border-2 border-slate-100">
                <div>
                    <p class="font-black italic text-slate-700">${p.nombre}</p>
                    <p class="text-[10px] text-blue-500 uppercase font-black">${p.tipo} - ${p.orientacion || '16:9'}</p>
                </div>
                <div class="flex gap-2">
                    <button onclick="window.open('?mode=tv&id=${p.id}', '_blank')" class="bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase">VER</button>
                    <button onclick='abrirModalPantalla("${sucId}", ${JSON.stringify(p)})' class="bg-blue-500 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase">DISEÑO</button>
                    <button onclick="eliminarTV('${p.id}')" class="text-red-500 text-xs font-black">✕</button>
                </div>
            </div>`).join('')}
    </div>`;
}

window.abrirModalPantalla = async function(sucId, data = null) {
    currentTvData = data;
    activeTab = 'config';
    window.currentSucId = sucId;
    document.getElementById('modal-tabs').classList.toggle('hidden', !data);
    document.getElementById('modal-form').classList.add('active');
    renderModalContent();
}

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
            <div class="grid grid-cols-2 gap-4">
                <select id="p-tipo" class="w-full border-2 p-4 rounded-2xl bg-slate-50 outline-none" onchange="toggleContentList(this.value)">
                    <option value="sabores" ${currentTvData?.tipo === 'sabores' ? 'selected':''}>Sabores</option>
                    <option value="precios" ${currentTvData?.tipo === 'precios' ? 'selected':''}>Precios</option>
                </select>
                <select id="p-ori" class="w-full border-2 p-4 rounded-2xl bg-slate-50 outline-none">
                    <option value="16:9" ${currentTvData?.orientacion === '16:9' ? 'selected':''}>Horizontal (16:9)</option>
                    <option value="9:16" ${currentTvData?.orientacion === '9:16' ? 'selected':''}>Vertical (9:16)</option>
                </select>
            </div>
            <div id="list-cont" class="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 bg-slate-50 rounded-2xl border">
                ${(currentTvData?.tipo === 'precios' ? prices : cats).map(i => `
                    <label class="flex items-center gap-2 p-2 bg-white rounded-xl cursor-pointer">
                        <input type="checkbox" class="tv-check" value="${i.id}" ${configActiva.includes(i.id) ? 'checked' : ''}> 
                        <span class="text-[10px] font-bold uppercase">${i.nombre}</span>
                    </label>`).join('')}
            </div>`;
    } else {
        const est = currentTvData?.estilo || { font: 'Inter', bg: '#fdfbf7', catColor: '#64748b', saborColor: '#1e293b', catSize: '1.2', saborSize: '1.6', columnas: 2, marquesinaActiva: false, marquesinaBg: '#1e293b', marquesinaColor: '#ffffff', marquesinaTexto: 'BIENVENIDOS', marquesinaVelocidad: 20 };
        body.innerHTML = `
        <div class="grid grid-cols-2 gap-4">
            <div><label class="text-[10px] font-bold uppercase">Tipografía</label><select id="s-font" class="w-full border p-2 rounded-xl"><option value="Inter" ${est.font==='Inter'?'selected':''}>Inter</option><option value="Oswald" ${est.font==='Oswald'?'selected':''}>Oswald</option><option value="Montserrat" ${est.font==='Montserrat'?'selected':''}>Montserrat</option></select></div>
            <div><label class="text-[10px] font-bold uppercase">Distribución</label><select id="s-col" class="w-full border p-2 rounded-xl"><option value="2" ${est.columnas==2?'selected':''}>2 Columnas (Lado a lado)</option><option value="1" ${est.columnas==1?'selected':''}>1 Columna (Una abajo de otra)</option></select></div>
            <div><label class="text-[10px] font-bold uppercase">Fondo</label><input type="color" id="s-bg" value="${est.bg}" class="w-full h-10"></div>
            <div><label class="text-[10px] font-bold uppercase">Color Categoría</label><input type="color" id="s-catC" value="${est.catColor}" class="w-full h-10"></div>
            <div><label class="text-[10px] font-bold uppercase">Tamaño Cat (rem)</label><input type="number" step="0.1" id="s-catS" value="${est.catSize}" class="w-full border p-2"></div>
            <div><label class="text-[10px] font-bold uppercase">Tamaño Sabor (rem)</label><input type="number" step="0.1" id="s-sabS" value="${est.saborSize}" class="w-full border p-2"></div>
            <div class="col-span-2 border-t pt-4">
                <label class="flex items-center gap-2 font-black italic text-xs"><input type="checkbox" id="s-mqA" ${est.marquesinaActiva?'checked':''}> HABILITAR MARQUESINA</label>
                <div class="grid grid-cols-3 gap-2 mt-2">
                    <input type="color" id="s-mqB" value="${est.marquesinaBg}" title="Fondo" class="w-full h-10">
                    <input type="color" id="s-mqC" value="${est.marquesinaColor}" title="Texto" class="w-full h-10">
                    <input type="number" id="s-mqV" value="${est.marquesinaVelocidad || 20}" title="Velocidad (menor es más rápido)" class="w-full border p-2 text-xs">
                </div>
                <input id="s-mqT" value="${est.marquesinaTexto}" class="w-full border p-3 rounded-xl mt-2 text-xs">
            </div>
        </div>`;
    }

    btn.onclick = async () => {
        let upd = {};
        if (activeTab === 'config') {
            upd = { 
                nombre: document.getElementById('p-nom').value, 
                tipo: document.getElementById('p-tipo').value, 
                orientacion: document.getElementById('p-ori').value,
                config_categorias: Array.from(document.querySelectorAll('.tv-check:checked')).map(c => c.value) 
            };
        } else {
            upd = { 
                estilo: { 
                    font: document.getElementById('s-font').value, 
                    bg: document.getElementById('s-bg').value, 
                    catColor: document.getElementById('s-catC').value, 
                    saborColor: currentTvData?.estilo?.saborColor || '#1e293b', 
                    catSize: document.getElementById('s-catS').value, 
                    saborSize: document.getElementById('s-sabS').value, 
                    columnas: document.getElementById('s-col').value,
                    marquesinaActiva: document.getElementById('s-mqA').checked, 
                    marquesinaBg: document.getElementById('s-mqB').value, 
                    marquesinaColor: document.getElementById('s-mqC').value, 
                    marquesinaTexto: document.getElementById('s-mqT').value,
                    marquesinaVelocidad: document.getElementById('s-mqV').value
                } 
            };
        }
        if (currentTvData) await _supabase.from('pantallas').update(upd).eq('id', currentTvData.id);
        else await _supabase.from('pantallas').insert([{ ...upd, sucursal_id: window.currentSucId }]);
        closeModal();
        verPantallasSucursal(window.currentSucId, window.currentSucName);
    };
}

window.renderPantallaTV = async function(id) {
    const { data: pant, error } = await _supabase.from('pantallas').select('*').eq('id', id).single();
    if(error || !pant) return console.error("Error cargando pantalla:", error);
    
    const style = pant.estilo || { 
        font: 'Inter', bg: '#fdfbf7', catColor: '#64748b', saborColor: '#1e293b', 
        catSize: '1.2', saborSize: '1.6', columnas: 2, 
        marquesinaActiva: false, marquesinaVelocidad: 20 
    };
    
    const tv = document.getElementById('tv-container');
    tv.classList.remove('hidden');
    tv.style.backgroundColor = style.bg;
    tv.style.fontFamily = style.font;

    // Layout según columnas (1 o 2)
    const gridCols = pant.orientacion === '9:16' ? '1fr' : (style.columnas == 1 ? '1fr' : '1fr 1fr');

    if (pant.tipo === 'precios') {
        const { data: catPrecios } = await _supabase.from('categorias_precios').select('*').in('id', pant.config_categorias || []).order('orden');
        const { data: prices } = await _supabase.from('precios_globales').select('*').order('orden');
        
        let html = `<div class="tv-layout" style="grid-template-columns: ${gridCols};">`;
        catPrecios.forEach(c => {
            const items = prices.filter(p => p.categoria_precio_id === c.id);
            html += `<div class="tv-column"><div class="tv-cat-header" style="color:${style.catColor}; font-size:${style.catSize}rem; text-transform: uppercase;">${c.nombre}</div>`;
            items.forEach(p => {
                html += `<div class="price-row" style="border-color:${style.catColor}44">
                    <div class="flex items-center gap-4">
                        ${p.imagen_url ? `<img src="${p.imagen_url}" class="h-16 w-16 object-contain">` : ''}
                        <span class="price-label" style="color:${style.catColor}; font-size:${style.saborSize}rem">${p.label}</span>
                    </div>
                    <span class="price-value" style="color:${style.saborColor}; font-size:${style.saborSize}rem">$${p.valor}</span>
                </div>`;
            });
            html += `</div>`;
        });
        tv.innerHTML = html + `</div>`;
    } else {
        const { data: cats } = await _supabase.from('categorias').select('*').in('id', pant.config_categorias || []).order('orden');
        const { data: sabs } = await _supabase.from('sabores').select('*').order('nombre');
        const { data: vis } = await _supabase.from('visibilidad_sabores').select('*').eq('sucursal_id', pant.sucursal_id);
        
        let html = `<div class="tv-layout" style="grid-template-columns: ${gridCols};">`;
        cats.forEach(c => {
            const disponibles = sabs.filter(s => s.categoria_id === c.id).filter(s => {
                const v = vis.find(v => v.sabor_id === s.id);
                return v ? v.disponible !== false : true;
            });
            if(disponibles.length) {
                html += `<div class="tv-column">
                    <div class="tv-cat-header" style="color:${style.catColor}; font-size:${style.catSize}rem; text-transform: uppercase;">${c.nombre}</div>
                    <div class="tv-flavor-list">
                        ${disponibles.map(s => `
                            <div class="tv-flavor-item" style="color:${style.saborColor}; font-size:${style.saborSize}rem">
                                <span class="tv-dot">•</span> ${s.nombre.charAt(0).toUpperCase() + s.nombre.slice(1).toLowerCase()}
                                <div class="flex gap-2 items-center">
                                    ${s.es_sintacc ? `<img src="img/sintacc.png" style="height: 1.1em; width: auto;">` : ''}
                                    ${s.es_vegano ? `<img src="img/vegano.png" style="height: 1.1em; width: auto;">` : ''}
                                </div>
                            </div>`).join('')}
                    </div>
                </div>`;
            }
        });
        tv.innerHTML = html + `</div>`;
    }
    
    // Marquesina RSS Infinita
    if (style.marquesinaActiva) {
        const duracion = style.marquesinaVelocidad || 20;
        tv.innerHTML += `
            <div class="tv-ticker" style="background:${style.marquesinaBg}; color:${style.marquesinaColor}">
                <div class="ticker-content" style="animation: ticker ${duracion}s linear infinite;">
                    ${style.marquesinaTexto} &nbsp;&nbsp; • &nbsp;&nbsp; ${style.marquesinaTexto} &nbsp;&nbsp; • &nbsp;&nbsp; ${style.marquesinaTexto}
                </div>
            </div>`;
    }
}

window.eliminarTV = async function(id) { 
    if(confirm('¿BORRAR TV?')) { 
        await _supabase.from('pantallas').delete().eq('id', id); 
        verPantallasSucursal(window.currentSucId, window.currentSucName); 
    } 
}
function switchTab(tab) { activeTab = tab; renderModalContent(); }
