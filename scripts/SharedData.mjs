export class SharedData
{
    static moduleInfo = {
        "id": "",
        "title": "",
        "description": "",
        "version": "",
        "compatibility": {
            "minimum": "",
            "verified": ""
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
    };

    static langFiles = {};

    static state = {
        selected: new Set(), // 가짜 메세지 전송대상 설정
        illusion: new Set(), // 토글. 가짜/원본 메세지 출력 상태를 설정
        root: null, // UI root. 서브모듈을 추가하면서 적용 모듈에 따라 조합이 용이하도록 Root를 두고 분리하여 관리
        moduleHost: null, // 실제로 UI가 들어가는 공간. root의 하단에 위치함
        modules: new Map(), // 넣는 모듈정보
        collapsed: false // 접기/펼치기
    };
}