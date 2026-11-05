/*
  Completion verification.

  Deterministic checks always run. An optional model check can summarise
  whether the observed evidence actually satisfies the request.
*/
'use strict';

function verify({ request, plan, execution, provider, useModel = false } = {}) {
  const issues = [];
  const warnings = [];
  const steps = execution && Array.isArray(execution.steps) ? execution.steps : [];

  if (!execution) issues.push('no execution result was produced');
  else if (execution.cancelled) issues.push('the task was cancelled');
  else if (!execution.ok) issues.push(execution.error || 'a step failed');

  const failed = steps.filter(s => s.status !== 'ok');
  for (const step of failed) warnings.push(`${step.tool}: ${step.status}${step.error ? ' — ' + step.error : ''}`);

  const wrote = steps.some(s => /filesystem\.(createFile|applyPatch|createDirectory|rename|move|copy)/.test(s.tool) && s.status === 'ok');
  const ranTests = steps.some(s => /runTests|inspectErrors/.test(s.tool) || /(?:^|\s)(?:npm test|pytest|test)(?:\s|$)/.test(s.command || ''));
  const readFiles = steps.some(s => /filesystem\.(read|list|search|tree)|project\.detectFramework/.test(s.tool) && s.status === 'ok');

  if (wrote && !ranTests) warnings.push('files were changed but no test or smoke command was run');
  if (!readFiles && wrote) warnings.push('files were written without reading the existing project first');

  const commands = (execution && execution.commandsRun) || [];
  const failedCommands = commands.filter(c => c.exitCode != null && c.exitCode !== 0);
  if (failedCommands.length) issues.push(`${failedCommands.length} command(s) failed`);

  const base = {
    complete: issues.length === 0,
    issues,
    warnings,
    changedFiles: (execution && execution.changedFiles) || [],
    commandsRun: commands,
    steps: steps.length,
    failedSteps: failed.length
  };

  if (!useModel || !provider || !request) return Promise.resolve(base);

  const prompt = [
    `User request: ${String(request).slice(0, 3000)}`,
    `Planned goal: ${plan && plan.goal ? plan.goal : ''}`,
    `Deterministic result: ${JSON.stringify({ complete: base.complete, issues: base.issues, warnings: base.warnings, changedFiles: base.changedFiles, commandsRun: base.commandsRun.map(c => ({ command: c.command, exitCode: c.exitCode })) }, null, 2)}`,
    'Decide whether the request was actually satisfied by these real observations.',
    'Return JSON: {"complete":true|false,"summary":"one short sentence","issues":["..."]}. Never claim an action that is not in the observations.'
  ].join('\n');

  return provider.generateJson({
    system: 'You verify desktop-agent task completion using only the supplied evidence. Be conservative and concise.',
    prompt,
    temperature: 0,
    maxTokens: 500,
    timeoutMs: 30000
  }).then(result => {
    if (!result.ok || !result.data) return base;
    const data = result.data;
    return {
      ...base,
      complete: data.complete === true && base.complete,
      modelSummary: String(data.summary || '').slice(0, 500),
      modelIssues: Array.isArray(data.issues) ? data.issues.slice(0, 10).map(String) : []
    };
  }).catch(() => base);
}

module.exports = { verify };
