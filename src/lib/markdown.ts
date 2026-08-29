function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatInline(escaped: string): string {
  return escaped
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, "<em>$1</em>")
    .replace(/`([^`]+?)`/g, "<code class=\"rounded bg-black/10 px-1\">$1</code>");
}

// Minimal, XSS-safe Markdown subset (headings, bullet/numbered lists, bold/italic/code) for AI chat bubbles.
export function renderCoachMarkdown(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [];
  let listType: "ul" | "ol" | null = null;

  const closeList = () => {
    if (listType) {
      html.push(listType === "ul" ? "</ul>" : "</ol>");
      listType = null;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line.length === 0) {
      closeList();
      continue;
    }

    const headingMatch = /^(#{1,3})\s+(.*)$/.exec(line);
    if (headingMatch) {
      closeList();
      const tag = `h${Math.min(headingMatch[1].length + 3, 6)}`;
      html.push(`<${tag} class="font-semibold">${formatInline(escapeHtml(headingMatch[2]))}</${tag}>`);
      continue;
    }

    const bulletMatch = /^[-*]\s+(.*)$/.exec(line);
    if (bulletMatch) {
      if (listType !== "ul") {
        closeList();
        html.push('<ul class="list-disc space-y-1 pl-5">');
        listType = "ul";
      }
      html.push(`<li>${formatInline(escapeHtml(bulletMatch[1]))}</li>`);
      continue;
    }

    const numberedMatch = /^\d+[.)]\s+(.*)$/.exec(line);
    if (numberedMatch) {
      if (listType !== "ol") {
        closeList();
        html.push('<ol class="list-decimal space-y-1 pl-5">');
        listType = "ol";
      }
      html.push(`<li>${formatInline(escapeHtml(numberedMatch[1]))}</li>`);
      continue;
    }

    closeList();
    html.push(`<p>${formatInline(escapeHtml(line))}</p>`);
  }

  closeList();
  return html.join("");
}
