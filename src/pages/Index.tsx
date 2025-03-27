
import React from "react";
import DashboardLayout from "@/components/DashboardLayout";
import InsuranceDataTable from "@/components/InsuranceDataTable";
import { insuranceStore } from "@/store/insuranceStore";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const { toast } = useToast();
  
  return (
    <DashboardLayout>
      <div className="container mx-auto py-6">
        <h1 className="text-3xl font-bold mb-8 text-center">Insurance Management System</h1>
        <InsuranceDataTable />
      </div>
    </DashboardLayout>
  );
};

export default Index;
