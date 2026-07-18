-- ============================================================================
-- SCRIPT DE CORRECCIÓN: Políticas RLS para la tabla evaluacion_servicio
-- Ejecutar este script en el SQL Editor del dashboard de Supabase
-- ============================================================================

-- 1. Eliminar políticas antiguas e incorrectas de la tabla evaluacion_servicio
DROP POLICY IF EXISTS "Permitir inserción solo al propietario del ticket" ON public.evaluacion_servicio;
DROP POLICY IF EXISTS "Usuarios pueden registrar evaluaciones para sus tickets" ON public.evaluacion_servicio;
DROP POLICY IF EXISTS "Permitir lectura de evaluaciones a usuarios autenticados" ON public.evaluacion_servicio;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.evaluacion_servicio;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.evaluacion_servicio;

-- 2. Asegurarse de que RLS está habilitado
ALTER TABLE public.evaluacion_servicio ENABLE ROW LEVEL SECURITY;

-- 3. Crear la política de INSERCIÓN corregida:
-- Permite insertar si el 'creado_por' coincide con el 'id_perfil' del usuario autenticado
-- y la incidencia fue creada por el mismo usuario
CREATE POLICY "Permitir inserción solo al creador del ticket"
ON public.evaluacion_servicio
FOR INSERT
TO authenticated
WITH CHECK (
  creado_por = (SELECT id_perfil FROM public.perfiles WHERE id_auth_supabase = auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.incidencias
    WHERE incidencias.id_incidencia = id_incidencia
      AND incidencias.creado_por = creado_por
  )
);

-- 4. Crear la política de SELECT:
-- Permite al Jefe de TI leer todas las evaluaciones (para reportes de calidad) 
-- y a los técnicos/usuarios leer las evaluaciones en las que participan
CREATE POLICY "Permitir lectura de evaluaciones"
ON public.evaluacion_servicio
FOR SELECT
TO authenticated
USING (
  -- El Jefe de TI (rol = 1) puede ver todas las evaluaciones
  EXISTS (
    SELECT 1 FROM public.perfiles
    WHERE perfiles.id_auth_supabase = auth.uid()
      AND perfiles.id_rol = 1
  )
  -- El creador de la evaluación puede verla
  OR creado_por = (SELECT id_perfil FROM public.perfiles WHERE id_auth_supabase = auth.uid())
  -- El técnico asignado a la incidencia evaluada puede verla
  OR EXISTS (
    SELECT 1 FROM public.incidencias
    WHERE incidencias.id_incidencia = id_incidencia
      AND incidencias.asignado_a = (SELECT id_perfil FROM public.perfiles WHERE id_auth_supabase = auth.uid())
  )
);
