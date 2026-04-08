---
name: n8n-workflow-generator
description: >
  Generates production-ready mega-prompts for Claudio to build n8n workflows on UnionX's self-hosted
  instance (n8nwebhook.grupoeter.cl, ~200 workflows, 178 active). Use this skill whenever the task
  involves n8n workflows, automations, webhooks, scheduled tasks, data sync between systems, or
  integrations that run as background processes. Trigger phrases: "crear un workflow", "automatización",
  "webhook para X", "cron que haga Y", "conectar X con Y", "sincronizar datos", "alerta automática",
  "notificación cuando...", "workflow de Silvestre/Max/Sofia/Vale/cualquier agente", "proxy n8n",
  or any request involving Odoo, MercadoLibre, Shopify, Chatwoot, Telegram, WhatsApp, Meta Ads,
  Google Ads, Supabase, or Fintoc without a UI component. If the task is a platform UI feature
  (Next.js page), use mega-prompt-generator instead. If the task has BOTH a UI AND a background
  workflow, generate TWO separate prompts — one per skill.
---

# n8n Workflow Generator for Claudio

## Purpose

Transform any automation request into a self-contained mega-prompt that Claudio
can execute to build, test, and activate n8n workflows on UnionX's self-hosted
instance. The output must be copy-paste ready for Claude Code.

## Why n8n Is NOT Code

n8n workflows are visual node-based automations, not TypeScript. The failure
modes are completely different from platform code:

- No `npm run build` — a workflow either runs or errors at a specific node
- No file paths — workflows live in n8n's database, identified by ID
- No git — workflows export as JSON, versioned manually
- Testing = triggering the webhook or cron manually
- Errors are SILENT unless you add explicit error handling
- Rate limits and API quotas are the primary constraint
- Credentials live in n8n UI, not in .env files
- Odoo returns HTTP 200 even on errors — must check response.error in body
- MercadoLibre webhooks require response within 500ms or delivery fails

---

## The 8 Sections (Adapted for n8n)

Every n8n mega-prompt MUST contain these 8 sections.

### Section 1: Header + Business Context

```markdown
# [TÍTULO DEL WORKFLOW EN MAYÚSCULAS]
# Para: Claudio (Claude Code)
# De: Martín (vía arquitecto)
# Fecha: [DD/MM/YYYY]
# Prioridad: [P0-Crítica | P1-Alta | P2-Media | P3-Baja]
# Tipo: n8n Workflow
# Tag n8n: [UNIONX-OPS | OPENCLAW | ODOO | COMERCIAL | FINANZAS | SISTEMA]

## CONTEXTO DE NEGOCIO
[POR QUÉ se necesita. Horas/semana que ahorra. Qué error humano previene.
Qué pasa si falla — impacto en operación. Revenue en riesgo.]
```

### Section 2: Pre-Flight Checklist

```markdown
## PRE-VUELO OBLIGATORIO

1. Lee existing-automations.md — verificar que no exista un workflow similar
2. Conectar al n8n MCP y listar workflows activos:
   - Buscar por tag: [TAG_RELEVANTE]
   - Buscar por nombre con keywords
3. Si existe algo similar → MODIFICAR, no crear duplicado
4. Verificar credenciales disponibles en n8n:
   - ¿Existe credencial de [servicio]?
   - Si no existe → documentar qué crear manualmente
5. Verificar webhook URLs existentes para no colisionar
6. Plan en 3 líneas antes de ejecutar
7. Si el workflow ESCRIBE datos (no solo lee) → espera OK de Martín
```

### Section 3: Existing References

```markdown
## REFERENCIAS EXISTENTES

| Qué | ID/Nombre en n8n | Para qué |
|-----|-------------------|----------|
| [Workflow similar] | ID: [xxx] | Copiar patrón |
| [Proxy de agente] | Webhook: /[path] | Reusar endpoint |
| [Credencial] | "[nombre]" | Ya configurada |

### Webhook URLs ya en uso (NO reutilizar):
- /webhook/silvestre-meta
- /webhook/silvestre-google-ads
- /webhook/silvestre-ml
- /webhook/silvestre-shopify
- /webhook/silvestre-odoo
- /webhook/silvestre-google-analytics
- /webhook/silvestre-drive
- /webhook/silvestre-meta-image
- /webhook/silvestre-meta-upload
- /webhook/silvestre-image-download
- /webhook/silvestre-google-merchant
- /webhook/vale-fal
- /webhook/max-[9 proxies]
- /webhook/mateo-gmail (workflow RtI9X8DOEpXulqJB)
```

