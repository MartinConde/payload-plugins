import * as React from "react";
import { Collapsible as CollapsiblePrimitive } from "radix-ui";
declare function Collapsible({ ...props }: React.ComponentProps<typeof CollapsiblePrimitive.Root>): React.JSX.Element;
declare function CollapsibleTrigger({ ...props }: React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleTrigger>): React.JSX.Element;
declare function CollapsibleContent({ ...props }: React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleContent>): React.JSX.Element;
export { Collapsible, CollapsibleTrigger, CollapsibleContent };
