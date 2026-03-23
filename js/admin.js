function renderMenu() {
    const nav = document.getElementById('menu-nav');
    const p = userPerfil.permisos || {}; // Cargamos los permisos granulares
    let html = '';

    if (userPerfil.rol === 'admin') {
        html = `
            <div onclick="showPage('categorias')" id="m-categorias" class="menu-item">📁 Categorías</div>
            <div onclick="showPage('sabores')" id="m-sabores" class="menu-item">🍨 Sabores</div>
            <div onclick="showPage('sucursales')" id="m-sucursales" class="menu-item">🏪 Sucursales</div>
            <div onclick="showPage('pantallas')" id="m-pantallas" class="menu-item">📺 Pantallas</div>
            <div onclick="showPage('usuarios')" id="m-usuarios" class="menu-item">👥 Usuarios</div>
            <div onclick="showPage('precios')" id="m-precios" class="menu-item">💰 Precios</div>
        `;
    } else {
        // Menú dinámico basado en los permisos tildados por el admin
        if (p.categorias) html += `<div onclick="showPage('categorias')" id="m-categorias" class="menu-item">📁 Categorías</div>`;
        if (p.sabores) html += `<div onclick="showPage('sabores')" id="m-sabores" class="menu-item">🍨 Sabores</div>`;
        if (p.sucursales) html += `<div onclick="showPage('sucursales')" id="m-sucursales" class="menu-item">🏪 Sucursales</div>`;
        if (p.pantallas) html += `<div onclick="showPage('pantallas')" id="m-pantallas" class="menu-item">📺 Pantallas</div>`;
        if (p.precios) html += `<div onclick="showPage('precios')" id="m-precios" class="menu-item">💰 Precios</div>`;
    }
    
    // Botón Mi Perfil para todos
    html += `
        <div class="mt-10 pt-4 border-t border-slate-700/50">
            <div onclick="abrirMiPerfil()" class="menu-item text-blue-400">👤 Mi Perfil</div>
        </div>
    `;
    
    nav.innerHTML = html;
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

// js/admin.js

// Función para que cualquier usuario abra su propio perfil
window.abrirMiPerfil = () => {
    abrirModalUsuario(userPerfil, true); // true indica que es "auto-edición"
};

window.abrirModalUsuario = async function(u = null, esMiPerfil = false) {
    const body = document.getElementById('modal-body');
    const btn = document.getElementById('btn-save');
    
    // Si estamos editando un usuario existente, traemos sus datos actuales
    const p = u?.permisos || { categorias: false, sabores: false, sucursales: true, pantallas: false, precios: false };
    const emailActual = u?.email_acceso || "";

    document.getElementById('modal-tabs').classList.add('hidden');
    document.getElementById('modal-form').classList.add('active');
    
    document.getElementById('modal-title').innerText = esMiPerfil ? "MI PERFIL" : (u ? "EDITAR USUARIO" : "NUEVO USUARIO");
    btn.innerText = u ? "GUARDAR CAMBIOS" : "CREAR USUARIO";

    body.innerHTML = `
        <div class="space-y-4">
            <div>
                <label class="text-[10px] font-bold text-slate-400 uppercase">Nombre de Usuario</label>
                <input id="u-name" value="${u?.username || ''}" class="w-full border-2 p-4 rounded-2xl bg-slate-50 outline-none">
            </div>
            
            <div>
                <label class="text-[10px] font-bold text-slate-400 uppercase">Correo Electrónico</label>
                <input id="u-email" type="email" value="${emailActual}" placeholder="correo@ejemplo.com" 
                       class="w-full border-2 p-4 rounded-2xl bg-slate-50 outline-none ${u ? 'opacity-50' : ''}" 
                       ${u ? 'readonly' : ''}>
                ${u ? '<p class="text-[9px] text-slate-400 mt-1 italic">* El correo no se puede cambiar por seguridad</p>' : ''}
            </div>

            <div>
                <label class="text-[10px] font-bold text-slate-400 uppercase">${u ? 'Cambiar Contraseña' : 'Contraseña'}</label>
                <input id="u-pass" type="password" placeholder="${u ? 'Dejar en blanco para no cambiar' : 'Contraseña'}" 
                       class="w-full border-2 p-4 rounded-2xl bg-slate-50 outline-none">
            </div>

            <!-- SECCIÓN DE PERMISOS: Solo visible/editable por Admin y si NO es su propio perfil -->
            <div id="permisos-section" class="${esMiPerfil ? 'opacity-50 pointer-events-none' : ''} ${userPerfil.rol !== 'admin' ? 'hidden' : ''}">
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
        
        // Capturar permisos solo si es el admin editando a otro
        const permisos = esMiPerfil ? p : {
            categorias: document.getElementById('p-cat').checked,
            sabores: document.getElementById('p-sab').checked,
            sucursales: document.getElementById('p-suc').checked,
            pantallas: document.getElementById('p-pan').checked,
            precios: document.getElementById('p-pre').checked
        };

        try {
            if (u) {
                // 1. Actualizar datos en tabla Perfiles
                const { error: errUpd } = await _supabase.from('perfiles').update({ 
                    username: nuevoNombre,
                    permisos: permisos 
                }).eq('id', u.id);
                
                if (errUpd) throw errUpd;

                // 2. Si hay nueva contraseña, actualizarla en Auth
                if (password.length > 0) {
                    const { error: errPass } = await _supabase.auth.updateUser({ password: password });
                    if (errPass) throw errPass;
                    alert("Contraseña actualizada correctamente");
                }

                alert("Datos actualizados");
            } else {
                // Lógica de creación (RPC)
                const email = document.getElementById('u-email').value;
                const { error: errRpc } = await _supabase.rpc('admin_create_user', { 
                    p_email: email, 
                    p_password: password, 
                    p_username: nuevoNombre, 
                    p_rol: 'empleado',
                    p_permisos: permisos
                });
                if (errRpc) throw errRpc;
            }
            
            closeModal();
            // Si el usuario se editó a sí mismo, recargar para aplicar cambios de nombre
            if (esMiPerfil) window.location.reload();
            else showPage('usuarios');
            
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