### Section 4: Workflow Flow Diagram

```markdown
## FLUJO DEL WORKFLOW

[Trigger] → [Node 1] → [Node 2] → ... → [Output]
    │                       │
    │                   [Branch]
    │                   ├─ Yes → [Node A]
    │                   └─ No → [Node B]
    │
    └─ On Error → [Error Handler] → [Telegram Alert]

### Nodos detallados:

| # | Tipo | Nombre | Función | Config clave |
|---|------|--------|---------|-------------|
| 1 | Webhook/Cron | Trigger | Inicia workflow | method, path, cron |
| 2 | HTTP Request | Fetch | Obtiene datos | URL, auth, timeout |
| 3 | Code | Transform | Transforma datos | JS, return format |
| 4 | IF | Check | Evalúa condición | campo, operador |
| 5 | HTTP Request | Send | Envía resultado | URL destino |
| E | Telegram | Alert | Notifica error | chat_id Martín |
```

### Section 5: Implementation Blocks

```markdown
## BLOQUES DE IMPLEMENTACIÓN

### BLOQUE 1: [Nombre]

- **QUÉ**: [Descripción concreta]
- **TRIGGER**: [Webhook POST | Cron "0 7 * * 1-5" | Event-based]
- **WEBHOOK PATH**: `/webhook/[nombre]` (si aplica)
- **NODOS** (en orden):
  1. **[Tipo]** "[Nombre]": [Qué hace] — Config: [detalles]
  2. ...
- **ERROR HANDLING** (obligatorio — ver sección Error Handling abajo):
  - Retry on Fail: [Sí/No, intentos, intervalo]
  - Continue on Error Output: [En qué nodos]
  - Error workflow global: [Sí, conectar al centralizado]
  - Mensaje de error incluye: workflow name, nodo, timestamp, datos
- **CÓMO SE VE LISTO**:
  - [ ] Workflow aparece en n8n con tag [TAG]
  - [ ] Trigger funciona (probado con curl / test manual)
  - [ ] Datos llegan al destino correctamente
  - [ ] Error handler envía notificación cuando falla
  - [ ] Workflow está ACTIVO (toggle ON)
- **DATOS DE TEST**: [Payload de ejemplo para probar]
```

### Section 6: Data Sources & Credentials

```markdown
## DATOS Y CREDENCIALES

| Servicio | Credencial en n8n | Estado |
|----------|-------------------|--------|
| Odoo 18 | "Odoo API" | ✅ Existe |
| MercadoLibre (2 cuentas) | "ML OAuth MelollevoCL" / "ML OAuth melollevo.cl" | ✅ |
| Telegram Bot | "UnionX Bot" | ✅ Existe |
| Meta Ads | "Meta Marketing API" | ✅ Existe |
| Supabase | "Supabase API" | ✅ Existe |
| Shopify (3 tiendas) | "Shopify unionx.cl" / etc. | ✅ Existe |
| Chatwoot | "Chatwoot API" | ✅ Existe |
| [Nuevo] | No existe | ❌ Documentar |

### Rate Limits:
| API | Límite | Estrategia |
|-----|--------|-----------|
| MercadoLibre | 1,500 req/min/seller | Batch 10 + Wait 2s |
| ML Orders search | 100 req/min | Batch 5 + Wait 5s |
| Odoo XML-RPC | Sin límite conocido | Batch 200, limit explícito |
| Meta Ads | 200 calls/hour/ad account | Batch + backoff |
| Shopify | 2 req/s (REST) | Batch + Wait 1s |
```

### Section 7: Constraints & Safety

```markdown
## RESTRICCIONES Y SEGURIDAD

### Tags obligatorios:
- Nombre: "[TAG] — [Descripción]" (ej: "UNIONX-OPS — Stock Crítico Alert")

### Guardrails:
- Workflows que ESCRIBEN en Odoo → aprobación Martín
- Workflows que envían emails/WhatsApp → rate limit máximo
- Workflows que tocan precios → PROHIBIDO cambio automático
- Meta/Google Ads → hard cap de budget en el nodo
- Si procesa >500 items → batch processing obligatorio
- RECORDAR: Silvestre creó campaña Meta a 100x budget → guardrails SIEMPRE

### Anti-loops:
- Webhook que llama a otro webhook → verificar no se llame a sí mismo
- Chatwoot bot → SIEMPRE filtrar message_type === "incoming"
- Workflow que modifica datos observados por otro → documentar dependencia
```

