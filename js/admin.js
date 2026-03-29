// js/admin.js
let currentPage = '';

function renderMenu() {
    const nav = document.getElementById('menu-nav');
    const p = window.userPerfil?.permisos || {};
    let html = '';

    if (window.userPerfil?.rol === 'admin') {
        html = `
            <div onclick="showPage('categorias')" id="m-categorias" class="menu-item">📁 Categorías</div>
            <div onclick="showPage('sabores')" id="m-sabores" class="menu-item">🍨 Sabores</div>
            <div onclick="showPage('sucursales')" id="m-sucursales" class="menu-item">🏪 Sucursales</div>
            <div onclick="showPage('pantallas')" id="m-pantallas" class="menu-item">📺 Pantallas</div>
            <div onclick="showPage('usuarios')" id="m-usuarios" class="menu-item">👥 Usuarios</div>
            <div onclick="showPage('precios')" id="m-precios" class="menu-item">💰 Precios</div>
        `;
    } else {
        if (p.categorias) html += `<div onclick="showPage('categorias')" id="m-categorias" class="menu-item">📁 Categorías</div>`;
        if (p.sabores) html += `<div onclick="showPage('sabores')" id="m-sabores" class="menu-item">🍨 Sabores</div>`;
        if (p.sucursales) html += `<div onclick="showPage('sucursales')" id="m-sucursales" class="menu-item">🏪 Sucursales</div>`;
        if (p.pantallas) html += `<div onclick="showPage('pantallas')" id="m-pantallas" class="menu-item">📺 Pantallas</div>`;
        if (p.precios) html += `<div onclick="showPage('precios')" id="m-precios" class="menu-item">💰 Precios</div>`;
    }
    
    html += `
        <div class="mt-10 pt-4 border-t border-slate-700/50">
            <div onclick="abrirMiPerfil()" class="menu-item text-blue-400">👤 Mi Perfil</div>
        </div>
    `;
    nav.innerHTML = html;
}

