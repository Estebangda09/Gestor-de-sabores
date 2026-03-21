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
    document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));
    if(document.getElementById('m-'+page)) document.getElementById('m-'+page).classList.add('active');

    if (page === 'categorias') {
        header.innerHTML = `<h1 class="text-3xl font-black text-slate-800 uppercase italic">Categorías</h1><button onclick="abrirModal('cat')" class="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold">+ Nueva</button>`;
        const { data } = await _supabase.from('categorias').select('*').order('orden');
        container.innerHTML = `<div class="space-y-3">${data.map(c => `<div class="bg-white p-5 rounded-2xl shadow-sm flex justify-between border-l-8 border-blue-500 font-bold">${c.nombre} <button onclick='abrirModal("cat", ${JSON.stringify(c)})' class="text-blue-500 text-xs">EDITAR</button></div>`).join('')}</div>`;
    }

    if (page === 'sabores') {
        header.innerHTML = `<h1 class="text-3xl font-black text-slate-800 uppercase italic">Sabores</h1><button onclick="abrirModal('sabor')" class="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold">+ Nuevo</button>`;
        const { data: cats } = await _supabase.from('categorias').select('*').order('orden');
        const { data: sabs } = await _supabase.from('sabores').select('*');
        container.innerHTML = cats.map(c => {
            const ms = sabs.filter(s => s.categoria_id === c.id);
            return `<div class="mb-8 bg-white p-6 rounded-3xl shadow-sm border-l-8 border-indigo-500"><h3 class="text-xl font-bold text-indigo-600 mb-6 uppercase text-sm">${c.nombre}</h3><div class="grid grid-cols-2 md:grid-cols-4 gap-4">${ms.map(s => `<div class="border-2 p-4 rounded-2xl h-28 bg-slate-50 flex flex-col justify-between group"><div>${s.es_vegano ? 'V ':''}${s.es_sintacc ? 'T':''}</div><span class="font-bold text-xs uppercase">${s.nombre}</span><button onclick='abrirModal("sabor", ${JSON.stringify(s)})' class="hidden group-hover:block text-blue-500 text-[10px]">EDITAR</button></div>`).join('')}</div></div>`;
        }).join('');
    }

    if (page === 'precios') {
        header.innerHTML = `<h1 class="text-3xl font-black text-slate-800 uppercase italic">Precios</h1><div class="flex gap-2"><button onclick="abrirModal('cat_precio')" class="bg-slate-800 text-white px-4 py-2 rounded-xl font-bold text-xs">+ CAT</button><button onclick="abrirModal('precio')" class="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold text-xs">+ PRECIO</button></div>`;
        const { data: cats } = await _supabase.from('categorias_precios').select('*').order('orden');
        const { data: prices } = await _supabase.from('precios_globales').select('*').order('orden');
        container.innerHTML = cats.map(c => {
            const ms = prices.filter(p => p.categoria_precio_id === c.id);
            return `<div class="mb-10"><h3 class="text-xl font-black border-b-2 mb-4 uppercase italic">${c.nombre}</h3><div class="grid grid-cols-1 md:grid-cols-3 gap-4">${ms.map(p => `<div class="price-card-admin flex justify-between items-center"><div><p class="text-[10px] font-bold text-slate-400 uppercase">${p.label}</p><p class="text-lg font-black text-slate-800">$${p.valor}</p></div><button onclick='abrirModal("precio", ${JSON.stringify(p)})' class="text-blue-500 text-xs">EDITAR</button></div>`).join('')}</div></div>`;
        }).join('');
    }

    if (page === 'usuarios') {
        header.innerHTML = `<h1 class="text-3xl font-black text-slate-800 uppercase italic">Usuarios</h1><button onclick="abrirModal('usuario')" class="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold">+ Nuevo</button>`;
        const { data: users } = await _supabase.from('perfiles').select('*');
        container.innerHTML = `<div class="grid gap-4">${users.map(u => `<div class="bg-white p-5 rounded-2xl flex justify-between"><div><p class="font-black italic uppercase">${u.username}</p><p class="text-xs uppercase font-bold text-slate-400">${u.rol}</p></div><div class="flex gap-2 items-center"><button onclick='gestionarAccesos("${u.id}", "${u.username}")' class="text-xs bg-slate-800 text-white px-3 py-1 rounded-lg">ACCESOS</button><button onclick='abrirModal("usuario", ${JSON.stringify(u)})' class="text-blue-500 text-xs font-bold">EDITAR</button></div></div>`).join('')}</div>`;
    }

    if (page === 'sucursales') {
        header.innerHTML = `<h1 class="text-3xl font-black text-slate-800 uppercase italic">Sucursales</h1><button onclick="abrirModal('sucursal')" class="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold">+ Nueva</button>`;
        const { data: sucs } = await _supabase.from('sucursales').select('*');
        container.innerHTML = `<div class="grid grid-cols-1 md:grid-cols-3 gap-6">${sucs.map(s => `<div class="bg-white p-6 rounded-3xl text-center shadow-lg border-t-8 border-blue-500"><h3 class="font-black uppercase italic">${s.nombre}</h3><button onclick="showPage('admin_stock', '${s.id}')" class="w-full bg-slate-900 text-white py-3 rounded-xl font-bold text-xs mt-4 uppercase">Gestionar Stock</button></div>`).join('')}</div>`;
    }

    if (page === 'admin_stock') {
        const sucId = params;
        const { data: suc } = await _supabase.from('sucursales').select('nombre').eq('id', sucId).single();
        const { data: cats } = await _supabase.from('categorias').select('*').order('orden');
        const { data: sabs } = await _supabase.from('sabores').select('*');
        const { data: vis } = await _supabase.from('visibilidad_sabores').select('*').eq('sucursal_id', sucId);
        header.innerHTML = `<div class="flex items-center gap-4"><button onclick="showPage('sucursales')" class="text-slate-400 text-2xl">←</button><h1 class="text-2xl font-black uppercase italic tracking-tighter">${suc.nombre}</h1></div>`;
        container.innerHTML = cats.map(c => {
            const ms = sabs.filter(s => s.categoria_id === c.id);
            if(!ms.length) return '';
            return `<div class="mb-10 bg-white p-8 rounded-[40px] shadow-sm"><div class="flex justify-between items-center mb-6"><h4 class="font-black italic uppercase text-blue-500">${c.nombre}</h4><div class="flex gap-2"><button onclick="masterStock('${sucId}', ${JSON.stringify(ms.map(m=>m.id))}, true)" class="bg-emerald-500 text-white px-3 py-1 rounded-full text-[10px] font-bold">HABILITAR TODO</button><button onclick="masterStock('${sucId}', ${JSON.stringify(ms.map(m=>m.id))}, false)" class="bg-red-500 text-white px-3 py-1 rounded-full text-[10px] font-bold">PAUSAR TODO</button></div></div><div class="grid grid-cols-2 md:grid-cols-4 gap-3">${ms.map(s => { const isOk = vis.find(v => v.sabor_id === s.id)?.disponible !== false; return `<button onclick="toggleStock('${sucId}', '${s.id}', ${isOk})" class="p-5 rounded-2xl border-2 font-bold transition-all ${isOk ? 'bg-white border-blue-500 text-blue-700 shadow-md':'bg-slate-100 text-slate-400 border-transparent line-through'}">${s.nombre}</button>`; }).join('')}</div></div>`;
        }).join('');
    }
}