### Section 8: Activation & Verification

```markdown
## ACTIVACIÓN Y VERIFICACIÓN

1. Guardar workflow en n8n con tag correcto
2. Probar manualmente:
   - Webhook: curl -X POST https://n8nwebhook.grupoeter.cl/webhook/[path] -d '[payload]'
   - Cron: ejecutar con botón "Execute Workflow"
3. Probar error handling: enviar payload inválido
4. ACTIVAR workflow (toggle ON)
5. Registrar en existing-automations.md
6. Notificar a Martín: "[Workflow activado] — [nombre] — [qué hace]"
```

---

## REFERENCIA TÉCNICA: Code Nodes

### La regla de oro del return

Todo Code Node DEBE retornar un array de objetos con propiedad `json`:

```javascript
// ✅ CORRECTO — siempre esta estructura
return [{ json: { name: "test", value: 42 } }];

// ❌ INCORRECTO — falta wrapper json
return [{ name: "test" }];
// ❌ INCORRECTO — no es array
return { json: { name: "test" } };
// ❌ INCORRECTO — json contiene array en vez de objeto
return [{ json: ["item1", "item2"] }];
// ❌ INCORRECTO — json contiene string
return [{ json: "hello" }];
```

### Variables built-in

| Variable | Dónde | Para qué |
|----------|-------|----------|
| `$input.all()` | Code (All Items) | Todos los items de entrada |
| `$input.first()` / `.last()` | Code (All Items) | Primer/último item |
| `$json` | Code (Each Item) / Expressions | Data del item actual |
| `$('NodeName').all()` | Ambos | Items de un nodo específico |
| `$('NodeName').first().json` | Ambos | Primer item de un nodo |
| `$workflow.id` / `.name` | Ambos | Metadata del workflow |
| `$execution.id` / `.mode` | Ambos | ID ejecución; mode: test/production |
| `$env.VARIABLE` | Ambos | Variables de entorno (siempre string) |
| `$vars.nombre` | Ambos | Variables custom de n8n |
| `$now` | Ambos | DateTime actual (Luxon, timezone del workflow) |
| `$today` | Ambos | Hoy a medianoche |
| `$if(cond, true, false)` | Expressions | Ternario |
| `$ifEmpty(val, fallback)` | Expressions | Fallback si vacío/null |
| `$getWorkflowStaticData('global')` | Code | Datos persistentes entre ejecuciones |

### Patrones comunes de Code Node

**Transformación (All Items):**
```javascript
const items = $input.all();
return items.map(item => ({
  json: {
    ...item.json,
    fullName: `${item.json.firstName} ${item.json.lastName}`.trim(),
    processedAt: $now.toISO()
  }
}));
```

**Filtrado:**
```javascript
return $input.all()
  .filter(item => item.json.status === 'active')
  .map(item => ({ json: item.json }));
```

**Agregación:**
```javascript
const items = $input.all();
const total = items.reduce((sum, i) => sum + (i.json.amount || 0), 0);
return [{ json: { total, count: items.length, avg: total / items.length } }];
```

**Explotar un item en muchos:**
```javascript
const result = [];
for (const item of $input.all()) {
  for (const line of (item.json.lines || [])) {
    result.push({ json: { orderId: item.json.id, ...line } });
  }
}
return result;
```

**Datos persistentes (static data):**
```javascript
const staticData = $getWorkflowStaticData('global');
staticData.lastId = $json.id;
staticData.runs = (staticData.runs || 0) + 1;
// Se guarda automáticamente al terminar. NO persiste en ejecuciones manuales.
return [{ json: { lastId: staticData.lastId } }];
```

### Anti-patrones de Code Node

1. **NO pueden hacer HTTP requests** — usar HTTP Request node
2. **NO pueden acceder a credenciales** — usar nodos configurados
3. **`$json` NO existe en modo All Items** — usar `$input.all()`
4. **`import/export` NO funciona** — solo `require()`
5. **Módulos externos requieren whitelist**: env `NODE_FUNCTION_ALLOW_EXTERNAL=lodash`
6. **Siempre manejar inputs vacíos**: `if (items.length === 0) return [];`

---

## REFERENCIA TÉCNICA: Expression Language

Expresiones usan `{{ }}` en los campos de nodos.

**Acceso a datos:**
```javascript
{{ $json.fieldName }}                              // Campo del item actual
{{ $('Webhook').first().json.body.orderId }}        // Dato de otro nodo
{{ $('HTTP Request').all().length }}                 // Cantidad de items
```

