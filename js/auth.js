const SUPABASE_URL = 'https://vokwutkpntqtfevvdkei.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZva3d1dGtwbnRxdGZldnZka2VpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3OTE4MDMsImV4cCI6MjA4OTM2NzgwM30.FdNLN4PdKAMe4LSdw9lGqjLeV6UzbfFlwZjgkd8nkro';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

window.userPerfil = null;

window.addEventListener('load', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    
    // MODO TV: Público y Realtime (IGNORA LOGIN)
    if (urlParams.get('mode') === 'tv') {
        const tvId = urlParams.get('id');
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('tv-container').classList.remove('hidden');
        
        await renderPantallaTV(tvId); // Función en tv.js
        activarRealtimeTV(tvId);      // Función en tv.js
        return; 
    }

    // MODO ADMIN: Lógica normal de sesión
    const savedUser = localStorage.getItem('remembered_username');
    if (savedUser && document.getElementById('login-user')) {
        document.getElementById('login-user').value = savedUser;
        document.getElementById('remember-me').checked = true;
    }

    await checkSession();
});

async function checkSession() {
    try {
        const { data: { session } } = await _supabase.auth.getSession();
        if (!session) {
            document.getElementById('login-screen').style.display = 'flex';
            return;
        }

        const { data: perfil, error } = await _supabase.from('perfiles').select('*').eq('id', session.user.id).single();
        if (error) throw error;
        
        window.userPerfil = perfil; // Guardar globalmente

        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('sidebar').classList.remove('hidden');
        document.getElementById('app').classList.remove('hidden');

        renderMenu(); // Función en admin.js

        // Redirección inicial según permisos
        if (window.userPerfil.rol === 'admin') showPage('categorias');
        else {
            const p = window.userPerfil.permisos || {};
            if (p.sucursales) showPage('sucursales');
            else if (p.sabores) showPage('sabores');
            else showPage('categorias');
        }
    } catch (e) {
        document.getElementById('login-screen').style.display = 'flex';
    }
}

async function handleLogin() {
    const userInput = document.getElementById('login-user').value.trim();
    const pass = document.getElementById('login-pass').value;
    const remember = document.getElementById('remember-me').checked;
    if (!userInput || !pass) return alert("Completar campos");

    let emailFinal = userInput;
    if (!userInput.includes('@')) {
        const { data: p } = await _supabase.from('perfiles').select('email_acceso').eq('username', userInput).maybeSingle();
        if (p && p.email_acceso) emailFinal = p.email_acceso;
    }

    const { error } = await _supabase.auth.signInWithPassword({ email: emailFinal, password: pass });
    if (error) return alert("Usuario o contraseña incorrectos");

    if (remember) localStorage.setItem('remembered_username', userInput);
    else localStorage.removeItem('remembered_username');

    window.location.reload();
}

function handleLogout() {
    _supabase.auth.signOut().then(() => window.location.reload());
}
