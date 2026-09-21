import { emitAction } from "./input-bus.js";

export function initKeyboardInput() {
  document.addEventListener("keydown", (e) => {
    if (e.code === "Space" || e.key === " " || e.key === "Spacebar") {
      e.preventDefault();
      if (e.repeat) return;
      emitAction("keyboard");
    }
  });
}
