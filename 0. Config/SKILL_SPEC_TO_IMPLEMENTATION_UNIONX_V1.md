---
name: spec-to-implementation
description: >
  Guides the structured handoff between Claude.ai (architect) and Claudio (Claude Code implementer).
  Use this skill whenever Martín describes a new feature, module, project, or significant change that
  needs to go from idea to implementation. Trigger phrases: "necesito que Claudio haga X", "quiero
  construir X", "hagamos X", "cómo implementamos X", "diseñemos X", "planifiquemos X", any feature
  description that implies future implementation, or when Martín says "prepara esto para Claudio".
  Also trigger when Martín pastes Claudio's output and asks for review or next steps.
  This skill ensures nothing gets lost in translation between planning and execution.
  If the task is a simple bug fix or config change, skip this skill and generate a direct prompt.
  Use mega-prompt-generator for the final output format. Use n8n-workflow-generator if the task
  is a background automation. This skill handles the PROCESS; those skills handle the FORMAT.
---

# Spec-to-Implementation: The Architect→Implementer Bridge

## Purpose

Ensure zero information loss between Martín's idea (expressed in Claude.ai) and
Claudio's implementation (in Claude Code). The spec is the contract — if it's not
in the spec, Claudio will improvise, and improvisation at night = wrong assumptions.

## Why This Matters

Every time Martín describes something to me, there are 6 categories of knowledge
that naturally get lost in translation to Claudio:

1. **Business motivation** — WHY this matters (revenue impact, hours saved)
2. **Implicit constraints** — Team conventions, security rules, Chilean regulations
3. **Edge cases** — Error states, empty data, rate limits, timeouts
4. **Integration dependencies** — API contracts between services, data flows
5. **Non-functional requirements** — Performance, accessibility, mobile responsive
6. **Domain knowledge** — Chilean tax rules, ML behavior, Odoo quirks, marketplace rules

This skill forces me to extract ALL 6 categories before generating the handoff.

---

## The 4-Phase Workflow

### Phase 1: INTERVIEW (Claude.ai — this conversation)

When Martín describes something he wants built, I DO NOT immediately generate
a mega-prompt. Instead, I follow this interview process:

**Step 1: Understand the goal**
- What problem does this solve?
- Who uses it? (Martín, team member, customer, agent?)
- What does success look like in 1 sentence?

**Step 2: Check what exists**
- Search past conversations for related work
- Review project files for existing modules
- Check memory for decisions already made
- Ask: "¿Ya existe algo parecido?" or check myself

**Step 3: Extract the 6 hidden categories**
Go through each one explicitly. If Martín hasn't mentioned it, ASK:

| Category | What to extract | Example question |
|----------|----------------|-----------------|
| Business motivation | Revenue impact, hours saved, risk | "¿Cuánto cuesta hoy hacer esto manual?" |
| Implicit constraints | Security, formats, approval flows | "¿Quién aprueba? ¿Hay restricciones de seguridad?" |
| Edge cases | Empty data, errors, limits | "¿Qué pasa si Odoo no responde? ¿Si no hay datos?" |
| Integration dependencies | APIs, services, data sources | "¿De dónde vienen los datos? ¿Odoo real o mock?" |
| Non-functional reqs | Speed, mobile, volume | "¿Cuántos registros? ¿Debe funcionar en celular?" |
| Domain knowledge | Tax rules, ML behavior, business rules | "¿Hay reglas de negocio específicas?" |

**Step 4: Confirm understanding**
Summarize back to Martín in 5-8 bullets what I understood.
Wait for "sí" or corrections before proceeding.

**IMPORTANT:** If Martín is on the phone (short messages, voice-note style),
adapt — ask fewer questions but cover the critical gaps. Don't make him write
essays. Extract what's essential, infer the rest from context and memory.

### Phase 2: SPEC (Claude.ai generates the document)

After the interview, generate the spec using the appropriate skill:
- Platform code (Next.js) → use **mega-prompt-generator** (8-section standard)
- n8n workflow → use **n8n-workflow-generator** (8-section n8n standard)
- Both → generate TWO separate documents

The spec IS the mega-prompt. There's no separate "spec" document and then a
"mega-prompt" — they are the same thing. The 8-section standard already encodes
all the information Claudio needs.

**Before delivering the spec, run the Completeness Checklist:**

```
□ Business context explains WHY with revenue/hours impact
□ Pre-flight checklist includes specific grep patterns
□ Reference paths point to the MOST SIMILAR existing module
□ Architecture diagram shows data flow with ✅/🆕 markers
□ Every block has: QUÉ + DÓNDE + CÓMO SE VE LISTO + PATRÓN
□ Real vs mock table covers every data point
□ Constraints include Chilean formats, Odoo limit, security rules
□ Build/test/commit section includes specific test case
□ No instruction says "mejorar" or "optimizar" without specifics
□ No file path is missing or ambiguous
□ Edge cases are documented (empty state, error, timeout)
□ If there's approval flow → specified who approves what
```

