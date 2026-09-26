



export function syncSelectionFromSetting(value) 
{
  const next = new Set(Array.isArray(value?.ids) ? value.ids : []);
  if (setsEqual(state.selected, next)) return;

  const previous = state.selected;
  state.selected = next;
  const { changedUserId, active } = describeSetChange(previous, next);
  const detail = {
    changedUserId,
    selected: active,
    selectedUserIds: Array.from(next)
  };
}
export function syncIllusionFromSetting(value) 
{
  const next = new Set(Array.isArray(value?.ids) ? value.ids : []);
  if (setsEqual(state.illusion, next)) return;

  const previous = state.illusion;
  state.illusion = next;
  const { changedUserId, active } = describeSetChange(previous, next);
  const detail = {
    changedUserId,
    active,
    illusionUserIds: Array.from(next)
  };
}