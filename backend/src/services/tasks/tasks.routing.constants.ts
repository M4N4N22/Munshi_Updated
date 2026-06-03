/** Owner→manager WhatsApp routing; null/empty on row means legacy direct assignment. */
export const TASK_ROUTING_STATUS = {
  AWAITING_MANAGER_ACTION: 'AWAITING_MANAGER_ACTION',
  MANAGER_SELF: 'MANAGER_SELF',
  DELEGATED_TO_WORKER: 'DELEGATED_TO_WORKER',
  REJECTED_BY_MANAGER: 'REJECTED_BY_MANAGER',
  DIRECT: 'DIRECT',
} as const;

export type TaskRoutingStatus =
  (typeof TASK_ROUTING_STATUS)[keyof typeof TASK_ROUTING_STATUS];
