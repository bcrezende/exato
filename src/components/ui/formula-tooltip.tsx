import * as React from "react";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { Info } from "lucide-react";

interface FormulaTooltipProps {
  formula: string;
  children: React.ReactNode;
  showIcon?: boolean;
}

export function FormulaTooltip({ formula, children, showIcon = true }: FormulaTooltipProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center gap-1 cursor-help">
            {children}
            {showIcon && (
              <Info className="h-3 w-3 text-muted-foreground/50 shrink-0" />
            )}
          </span>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="max-w-[280px] text-xs font-normal"
        >
          <div className="flex items-start gap-1.5">
            <Info className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
            <span>{formula}</span>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