async function masterStock(sucId, ids, status) {
    const batch = ids.map(id => ({ sucursal_id: sucId, sabor_id: id, disponible: status }));
    await _supabase.from('visibilidad_sabores').upsert(batch);
    showPage('admin_stock', sucId);
}

async function toggleStock(sucId, saborId, current) {
    await _supabase.from('visibilidad_sabores').upsert({ sucursal_id: sucId, sabor_id: saborId, disponible: !current });
    showPage('admin_stock', sucId);
}

async function abrirModal(type, data = null) {
    const body = document.getElementById('modal-body');
    const btn = document.getElementById('btn-save');
    const title = document.getElementById('modal-title');
    document.getElementById('modal-tabs').classList.add('hidden');
    document.getElementById('modal-form').classList.add('active');
    body.innerHTML = '';
    title.innerText = (data ? "EDITAR " : "NUEVO ") + type.toUpperCase();
    btn.innerText = "GUARDAR";

    if (type === 'cat') {
        body.innerHTML = `<input id="f-nom" value="${data?.nombre || ''}" placeholder="Nombre" class="w-full border-2 p-4 rounded-2xl bg-slate-50 outline-none">`;
        btn.onclick = async () => { await _supabase.from('categorias').upsert({ id: data?.id, nombre: document.getElementById('f-nom').value }); closeModal(); showPage('categorias'); };
    }
    if (type === 'sabor') {
        const { data: cats } = await _supabase.from('categorias').select('*');
        body.innerHTML = `<input id="f-nom" value="${data?.nombre || ''}" placeholder="Nombre" class="w-full border-2 p-4 rounded-2xl bg-slate-50 outline-none"><select id="f-cat" class="w-full border-2 p-4 rounded-2xl bg-slate-50 outline-none">${cats.map(c => `<option value="${c.id}" ${data?.categoria_id === c.id ? 'selected':''}>${c.nombre}</option>`)}</select><div class="flex gap-4 p-2 font-bold text-slate-500"><label><input type="checkbox" id="f-veg" ${data?.es_vegano ? 'checked':''}> VEG</label><label><input type="checkbox" id="f-tacc" ${data?.es_sintacc ? 'checked':''}> TACC</label></div>`;
        btn.onclick = async () => { await _supabase.from('sabores').upsert({ id: data?.id, nombre: document.getElementById('f-nom').value, categoria_id: document.getElementById('f-cat').value, es_vegano: document.getElementById('f-veg').checked, es_sintacc: document.getElementById('f-tacc').checked }); closeModal(); showPage('sabores'); };
    }
    if (type === 'usuario') {
        body.innerHTML = `<input id="u-name" value="${data?.username || ''}" placeholder="Nombre" class="w-full border-2 p-4 rounded-2xl bg-slate-50 outline-none"><input id="u-email" type="email" value="${data?.username || ''}" placeholder="Email" class="w-full border-2 p-4 rounded-2xl bg-slate-50 outline-none" ${data?'disabled':''}><select id="u-rol" class="w-full border-2 p-4 rounded-2xl bg-slate-50 outline-none"><option value="empleado" ${data?.rol === 'empleado' ? 'selected':''}>Empleado</option><option value="admin" ${data?.rol === 'admin' ? 'selected':''}>Admin</option></select>`;
        btn.onclick = async () => {
            if (data) await _supabase.from('perfiles').update({ username: document.getElementById('u-name').value, rol: document.getElementById('u-rol').value }).eq('id', data.id);
            else await _supabase.rpc('admin_create_user', { p_email: document.getElementById('u-email').value, p_username: document.getElementById('u-name').value, p_rol: document.getElementById('u-rol').value });
            closeModal(); showPage('usuarios');
        };
    }
    if (type === 'cat_precio') {
        body.innerHTML = `<input id="f-nom" value="${data?.nombre || ''}" placeholder="Categoría Precios" class="w-full border-2 p-4 rounded-2xl bg-slate-50 outline-none">`;
        btn.onclick = async () => { await _supabase.from('categorias_precios').upsert({ id: data?.id, nombre: document.getElementById('f-nom').value }); closeModal(); showPage('precios'); };
    }
    if (type === 'precio') {
        const { data: cp } = await _supabase.from('categorias_precios').select('*');
        body.innerHTML = `<select id="f-cp" class="w-full border-2 p-4 rounded-2xl bg-slate-50 outline-none">${cp.map(c => `<option value="${c.id}" ${data?.categoria_precio_id === c.id ? 'selected':''}>${c.nombre}</option>`)}</select><input id="f-lab" value="${data?.label || ''}" placeholder="Etiqueta" class="w-full border-2 p-4 rounded-2xl bg-slate-50 outline-none"><input id="f-val" type="number" value="${data?.valor || ''}" placeholder="Precio" class="w-full border-2 p-4 rounded-2xl bg-slate-50 outline-none"><input id="f-img" value="${data?.imagen_url || ''}" placeholder="URL Imagen" class="w-full border-2 p-4 rounded-2xl bg-slate-50 outline-none">`;
        btn.onclick = async () => { await _supabase.from('precios_globales').upsert({ id: data?.id, categoria_precio_id: document.getElementById('f-cp').value, label: document.getElementById('f-lab').value, valor: document.getElementById('f-val').value, imagen_url: document.getElementById('f-img').value }); closeModal(); showPage('precios'); };
    }
    if (type === 'sucursal') {
        body.innerHTML = `<input id="f-nom" value="${data?.nombre || ''}" placeholder="Nombre Sucursal" class="w-full border-2 p-4 rounded-2xl bg-slate-50 outline-none">`;
        btn.onclick = async () => { await _supabase.from('sucursales').upsert({ id: data?.id, nombre: document.getElementById('f-nom').value }); closeModal(); showPage('sucursales'); };
    }
}

