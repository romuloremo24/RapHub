---
name: ai-agent-system-prompt
description: >
  Guides the design and refinement of system prompts for UnionX's 9 OpenClaw AI agents.
  Use this skill whenever Martín asks to create, improve, audit, or debug an agent's configuration,
  or when discussing agent behavior, personality, tools, security, or cron schedules.
  Trigger phrases: "configurar agente", "prompt de Silvestre/Max/Vale/Sofia/Nico/Peter/James/Mateo",
  "mejorar el agente", "el agente hace X mal", "crear agente nuevo", "system prompt",
  "IDENTITY.md", "SOUL.md", "CLAUDE.md del agente", "personalidad del agente",
  "herramientas del agente", "seguridad del agente", "cron del agente", "OpenClaw",
  or any discussion about AI agent behavior, capabilities, or configuration.
  This skill is for DESIGN (Claude.ai). For IMPLEMENTATION, generate a mega-prompt for Claudio.
---

# AI Agent System Prompt Designer

## Purpose

Design, audit, and refine system prompts for UnionX's 9 OpenClaw AI agents.
Each agent is a specialized Claude instance running 24/7 on AWS Lightsail,
communicating via Telegram, with tools proxied through n8n.

## Why This Matters

A bad system prompt = an agent that wastes API credits, gives wrong answers,
or worse — takes destructive actions (Silvestre's 100x budget incident).
A good system prompt = an agent that acts like a senior employee who never
sleeps, never forgets, and always follows the rules.

---

## The 9 Agents — Current State

| Agent | Role | Model | Channel | Status |
|-------|------|-------|---------|--------|
| **Silvestre** | Paid Media Manager | Sonnet | Telegram | ✅ Active — Meta + Google Ads |
| **Vale** | Creative Director | Sonnet | Telegram | ✅ Active — AI photos/videos (fal.ai) |
| **Max** | B2B Sales | Sonnet | Telegram | ✅ Active — 9 n8n proxies, Odoo write |
| **Peter Pulse** | QA/Auditor | Haiku | Telegram | ✅ Active — READ-ONLY, audits Claudio |
| **James** | Competitive Intel | Haiku+Sonnet | Headless | ✅ Active — Web scraping |
| **Sofia** | Community Manager | Sonnet | Telegram | ⚠️ Configuring — RRSS only |
| **Nico** | Product Listings SEO | Haiku | Telegram | ⚠️ Configuring — Listings only |
| **Mateo** | CEO Advisor | Sonnet | Telegram | ✅ Active — Daily brief 7:30AM |
| **Evaluador** | Agent Auditor | Sonnet | Telegram | ✅ Active — 28-point checklist |

### Model Selection Rules
- **Haiku 4.5**: Simple/frequent tasks, read-only, monitoring, lightweight
- **Sonnet 4.6**: Analysis, decision-making, content creation, coordination
- **Opus**: NEVER for polling/cron. ONLY for strategic one-off decisions

---

## Agent File Architecture (OpenClaw Standard)

Every agent requires these files in `~/.openclaw/agents/[agent-name]/`:

```
~/.openclaw/agents/silvestre/
├── CLAUDE.md        # Main instructions (< 220 lines — progressive disclosure)
├── IDENTITY.md      # Name, role, personality, communication style
├── SOUL.md          # Values, principles, decision-making framework
├── AGENTS.md        # Knowledge of other agents (who does what)
├── SECURITY.md      # What it CAN and CANNOT do (3-tier model)
├── openclaw.json    # Technical config (model, channel, tools)
└── [domain files]   # Loaded on-demand (brand guides, API docs, etc.)
```

### CLAUDE.md — The Main Brain (< 220 lines)

Structure:
```markdown
# [Agent Name] — [Role] de UnionX

## Identidad
[1-2 párrafos: quién eres, qué haces, para quién trabajas]

## Reglas Fundamentales
[5-10 reglas inquebrantables, ordenadas por importancia]

## Herramientas Disponibles
[Tabla: nombre, qué hace, cuándo usar, restricciones]

## Flujo de Trabajo
[Paso a paso de cómo procesar cada tipo de request]

## Escalamiento
[Cuándo pedir ayuda a Martín vs resolver solo]

## Formato de Respuesta
[Cómo estructurar mensajes, idioma, tono]
```

**CRITICAL: Keep under 220 lines.** Details go in separate files loaded on-demand.
The CLAUDE.md is loaded on EVERY interaction — every line costs tokens.

### IDENTITY.md — Personality

```markdown
# Identidad de [Nombre]

## Nombre: [Nombre]
## Rol: [Título] de UnionX
## Reporta a: Martín Novoa (CEO)

## Personalidad
- [3-5 rasgos de personalidad]
- [Tono de comunicación: formal/casual/técnico]
- [Estilo de respuesta: conciso/detallado/analítico]

## Comunicación
- Idioma: Español chileno
- Canal: Telegram
- Firma: [Cómo firma sus mensajes]
- Emojis: [Sí/No, cuáles]
- Horario: [Cuándo puede ser contactado / cuándo envía proactivo]

## Lo que NO es
- No es un chatbot genérico
- No da consejos fuera de su dominio
- No contacta a nadie que no sea Martín (salvo Max que contacta clientes)
```

### SOUL.md — Values & Decision Framework

```markdown
# Valores de [Nombre]

## Principios
1. La verdad sobre la comodidad — nunca mentir sobre métricas
2. Proteger el negocio — no gastar sin autorización
3. Escalar cuando hay duda — mejor preguntar que asumir
4. Datos sobre opiniones — siempre respaldar con números

## Framework de Decisión
- Confianza > 0.7: Actuar autónomamente (🟢)
- Confianza 0.4-0.7: Sugerir a Martín con recomendación (🟡)
- Confianza < 0.4: Escalar a Martín sin recomendación (🔴)

## Aprendizajes
[Sección que se actualiza con errores pasados y lecciones]
```

### SECURITY.md — 3-Tier Permission Model

```markdown
# Seguridad de [Nombre]

## 🟢 Autónomo (puede hacer sin preguntar)
- [Lista de acciones específicas]

## 🟡 Requiere Aprobación de Martín (via Telegram inline)
- [Lista de acciones que necesitan OK]

## 🔴 Prohibido (nunca, bajo ninguna circunstancia)
- [Lista de acciones bloqueadas]

## Herramientas Permitidas
- [Lista con restricciones específicas]

## Herramientas PROHIBIDAS
- exec, bash (NUNCA)
- [Otras específicas del agente]
```

---

## Design Process: Creating a New Agent

### Step 1: Define the Role
Ask Martín:
- ¿Qué problema resuelve este agente?
- ¿Qué hace hoy un humano que el agente reemplazará?
- ¿Cuántas horas/semana ahorra?
- ¿Qué decisiones toma solo vs cuáles escala?

### Step 2: Choose the Model
| Criterio | → Haiku | → Sonnet | → Opus |
|----------|---------|----------|--------|
| Tareas simples/repetitivas | ✅ | | |
| Solo lectura, monitoring | ✅ | | |
| Análisis, decisiones | | ✅ | |
| Creación de contenido | | ✅ | |
| Estrategia compleja | | | ✅ (raro) |
| Cron frecuente (>1x/día) | ✅ | ✅ | ❌ NUNCA |
| Interacción con clientes | | ✅ | |

### Step 3: Define Tools (n8n Proxies)
Each tool = an n8n webhook endpoint that the agent calls.
Pattern: `/webhook/[agent]-[service]`

```json
// openclaw.json tools section
{
  "tools": [
    {
      "name": "search_products",
      "description": "Buscar productos en Odoo por nombre o SKU",
      "endpoint": "https://n8nwebhook.grupoeter.cl/webhook/[agent]-odoo",
      "method": "POST",
      "auth": "bearer",
      "parameters": {
        "action": "search_products",
        "query": "string"
      }
    }
  ]
}
```

### Step 4: Define Security Boundaries
Use the 3-tier model. Be SPECIFIC — vague rules get ignored.

**BAD:** "No hagas cosas peligrosas"
**GOOD:** "🔴 NUNCA crear campañas Meta con daily_budget > $50,000 CLP sin aprobación"

### Step 5: Set Up Cron
```bash
openclaw cron add --agent [name] --schedule "[cron]" --timezone "America/Santiago"
```
Common patterns:
- Daily 7:30AM brief: `"30 7 * * *"`
- Every 4 hours: `"0 */4 * * *"`
- Weekdays 9AM: `"0 9 * * 1-5"`
- Monday 8AM weekly: `"0 8 * * 1"`

**NEVER put cron in openclaw.json** — use the CLI command.

### Step 6: Write the Files
Generate all 5 files (CLAUDE.md, IDENTITY.md, SOUL.md, AGENTS.md, SECURITY.md)
following the templates above. Keep CLAUDE.md under 220 lines.

### Step 7: Test Before Deploying
- Send 5 test messages covering: normal request, edge case, forbidden action,
  ambiguous request, and out-of-scope question
- Verify: correct responses, proper escalation, tool usage, no security violations

---

## Common Patterns for UnionX Agents

### Pattern: Daily Brief (Mateo-style)
```markdown
## Cron: Daily Brief
Schedule: "30 7 * * 1-5" (7:30AM weekdays)
1. Fetch yesterday's sales from Odoo
2. Fetch active Meta/Google campaigns performance
3. Check n8n workflow failures last 24h
4. Check Chatwoot unresolved tickets
5. Compile into structured brief
6. Send to Martín via Telegram with key metrics + alerts
```

### Pattern: Approval Flow (via Telegram Inline Keyboard)
```markdown
## Cuándo pedir aprobación
When confidence < 0.7 OR action is 🟡:
1. Prepare summary: what you want to do + why + expected impact
2. Send Telegram message with inline keyboard:
   ✅ Aprobar | ❌ Rechazar | 📝 Modificar
3. Wait for Martín's response via callback
4. If approved: execute
5. If rejected: acknowledge and log reason
6. If modified: adjust and re-present
```

### Pattern: External Communication (Max-style)
```markdown
## Comunicación Externa
Max signs as Martín externally. Rules:
- Tono: profesional pero cercano
- Firma: "Martín Novoa — UnionX"
- NUNCA revelar que es una IA
- NUNCA comprometer precios sin aprobación
- NUNCA dar plazos de entrega sin verificar stock en Odoo
- Si el cliente pregunta algo fuera de scope → "Déjame verificar y te confirmo"
```

### Pattern: Creative Generation (Vale-style)
```markdown
## Generación de Contenido Visual
Vale uses fal.ai stack via n8n proxy:
- NB2 Edit: lifestyle photos ($0.075)
- FLUX.2 Pro: hero images ($0.03/MP)
- Recraft V4: icons ($0.04)
- Kling 3.0: hero video ($0.35/10s)
Always generate 3 variants. Martín picks.
```

---

## Anti-Patterns in Agent Design

| Anti-Pattern | Ejemplo | Fix |
|-------------|---------|-----|
| Vague security | "Sé cuidadoso con el presupuesto" | "🔴 NUNCA crear campaña con budget > $50K sin OK" |
| Too many rules | CLAUDE.md de 500+ líneas | Máximo 220 líneas, resto en archivos separados |
| No escalation path | Agente toma todas las decisiones | Definir umbrales claros con framework 🟢🟡🔴 |
| Generic personality | "Eres un asistente útil" | "Eres Silvestre, Paid Media Manager. Hablas directo, con datos." |
| All tools enabled | Agente tiene acceso a todo | Mínimo privilegio: solo las tools que necesita |
| No learning section | Repite los mismos errores | Sección "Aprendizajes" en SOUL.md, actualizable |
| Opus en cron | Cron cada hora con Opus | Haiku/Sonnet para cron. Opus solo on-demand. |
| No AGENTS.md | No sabe qué hacen los otros | Cada agente conoce a los demás para derivar correctamente |

---

## Billing Rules

- **martin@dinasty.cl** ($200/month): 8 agents — silvestre, vale, max, james, sofia, nico, mateo, evaluador
- **ventas@unionx.cl** ($100/month): peter-pulse only
- New agent → ALWAYS martin@dinasty.cl
- Auth: dual-profile fallback for silvestre/vale/max; single-profile for the rest

---

## Output Format

When Martín asks to create or improve an agent, deliver:

1. **All 5-6 files** (CLAUDE.md, IDENTITY.md, SOUL.md, AGENTS.md, SECURITY.md, openclaw.json)
2. **Cron command** if the agent has scheduled tasks
3. **n8n proxy webhooks** needed (list what workflows to create)
4. **Test messages** (5 scenarios to verify before deploying)
5. **Mega-prompt for Claudio** to deploy on OpenClaw (if needed)

Deliver files as a single copy-paste block that Martín sends to Claudio
with instructions to deploy.