async function showPage(page, params = null) {
    if (!window.userPerfil) {
        setTimeout(() => showPage(page, params), 200);
        return;
    }

    const paginasProhibidas = ['categorias', 'sabores', 'usuarios', 'precios', 'pantallas'];
    if (window.userPerfil.rol !== 'admin' && paginasProhibidas.includes(page)) {
        const p = window.userPerfil.permisos || {};
        if (!p[page]) page = 'sucursales'; 
    }
  
    currentPage = page;
    const container = document.getElementById('view-content');
    const header = document.getElementById('view-header');
    
    document.getElementById('modal-tabs').classList.add('hidden');
    document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));
    if(document.getElementById('m-'+page)) document.getElementById('m-'+page).classList.add('active');

    if (page === 'usuarios') {
        header.innerHTML = `<h1 class="text-3xl font-black text-slate-800 uppercase italic">Usuarios</h1>
                            <button onclick="abrirModalUsuario()" class="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold shadow-lg">+ NUEVO USUARIO</button>`;
        const { data: users } = await _supabase.from('perfiles').select('*').order('username');
        container.innerHTML = `<div class="grid gap-4">${(users || []).map(u => `
            <div class="bg-white p-6 rounded-3xl shadow-sm flex justify-between items-center border-l-8 ${u.rol === 'admin' ? 'border-amber-400' : 'border-emerald-400'}">
                <div><p class="font-black text-slate-700 text-xl uppercase italic">${u.username}</p><p class="text-xs text-slate-400 font-bold uppercase tracking-widest">${u.rol}</p></div>
                <div class="flex gap-3">
                    ${u.rol !== 'admin' ? `<button onclick='abrirModalAccesos("${u.id}", "${u.username}")' class="bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-bold uppercase">PERMISOS SUCURSAL</button>` : ''}
                    <button onclick='abrirModalUsuario(${JSON.stringify(u)})' class="text-blue-500 font-bold text-xs p-2">EDITAR</button>
                    <button onclick="eliminar('perfiles','${u.id}')" class="text-red-300 font-bold text-xs p-2">✕</button>
                </div>
            </div>`).join('')}</div>`;
    }

    if (page === 'sucursales') {
        header.innerHTML = `<h1 class="text-3xl font-black text-slate-800 uppercase italic">Mis Sucursales</h1>
                            ${window.userPerfil.rol === 'admin' ? `<button onclick="abrirModal('sucursal')" class="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold">+ NUEVA</button>` : ''}`;
        const { data: sucs } = await _supabase.rpc('obtener_sucursales_por_permiso', { p_usuario_id: window.userPerfil.id, p_rol: window.userPerfil.rol });
        if (!sucs || sucs.length === 0) {
            container.innerHTML = `<div class="text-center p-20 bg-white rounded-3xl text-slate-400 font-bold">No tienes sucursales asignadas.</div>`;
            return;
        }
        container.innerHTML = `<div class="grid grid-cols-1 md:grid-cols-3 gap-6">${sucs.map(s => `
            <div class="bg-white p-6 rounded-3xl shadow-lg border-t-8 border-blue-500 text-center">
                <h3 class="text-xl font-black mb-4 uppercase italic text-slate-800">${s.nombre}</h3>
                <button onclick="showPage('admin_stock', '${s.id}')" class="w-full bg-slate-900 text-white py-3 rounded-xl font-black text-xs hover:bg-blue-600 transition uppercase">Gestionar Stock</button>
                ${window.userPerfil.rol === 'admin' ? `<div class="mt-4 flex justify-center gap-4"><button onclick='abrirModal("sucursal", ${JSON.stringify(s)})' class="text-[10px] text-blue-400 font-bold">EDITAR</button></div>` : ''}
            </div>`).join('')}</div>`;
    }

    if (page === 'sabores') {
        header.innerHTML = `<h1 class="text-3xl font-black text-slate-800 uppercase italic">Sabores</h1>`;
        const { data: cats } = await _supabase.from('categorias').select('*').order('orden');
        const { data: sabs } = await _supabase.from('sabores').select('*').order('nombre');
        container.innerHTML = (cats || []).map(c => {
            const ms = (sabs || []).filter(s => s.categoria_id === c.id);
            return `<div class="mb-10 bg-white p-6 rounded-[32px] shadow-sm border border-slate-100">
                <div class="flex justify-between items-center mb-6 border-b pb-4">
                    <h3 class="text-xl font-black text-indigo-600 uppercase italic">${c.nombre}</h3>
                    <button onclick="abrirModalSaborDirecto('${c.id}', '${c.nombre}')" class="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold text-xs shadow-lg">+ AGREGAR A ${c.nombre}</button>
                </div>
                <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">${ms.map(s => `
                    <div class="relative border-2 border-slate-50 p-4 rounded-2xl bg-slate-50/50 hover:bg-white transition-all group">
                        <div class="flex gap-1 mb-2">
                            ${s.es_vegano ? '<span class="bg-green-100 text-green-700 text-[9px] px-1.5 py-0.5 rounded font-black">V</span>' : ''}
                            ${s.es_sintacc ? '<span class="bg-amber-100 text-amber-700 text-[9px] px-1.5 py-0.5 rounded font-black">T</span>' : ''}
                        </div>
                        <p class="font-bold text-xs uppercase text-slate-700 mb-4">${s.nombre}</p>
                        <div class="flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onclick='abrirModalSaborExistente(${JSON.stringify(s)})' class="text-indigo-500 text-[10px] font-black uppercase">Editar</button>
                            <button onclick="eliminar('sabores', '${s.id}')" class="text-red-400 text-[10px]">✕</button>
                        </div>
                    </div>`).join('')}</div></div>`;
        }).join('');
    }

    if (page === 'precios') {
        header.innerHTML = `<h1 class="text-3xl font-black text-slate-800 uppercase italic">Precios</h1>
            <div class="flex gap-2"><button onclick="abrirModal('cat_precio')" class="bg-slate-800 text-white px-4 py-2 rounded-xl font-bold text-xs">+ CAT</button>
            <button onclick="abrirModal('precio')" class="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold text-xs">+ PRECIO</button></div>`;
        const { data: cats } = await _supabase.from('categorias_precios').select('*').order('orden');
        const { data: prices } = await _supabase.from('precios_globales').select('*').order('orden');
        container.innerHTML = (cats || []).map(c => {
            const ms = (prices || []).filter(p => p.categoria_precio_id === c.id);
            return `<div class="mb-10"><h3 class="text-xl font-black border-b-2 mb-4 uppercase italic text-slate-800">${c.nombre}</h3>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">${ms.map(p => `
                <div class="price-card-admin flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                    <div><p class="text-[10px] font-bold text-slate-400 uppercase">${p.label}</p><p class="text-lg font-black text-slate-800">$${p.valor}</p></div>
                    <button onclick='abrirModal("precio", ${JSON.stringify(p)})' class="text-blue-500 font-bold text-xs p-2">EDITAR</button>
                </div>`).join('')}</div></div>`;
        }).join('');
    }

    if (page === 'pantallas') {
        header.innerHTML = `<h1 class="text-3xl font-black text-slate-800 uppercase italic">Digital Signage</h1>`;
        const { data: sucs } = await _supabase.from('sucursales').select('*').order('nombre');
        container.innerHTML = `<div class="grid grid-cols-1 md:grid-cols-2 gap-6">${(sucs || []).map(s => `
            <div class="bg-white p-6 rounded-3xl shadow-lg border-l-8 border-blue-500">
                <h3 class="text-xl font-black text-slate-800 uppercase mb-4">${s.nombre}</h3>
                <button onclick="verPantallasSucursal('${s.id}', '${s.nombre}')" class="w-full bg-slate-900 text-white py-3 rounded-xl font-bold uppercase text-xs">CONFIGURAR TVs</button>
            </div>`).join('')}</div>`;
    }

    if (page === 'admin_stock') {
        const sucId = params;
        const { data: suc } = await _supabase.from('sucursales').select('nombre').eq('id', sucId).single();
        const { data: cats } = await _supabase.from('categorias').select('*').order('orden');
        const { data: sabs } = await _supabase.from('sabores').select('*').order('nombre');
        const { data: vis } = await _supabase.from('visibilidad_sabores').select('*').eq('sucursal_id', sucId);
        
        header.innerHTML = `<div class="flex items-center gap-4"><button onclick="showPage('sucursales')" class="text-slate-400 text-2xl">←</button><h1 class="text-2xl font-black uppercase italic">${suc.nombre}</h1></div>`;
        container.innerHTML = cats.map(c => {
            const ms = sabs.filter(s => s.categoria_id === c.id);
            if(!ms.length) return '';
            return `<div class="mb-10 bg-white p-8 rounded-[40px] shadow-sm">
                <div class="flex justify-between items-center mb-6"><h4 class="font-black italic uppercase text-blue-500">${c.nombre}</h4>
                <div class="flex gap-2">
                    <button onclick='masterStock("${sucId}", ${JSON.stringify(ms.map(m=>m.id))}, true)' class="bg-emerald-500 text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase">Habilitar todo</button>
                    <button onclick='masterStock("${sucId}", ${JSON.stringify(ms.map(m=>m.id))}, false)' class="bg-red-500 text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase">Pausar todo</button>
                </div></div>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-3">${ms.map(s => { 
                    const isOk = vis.find(v => v.sabor_id === s.id)?.disponible !== false; 
                    return `<button onclick="toggleStock('${sucId}', '${s.id}', ${isOk})" class="p-5 rounded-2xl border-2 font-bold transition-all ${isOk ? 'bg-white border-blue-500 text-blue-700 shadow-md':'bg-slate-100 text-slate-400 border-transparent line-through'}">${s.nombre}</button>`; 
                }).join('')}</div></div>`;
        }).join('');
    }

    if (page === 'categorias') {
        header.innerHTML = `<h1 class="text-3xl font-black text-slate-800 uppercase italic">Categorías</h1><button onclick="abrirModal('cat')" class="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold">+ Nueva</button>`;
        const { data } = await _supabase.from('categorias').select('*').order('orden');
        container.innerHTML = `<div class="space-y-3">${(data || []).map(c => `<div class="bg-white p-5 rounded-2xl shadow-sm flex justify-between border-l-8 border-blue-500 font-bold">${c.nombre} <button onclick='abrirModal("cat", ${JSON.stringify(c)})' class="text-blue-500 text-xs">EDITAR</button></div>`).join('')}</div>`;
    }
}

