/*
  Planner.

  Converts the user's desired outcome into a structured, validated plan of
  tool calls. The model chooses tools; the registry decides what exists.
*/
'use strict';

const MAX_STEPS = 24;

function buildSystemPrompt() {
  return [
    'You are FUL, a Windows desktop agent. You plan real actions using ONLY the provided tools.',
    'Return a single JSON object and nothing else.',
    'Schema:',
    '{"goal":"short goal","needsClarification":null,"steps":[{"id":"1","tool":"tool.name","args":{},"reason":"why","optional":false}]}',
    'If essential information is missing, return {"goal":"...","needsClarification":"one short question","steps":[]}. Do not invent dates, paths, project names or user intent.',
    'Rules:',
    '- Use only tool names from the provided list. Never invent a tool.',
    '- Every step must have typed args matching the tool schema. Do not add unknown keys.',
    '- Prefer reading/inspecting before writing. Verify with a real command or file read.',
    '- Prefer applyPatch over overwriting whole files. Keep unrelated code intact.',
    '- Never propose deleting or overwriting something without first identifying the exact target.',
    '- Install dependencies only when needed and include the approval-gated install tool.',
    '- Use project.detectFramework before project.run/project.runTests when unsure.',
    '- Run the smallest useful test or smoke check after changes.',
    '- If a runtime is missing, do not pretend it exists; report it in the plan using terminal.checkRuntime.',
    '- Keep the plan under 24 steps. Mark optional steps with "optional": true.',
    '- The user may speak Roman Nepali or mixed Nepali-English. Understand it; reply language is handled later.'
  ].join('\n');
}

function describeTools(tools) {
  return tools.map(t => {
    const schema = JSON.stringify(t.inputSchema || t.parameters || {});
    return `- ${t.name} (${t.risk || 'low'} risk): ${t.description}\n  args: ${schema}`;
  }).join('\n');
}

function safeContext(context) {
  if (!context) return 'No additional context.';
  if (typeof context === 'string') return context.slice(0, 12000);
  try { return JSON.stringify(context, null, 2).slice(0, 16000); } catch { return 'Context unavailable.'; }
}

function parsePlan(raw, registry) {
  const errors = [];
  let text = String(raw || '').trim();
  text = text.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
  if (!text) return { ok: false, errors: ['the model returned an empty plan'] };
  if (!text.startsWith('{')) {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start >= 0 && end > start) text = text.slice(start, end + 1);
  }
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    return { ok: false, errors: [`invalid JSON plan: ${e.message}`] };
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { ok: false, errors: ['plan must be a JSON object'] };
  }

  if (data.needsClarification) {
    const question = String(data.needsClarification).trim();
    if (!question) return { ok: false, errors: ['needsClarification must contain a question'] };
    return { ok: true, plan: { goal: String(data.goal || '').slice(0, 500), needsClarification: question.slice(0, 500), steps: [] } };
  }

  if (!Array.isArray(data.steps) || data.steps.length === 0) {
    return { ok: false, errors: ['plan has no steps'] };
  }
  if (data.steps.length > MAX_STEPS) {
    return { ok: false, errors: [`plan has too many steps (${data.steps.length} > ${MAX_STEPS})`] };
  }

  const seenIds = new Set();
  const steps = [];
  for (let i = 0; i < data.steps.length; i++) {
    const rawStep = data.steps[i];
    if (!rawStep || typeof rawStep !== 'object') {
      errors.push(`step ${i + 1} is not an object`);
      continue;
    }
    const id = String(rawStep.id || `step_${i + 1}`).slice(0, 40);
    if (seenIds.has(id)) errors.push(`duplicate step id "${id}"`);
    seenIds.add(id);
    const toolName = String(rawStep.tool || '');
    const tool = registry.get(toolName);
    if (!tool) {
      errors.push(`step ${id} uses unknown tool "${toolName}"`);
      continue;
    }
    const args = rawStep.args == null ? {} : rawStep.args;
    if (typeof args !== 'object' || Array.isArray(args)) {
      errors.push(`step ${id} args must be an object`);
      continue;
    }
    const validation = registry.validate(toolName, args);
    if (!validation.ok) {
      errors.push(`step ${id}: ${validation.errors.join('; ')}`);
      continue;
    }
    steps.push({
      id,
      tool: toolName,
      args,
      reason: String(rawStep.reason || '').slice(0, 500),
      optional: rawStep.optional === true,
      risk: tool.risk,
      timeoutMs: Number(rawStep.timeoutMs) || undefined
    });
  }

  if (errors.length) return { ok: false, errors, raw: text.slice(0, 4000) };
  return {
    ok: true,
    plan: {
      goal: String(data.goal || '').slice(0, 500),
      needsClarification: null,
      verification: String(data.verification || '').slice(0, 500),
      steps
    }
  };
}

