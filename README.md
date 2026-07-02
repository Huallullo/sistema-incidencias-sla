# Sistema de Gestión de Incidencias con SLA

Este es el repositorio oficial del **Sistema de Gestión de Incidencias Técnicas** con control de tiempos basado en **Acuerdos de Nivel de Servicio (SLA)** para la empresa Resinplast. La aplicación está diseñada bajo una arquitectura Full-stack estructurada en Next.js, utilizando Supabase para el aprovisionamiento de persistencia (PostgreSQL) y autenticación gestionada.

---

## 📋 1. Manual de Uso (Módulo de Inicio de Sesión)

El portal de inicio de sesión gestiona el acceso seguro al Help Desk y aplica controles preventivos de seguridad:

### 1.1 Formulario de Autenticación
1.  **Acceso:** Ingrese al sistema a través de la ruta raíz o directamente en `/login`.
2.  **Entrada de Datos:** Ingrese su correo electrónico corporativo y contraseña.
3.  **Acciones:** Presione el botón **Iniciar sesión** para procesar la autenticación.
4.  **Redirección Automática:** El sistema identificará internamente el rol asociado a su cuenta (`jefe_ti`, `tecnico` o `usuario`) y ejecutará un redireccionamiento automático hacia el panel de control correspondiente (`/dashboard`), sin requerir selecciones manuales de rol en la interfaz.

### 1.2 Reglas de Bloqueo por Fuerza Bruta
*   **Contador de Intentos:** Si introduce una contraseña incorrecta, el sistema mostrará una alerta de error y registrará el intento fallido en base de datos.
*   **Límite de Intentos:** Al alcanzar el **tercer intento fallido consecutivo**, la cuenta se bloqueará automáticamente por **15 minutos**.
*   **Temporizador Dinámico:** Al activarse el bloqueo, el formulario de inicio de sesión se deshabilitará por completo y mostrará una alerta indicando la penalización con una cuenta regresiva en tiempo real en formato `[mm:ss]` (por ejemplo: `Cuenta bloqueada. Intente nuevamente en 14:59`).
*   **Restauración:** Una vez el temporizador llegue a cero, los campos de entrada y el botón de envío se habilitarán nuevamente de forma automática.
*   **Reinicio de Intentos:** Tras completar con éxito un inicio de sesión, el contador de intentos fallidos de la cuenta se restablece a cero de forma inmediata.

### 1.3 Módulo de Registro de Usuarios (HU-002)
El módulo de administración de usuarios permite al Jefe de TI dar de alta al nuevo personal de la organización mediante un flujo seguro de invitaciones:
1.  **Acceso:** Inicie sesión como Jefe de TI y navegue a `/admin/usuarios/nuevo` o haga clic en el botón de registro de usuario en el panel.
2.  **Entrada de Datos:** Complete el formulario ingresando Nombre, Apellido, Correo corporativo, Rol (Usuario, Técnico, Jefe de TI) y campos opcionales (Área, Teléfono interno, Cargo).
3.  **Validación:** Al presionar **Registrar usuario**, se ejecutan validaciones en tiempo real (Zod) en el cliente. Si hay campos vacíos obligatorios o formatos inválidos, se mostrará una alerta.
4.  **Flujo de Invitación:** Tras pasar las validaciones, se llama a la Edge Function `register-user` que envía una invitación de Supabase Auth por correo. Al hacer clic en el enlace, el usuario es redirigido a `/reset-password` para establecer su contraseña oficial.
5.  **Creación de Perfil Automática:** Un trigger nativo en PostgreSQL intercepta la creación del usuario e inserta de forma transaccional el registro en `perfiles` y registra la bitácora en `email_logs`.

---

## ⚙️ 2. Guía de Instalación y Ejecución Local

Siga los siguientes pasos para configurar y ejecutar la aplicación en su entorno local:

### 2.1 Prerrequisitos Técnicos
*   **Node.js:** Versión LTS 24.x o superior.
*   **Gestor de Paquetes:** npm 10.x o superior.
*   **Base de Datos:** Acceso a un proyecto activo de Supabase (PostgreSQL).
*   **Herramienta CLI:** Supabase CLI (opcional, para gestión de migraciones locales).

### 2.2 Clonado del Repositorio
Clone el código fuente del proyecto e ingrese al directorio raíz:
```bash
git clone https://github.com/Huallullo/sistema-incidencias-sla.git
cd sistema-incidencias-sla
```

### 2.3 Instalación de Dependencias
Descargue e instale de forma limpia los paquetes y librerías requeridas por el proyecto:
```bash
npm install
```

