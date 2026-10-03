export function downloadText(text: string, filename: string, mime = "application/json") {
  const blob = new Blob([text], { type: mime }), url = URL.createObjectURL(blob), anchor = document.createElement("a");
  anchor.href = url; anchor.download = filename; document.body.appendChild(anchor); anchor.click(); anchor.remove();
  // Do not revoke before the browser's download request has consumed the blob.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function downloadJson(value: unknown, filename: string) { downloadText(JSON.stringify(value, null, 2), filename); }
