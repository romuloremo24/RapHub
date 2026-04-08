---
name: mega-prompt-generator
description: >
  Generates production-ready mega-prompts for Claudio (Claude Code) following UnionX's 8-section
  standard for platform code (Next.js 15 / TypeScript / Prisma / Supabase). Use this skill whenever
  the user asks to create a prompt, task, mission, or specification for Claudio, or when they say
  "hazme un prompt para Claudio", "prepara una misión nocturna", "crea un mega-prompt", "necesito
  que Claudio haga X", "manda esto a Claudio", or any variation implying autonomous code execution.
  Also trigger when the user describes a feature, module, fix, page, dashboard, UI component, or
  integration that needs to be implemented as part of the UnionX Platform (app.unionx.cl) — even
  if they don't mention Claudio explicitly. If the task is a background automation without UI
  (webhook, cron, data sync), use n8n-workflow-generator instead. If the task has BOTH a UI
  AND a background process, generate TWO separate prompts — one per skill.
---

# Mega-Prompt Generator for Claudio — Platform Code

## Purpose

Transform any feature request into a self-contained mega-prompt that Claudio
(Claude Code in VS Code/WSL2) can execute autonomously in ONE session without
asking questions. Output must be copy-paste ready.

## Why This Matters

Claudio works autonomously (often at night). Every ambiguity = wrong assumption.
Every missing path = file in wrong place. Every vague criterion = feature that
"works" but doesn't match. This skill eliminates those failure modes.

---

## The 8-Section Standard

Every mega-prompt MUST contain these 8 sections in this exact order.

### Section 1: Header + Business Context

```markdown
# [TÍTULO DESCRIPTIVO EN MAYÚSCULAS]
# Para: Claudio (Claude Code)
# De: Martín (vía arquitecto)
# Fecha: [DD/MM/YYYY]
# Prioridad: [P0-Crítica | P1-Alta | P2-Media | P3-Baja]
# Tiempo estimado: [X bloques]

## CONTEXTO DE NEGOCIO
[2-4 párrafos: POR QUÉ se necesita. Impacto en revenue, horas ahorradas,
riesgo si no se hace. Claudio toma mejores decisiones con contexto.]
```

### Section 2: Pre-Flight Checklist

```markdown
## PRE-VUELO OBLIGATORIO

1. Lee CLAUDE.md, docs/decisions.md, docs/USABILITY_STANDARDS.md
2. Lee CODE_INDEX.md y existing-automations.md
3. Busca si ya existe algo similar:
   - `grep -r "[keyword]" src/ --include="*.ts" --include="*.tsx" -l`
   - `grep -r "[keyword]" src/app/api/ -l`
   - Revisa sidebar navigation en layout.tsx
4. Si encuentras algo existente → EXTIENDE, no dupliques
5. Verifica dependencias: `cat package.json | grep "[dep]"`
6. Resume tu plan en 3 líneas antes de ejecutar
7. Si impacto medio/alto → espera OK de Martín
```

### Section 3: Existing Reference Paths

```markdown
## PATHS DE REFERENCIA

| Qué | Path | Para qué |
|-----|------|----------|
| Layout principal | src/app/(dashboard)/layout.tsx | Sidebar/breadcrumbs |
| API Odoo existente | src/app/api/odoo/[endpoint]/route.ts | Patrón XML-RPC |
| Componente tabla | src/components/ui/data-table.tsx | Reusar |
| Types compartidos | src/types/[domain].ts | Extender interfaces |
| [módulo similar] | src/app/(dashboard)/[area]/[modulo]/ | Copiar estructura |
```

Always include the MOST SIMILAR existing module as reference.

### Section 4: Architecture Diagram

```markdown
## ARQUITECTURA

Browser → Next.js Page (🆕) → API Route (🆕) → Odoo XML-RPC (✅)
                                    ↓
                              Supabase (🆕 tabla)
                                    ↓
                              Recharts Dashboard (🆕)

✅ = ya existe    🆕 = crear nuevo
```

### Section 5: Implementation Blocks