### 2.4 Configuración de Variables de Entorno
Cree un archivo llamado `.env.local` en la raíz del proyecto y configure los siguientes parámetros de conexión (puede obtener estos valores desde la consola de su proyecto en Supabase en la ruta *Settings → API*):

```env
# URL del API REST de Supabase
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co

# Clave pública anónima de Supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 2.5 Configuración de la Base de Datos (PostgreSQL)
Para estructurar las tablas, relaciones y triggers requeridos para el flujo de autenticación y registro de usuarios, aplique los scripts de migración SQL en su base de datos Supabase:
1.  **Migración de Estructura Base (HU-001):** Aplique el script `20260625070000_refactor_hu01.sql` para crear las tablas `public.roles`, `public.perfiles` y `public.historial_perfiles` con sus respectivas RLS y RPC.
2.  **Migración de Sincronización Automática (HU-002):** Aplique el script `20260626120000_auth_trigger_hu02.sql` para crear la tabla `public.email_logs`, definir la función disparadora `public.handle_new_user()` y enlazar el trigger síncrono `on_auth_user_created` en la tabla `auth.users`.
3.  **Ejecución:** Puede aplicar estos archivos copiándolos al editor de consultas SQL (SQL Editor) de Supabase en la consola del proyecto, o corriendo el comando `npx supabase db push` desde la CLI vinculada a su base de datos.

### 2.6 Ejecución del Servidor de Desarrollo
Inicie el entorno local de desarrollo:
```bash
npm run dev
```
La aplicación estará disponible y activa en su navegador web en la dirección [http://localhost:3000](http://localhost:3000).

### 2.7 Ejecución de Pruebas Automatizadas
Para correr el conjunto completo de pruebas unitarias y de integración de Jest con RTL:
```bash
# Correr pruebas una sola vez
npm test

# Correr pruebas y generar el reporte detallado de cobertura (Code Coverage)
npm run test:coverage
```

---

## 🛡️ 3. Restricciones Técnicas e Integridad

El sistema implementa reglas estrictas a nivel de software y base de datos para asegurar el cumplimiento de las políticas de seguridad:

### 3.1 Restricciones de Entrada (Contrato de Datos Zod)
*   **Inicio de Sesión (loginSchema):**
    *   **Correo Electrónico:** Es requerido y debe cumplir obligatoriamente con el formato estándar de dirección de correo electrónico (`correo@dominio.com`).
    *   **Contraseñas:** Son requeridas y deben poseer una longitud mínima de **6 caracteres**.
*   **Registro de Usuarios (registerUserSchema):**
    *   **Nombre:** Requerido, no vacío y debe contener exclusivamente caracteres alfabéticos (letras).
    *   **Apellido:** Requerido, no vacío y debe contener exclusivamente caracteres alfabéticos (letras).
    *   **Correo Electrónico:** Requerido y con formato formal de dirección de email válido.
    *   **Rol:** Requerido y restringido a uno de los valores definidos en el catálogo (`jefe_ti`, `tecnico`, `usuario`).
    *   **Área, Teléfono y Cargo:** Campos auxiliares opcionales y nulables.

### 3.2 Reglas de Bloqueo Preventivo del Servidor
*   El backend intercepta cada petición de autenticación en la capa de servicios (`AuthService.signIn`).
*   Antes de delegar la validación al servicio externo (Supabase Auth), el backend consulta PostgreSQL para verificar si la cuenta posee un bloqueo vigente (fecha de bloqueo futura). Si el bloqueo está activo, la petición a Supabase es abortada de forma inmediata, mitigando el agotamiento de cuotas y bloqueando ataques de fuerza bruta directamente en el cortafuegos de la base de datos.
*   Si la cuenta se encuentra administrativamente marcada como `inactiva`, el acceso es denegado permanentemente en el backend.

### 3.3 Seguridad en la Base de Datos (Políticas RLS)
*   La tabla `public.perfiles` cuenta con Seguridad a Nivel de Fila (RLS) activada.
*   **Usuarios Generales (`authenticated`):** Solo poseen permisos para leer su propia fila mediante la política `perfiles_select_own` basada en la coincidencia del token `auth.uid() = id_auth_supabase`.
*   **Jefes de TI (`jefe_ti`):** Tienen permisos de lectura total sobre todos los registros a través de la política `perfiles_select_jefe_ti` mediante el consumo controlado de la función de seguridad con derechos de definidor `public.es_jefe_ti()`.
*   **Inserción Directa:** Queda restringida para clientes web. Los nuevos registros son creados a nivel de servidor a través de procesos autorizados con credenciales de superusuario (`service_role`).

---

## 🏛️ 4. Arquitectura del Sistema

La aplicación implementa una arquitectura multicapas que separa responsabilidades y minimiza el acoplamiento técnico entre la interfaz de usuario, los servicios de negocio y la base de datos:

```
[ Capa de Presentación ]  <--->  [ Capa de Servicios ]  <--->  [ Capa de Acceso a Datos ]  <--->  [ Capa de Persistencia ]
  Vistas en React                  Lógica de Negocio               Repositores / Servicios         Supabase / PostgreSQL
  Next.js Pages (Tailwind UI)      Validaciones (Zod Schemas)      de Datos (supabase-js)          Triggers / Edge Functions
