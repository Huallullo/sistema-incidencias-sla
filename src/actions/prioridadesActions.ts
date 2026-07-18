'use server';

import { AuthService } from '@/services/AuthService';
import { PrioridadesService } from '@/services/PrioridadesService';
import { PrioridadInput, PrioridadServicio } from '@/types/prioridadServicio';

import { revalidatePath } from 'next/cache';

/**
 * Server Action: Registrar una nueva prioridad de servicio SLA
 * Solo accesible para el rol Jefe de TI
 */
export async function registrarPrioridadAction(
  input: PrioridadInput
): Promise<{ success: boolean; data?: PrioridadServicio; error?: string }> {
  try {
    const session = await AuthService.getSession();
    if (!session?.user?.id) {
      return { success: false, error: 'Sesión no válida. Por favor inicie sesión nuevamente.' };
    }

    const res = await PrioridadesService.registrarPrioridad(input, session.user.id);
    if (res.success) {
      revalidatePath('/admin/prioridades-sla');
    }
    return res;
  } catch (err) {
    console.error('Exception in registrarPrioridadAction:', err);
    return { success: false, error: 'Error inesperado en el servidor.' };
  }
}

/**
 * Server Action: Obtener todas las prioridades registradas
 */
export async function obtenerPrioridadesAction(): Promise<{
  success: boolean;
  data?: PrioridadServicio[];
  error?: string;
}> {
  try {
    const session = await AuthService.getSession();
    if (!session?.user?.id) {
      return { success: false, error: 'Sesión no válida.' };
    }

    return await PrioridadesService.obtenerPrioridades();
  } catch (err) {
    console.error('Exception in obtenerPrioridadesAction:', err);
    return { success: false, error: 'Error inesperado al obtener prioridades.' };
  }
}
