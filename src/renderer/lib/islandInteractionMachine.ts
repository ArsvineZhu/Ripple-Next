import { assign, setup } from 'xstate';

export interface InteractionBlockers {
  dragging: boolean;
  positionChanging: boolean;
  menuOpen: boolean;
  inputFocused: boolean;
  assistantActive?: boolean;
}

interface MachineContext {
  leaveDelayMs: number;
  blockers: InteractionBlockers;
  setMousePassthrough(ignore: boolean): void;
  collapse(): void;
}

export interface IslandInteractionInput extends MachineContext {}

type MachineEvent =
  | { type: 'POINTER_ENTER' }
  | { type: 'POINTER_LEAVE' }
  | { type: 'OVERLAY_OPEN' }
  | { type: 'GEOMETRY_EXIT' }
  | { type: 'BLOCKERS_CHANGED'; blockers: InteractionBlockers }
  | { type: 'SET_DELAY'; delayMs: number };

export const islandInteractionMachine = setup({
  types: {
    context: {} as MachineContext,
    events: {} as MachineEvent,
    input: {} as IslandInteractionInput,
  },
  delays: {
    leaveDelay: ({ context }) => context.leaveDelayMs,
  },
  guards: {
    canCollapse: ({ context }) => Object.values(context.blockers).every((active) => !active),
    hasBlockers: ({ context }) => Object.values(context.blockers).some(Boolean),
  },
  actions: {
    setInside: ({ context }) => context.setMousePassthrough(false),
    setOutside: ({ context }) => {
      context.setMousePassthrough(true);
    },
    collapse: ({ context }) => context.collapse(),
    setBlockers: assign({
      blockers: ({ context, event }) =>
        event.type === 'BLOCKERS_CHANGED' ? event.blockers : context.blockers,
    }),
    setDelay: assign({
      leaveDelayMs: ({ context, event }) =>
        event.type === 'SET_DELAY' ? event.delayMs : context.leaveDelayMs,
    }),
  },
}).createMachine({
  id: 'islandInteraction',
  initial: 'outside',
  context: ({ input }) => input,
  states: {
    outside: {
      on: {
        POINTER_LEAVE: [
          { guard: 'canCollapse', target: 'leaving', actions: 'setOutside' },
          { target: 'heldOutside', actions: 'setOutside' },
        ],
        POINTER_ENTER: { target: 'inside', actions: 'setInside' },
        OVERLAY_OPEN: { target: 'inside', actions: 'setInside' },
        GEOMETRY_EXIT: [
          { guard: 'canCollapse', target: 'leaving', actions: 'setOutside' },
          { target: 'heldOutside', actions: 'setOutside' },
        ],
        BLOCKERS_CHANGED: { actions: 'setBlockers' },
        SET_DELAY: { actions: 'setDelay' },
      },
    },
    inside: {
      on: {
        POINTER_ENTER: { actions: 'setInside' },
        OVERLAY_OPEN: { actions: 'setInside' },
        POINTER_LEAVE: [
          { guard: 'canCollapse', target: 'leaving', actions: 'setOutside' },
          { target: 'heldOutside', actions: 'setOutside' },
        ],
        GEOMETRY_EXIT: [
          { guard: 'canCollapse', target: 'leaving', actions: 'setOutside' },
          { target: 'heldOutside', actions: 'setOutside' },
        ],
        BLOCKERS_CHANGED: { actions: 'setBlockers' },
        SET_DELAY: { actions: 'setDelay' },
      },
    },
    leaving: {
      after: { leaveDelay: { target: 'outside', actions: 'collapse' } },
      always: { guard: 'hasBlockers', target: 'heldOutside' },
      on: {
        POINTER_ENTER: { target: 'inside', actions: 'setInside' },
        OVERLAY_OPEN: { target: 'inside', actions: 'setInside' },
        GEOMETRY_EXIT: [
          { guard: 'canCollapse', target: 'leaving', actions: 'setOutside' },
          { target: 'heldOutside', actions: 'setOutside' },
        ],
        BLOCKERS_CHANGED: { actions: 'setBlockers' },
        SET_DELAY: { target: 'leaving', reenter: true, actions: 'setDelay' },
      },
    },
    heldOutside: {
      always: { guard: 'canCollapse', target: 'leaving' },
      on: {
        POINTER_ENTER: { target: 'inside', actions: 'setInside' },
        OVERLAY_OPEN: { target: 'inside', actions: 'setInside' },
        GEOMETRY_EXIT: [
          { guard: 'canCollapse', target: 'leaving', actions: 'setOutside' },
          { target: 'heldOutside', actions: 'setOutside' },
        ],
        BLOCKERS_CHANGED: { actions: 'setBlockers' },
        SET_DELAY: { actions: 'setDelay' },
      },
    },
  },
});
