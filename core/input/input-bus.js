export const inputBus = new EventTarget();

export function emitAction(type) {
  inputBus.dispatchEvent(new CustomEvent("action", { detail: { type } }));
}
