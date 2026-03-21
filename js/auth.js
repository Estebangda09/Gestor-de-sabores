const SUPABASE_URL = 'https://vokwutkpntqtfevvdkei.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZva3d1dGtwbnRxdGZldnZka2VpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3OTE4MDMsImV4cCI6MjA4OTM2NzgwM30.FdNLN4PdKAMe4LSdw9lGqjLeV6UzbfFlwZjgkd8nkro';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let userPerfil = null;
let currentPage = 'categorias';

const urlParams = new URLSearchParams(window.location.search);

window.onload = () => {
    if (urlParams.get('mode') === 'tv') {
        const tvId = urlParams.get('id');
        document.body.innerHTML = '<div id="tv-container" class="tv-mode"></div>';
        renderPantallaTV(tvId);
        setInterval(() => renderPantallaTV(tvId), 10000);
    } else {
        checkSession();
    }
};

async function checkSession() {
    try {
        const { data: { session } } = await _supabase.auth.getSession();
        if (!session) return;
        const { data: perfil } = await _supabase.from('perfiles').select('*').eq('id', session.user.id).single();
        userPerfil = perfil;
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('sidebar').classList.remove('hidden');
        document.getElementById('app').classList.remove('hidden');
        renderMenu();
        showPage('categorias');
    } catch (e) { console.error(e); }
}

async function handleLogin() {
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-pass').value;
    const { error } = await _supabase.auth.signInWithPassword({ email, password: pass });
    if (error) alert(error.message); else window.location.reload();
}

function handleLogout() { _supabase.auth.signOut().then(() => window.location.reload()); }
