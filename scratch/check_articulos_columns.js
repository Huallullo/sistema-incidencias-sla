const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function run() {
  const envContent = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf-8');
  const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
  const anonMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);
  const serviceMatch = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);
  
  const url = urlMatch ? urlMatch[1].trim() : '';
  const key = serviceMatch ? serviceMatch[1].trim() : (anonMatch ? anonMatch[1].trim() : '');
  
  console.log('Connecting to:', url);
  const supabase = createClient(url, key);
  
  const { data, error } = await supabase
    .from('articulos_conocimiento')
    .select('*')
    .limit(1);
    
  if (error) {
    console.error('Error fetching:', error);
  } else {
    console.log('Sample row:', data[0]);
    if (data[0]) {
      console.log('Keys:', Object.keys(data[0]));
    }
  }
}

run().catch(console.error);