// --- RESTO DE FUNCIONES ---
window.abrirMiPerfil = () => { abrirModalUsuario(window.userPerfil, true); };

window.abrirModalUsuario = async function(u = null, esMiPerfil = false) {
    const body = document.getElementById('modal-body');
    const btn = document.getElementById('btn-save');
    const p = u?.permisos || { categorias: false, sabores: false, sucursales: true, pantallas: false, precios: false };
    const emailActual = u?.email_acceso || "";

    document.getElementById('modal-tabs').classList.add('hidden');
    document.getElementById('modal-form').classList.add('active');
    document.getElementById('modal-title').innerText = esMiPerfil ? "MI PERFIL" : (u ? "EDITAR USUARIO" : "NUEVO USUARIO");
    btn.innerText = u ? "GUARDAR CAMBIOS" : "CREAR USUARIO";

    body.innerHTML = `
        <div class="space-y-4">
            <div><label class="text-[10px] font-bold text-slate-400 uppercase">Nombre de Usuario</label><input id="u-name" value="${u?.username || ''}" class="w-full border-2 p-4 rounded-2xl bg-slate-50 outline-none"></div>
            <div><label class="text-[10px] font-bold text-slate-400 uppercase">Correo Electrónico</label><input id="u-email" type="email" value="${emailActual}" placeholder="correo@ejemplo.com" class="w-full border-2 p-4 rounded-2xl bg-slate-50 outline-none ${u ? 'opacity-50' : ''}" ${u ? 'readonly' : ''}></div>
            <div><label class="text-[10px] font-bold text-slate-400 uppercase">${u ? 'Cambiar Contraseña' : 'Contraseña'}</label><input id="u-pass" type="password" placeholder="${u ? 'Dejar en blanco para no cambiar' : 'Contraseña'}" class="w-full border-2 p-4 rounded-2xl bg-slate-50 outline-none"></div>
            <div id="permisos-section" class="${esMiPerfil ? 'opacity-50 pointer-events-none' : ''} ${window.userPerfil.rol !== 'admin' ? 'hidden' : ''}">
                <div class="p-4 bg-blue-50 rounded-3xl mt-4">
                    <p class="text-[10px] font-black uppercase mb-3 text-blue-600">Permisos de Acceso</p>
                    <div class="grid grid-cols-2 gap-2">
                        <label class="flex items-center gap-2 text-xs font-bold"><input type="checkbox" id="p-cat" ${p.categorias ? 'checked' : ''}> CATEGORÍAS</label>
                        <label class="flex items-center gap-2 text-xs font-bold"><input type="checkbox" id="p-sab" ${p.sabores ? 'checked' : ''}> SABORES</label>
                        <label class="flex items-center gap-2 text-xs font-bold"><input type="checkbox" id="p-suc" ${p.sucursales ? 'checked' : ''}> SUCURSALES</label>
                        <label class="flex items-center gap-2 text-xs font-bold"><input type="checkbox" id="p-pan" ${p.pantallas ? 'checked' : ''}> PANTALLAS</label>
                        <label class="flex items-center gap-2 text-xs font-bold"><input type="checkbox" id="p-pre" ${p.precios ? 'checked' : ''}> PRECIOS</label>
                    </div>
                </div>
            </div>
        </div>`;

    btn.onclick = async () => {
        const nuevoNombre = document.getElementById('u-name').value.trim();
        const password = document.getElementById('u-pass').value;
        const permisos = esMiPerfil ? p : { categorias: document.getElementById('p-cat').checked, sabores: document.getElementById('p-sab').checked, sucursales: document.getElementById('p-suc').checked, pantallas: document.getElementById('p-pan').checked, precios: document.getElementById('p-pre').checked };

        try {
            if (u) {
                const { error: errUpd } = await _supabase.from('perfiles').update({ username: nuevoNombre, permisos: permisos }).eq('id', u.id);
                if (errUpd) throw errUpd;
                if (password.length > 0) {
                    const { error: errPass } = await _supabase.auth.updateUser({ password: password });
                    if (errPass) throw errPass;
                    alert("Contraseña actualizada correctamente");
                }
                alert("Datos actualizados");
            } else {
                const email = document.getElementById('u-email').value;
                const { error: errRpc } = await _supabase.rpc('admin_create_user', { p_email: email, p_password: password, p_username: nuevoNombre, p_rol: 'empleado', p_permisos: permisos });
                if (errRpc) throw errRpc;
            }
            closeModal();
            if (esMiPerfil) window.location.reload(); else showPage('usuarios');
        } catch (err) { alert("Error: " + err.message); }
    };
}

