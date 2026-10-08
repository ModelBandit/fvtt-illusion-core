export class SharedData
{
    static moduleInfo = {
        "core": {
            "id": "",
            "title": "",
            "description": "",
            "version": "",
            "compatibility": {
                "minimum": "",
                "verified": ""
            }
        },
        "chat": {
            "id": "",
            "title": "",
            "description": "",
            "version": "",
            "compatibility": {
                "minimum": "",
                "verified": ""
            }
        }
    };

    static langBase = {
        "core": {
            "title": "",
            "help": "",
            "expand": "",
            "collapse": "",
            "noPlayers": "",
            "sendTargetTitle": "",
            "sendTargetAria": "",
            "selectionSaveFailed": "",
            "illusionSaveFailed": "",
            "illusionOn": "",
            "illusionOff": "",
            "languageSettingName": "",
            "languageSettingHint": ""
        },
        "chat": {
            "effect":{
                "noise": "노이즈",
                "binaryGlitch": "바이너리 글리치",
                "rgbSplit": "RGB 분할",
                "shaking": "흔들림"
                },
            "moduleTitle": "채팅",
            "moduleDescription": "선택한 플레이어에게 서로 다른 채팅을 전송",
            "selectPlayerHint": "플레이어를 선택하면 개인 문자열 입력칸이 나타납니다.",
            "privatePlaceholder": "{name}에게만 보낼 문자열",
            "player": "플레이어",
            "moderationPending": "검열 대기",
            "moderationPosition": "검열 대기 {current}/{total}",
            "displayName": "표시 이름",
            "playerName": "플레이어 이름",
            "replacementPlaceholder": "환상 상태 플레이어에게 보낼 가짜 채팅",
            "send": "전송",
            "moderationSendFailed": "검열 채팅 전송 실패: {error}",
            "privateSendFailed": "개인 채팅 분기 전송 실패: {error}",
            "moderationWaiting": "{name}의 채팅이 검열 대기 중입니다.",
            "moderationQueued": "채팅이 GM 검열 대기열로 전송되었습니다.",
            "requiresCore": "FVTT Illusion Chat을 사용하려면 FVTT Illusion Core가 필요합니다.",
            "settings": {
                "effectName": "채팅 전환 효과: {name}",
                "effectHint": "{name} 효과를 채팅 내용 전환 시 사용합니다. 여러 효과를 동시에 활성화할 수 있습니다.",
                "durationName": "채팅 전환 시간 (ms)",
                "durationHint": "활성화된 전환 효과가 content 교체 전까지 진행될 최소 시간입니다.",
                "shakeRangeName": "고급: 흔들림 범위 (px)",
                "shakeRangeHint": "Shake 효과에 사용하는 최대 무작위 이동 범위입니다.",
                "shakeShadowRangeName": "고급: 흔들림 RGB 그림자 범위 (px)",
                "shakeShadowRangeHint": "Shake와 RGB Split을 함께 사용할 때 RGB 그림자 클론의 무작위 이동 범위입니다.",
                "rgbSplitOffsetName": "고급: RGB 분할 간격 (px)",
                "rgbSplitOffsetHint": "RGB Split의 빨강/시안 그림자가 좌우로 떨어지는 거리입니다.",
                "rgbSplitOpacityName": "고급: RGB 분할 불투명도",
                "rgbSplitOpacityHint": "RGB Split의 빨강/시안 그림자 불투명도입니다."
                }
        },
    };

    static langFiles = {  };// is default

    static state = {
        selected: new Set(), // 가짜 메세지 전송대상 설정
        illusion: new Set(), // 토글. 가짜/원본 메세지 출력 상태를 설정
        root: null, // UI root. 서브모듈을 추가하면서 적용 모듈에 따라 조합이 용이하도록 Root를 두고 분리하여 관리
        moduleHost: null, // 실제로 UI가 들어가는 공간. root의 하단에 위치함
        modules: new Map(), // 넣는 모듈정보
        collapsed: false // 접기/펼치기
    };
}

const LANG_NAMES = {
    "en": "English",
    "de": "Deutsch",
    "fr": "Français",
    "es": "Español",
    "pt-BR": "Português (Brasil)",
    "it": "Italiano",

    "ja": "日本語",
    "ko": "한국어",
    "zh-CN": "简体中文",
    "zh-TW": "繁體中文",

    "pl": "Polski",
    "ru": "Русский",
    "sv": "Svenska",
    "fi": "Suomi",
    "cs": "Čeština",
    "nl": "Nederlands",
    "th": "ไทย",

    "ar": "العربية"
};
/** 언어 코드를 설정 UI에 표시할 이름으로 변환 */
export function getLanguageName(language) 
{
    if(language in LANG_NAMES)
        return LANG_NAMES[language];
    return language;
}