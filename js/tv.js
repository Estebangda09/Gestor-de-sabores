let currentTvData = null;
let activeTab = 'config';
window.tvHasRendered = false;
window.animIntervalTV = null;

// --- MEMORIA RAM  ---
window.globalTvCache = null;

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

// --- ACTIVAR ESCUCHA EN TIEMPO REAL ---
window.activarRealtimeTV = function(tvId) {
    console.log("Conectando Realtime para TV:", tvId);

    // Canal 1: Diseño y estilos
    _supabase
        .channel('public:pantallas')
        .on('postgres_changes', { 
            event: 'UPDATE', 
            schema: 'public', 
            table: 'pantallas', 
            filter: `id=eq.${tvId}` 
        }, () => {
            console.log('Cambio de diseño detectado en DB...');
            renderPantallaTV(tvId, true, true); 
        })
        .subscribe();

    // Canal 2: Disponibilidad de sabores (Stock)
    _supabase
        .channel('public:visibilidad_sabores')
        .on('postgres_changes', { 
            event: '*', 
            schema: 'public', 
            table: 'visibilidad_sabores' 
        }, () => {
            console.log('Cambio de stock detectado...');
            renderPantallaTV(tvId, false, true); 
        })
        .subscribe();

    // Canal 3: Edición de un sabor (Nombre, vegano, sintacc)
    _supabase
        .channel('public:sabores')
        .on('postgres_changes', { 
            event: '*', 
            schema: 'public', 
            table: 'sabores' 
        }, () => {
            console.log('Cambio en datos de sabor detectado...');
            renderPantallaTV(tvId, false, true); 
        })
        .subscribe();
};

