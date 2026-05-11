"use client";

import { Download, Database } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LimitlessImport } from "@/components/limitless/limitless-import";
import { LimitlessData } from "@/components/limitless/limitless-data";

export default function LimitlessAdminPage() {
  return (
    <Tabs defaultValue="data">
      <TabsList variant="line">
        <TabsTrigger value="data">
          <Database className="mr-1.5 h-3.5 w-3.5" />
          Data
        </TabsTrigger>
        <TabsTrigger value="import">
          <Download className="mr-1.5 h-3.5 w-3.5" />
          Import
        </TabsTrigger>
      </TabsList>

      <TabsContent value="data" className="pt-4">
        <LimitlessData />
      </TabsContent>

      <TabsContent value="import" className="pt-4">
        <LimitlessImport />
      </TabsContent>
    </Tabs>
  );
}
