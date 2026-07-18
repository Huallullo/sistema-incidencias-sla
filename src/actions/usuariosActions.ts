'use server';

import { revalidatePath } from 'next/cache';
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

    // 3. Ejecutar actualización
    const res = await PerfilesRepository.updateProfile(userId, data);
    if (!res.success) {
      return { success: false, error: res.error };
    }

    // 4. Revalidar ruta para refrescar instantáneamente la tabla
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
