"use client";

import { SessionProvider } from "next-auth/react";
import { useEffect } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/dac94886-3075-4737-bdca-5cc6718aa40e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'providers.tsx:9',message:'SessionProvider mounted',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
  }, []);
  
  return (
    <SessionProvider 
      refetchInterval={0}
      refetchOnWindowFocus={false}
    >
      {children}
    </SessionProvider>
  );
}

