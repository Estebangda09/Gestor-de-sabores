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

    const paginasProhibidas = ['categorias', 'sabores', 'usuarios', 'precios', 'pantallas'];
    if (userPerfil.rol !== 'admin' && paginasProhibidas.includes(page)) {
        page = 'sucursales'; 
    }
  
    currentPage = page;
    const container = document.getElementById('view-content');
    const header = document.getElementById('view-header');
    
    document.getElementById('modal-tabs').classList.add('hidden');
    document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));
    if(document.getElementById('m-'+page)) document.getElementById('m-'+page).classList.add('active');

    // --- MÓDULO USUARIOS ---
    if (page === 'usuarios') {
        header.innerHTML = `<h1 class="text-3xl font-black text-slate-800 uppercase italic">Usuarios</h1>
                            <button onclick="abrirModalUsuario()" class="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold shadow-lg">+ NUEVO USUARIO</button>`;
        
        const { data: users } = await _supabase.from('perfiles').select('*').order('username');
        
        container.innerHTML = `<div class="grid gap-4">
            ${users.map(u => `
                <div class="bg-white p-6 rounded-3xl shadow-sm flex justify-between items-center border-l-8 ${u.rol === 'admin' ? 'border-amber-400' : 'border-emerald-400'}">
                    <div>
                        <p class="font-black text-slate-700 text-xl uppercase italic">${u.username}</p>
                        <p class="text-xs text-slate-400 font-bold uppercase tracking-widest">${u.rol}</p>
                    </div>
                    <div class="flex gap-3">
                        ${u.rol !== 'admin' ? `<button onclick='abrirModalAccesos("${u.id}", "${u.username}")' class="bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-bold uppercase">PERMISOS SUCURSAL</button>` : ''}
                        <button onclick='abrirModalUsuario(${JSON.stringify(u)})' class="text-blue-500 font-bold text-xs p-2">EDITAR</button>
                        <button onclick="eliminar('perfiles','${u.id}')" class="text-red-300 font-bold text-xs p-2">✕</button>
                    </div>
                </div>`).join('')}
        </div>`;
    }

    // --- MÓDULO SUCURSALES (CON FILTRO DE PERMISOS) ---
    if (page === 'sucursales') {
        header.innerHTML = `<h1 class="text-3xl font-black text-slate-800 uppercase italic">Mis Sucursales</h1>
                            ${userPerfil.rol === 'admin' ? `<button onclick="abrirModal('sucursal')" class="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold">+ NUEVA</button>` : ''}`;
        
        const { data: sucs } = await _supabase.rpc('obtener_sucursales_por_permiso', { 
            p_usuario_id: userPerfil.id, 
            p_rol: userPerfil.rol 
        });

        if (!sucs || sucs.length === 0) {
            container.innerHTML = `<div class="text-center p-20 bg-white rounded-3xl text-slate-400 font-bold">No tienes sucursales asignadas.</div>`;
            return;
        }

        container.innerHTML = `<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            ${sucs.map(s => `
                <div class="bg-white p-6 rounded-3xl shadow-lg border-t-8 border-blue-500 text-center">
                    <h3 class="text-xl font-black mb-4 uppercase italic text-slate-800">${s.nombre}</h3>
                    <button onclick="showPage('admin_stock', '${s.id}')" class="w-full bg-slate-900 text-white py-3 rounded-xl font-black text-xs hover:bg-blue-600 transition uppercase">Gestionar Stock</button>
                    ${userPerfil.rol === 'admin' ? `<div class="mt-4 flex justify-center gap-4"><button onclick='abrirModal("sucursal", ${JSON.stringify(s)})' class="text-[10px] text-blue-400 font-bold">EDITAR</button></div>` : ''}
                </div>`).join('')}
        </div>`;
    }

    // --- MÓDULO SABORES (Mejorado) ---
    if (page === 'sabores') {
        header.innerHTML = `<h1 class="text-3xl font-black text-slate-800 uppercase italic">Sabores</h1>`;
        const { data: cats } = await _supabase.from('categorias').select('*').order('orden');
        const { data: sabs } = await _supabase.from('sabores').select('*').order('nombre');

        container.innerHTML = cats.map(c => {
            const ms = sabs.filter(s => s.categoria_id === c.id);
            return `
                <div class="mb-10 bg-white p-6 rounded-[32px] shadow-sm border border-slate-100">
                    <div class="flex justify-between items-center mb-6 border-b pb-4">
                        <h3 class="text-xl font-black text-indigo-600 uppercase italic">${c.nombre}</h3>
                        <button onclick="abrirModalSaborDirecto('${c.id}', '${c.nombre}')" class="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold text-xs shadow-lg">+ AGREGAR A ${c.nombre}</button>
                    </div>
                    <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                        ${ms.map(s => `
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
                            </div>`).join('')}
                    </div>
                </div>`;
        }).join('');
    }

    // --- MÓDULO PRECIOS ---
    if (page === 'precios') {
        header.innerHTML = `<h1 class="text-3xl font-black text-slate-800 uppercase italic">Precios</h1>
            <div class="flex gap-2"><button onclick="abrirModal('cat_precio')" class="bg-slate-800 text-white px-4 py-2 rounded-xl font-bold text-xs">+ CAT</button>
            <button onclick="abrirModal('precio')" class="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold text-xs">+ PRECIO</button></div>`;
        const { data: cats } = await _supabase.from('categorias_precios').select('*').order('orden');
        const { data: prices } = await _supabase.from('precios_globales').select('*').order('orden');
        container.innerHTML = cats.map(c => {
            const ms = prices.filter(p => p.categoria_precio_id === c.id);
            return `<div class="mb-10"><h3 class="text-xl font-black border-b-2 mb-4 uppercase italic text-slate-800">${c.nombre}</h3>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">${ms.map(p => `
                    <div class="price-card-admin flex justify-between items-center">
                        <div><p class="text-[10px] font-bold text-slate-400 uppercase">${p.label}</p><p class="text-lg font-black text-slate-800">$${p.valor}</p></div>
                        <button onclick='abrirModal("precio", ${JSON.stringify(p)})' class="text-blue-500 font-bold text-xs p-2">EDITAR</button>
                    </div>`).join('')}</div></div>`;
        }).join('');
    }

    // --- GESTIÓN DE PANTALLAS (LISTADO SUCURSALES) ---
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

    // --- GESTIÓN DE STOCK POR SUCURSAL ---
    if (page === 'admin_stock') {
        const sucId = params;
        const { data: suc } = await _supabase.from('sucursales').select('nombre').eq('id', sucId).single();
        const { data: cats } = await _supabase.from('categorias').select('*').order('orden');
        const { data: sabs } = await _supabase.from('sabores').select('*');
        const { data: vis } = await _supabase.from('visibilidad_sabores').select('*').eq('sucursal_id', sucId);
        header.innerHTML = `<div class="flex items-center gap-4"><button onclick="showPage('sucursales')" class="text-slate-400 text-2xl">←</button><h1 class="text-2xl font-black uppercase italic">${suc.nombre}</h1></div>`;
        container.innerHTML = cats.map(c => {
            const ms = sabs.filter(s => s.categoria_id === c.id);
            if(!ms.length) return '';
            return `<div class="mb-10 bg-white p-8 rounded-[40px] shadow-sm"><div class="flex justify-between items-center mb-6"><h4>${c.nombre}</h4><div class="flex gap-2">
                <button onclick="masterStock('${sucId}', ${JSON.stringify(ms.map(m=>m.id))}, true)" class="bg-emerald-500 text-white px-3 py-1 rounded-full text-[10px] font-bold">HABILITAR TODO</button>
                <button onclick="masterStock('${sucId}', ${JSON.stringify(ms.map(m=>m.id))}, false)" class="bg-red-500 text-white px-3 py-1 rounded-full text-[10px] font-bold">PAUSAR TODO</button>
            </div></div><div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                ${ms.map(s => { const isOk = vis.find(v => v.sabor_id === s.id)?.disponible !== false; return `<button onclick="toggleStock('${sucId}', '${s.id}', ${isOk})" class="p-5 rounded-2xl border-2 font-bold ${isOk ? 'bg-white border-blue-500 text-blue-700 shadow-md':'bg-slate-100 text-slate-400 border-transparent line-through'}">${s.nombre}</button>`; }).join('')}
            </div></div>`;
        }).join('');
    }

    if (page === 'categorias') {
        header.innerHTML = `<h1 class="text-3xl font-black text-slate-800 uppercase italic">Categorías</h1><button onclick="abrirModal('cat')" class="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold">+ Nueva</button>`;
        const { data } = await _supabase.from('categorias').select('*').order('orden');
        container.innerHTML = `<div class="space-y-3">${data.map(c => `<div class="bg-white p-5 rounded-2xl shadow-sm flex justify-between border-l-8 border-blue-500 font-bold">${c.nombre} <button onclick='abrirModal("cat", ${JSON.stringify(c)})' class="text-blue-500 text-xs">EDITAR</button></div>`).join('')}</div>`;
    }
}

