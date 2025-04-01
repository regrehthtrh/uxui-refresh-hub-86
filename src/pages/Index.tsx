
import React from "react";
import DashboardLayout from "@/components/DashboardLayout";
import InsuranceDataTable from "@/components/InsuranceDataTable";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const { toast } = useToast();
  
  return (
    <DashboardLayout>
      <div className="py-2">
        <InsuranceDataTable />
      </div>
    </DashboardLayout>
  );
};

export default Index;