window.abrirModalAccesos = async function(userId, name) {
    const body = document.getElementById('modal-body');
    const btn = document.getElementById('btn-save');
    document.getElementById('modal-title').innerText = "ACCESOS: " + name;
    btn.innerText = "GUARDAR PERMISOS";
    
    const { data: sucs } = await _supabase.from('sucursales').select('*').order('nombre');
    const { data: actuales } = await _supabase.from('usuario_sucursales').select('sucursal_id').eq('usuario_id', userId);
    const idsActuales = actuales ? actuales.map(a => a.sucursal_id) : [];

    body.innerHTML = `<div class="grid gap-2">${sucs.map(s => `
        <label class="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl cursor-pointer hover:bg-slate-100">
            <input type="checkbox" class="suc-check w-6 h-6" value="${s.id}" ${idsActuales.includes(s.id) ? 'checked' : ''}>
            <span class="font-black uppercase italic text-slate-700">${s.nombre}</span>
        </label>`).join('')}</div>`;

    document.getElementById('modal-form').classList.add('active');
    
    btn.onclick = async () => {
        await _supabase.from('usuario_sucursales').delete().eq('usuario_id', userId);
        const checks = Array.from(document.querySelectorAll('.suc-check:checked')).map(c => ({ usuario_id: userId, sucursal_id: c.value }));
        if(checks.length > 0) await _supabase.from('usuario_sucursales').insert(checks);
        closeModal(); alert("Accesos actualizados");
    };
}

