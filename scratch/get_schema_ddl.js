const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Cargar variables de entorno
try {
  const envPath = path.resolve('C:/Users/user/sistema-incidencias-sla/.env.local');
  if (fs.existsSync(envPath)) {
    const envFile = fs.readFileSync(envPath, 'utf-8');
    envFile.split('\n').forEach(line => {
      const match = line.trim().match(/^([\w.-]+)\s*=\s*(.*)$/);
      if (match) {
        process.env[match[1]] = (match[2] || '').replace(/['"]/g, '').trim();
      }
    });
  }
} catch (e) {
  console.error(e);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.MY_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Faltan variables de entorno');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function run() {
  const query = `
    SELECT 
      table_name, 
      column_name, 
      data_type, 
      is_nullable, 
      column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position;
  `;
  
  const { data, error } = await supabase.rpc('exec_sql', { query });
  if (error) {
    console.error('Error executing query via RPC:', error);
  } else {
    fs.writeFileSync('C:/Users/user/sistema-incidencias-sla/scratch/db_schema_columns.json', JSON.stringify(data, null, 2));
    console.log('✅ Esquema obtenido y guardado en db_schema_columns.json');
  }
}

run();