If any checkbox fails → fix before delivering.

### Phase 3: HANDOFF (Martín pastes to Claudio)

Martín copies the mega-prompt and pastes it into Claude Code.

**The Fresh Session Rule:** Claudio should start a FRESH session for
implementation. The spec must be self-contained — it cannot depend on
Claudio having seen a previous conversation. Everything Claudio needs
must be IN the document or referenced via file paths he can read.

**What Martín does:**
1. Download the mega-prompt file I generated
2. Open Claude Code (VS Code or Termius)
3. If using /plan workflow: paste with `/plan` command
4. If direct execution: paste the full content
5. Claudio executes following the pre-flight → blocks → build → commit flow

**What I tell Martín alongside the spec:**
- 1-line summary of what the spec does
- Estimated blocks and time
- Any pending decisions or credentials Claudio will need
- Anything Martín should verify after Claudio finishes

### Phase 4: REVIEW (Martín brings results back to Claude.ai)

When Martín pastes Claudio's output or reports results:

1. **Verify completion** — Did Claudio do all blocks? Check against the spec.
2. **Check quality** — Review code patterns, architecture decisions, gotchas.
3. **Identify gaps** — What was missed, improvised, or done differently?
4. **Generate follow-up** — If needed, create a patch mega-prompt for fixes.
5. **Update context** — Note decisions and patterns for future sessions.

**Common review patterns:**
- "Claudio hizo esto" → I verify against spec, flag deviations
- "No funciona X" → I diagnose and generate a targeted fix prompt
- "¿Qué sigue?" → I check the roadmap and generate the next spec
- "Mira lo que hizo" → I audit code quality and suggest improvements

---

## Decision Tree: When to Use This Skill

```
Martín describes something to build
    │
    ├─ Simple bug fix / config change / 1-line fix?
    │   → Skip this skill. Generate direct prompt.
    │
    ├─ New feature / module / significant change?
    │   → USE THIS SKILL. Full 4-phase workflow.
    │
    ├─ Continuation of existing work?
    │   → Abbreviated interview (skip what we already know).
    │     Check past conversations. Generate targeted spec.
    │
    └─ "¿Qué sigue?" / roadmap question?
        → Check project files + memory. Recommend next priority.
          If Martín approves, start Phase 1 for that item.
```

---

## Spec Quality Standards

### What makes a GOOD spec (Claudio executes perfectly):
- Every file path is explicit: `src/app/(dashboard)/finanzas/comex/page.tsx`
- Acceptance criteria are binary: "Table has sorting" not "Table works well"
- Data sources are specified: "Odoo stock.quant via XML-RPC" not "connect to stock"
- Fallbacks are defined: "If API fails → mock with badge ⚡ Datos estimados"
- Patterns are referenced: "Follow the same structure as /comercial/reporteria/"
- Test case included with specific input data and expected output

### What makes a BAD spec (Claudio improvises):
- "Mejora el dashboard" → Mejora QUÉ? Agrega filtros? Cambia los KPIs? Nuevo gráfico?
- "Conecta a Odoo" → Qué modelo? Qué campos? Qué limit? Qué pasa si falla?
- "Hazlo responsive" → ¿Cuál es el breakpoint? ¿Qué se oculta en mobile?
- "Agrega autenticación" → ¿Google OAuth? ¿Supabase Auth? ¿Qué roles?
- Missing file paths → Claudio creates files in random locations

### The "Would Claudio Ask?" Test
Before delivering any spec, ask: "If Claudio reads this at 3AM with zero
context, would he need to ask Martín anything?" If yes → the spec is incomplete.

---

## Integration with Existing Skills

This skill is the ORCHESTRATOR. It calls other skills for output:

```
[spec-to-implementation]  ←  THE PROCESS (interview, validate, handoff, review)
        │
        ├─ calls → [mega-prompt-generator]   ←  THE FORMAT for platform code
        ├─ calls → [n8n-workflow-generator]   ←  THE FORMAT for n8n workflows
        └─ uses  → [project files, memories]  ←  THE CONTEXT
```

The spec-to-implementation skill decides WHAT to build and extracts requirements.
The generator skills decide HOW to format the handoff document.

---

## Quick Reference: UnionX Roadmap Context

When Martín asks "¿qué sigue?" or describes something vague, check against
the current roadmap to provide context:

**Active phase:** FASE 3 — n8n workflows with real data
**Next up:** FASE 4 — Planner + Pricing v2.0
**Then:** FASE 5 — Multi-agent flows
**Then:** FASE 6 — Platform backlog (auth, settings, CEO reports)

**Pending modules:** Planner, Pricing, OpenClaw Mission Control, Settings
completo, Listings Health, Conciliación MP, Costos IA, Auth real

**Pending agents:** Sofia (RRSS), Vale (Creative), Nico (Listings SEO)
need full configuration.

Always check the Project Brain (Google Drive doc) for the latest status
before recommending what to build next.
