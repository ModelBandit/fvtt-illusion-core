
// FVTT 의존적 로딩
export async function loadFileNames(dir)
{
    const result = await FilePicker.browse("data", dir);
    const files = Array.isArray(result?.files) ? result.files : [];
    const data = files
        .filter(file => file.toLowerCase().endsWith(".json"))
        .map(file => file.split("/").pop().replace(/\.json$/i, ""));

    
    return data;
}

export async function loadFile(dir, name, ext)
{
    const fullPath = `/${dir}/${encodeURIComponent(name)}.${ext}`;
    try{
        const response = await fetch(fullPath, { cache: "no-cache" });
        return response.json()
    }
    catch{
        console.error("File Loading Error");
    }
}

// Used only for generating INDEX files.
export async function rebuildIndex(dir, json)
{
    const indexFile = new File(
        [JSON.stringify(json, null, 2)],
        "index.json",
        { type: "application/json" }
    );

    await FilePicker.upload(
        "data",
        dir,
        indexFile
    )
}
export function buildObject(dst, src)
{
    const keys = Object.keys(src);
    for(const key of keys)
    {
        if(typeof(src[key]) === "object")
            buildObject(dst[key], src[key]);

        dst[key] = src[key];
    }
}