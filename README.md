# Sistema de Gestión de Incidencias con SLA

Este es el repositorio oficial del **Sistema de Gestión de Incidencias Técnicas** con control de tiempos basado en **Acuerdos de Nivel de Servicio (SLA)** para la empresa Resinplast. La aplicación está diseñada bajo una arquitectura Full-stack estructurada en Next.js, utilizando Supabase para el aprovisionamiento de persistencia (PostgreSQL) y autenticación gestionada.

---

## 📋 1. Manual de Uso

### 1.1 Formulario de Autenticación
1.  **Acceso:** Ingrese al sistema a través de la ruta raíz o directamente en `/login`.
2.  **Entrada de Datos:** Ingrese su correo electrónico corporativo y contraseña.
3.  **Acciones:** Presione el botón **Iniciar sesión** para procesar la autenticación.
4.  **Redirección Automática:** El sistema identificará el rol asociado (`jefe_ti`, `tecnico` o `usuario`) y redirigirá automáticamente al panel correspondiente (`/dashboard`).

### 1.2 Reglas de Bloqueo por Fuerza Bruta
*   **Límite de Intentos:** Al alcanzar el **tercer intento fallido consecutivo**, la cuenta se bloqueará automáticamente por **15 minutos**.
*   **Temporizador Dinámico:** El formulario se deshabilita y muestra una cuenta regresiva en tiempo real en formato `[mm:ss]`.

### 1.3 Módulo de Registro de Usuarios (HU-002)
*   **Invitación Segura:** Permite al Jefe de TI dar de alta personal desde `/admin/usuarios/nuevo`. Se envía un correo de invitación a través de una Edge Function y el usuario establece su contraseña en `/reset-password`.

### 1.4 Módulo de Base de Conocimiento (HU-011)
*   **Acceso y Filtros:** Todos los roles autenticados pueden ingresar a `/dashboard/conocimiento` para consultar artículos de solución técnica.
*   **Búsqueda en Tiempo Real:** Cuenta con buscador de coincidencia difusa (con debounce de 300 ms) y selector por categorías.
*   **Lectura de Detalle:** El clic en una tarjeta despliega un modal centrado con los síntomas descritos y los pasos detallados de la solución.

### 1.5 Módulo de Inventario de Hardware (HU-012)
*   **Privilegio Exclusivo:** Solo el Jefe de TI (`id_rol = 1`) puede registrar nuevos equipos desde `/admin/equipos`.
*   **Registro Físico:** Permite registrar equipos ingresando código, serie, nombre, tipo, marca, modelo, ubicación y estado operativo.
*   **Grilla de Activos:** Presenta los equipos con badges de color dinámico según su estado (verde: Operativo, amarillo: En Mantenimiento, rojo: Inoperativo).

### 1.6 Consulta de Equipos Informáticos (HU-013)
*   **Acceso Público-Autenticado:** Todos los roles autenticados (Jefe de TI, Técnico, y Usuario) pueden acceder a `/dashboard/equipos` para consultar el inventario de hardware.
*   **Filtros Avanzados:** Ofrece un buscador interactivo por texto (código patrimonial, nombre, serie) y selectores por tipo de equipo, ubicación física y estado operativo.
*   **Ficha Técnica y Tickets:** Al hacer clic en un equipo, se abre un modal que muestra las especificaciones técnicas del activo y lista de forma cronológica su historial completo de incidencias técnicas (tickets de fallas reportados).

---

## ⚙️ 2. Guía de Instalación y Ejecución Local

### 2.1 Prerrequisitos Técnicos
*   **Node.js:** Versión LTS 24.x o superior.
*   **Gestor de Paquetes:** npm 10.x o superior.
*   **Base de Datos:** Acceso a un proyecto activo de Supabase (PostgreSQL).

### 2.2 Clonado del Repositorio
```bash
git clone https://github.com/Huallullo/sistema-incidencias-sla.git
cd sistema-incidencias-sla
```

### 2.3 Instalación de Dependencias
```bash
npm install
```

