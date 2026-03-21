let activeTab = 'config';
let currentTvData = null;

async function verPantallasSucursal(sucId, sucName) {
    const { data: pants } = await _supabase.from('pantallas').select('*').eq('sucursal_id', sucId);
    const container = document.getElementById('view-content');
    const header = document.getElementById('view-header');
    header.innerHTML = `<div class="flex items-center gap-4"><button onclick="showPage('pantallas')" class="text-slate-400 text-2xl">←</button><h1 class="text-xl font-black uppercase italic">${sucName}</h1></div><button onclick="abrirModalPantalla('${sucId}')" class="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase shadow-lg">+ TV</button>`;
    container.innerHTML = pants.map(p => `
        <div class="bg-white p-5 rounded-2xl shadow-sm flex justify-between items-center border-2 mb-4 border-slate-100">
            <div><p class="font-black italic uppercase text-slate-700">${p.nombre}</p><p class="text-[10px] text-blue-500 uppercase font-black">${p.tipo}</p></div>
            <div class="flex gap-2">
                <button onclick="window.open('?mode=tv&id=${p.id}', '_blank')" class="bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase">VER</button>
                <button onclick='abrirModalPantalla("${sucId}", ${JSON.stringify(p)})' class="bg-blue-500 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase">DISEÑO</button>
                <button onclick="eliminarTV('${p.id}', '${sucId}', '${sucName}')" class="text-red-500 text-xs font-black">✕</button>
            </div>
        </div>`).join('');
}