**Fechas con Luxon:**
```javascript
{{ $now.toFormat('yyyy-MM-dd') }}                   // "2026-03-27"
{{ $now.plus({ days: 7 }).toISO() }}                // 7 días adelante
{{ $today.minus({ months: 1 }).toFormat('dd/MM/yyyy') }}
{{ $now.setZone('America/Santiago').toFormat('HH:mm') }}
```

**Condicionales:**
```javascript
{{ $if($json.amount > 10000, "alto", "normal") }}
{{ $ifEmpty($json.email, "sin-email@unknown.com") }}
```

**String extensions (solo en expressions, no en Code):**
`.toDateTime()`, `.toNumber()`, `.toBoolean()`, `.isEmpty()`, `.isNotEmpty()`,
`.extractEmail()`, `.extractDomain()`, `.hash('sha256')`, `.urlEncode()`,
`.removeTags()`, `.parseJson()`

**Array extensions:**
`.first()`, `.last()`, `.pluck('field')`, `.unique()`, `.compact()`,
`.sum()`, `.average()`, `.chunk(size)`, `.removeDuplicates()`

---

## REFERENCIA TÉCNICA: Error Handling (5 Capas)

### Capa 1: Validación de input
IF node al inicio que rechaza datos malformados. Validar campos requeridos,
tipos correctos, valores en rango. Rutear fallos a branch de logging.

### Capa 2: Retry on Fail (por nodo)
En Settings de cada HTTP Request node:
- Max Tries: 3-5
- Wait Between Tries: 2000-10000ms
- NOTA: el retry reprocesa TODOS los items del batch, no solo el fallido

### Capa 3: Continue Using Error Output (try/catch)
En Settings del nodo → On Error → "Continue (using error output)":
- Output 1: items exitosos → continúa normal
- Output 2: items fallidos → dead letter queue + alerta

### Capa 4: Circuit Breaker (para APIs inestables)
```javascript
const sd = $getWorkflowStaticData('global');
const fails = sd.apiFailures || 0;
const lastFail = sd.lastFailTime || 0;
if (fails >= 5 && Date.now() - lastFail < 60000) {
  return [{ json: { circuitOpen: true, reason: 'API down' } }];
}
return $input.all();
```

### Capa 5: Error Workflow Global
- Crear un workflow con Error Trigger como primer nodo
- Vincular CADA workflow de producción → Options → Error Workflow
- Error Trigger recibe: execution.id, workflow.name, error.message, error.node
- IMPORTANTE: Solo dispara en ejecuciones de producción, NO en tests manuales
- NO dispara si el nodo tiene "Continue on Fail" activado

**Patrón de alertas por severidad:**
```
[Error Trigger] → [Switch: workflow name]
  ├─ Críticos (Odoo sync, ML orders) → Telegram + Email
  ├─ Estándar → Telegram
  └─ Baja prioridad → Log Supabase
```

---

## REFERENCIA TÉCNICA: Integraciones UnionX

### Odoo 18 via JSON-RPC (preferido sobre XML-RPC)

**Autenticación:** Usar API Keys (no passwords). Generar en Odoo: Settings →
Users → Preferences → API Keys. Crear usuario dedicado con permisos mínimos.

**CRÍTICO: Odoo retorna HTTP 200 incluso en errores.** Siempre verificar:
```javascript
const resp = $input.first().json;
if (resp.error) {
  throw new Error(`Odoo: ${resp.error.data.name} - ${resp.error.data.message}`);
}
```

**CRÍTICO: Default limit es 100 records.** SIEMPRE pasar limit explícito:
```json
{
  "jsonrpc": "2.0",
  "method": "call",
  "params": {
    "service": "object",
    "method": "execute_kw",
    "args": [
      "unionx-db", "{{uid}}", "{{api_key}}",
      "sale.order", "search_read",
      [[["state", "=", "sale"]]],
      {"fields": ["name", "amount_total"], "limit": 500, "offset": 0, "order": "id asc"}
    ]
  }
}
```

**Modelos comunes:** product.product, stock.quant, sale.order, sale.order.line,
purchase.order, account.move, res.partner.

**Filtros domain:** `[["field", "=", value]]`. OR: `['|', ('f1','=','x'), ('f2','=','y')]`

### MercadoLibre (2 cuentas: MelollevoCL + melollevo.cl)