### 2.4 Configuración de Variables de Entorno
Cree un archivo `.env.local` en la raíz del proyecto:
```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
MY_SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 2.5 Configuración de la Base de Datos (PostgreSQL)
Aplique los scripts de migración SQL en el Editor de SQL de Supabase en el siguiente orden:
1.  **Migración Base (HU-001/HU-002):** Estructura básica de perfiles y sincronización automática.
2.  **Migración de Base de Conocimiento (HU-010):** Creación de la tabla `articulos_conocimiento`, RLS y triggers de fecha.
3.  **Migración de Inventario de Equipos (HU-012):** Ejecute el script `Script_DDL_HU012.sql` para crear la tabla `equipos_informaticos`, añadir la clave foránea `id_equipo` a `incidencias` y configurar las restricciones de unicidad y RLS correspondientes.

### 2.6 Ejecución del Servidor
```bash
npm run dev
```
Acceda en [http://localhost:3000](http://localhost:3000).

### 2.7 Pruebas Automatizadas
```bash
npm test
npm run test:coverage
```

---

## 🛡️ 3. Restricciones Técnicas e Integridad

### 3.1 Restricciones de Entrada (Zod)
*   **registroArticuloSchema (HU-010):** Título (mín 10, máx 150), descripción (mín 20), pasos (mín 20), categoría válida.
*   **registroEquipoSchema (HU-012):** Código de inventario obligatorio (alfanumérico y guiones, máx 50), número de serie (máx 100), nombre, marca, modelo, ubicación, y estado operativo.

### 3.2 Seguridad en la Base de Datos (RLS)
*   **articulos_conocimiento:** Lectura permitida a todo usuario autenticado. Inserción/Edición restringida a Técnicos e Ingenieros/Jefes de TI.
*   **equipos_informaticos:** Lectura abierta a usuarios autenticados para asociar equipos a tickets de incidentes. Escritura y edición permitida exclusivamente al rol Jefe de TI (`id_rol = 1`).

---

## 🏛️ 4. Arquitectura del Sistema

La aplicación está estructurada bajo una arquitectura Next.js 15 en 3 capas (Presentación, Servicios de Negocio, Acceso a Datos), desacoplando la persistencia de la interfaz:

```
[ Capa de Presentación ]  <--->  [ Capa de Servicios ]  <--->  [ Capa de Acceso a Datos ]  <--->  [ Capa de Persistencia ]
  Vistas en React                  Lógica de Negocio               Repositores / Servicios         Supabase / PostgreSQL
  Next.js Pages (Tailwind UI)      Validaciones (Zod Schemas)      de Datos (supabase-js)          Triggers / RLS
```

### 4.1 Módulo de Base de Conocimiento (HU-011)
*   **Presentación:** Componente React Client en `src/app/(dashboard)/dashboard/conocimiento/page.tsx` con buscador, debounce y modal de detalle en memoria.
*   **Servicio:** `ConocimientoService.ts` administra validaciones de negocio.
*   **Acceso a Datos:** `ArticuloConocimientoRepository.ts` recupera artículos realizando LEFT JOIN con perfiles y tickets.

### 4.2 Módulo de Inventario de Hardware (HU-012)
*   **Presentación:** Componente React Client en `src/app/(dashboard)/admin/equipos/page.tsx` que maneja el formulario de registro y la grilla.
*   **Servicio:** `EquiposService.ts` valida el privilegio del Jefe de TI y la duplicidad de llaves.
*   **Acceso a Datos:** `EquiposRepository.ts` administra la comunicación de inserción y búsquedas.

### 4.3 Módulo de Consulta de Hardware (HU-013)
*   **Presentación:** Vista en React Client en `src/app/(dashboard)/dashboard/equipos/page.tsx` con grilla interactiva, selectores de filtrado y modal de ficha detallada con listado histórico de incidencias.
*   **Servicio:** `EquiposService.ts` añade el método `obtenerDetalleEquipo` para canalizar solicitudes del frontend.
*   **Acceso a Datos:** `EquiposRepository.ts` implementa consultas optimizadas en base de datos con filtros condicionales y un método `getEquipmentDetails` que carga de forma anidada (LEFT JOIN) las incidencias relacionadas.

---

## 🔄 5. Integración Continua y Despliegue (CI/CD)

*   **GitHub Actions:** El pipeline verifica linting, tipos estáticos de TypeScript, compila la build e inicia la ejecución de las suites de pruebas automatizadas (con reporte de cobertura de código Jest).
*   **Vercel:** Despliegue serverless continuo y automático de las ramas integradas a `main`.