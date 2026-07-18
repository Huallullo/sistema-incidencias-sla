const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manually parse .env.local
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.substring(1, value.length - 1);
    }
    env[key] = value.trim();
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.MY_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing credentials in .env.local", { supabaseUrl, serviceKey });
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function run() {
  const { data: perfiles, error } = await supabase
    .from('perfiles')
    .select('id_perfil, id_auth_supabase, id_rol, correo, nombre, apellido')
    .limit(3);

  if (error) {
    console.error("Error fetching perfiles:", error);
  } else {
    console.log("Perfiles sample:", perfiles);
  }

  const { data: roles, error: rolesError } = await supabase
    .from('roles')
    .select('*');

  if (rolesError) {
    console.error("Error fetching roles:", rolesError);
  } else {
    console.log("Roles table:", roles);
  }
}

run();
