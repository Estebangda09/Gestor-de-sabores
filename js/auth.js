const SUPABASE_URL = 'https://vokwutkpntqtfevvdkei.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZva3d1dGtwbnRxdGZldnZka2VpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3OTE4MDMsImV4cCI6MjA4OTM2NzgwM30.FdNLN4PdKAMe4LSdw9lGqjLeV6UzbfFlwZjgkd8nkro';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let userPerfil = null;


document.addEventListener('DOMContentLoaded', () => {
 
    const savedUser = localStorage.getItem('remembered_username');
    if (savedUser && document.getElementById('login-user')) {
        document.getElementById('login-user').value = savedUser;
        document.getElementById('remember-me').checked = true;
    }

    // Si es modo TV, renderizar directamente
    document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    
    // MODO TV: Ignora sesión por completo
    if (urlParams.get('mode') === 'tv') {
        const tvId = urlParams.get('id');
        document.body.innerHTML = '<div id="tv-container" class="tv-mode"></div>';
        renderPantallaTV(tvId);
        // Actualización automática cada 1 minuto (60000ms)
        setInterval(() => renderPantallaTV(tvId), 60000); 
        return; 
    }

    // MODO ADMIN: Lógica normal
    const savedUser = localStorage.getItem('remembered_username');
    if (savedUser && document.getElementById('login-user')) {
        document.getElementById('login-user').value = savedUser;
        document.getElementById('remember-me').checked = true;
    }
    checkSession();
});

async function checkSession() {
    try {
        const { data: { session } } = await _supabase.auth.getSession();
        if (!session) return;

        
        const { data: perfil, error } = await _supabase
            .from('perfiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

        if (error) throw error;
        userPerfil = perfil;

        // Ocultar login y mostrar app
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('sidebar').classList.remove('hidden');
        document.getElementById('app').classList.remove('hidden');

        renderMenu();

      
        if (userPerfil.rol === 'admin') {
            showPage('categorias');
        } else {
           
            const p = userPerfil.permisos;
            if (p.sucursales) showPage('sucursales');
            else if (p.sabores) showPage('sabores');
            else if (p.pantallas) showPage('pantallas');
            else if (p.precios) showPage('precios');
            else if (p.categorias) showPage('categorias');
        }

    } catch (e) {
        console.error("Error de sesión:", e.message);
    }
}

async function handleLogin() {
    const userInput = document.getElementById('login-user').value.trim();
    const pass = document.getElementById('login-pass').value;
    const remember = document.getElementById('remember-me').checked;

    if (!userInput || !pass) return alert("Completa todos los campos");

    let emailFinal = userInput;

    if (!userInput.includes('@')) {
        const { data: p, error } = await _supabase
            .from('perfiles')
            .select('email_acceso') 
            .eq('username', userInput)
            .maybeSingle();
        
        if (p && p.email_acceso) {
            emailFinal = p.email_acceso;
        } else {
            
            emailFinal = userInput; 
        }
    }

    const { data, error } = await _supabase.auth.signInWithPassword({
        email: emailFinal,
        password: pass
    });

    if (error) {
        return alert("Error: Usuario o contraseña incorrectos");
    }

    if (remember) {
        localStorage.setItem('remembered_username', userInput);
    } else {
        localStorage.removeItem('remembered_username');
    }

    window.location.reload();
}

async function recuperarClave() {
    const email = prompt("Ingresa tu correo electrónico para enviarte un enlace de recuperación:");
    if (!email) return;

    const { error } = await _supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
    });

    if (error) alert("Error: " + error.message);
    else alert("¡Listo! Revisa tu correo electrónico para restablecer tu clave.");
}

function handleLogout() {
    _supabase.auth.signOut().then(() => {
        window.location.reload();
    });
}