```

### 4.1 Capas del Módulo de Autenticación (HU-001)
1.  **Capa de Presentación:** 
    *   `src/app/(auth)/login/page.tsx`: Renderiza el formulario, aplica validaciones en tiempo real con `loginSchema` de Zod, y gestiona el temporizador de bloqueo.
    *   `src/middleware.ts`: Controla el acceso perimetral a las rutas privadas.
2.  **Capa de Lógica de Negocio:**
    *   `src/services/AuthService.ts`: Orquesta el inicio de sesión, valida el bloqueo preventivo y el RPC de intentos fallidos.
3.  **Capa de Acceso a Datos (Repositores - DAL):**
    *   `src/repositories/PerfilesRepository.ts`: Consume la base de datos y ejecuta un JOIN relacional para resolver los perfiles y roles.
4.  **Capa de Persistencia:**
    *   Supabase Auth (`auth.users`) y PostgreSQL (`public.perfiles`, `public.roles`).

### 4.2 Capas del Módulo de Registro de Usuarios (HU-002)
1.  **Capa de Presentación:**
    *   `src/app/(dashboard)/admin/usuarios/nuevo/page.tsx`: Formulario de registro de usuarios que valida las entradas locales usando `registerUserSchema` de Zod y gestiona los banners informativos de éxito, carga y error.
2.  **Capa de Lógica de Negocio (Servicio):**
    *   `src/services/UsuariosService.ts`: Servicio en el cliente que invoca de forma segura a la Edge Function `register-user`.
3.  **Capa de Acceso a Datos (Backend / Edge Function):**
    *   Edge Function `register-user` (`supabase/functions/register-user/index.ts`): Ejecutada con service_role en Deno, valida perimetralmente e inicia la invitación del nuevo usuario en Supabase Auth.
4.  **Capa de Persistencia e Integración Externa:**
    *   **Disparador PostgreSQL (`on_auth_user_created`):** Trigger síncrono que inserta de forma transparente y atómica los registros del nuevo perfil en `public.perfiles` y el log en `public.email_logs` al crearse la cuenta.

---

## 🔄 5. Integración Continua y Despliegue (CI/CD)

El ciclo de desarrollo y entrega de la aplicación está automatizado mediante las siguientes herramientas:

### 5.1 Integración Continua (GitHub Actions)
Cada subida de cambios (`push`) o solicitud de integración (`pull_request`) hacia la rama principal `main` desencadena la ejecución del archivo de flujo `.github/workflows/ci.yml`. El pipeline ejecuta:
1.  Verificación sintáctica de archivos y validación del compilador de TypeScript.
2.  Ejecución completa de las 66 pruebas automatizadas de Jest y React Testing Library.
3.  Prueba de compilación de producción del proyecto (`npm run build`).

### 5.2 Despliegue Continuo (Vercel)
El código aprobado de la rama principal se despliega de forma automática en los servidores cloud de **Vercel** en la URL oficial: [https://sistema-incidencias-sla.vercel.app](https://sistema-incidencias-sla.vercel.app).

### 5.3 Regla de Gobernanza de Pase a Producción
Por políticas organizacionales de control de cambios, el pase final de código al entorno productivo requiere:
*   Aprobación exitosa de todas las pruebas y compilaciones en el pipeline de CI de GitHub Actions.
*   Validación de un mínimo del **80% de cobertura de código** (Code Coverage) en las pruebas automatizadas.
*   **Conformidad Expresa:** El **Dueño del Producto (Product Owner)** debe autorizar formalmente la fusión final después de verificar el cumplimiento del 100% de los Criterios de Aceptación funcionales de la historia de usuario en el entorno intermedio de pruebas.