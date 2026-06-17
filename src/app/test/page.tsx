'use client';

import { supabase } from '@/src/lib/supabaseClient';
import { useEffect, useState } from 'react';

type Perfil = {
  id: string;
  user_id: string;
  nombre_completo: string;
  rol: string;
  intentos_fallidos: number;
  bloqueado_hasta: string | null;
  created_at: string;
};

export default function TestPage() {
  const [data, setData] = useState<Perfil[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const { data, error } = await supabase.from('perfiles').select('*').limit(5);
      if (error) {
        console.error('Error al obtener datos:', error);
      } else {
        setData(data || []);
      }
    };
    fetchData();
  }, []);

  return (
    <div>
      <h1>Prueba de conexión a Supabase</h1>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}