**OAuth2:** Tokens expiran en 6 horas. Refresh tokens son single-use.
Solo el ÚLTIMO refresh token generado es válido.

**CRÍTICO: Webhooks ML requieren respuesta en 500ms.** Patrón obligatorio:
```
[Webhook: POST /ml-notifications]
  → [Respond to Webhook: 200 OK]  ← INMEDIATAMENTE, antes de procesar
  → [Switch: $json.body.topic]
    → orders_v2: [GET order] → [Process]
    → questions: [GET question] → [Auto-reply]
```

**Rate limits:** 1,500 req/min/seller general, 100 req/min para orders/search.

**Endpoints clave:**
- Items del seller: `GET /users/{id}/items/search?status=active`
- Detalle item: `GET /items/{id}`
- Actualizar item: `PUT /items/{id}` (precio, stock)
- Órdenes: `GET /orders/search?seller={id}&sort=date_desc`
- Preguntas sin responder: `GET /questions/search?seller_id={id}&status=UNANSWERED`
- Responder: `POST /answers`
- Mensajes post-venta: `GET/POST /messages/packs/{pack_id}/sellers/{seller_id}`

### Chatwoot (chatwoot.grupoeter.cl)

**CRÍTICO: Prevención de loop infinito.** SIEMPRE filtrar:
```
[Chatwoot Webhook: message_created]
  → [IF: message_type == "incoming"]    ← Sin esto = loop infinito
  → [IF: private != true]               ← Ignorar notas internas
  → [Procesar]
  → [POST reply]
```

**Tokens:** User API Key (full access) > Agent Bot Token (limitado, no puede asignar).
Header: `api_access_token: TOKEN`
Base: `https://chatwoot.grupoeter.cl/api/v1/accounts/{id}/...`

**Eventos webhook:** message_created, conversation_created, conversation_status_changed.

### Telegram (9 agentes OpenClaw)

**Un bot = un webhook.** Si 2 workflows usan el mismo bot token, solo el último activado recibe eventos.
Cada agente OpenClaw tiene su propio bot → sin conflicto.

**Aprobaciones con inline keyboard (HTTP Request directo a Bot API):**
```json
{
  "chat_id": "{{chat_id}}",
  "text": "🔔 Aprobar: {{description}}",
  "reply_markup": {
    "inline_keyboard": [[
      {"text": "✅ Aprobar", "callback_data": "approve_{{id}}"},
      {"text": "❌ Rechazar", "callback_data": "reject_{{id}}"}
    ]]
  }
}
```
SIEMPRE llamar `answerCallbackQuery` después de procesar para quitar el spinner.

### Shopify (3 tiendas: unionx.cl, lhotsestore.cl, simplithome.cl)

Rate limit: 2 req/s REST API. Usar batch + Wait 1s.
Considerar nodo community `n8n-nodes-run-node-with-credentials-x` para
cambiar credenciales dinámicamente y evitar triplicar workflows.

---

## REFERENCIA TÉCNICA: Performance y Batching

### Loop Over Items (Split In Batches)
Para >100 items, SIEMPRE usar Loop Over Items:
- Batch Size: 10-50 (según rate limit de la API destino)
- Agregar Wait node después del HTTP Request: 1-5 segundos
- Expresión útil: `{{ $("Loop Over Items").context["noItemsLeft"] }}`

### Sub-workflows para liberar memoria
Cuando el workflow procesa >1000 items:
```
[Data Source] → [Loop Over Items (batch=50)]
  → [Execute Sub-workflow] → loop back
```
Cada sub-workflow libera memoria al completar. Crítico para evitar OOM.

### Configuración de memoria (ya en n8n de UnionX):
- `N8N_DEFAULT_BINARY_DATA_MODE=filesystem` → imágenes de productos en disco, no RAM
- `NODE_OPTIONS=--max-old-space-size=4096` → 4GB para Node.js
- `EXECUTIONS_DATA_PRUNE=true` → auto-limpieza de ejecuciones viejas

---

## REFERENCIA TÉCNICA: Seguridad de Webhooks

**Autenticación:** Webhook node soporta Header Auth, Basic Auth, JWT Auth.
NUNCA dejar "None" en producción.

**HMAC verification (para webhooks de terceros):**
Activar "Raw Body" en el Webhook node, luego en Code node:
```javascript
const crypto = require('crypto');
const expected = crypto.createHmac('sha256', $env.SECRET)
  .update($json.rawBody).digest('hex');
if (expected !== $json.headers['x-signature']) {
  throw new Error('HMAC inválido');
}
return [{ json: { verified: true, data: JSON.parse($json.rawBody) } }];
```

