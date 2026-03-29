const SUPABASE_URL = 'https://vokwutkpntqtfevvdkei.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZva3d1dGtwbnRxdGZldnZka2VpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3OTE4MDMsImV4cCI6MjA4OTM2NzgwM30.FdNLN4PdKAMe4LSdw9lGqjLeV6UzbfFlwZjgkd8nkro';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

window.userPerfil = null; // Global para que admin.js lo vea siempre

window.addEventListener('load', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    
    // MODO TV: Ignora login y carga directo
    if (urlParams.get('mode') === 'tv') {
        const tvId = urlParams.get('id');
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('tv-container').classList.remove('hidden');
        await renderPantallaTV(tvId);
        activarRealtimeTV(tvId);
        return; 
    }

    // MODO ADMIN: Recordar correo electrónico
    const savedEmail = localStorage.getItem('remembered_email');
    // Mantenemos el ID 'login-user' por si no lo cambiaste en el HTML, pero ahora espera un correo
    const inputEmail = document.getElementById('login-email') || document.getElementById('login-user');
    
    if (savedEmail && inputEmail) {
        inputEmail.value = savedEmail;
        if (document.getElementById('remember-me')) {
            document.getElementById('remember-me').checked = true;
        }
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
        
        window.userPerfil = perfil; // Asignación global

        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('sidebar').classList.remove('hidden');
        document.getElementById('app').classList.remove('hidden');

        renderMenu();

        if (window.userPerfil.rol === 'admin') {
            showPage('categorias');
        } else {
            const p = window.userPerfil.permisos || {};
            if (p.sucursales) showPage('sucursales');
            else if (p.sabores) showPage('sabores');
            else if (p.pantallas) showPage('pantallas');
            else if (p.precios) showPage('precios');
            else showPage('categorias');
        }
    } catch (e) {
        document.getElementById('login-screen').style.display = 'flex';
    }
}

async function handleLogin() {
    // Busca el input por el ID nuevo (login-email) o por el viejo (login-user)
    const inputElement = document.getElementById('login-email') || document.getElementById('login-user');
    const emailInput = inputElement.value.trim();
    const pass = document.getElementById('login-pass').value;
    const remember = document.getElementById('remember-me') ? document.getElementById('remember-me').checked : false;

    if (!emailInput || !pass) return alert("Completa todos los campos");

    // Verificamos de forma rápida que hayan escrito un correo
    if (!emailInput.includes('@')) {
        return alert("Por favor, ingresa tu correo electrónico (ejemplo@correo.com) en lugar de tu nombre de usuario.");
    }

    // Login directo y seguro con Supabase Auth usando el correo
    const { error } = await _supabase.auth.signInWithPassword({ email: emailInput, password: pass });
    
    if (error) return alert("Correo electrónico o contraseña incorrectos");

    // Guardamos el correo en el navegador si marcó la casilla
    if (remember) localStorage.setItem('remembered_email', emailInput);
    else localStorage.removeItem('remembered_email');

    window.location.reload();
}

function handleLogout() {
    _supabase.auth.signOut().then(() => window.location.reload());
}
