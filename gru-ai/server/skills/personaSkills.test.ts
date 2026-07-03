import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { PERSONA_SKILLS, getPersonaSkillForType, personaSkillToStrategyParams } from './personaSkills.js';
import type { AgentType } from '../simulation/types.js';

const AGENT_TYPES: AgentType[] = ['retail', 'hot_money', 'mutual_fund', 'quant', 'northbound', 'national_team', 'training_quant', 'news'];

describe('persona skills', () => {
  it('covers every market agent type with Darwin-style distillation metadata', () => {
    for (const type of AGENT_TYPES) {
      const skill = getPersonaSkillForType(type);
      assert.equal(PERSONA_SKILLS[type].id, skill.id);
      assert.ok(skill.distilledFrom.length > 0);
      assert.ok(skill.coreRules.length >= 3);
      assert.ok(skill.evolutionRule.length > 0);
    }
  });

  it('exports compact strategy params for the UI and agent prompts', () => {
    const params = personaSkillToStrategyParams(getPersonaSkillForType('training_quant'));
    assert.equal(params.personaSkillId, 'persona-hermes-skillopt');
    assert.match(params.skillEvolutionRule, /skill patch|验证|validation/i);
  });
});
