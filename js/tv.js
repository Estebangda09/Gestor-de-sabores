// js/tv.js
let currentTvData = null;
let activeTab = 'config';
window.tvHasRendered = false;
window.animIntervalTV = null;
window.highlightInterval = null;

// --- MEMORIA RAM (Evita alerta de consumo en Supabase) ---
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

// --- ACTIVAR ESCUCHA EN TIEMPO REAL (TUS CANALES FUNCIONALES INTACTOS) ---
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

        window.globalTvCache = { datosDb, catPrecios, prices, cats, sabs, vis };
    }

    const { datosDb: datos, catPrecios, prices, cats, sabs, vis } = window.globalTvCache;

    const style = datos.estilo || { 
        font: 'Inter', bg: '#fdfbf7', catColor: '#64748b', saborColor: '#1e293b', 
        catSize: 24, saborSize: 18, columnas: 2, 
        animacionTipo: 'fadeUp', animacionDuracion: 0.5, animacionCiclo: 0,
        marquesinaActiva: false, marquesinaBg: '#1e293b', marquesinaColor: '#ffffff', marquesinaVelocidad: 20, marquesinaTexto: 'BIENVENIDOS',
        espacioCategorias: 20, espacioSabores: 8, columnasPorCategoria: {}, bgData: null, highlightColor: '#d4a373'
    };

    const shouldAnimate = (forceAnimation === true) || !window.tvHasRendered;
    window.tvHasRendered = true;

    // --- LIMPIEZA DE CICLOS ANTERIORES ---
    if (window.animIntervalTV) { clearInterval(window.animIntervalTV); window.animIntervalTV = null; }
    if (window.highlightInterval) { clearInterval(window.highlightInterval); window.highlightInterval = null; }

    const cicloSegundos = parseInt(style.animacionCiclo) || 0;
    
    // Si NO es el estilo escáner, activamos el ciclo normal de repetición si tiene
    if (style.animacionTipo !== 'highlightSeq' && cicloSegundos > 0) {
        window.animIntervalTV = setInterval(() => {
            renderPantallaTV(id, true, false); 
        }, cicloSegundos * 1000);
    }
    
    tv.classList.remove('hidden');
    tv.style.backgroundColor = style.bgData ? 'transparent' : style.bg; 
    tv.style.fontFamily = style.font;

    const altoMq = style.marquesinaActiva ? (style.marquesinaAlto || 80) : 0;
    const layoutHeight = `calc(100vh - ${altoMq}px)`;

    const animDur = style.animacionDuracion || 0.5;
    const animTipo = style.animacionTipo || 'fadeUp';
    const hlColor = style.highlightColor || '#d4a373';
    const styleTag = document.getElementById('anim-styles') || document.createElement('style');
    styleTag.id = 'anim-styles';
    
    let extraCss = `
        .sabor-anim { animation: ${animTipo} ${animDur}s ease-out forwards; opacity: 0; }
    `;

    // Reseteamos clases si es "Resaltado Secuencial" y cuidamos que NO sume altura vertical
    if (animTipo === 'highlightSeq') {
        extraCss = `
            .sabor-anim { opacity: 1; } 
            
            .tv-flavor-item {
                transition: background-color 0.3s ease, color 0.3s ease;
                border-radius: 50px;
                /* CERO PADDING VERTICAL (arriba y abajo) para no empujar la columna hacia abajo */
                padding: 0 10px 0 5px !important;
                margin-left: -5px !important;
            }
            .tv-flavor-item.active-scan {
                background-color: ${hlColor} !important;
            }
            .tv-flavor-item.active-scan .flavor-name, 
            .tv-flavor-item.active-scan .tv-dot {
                color: #ffffff !important;
            }
        `;
    } else if (animTipo === 'cinematic') {
        extraCss = `.sabor-anim { animation: cinematicReveal ${animDur}s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; opacity: 0; }`;
    } else if (animTipo === 'neonLiquid') {
        extraCss = `
            .sabor-anim { animation: neonLiquidReveal ${animDur}s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; opacity: 0; }
            .sabor-anim .flavor-name, .sabor-anim .price-label, .sabor-anim .price-value {
                background: linear-gradient(90deg, #ff007f, #7f00ff, #00d4ff, #ff007f); background-size: 300% auto;
                color: #fff !important; background-clip: text; -webkit-background-clip: text; -webkit-text-fill-color: transparent;
                animation: neonFlow 3s linear infinite; text-shadow: 0 0 15px rgba(127, 0, 255, 0.3);
            }
        `;
    }

    styleTag.innerHTML = `
        body, html { margin: 0; padding: 0; width: 100vw; height: 100vh; overflow: hidden; background-color: ${style.bgData ? '#000' : style.bg}; }
        #tv-container { width: 100vw; height: 100vh; display: flex; flex-direction: column; overflow: hidden; box-sizing: border-box; margin: 0; padding: 0; position: relative; }
        
        .tv-layout {
            height: ${layoutHeight}; display: flex; flex-direction: column; flex-wrap: wrap; 
            column-gap: 2vw; row-gap: 0; padding: 20px 10px 10px 25px; margin: 0;
            box-sizing: border-box; align-content: flex-start; justify-content: flex-start;
            position: relative; z-index: 1;
        }

        .tv-category-container { 
            break-inside: avoid; page-break-inside: avoid;
            width: ${datos.orientacion === '9:16' || style.columnas == 1 ? '100%' : 'calc(50% - 1.5vw)'}; 
            display: flex; flex-direction: column; margin: 0 0 1.5vh 0; padding: 0;
        }

        .tv-cat-header {
            color: ${style.catColor}; font-size: ${style.catSize}px; text-transform: uppercase; font-weight: 900; 
            margin: 0 0 0.8vh 0; border-bottom: 2px solid ${style.catColor}44; padding: 0 0 3px 0;
        }

        .tv-flavor-list { display: grid; column-gap: 1vw; margin: 0; padding: 0; width: 100%; }

        .tv-flavor-item { 
            font-size: ${style.saborSize}px; color: ${style.saborColor}; line-height: 1.15; 
            display: flex; align-items: center; margin: 0; padding: 0; width: max-content; max-width: 100%;
            box-sizing: border-box; min-width: 0; 
        }

        .tv-flavor-item .flavor-name {
            font-weight: 700; flex: 1;
            white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block;
            padding-top: 2px; padding-right: 5px; 
        }

        .price-row { 
            font-size: ${style.saborSize}px; color: ${style.saborColor}; grid-column: span 2; display: flex;
            justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(0,0,0,0.05); padding: 4px 0; margin: 0 0 0.5vh 0;
        }
        .price-label { font-weight: 700; color: ${style.catColor}; margin: 0; white-space: nowrap; overflow: hidden; display: block; flex: 1; }
        .price-value { font-weight: 900; margin: 0; margin-left: 10px; flex-shrink: 0; }

        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideInLeft { from { opacity: 0; transform: translateX(-20px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes cinematicReveal { 0% { clip-path: inset(0 100% 0 0); transform: scale(0.9); opacity: 0; filter: blur(6px); } 100% { clip-path: inset(0 0 0 0); transform: scale(1); opacity: 1; filter: blur(0); } }
        @keyframes neonLiquidReveal { 0% { clip-path: inset(0 100% 0 0); transform: scale(0.9); filter: blur(6px); opacity: 0; } 100% { clip-path: inset(0 0 0 0); transform: scale(1); filter: blur(0); opacity: 1; } }
        @keyframes neonFlow { 0% { background-position: 0% center; } 100% { background-position: 300% center; } }
        @keyframes ticker { 0% { transform: translate3d(0, 0, 0); } 100% { transform: translate3d(-33.33%, 0, 0); } }
        ${extraCss}
    `;
    if (!document.getElementById('anim-styles')) document.head.appendChild(styleTag);

    const espCat = style.espacioCategorias !== undefined ? style.espacioCategorias : 20;
    const espSab = style.espacioSabores !== undefined ? style.espacioSabores : 8;
    const colsPorCat = style.columnasPorCategoria || {};

    let html = '';
    if (style.bgData) {
        html += `<img src="${style.bgData}" style="position: absolute; top:0; left:0; width: 100vw; height: 100vh; object-fit: cover; z-index: 0;">`;
    }

    html += `<div class="tv-layout">`;
    let delay = 0; 

    if (datos.tipo === 'precios') {
        catPrecios?.forEach(c => {
            const items = prices.filter(p => p.categoria_precio_id === c.id);
            const catCols = colsPorCat[c.id] || 2;
            html += `<div class="tv-category-container" style="margin-bottom: ${espCat}px;"><div class="tv-cat-header">${c.nombre}</div><div class="tv-flavor-list" style="grid-template-columns: repeat(${catCols}, 1fr); row-gap: ${espSab}px;">`;
            items.forEach(p => {
                const animClass = shouldAnimate ? 'sabor-anim' : '';
                const animStyle = shouldAnimate ? `animation-delay: ${delay}s;` : 'opacity: 1;';
                html += `<div class="price-row ${animClass}" style="${animStyle}"><div class="flex items-center gap-4" style="flex: 1; min-width: 0;">${p.imagen_url ? `<img src="${p.imagen_url}" class="h-12 w-12 object-contain flex-shrink-0">` : ''}<span class="price-label">${p.label}</span></div><span class="price-value">$${p.valor}</span></div>`;
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
                        bulletHtml = `<div style="width: 50px; flex-shrink: 0; display: flex; gap: 4px; align-items: flex-start; justify-content: flex-start; padding-top: 1px;">${s.es_sintacc ? `<img src="img/sintacc.png" style="height: 35px; width: auto; object-fit: contain; flex-shrink: 0;">` : ''}${s.es_vegano ? `<img src="img/vegano.png" style="height: 35px; width: auto; object-fit: contain; flex-shrink: 0;">` : ''}</div>`;
                    } else {
                        bulletHtml = `<div style="width: 50px; flex-shrink: 0; display: flex; align-items: flex-start; justify-content: flex-start; padding-left: 5px; padding-top: 4px;"><span class="tv-dot" style="color: #3b82f6; font-size: 0.9em; line-height: 1;">•</span></div>`;
                    }

                    html += `<div class="tv-flavor-item scan-item ${animClass}" style="${animStyle}">${bulletHtml}<span class="flavor-name">${nombreFormateado}</span></div>`;
                });
                html += `</div></div>`;
            }
        });
    }
    
    html += `</div>`;
    
    if (style.marquesinaActiva) {
        const dur = style.marquesinaVelocidad || 20;
        const txt = style.marquesinaTexto || 'BIENVENIDOS';
        const sizeMq = style.marquesinaSize || 36;
        html += `<div class="tv-ticker" style="height: ${altoMq}px; background:${style.marquesinaBg}; color:${style.marquesinaColor}; display: flex; align-items: center; overflow: hidden; white-space: nowrap; width: 100vw; border-top: 3px solid rgba(255,255,255,0.1); margin: 0; padding: 0; position: relative; z-index: 2;"><div class="ticker-content" style="display: inline-block; animation: ticker ${dur}s linear infinite; font-size: ${sizeMq}px; font-weight: 900; letter-spacing: 2px;">${txt} &nbsp;&nbsp;&nbsp;&nbsp; • &nbsp;&nbsp;&nbsp;&nbsp; ${txt} &nbsp;&nbsp;&nbsp;&nbsp; • &nbsp;&nbsp;&nbsp;&nbsp; ${txt}</div></div>`;
    }

    tv.innerHTML = html;

    // --- AUTO-AJUSTE DE EMERGENCIA Y MOTOR DE ESCÁNER ---
    setTimeout(() => {
        const layout = tv.querySelector('.tv-layout');
        const catHeaders = tv.querySelectorAll('.tv-cat-header');
        const flavorItems = tv.querySelectorAll('.tv-flavor-item, .price-row');
        const catContainers = tv.querySelectorAll('.tv-category-container');
        const flavorLists = tv.querySelectorAll('.tv-flavor-list');

        let scale = 1.0;
        // 1. AUTO-AJUSTE VERTICAL GLOBAL: Si la lista es tan alta que generó una 3ra columna oculta (desbordando el 100vw).
        // Reduce todo proporcionalmente de 2% en 2% hasta que encaje perfecto en 2 columnas sin ocultar nada.
        if (layout) {
            while (layout.scrollWidth > layout.clientWidth && scale > 0.4) {
                scale -= 0.02;
                catHeaders.forEach(el => el.style.fontSize = (style.catSize * scale) + 'px');
                flavorItems.forEach(el => el.style.fontSize = (style.saborSize * scale) + 'px');
                catContainers.forEach(el => el.style.marginBottom = (espCat * scale) + 'px');
                flavorLists.forEach(el => el.style.rowGap = (espSab * scale) + 'px');
            }
        }

        // 2. AUTO-AJUSTE HORIZONTAL: Achica las letras de un nombre específico si es demasiado largo para su columna
        const elementosTexto = tv.querySelectorAll('.flavor-name, .price-label');
        elementosTexto.forEach(el => {
            let size = parseFloat(window.getComputedStyle(el).fontSize);
            while (el.scrollWidth > el.clientWidth && size > 10) {
                size -= 0.5;
                el.style.fontSize = size + 'px';
            }
        });

        // 3. Activar el Motor del Resaltado Secuencial (Escáner)
        if (animTipo === 'highlightSeq') {
            const scanItems = tv.querySelectorAll('.scan-item');
            if (scanItems.length > 0) {
                let currentIndex = 0;
                const scanSpeed = (style.animacionDuracion || 0.5) * 1000; 

                window.highlightInterval = setInterval(() => {
                    scanItems.forEach(el => el.classList.remove('active-scan'));
                    if (scanItems[currentIndex]) {
                        scanItems[currentIndex].classList.add('active-scan');
                    }
                    currentIndex++;
                    if (currentIndex >= scanItems.length) {
                        currentIndex = 0;
                    }
                }, scanSpeed);
            }
        }
    }, 50);
};

// --- RESTRICCIÓN DE PANTALLA COMPLETA (SOLO MODO TV) ---
document.addEventListener('click', function() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('mode') === 'tv') {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => console.log(err.message));
        }
    }
});