// --- RENDERIZADO DE PANTALLA ---
window.renderPantallaTV = async function(id, forceAnimation = null, forceFetch = true) {
    const tv = document.getElementById('tv-container');
    
    // --- LÓGICA DE MEMORIA RAM ---
    if (forceFetch || !window.globalTvCache) {
        console.log("⬇️ Descargando datos de Supabase...");
        
        const { data: pant, error } = await _supabase.from('pantallas').select('*').eq('id', id).single();
        let datosDb = pant;

        if (error || !pant) {
            datosDb = gestionarCacheTV(id);
            if (!datosDb) return console.error("Sin conexión y sin datos en caché.");
        } else {
            gestionarCacheTV(id, pant); 
        }

        let catPrecios = [], prices = [], cats = [], sabs = [], vis = [];

        if (datosDb.tipo === 'precios') {
            const resC = await _supabase.from('categorias_precios').select('*').in('id', datosDb.config_categorias || []).order('orden');
            const resP = await _supabase.from('precios_globales').select('*').order('orden');
            catPrecios = resC.data || [];
            prices = resP.data || [];
        } else {
            const resC = await _supabase.from('categorias').select('*').in('id', datosDb.config_categorias || []).order('orden');
            const resS = await _supabase.from('sabores').select('*').order('nombre');
            const resV = await _supabase.from('visibilidad_sabores').select('*').eq('sucursal_id', datosDb.sucursal_id);
            cats = resC.data || [];
            sabs = resS.data || [];
            vis = resV.data || [];
        }

        // Guardamos todo en Memoria RAM
        window.globalTvCache = { datosDb, catPrecios, prices, cats, sabs, vis };
    } else {
        console.log("⚡ Usando Memoria RAM. (0 Consultas a DB)");
    }

    // Leemos de la RAM
    const { datosDb: datos, catPrecios, prices, cats, sabs, vis } = window.globalTvCache;

    const style = datos.estilo || { 
        font: 'Inter', bg: '#fdfbf7', catColor: '#64748b', saborColor: '#1e293b', 
        catSize: 24, saborSize: 18, columnas: 2, 
        animacionTipo: 'fadeUp', animacionDuracion: 0.5, animacionCiclo: 0,
        marquesinaActiva: false, marquesinaBg: '#1e293b', marquesinaColor: '#ffffff', marquesinaVelocidad: 20, marquesinaTexto: 'BIENVENIDOS',
        espacioCategorias: 20, espacioSabores: 8, columnasPorCategoria: {}
    };

    const shouldAnimate = (forceAnimation === true) || !window.tvHasRendered;
    window.tvHasRendered = true;

    // --- CICLO DE REPETICIÓN ---
    if (window.animIntervalTV) {
        clearInterval(window.animIntervalTV);
        window.animIntervalTV = null;
    }
    const cicloSegundos = parseInt(style.animacionCiclo) || 0;
    if (cicloSegundos > 0) {
        window.animIntervalTV = setInterval(() => {
            renderPantallaTV(id, true, false); 
        }, cicloSegundos * 1000);
    }
    
    tv.classList.remove('hidden');
    tv.style.backgroundColor = style.bg;
    tv.style.fontFamily = style.font;

    const altoMq = style.marquesinaActiva ? (style.marquesinaAlto || 80) : 0;
    const layoutHeight = `calc(100vh - ${altoMq}px)`;

    const animDur = style.animacionDuracion || 0.5;
    const animTipo = style.animacionTipo || 'fadeUp';
    const styleTag = document.getElementById('anim-styles') || document.createElement('style');
    styleTag.id = 'anim-styles';
    
    // --- CSS ESTRUCTURAL: Solución definitiva al desbordamiento (word-wrap) ---
    styleTag.innerHTML = `
        body, html { margin: 0; padding: 0; width: 100vw; height: 100vh; overflow: hidden; background-color: ${style.bg}; }
        #tv-container { width: 100vw; height: 100vh; display: flex; flex-direction: column; overflow: hidden; box-sizing: border-box; margin: 0; padding: 0; }
        
        .tv-layout {
            height: ${layoutHeight}; 
            display: flex;
            flex-direction: column;
            flex-wrap: wrap; 
            column-gap: 2vw;
            row-gap: 0;
            padding: 20px 10px 10px 25px; 
            margin: 0;
            box-sizing: border-box;
            align-content: flex-start;
            justify-content: flex-start;
        }

        .tv-category-container { 
            break-inside: avoid; 
            page-break-inside: avoid;
            width: ${datos.orientacion === '9:16' || style.columnas == 1 ? '100%' : 'calc(50% - 1.5vw)'}; 
            display: flex; 
            flex-direction: column;
            margin: 0 0 1.5vh 0; 
            padding: 0;
        }

        .tv-cat-header {
            color: ${style.catColor}; 
            font-size: ${style.catSize}px; 
            text-transform: uppercase; 
            font-weight: 900; 
            margin: 0 0 0.8vh 0; 
            border-bottom: 2px solid ${style.catColor}44;
            padding: 0 0 3px 0;
        }

        .tv-flavor-list {
            display: grid;
            column-gap: 1vw;
            margin: 0; padding: 0;
            width: 100%;
        }

        .tv-flavor-item { 
            font-size: ${style.saborSize}px;
            color: ${style.saborColor};
            line-height: 1.15; 
            display: flex; 
            align-items: flex-start; /* Evita que el texto y los íconos se descuadren al saltar de línea */
            margin: 0; padding: 0;
            width: 100%;
            box-sizing: border-box;
            padding-right: 5px; /* Margen de seguridad derecho */
        }

        .tv-flavor-item .flavor-name {
            font-weight: 700; 
            flex: 1;
            word-wrap: break-word; /* HACE QUE EL TEXTO SALTE A LA SIGUIENTE LÍNEA SI ES MUY LARGO */
            overflow-wrap: break-word;
            white-space: normal;
            padding-top: 2px;
        }

        .price-row { 
            font-size: ${style.saborSize}px;
            color: ${style.saborColor};
            grid-column: span 2; 
            display: flex;
            justify-content: space-between; 
            align-items: center; 
            border-bottom: 1px solid rgba(0,0,0,0.05); 
            padding: 4px 0;
            margin: 0 0 0.5vh 0;
        }

        .price-label { font-weight: 700; color: ${style.catColor}; margin: 0; }
        .price-value { font-weight: 900; margin: 0; }

        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideInLeft { from { opacity: 0; transform: translateX(-20px); } to { opacity: 1; transform: translateX(0); } }
        .sabor-anim { animation: ${animTipo} ${animDur}s ease-out forwards; opacity: 0; }
        @keyframes ticker { 0% { transform: translate3d(0, 0, 0); } 100% { transform: translate3d(-33.33%, 0, 0); } }
    `;
    if (!document.getElementById('anim-styles')) document.head.appendChild(styleTag);

    const espCat = style.espacioCategorias !== undefined ? style.espacioCategorias : 20;
    const espSab = style.espacioSabores !== undefined ? style.espacioSabores : 8;
    const colsPorCat = style.columnasPorCategoria || {};

    let html = `<div class="tv-layout">`;
    let delay = 0; 

    if (datos.tipo === 'precios') {
        catPrecios?.forEach(c => {
            const items = prices.filter(p => p.categoria_precio_id === c.id);
            const catCols = colsPorCat[c.id] || 2;
            html += `<div class="tv-category-container" style="margin-bottom: ${espCat}px;"><div class="tv-cat-header">${c.nombre}</div><div class="tv-flavor-list" style="grid-template-columns: repeat(${catCols}, 1fr); row-gap: ${espSab}px;">`;
            items.forEach(p => {
                const animClass = shouldAnimate ? 'sabor-anim' : '';
                const animStyle = shouldAnimate ? `animation-delay: ${delay}s;` : 'opacity: 1;';
                
                html += `
                <div class="price-row ${animClass}" style="${animStyle}">
                    <div class="flex items-center gap-4">
                        ${p.imagen_url ? `<img src="${p.imagen_url}" class="h-12 w-12 object-contain">` : ''}
                        <span class="price-label">${p.label}</span>
                    </div>
                    <span class="price-value">$${p.valor}</span>
                </div>`;
                delay += 0.03;
            });
            html += `</div></div>`;
        });
        
    } else {
        cats?.forEach(c => {
            const disponibles = sabs.filter(s => s.categoria_id === c.id).filter(s => {
                const v = vis.find(v => v.sabor_id === s.id);
                return v ? v.disponible !== false : true;
            });
            
            if(disponibles.length) {
                const catCols = colsPorCat[c.id] || 2;
                html += `<div class="tv-category-container" style="margin-bottom: ${espCat}px;"><div class="tv-cat-header">${c.nombre}</div><div class="tv-flavor-list" style="grid-template-columns: repeat(${catCols}, 1fr); row-gap: ${espSab}px;">`;
                disponibles.forEach(s => {
                    const nombreFormateado = s.nombre.charAt(0).toUpperCase() + s.nombre.slice(1).toLowerCase();
                    const currentDelay = delay;
                    delay += 0.03;
                    
                    const animClass = shouldAnimate ? 'sabor-anim' : '';
                    const animStyle = shouldAnimate ? `animation-delay: ${currentDelay}s;` : 'opacity: 1;';
                    
                    const tieneIcono = s.es_sintacc || s.es_vegano;
                    let bulletHtml = '';
                    
                    if (tieneIcono) {
                        bulletHtml = `
                        <div style="width: 50px; flex-shrink: 0; display: flex; gap: 4px; align-items: flex-start; justify-content: flex-start; padding-top: 1px;">
                            ${s.es_sintacc ? `<img src="img/sintacc.png" style="height: 35px; width: auto; object-fit: contain; flex-shrink: 0;">` : ''}
                            ${s.es_vegano ? `<img src="img/vegano.png" style="height: 35px; width: auto; object-fit: contain; flex-shrink: 0;">` : ''}
                        </div>`;
                    } else {
                        bulletHtml = `
                        <div style="width: 50px; flex-shrink: 0; display: flex; align-items: flex-start; justify-content: flex-start; padding-left: 5px; padding-top: 4px;">
                            <span class="tv-dot" style="color: #3b82f6; font-size: 0.9em; line-height: 1;">•</span>
                        </div>`;
                    }

                    html += `
                    <div class="tv-flavor-item ${animClass}" style="${animStyle}">
                        ${bulletHtml}
                        <span class="flavor-name">${nombreFormateado}</span>
                    </div>`;
                });
                html += `</div></div>`;
            }
        });
    }
    
    tv.innerHTML = html + `</div>`;
    
    if (style.marquesinaActiva) {
        const dur = style.marquesinaVelocidad || 20;
        const txt = style.marquesinaTexto || 'BIENVENIDOS';
        const sizeMq = style.marquesinaSize || 36;
        
        tv.innerHTML += `
            <div class="tv-ticker" style="height: ${altoMq}px; background:${style.marquesinaBg}; color:${style.marquesinaColor}; display: flex; align-items: center; overflow: hidden; white-space: nowrap; width: 100vw; border-top: 3px solid rgba(255,255,255,0.1); margin: 0; padding: 0;">
                <div class="ticker-content" style="display: inline-block; animation: ticker ${dur}s linear infinite; font-size: ${sizeMq}px; font-weight: 900; letter-spacing: 2px;">
                    ${txt} &nbsp;&nbsp;&nbsp;&nbsp; • &nbsp;&nbsp;&nbsp;&nbsp; ${txt} &nbsp;&nbsp;&nbsp;&nbsp; • &nbsp;&nbsp;&nbsp;&nbsp; ${txt}
                </div>
            </div>`;
    }
};

// --- ACTIVACIÓN DE PANTALLA COMPLETA (FULLSCREEN) AL PRIMER CLIC/TOQUE ---
document.addEventListener('click', function() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.log(`Error al intentar iniciar pantalla completa: ${err.message}`);
        });
    }
});
