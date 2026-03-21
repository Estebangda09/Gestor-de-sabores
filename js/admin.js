function renderMenu() {
    const nav = document.getElementById('menu-nav');
    if (userPerfil.rol === 'admin') {
        nav.innerHTML = `
            <div onclick="showPage('categorias')" id="m-categorias" class="menu-item">📁 Categorías</div>
            <div onclick="showPage('sabores')" id="m-sabores" class="menu-item">🍨 Sabores</div>
            <div onclick="showPage('sucursales')" id="m-sucursales" class="menu-item">🏪 Sucursales</div>
            <div onclick="showPage('pantallas')" id="m-pantallas" class="menu-item">📺 Pantallas</div>
            <div onclick="showPage('usuarios')" id="m-usuarios" class="menu-item">👥 Usuarios</div>
            <div onclick="showPage('precios')" id="m-precios" class="menu-item">💰 Precios</div>
        `;
    } else {
        nav.innerHTML = `<div onclick="showPage('sucursales')" id="m-sucursales" class="menu-item active">🏪 Sucursales</div>`;
    }
}

async function showPage(page, params = null) {
    currentPage = page;
    const container = document.getElementById('view-content');
    const header = document.getElementById('view-header');
    
    // Reset visual
    document.getElementById('modal-tabs').classList.add('hidden');
    document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));
    if(document.getElementById('m-'+page)) document.getElementById('m-'+page).classList.add('active');

    if (page === 'pantallas') {
        header.innerHTML = `<h1 class="text-3xl font-black text-slate-800 uppercase italic">Digital Signage</h1>`;
        const { data: sucs } = await _supabase.from('sucursales').select('*').order('nombre');
        container.innerHTML = `<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            ${sucs.map(s => `
                <div class="bg-white p-6 rounded-3xl shadow-lg border-l-8 border-blue-500">
                    <h3 class="text-xl font-black text-slate-800 uppercase mb-4">${s.nombre}</h3>
                    <button onclick="verPantallasSucursal('${s.id}', '${s.nombre}')" class="w-full bg-slate-900 text-white py-3 rounded-xl font-bold uppercase text-xs">CONFIGURAR TVs</button>
                </div>`).join('')}
        </div>`;
    }

    if (page === 'categorias') {
        header.innerHTML = `<h1 class="text-3xl font-black text-slate-800 uppercase italic">Categorías</h1><button onclick="abrirModal('cat')" class="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold">+ Nueva</button>`;
        const { data } = await _supabase.from('categorias').select('*').order('orden');
        container.innerHTML = `<div class="space-y-3">${data.map(c => `<div class="bg-white p-5 rounded-2xl shadow-sm flex justify-between border-l-8 border-blue-500 font-bold">${c.nombre} <button onclick='abrirModal("cat", ${JSON.stringify(c)})' class="text-blue-500 text-xs">EDITAR</button></div>`).join('')}</div>`;
    }

    // MODULO SABORES (Actualizado con tu mejora de UX)
