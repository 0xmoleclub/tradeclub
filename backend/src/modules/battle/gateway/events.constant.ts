export const EVENTS = {
  // matching events
  MATCH_FOUND: 'match.found',

  // Battle lifecycle events
  BATTLE_QUEUE: 'battle.queue',
  BATTLE_DEQUEUE: 'battle.dequeue',
  BATTLE_CREATED: 'battle.created',
  BATTLE_READY: 'battle.ready',
  BATTLE_STARTED: 'battle.started',
  BATTLE_FINISHED: 'battle.finished',
  BATTLE_CANCELLED: 'battle.cancelled',

  // Player events
  PLAYER_QUEUE: 'player.queue',
  PLAYER_DEQUEUE: 'player.dequeue',
  PLAYER_READY: 'player.ready',
  PLAYER_LEFT: 'player.left',
  PLAYER_FINISHED: 'player.finished',
};
