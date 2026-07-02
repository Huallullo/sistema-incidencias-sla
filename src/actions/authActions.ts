'use server';

import { supabase } from '@/lib/supabaseClient';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * Sends a password reset request. Validates email exists, generates a token,
 * inserts it into database, and logs it to email_logs table.
 */
export async function sendPasswordResetAction(
  email: string,
  redirectTo: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!email || !email.trim()) {
      return { success: false, error: 'El correo electrónico es requerido' };
    }

    // 1. Validar primero si el correo existe en perfiles
    const { data: userProfile, error: profileError } = await supabase
      .from('perfiles')
      .select('id_perfil, id_auth_supabase')
      .eq('correo', email.trim())
      .maybeSingle();

    if (profileError) {
      return { success: false, error: profileError.message };
    }
    if (!userProfile) {
      return {
        success: false,
        error: 'El correo electrónico ingresado no se encuentra registrado en el sistema',
      };
    }

    // 2. Generar token y fecha de expiración (+1 hora)
    const token = crypto.randomUUID();
    const expirationDate = new Date(Date.now() + 3600 * 1000).toISOString();

    // 3. Insertar token en base de datos
    const { error: insertError } = await supabase
      .from('password_reset_tokens')
      .insert({
        token: token,
        perfil_id: userProfile.id_perfil,
        fecha_expiracion: expirationDate,
        usado: false,
      });

    if (insertError) {
      return { success: false, error: insertError.message };
    }

    // 4. Registrar en la tabla email_logs (Simulación de envío)
    const resetLink = `${redirectTo}?token=${token}`;
    const { error: logError } = await supabase
      .from('email_logs')
      .insert({
        user_id: userProfile.id_auth_supabase,
        email_destino: email.trim(),
        asunto: 'Restablecer Clave — Sistema de Incidencias SLA',
        cuerpo: `Hola,\n\nPara restablecer tu contraseña, ingresa al siguiente enlace:\n👉 ${resetLink}\n\nEste enlace expira en 1 hora.`,
        estado: 'pendiente',
      });

    if (logError) {
      return { success: false, error: logError.message };
    }

    return { success: true };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Error al procesar la solicitud';
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Verifies if a password reset token is valid (exists, not used, not expired).
 */
export async function verifyPasswordResetTokenAction(
  token: string
): Promise<{ success: boolean; data?: { perfil_id: string; id_auth_supabase: string }; error?: string }> {
  try {
    if (!token) {
      return { success: false, error: 'El token de recuperación es requerido' };
    }

    // Consultar token y hacer join con perfiles para obtener id_auth_supabase
    const { data: tokenData, error: tokenError } = await supabase
      .from('password_reset_tokens')
      .select(`
        token,
        perfil_id,
        fecha_expiracion,
        usado,
        perfiles!inner (
          id_auth_supabase
        )
      `)
      .eq('token', token)
      .maybeSingle();

    if (tokenError) {
      return { success: false, error: tokenError.message };
    }

    if (!tokenData) {
      return { success: false, error: 'El enlace de recuperación es inválido' };
    }

    if (tokenData.usado) {
      return { success: false, error: 'El enlace de recuperación ya ha sido utilizado' };
    }

    const expiration = new Date(tokenData.fecha_expiracion).getTime();
    if (expiration < Date.now()) {
      return { success: false, error: 'El enlace de recuperación ha expirado' };
    }

    const rawPerfiles: any = tokenData.perfiles;
    const idAuthSupabase = rawPerfiles?.id_auth_supabase;

    return {
      success: true,
      data: {
        perfil_id: tokenData.perfil_id,
        id_auth_supabase: idAuthSupabase,
      },
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Error al verificar el token';
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Resets the user password using a verified token. Updates the user in auth.users and marks token used.
 */
export async function resetPasswordWithTokenAction(
  token: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!newPassword || newPassword.length < 8) {
      return { success: false, error: 'La contraseña debe tener al menos 8 caracteres' };
    }

    // 1. Verificar primero si el token es válido
    const verifyResult = await verifyPasswordResetTokenAction(token);
    if (!verifyResult.success || !verifyResult.data) {
      return { success: false, error: verifyResult.error || 'Token inválido' };
    }

    const { id_auth_supabase } = verifyResult.data;

    // 2. Actualizar la contraseña en auth.users usando el cliente admin
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      id_auth_supabase,
      { password: newPassword }
    );

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    // 3. Marcar el token como usado en base de datos
    const { error: markUsedError } = await supabase
      .from('password_reset_tokens')
      .update({ usado: true })
      .eq('token', token);

    if (markUsedError) {
      return { success: false, error: markUsedError.message };
    }

    return { success: true };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Error al restablecer la contraseña';
    return {
      success: false,
      error: errorMessage,
    };
  }
}
