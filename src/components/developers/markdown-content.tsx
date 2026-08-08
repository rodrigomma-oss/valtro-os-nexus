import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { Info, AlertTriangle, Lock, Pin, CheckCircle2, ArrowRight } from "lucide-react";

interface MarkdownContentProps {
  content: string;
  className?: string;
}

export function MarkdownContent({ content, className }: MarkdownContentProps) {
  return (
    <div className={cn(
      "prose prose-slate dark:prose-invert max-w-none",
      "prose-headings:scroll-mt-20 prose-headings:font-bold prose-headings:tracking-tight",
      "prose-h1:text-4xl prose-h1:mb-8",
      "prose-h2:text-2xl prose-h2:mt-16 prose-h2:mb-6 prose-h2:pb-3 prose-h2:border-b prose-h2:flex prose-h2:items-center prose-h2:gap-2",
      "prose-h3:text-lg prose-h3:mt-10 prose-h3:mb-4",
      "prose-p:leading-relaxed prose-p:text-muted-foreground prose-p:mb-6",
      "prose-li:text-muted-foreground prose-li:mb-2",
      "prose-pre:bg-muted/50 prose-pre:border prose-pre:rounded-xl prose-pre:p-6 prose-pre:my-8",
      "prose-code:text-primary prose-code:bg-primary/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:font-medium prose-code:before:content-none prose-code:after:content-none",
      "prose-table:border-collapse prose-table:my-8 prose-th:bg-muted/50 prose-th:p-3 prose-th:text-left prose-td:p-3 prose-td:border-b",
      "prose-hr:my-16 prose-hr:border-muted-foreground/10",
      "prose-img:rounded-xl prose-img:shadow-lg",
      className
    )}>
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]}
        components={{
          // Personalização de Callouts e Elementos Especiais via Markdown
          blockquote: ({ children }) => {
            const childrenArray = React.Children.toArray(children);
            const firstChild = childrenArray[0];
            
            // Safe extraction of text content from the first child
            let text = "";
            if (typeof firstChild === 'string' || typeof firstChild === 'number') {
              text = String(firstChild);
            } else if (React.isValidElement(firstChild)) {
              const props = firstChild.props as any;
              if (props && props.children) {
                text = String(props.children);
              }
            }
            
            const isInfo = text.includes("💡") || text.includes("Dica");
            const isWarning = text.includes("⚠️") || text.includes("Atenção");
            const isSecurity = text.includes("🔒") || text.includes("Segurança");
            const isImportant = text.includes("📌") || text.includes("Importante");

            return (
              <div className={cn(
                "my-8 p-6 rounded-xl border-l-4 flex gap-4 items-start shadow-sm transition-all",
                isWarning ? "bg-amber-500/5 border-amber-500/50 text-amber-900 dark:text-amber-200" :
                isSecurity ? "bg-blue-500/5 border-blue-500/50 text-blue-900 dark:text-blue-200" :
                isImportant ? "bg-primary/5 border-primary/50 text-primary-900 dark:text-primary-200" :
                "bg-slate-500/5 border-slate-500/50 text-slate-900 dark:text-slate-200"
              )}>
                <div className="shrink-0 mt-1">
                  {isWarning ? <AlertTriangle className="h-5 w-5" /> :
                   isSecurity ? <Lock className="h-5 w-5" /> :
                   isImportant ? <Pin className="h-5 w-5" /> :
                   <Info className="h-5 w-5" />}
                </div>
                <div className="flex-1 italic not-prose text-sm leading-relaxed text-muted-foreground">
                  {children}
                </div>
              </div>
            );
          },
          // Estilização de Passos (H2 com "Passo X")
          h2: ({ children, ...props }) => {
            const text = String(children);
            const isStep = /^(Passo|Step)\s\d/i.test(text);
            
            if (isStep) {
              const [step, ...titleParts] = text.split(".");
              return (
                <div className="mt-16 mb-8 group">
                  <div className="flex items-center gap-3 mb-2 text-primary font-bold tracking-widest text-xs uppercase">
                    <CheckCircle2 className="h-4 w-4" />
                    {step}
                  </div>
                  <h2 className="text-3xl font-bold tracking-tight border-none mt-0 pt-0 pb-2 mb-4" {...props}>
                    {titleParts.join(".").trim()}
                  </h2>
                  <div className="h-px w-full bg-gradient-to-r from-primary/30 to-transparent" />
                </div>
              );
            }
            return <h2 {...props}>{children}</h2>;
          },
          // Estilização de Próximo Passo
          h4: ({ children, ...props }) => {
            const text = String(children);
            if (text.toLowerCase().includes("próximo passo")) {
              return (
                <div className="mt-16 pt-8 border-t border-muted">
                  <div className="flex items-center gap-2 text-primary font-semibold mb-4">
                    <ArrowRight className="h-5 w-5" />
                    {children}
                  </div>
                </div>
              );
            }
            return <h4 {...props}>{children}</h4>;
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
