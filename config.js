// config.js
const SUPABASE_URL = 'https://vokwutkpntqtfevvdkei.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZva3d1dGtwbnRxdGZldnZka2VpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3OTE4MDMsImV4cCI6MjA4OTM2NzgwM30.FdNLN4PdKAMe4LSdw9lGqjLeV6UzbfFlwZjgkd8nkro';

// Usamos el objeto global 'supabase' de la librería CDN
const _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
