import React from "react";
import { insuranceStore } from "@/store/insuranceStore";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, Check, Clock, CreditCard, Users } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";

const COLORS = ["#4CAF50", "#FFC107", "#F44336"]; // green, amber, red

const Dashboard = () => {
  const { insuranceData } = insuranceStore();
  
  // Calculer les statistiques
  const paidCount = insuranceData.filter(item => item.status === "Recouvré").length;
  const partialCount = insuranceData.filter(item => item.status === "Partiellement recouvré").length;
  const unpaidCount = insuranceData.filter(item => item.status === "Créance").length;
  
  const totalClients = new Set(insuranceData.map(item => item.clientName)).size;
  
  // Calculer les montants totaux
  const totalAmount = insuranceData.reduce((sum, item) => sum + item.totalAmount, 0);
  const paidAmount = insuranceData.reduce((sum, item) => sum + item.amountPaid, 0);
  const remainingAmount = insuranceData.reduce((sum, item) => sum + item.remainingAmount, 0);
  
  // Calculate percentages
  const paidPercentage = insuranceData.length > 0 
    ? Math.round((paidCount / insuranceData.length) * 100) 
    : 0;
  
  const collectionRate = totalAmount > 0 
    ? Math.round((paidAmount / totalAmount) * 100) 
    : 0;
  
  // Find oldest unpaid contract
  const unpaidContracts = insuranceData.filter(item => item.status === "Créance");
  let oldestUnpaid = "";
  if (unpaidContracts.length > 0) {
    const oldestDate = new Date(Math.min(...unpaidContracts.map(c => new Date(c.dateEmission).getTime())));
    oldestUnpaid = oldestDate.toLocaleDateString();
  }
  
  // Prepare data for charts
  const statusData = [
    { name: 'Recouvré', value: paidCount },
    { name: 'Partiellement recouvré', value: partialCount },
    { name: 'Créance', value: unpaidCount },
  ];
  
  // Top 5 agencies by number of contracts
  const agencyData = insuranceData.reduce((acc: Record<string, number>, item) => {
    const agency = item.codeAgence || "Non spécifié";
    acc[agency] = (acc[agency] || 0) + 1;
    return acc;
  }, {});
  
  const topAgencies = Object.entries(agencyData)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">
              Total polices
            </CardTitle>
            <CreditCard className="w-4 h-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{insuranceData.length}</div>
            <p className="text-xs text-gray-500 mt-1">
              {paidCount} recouvrées, {partialCount} partiellement recouvrées, {unpaidCount} en créance
            </p>
          </CardContent>
          <CardFooter className="p-2">
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div 
                className="h-full bg-green-500 rounded-full" 
                style={{ width: `${paidPercentage}%` }}
              />
            </div>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">
              Montant total
            </CardTitle>
            <Check className="w-4 h-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAmount.toLocaleString()} DZD</div>
            <p className="text-xs text-gray-500 mt-1">
              {paidAmount.toLocaleString()} DZD encaissés
            </p>
            <div className="mt-3">
              <Separator className="my-2" />
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Taux de recouvrement:</span>
                <span className="font-medium">{collectionRate}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">
              Total clients
            </CardTitle>
            <Users className="w-4 h-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalClients}</div>
            <div className="mt-3">
              <Separator className="my-2" />
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Moyenne par client:</span>
                <span className="font-medium">
                  {totalClients > 0 
                    ? Math.round(insuranceData.length / totalClients * 10) / 10 
                    : 0} polices
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">
              Montant restant à recouvrer
            </CardTitle>
            <AlertCircle className="w-4 h-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{remainingAmount.toLocaleString()} DZD</div>
            <p className="text-xs text-red-500 mt-1">
              {unpaidCount} polices en créance
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">
              Plus ancienne créance
            </CardTitle>
            <Clock className="w-4 h-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{oldestUnpaid || "N/A"}</div>
            <p className="text-xs text-gray-500 mt-1">
              {unpaidCount > 0 ? `Sur ${unpaidCount} polices en créance` : "Aucune créance"}
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Charts Section - Removed Évolution temporelle des statuts and Répartition des montants */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Répartition des statuts</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => [`${value} polices`, ""]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top 5 Agences</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topAgencies} layout="vertical">
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} />
                <Tooltip />
                <Bar dataKey="value" fill="#004a80" name="Nombre de polices" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
