
import React, { ReactNode, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MoveRight, BarChart, Mail } from "lucide-react";
import EmailConfiguration from "./EmailConfiguration";

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const [activeTab, setActiveTab] = useState("insurance");

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <header className="bg-white dark:bg-gray-950 shadow-sm border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <MoveRight className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-semibold">Gestionnaire d'Assurance</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Tabs defaultValue="insurance" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="insurance" className="flex items-center gap-2">
              <BarChart className="h-4 w-4" />
              Données d'Assurance
            </TabsTrigger>
            <TabsTrigger value="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Rappels Email
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="insurance" className="rounded-lg border shadow-sm bg-white dark:bg-gray-950 p-6">
            {children}
          </TabsContent>
          
          <TabsContent value="email" className="rounded-lg border shadow-sm bg-white dark:bg-gray-950 p-6">
            <EmailConfiguration />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default DashboardLayout;