if (page === 'sabores') {
    header.innerHTML = `<h1 class="text-3xl font-black text-slate-800 uppercase italic">Gestión de Sabores</h1>`;
    
    const { data: cats } = await _supabase.from('categorias').select('*').order('orden');
    const { data: sabs } = await _supabase.from('sabores').select('*').order('nombre');

    container.innerHTML = cats.map(c => {
        const saboresDeEstaCat = sabs.filter(s => s.categoria_id === c.id);
        
        return `
            <div class="mb-10 bg-white p-6 rounded-[32px] shadow-sm border border-slate-100">
                <div class="flex justify-between items-center mb-6 border-b pb-4">
                    <div>
                        <h3 class="text-xl font-black text-indigo-600 uppercase italic">${c.nombre}</h3>
                        <p class="text-[10px] font-bold text-slate-400">${saboresDeEstaCat.length} SABORES ACTIVOS</p>
                    </div>
                    <button onclick="abrirModalSaborDirecto('${c.id}', '${c.nombre}')" 
                            class="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold text-xs hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">
                        + AGREGAR A ${c.nombre}
                    </button>
                </div>

                <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    ${saboresDeEstaCat.map(s => `
                        <div class="relative border-2 border-slate-50 p-4 rounded-2xl bg-slate-50/50 hover:bg-white hover:border-indigo-200 transition-all group">
                            <div class="flex gap-1 mb-2">
                                ${s.es_vegano ? '<span class="bg-green-100 text-green-700 text-[9px] px-1.5 py-0.5 rounded font-black">V</span>' : ''}
                                ${s.es_sintacc ? '<span class="bg-amber-100 text-amber-700 text-[9px] px-1.5 py-0.5 rounded font-black">T</span>' : ''}
                            </div>
                            <p class="font-bold text-xs uppercase text-slate-700 leading-tight mb-4">${s.nombre}</p>
                            
                            <div class="flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onclick='abrirModalSaborExistente(${JSON.stringify(s)})' class="text-indigo-500 text-[10px] font-black uppercase">Editar</button>
                                <button onclick="eliminar('sabores', '${s.id}')" class="text-red-400 text-[10px]">✕</button>
                            </div>
                        </div>
                    `).join('')}
                    ${saboresDeEstaCat.length === 0 ? '<p class="text-slate-300 text-xs italic p-4">Sin sabores en esta categoría...</p>' : ''}
                </div>
            </div>`;
    }).join('');
}

    if (page === 'precios') {
        header.innerHTML = `<h1 class="text-3xl font-black text-slate-800 uppercase italic">Precios</h1><div class="flex gap-2"><button onclick="abrirModal('cat_precio')" class="bg-slate-800 text-white px-4 py-2 rounded-xl font-bold text-xs">+ CAT</button><button onclick="abrirModal('precio')" class="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold text-xs">+ PRECIO</button></div>`;
        const { data: cats } = await _supabase.from('categorias_precios').select('*').order('orden');
        const { data: prices } = await _supabase.from('precios_globales').select('*').order('orden');
        container.innerHTML = cats.map(c => {
            const ms = prices.filter(p => p.categoria_precio_id === c.id);
            return `<div class="mb-10"><h3 class="text-xl font-black border-b-2 mb-4">${c.nombre}</h3><div class="grid grid-cols-1 md:grid-cols-3 gap-4">${ms.map(p => `<div class="price-card-admin flex justify-between items-center"><div><p class="text-[10px] font-bold text-slate-400 uppercase">${p.label}</p><p class="text-lg font-black text-slate-800">$${p.valor}</p></div><button onclick='abrirModal("precio", ${JSON.stringify(p)})' class="text-blue-500 text-xs">EDITAR</button></div>`).join('')}</div></div>`;
        }).join('');
    }

    if (page === 'usuarios') {
        header.innerHTML = `<h1 class="text-3xl font-black text-slate-800 uppercase italic">Usuarios</h1><button onclick="abrirModal('usuario')" class="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold">+ Nuevo</button>`;
        const { data: users } = await _supabase.from('perfiles').select('*');
        container.innerHTML = `<div class="grid gap-4">${users.map(u => `<div class="bg-white p-5 rounded-2xl flex justify-between"><div><p class="font-black">${u.username}</p><p class="text-xs uppercase">${u.rol}</p></div><div class="flex gap-2"><button onclick='gestionarAccesos("${u.id}", "${u.username}")' class="text-xs bg-slate-100 p-2 rounded-lg">ACCESOS</button><button onclick='abrirModal("usuario", ${JSON.stringify(u)})' class="text-blue-500 text-xs">EDITAR</button></div></div>`).join('')}</div>`;
    }

    if (page === 'sucursales') {
        header.innerHTML = `<h1 class="text-3xl font-black text-slate-800 uppercase italic">Sucursales</h1><button onclick="abrirModal('sucursal')" class="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold">+ Nueva</button>`;
        const { data: sucs } = await _supabase.from('sucursales').select('*');
        container.innerHTML = `<div class="grid grid-cols-1 md:grid-cols-3 gap-6">${sucs.map(s => `<div class="bg-white p-6 rounded-3xl text-center"><h3 class="font-black uppercase">${s.nombre}</h3><button onclick="showPage('admin_stock', '${s.id}')" class="w-full bg-slate-900 text-white py-3 rounded-xl font-bold text-xs mt-4">STOCK</button></div>`).join('')}</div>`;
    }

    if (page === 'admin_stock') {
        const sucId = params;
        const { data: suc } = await _supabase.from('sucursales').select('nombre').eq('id', sucId).single();
        const { data: cats } = await _supabase.from('categorias').select('*').order('orden');
        const { data: sabs } = await _supabase.from('sabores').select('*');
        const { data: vis } = await _supabase.from('visibilidad_sabores').select('*').eq('sucursal_id', sucId);
        header.innerHTML = `<h1 class="text-2xl font-black uppercase tracking-tighter">${suc.nombre}</h1>`;
        container.innerHTML = cats.map(c => {
            const ms = sabs.filter(s => s.categoria_id === c.id);
            if(!ms.length) return '';
            return `<div class="mb-10 bg-white p-8 rounded-[40px] shadow-sm"><div class="flex justify-between items-center mb-6"><h4>${c.nombre}</h4><div class="flex gap-2"><button onclick="masterStock('${sucId}', ${JSON.stringify(ms.map(m=>m.id))}, true)" class="bg-emerald-500 text-white px-3 py-1 rounded-full text-[10px]">HABILITAR TODO</button><button onclick="masterStock('${sucId}', ${JSON.stringify(ms.map(m=>m.id))}, false)" class="bg-red-500 text-white px-3 py-1 rounded-full text-[10px]">PAUSAR TODO</button></div></div><div class="grid grid-cols-2 md:grid-cols-4 gap-3">${ms.map(s => { const isOk = vis.find(v => v.sabor_id === s.id)?.disponible !== false; return `<button onclick="toggleStock('${sucId}', '${s.id}', ${isOk})" class="p-5 rounded-2xl border-2 font-bold ${isOk ? 'bg-white border-blue-500 text-blue-700':'bg-slate-100 text-slate-400 line-through'}">${s.nombre}</button>`; }).join('')}</div></div>`;
        }).join('');
    }
}
// SOPORTE
async function masterStock(sucId, ids, status) {
    await _supabase.from('visibilidad_sabores').upsert(ids.map(id => ({ sucursal_id: sucId, sabor_id: id, disponible: status })));
    showPage('admin_stock', sucId);
}
async function toggleStock(sucId, saborId, current) {
    await _supabase.from('visibilidad_sabores').upsert({ sucursal_id: sucId, sabor_id: saborId, disponible: !current });
    showPage('admin_stock', sucId);
}
function closeModal() { 
    document.getElementById('modal-form').classList.remove('active'); 
    document.getElementById('modal-tabs').classList.add('hidden');
}
async function eliminar(t, id) { 
    if(confirm('¿BORRAR?')) { await _supabase.from(t).delete().eq('id', id); showPage(currentPage); } 
}
// Función para agregar nuevo sabor sabiendo ya la categoría
function abrirModalSaborDirecto(catId, catNombre) {
    const modal = document.getElementById('modal-form');
    const title = document.getElementById('modal-title');
    const body = document.getElementById('modal-body');
    const btn = document.getElementById('btn-save');

    title.innerText = `NUEVO EN: ${catNombre}`;
    
    body.innerHTML = `
        <input type="hidden" id="f-cat-id" value="${catId}">
        <div class="space-y-4">
            <div>
                <label class="text-[10px] font-black text-slate-400 uppercase">Nombre del Sabor</label>
                <input id="f-nombre" class="w-full border-2 p-4 rounded-2xl bg-slate-50 outline-none focus:border-indigo-500" placeholder="Ej: Chocolate Suizo">
            </div>
            <div class="flex gap-4 p-2">
                <label class="flex items-center gap-2 cursor-pointer font-bold text-xs">
                    <input type="checkbox" id="f-vegano" class="w-4 h-4"> VEGANO
                </label>
                <label class="flex items-center gap-2 cursor-pointer font-bold text-xs">
                    <input type="checkbox" id="f-sintacc" class="w-4 h-4"> SIN TACC
                </label>
            </div>
        </div>
    `;

    modal.classList.add('active');

    btn.onclick = async () => {
        const payload = {
            nombre: document.getElementById('f-nombre').value,
            categoria_id: document.getElementById('f-cat-id').value,
            es_vegano: document.getElementById('f-vegano').checked,
            es_sintacc: document.getElementById('f-sintacc').checked
        };

        if(!payload.nombre) return alert("Ponle un nombre al sabor");

        const { error } = await _supabase.from('sabores').insert([payload]);
        if(error) alert("Error: " + error.message);
        
        closeModal();
        showPage('sabores');
    };
}