```markdown
## BLOQUES DE IMPLEMENTACIÓN

### BLOQUE 1: [Nombre]
- **QUÉ**: [Descripción concreta]
- **DÓNDE**: [Paths exactos]
  - `src/app/(dashboard)/[area]/[modulo]/page.tsx` (🆕)
  - `src/app/api/[endpoint]/route.ts` (🆕)
- **CÓMO SE VE LISTO**:
  - [ ] Página carga sin errores
  - [ ] Datos en tabla con sorting/filtering
  - [ ] KPI con formato CLP correcto
  - [ ] Skeleton mientras carga
  - [ ] Empty state si no hay datos
- **PATRÓN A SEGUIR**: `src/app/(dashboard)/comercial/reporteria/`
- **DATOS**: Odoo model `[model]` via XML-RPC

### ENTRE BLOQUES:
npm run build → si falla, ARREGLAR antes de continuar.
```

### Section 6: Real Data vs Mock

```markdown
## DATOS REALES vs MOCK

| Dato | Fuente | Estado | Fallback |
|------|--------|--------|----------|
| Stock | Odoo stock.quant | ✅ Conectar | — |
| Precios comp. | n8n workflow | ❌ No existe | Mock + badge "⚡ Datos estimados" |
```

### Section 7: Dependencies & Constraints

```markdown
## DEPENDENCIAS Y RESTRICCIONES

### Restricciones inquebrantables:
- CLP: $1.250.000 (punto de miles). USD: US$1,250.00
- Fechas: DD/MM/YYYY. Timezone: America/Santiago
- NO borrar funcionalidad existente
- NO crear modelos Prisma sin OK de Martín
- NO modificar .env, schema.prisma, package.json sin pre-vuelo
- Precios NUNCA automáticos → siempre aprobación CEO
- Odoo XML-RPC: SIEMPRE limit explícito (default = 100 records)
```

### Section 8: Build, Test & Commit

```markdown
## CIERRE OBLIGATORIO

1. npm run build → 0 errores
2. Sidebar muestra nuevo módulo, breadcrumbs ok, Cmd+K lo encuentra
3. Responsive (mobile)
4. git add -A && git commit -m "[area]: [desc]" && git push
5. Actualizar CODE_INDEX.md, CHANGELOG, api-registry.md
```

---

## Generation Process

1. **Entender** qué feature/fix quiere Martín
2. **Buscar contexto**: project files, memorias, conversaciones pasadas
3. **Identificar módulo más similar** ya construido → template estructural
4. **Determinar datos**: ¿Odoo real? ¿n8n? ¿Mock?
5. **Estimar complejidad**: ¿Cuántos bloques? ¿Cabe en 1 sesión?
6. **Generar** las 8 secciones completas
7. **Self-review**:
   - [ ] Cada bloque tiene QUÉ + DÓNDE + CÓMO SE VE LISTO + PATRÓN
   - [ ] Cero instrucciones vagas
   - [ ] Todos los paths explícitos
   - [ ] Real vs mock especificado
   - [ ] Formatos Chile mencionados
   - [ ] Build check entre bloques
   - [ ] Commit message format

---

## Rules for Block Design

- **Máximo 3 bloques por sesión** — calidad degrada después de 3 heavy blocks
- **Cada bloque = 1 unidad testeable** — "API + Page + Components para módulo X" = ✅
  "Todas las APIs de 5 módulos" = ❌
- **Prioridad si no alcanza** — especificar P0 vs P1 por bloque
- **Nunca dividir un módulo entre sesiones** — 1 módulo = 1 mega-prompt

---

## Anti-Patterns

| Anti-Pattern | Ejemplo | Fix |
|-------------|---------|-----|
| Acceptance vaga | "Que se vea bien" | "Tabla con sorting, filtros marca/canal, skeleton" |
| Paths ausentes | "Crea los archivos" | "Crear src/app/(dashboard)/ops/planner/page.tsx" |
| Conocimiento implícito | "Conéctalo a Odoo" | "stock.quant via XML-RPC, fields: qty_available" |
| Scope creep | "Y de paso mejora sidebar" | Mega-prompt separado |
| Sin fallback | "Conectar a API ML" | "Si no responde → mock + badge ⚡" |
| Muro de texto | 2000 palabras por bloque | Max 15 líneas, bullets |
| Import incorrecto | `import { m } from "motion/react"` | `from "motion/react-m"` |
| ExcelJS en client | Importar ExcelJS en componente | Server-side only (+1MB bundle) |
| Odoo sin limit | `search_read` sin limit | SIEMPRE limit explícito |
| Tabla nueva sin RLS | CREATE TABLE sin tenant_id | RLS + tenant_id obligatorio |

---

## Output Format

