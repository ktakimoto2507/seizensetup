// src/types/card-augment.d.ts
declare module "@/components/ui/card" {
  import * as React from "react";
  export const Card: React.ComponentType<React.HTMLAttributes<HTMLDivElement>>;
  export const CardHeader: React.ComponentType<React.HTMLAttributes<HTMLDivElement>>;
  export const CardContent: React.ComponentType<React.HTMLAttributes<HTMLDivElement>>;
  export const CardFooter: React.ComponentType<React.HTMLAttributes<HTMLDivElement>>;
}
