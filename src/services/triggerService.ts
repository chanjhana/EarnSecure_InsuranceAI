import { getTriggerEvents, TriggerEvent } from '../api/adminClient';

type TriggerListener = (events: TriggerEvent[]) => void;

export function subscribeToTriggerEvents(listener: TriggerListener, refreshInterval = 15 * 1000) {
  let alive = true;

  const run = async () => {
    try {
      const events = await getTriggerEvents();
      if (alive) {
        listener(events);
      }
    } catch {
      if (alive) {
        listener([]);
      }
    }
  };

  run();
  const timer = setInterval(run, refreshInterval);

  return () => {
    alive = false;
    clearInterval(timer);
  };
}
