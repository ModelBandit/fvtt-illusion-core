import { MODULE_ROOT, loadFileNames, loadFile, rebuildIndex } from "./settings/fileSystem.mjs";
import { syncSelectionFromSetting, syncIllusionFromSetting } from "./settings/settings.mjs"
import { SharedData, getLanguageName } from "./SharedData.mjs";

const LANGUAGE_DIR = `${MODULE_ROOT}/lang`;
const ROOT_SELECTOR = "[data-fvtt-illusion-core-root]";
//globalThis.fvttIllusion.core = this;

// fvtt init
Hooks.once("init", async () => {
  
  const MODULE_INFO = await loadFile(MODULE_ROOT, "module", "json");
  // console.log(`id is ${MODULE_INFO}`);
  for(const key of Object.keys(MODULE_INFO))
  {
    SharedData.moduleInfo[key] = MODULE_INFO[key];
  }
  game.settings.register(SharedData.moduleInfo.id, "language", {
    name: "SharedData.langBase.core.languageSettingName",
    hint: "SharedData.langBase.core.languageSettingHint",
    scope: "world",
    config: true,
    type: new foundry.data.fields.StringField({
      required: true,
      blank: false,
      initial: game.i18n.lang,
      choices: SharedData.langFiles
    }),
    // requiresReload: true // fvtt에 메타데이터를 넘겨서 팝업을 끼고 새로고침
    onChange: () => globalThis.location.reload()
  });

  // get settings language 
  const LANG = game.settings.get(
        SharedData.moduleInfo.id,
        "language"
    );

  // load data
  const LOCALIZE_DATA = await loadFile(LANGUAGE_DIR, LANG ?? "ko", "json");
  // console.log(`title is ${LOCALIZE_DATA}`);
  for(const moduleName of Object.keys(LOCALIZE_DATA)){
    for(const key of Object.keys(LOCALIZE_DATA[moduleName])){
      SharedData.langBase[moduleName][key] = LOCALIZE_DATA[moduleName][key];
      // console.log(`LOCALIZE_DATA is ${SharedData.langBase[moduleName][key]}`);
      // console.log(`langBase is ${LOCALIZE_DATA[moduleName][key]}`);
    }
  }
  // localize data setter
  const setting = game.settings.settings.get(`${SharedData.moduleInfo.id}.language`);

  setting.name = SharedData.langBase.core.languageSettingName;
  setting.hint = SharedData.langBase.core.languageSettingHint;
  
  game.settings.register(SharedData.moduleInfo.id, "selectedPlayers", {
    scope: "world",
    config: false,
    type: Object,
    default: { ids: [] },
    onChange: syncSelectionFromSetting
  });

  game.settings.register(SharedData.moduleInfo.id, "illusionPlayers", {
    scope: "world",
    config: false,
    type: Object,
    default: { ids: [] },
    onChange: syncIllusionFromSetting
  });

  game.settings.register(SharedData.moduleInfo.id, "panelCollapsed", {
    scope: "client",
    config: false,
    type: Boolean,
    default: false
  });
  
});

// first module init
Hooks.once("setup", async () => {
  console.log("-----setup-----");
  const setting = game.settings.settings.get(
      `${SharedData.moduleInfo.id}.language`
  );
  // console.log("Field choices:", setting.type.choices);

  const index_data = await loadFile(LANGUAGE_DIR, "index", "json");
  const index_keys = Object.keys(index_data.language);
  const LANGUAGE_FILES = (await loadFileNames(LANGUAGE_DIR)).filter(item => item !== "index");

  // console.log(`file list is ${LANGUAGE_FILES}`);

  // push file names
  for(const vKey of LANGUAGE_FILES)
  {
    if(vKey in index_keys == false)
    {
      index_data.language[vKey] = {
        name: getLanguageName(vKey),
        path: `/${LANGUAGE_DIR}/${vKey}.json`
        //encodeURIComponent(name) // url에서 문법적으로 의미있는 특수문자들 걸러줌
      };
    }
  }
  // clean file list and refresh
  if(Object.keys(index_data.language).length > index_keys.length)
  {
    // over data delete
    for(const vKey of Object.keys(index_data.language))
    {
      if(vKey in LANGUAGE_FILES)
        delete index_data.language[vKey];
    }
    await rebuildIndex(LANGUAGE_DIR, index_data);
    globalThis.location.reload();
  }
  else if(LANGUAGE_FILES.length < Object.keys(index_data.language).length)
  {
    // no files delete
    for(const vKey of Object.keys(index_data.language))
    {
      if((vKey in LANGUAGE_FILES) == false)
        delete index_data.language[vKey];
    }
    await rebuildIndex(LANGUAGE_DIR, index_data);
    globalThis.location.reload();
  }
  //


  for(const vKey of LANGUAGE_FILES)
  {
    if(vKey in SharedData.langFiles == false)
      SharedData.langFiles[vKey] = getLanguageName(vKey);
  }
  // console.log("Field choices:", setting.type.choices);
  
  
});


// world initialize
Hooks.once("ready", async () => {
  
});