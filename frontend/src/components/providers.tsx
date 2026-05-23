"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { config } from "@/lib/wagmi";
import { useState, type ReactNode } from "react";
import { OptionalConvexProvider } from "@/components/convex-provider";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={config}>
      <OptionalConvexProvider>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </OptionalConvexProvider>
    </WagmiProvider>
  );
}
