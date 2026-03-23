// js/tv.js
let currentTvData = null;
let activeTab = 'config';

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

// --- ACTIVAR ESCUCHA EN TIEMPO REAL (Realtime) ---
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
            renderPantallaTV(tvId);
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
            renderPantallaTV(tvId);
        })
        .subscribe();

    // NUEVO: Canal para escuchar cambios al editar un sabor (nombre, vegano, sintacc)
    _supabase
        .channel('public:sabores')
        .on('postgres_changes', { 
            event: '*', 
            schema: 'public', 
            table: 'sabores' 
        }, () => {
            console.log('Cambio en datos de sabor detectado...');
            renderPantallaTV(tvId);
        })
        .subscribe();
};

// --- RENDERIZADO DE PANTALLA ---
// --- RENDERIZADO DE PANTALLA ---
window.renderPantallaTV = async function(id) {
    const tv = document.getElementById('tv-container');
    
    // 1. Intentar traer datos frescos de Supabase
    const { data: pant, error } = await _supabase.from('pantallas').select('*').eq('id', id).single();
    
    let datos = pant;

    // Manejo de conexión y caché
    if (error || !pant) {
        datos = gestionarCacheTV(id);
        if (!datos) return console.error("Sin conexión y sin datos en caché.");
        console.warn("Usando datos de respaldo (Caché)");
    } else {
        gestionarCacheTV(id, pant); // Guardar copia de seguridad
    }

    const style = datos.estilo || { 
        font: 'Inter', bg: '#fdfbf7', catColor: '#64748b', saborColor: '#1e293b', 
        catSize: '1.2', saborSize: '1.6', columnas: 2, marquesinaActiva: false,
        animacionTipo: 'fadeUp', animacionDuracion: 0.5
    };
    
    tv.classList.remove('hidden');
    tv.style.backgroundColor = style.bg;
    tv.style.fontFamily = style.font;

    // --- INYECCIÓN DE CSS PARA ANIMACIONES ---
    const animDur = style.animacionDuracion || 0.5;
    const animTipo = style.animacionTipo || 'fadeUp';
    const styleTag = document.getElementById('anim-styles') || document.createElement('style');
    styleTag.id = 'anim-styles';
    styleTag.innerHTML = `
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .sabor-anim { animation: ${animTipo} ${animDur}s ease-out forwards; opacity: 0; }
    `;
    if (!document.getElementById('anim-styles')) document.head.appendChild(styleTag);
    // -----------------------------------------

    // Configuración de columnas según orientación y diseño
    const gridCols = datos.orientacion === '9:16' ? '1fr' : (style.columnas == 1 ? '1fr' : '1fr 1fr');
    let delay = 0; // Variable para el efecto cascada

    if (datos.tipo === 'precios') {
        const { data: catPrecios } = await _supabase.from('categorias_precios').select('*').in('id', datos.config_categorias || []).order('orden');
        const { data: prices } = await _supabase.from('precios_globales').select('*').order('orden');
        
        let html = `<div class="tv-layout" style="grid-template-columns: ${gridCols};">`;
        catPrecios?.forEach(c => {
            const items = prices.filter(p => p.categoria_precio_id === c.id);
            html += `<div class="tv-column"><div class="tv-cat-header" style="color:${style.catColor}; font-size:${style.catSize}rem; text-transform: uppercase;">${c.nombre}</div>`;
            items.forEach(p => {
                // Agregamos clase 'sabor-anim' y 'animation-delay'
                html += `
                <div class="price-row sabor-anim" style="border-color:${style.catColor}44; display: flex; justify-content: space-between; align-items: center; padding: 10px 0; animation-delay: ${delay}s;">
                    <div class="flex items-center gap-4">
                        ${p.imagen_url ? `<img src="${p.imagen_url}" class="h-16 w-16 object-contain">` : ''}
                        <span class="price-label" style="color:${style.catColor}; font-size:${style.saborSize}rem; font-weight:700;">${p.label}</span>
                    </div>
                    <span class="price-value" style="color:${style.saborColor}; font-size:${style.saborSize}rem; font-weight:900;">$${p.valor}</span>
                </div>`;
                delay += 0.05; // Incrementamos el retraso
            });
            html += `</div>`;
        });
        tv.innerHTML = html + `</div>`;
        
    } else {
        const { data: cats } = await _supabase.from('categorias').select('*').in('id', datos.config_categorias || []).order('orden');
        const { data: sabs } = await _supabase.from('sabores').select('*').order('nombre');
        const { data: vis } = await _supabase.from('visibilidad_sabores').select('*').eq('sucursal_id', datos.sucursal_id);
        
        let html = `<div class="tv-layout" style="grid-template-columns: ${gridCols};">`;
        cats?.forEach(c => {
            const disponibles = sabs.filter(s => s.categoria_id === c.id).filter(s => {
                const v = vis.find(v => v.sabor_id === s.id);
                return v ? v.disponible !== false : true;
            });
            
            if(disponibles.length) {
                html += `
                <div class="tv-column">
                    <div class="tv-cat-header" style="color:${style.catColor}; font-size:${style.catSize}rem; text-transform: uppercase;">${c.nombre}</div>
                    <div class="tv-flavor-list">
                        ${disponibles.map(s => {
                            const nombreFormateado = s.nombre.charAt(0).toUpperCase() + s.nombre.slice(1).toLowerCase();
                            const currentDelay = delay;
                            delay += 0.05; // Incrementamos el retraso para el siguiente
                            
                            // Agregamos clase 'sabor-anim' y 'animation-delay'
                            return `
                            <div class="tv-flavor-item sabor-anim" style="color:${style.saborColor}; font-size:${style.saborSize}rem; display: flex; align-items: center; gap: 10px; margin-bottom: 5px; animation-delay: ${currentDelay}s;">
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
        tv.innerHTML = html + `</div>`;
    }
    
    // Marquesina RSS Continua
    if (style.marquesinaActiva) {
        const duracion = style.marquesinaVelocidad || 20;
        tv.innerHTML += `
            <div class="tv-ticker" style="background:${style.marquesinaBg}; color:${style.marquesinaColor}">
                <div class="ticker-content" style="animation: ticker ${duracion}s linear infinite;">
                    ${style.marquesinaTexto} &nbsp;&nbsp; • &nbsp;&nbsp; ${style.marquesinaTexto} &nbsp;&nbsp; • &nbsp;&nbsp; ${style.marquesinaTexto}
                </div>
            </div>`;
    }
};
// --- CRUD ADMIN ---
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
        <button onclick="abrirModalPantalla('${sucId}')" class="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase shadow-lg">+ NUEVA TV</button>`;
    
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
};

window.abrirModalPantalla = async function(sucId, data = null) {
    currentTvData = data; 
    activeTab = 'config'; 
    window.currentSucId = sucId;
    document.getElementById('modal-tabs').classList.toggle('hidden', !data);
    document.getElementById('modal-form').classList.add('active');
    renderModalContent();
};

window.eliminarTV = async function(id) { 
    if(confirm('¿BORRAR TV?')) { 
        await _supabase.from('pantallas').delete().eq('id', id); 
        verPantallasSucursal(window.currentSucId, window.currentSucName); 
    } 
};

function switchTab(tab) { activeTab = tab; renderModalContent(); }
