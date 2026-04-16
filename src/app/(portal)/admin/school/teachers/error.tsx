"use client";

import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCcw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Teachers Page Render Error:", error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[400px] p-6">
      <Card className="border-0 shadow-2xl rounded-[32px] bg-white max-w-lg w-full overflow-hidden">
        <CardContent className="p-10 text-center space-y-6">
          <div className="h-20 w-20 bg-red-50 rounded-[28px] flex items-center justify-center mx-auto text-red-500">
            <AlertCircle className="h-10 w-10" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-gray-900">Oops! Something went wrong</h2>
            <p className="text-gray-500 font-medium">
              We encountered an error while rendering the teachers dashboard. This is usually due to unexpected data formats or temporary server issues.
            </p>
          </div>
          
          {error.digest && (
            <div className="p-4 bg-gray-50 rounded-2xl text-left">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Error Digest</p>
              <code className="text-[10px] font-mono font-bold text-gray-600 break-all">
                {error.digest}
              </code>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <Button 
                onClick={() => reset()}
                className="rounded-2xl h-12 font-black shadow-xl shadow-primary/20 hover:scale-[1.02] transition-transform active:scale-95"
            >
                <RefreshCcw className="h-4 w-4 mr-2" /> Try Again
            </Button>
            <Button 
                variant="ghost"
                onClick={() => window.location.href = "/admin/school"}
                className="rounded-2xl h-12 font-bold text-gray-500 hover:text-gray-700"
            >
                Back to School Overview
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
