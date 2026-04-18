// Simple module-level state for passing sound selection
// between the sounds picker screen and edit-alarm screen.

let _selected: string | null = null;

export function setPickedSound(id: string) {
  _selected = id;
}

export function consumePickedSound(): string | null {
  const val = _selected;
  _selected = null;
  return val;
}