**IPs whitelist MercadoLibre:** 54.88.218.97, 18.215.140.160, 18.213.114.129, 18.206.34.84

---

## Patrones Comunes UnionX

### Patrón A: Agent Proxy (OpenClaw → n8n → Servicio)
```
Webhook POST /webhook/[agente]-[servicio]
  → Code: Validar token del agente
  → HTTP Request: Llamar API externa
  → Code: Transformar respuesta
  → Respond to Webhook: Retornar data al agente
  → On Error: Telegram alert
```
Usado por: Silvestre (11 proxies), Max (9 proxies), Vale (fal.ai)

### Patrón B: Monitor Programado (Cron → Check → Alert)
```
Cron (cada X horas)
  → HTTP Request: Fetch datos
  → Code: Evaluar condiciones/umbrales
  → IF: ¿Condición cumplida?
    ├─ Sí → Telegram/WhatsApp alert a Martín
    └─ No → No Operation
  → On Error: Telegram alert
```
Usado para: stock alerts, listing health, precios competencia, uptime

### Patrón C: Data Sync (Source → Transform → Destination)
```
Cron o Webhook
  → HTTP Request: Leer de origen
  → Code: Transformar/mapear campos
  → Loop Over Items (batch 50)
    → HTTP Request: Escribir en destino
    → Wait (rate limit)
  → On Error: Telegram + log Supabase
```
Usado para: Odoo↔ML sync, propagación precios, Chatwoot data

### Patrón D: Event Processor (Webhook → Process → Multi-output)
```
Webhook (recibe evento de servicio externo)
  → Respond to Webhook: 200 OK  ← INMEDIATO (crítico para ML)
  → Switch (tipo de evento)
    ├─ Tipo A → [Proceso A] → [Output A]
    ├─ Tipo B → [Proceso B] → [Output B]
    └─ Default → Log evento desconocido
  → On Error: Telegram alert
```
Usado para: ML webhooks, Chatwoot events, payment notifications

### Patrón E: Aprobación Humana (Telegram Inline)
```
[Trigger] → [Preparar datos]
  → [Telegram: Send Message con inline keyboard]
  → [Telegram Trigger: Callback Query]
  → [Switch: callback_data]
    ├─ approve_* → [Ejecutar acción] → [Confirm message]
    └─ reject_* → [Log rechazo] → [Confirm message]
  → [answerCallbackQuery] ← SIEMPRE para quitar spinner
```
Usado para: aprobación de POs, cambios de precio, gastos

---

## Decision Tree: ¿Platform Code o n8n Workflow?

| Señal | Platform (mega-prompt) | n8n (este skill) |
|-------|------------------------|-------------------|
| ¿Tiene UI visible? | ✅ | ❌ |
| ¿Corre en background? | ❌ | ✅ |
| ¿Conecta dos sistemas? | ❌ | ✅ |
| ¿Es cron/scheduled? | ❌ | ✅ |
| ¿Necesita webhook? | ❌ | ✅ |
| ¿Es proxy para agente? | ❌ | ✅ |
| ¿Requiere página en app.unionx.cl? | ✅ | ❌ |

**Si tiene AMBOS**: Generar DOS prompts separados.
Ejemplo: "Alertas stock crítico" = página en plataforma + workflow n8n cada hora.

---

## Quick Reference: Infraestructura n8n UnionX

- **URL**: n8nwebhook.grupoeter.cl
- **Webhooks base**: https://n8nwebhook.grupoeter.cl/webhook/
- **Total workflows**: ~200 (178 activos)
- **Tags**: UNIONX-OPS, OPENCLAW, ODOO, COMERCIAL, FINANZAS, SISTEMA
- **Telegram Bot**: UnionX Bot
- **Timezone**: America/Santiago
- **MCP access**: Solo via Claude Code (Bearer token)
- **Odoo**: innovatek.odoo.com (JSON-RPC preferido, XML-RPC también funciona)
- **ML cuentas**: MelollevoCL (430514750) + melollevo.cl (217038385)
- **Shopify**: unionx.cl, lhotsestore.cl, simplithome.cl
- **Chatwoot**: chatwoot.grupoeter.cl (NO grupoeter.chatwoot.com)
- **Supabase**: phjaugjqosxnxcgkbhht (sa-east-1)
- **Formatos Chile**: CLP $1.250.000, fechas DD/MM/YYYY, timezone America/Santiago
