// js/tv.js
let currentTvData = null;
let activeTab = 'config';
window.tvHasRendered = false;
window.animIntervalTV = null; 

function gestionarCacheTV(id, data = null) {
    const key = `tv_cache_${id}`;
    if (data) localStorage.setItem(key, JSON.stringify(data));
    else return JSON.parse(localStorage.getItem(key));
}

window.activarRealtimeTV = function(tvId) {
    if (window.tvChannel) _supabase.removeChannel(window.tvChannel);
    window.tvChannel = _supabase.channel(`tv_${tvId}`);
    
    window.tvChannel
        .on('postgres_changes', { event: '*', schema: 'public', table: 'visibilidad_sabores' }, () => renderPantallaTV(tvId, false))
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'pantallas', filter: `id=eq.${tvId}` }, () => renderPantallaTV(tvId, true))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'sabores' }, () => renderPantallaTV(tvId, false))
        .subscribe();
};

window.renderPantallaTV = async function(id, forceAnimation = null) {
    const tv = document.getElementById('tv-container');
    const { data: pant, error } = await _supabase.from('pantallas').select('*').eq('id', id).single();
    let datos = pant || gestionarCacheTV(id);
    if (!datos) return;
    if (pant) gestionarCacheTV(id, pant);

    // Valores por defecto ampliados con los nuevos campos de Marquesina
    const style = datos.estilo || { 
        font: 'Inter', bg: '#fdfbf7', catColor: '#64748b', saborColor: '#1e293b', 
        catSize: 24, saborSize: 18, columnas: 2, animacionTipo: 'fadeUp', animacionDuracion: 10,
        marquesinaActiva: false, marquesinaBg: '#1e293b', marquesinaColor: '#ffffff', 
        marquesinaVelocidad: 20, marquesinaAlto: 80, marquesinaSize: 30, marquesinaTexto: 'BIENVENIDOS'
    };

    const shouldAnimate = (forceAnimation === true) || !window.tvHasRendered;
    window.tvHasRendered = true;

    if (window.animIntervalTV) {
        clearInterval(window.animIntervalTV);
        window.animIntervalTV = null;
    }
    
    const cicloSegundos = parseInt(style.animacionDuracion) || 0;
    if (cicloSegundos > 0) {
        window.animIntervalTV = setInterval(() => {
            renderPantallaTV(id, true);
        }, cicloSegundos * 1000);
    }

    tv.classList.remove('hidden');
    tv.style.fontFamily = style.font || 'Inter';

    // --- CÁLCULO ESTRICTO DE ALTURAS PARA 1920x1080 ---
    const altoMarquesina = style.marquesinaActiva ? (style.marquesinaAlto || 80) : 0;
    const layoutHeight = `calc(100vh - ${altoMarquesina}px)`;

    const animTipo = style.animacionTipo || 'fadeUp';
    const styleTag = document.getElementById('anim-styles') || document.createElement('style');
    styleTag.id = 'anim-styles';
    
    // CSS Ajustado: Uso de 'column-count' en vez de 'flex' para hacer el efecto de periódico y no salirse del alto
    styleTag.innerHTML = `
        body, html { margin: 0; padding: 0; width: 100vw; height: 100vh; overflow: hidden; background-color: ${style.bg}; }
        #tv-container { width: 100vw; height: 100vh; display: flex; flex-direction: column; overflow: hidden; box-sizing: border-box; }
        
        .tv-layout {
            height: ${layoutHeight}; 
            column-count: ${datos.orientacion === '9:16' ? 1 : (style.columnas || 2)};
            column-gap: 4vw;
            padding: 4vh 4vw;
            box-sizing: border-box;
            overflow: hidden; /* CORTA EL EXCEDENTE, NO ROMPE LA TV */
        }

        .tv-column { 
            break-inside: avoid; /* CRÍTICO: Evita que una categoría se parta en dos columnas */
            page-break-inside: avoid;
            display: inline-block; /* Ayuda a respetar el break-inside */
            width: 100%;
            margin-bottom: 3vh;
        }

        .tv-cat-header {
            color: ${style.catColor}; 
            font-size: ${style.catSize}px; 
            text-transform: uppercase; 
            font-weight: 900; 
            margin-bottom: 1vh;
            border-bottom: 2px solid ${style.catColor}44;
            padding-bottom: 0.5vh;
        }

        .tv-flavor-item, .price-row { 
            font-size: ${style.saborSize}px;
            color: ${style.saborColor};
            line-height: 1.3; 
            display: flex; 
            align-items: center; 
            gap: 10px;
        }

        .price-row { justify-content: space-between; border-bottom: 1px solid rgba(0,0,0,0.05); padding: 5px 0;}
        .price-label { font-weight: 700; color: ${style.catColor}; }
        .price-value { font-weight: 900; }

        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideInLeft { from { opacity: 0; transform: translateX(-20px); } to { opacity: 1; transform: translateX(0); } }
        
        .sabor-anim { animation: ${animTipo} 0.5s ease-out forwards; opacity: 0; }
        @keyframes ticker { 0% { transform: translate3d(0, 0, 0); } 100% { transform: translate3d(-33.33%, 0, 0); } }
    `;
    if (!document.getElementById('anim-styles')) document.head.appendChild(styleTag);

    let html = `<div class="tv-layout">`;
    let delay = 0;

    if (datos.tipo === 'precios') {
        const { data: catP } = await _supabase.from('categorias_precios').select('*').in('id', datos.config_categorias || []).order('orden');
        const { data: prices } = await _supabase.from('precios_globales').select('*').order('orden');
        catP?.forEach(c => {
            const items = prices.filter(p => p.categoria_precio_id === c.id);
            html += `<div class="tv-column"><div class="tv-cat-header">${c.nombre}</div>`;
            items.forEach(p => {
                const animClass = shouldAnimate ? 'sabor-anim' : '';
                const animStyle = shouldAnimate ? `animation-delay: ${delay}s;` : 'opacity: 1;';
                html += `<div class="price-row ${animClass}" style="${animStyle}">
                    <div class="flex items-center gap-4">${p.imagen_url ? `<img src="${p.imagen_url}" class="h-12 w-12 object-contain">` : ''}
                    <span class="price-label">${p.label}</span></div>
                    <span class="price-value">$${p.valor}</span></div>`;
                delay += 0.03;
            });
            html += `</div>`;
        });
    } else {
        const { data: cats } = await _supabase.from('categorias').select('*').in('id', datos.config_categorias || []).order('orden');
        const { data: sabs } = await _supabase.from('sabores').select('*').order('nombre');
        const { data: vis } = await _supabase.from('visibilidad_sabores').select('*').eq('sucursal_id', datos.sucursal_id);
        cats?.forEach(c => {
            const disponibles = sabs.filter(s => s.categoria_id === c.id).filter(s => (vis.find(v => v.sabor_id === s.id)?.disponible !== false));
            if(disponibles.length) {
                html += `<div class="tv-column"><div class="tv-cat-header">${c.nombre}</div>`;
                disponibles.forEach(s => {
                    const animClass = shouldAnimate ? 'sabor-anim' : '';
                    const animStyle = shouldAnimate ? `animation-delay: ${delay}s;` : 'opacity: 1;';
                    html += `<div class="tv-flavor-item ${animClass}" style="${animStyle}">
                        <span class="tv-dot" style="color: #3b82f6;">•</span> <span style="font-weight: 700;">${s.nombre.charAt(0).toUpperCase() + s.nombre.slice(1).toLowerCase()}</span>
                        <div class="flex gap-2 items-center">${s.es_sintacc ? `<img src="img/sintacc.png" style="height: 1.1em;">` : ''}${s.es_vegano ? `<img src="img/vegano.png" style="height: 1.1em;">` : ''}</div></div>`;
                    delay += 0.03;
                });
                html += `</div>`;
            }
        });
    }
    tv.innerHTML = html + `</div>`;

    if (style.marquesinaActiva) {
        const dur = style.marquesinaVelocidad || 20;
        const textoMarq = style.marquesinaTexto !== undefined ? style.marquesinaTexto : 'BIENVENIDOS A LA HELADERIA';
        const altoMq = style.marquesinaAlto || 80;
        const sizeMq = style.marquesinaSize || 30;

        tv.innerHTML += `
            <div class="tv-ticker" style="height: ${altoMq}px; background:${style.marquesinaBg}; color:${style.marquesinaColor}; display: flex; align-items: center; overflow: hidden; white-space: nowrap; width: 100vw; border-top: 3px solid rgba(255,255,255,0.1);">
                <div class="ticker-content" style="display: inline-block; animation: ticker ${dur}s linear infinite; font-size: ${sizeMq}px; font-weight: 900; letter-spacing: 2px;">
                    ${textoMarq} &nbsp;&nbsp;&nbsp;&nbsp; • &nbsp;&nbsp;&nbsp;&nbsp; ${textoMarq} &nbsp;&nbsp;&nbsp;&nbsp; • &nbsp;&nbsp;&nbsp;&nbsp; ${textoMarq}
                </div>
            </div>`;
    }
};

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

window.eliminarTV = async function(id) { if(confirm('¿BORRAR TV?')) { await _supabase.from('pantallas').delete().eq('id', id); verPantallasSucursal(window.currentSucId, window.currentSucName); } };
function switchTab(tab) { activeTab = tab; renderModalContent(); }
