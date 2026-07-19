'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import { PerfilesRepository } from '@/repositories/PerfilesRepository';
import { AuthService } from '@/services/AuthService';

export async function actualizarUsuarioAction(
  userId: string,
  data: {
    nombre_completo?: string;
    correo?: string;
    cargo?: string;
    id_rol?: number;
    estado?: string;
    password?: string;
  }
) {
  try {
    // 1. Validar sesión del administrador
    const session = await AuthService.getSession();
    if (!session?.user?.id) {
      return { success: false, error: 'Sesión no válida. Inicie sesión nuevamente.' };
    }

    // 2. Validar que el ejecutor sea Jefe de TI (rol 1)
    const profile = await PerfilesRepository.getProfileByUserId(session.user.id);
    if (!profile || profile.id_rol !== 1) {
      return { success: false, error: 'Acceso denegado. Solo el Jefe de TI puede editar usuarios.' };
    }

    // 3. Si viene contraseña, actualizar en Supabase Auth usando el cliente administrativo
    if (data.password && data.password.trim() !== '') {
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.MY_SUPABASE_SERVICE_ROLE_KEY!,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      );

      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { password: data.password.trim() }
      );

      if (authError) {
        console.error('Error updating user password via admin API:', authError);
        return {
          success: false,
          error: `Error al actualizar la contraseña del usuario: ${authError.message}`,
        };
      }
    }

    // 4. Ejecutar actualización del perfil en base de datos
    const profileUpdateData = { 
      ...data,
      intentos_fallidos: 0,
      fecha_bloqueo: null,
    };
    delete profileUpdateData.password; // La contraseña no va en la tabla perfiles

    const res = await PerfilesRepository.updateProfile(userId, profileUpdateData);
    if (!res.success) {
      return { success: false, error: res.error };
    }

    // 5. Revalidar ruta para refrescar instantáneamente la tabla
    revalidatePath('/admin/usuarios');

    return { success: true, data: res.data };
  } catch (err) {
    console.error('Error in actualizarUsuarioAction:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Error inesperado al actualizar el usuario.',
    };
  }
}
