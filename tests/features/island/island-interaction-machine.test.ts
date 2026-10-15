import { createActor, SimulatedClock } from 'xstate';
import { describe, expect, it, vi } from 'vitest';
import { islandInteractionMachine } from '../../../src/renderer/lib/islandInteractionMachine';
import type { InteractionBlockers } from '../../../src/renderer/lib/islandInteractionMachine';

const noBlockers: InteractionBlockers = {
  dragging: false,
  positionChanging: false,
  menuOpen: false,
  inputFocused: false,
};

function createInteraction() {
  const clock = new SimulatedClock();
  const collapse = vi.fn();
  const setMousePassthrough = vi.fn();
  const actor = createActor(islandInteractionMachine, {
    clock,
    input: {
      leaveDelayMs: 400,
      blockers: noBlockers,
      setMousePassthrough,
      collapse,
    },
  }).start();
  return { actor, clock, collapse, setMousePassthrough };
}

describe('Island interaction machine', () => {
  it('cancels the delayed collapse when the pointer returns', () => {
    const { actor, clock, collapse } = createInteraction();
    actor.send({ type: 'POINTER_ENTER' });
    actor.send({ type: 'POINTER_LEAVE' });
    expect(actor.getSnapshot().value).toBe('leaving');

    clock.increment(399);
    actor.send({ type: 'POINTER_ENTER' });
    clock.increment(1000);

    expect(actor.getSnapshot().value).toBe('inside');
    expect(collapse).not.toHaveBeenCalled();
    actor.stop();
  });

  it('waits for re-entry after geometry moves beyond the pointer', () => {
    const { actor, clock, collapse } = createInteraction();
    actor.send({ type: 'POINTER_ENTER' });
    actor.send({ type: 'GEOMETRY_EXIT' });
    clock.increment(1000);
    expect(actor.getSnapshot().value).toBe('awaitingReentry');
    expect(collapse).not.toHaveBeenCalled();

    actor.send({ type: 'POINTER_LEAVE' });
    expect(actor.getSnapshot().value).toBe('awaitingReentry');
    actor.send({ type: 'POINTER_ENTER' });
    actor.send({ type: 'POINTER_LEAVE' });
    clock.increment(400);

    expect(collapse).toHaveBeenCalledOnce();
    expect(actor.getSnapshot().value).toBe('outside');
    actor.stop();
  });

  it('restores window input when an overlay opens after a geometry exit', () => {
    const { actor, setMousePassthrough } = createInteraction();
    actor.send({ type: 'POINTER_ENTER' });
    actor.send({ type: 'GEOMETRY_EXIT' });
    expect(actor.getSnapshot().value).toBe('awaitingReentry');

    actor.send({ type: 'OVERLAY_OPEN' });

    expect(actor.getSnapshot().value).toBe('inside');
    expect(setMousePassthrough).toHaveBeenLastCalledWith(false);
    actor.stop();
  });

  it('holds outside interactions while a menu or input is active', () => {
    const { actor, clock, collapse } = createInteraction();
    actor.send({ type: 'POINTER_ENTER' });
    actor.send({
      type: 'BLOCKERS_CHANGED',
      blockers: { ...noBlockers, menuOpen: true },
    });
    actor.send({ type: 'POINTER_LEAVE' });
    clock.increment(1000);

    expect(actor.getSnapshot().value).toBe('heldOutside');
    expect(collapse).not.toHaveBeenCalled();

    actor.send({ type: 'BLOCKERS_CHANGED', blockers: noBlockers });
    expect(actor.getSnapshot().value).toBe('leaving');
    clock.increment(400);
    expect(collapse).toHaveBeenCalledOnce();
    actor.stop();
  });
});
