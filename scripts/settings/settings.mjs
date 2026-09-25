


/** 언어 코드를 설정 UI에 표시할 이름으로 변환 */
function getLanguageName(language) 
{
  switch (String(language ?? "").toLowerCase()) {
    case "ko": 
        return "한국어";
    //---unused---
    case "en": 
        return "English";
    case "ja": 
        return "日本語";
    case "zh-cn": 
        return "简体中文";
    case "zh-tw": 
        return "繁體中文";
    //---unused---
    default: 
        return String(language ?? "");
  }
}

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