1. Markdown code block copy-paste directo
2. Sin preámbulo — empieza con `# TÍTULO`
3. Sin explicaciones después — autocontenido
4. Contexto para Martín (no Claudio) va ANTES del code block

---

## REFERENCIA TÉCNICA: Estructura de Módulos

### Anatomía de un módulo en la plataforma

```
src/app/(dashboard)/{area}/{modulo}/
├── page.tsx                    # Server Component por default
├── layout.tsx                  # Breadcrumbs + metadata
├── loading.tsx                 # Skeleton (Suspense boundary)
├── error.tsx                   # Error boundary
├── _components/                # Componentes específicos del módulo
│   ├── {modulo}-table.tsx      # Client Component (interactividad)
│   ├── {modulo}-form.tsx
│   ├── {modulo}-filters.tsx
│   ├── {modulo}-stats.tsx      # KPI cards
│   └── {modulo}-sheet.tsx      # Panel deslizante (Sheet de shadcn)
├── _actions/
│   └── {modulo}.actions.ts     # Server Actions (mutations)
└── [id]/
    └── page.tsx                # Detalle individual
```

### Las 6 áreas y sus paths

| Área | Path base | Módulos existentes |
|------|-----------|-------------------|
| Comercial | /comercial/ | reporteria, marcas, catalogo, marketing, ventas, marketplaces |
| RRHH | /rrhh/ | (construido fase 3) |
| Finanzas | /finanzas/ | (construido fase 3) |
| Operaciones | /operaciones/ | (en progreso) |
| Post-Venta | /post-venta/ | (pendiente Chatwoot real) |
| Sistema | /sistema/ | automatizaciones, apis, monitoreo, integraciones, skills |

---

## REFERENCIA TÉCNICA: Server vs Client Components

### Decision Tree

| Señal | Server Component | Client Component |
|-------|-----------------|------------------|
| Fetch data | ✅ async/await directo | ❌ Necesita useQuery |
| Interactividad (click, hover) | ❌ | ✅ "use client" |
| useState / useEffect | ❌ | ✅ |
| Formularios con validación | ❌ | ✅ |
| Tablas con sorting/filtering | ❌ | ✅ |
| KPI cards estáticos | ✅ | ❌ |
| Gráficos Recharts | ❌ | ✅ (Recharts es client) |
| SEO / metadata | ✅ | ❌ |

### Patrón correcto: Server fetches, Client renders

```typescript
// page.tsx (SERVER — NO "use client")
import { ModuleTable } from "./_components/module-table";

export default async function ModulePage() {
  const data = await fetch("/api/odoo/module", { next: { revalidate: 300 } });
  const items = await data.json();
  return <ModuleTable data={items} />;
}

// _components/module-table.tsx (CLIENT — interactividad)
"use client";
import { useState } from "react";
import { DataTable } from "@/components/ui/data-table";

export function ModuleTable({ data }: { data: Item[] }) {
  const [filter, setFilter] = useState("");
  // ... sorting, filtering, interactividad
}
```

---

## REFERENCIA TÉCNICA: API Routes (Odoo)

### Patrón estándar para API route que consulta Odoo

```typescript
// src/app/api/odoo/[module]/route.ts
import { NextResponse } from "next/server";
import xmlrpc from "xmlrpc";

const ODOO_URL = process.env.ODOO_URL!;       // innovatek.odoo.com
const ODOO_DB = process.env.ODOO_DB!;
const ODOO_USER = process.env.ODOO_USER!;
const ODOO_KEY = process.env.ODOO_API_KEY!;

export async function GET(request: Request) {
  try {
    const client = xmlrpc.createSecureClient({
      host: ODOO_URL, port: 443, path: "/xmlrpc/2/object"
    });

    const result = await new Promise((resolve, reject) => {
      client.methodCall("execute_kw", [
        ODOO_DB, 2, ODOO_KEY,  // uid=2 (admin)
        "sale.order", "search_read",
        [[["state", "=", "sale"]]],
        {
          fields: ["name", "date_order", "amount_total", "partner_id"],
          limit: 500,           // ← SIEMPRE explícito
          offset: 0,
          order: "id desc"
        }
      ], (err, val) => err ? reject(err) : resolve(val));
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Odoo API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch from Odoo" },
      { status: 500 }
    );
  }
}
```

### Errores comunes Odoo en API Routes

