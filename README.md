# Sistema de Gestión de Incidencias con SLA

Sistema web para la gestión de incidencias técnicas, con control de tiempos basado en Acuerdos de Nivel de Servicio (SLA). Desarrollado para la empresa Resinplast.

## 📋 Descripción

El sistema permite a los usuarios registrar incidencias, a los técnicos gestionar su cola de trabajo y a los jefes de TI supervisar el cumplimiento de los SLA. Incluye autenticación por roles (Jefe TI, Técnico, Usuario), bloqueo de cuenta por intentos fallidos y un dashboard personalizado.

## 🛠️ Tecnologías

- **Frontend:** Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Backend:** Supabase (Auth + PostgreSQL)
- **Pruebas:** Jest, React Testing Library
- **Despliegue:** Vercel
- **CI/CD:** GitHub Actions

## ⚙️ Variables de entorno

Crea un archivo `.env.local` en la raíz del proyecto con las siguientes variables:

```env
NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anon_de_supabase
Nota: Reemplaza tu_url_de_supabase y tu_clave_anon_de_supabase con los valores reales de tu proyecto en Supabase (Settings → API).

🚀 Ejecución local
Clona el repositorio:

bash
git clone https://github.com/Huallullo/sistema-incidencias-sla.git
cd sistema-incidencias-sla
Instala las dependencias:

bash
npm install
Ejecuta el servidor de desarrollo:

bash
npm run dev
Abre http://localhost:3000 para ver la aplicación.

🔐 Flujo de autenticación (Login)
El usuario ingresa su correo electrónico y contraseña en la pantalla de login.

El sistema valida las credenciales contra el servicio de Supabase Auth.

Si las credenciales son correctas, se consulta el rol del usuario en la tabla perfiles.

Según el rol obtenido (jefe_ti, tecnico o usuario), el sistema redirige al dashboard correspondiente.

Seguridad: Tras 3 intentos fallidos consecutivos, la cuenta se bloquea temporalmente durante 15 minutos. El contador de intentos se reinicia al iniciar sesión exitosamente.

## 🛡️ Políticas de Seguridad (RLS) — Tabla "perfiles"

Para resguardar la integridad y confidencialidad de la información de los usuarios, se han configurado políticas estrictas de Seguridad a Nivel de Fila (RLS) en la tabla `public.perfiles`:

1. **Lectura Restringida (SELECT)**:
   - **Nombre de la política:** `perfiles_select_own`
   - **Regla:** Cada usuario autenticado en el sistema (`authenticated`) solo puede visualizar su propio perfil.
   - **Fórmula SQL:** `USING (user_id = auth.uid())`. Esto impide que técnicos o usuarios lean perfiles ajenos.
   - **Nombre de la política (Administrador):** `perfiles_select_jefe_ti`
   - **Regla:** Permite la lectura completa de todos los perfiles únicamente a usuarios con rol `jefe_ti`. Para evitar recursión infinita en PostgreSQL, la política utiliza la función `SECURITY DEFINER` llamada `public.es_jefe_ti()`.

2. **Inserción Bloqueada desde el Cliente (INSERT)**:
   - **Regla:** **No existen políticas de inserción para usuarios normales** (ni `anon` ni `authenticated`).
   - **Justificación:** Los usuarios no pueden crear, alterar o asignarse roles directamente llamando a la API cliente de Supabase. Esto evita escalación de privilegios no autorizada.

3. **Acceso Administrativo Completo (ALL)**:
   - **Nombre de la política:** `perfiles_service_role_all`
   - **Regla:** El rol del sistema `service_role` posee permisos totales sobre la tabla (`SELECT`, `INSERT`, `UPDATE`, `DELETE`).
   - **Fórmula SQL:** `USING (true) WITH CHECK (true)`.
   - **Implementación:** La creación y asignación de perfiles se delega de forma segura a la **Edge Function backend (`register-user`)**, la cual ejecuta los inserts empleando la clave secreta de superusuario (`service_role_key`) desde un entorno seguro no expuesto al navegador.

🌐 Despliegue en producción
El proyecto está desplegado en Vercel y se actualiza automáticamente con cada push a la rama main.

🔗 URL de producción: https://sistema-incidencias-sla.vercel.app


🔄 Integración Continua (CI)
Se utiliza GitHub Actions para ejecutar automáticamente las pruebas y la compilación en cada push o pull request sobre la rama main.

Node.js: Versión 24

Comandos ejecutados:

npm install (instalación de dependencias)

npm test (ejecución de pruebas unitarias y de integración)

npm run build (verificación de la compilación)

El pipeline asegura que el código pase todas las pruebas y compile correctamente antes de ser desplegado en producción.

📁 Estructura del proyecto (carpetas principales)
text
src/
├── app/                 # Capa de presentación (páginas y componentes UI)
│   ├── login/           # Pantalla de inicio de sesión
│   ├── dashboard/       # Dashboards por rol (jefe, tecnico, usuario)
│   └── admin/           # Módulos administrativos (ej. registro de usuarios)
├── lib/                 # Capa de lógica de negocio y acceso a datos
│   ├── services/        # Servicios (AuthService, UsuarioService)
│   ├── repositories/    # Repositorios (PerfilesRepository)
│   ├── supabaseClient.ts
│   └── supabaseServer.ts
├── __tests__/           # Pruebas unitarias y de integración
└── middleware.ts        # Protección de rutas (middleware)

📊 Estado de las pruebas
Actualmente, las pruebas cubren los módulos de autenticación (HU-001), registro de usuarios (HU-002) y consulta de usuarios (HU-003), con 33 casos de prueba aprobados en 8 suites:

- `Security.test.ts` (Validación de seguridad de contraseñas)
- `AuthService.test.ts` (Lógica de autenticación Supabase)
- `Middleware.test.ts` (Protección perimetral de rutas por rol)
- `PasswordGenerator.test.ts` (Generador de contraseñas de invitación)
- `UsuariosService.test.ts` (Backend de registro de cuentas)
- `UsuariosConsult.test.tsx` (Frontend y lógica de consulta de usuarios)
- `LoginPage.test.tsx` (UI del portal de login)
- `RegisterUserPage.test.tsx` (UI del formulario de registro)

📝 Estándares de código
Lenguaje: TypeScript (tipado estático).

Formato: ESLint y Prettier para mantener la calidad y consistencia del código.

Arquitectura: Multicapas (Presentación, Lógica de Negocio, Acceso a Datos) para facilitar la mantenibilidad y escalabilidad.

Pruebas: Desarrollo guiado por pruebas (TDD) para el módulo de autenticación.

📌 Siguientes pasos
HU-002: Registro de nuevos usuarios (formulario, Edge Function y trigger en base de datos).

HU-003 en adelante: Gestión de incidencias, asignación de técnicos, control de SLA y reportes.

Desarrollado por: Huallullo Matos Abel Eduardo
Curso: Integrador II – Ingeniería de Software
Docente: Abal Mejía Jhonatan

---

## 👥 Servicio de Usuarios — Consumo de la API (`UsuariosService.getUsers`)

El módulo de consulta expone el servicio `UsuariosService` en `src/services/UsuariosService.ts` que permite buscar, filtrar y paginar los perfiles de la base de datos de Supabase.

### Método `getUsers(params)`
Obtiene una lista paginada de perfiles de usuario aplicando filtros.

| Parámetro | Tipo | Descripción | Ejemplo |
|---|---|---|---|
| `search` | `string` | Texto para búsqueda parcial (ilike) sobre nombre completo o correo. | `"Alicia"` |
| `rol` | `string` | Filtro por rol exacto (`'jefe_ti'`, `'tecnico'`, `'usuario'`, o `'todos'`). | `'tecnico'` |
| `page` | `number` | Número de página actual (1-indexed). Por defecto es `1`. | `1` |
| `limit` | `number` | Cantidad de registros devueltos por página. Por defecto es `10`. | `8` |

### Estructura de Retorno (`GetUsersResult`)
```typescript
interface GetUsersResult {
  success: boolean;       // Indica si la consulta fue exitosa
  data?: PerfilUsuario[]; // Listado de perfiles recuperados
  count?: number;         // Cantidad total absoluta que coinciden con los filtros (para paginador)
  error?: string;         // Mensaje de error en caso de fallo
}
```

### Ejemplo de Consumo en React / Next.js
```typescript
import { UsuariosService } from '@/services/UsuariosService';

async function cargarListado() {
  const resultado = await UsuariosService.getUsers({
    search: 'Gomez',
    rol: 'todos',
    page: 1,
    limit: 10
  });

  if (resultado.success && resultado.data) {
    console.log('Listado de usuarios:', resultado.data);
    console.log('Total registros:', resultado.count);
  } else {
    console.error('Error al cargar:', resultado.error);
  }
}
```