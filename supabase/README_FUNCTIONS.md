Instrucciones para funciones y secretos (Supabase)

- NO comites archivos que contengan claves (como `.env.local` o `supabase/functions/*/.env`).

1) Verificar localmente (serve):

```bash
# Desde la raíz del proyecto
cd supabase/functions/register-user
supabase functions serve register-user --env-file .env
```

2) Configurar el secreto (recomendado, no dejar en repo):

```bash
# Reemplaza <PROJECT_REF> si tu proyecto usa otro ref
supabase secrets set MY_SUPABASE_SERVICE_ROLE_KEY="<tu_service_role_key>"
```

3) Deploy de la función:

```bash
supabase functions deploy register-user
```

4) Si en el frontend usas `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`, asegúrate de tenerlos en `.env.local` y reinicia Next:

```bash
npm run dev
```

5) Prueba la función con curl (útil para debug):

```bash
curl -X POST "https://dokdnmdqckwrlcfkuabt.supabase.co/functions/v1/register-user" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access_token>" \
  -d '{"email":"test@example.com","password":"Temporal123!","nombre_completo":"Prueba","rol":"usuario"}'
```

Si quieres, puedo ayudarte a generar los comandos exactos para tu proyecto o guiarte paso a paso mientras los ejecutas en tu terminal.