- **Sin limit** → solo retorna 100 records (BUG SILENCIOSO)
- **Timeout** → Vercel default 300s, activar Fluid Compute para 800s
- **Fields vacíos** → retorna TODOS los campos, respuesta enorme
- **uid hardcoded** → autenticar primero con xmlrpc/2/common si necesario

---

## REFERENCIA TÉCNICA: shadcn/ui Components

### Componentes más usados en la plataforma

| Componente | Cuándo usar | Import |
|------------|-------------|--------|
| DataTable | Tablas con sorting/filtering/pagination | `@/components/ui/data-table` |
| Card + CardHeader + CardContent | KPI cards, stat cards | `@/components/ui/card` |
| Tabs + TabsList + TabsTrigger + TabsContent | Sub-secciones de módulo | `@/components/ui/tabs` |
| Sheet + SheetContent | Panel deslizante lateral (detalle SKU) | `@/components/ui/sheet` |
| Dialog | Modales de confirmación/formulario | `@/components/ui/dialog` |
| Select | Dropdowns de filtro | `@/components/ui/select` |
| Badge | Estados, tags, "⚡ Datos estimados" | `@/components/ui/badge` |
| Skeleton | Loading states | `@/components/ui/skeleton` |
| Button | Acciones | `@/components/ui/button` |
| Input | Formularios | `@/components/ui/input` |
| Sonner/toast | Notificaciones | `sonner` |
| Command (cmdk) | Command palette Cmd+K | `@/components/ui/command` |

### Patrón de KPI Cards con tendencia

```tsx
<Card>
  <CardHeader className="flex flex-row items-center justify-between pb-2">
    <CardTitle className="text-sm font-medium text-muted-foreground">
      Ventas del Mes
    </CardTitle>
    <DollarSign className="h-4 w-4 text-muted-foreground" />
  </CardHeader>
  <CardContent>
    <div className="text-2xl font-bold">$125.450.000</div>
    <p className="text-xs text-green-600">↑ 12.3% vs mes anterior</p>
  </CardContent>
</Card>
```

### Patrón de Empty State

```tsx
<div className="flex flex-col items-center justify-center py-12 text-center">
  <Package className="h-12 w-12 text-muted-foreground/50 mb-4" />
  <h3 className="text-lg font-medium">No hay datos</h3>
  <p className="text-sm text-muted-foreground mt-1">
    Los datos aparecerán cuando se conecte a Odoo
  </p>
  <Button variant="outline" className="mt-4">Conectar ahora</Button>
</div>
```

---

## REFERENCIA TÉCNICA: Data Fetching

### TanStack Query (Client Components)

```typescript
"use client";
import { useQuery } from "@tanstack/react-query";

export function useOdooData(endpoint: string) {
  return useQuery({
    queryKey: ["odoo", endpoint],
    queryFn: async () => {
      const res = await fetch(`/api/odoo/${endpoint}`);
      if (!res.ok) throw new Error("Fetch failed");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,     // 5 min antes de refetch
    refetchInterval: 60 * 1000,    // Auto-refresh cada 60s (para monitoreo)
  });
}

// En el componente:
const { data, isLoading, error } = useOdooData("products");
if (isLoading) return <Skeleton />;
if (error) return <ErrorState />;
```

### Server Actions (Mutations)

```typescript
// _actions/module.actions.ts
"use server";
import { revalidatePath } from "next/cache";

export async function updatePrice(formData: FormData) {
  const sku = formData.get("sku") as string;
  const price = Number(formData.get("price"));

  // NUNCA cambiar precio automáticamente
  // Guardar como "sugerencia pendiente" en Supabase
  await supabase.from("price_suggestions").insert({
    sku, suggested_price: price, status: "pending", created_by: "system"
  });

  revalidatePath("/comercial/pricing");
  return { success: true };
}
```

---

## REFERENCIA TÉCNICA: Supabase Patterns

### RLS obligatorio para toda tabla nueva

```sql
-- SIEMPRE agregar tenant_id y RLS
CREATE TABLE nueva_tabla (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  -- ... campos ...
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_nueva_tabla_tenant ON nueva_tabla(tenant_id, id);
ALTER TABLE nueva_tabla ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON nueva_tabla
  USING (tenant_id = auth.jwt() ->> 'tenant_id');
```

### Client usage

