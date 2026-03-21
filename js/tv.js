let currentTvData = null;
let activeTab = 'config';

// --- GESTIÓN DE PANTALLAS EN EL PANEL ---

window.verPantallasSucursal = async function(sucId, sucName) {
    window.currentSucId = sucId;
    window.currentSucName = sucName;
    
    const container = document.getElementById('view-content');
    const header = document.getElementById('view-header');
    
    const { data: pants } = await _supabase.from('pantallas').select('*').eq('sucursal_id', sucId);
    
    header.innerHTML = `
        <div class="flex items-center gap-4">
            <button onclick="showPage('pantallas')" class="text-slate-400 text-2xl">←</button>
            <h1 class="text-xl font-black uppercase italic">${sucName}</h1>
        </div>
        <button onclick="abrirModalPantalla('${sucId}')" class="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase shadow-lg">+ NUEVA TV</button>`;
    
    container.innerHTML = `<div class="grid gap-4">
        ${pants.map(p => `
            <div class="bg-white p-5 rounded-2xl shadow-sm flex justify-between items-center border-2 border-slate-100">
                <div>
                    <p class="font-black italic text-slate-700">${p.nombre}</p>
                    <p class="text-[10px] text-blue-500 uppercase font-black">${p.tipo}</p>
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
    btn.innerText = "GUARDAR CAMBIOS";
    
    document.getElementById('tab-config').className = activeTab === 'config' ? 'font-bold text-blue-600 border-b-2 border-blue-600 pb-1' : 'font-bold text-slate-400 pb-1';
    document.getElementById('tab-style').className = activeTab === 'style' ? 'font-bold text-blue-600 border-b-2 border-blue-600 pb-1' : 'font-bold text-slate-400 pb-1';

    if (activeTab === 'config') {
        const { data: cats } = await _supabase.from('categorias').select('*').order('orden');
        const { data: prices } = await _supabase.from('categorias_precios').select('*').order('orden');
        const configActiva = currentTvData?.config_categorias || [];
        
        body.innerHTML = `
            <input id="p-nom" value="${currentTvData?.nombre || ''}" placeholder="Nombre TV" class="w-full border-2 p-4 rounded-2xl bg-slate-50 outline-none">
            <select id="p-tipo" class="w-full border-2 p-4 rounded-2xl bg-slate-50 outline-none" onchange="toggleContentList(this.value)">
                <option value="sabores" ${currentTvData?.tipo === 'sabores' ? 'selected':''}>Sabores</option>
                <option value="precios" ${currentTvData?.tipo === 'precios' ? 'selected':''}>Precios</option>
            </select>
            <p class="text-[10px] font-black uppercase text-slate-400 mt-2">Mostrar categorías:</p>
            <div id="list-cont" class="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 bg-slate-50 rounded-2xl border"></div>`;

        window.toggleContentList = async (val) => {
            const { data: items } = val === 'sabores' ? await _supabase.from('categorias').select('*').order('orden') : await _supabase.from('categorias_precios').select('*').order('orden');
            document.getElementById('list-cont').innerHTML = items.map(i => `
                <label class="flex items-center gap-2 p-2 bg-white rounded-xl cursor-pointer">
                    <input type="checkbox" class="tv-check" value="${i.id}" ${configActiva.includes(i.id) ? 'checked' : ''}> 
                    <span class="text-[10px] font-bold uppercase">${i.nombre}</span>
                </label>`).join('');
        };
        toggleContentList(currentTvData?.tipo || 'sabores');
    } else {
        const est = currentTvData?.estilo || { font: 'Inter', bg: '#fdfbf7', catColor: '#64748b', saborColor: '#1e293b', catSize: '1.2', saborSize: '1.6', marquesinaActiva: true, marquesinaBg: '#1e293b', marquesinaColor: '#ffffff', marquesinaTexto: 'BIENVENIDOS' };
        body.innerHTML = `<div class="grid grid-cols-2 gap-4">
            <div><label class="text-[10px] font-bold uppercase">Tipografía</label><select id="s-font" class="w-full border p-2 rounded-xl"><option value="Inter" ${est.font==='Inter'?'selected':''}>Inter</option><option value="Oswald" ${est.font==='Oswald'?'selected':''}>Oswald</option><option value="Montserrat" ${est.font==='Montserrat'?'selected':''}>Montserrat</option></select></div>
            <div><label class="text-[10px] font-bold uppercase">Color Fondo</label><input type="color" id="s-bg" value="${est.bg}" class="w-full h-10 border-none"></div>
            <div><label class="text-[10px] font-bold uppercase">Color Categoría</label><input type="color" id="s-catC" value="${est.catColor}" class="w-full h-10 border-none"></div>
            <div><label class="text-[10px] font-bold uppercase">Color Nombres</label><input type="color" id="s-sabC" value="${est.saborColor}" class="w-full h-10 border-none"></div>
            <div><label class="text-[10px] font-bold uppercase">Tamaño Cat (rem)</label><input type="number" step="0.1" id="s-catS" value="${est.catSize}" class="w-full border p-2 rounded-xl"></div>
            <div><label class="text-[10px] font-bold uppercase">Tamaño Nombre (rem)</label><input type="number" step="0.1" id="s-sabS" value="${est.saborSize}" class="w-full border p-2 rounded-xl"></div>
            <div class="col-span-2 border-t pt-4">
                <label class="flex items-center gap-2 font-black italic text-xs"><input type="checkbox" id="s-mqA" ${est.marquesinaActiva?'checked':''}> HABILITAR MARQUESINA</label>
                <div class="grid grid-cols-2 gap-2 mt-2"><input type="color" id="s-mqB" value="${est.marquesinaBg}" class="w-full h-10 border-none"><input type="color" id="s-mqC" value="${est.marquesinaColor}" class="w-full h-10 border-none"></div>
                <input id="s-mqT" value="${est.marquesinaTexto}" class="w-full border p-3 rounded-xl mt-2 text-xs" placeholder="Texto de la marquesina...">
            </div>
        </div>`;
    }

    btn.onclick = async () => {
        let upd = {};
        if (activeTab === 'config') {
            upd = { 
                nombre: document.getElementById('p-nom').value, 
                tipo: document.getElementById('p-tipo').value, 
                config_categorias: Array.from(document.querySelectorAll('.tv-check:checked')).map(c => c.value) 
            };
        } else {
            upd = { 
                estilo: { 
                    font: document.getElementById('s-font').value, bg: document.getElementById('s-bg').value, 
                    catColor: document.getElementById('s-catC').value, saborColor: document.getElementById('s-sabC').value, 
                    catSize: document.getElementById('s-catS').value, saborSize: document.getElementById('s-sabS').value, 
                    marquesinaActiva: document.getElementById('s-mqA').checked, marquesinaBg: document.getElementById('s-mqB').value, 
                    marquesinaColor: document.getElementById('s-mqC').value, marquesinaTexto: document.getElementById('s-mqT').value 
                } 
            };
        }

        if (currentTvData) {
            await _supabase.from('pantallas').update(upd).eq('id', currentTvData.id);
        } else {
            await _supabase.from('pantallas').insert([{ ...upd, sucursal_id: window.currentSucId }]);
        }
        closeModal();
        verPantallasSucursal(window.currentSucId, window.currentSucName);
    };
}

