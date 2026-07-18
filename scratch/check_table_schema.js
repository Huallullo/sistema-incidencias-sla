const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function run() {
  const envContent = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf-8');
  const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
  const serviceMatch = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);
  
  const url = urlMatch ? urlMatch[1].trim() : '';
  const key = serviceMatch ? serviceMatch[1].trim() : '';
  
  const supabase = createClient(url, key);
  
  // Query list of all tables
  const { data, error } = await supabase
    .from('articulos_conocimiento') // just a fallback
    .select('id_articulo')
    .limit(1);
    
  console.log('Test call to supabase finished.');
  
  // We can query custom tables by trying to select from them. Let's try selecting from 'consultas_articulo' or similar.
  const tests = ['consultas_articulo', 'vistas_articulo', 'vistas_articulos', 'consultas_articulos', 'historial_consultas'];
  for (const t of tests) {
    const { error: err } = await supabase.from(t).select('*').limit(1);
    if (err) {
      console.log(`Table '${t}' error:`, err.message);
    } else {
      console.log(`Table '${t}' exists!`);
    }
  }
}

run().catch(console.error);
