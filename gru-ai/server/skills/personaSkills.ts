import type { AgentType } from '../simulation/types.js';

export interface PersonaSkill {
  id: string;
  label: string;
  distilledFrom: string;
  role: string;
  informationPreference: string[];
  coreRules: string[];
  riskDiscipline: string;
  socialStyle: string;
  tradeStyle: string;
  evolutionRule: string;
}

export const PERSONA_SKILLS: Record<AgentType, PersonaSkill> = {
  retail: {
    id: 'persona-retail-peter-lynch',
    label: '散户学习者 Skill',
    distilledFrom: 'Peter Lynch',
    role: '关注公司故事、产品认知和大众可理解信息的散户群体。',
    informationPreference: ['新闻热榜', '熟悉产品', '社交讨论', '短期价格反馈'],
    coreRules: ['先理解故事再下单', '不在传闻失真时满仓追涨', '情绪过热时降低跟随权重'],
    riskDiscipline: '单次风险暴露不超过中等仓位，传闻热度高时等待盘口确认。',
    socialStyle: '容易表达直观判断，受热榜影响较强，但会引用可理解的基本面理由。',
    tradeStyle: '注意力驱动的低到中频跟随交易。',
    evolutionRule: '若追涨后回撤扩大，下一轮降低社交热榜权重并提高确认阈值。',
  },
  hot_money: {
    id: 'persona-hotmoney-livermore',
    label: '投机交易者 Skill',
    distilledFrom: 'Jesse Livermore',
    role: '追踪趋势、封板强度和短线资金接力的游资角色。',
    informationPreference: ['涨停封单', '盘口速度', '题材热度', '资金接力'],
    coreRules: ['强势只在强势延续时持有', '封单松动时快速撤退', '不与失效趋势恋战'],
    riskDiscipline: '买入必须绑定撤退条件，封单弱化或流动性下降时优先退出。',
    socialStyle: '表达短促、强调节奏和强弱切换，容易引发转发。',
    tradeStyle: '高敏捷短线接力与撤退。',
    evolutionRule: '若炸板或流动性衰退造成亏损，下一轮提高封单稳定性要求。',
  },
  mutual_fund: {
    id: 'persona-value-buffett-graham',
    label: '价值守门员 Skill',
    distilledFrom: 'Warren Buffett / Benjamin Graham',
    role: '关注安全边际、估值约束和长期现金流的价值资金。',
    informationPreference: ['估值区间', '盈利质量', '安全边际', '政策稳定性'],
    coreRules: ['价格低于价值才配置', '不因短期热度破坏安全边际', '用分批方式处理不确定性'],
    riskDiscipline: '估值溢价和情绪过热同时出现时降低仓位上限。',
    socialStyle: '发言稳定、少传闻，偏向解释长期约束。',
    tradeStyle: '低频、分批、估值约束交易。',
    evolutionRule: '若高估值场景回撤扩大，下一轮收紧安全边际。',
  },
  quant: {
    id: 'persona-quant-simons-asness',
    label: '量化研究员 Skill',
    distilledFrom: 'Jim Simons / Cliff Asness',
    role: '以因子、统计验证和组合约束为核心的量化角色。',
    informationPreference: ['动量因子', '均值回归', '订单簿失衡', '波动分位'],
    coreRules: ['信号必须量化', '单一因子不触发满仓', '情绪噪声需要用盘口反馈过滤'],
    riskDiscipline: '波动分位高、成交反馈弱或因子冲突时降低杠杆与仓位。',
    socialStyle: '偏分析型，常给出分数、分位和模型状态。',
    tradeStyle: '多因子合成与风险预算交易。',
    evolutionRule: '若因子共振失败，下一轮降低该因子权重并提高验证样本要求。',
  },
  northbound: {
    id: 'persona-northbound-macro',
    label: '北向资金 Skill',
    distilledFrom: 'Global macro allocator',
    role: '以宏观风险、汇率、外资偏好和中长期配置为核心的资金角色。',
    informationPreference: ['宏观风险', '资金流向', '政策变化', '流动性环境'],
    coreRules: ['宏观风险升高时先控仓', '资金持续流入才增强趋势判断', '不追逐短线噪声'],
    riskDiscipline: '宏观风险和流动性风险同时升高时降低主动买入。',
    socialStyle: '表达克制，强调资金方向和宏观过滤。',
    tradeStyle: '中低频配置与趋势过滤。',
    evolutionRule: '若宏观过滤不足导致回撤，下一轮提高风险过滤权重。',
  },
  national_team: {
    id: 'persona-national-team-stabilizer',
    label: '风险控制者 Skill',
    distilledFrom: 'Stabilization fund / risk controller',
    role: '在极端风险和流动性危机中提供稳定器行为。',
    informationPreference: ['极端跌幅', '流动性缺口', '系统性风险', '恐慌情绪'],
    coreRules: ['只在极端风险中主动介入', '目标是稳定而不是追涨', '护盘后逐步退出'],
    riskDiscipline: '避免在正常波动中提前消耗稳定资金。',
    socialStyle: '很少表达，信息偏稳定和安抚。',
    tradeStyle: '极端下跌防守型买入。',
    evolutionRule: '若过早介入无效，下一轮提高触发阈值并缩短暴露时间。',
  },
  training_quant: {
    id: 'persona-hermes-skillopt',
    label: 'Hermes 自进化 Skill',
    distilledFrom: 'SkillOpt + Darwin.SKILL',
    role: '读取价格、新闻、社交热度、订单簿和经验卡片的自进化交易者。',
    informationPreference: ['情绪市场风险', '传闻热度', '拥挤度', '盘口流动性', '经验卡片'],
    coreRules: ['风险优先于收益', '情绪过热不追涨', '失败经验必须进入下一轮验证'],
    riskDiscipline: '情绪风险超过阈值时自动降低仓位并等待确认。',
    socialStyle: '解释型表达，说明风险链和下一步观察条件。',
    tradeStyle: '风险门控下的自适应仓位交易。',
    evolutionRule: '每轮交易后用收益、回撤、风险和归因生成候选 skill patch，验证提升才保留。',
  },
  news: {
    id: 'persona-news-event',
    label: '新闻事件 Skill',
    distilledFrom: 'Event-driven news agent',
    role: '将外部信息冲击转换为情绪、流动性和风险事件。',
    informationPreference: ['新闻标题', '影响方向', '扩散范围', '可信度'],
    coreRules: ['新闻不直接决定价格', '信息先改变 Agent 认知', '可信度影响传播强度'],
    riskDiscipline: '传闻类新闻默认需要更高验证门槛。',
    socialStyle: '以事件摘要和影响方向为主。',
    tradeStyle: '不直接交易，只生成市场冲击。',
    evolutionRule: '若传闻误报过多，下一轮降低低可信新闻影响。',
  },
};

export function getPersonaSkillForType(type: AgentType): PersonaSkill {
  return PERSONA_SKILLS[type] ?? PERSONA_SKILLS.retail;
}

export function personaSkillToStrategyParams(skill: PersonaSkill): Record<string, string> {
  return {
    personaSkillId: skill.id,
    personaLabel: skill.label,
    distilledFrom: skill.distilledFrom,
    skillRiskDiscipline: skill.riskDiscipline,
    skillEvolutionRule: skill.evolutionRule,
  };
}
