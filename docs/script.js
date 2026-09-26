const button = document.getElementById("copy-markdown");
const originalLabel = button.textContent;

button.addEventListener("click", async () => {
  try {
    const response = await fetch("writeup.md");
    if (!response.ok) throw new Error(`Markdown request failed: ${response.status}`);
    await navigator.clipboard.writeText(await response.text());
    button.textContent = "Copied Markdown";
  } catch {
    button.textContent = "Copy failed — try again";
  }

  window.setTimeout(() => {
    button.textContent = originalLabel;
  }, 2400);
});
