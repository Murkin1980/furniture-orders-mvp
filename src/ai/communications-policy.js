export const AI_AGENT_ACTIONS = Object.freeze({
  SUGGEST_REPLY: "suggest_reply",
  SEND_MESSAGE: "send_message",
  UPDATE_ORDER: "update_order",
  SCHEDULE_FOLLOW_UP: "schedule_follow_up"
});

const POLICY = Object.freeze({
  [AI_AGENT_ACTIONS.SUGGEST_REPLY]: Object.freeze({
    allowed: true,
    requiresHumanApproval: true
  }),
  [AI_AGENT_ACTIONS.SEND_MESSAGE]: Object.freeze({
    allowed: false,
    requiresHumanApproval: true
  }),
  [AI_AGENT_ACTIONS.UPDATE_ORDER]: Object.freeze({
    allowed: false,
    requiresHumanApproval: true
  }),
  [AI_AGENT_ACTIONS.SCHEDULE_FOLLOW_UP]: Object.freeze({
    allowed: false,
    requiresHumanApproval: true
  })
});

export function getAiAgentActionPolicy(action) {
  return POLICY[action] || Object.freeze({
    allowed: false,
    requiresHumanApproval: true
  });
}
export function canAiAgentPerform(action) {
  return getAiAgentActionPolicy(action).allowed === true;
}
