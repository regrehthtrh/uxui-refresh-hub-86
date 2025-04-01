
import React from "react";
import DashboardLayout from "@/components/DashboardLayout";
import InsuranceDataTable from "@/components/InsuranceDataTable";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { insuranceStore } from "@/store/insuranceStore";

const Index = () => {
  const { toast } = useToast();
  const { getTopDebtors } = insuranceStore();
  
  // Obtenir les 5 débiteurs avec les plus grands montants restants
  const topDebtors = getTopDebtors(5);
  
  return (
    <DashboardLayout>
      {topDebtors.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Top 5 des Créances</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topDebtors.map((debtor, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="font-medium">{debtor.clientName}</span>
                  <span className="text-red-600 font-semibold">{debtor.remainingAmount.toLocaleString()} DZD</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      <div className="py-2">
        <InsuranceDataTable />
      </div>
    </DashboardLayout>
  );
};

export default Index;