// --- LOGICA DE USUARIOS ---

window.abrirModalUsuario = async function(u = null) {
    const body = document.getElementById('modal-body');
    const btn = document.getElementById('btn-save');
    // Cargamos sucursales para el selector
    const { data: sucs } = await _supabase.from('sucursales').select('*').order('nombre');

    document.getElementById('modal-tabs').classList.add('hidden');
    document.getElementById('modal-form').classList.add('active');
    document.getElementById('modal-title').innerText = u ? "EDITAR USUARIO" : "NUEVO USUARIO";
    btn.innerText = u ? "ACTUALIZAR" : "CONFIRMAR";
    
    body.innerHTML = `
        <div class="space-y-4">
            <div>
                <label class="text-[10px] font-bold text-slate-400 uppercase">Nombre para mostrar</label>
                <input id="u-name" value="${u?.username || ''}" placeholder="Ej: Esteban - Sucursal Troncos" class="w-full border-2 p-4 rounded-2xl bg-slate-50 outline-none">
            </div>
            <div>
                <label class="text-[10px] font-bold text-slate-400 uppercase">Email de acceso (ID único)</label>
                <input id="u-email" type="email" value="${u?.username || ''}" placeholder="troncos@gmail.com" class="w-full border-2 p-4 rounded-2xl bg-slate-50 outline-none" ${u ? 'disabled' : ''}>
            </div>
            ${u ? '' : `
            <div>
                <label class="text-[10px] font-bold text-slate-400 uppercase">Contraseña</label>
                <input id="u-pass" type="text" placeholder="123456" class="w-full border-2 p-4 rounded-2xl bg-slate-50 outline-none">
            </div>`}
            <div>
                <label class="text-[10px] font-bold text-slate-400 uppercase">Rol del Sistema</label>
                <select id="u-rol" class="w-full border-2 p-4 rounded-2xl bg-slate-50 outline-none" onchange="document.getElementById('suc-selector-container').classList.toggle('hidden', this.value === 'admin')">
                    <option value="empleado" ${u?.rol === 'empleado' ? 'selected' : ''}>Empleado (Solo ve su sucursal)</option>
                    <option value="admin" ${u?.rol === 'admin' ? 'selected' : ''}>Admin (Ve todo)</option>
                </select>
            </div>
            <div id="suc-selector-container" class="${u?.rol === 'admin' ? 'hidden' : ''}">
                <label class="text-[10px] font-bold text-slate-400 uppercase">Asignar Sucursal Inicial</label>
                <select id="u-suc-inicial" class="w-full border-2 p-4 rounded-2xl bg-slate-50 outline-none">
                    <option value="">Seleccionar sucursal...</option>
                    ${sucs.map(s => `<option value="${s.id}">${s.nombre}</option>`).join('')}
                </select>
            </div>
        </div>`;

    btn.onclick = async () => {
        const username = document.getElementById('u-name').value;
        const email = document.getElementById('u-email').value;
        const rol = document.getElementById('u-rol').value;
        const sucId = document.getElementById('u-suc-inicial').value;

        try {
            if (u) {
                // Actualizar usuario existente
                const { error: errUpd } = await _supabase.from('perfiles').update({ username, rol }).eq('id', u.id);
                if (errUpd) throw errUpd;
            } else {
                // CREAR USUARIO NUEVO
                const password = document.getElementById('u-pass').value;
                if (!password) return alert("Debes ingresar una contraseña");

                // 1. Llamamos al RPC (Asegúrate de haber ejecutado el último SQL que te pasé con encrypted_password)
                const { error: errRpc } = await _supabase.rpc('admin_create_user', { 
                    p_email: email, 
                    p_password: password, 
                    p_username: username, 
                    p_rol: rol 
                });
                
                if (errRpc) throw errRpc;

                // 2. Vinculación de sucursal inmediata si es empleado
                if (rol === 'empleado' && sucId) {
                    // Buscamos el ID recién creado en perfiles
                    const { data: newUser, error: errSearch } = await _supabase
                        .from('perfiles')
                        .select('id')
                        .eq('username', username)
                        .single();

                    if (newUser) {
                        await _supabase.from('usuario_sucursales').insert([{ 
                            usuario_id: newUser.id, 
                            sucursal_id: sucId 
                        }]);
                    }
                }
            }
            closeModal();
            showPage('usuarios');
        } catch (err) {
            alert("Error: " + err.message);
        }
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

// --- LOGICA DE SABORES ---

window.abrirModalSaborDirecto = function(catId, catNombre) {
    const body = document.getElementById('modal-body');
    const btn = document.getElementById('btn-save');
    document.getElementById('modal-form').classList.add('active');
    document.getElementById('modal-title').innerText = `NUEVO EN: ${catNombre}`;
    body.innerHTML = `
        <input type="hidden" id="f-cat-id" value="${catId}">
        <input id="f-nombre" placeholder="Nombre del Sabor" class="w-full border-2 p-4 rounded-2xl bg-slate-50 outline-none">
        <div class="flex gap-4 p-2 font-bold text-xs">
            <label><input type="checkbox" id="f-vegano"> VEGANO</label>
            <label><input type="checkbox" id="f-sintacc"> SIN TACC</label>
        </div>`;
    btn.onclick = async () => {
        const nombre = document.getElementById('f-nombre').value.trim();
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
    body.innerHTML = `
        <input id="f-nombre" value="${sabor.nombre}" class="w-full border-2 p-4 rounded-2xl bg-slate-50 outline-none">
        <div class="flex gap-4 p-2 font-bold text-xs">
            <label><input type="checkbox" id="f-vegano" ${sabor.es_vegano ? 'checked':''}> VEGANO</label>
            <label><input type="checkbox" id="f-sintacc" ${sabor.es_sintacc ? 'checked':''}> SIN TACC</label>
        </div>`;
    btn.onclick = async () => {
        await _supabase.from('sabores').update({ nombre: document.getElementById('f-nombre').value, es_vegano: document.getElementById('f-vegano').checked, es_sintacc: document.getElementById('f-sintacc').checked }).eq('id', sabor.id);
        closeModal(); showPage('sabores');
    };
}

// --- GENERAL ---

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
    if(confirm('¿BORRAR REGISTRO?')) { 
        await _supabase.from(t).delete().eq('id', id); 
        showPage(currentPage); 
    } 
}

async function abrirModal(type, data = null) {
    const body = document.getElementById('modal-body');
    const btn = document.getElementById('btn-save');
    document.getElementById('modal-form').classList.add('active');
    document.getElementById('modal-title').innerText = "EDITAR " + type.toUpperCase();

    if (type === 'cat') {
        body.innerHTML = `<input id="f-nom" value="${data?.nombre || ''}" class="w-full border-2 p-4 rounded-2xl bg-slate-50 outline-none">`;
        btn.onclick = async () => { await _supabase.from('categorias').upsert({ id: data?.id, nombre: document.getElementById('f-nom').value }); closeModal(); showPage('categorias'); };
    }
    if (type === 'cat_precio') {
        body.innerHTML = `<input id="f-nom" value="${data?.nombre || ''}" class="w-full border-2 p-4 rounded-2xl bg-slate-50 outline-none">`;
        btn.onclick = async () => { await _supabase.from('categorias_precios').upsert({ id: data?.id, nombre: document.getElementById('f-nom').value }); closeModal(); showPage('precios'); };
    }
    if (type === 'precio') {
        const { data: cp } = await _supabase.from('categorias_precios').select('*');
        body.innerHTML = `<select id="f-cp" class="w-full border-2 p-4 rounded-2xl bg-slate-50 outline-none">${cp.map(c => `<option value="${c.id}" ${data?.categoria_precio_id === c.id ? 'selected':''}>${c.nombre}</option>`)}</select><input id="f-lab" value="${data?.label || ''}" placeholder="Etiqueta" class="w-full border-2 p-4 rounded-2xl bg-slate-50 outline-none"><input id="f-val" type="number" value="${data?.valor || ''}" placeholder="Precio" class="w-full border-2 p-4 rounded-2xl bg-slate-50 outline-none">`;
        btn.onclick = async () => { await _supabase.from('precios_globales').upsert({ id: data?.id, categoria_precio_id: document.getElementById('f-cp').value, label: document.getElementById('f-lab').value, valor: document.getElementById('f-val').value }); closeModal(); showPage('precios'); };
    }
    if (type === 'sucursal') {
        body.innerHTML = `<input id="f-nom" value="${data?.nombre || ''}" class="w-full border-2 p-4 rounded-2xl bg-slate-50 outline-none">`;
        btn.onclick = async () => { await _supabase.from('sucursales').upsert({ id: data?.id, nombre: document.getElementById('f-nom').value }); closeModal(); showPage('sucursales'); };
    }
}