```typescript
import { createClient } from "@/lib/supabase/client"; // o /server

const supabase = createClient();

// Read
const { data, error } = await supabase
  .from("table")
  .select("*")
  .eq("status", "active")
  .order("created_at", { ascending: false })
  .limit(100);

// Write
const { error } = await supabase
  .from("table")
  .insert({ field: "value", tenant_id: tenantId });
```

---

## REFERENCIA TÉCNICA: Imports y Gotchas

### Imports que Claudio confunde frecuentemente

```typescript
// ✅ CORRECTO
import { m } from "motion/react-m";     // NO "motion/react"
import { toast } from "sonner";          // NO "react-hot-toast"
import { useQuery } from "@tanstack/react-query";

// ❌ INCORRECTO — estos causan build errors
import { motion } from "framer-motion";  // Paquete viejo
import { m } from "motion/react";        // Path incorrecto
```

### Gotchas conocidos

- **ExcelJS** → Server-side only (agrega +1MB al client bundle)
- **Tremor** → Ahora es free (adquirido por Vercel), pero NO lo usamos
- **View Transitions** → Solo SPA baseline (Firefox no soporta cross-document)
- **Vercel timeout** → Default 300s, necesita Fluid Compute explícito para 800s
- **Recharts** → Client Component siempre ("use client")
- **cmdk** → Ya integrado en shadcn Command component
- **Prisma** → NO crear/modificar schema.prisma sin OK de Martín
- **Tailwind v4** → Sintaxis nueva, no v3

---

## REFERENCIA TÉCNICA: Formatos Chile

```typescript
// CLP
new Intl.NumberFormat('es-CL', {
  style: 'currency', currency: 'CLP', maximumFractionDigits: 0
}).format(1250000);  // "$1.250.000"

// USD
new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD'
}).format(1250.50);  // "$1,250.50" → prefijo manual "US$1,250.50"

// Fechas
new Intl.DateTimeFormat('es-CL', {
  day: '2-digit', month: '2-digit', year: 'numeric',
  timeZone: 'America/Santiago'
}).format(new Date());  // "27/03/2026"

// Porcentajes
new Intl.NumberFormat('es-CL', {
  style: 'percent', minimumFractionDigits: 1
}).format(0.123);  // "12,3%"
```

---

## Quick Reference: Stack Completo

| Capa | Tecnología | Nota |
|------|-----------|------|
| Framework | Next.js 15 App Router + TypeScript strict | |
| ORM | Prisma 7 | NO modificar schema sin OK |
| DB | Supabase (sa-east-1, phjaugjqosxnxcgkbhht) | RLS obligatorio |
| UI | shadcn/ui + Tailwind v4 + cmdk + lucide-react | |
| Charts | Recharts | Client Component |
| Animations | motion/react-m | `import { m } from "motion/react-m"` |
| AI | Vercel AI SDK 6 + Claude API | |
| Data fetching | TanStack Query (client) + Server Components | |
| Mutations | Server Actions | |
| Notifications | Sonner | |
| ERP | Odoo 18 XML-RPC (innovatek.odoo.com) | LIMIT explícito |
| Deploy | Vercel (app.unionx.cl) | Fluid Compute 800s |
| Git | github.com/martinnovoa22/unionx-app | |
| Local | C:\Users\Martin\Desktop\unionx-app (WSL2) | |

## Quick Reference: Odoo Models

| Model | Key Fields | Uso |
|-------|-----------|-----|
| product.product | name, default_code, standard_price, categ_id | Productos |
| stock.quant | product_id, qty_available, reserved_quantity | Stock |
| sale.order | name, date_order, amount_total, state, partner_id | Ventas |
| sale.order.line | product_id, product_uom_qty, price_unit | Líneas venta |
| purchase.order | name, date_order, amount_total, state | Compras |
| purchase.order.line | product_id, product_qty, price_unit | Líneas compra |
| account.move | name, move_type, amount_total, invoice_date | Facturas/DTE |
| res.partner | name, email, phone, vat, country_id | Contactos |
| product.supplierinfo | partner_id, price, delay (lead time) | Proveedores |

## Quick Reference: Estado Actual Plataforma

- **~78+ páginas** construidas
- **106+ API routes** (23 conectadas a Odoo)
- **27+ modelos Prisma**
- **Fases 0-3 completadas**, Fase 4 en progreso
- **Módulos pendientes**: Planner, Pricing, OpenClaw Mission Control,
  Settings completo, Listings Health, Conciliación MP, Costos IA, Auth real