async function abrirModalPantalla(sucId, data = null) {
    currentTvData = data;
    activeTab = 'config';
    // Importante: sucId se guarda globalmente para el insert
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

        window.toggleContentList = (val) => {
            const items = val === 'sabores' ? cats : prices;
            document.getElementById('list-cont').innerHTML = items.map(i => `
                <label class="flex items-center gap-2 p-2 bg-white rounded-xl cursor-pointer">
                    <input type="checkbox" class="tv-check" value="${i.id}" ${configActiva.includes(i.id) ? 'checked' : ''}> 
                    <span class="text-[10px] font-bold uppercase">${i.nombre}</span>
                </label>`).join('');
        };
        toggleContentList(currentTvData?.tipo || 'sabores');
    } else {
        const est = currentTvData?.estilo || { font: 'Inter', bg: '#fdfbf7', catColor: '#64748b', saborColor: '#1e293b', catSize: '1.2', saborSize: '1.6', marquesinaActiva: true, marquesinaBg: '#1e293b', marquesinaColor: '#ffffff', marquesinaTexto: 'CALIDAD AL ALCANCE DE TODOS' };
        body.innerHTML = `<div class="grid grid-cols-2 gap-4">
            <div><label class="text-[10px] font-bold">FUENTES</label><select id="s-font" class="w-full border p-2 rounded-xl"><option value="Inter" ${est.font==='Inter'?'selected':''}>Inter</option><option value="Oswald" ${est.font==='Oswald'?'selected':''}>Oswald</option><option value="Montserrat" ${est.font==='Montserrat'?'selected':''}>Montserrat</option></select></div>
            <div><label class="text-[10px] font-bold">FONDO</label><input type="color" id="s-bg" value="${est.bg}" class="w-full h-10"></div>
            <div><label class="text-[10px] font-bold">COLOR CAT</label><input type="color" id="s-catC" value="${est.catColor}" class="w-full h-10"></div>
            <div><label class="text-[10px] font-bold">COLOR SAB</label><input type="color" id="s-sabC" value="${est.saborColor}" class="w-full h-10"></div>
            <div><label class="text-[10px] font-bold">TAMAÑO CAT</label><input type="number" step="0.1" id="s-catS" value="${est.catSize}" class="w-full border p-2"></div>
            <div><label class="text-[10px] font-bold">TAMAÑO SAB</label><input type="number" step="0.1" id="s-sabS" value="${est.saborSize}" class="w-full border p-2"></div>
            <div class="col-span-2 border-t pt-4">
                <label class="flex items-center gap-2 font-black italic"><input type="checkbox" id="s-mqA" ${est.marquesinaActiva?'checked':''}> MARQUESINA</label>
                <div class="grid grid-cols-2 gap-2 mt-2">
                    <input type="color" id="s-mqB" value="${est.marquesinaBg}" class="w-full h-10">
                    <input type="color" id="s-mqC" value="${est.marquesinaColor}" class="w-full h-10">
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
                config_categorias: Array.from(document.querySelectorAll('.tv-check:checked')).map(c => c.value) 
            };
        } else {
            upd = { 
                estilo: { 
                    font: document.getElementById('s-font').value, 
                    bg: document.getElementById('s-bg').value, 
                    catColor: document.getElementById('s-catC').value, 
                    saborColor: document.getElementById('s-sabC').value, 
                    catSize: document.getElementById('s-catS').value, 
                    saborSize: document.getElementById('s-sabS').value, 
                    marquesinaActiva: document.getElementById('s-mqA').checked, 
                    marquesinaBg: document.getElementById('s-mqB').value, 
                    marquesinaColor: document.getElementById('s-mqC').value, 
                    marquesinaTexto: document.getElementById('s-mqT').value 
                } 
            };
        }

        if (currentTvData) {
            await _supabase.from('pantallas').update(upd).eq('id', currentTvData.id);
        } else {
            // El error estaba aquí: faltaba el sucursal_id al insertar
            await _supabase.from('pantallas').insert([{ ...upd, sucursal_id: window.currentSucId }]);
        }
        closeModal();
        // Recargar vista de pantallas para ver los cambios
        if(window.currentSucId) {
            const { data: suc } = await _supabase.from('sucursales').select('nombre').eq('id', window.currentSucId).single();
            verPantallasSucursal(window.currentSucId, suc.nombre);
        }
    };
}

function switchTab(tab) { activeTab = tab; renderModalContent(); }

async function renderPantallaTV(id) {
    const { data: pant } = await _supabase.from('pantallas').select('*').eq('id', id).single();
    if(!pant) return;
    const style = pant.estilo || { font: 'Inter', bg: '#fdfbf7', catColor: '#64748b', saborColor: '#1e293b', catSize: '1.2', saborSize: '1.6', marquesinaActiva: true, marquesinaBg: '#1e293b', marquesinaColor: '#ffffff', marquesinaTexto: 'CALIDAD AL ALCANCE DE TODOS' };
    const tv = document.getElementById('tv-container');
    tv.classList.remove('hidden');
    tv.style.backgroundColor = style.bg;
    tv.style.fontFamily = style.font;

    if (pant.tipo === 'precios') {
        const { data: catPrecios } = await _supabase.from('categorias_precios').select('*').in('id', pant.config_categorias || []).order('orden');
        const { data: prices } = await _supabase.from('precios_globales').select('*').order('orden');
        let html = `<div class="tv-layout">`;
        const mid = Math.ceil(catPrecios.length / 2);
        [catPrecios.slice(0, mid), catPrecios.slice(mid)].forEach(colCats => {
            html += `<div class="tv-column">`;
            colCats.forEach(c => {
                const items = prices.filter(p => p.categoria_precio_id === c.id);
                html += `<div class="tv-cat-header" style="color:${style.catColor}; font-size:${style.catSize}rem">${c.nombre}</div>`;
                items.forEach(p => {
                    html += `<div class="price-row" style="border-color:${style.catColor}44">
                        <div class="flex items-center gap-4">${p.imagen_url ? `<img src="${p.imagen_url}" class="h-16 w-16 object-contain">` : ''}<span class="price-label" style="color:${style.catColor}; font-size:${style.saborSize}rem">${p.label}</span></div>
                        <span class="price-value" style="color:${style.saborColor}; font-size:${style.saborSize}rem">$${p.valor}</span>
                    </div>`;
                });
            });
            html += `</div>`;
        });
        tv.innerHTML = html + `</div>`;
    } else {
        const { data: cats } = await _supabase.from('categorias').select('*').in('id', pant.config_categorias || []).order('orden');
        const { data: sabs } = await _supabase.from('sabores').select('*');
        const { data: vis } = await _supabase.from('visibilidad_sabores').select('*').eq('sucursal_id', pant.sucursal_id);
        let html = `<div class="tv-layout">`;
        const mid = Math.ceil(cats.length / 2);
        [cats.slice(0, mid), cats.slice(mid)].forEach(colCats => {
            html += `<div class="tv-column">`;
            colCats.forEach(c => {
                const disponibles = sabs.filter(s => s.categoria_id === c.id).filter(s => {
                    const v = vis.find(v => v.sabor_id === s.id);
                    return v ? v.disponible !== false : true;
                });
                if(disponibles.length) {
                    html += `<div class="tv-cat-header" style="color:${style.catColor}; font-size:${style.catSize}rem">${c.nombre}</div>
                    <div class="tv-flavor-list">${disponibles.map(s => `<div class="tv-flavor-item" style="color:${style.saborColor}; font-size:${style.saborSize}rem"><span class="tv-dot">•</span> ${s.nombre} ${s.es_sintacc ? '<span class="text-amber-600">T</span>':''} ${s.es_vegano ? '<span class="text-green-600">V</span>':''}</div>`).join('')}</div>`;
                }
            });
            html += `</div>`;
        });
        tv.innerHTML = html + `</div>`;
    }
    if (style.marquesinaActiva) {
        tv.innerHTML += `<div class="tv-ticker" style="background:${style.marquesinaBg}; color:${style.marquesinaColor}"><div class="ticker-content">${style.marquesinaTexto} • ${style.marquesinaTexto}</div></div>`;
    }
}

async function eliminarTV(id, sucId, sucName) { if(confirm('¿BORRAR TV?')) { await _supabase.from('pantallas').delete().eq('id', id); verPantallasSucursal(sucId, sucName); } }