window.abrirModalSaborDirecto = function(catId, catNombre) {
    const body = document.getElementById('modal-body');
    const btn = document.getElementById('btn-save');
    document.getElementById('modal-form').classList.add('active');
    document.getElementById('modal-title').innerText = `NUEVO EN: ${catNombre}`;
    body.innerHTML = `<input type="hidden" id="f-cat-id" value="${catId}">
        <input id="f-nombre" placeholder="Nombre del Sabor" class="w-full border-2 p-4 rounded-2xl bg-slate-50 outline-none">
        <div class="flex gap-4 p-2 font-bold text-xs"><label><input type="checkbox" id="f-vegano"> VEGANO</label><label><input type="checkbox" id="f-sintacc"> SIN TACC</label></div>`;
    btn.onclick = async () => {
        const nombre = document.getElementById('f-nombre').value.trim();
        if (!nombre) return alert("El nombre es obligatorio");
        const { data: existe } = await _supabase.from('sabores').select('id').eq('categoria_id', catId).ilike('nombre', nombre).maybeSingle();
        if (existe) return alert("Ya existe este sabor en esta categoría");
        await _supabase.from('sabores').insert([{ nombre, categoria_id: catId, es_vegano: document.getElementById('f-vegano').checked, es_sintacc: document.getElementById('f-sintacc').checked }]);
        closeModal(); showPage('sabores');
    };
}

window.abrirModalSaborExistente = function(sabor) {
    const body = document.getElementById('modal-body');
    const btn = document.getElementById('btn-save');
    document.getElementById('modal-form').classList.add('active');
    document.getElementById('modal-title').innerText = "EDITAR SABOR";
    body.innerHTML = `<div class="space-y-4"><div><label class="text-[10px] font-bold text-slate-400 uppercase">Nombre del Sabor</label><input id="f-nombre" value="${sabor.nombre}" class="w-full border-2 p-4 rounded-2xl bg-slate-50 outline-none focus:border-blue-500"></div><div class="flex gap-4 p-2 font-bold text-xs"><label class="flex items-center gap-2 cursor-pointer"><input type="checkbox" id="f-vegano" ${sabor.es_vegano ? 'checked' : ''}> VEGANO</label><label class="flex items-center gap-2 cursor-pointer"><input type="checkbox" id="f-sintacc" ${sabor.es_sintacc ? 'checked' : ''}> SIN TACC</label></div></div>`;
    btn.onclick = async () => {
        const nombreInput = document.getElementById('f-nombre').value.trim();
        if (!nombreInput) return alert("¡Error! El nombre del sabor no puede estar vacío.");
        const { error } = await _supabase.from('sabores').update({ nombre: nombreInput, es_vegano: document.getElementById('f-vegano').checked, es_sintacc: document.getElementById('f-sintacc').checked }).eq('id', sabor.id);
        if (error) alert("Error al actualizar: " + error.message); else { closeModal(); showPage('sabores'); }
    };
};

window.masterStock = async function(sucId, ids, status) {
    const batch = ids.map(id => ({ sucursal_id: sucId, sabor_id: id, disponible: status }));
    const { error } = await _supabase.from('visibilidad_sabores').upsert(batch, { onConflict: 'sucursal_id,sabor_id' });
    if (error) alert("Error: " + error.message); else showPage('admin_stock', sucId);
};

window.toggleStock = async function(sucId, saborId, current) {
    await _supabase.from('visibilidad_sabores').upsert({ sucursal_id: sucId, sabor_id: saborId, disponible: !current }, { onConflict: 'sucursal_id,sabor_id' });
    showPage('admin_stock', sucId);
};

function closeModal() { document.getElementById('modal-form').classList.remove('active'); document.getElementById('modal-tabs').classList.add('hidden'); }
async function eliminar(t, id) { if(confirm('¿BORRAR REGISTRO?')) { await _supabase.from(t).delete().eq('id', id); showPage(currentPage); } }

