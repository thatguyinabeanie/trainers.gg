"use client";

import { Download, Database } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { RK9Data } from "@/components/rk9/rk9-data";
import { RK9Import } from "@/components/rk9/rk9-import";

export default function RK9AdminPage() {
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
        <RK9Data />
      </TabsContent>

      <TabsContent value="import" className="pt-4">
        <RK9Import />
      </TabsContent>
    </Tabs>
  );
}