async function gestionarAccesos(userId, name) {
    const { data: sucs } = await _supabase.from('sucursales').select('*').order('nombre');
    const { data: vinc } = await _supabase.from('usuario_sucursales').select('sucursal_id').eq('usuario_id', userId);
    const checkIds = vinc ? vinc.map(v => v.sucursal_id) : [];
    const body = document.getElementById('modal-body');
    const btn = document.getElementById('btn-save');
    document.getElementById('modal-title').innerText = "ACCESOS: " + name;
    btn.innerText = "GUARDAR";
    body.innerHTML = `<div class="space-y-2 text-gray-700">${sucs.map(s => `<label class="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl cursor-pointer"><input type="checkbox" class="suc-check" value="${s.id}" ${checkIds.includes(s.id) ? 'checked' : ''}> <span class="font-bold uppercase">${s.nombre}</span></label>`).join('')}</div>`;
    document.getElementById('modal-form').classList.add('active');
    btn.onclick = async () => {
        await _supabase.from('usuario_sucursales').delete().eq('usuario_id', userId);
        const sel = Array.from(document.querySelectorAll('.suc-check:checked')).map(c => ({ usuario_id: userId, sucursal_id: c.value }));
        if (sel.length) await _supabase.from('usuario_sucursales').insert(sel);
        closeModal(); showPage('usuarios');
    };
}

function closeModal() { document.getElementById('modal-form').classList.remove('active'); }
async function eliminar(t, id) { if(confirm('¿BORRAR?')) { await _supabase.from(t).delete().eq('id', id); showPage(currentPage); } }