// Función para editar sabor existente
function abrirModalSaborExistente(sabor) {
    const modal = document.getElementById('modal-form');
    const title = document.getElementById('modal-title');
    const body = document.getElementById('modal-body');
    const btn = document.getElementById('btn-save');

    title.innerText = "EDITAR SABOR";
    
    body.innerHTML = `
        <div class="space-y-4">
            <input id="f-nombre" value="${sabor.nombre}" class="w-full border-2 p-4 rounded-2xl bg-slate-50 outline-none focus:border-indigo-500">
            <div class="flex gap-4 p-2">
                <label class="flex items-center gap-2 cursor-pointer font-bold text-xs">
                    <input type="checkbox" id="f-vegano" ${sabor.es_vegano ? 'checked' : ''}> VEGANO
                </label>
                <label class="flex items-center gap-2 cursor-pointer font-bold text-xs">
                    <input type="checkbox" id="f-sintacc" ${sabor.es_sintacc ? 'checked' : ''}> SIN TACC
                </label>
            </div>
        </div>
    `;

    modal.classList.add('active');

    btn.onclick = async () => {
        const { error } = await _supabase.from('sabores').update({
            nombre: document.getElementById('f-nombre').value,
            es_vegano: document.getElementById('f-vegano').checked,
            es_sintacc: document.getElementById('f-sintacc').checked
        }).eq('id', sabor.id);

        if(error) alert("Error al actualizar");
        closeModal();
        showPage('sabores');
    };
}
