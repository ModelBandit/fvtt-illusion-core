export const MODULE_ROOT = "modules/fvtt-illusion-core"

export async function LoadFileNames(dir)
{
    const result = await FilePicker.browse("data", dir);
    const files = Array.isArray(result?.files) ? result.files : [];
    const data = files
        .filter(file => file.toLowerCase().endsWith(".json"))
        .map(file => file.split("/").pop().replace(/\.json$/i, ""));

    return data;
}

export async function LoadFile(dir, name, ext)
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
