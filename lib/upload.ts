const EXTENSION_MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  svg: "image/svg+xml",
};

function labelForType(mime: string): string {
  return mime.split("/")[1]?.replace("svg+xml", "SVG").toUpperCase() ?? mime;
}

export function validateImageFile(
  file: File,
  { allowedTypes, maxSizeMb }: { allowedTypes: string[]; maxSizeMb: number }
): string | null {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const typeFromExt = EXTENSION_MIME[ext];
  const isAllowedType =
    allowedTypes.includes(file.type) || (!!typeFromExt && allowedTypes.includes(typeFromExt));

  if (!isAllowedType) {
    const labels = Array.from(new Set(allowedTypes.map(labelForType)));
    return `Please choose a ${labels.join(", ")} file.`;
  }
  if (file.size > maxSizeMb * 1024 * 1024) {
    return `File is too large. Max size is ${maxSizeMb}MB.`;
  }
  return null;
}

// Prefers the file's own extension (e.g. "jpeg" vs the MIME subtype) since
// that's what ends up in the storage path -- falls back to the MIME type
// when the filename has no usable extension.
export function fileExtension(file: File): string {
  const fromName = file.name.split(".").pop();
  if (fromName && /^[a-z0-9]{1,5}$/i.test(fromName)) return fromName.toLowerCase();
  const fromType = file.type.split("/").pop();
  return fromType === "svg+xml" ? "svg" : fromType || "bin";
}