async function abrirModal(type, data = null) {
    const body = document.getElementById('modal-body');
    const btn = document.getElementById('btn-save');
    document.getElementById('modal-form').classList.add('active');
    document.getElementById('modal-title').innerText = (data ? "EDITAR " : "NUEVA ") + type.toUpperCase();

    if (type === 'cat' || type === 'sucursal' || type === 'cat_precio') {
        body.innerHTML = `<input id="f-nom" value="${data?.nombre || ''}" placeholder="Nombre" class="w-full border-2 p-4 rounded-2xl bg-slate-50 outline-none">`;
        btn.onclick = async () => {
            const nom = document.getElementById('f-nom').value.trim();
            if (!nom) return alert("El nombre es obligatorio"); 
            const table = type === 'cat' ? 'categorias' : (type === 'sucursal' ? 'sucursales' : 'categorias_precios');
            await _supabase.from(table).upsert({ id: data?.id, nombre: nom });
            closeModal(); showPage(currentPage === 'admin_stock' ? 'sucursales' : currentPage);
        };
    }

    if (type === 'precio') {
        const { data: cp } = await _supabase.from('categorias_precios').select('*');
        
        body.innerHTML = `
            <select id="f-cp" class="w-full border-2 p-4 rounded-2xl bg-slate-50 outline-none mb-3">
                ${cp.map(c => `<option value="${c.id}" ${data?.categoria_precio_id === c.id ? 'selected':''}>${c.nombre}</option>`)}
            </select>
            <input id="f-lab" value="${data?.label || ''}" placeholder="Etiqueta" class="w-full border-2 p-4 rounded-2xl bg-slate-50 outline-none mb-3">
            <input id="f-val" type="number" value="${data?.valor || ''}" placeholder="Precio" class="w-full border-2 p-4 rounded-2xl bg-slate-50 outline-none mb-3">
            
            <div class="border-2 p-4 rounded-2xl bg-slate-50">
                <label class="text-[10px] font-bold uppercase text-slate-500 block mb-2">Imagen del producto (Opcional)</label>
                <input type="file" id="f-img-file" accept=".jpg,.jpeg,.png" class="w-full text-xs">
                <input type="hidden" id="f-img-b64" value="${data?.imagen_url || ''}">
                <p id="f-img-status" class="text-[10px] mt-1 font-bold ${data?.imagen_url ? 'text-emerald-500' : 'text-slate-400'}">${data?.imagen_url ? 'Ya tiene una imagen guardada.' : 'Sin imagen'}</p>
            </div>
        `;

        document.getElementById('f-img-file').addEventListener('change', function(e) {
            const file = e.target.files[0];
            if(file) {
                if(file.size > 1000000) { alert("La imagen debe pesar menos de 1MB."); this.value = ''; return; }
                const status = document.getElementById('f-img-status');
                status.innerText = '⏳ PROCESANDO IMAGEN...';
                status.className = 'text-[10px] mt-1 font-bold text-red-500';
                
                setTimeout(() => {
                    const reader = new FileReader();
                    reader.onload = function(ev) { 
                        document.getElementById('f-img-b64').value = ev.target.result; 
                        status.innerText = '✅ IMAGEN CARGADA';
                        status.className = 'text-[10px] mt-1 font-bold text-emerald-500';
                    };
                    reader.readAsDataURL(file);
                }, 50);
            }
        });

        btn.onclick = async () => {
            const lab = document.getElementById('f-lab').value.trim();
            const val = document.getElementById('f-val').value;
            const imgUrl = document.getElementById('f-img-b64').value; 
            if (!lab || !val) return alert("Etiqueta y Precio son obligatorios"); 
            await _supabase.from('precios_globales').upsert({ id: data?.id, categoria_precio_id: document.getElementById('f-cp').value, label: lab, valor: val, imagen_url: imgUrl });
            closeModal(); showPage('precios');
        };
    }
}