class Planner {
  constructor(deps = {}) {
    this.provider = deps.provider;
    this.now = deps.now || (() => Date.now());
  }

  async createPlan({ request, context, workspaceRoots, activeWorkspace, tools, registry }) {
    const reg = registry || this.registry;
    if (!reg) return { ok: false, error: 'tool registry is not available' };
    const system = buildSystemPrompt();
    const prompt = [
      `User request:\n${String(request || '').slice(0, 8000)}`,
      '',
      `Approved workspace roots:\n${(workspaceRoots || []).join('\n') || '(none configured)'}`,
      activeWorkspace ? `Active workspace: ${activeWorkspace}` : 'No project is currently selected.',
      '',
      `Available tools:\n${describeTools(tools || reg.list())}`,
      '',
      `Context:\n${safeContext(context)}`,
      '',
      'Produce the plan JSON now.'
    ].join('\n');
    const result = await this.provider.generateJson({
      system,
      prompt,
      temperature: 0.15,
      maxTokens: 5000,
      timeoutMs: 90000
    });
    if (!result.ok) return { ok: false, error: result.error, provider: result.provider };
    const parsed = parsePlan(result.data ? JSON.stringify(result.data) : result.text, reg);
    if (!parsed.ok) return { ok: false, error: parsed.errors.join('\n'), raw: parsed.raw };
    return { ok: true, plan: parsed.plan, model: result.model, provider: result.provider };
  }

  async replan({ request, previousPlan, failure, execution, workspaceRoots, activeWorkspace, tools, registry }) {
    const reg = registry || this.registry;
    const system = buildSystemPrompt();
    const prompt = [
      `The previous plan failed. Replan safely from the current real state.`,
      `User request:\n${String(request || '').slice(0, 6000)}`,
      `Approved workspace roots:\n${(workspaceRoots || []).join('\n') || '(none)'}`,
      activeWorkspace ? `Active workspace: ${activeWorkspace}` : '',
      `Previous plan:\n${JSON.stringify(previousPlan, null, 2).slice(0, 6000)}`,
      `Failed step: ${failure ? failure.id : 'unknown'}\nReason: ${failure ? failure.error : 'unknown'}`,
      `Observations and outputs:\n${JSON.stringify(execution ? execution.observations : [], null, 2).slice(0, 8000)}`,
      `Changed files:\n${JSON.stringify(execution ? execution.changedFiles : [], null, 2).slice(0, 3000)}`,
      `Available tools:\n${describeTools(tools || reg.list())}`,
      'Do not repeat a step that already succeeded unless necessary. If the goal cannot be completed safely, return needsClarification or a short final plan that reports the blocker.',
      'Produce the replacement plan JSON now.'
    ].filter(Boolean).join('\n');
    const result = await this.provider.generateJson({ system, prompt, temperature: 0.2, maxTokens: 5000, timeoutMs: 90000 });
    if (!result.ok) return { ok: false, error: result.error };
    const parsed = parsePlan(result.data ? JSON.stringify(result.data) : result.text, reg);
    if (!parsed.ok) return { ok: false, error: parsed.errors.join('\n'), raw: parsed.raw };
    return { ok: true, plan: parsed.plan, model: result.model };
  }
}

module.exports = { Planner, parsePlan, buildSystemPrompt, describeTools, MAX_STEPS };
