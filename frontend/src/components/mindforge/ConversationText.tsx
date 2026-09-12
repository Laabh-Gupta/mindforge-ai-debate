import Markdown from "react-markdown";
/** Render model formatting without raw HTML, images, or embedded content. */
export function ConversationText({ text }: { text: string }) {
  return (
    <div className="mf-prose">
      <Markdown
        skipHtml
        disallowedElements={["img", "iframe", "script", "style"]}
        components={{
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4"
            >
              {children}
            </a>
          ),
        }}
      >
        {text}
      </Markdown>
    </div>
  );
}