// --- MODAL DE TV Y DISEÑO ---
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

    const colsPorCat = currentTvData?.estilo?.columnasPorCategoria || {};

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
            <div id="list-cont" class="grid gap-2 max-h-48 overflow-y-auto p-2 bg-slate-50 rounded-2xl border mt-4">
                ${(currentTvData?.tipo === 'precios' ? prices : cats).map(i => {
                    const isChecked = configActiva.includes(i.id);
                    const catCols = colsPorCat[i.id] || 2;
                    return `
                    <div class="flex items-center justify-between p-2 bg-white rounded-xl border border-slate-100">
                        <label class="flex items-center gap-2 cursor-pointer flex-1">
                            <input type="checkbox" class="tv-check" value="${i.id}" ${isChecked ? 'checked' : ''}>
                            <span class="text-[10px] font-bold uppercase">${i.nombre}</span>
                        </label>
                        <select class="tv-cat-cols border rounded text-[9px] p-1 bg-slate-50" data-id="${i.id}">
                            <option value="2" ${catCols == 2 ? 'selected' : ''}>2 Columnas</option>
                            <option value="1" ${catCols == 1 ? 'selected' : ''}>1 Columna</option>
                        </select>
                    </div>`;
                }).join('')}
            </div>`;
    } else {
        const est = currentTvData?.estilo || { font: 'Inter', bg: '#fdfbf7', catColor: '#64748b', saborColor: '#1e293b', catSize: 24, saborSize: 18, columnas: 2, animacionTipo: 'fadeUp', animacionDuracion: 0.5, animacionCiclo: 0, marquesinaActiva: false, marquesinaBg: '#1e293b', marquesinaColor: '#ffffff', marquesinaVelocidad: 20, marquesinaAlto: 80, marquesinaSize: 30, marquesinaTexto: 'BIENVENIDOS', bgData: null };
        const espCat = est.espacioCategorias !== undefined ? est.espacioCategorias : 20;
        const espSab = est.espacioSabores !== undefined ? est.espacioSabores : 8;

        // --- SUBIDA DE IMAGEN DE FONDO (SOLO IMAGEN, ASINCRONO) ---
        body.innerHTML = `
            <div class="grid grid-cols-2 gap-4">
                <div><label class="text-[10px] font-bold uppercase">Tipografía</label><select id="s-font" class="w-full border p-2 rounded-xl"><option value="Inter" ${est.font==='Inter'?'selected':''}>Inter</option><option value="Oswald" ${est.font==='Oswald'?'selected':''}>Oswald</option><option value="Montserrat" ${est.font==='Montserrat'?'selected':''}>Montserrat</option></select></div>
                <div><label class="text-[10px] font-bold uppercase">Columnas Principales</label><select id="s-col" class="w-full border p-2 rounded-xl"><option value="2" ${est.columnas==2?'selected':''}>2 Columnas</option><option value="1" ${est.columnas==1?'selected':''}>1 Columna</option></select></div>
                
                <div class="col-span-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div class="grid grid-cols-2 gap-4 items-end">
                        <div>
                            <label class="text-[10px] font-bold uppercase text-slate-500 block mb-1">Fondo Base (Color)</label>
                            <input type="color" id="s-bg" value="${est.bg}" class="w-full h-10 cursor-pointer rounded border-none">
                        </div>
                        <div>
                            <label class="text-[10px] font-bold uppercase text-blue-600 block mb-1">Subir Imagen Local (Fondo)</label>
                            <input type="file" id="s-bg-file" accept=".jpg,.jpeg,.png" class="w-full text-xs">
                            <input type="hidden" id="s-bg-data" value="${est.bgData || ''}">
                            <p id="s-bg-status" class="text-[10px] mt-1 font-bold text-slate-400"></p>
                        </div>
                    </div>
                    ${est.bgData ? `<div class="mt-2 flex justify-between items-center"><p class="text-[10px] text-emerald-500 font-bold">Ya hay una imagen subida.</p><button type="button" onclick="document.getElementById('s-bg-data').value=''; alert('Fondo borrado. Dale a Confirmar para guardar.');" class="text-[10px] text-red-500 font-bold uppercase">X Borrar Fondo</button></div>` : ''}
                </div>

                <div><label class="text-[10px] font-bold uppercase">Color Categorías</label><input type="color" id="s-catC" value="${est.catColor}" class="w-full h-10 cursor-pointer"></div>
                <div><label class="text-[10px] font-bold uppercase">Color Sabores</label><input type="color" id="s-sabC" value="${est.saborColor}" class="w-full h-10 cursor-pointer"></div>
                <div><label class="text-[10px] font-bold uppercase">Tipo Animación</label><select id="s-anim-T" class="w-full border p-2 rounded-xl"><option value="fadeUp" ${est.animacionTipo==='fadeUp'?'selected':''}>Deslizar Arriba</option><option value="fadeIn" ${est.animacionTipo==='fadeIn'?'selected':''}>Solo Aparecer</option><option value="slideInLeft" ${est.animacionTipo==='slideInLeft'?'selected':''}>Deslizar Lado</option></select></div>
                
                <div class="col-span-2 bg-blue-50 p-3 rounded-xl border border-blue-100 flex gap-4">
                    <div class="w-1/2"><label class="text-[10px] font-bold uppercase text-blue-700">Velocidad Efecto (seg)</label><input type="number" step="0.1" id="s-anim-D" value="${est.animacionDuracion}" class="w-full border p-2 rounded-xl mt-1"></div>
                    <div class="w-1/2"><label class="text-[10px] font-bold uppercase text-blue-700">Repetir Ciclo (seg)</label><input type="number" id="s-anim-C" value="${est.animacionCiclo || 0}" placeholder="0 = No repetir" class="w-full border p-2 rounded-xl mt-1"></div>
                </div>

                <div class="col-span-2 flex gap-4">
                    <div class="w-1/2"><label class="text-[10px] font-bold uppercase">Sep. Categorías (px)</label><input type="number" id="s-espC" value="${espCat}" class="w-full border p-2 rounded-xl"></div>
                    <div class="w-1/2"><label class="text-[10px] font-bold uppercase">Sep. Sabores (px)</label><input type="number" id="s-espS" value="${espSab}" class="w-full border p-2 rounded-xl"></div>
                </div>

                <div><label class="text-[10px] font-bold uppercase">Tamaño Categoría (px)</label><input type="number" id="s-catS" value="${est.catSize}" class="w-full border p-2 rounded-xl"></div>
                <div><label class="text-[10px] font-bold uppercase">Tamaño Sabor (px)</label><input type="number" id="s-sabS" value="${est.saborSize}" class="w-full border p-2 rounded-xl"></div>
                
                <div class="col-span-2 border-t border-slate-200 pt-4 mt-2">
                    <label class="flex items-center gap-2 font-black text-sm mb-3 text-blue-700 uppercase"><input type="checkbox" id="s-mqA" class="w-5 h-5 cursor-pointer" ${est.marquesinaActiva?'checked':''}> HABILITAR MARQUESINA</label>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <div class="col-span-2 md:col-span-4"><label class="text-[10px] font-bold uppercase text-slate-500">Texto a mostrar</label><input id="s-mqT" value="${est.marquesinaTexto || 'BIENVENIDOS'}" class="w-full border p-2 rounded-xl text-xs font-bold"></div>
                        <div><label class="text-[9px] font-bold uppercase text-slate-500">Fondo Barra</label><input type="color" id="s-mqB" value="${est.marquesinaBg}" class="w-full h-8 cursor-pointer border-none rounded"></div>
                        <div><label class="text-[9px] font-bold uppercase text-slate-500">Color Letra</label><input type="color" id="s-mqC" value="${est.marquesinaColor}" class="w-full h-8 cursor-pointer border-none rounded"></div>
                        <div><label class="text-[9px] font-bold uppercase text-slate-500">Velocidad</label><input type="number" id="s-mqV" value="${est.marquesinaVelocidad}" class="w-full border p-2 text-xs rounded-xl"></div>
                        <div><label class="text-[9px] font-bold uppercase text-slate-500">Alto Barra (px)</label><input type="number" id="s-mqH" value="${est.marquesinaAlto}" class="w-full border p-2 text-xs rounded-xl"></div>
                        <div class="col-span-2"><label class="text-[9px] font-bold uppercase text-slate-500">Tamaño Letra (px)</label><input type="number" id="s-mqS" value="${est.marquesinaSize}" class="w-full border p-2 text-xs rounded-xl"></div>
                    </div>
                </div>
            </div>`;

        const bgInput = document.getElementById('s-bg-file');
        if (bgInput) {
            bgInput.addEventListener('change', function(e) {
                const file = e.target.files[0];
                if(file) {
                    if(file.size > 2500000) { 
                        alert("La imagen pesa más de 2.5MB. Prueba con una más liviana."); 
                        this.value = ''; 
                        return; 
                    }
                    const status = document.getElementById('s-bg-status');
                    status.innerText = '⏳ PROCESANDO IMAGEN...';
                    status.className = 'text-[10px] mt-1 font-bold text-red-500';
                    
                    setTimeout(() => {
                        const reader = new FileReader();
                        reader.onload = function(ev) { 
                            document.getElementById('s-bg-data').value = ev.target.result;
                            status.innerText = '✅ IMAGEN LISTA';
                            status.className = 'text-[10px] mt-1 font-bold text-emerald-500';
                        };
                        reader.readAsDataURL(file);
                    }, 100);
                }
            });
        }
    }

    btn.onclick = async () => {
        let estOriginal = currentTvData?.estilo || {};
        
        let colsConfig = {};
        if (activeTab === 'config') {
            document.querySelectorAll('.tv-cat-cols').forEach(sel => {
                colsConfig[sel.getAttribute('data-id')] = parseInt(sel.value);
            });
        } else {
            colsConfig = estOriginal.columnasPorCategoria || {};
        }

        let upd = (activeTab === 'config') 
            ? { 
                nombre: document.getElementById('p-nom').value, 
                tipo: document.getElementById('p-tipo').value, 
                orientacion: document.getElementById('p-ori').value, 
                config_categorias: Array.from(document.querySelectorAll('.tv-check:checked')).map(c => c.value),
                estilo: Object.assign({}, estOriginal, { columnasPorCategoria: colsConfig })
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
                    marquesinaSize: parseInt(document.getElementById('s-mqS').value) || 30,
                    espacioCategorias: parseInt(document.getElementById('s-espC').value) || 20,
                    espacioSabores: parseInt(document.getElementById('s-espS').value) || 8,
                    columnasPorCategoria: colsConfig,
                    bgData: document.getElementById('s-bg-data') ? document.getElementById('s-bg-data').value : estOriginal.bgData
                } 
              };
        
        if (currentTvData) await _supabase.from('pantallas').update(upd).eq('id', currentTvData.id);
        else await _supabase.from('pantallas').insert([{ ...upd, sucursal_id: window.currentSucId }]);
        closeModal(); verPantallasSucursal(window.currentSucId, window.currentSucName);
    };
}

window.eliminarTV = async function(id) { if(confirm('¿BORRAR TV?')) { await _supabase.from('pantallas').delete().eq('id', id); verPantallasSucursal(window.currentSucId, window.currentSucName); } };
function switchTab(tab) { activeTab = tab; renderModalContent(); }