// --- RENDERIZADO DE LA TV ---

window.renderPantallaTV = async function(id) {
    const { data: pant } = await _supabase.from('pantallas').select('*').eq('id', id).single();
    if(!pant) return;
    
    const style = pant.estilo || { 
        font: 'Inter', bg: '#fdfbf7', catColor: '#64748b', 
        saborColor: '#1e293b', catSize: '1.2', saborSize: '1.6', 
        marquesinaActiva: true, marquesinaBg: '#1e293b', 
        marquesinaColor: '#ffffff', marquesinaTexto: 'BIENVENIDOS' 
    };
    
    const tv = document.getElementById('tv-container');
    tv.classList.remove('hidden');
    tv.style.backgroundColor = style.bg;
    tv.style.fontFamily = style.font;

    // --- LÓGICA DE PRECIOS ---
    if (pant.tipo === 'precios') {
        const { data: catPrecios } = await _supabase.from('categorias_precios').select('*').in('id', pant.config_categorias || []).order('orden');
        const { data: prices } = await _supabase.from('precios_globales').select('*').order('orden');
        
        let html = `<div class="tv-layout" style="grid-template-columns: 1fr 1fr;">`;
        const mid = Math.ceil(catPrecios.length / 2);
        
        const columnGroups = [catPrecios.slice(0, mid), catPrecios.slice(mid)];

        columnGroups.forEach(colCats => {
            html += `<div class="tv-column">`;
            colCats.forEach(c => {
                const items = prices.filter(p => p.categoria_precio_id === c.id);
                // Categoría en MAYÚSCULAS
                html += `<div class="tv-cat-header" style="color:${style.catColor}; font-size:${style.catSize}rem; text-transform: uppercase;">${c.nombre}</div>`;
                items.forEach(p => {
                    html += `
                    <div class="price-row" style="border-color:${style.catColor}44; display: flex; justify-content: space-between; align-items: center; padding: 10px 0;">
                        <div class="flex items-center gap-4">
                            ${p.imagen_url ? `<img src="${p.imagen_url}" class="h-16 w-16 object-contain">` : ''}
                            <span class="price-label" style="color:${style.catColor}; font-size:${style.saborSize}rem; font-weight:700;">${p.label}</span>
                        </div>
                        <span class="price-value" style="color:${style.saborColor}; font-size:${style.saborSize}rem; font-weight:900;">$${p.valor}</span>
                    </div>`;
                });
            });
            html += `</div>`;
        });
        tv.innerHTML = html + `</div>`;

    // --- LÓGICA DE SABORES ---
    } else {
        const { data: cats } = await _supabase.from('categorias').select('*').in('id', pant.config_categorias || []).order('orden');
        const { data: sabs } = await _supabase.from('sabores').select('*').order('nombre');
        const { data: vis } = await _supabase.from('visibilidad_sabores').select('*').eq('sucursal_id', pant.sucursal_id);
        
        let html = `<div class="tv-layout">`;
        const mid = Math.ceil(cats.length / 2);
        const columnGroups = [cats.slice(0, mid), cats.slice(mid)];

        columnGroups.forEach(colCats => {
            html += `<div class="tv-column">`;
            colCats.forEach(c => {
                const disponibles = sabs.filter(s => s.categoria_id === c.id).filter(s => {
                    const v = vis.find(v => v.sabor_id === s.id);
                    return v ? v.disponible !== false : true;
                });
                
                if(disponibles.length) {
                    // CATEGORÍAS EN MAYÚSCULAS
                    html += `
                        <div class="tv-category-block" style="margin-bottom: 30px;">
                            <div class="tv-cat-header" style="color:${style.catColor}; font-size:${style.catSize}rem; text-transform: uppercase; font-weight: 400; letter-spacing: 1px;">
                                ${c.nombre}
                            </div>
                            <div class="tv-flavor-list" style="margin-top: 15px;">
                                ${disponibles.map(s => {
                                    // Sabor: Mayúscula Inicial solamente
                                    const nombreFormateado = s.nombre.charAt(0).toUpperCase() + s.nombre.slice(1).toLowerCase();
                                    
                                    return `
                                    <div class="tv-flavor-item" style="color:${style.saborColor}; font-size:${style.saborSize}rem; display: flex; align-items: center; gap: 10px; margin-bottom: 5px;">
                                        <span class="tv-dot" style="color: #3b82f6;">•</span>
                                        <span style="font-weight: 700;">${nombreFormateado}</span>
                                        <div class="flex gap-2 items-center">
                                            ${s.es_sintacc ? `<img src="img/sintacc.png" style="height: 1.1em; width: auto;" alt="T">` : ''}
                                            ${s.es_vegano ? `<img src="img/vegano.png" style="height: 1.1em; width: auto;" alt="V">` : ''}
                                        </div>
                                    </div>`;
                                }).join('')}
                            </div>
                        </div>`;
                }
            });
            html += `</div>`;
        });
        tv.innerHTML = html + `</div>`;
    }
    
    // Marquesina (Ticker)
    if (style.marquesinaActiva) {
        tv.innerHTML += `
            <div class="tv-ticker" style="background:${style.marquesinaBg}; color:${style.marquesinaColor}">
                <div class="ticker-content">${style.marquesinaTexto} • ${style.marquesinaTexto}</div>
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
