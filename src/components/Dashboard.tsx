
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { insuranceStore } from "@/store/insuranceStore";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from "recharts";
import { FileUp, AlertCircle, Clock, Calendar, CheckCircle2, AlertTriangle, Activity } from "lucide-react";

const Dashboard = () => {
  const { insuranceData } = insuranceStore();
  
  // Calculate statistics
  const totalContracts = insuranceData.length;
  const totalAmount = insuranceData.reduce((sum, contract) => sum + contract.totalAmount, 0);
  const remainingAmount = insuranceData.reduce((sum, contract) => sum + contract.remainingAmount, 0);
  const paidAmount = totalAmount - remainingAmount;
  const collectionRate = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;
  
  // Calculate risk metrics
  const overdueCount = insuranceData.filter(contract => 
    contract.status !== 'Payé' && 
    new Date(contract.dateEmission) < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  ).length;
  
  const riskExposure = insuranceData.reduce((sum, contract) => {
    if (contract.status !== 'Payé') {
      const age = new Date().getTime() - new Date(contract.dateEmission).getTime();
      const ageInMonths = age / (30 * 24 * 60 * 60 * 1000);
      // Risk increases with age
      return sum + (contract.remainingAmount * (1 + ageInMonths / 12));
    }
    return sum;
  }, 0);
  
  // Status data for pie chart
  const statusCounts = insuranceData.reduce((acc: {[key: string]: number}, contract) => {
    acc[contract.status] = (acc[contract.status] || 0) + 1;
    return acc;
  }, {});
  
  const pieData = Object.entries(statusCounts).map(([status, count]) => ({
    name: status,
    value: count
  }));
  
  // Monthly data for bar chart
  const monthlyData = insuranceData.reduce((acc: {[key: string]: {total: number, paid: number}}, contract) => {
    const month = new Date(contract.dateEmission).getMonth();
    const monthName = new Date(0, month).toLocaleString('fr-FR', { month: 'short' });
    
    if (!acc[monthName]) {
      acc[monthName] = { total: 0, paid: 0 };
    }
    
    acc[monthName].total += contract.totalAmount;
    acc[monthName].paid += (contract.totalAmount - contract.remainingAmount);
    
    return acc;
  }, {});
  
  const barData = Object.entries(monthlyData).map(([month, data]) => ({
    month,
    total: data.total,
    paid: data.paid
  }));
  
  // Age analysis of contracts
  const ageData = [
    { name: '0-30 jours', count: 0, amount: 0 },
    { name: '31-60 jours', count: 0, amount: 0 },
    { name: '61-90 jours', count: 0, amount: 0 },
    { name: '91-180 jours', count: 0, amount: 0 },
    { name: '181+ jours', count: 0, amount: 0 }
  ];
  
  insuranceData.forEach(contract => {
    if (contract.status !== 'Payé') {
      const emissionDate = new Date(contract.dateEmission);
      const daysPassed = Math.floor((new Date().getTime() - emissionDate.getTime()) / (24 * 60 * 60 * 1000));
      
      let index;
      if (daysPassed <= 30) index = 0;
      else if (daysPassed <= 60) index = 1;
      else if (daysPassed <= 90) index = 2;
      else if (daysPassed <= 180) index = 3;
      else index = 4;
      
      ageData[index].count++;
      ageData[index].amount += contract.remainingAmount;
    }
  });
  
  // Colors for pie chart
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];
  
  return (
    <div className="space-y-8">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <FileUp className="h-4 w-4 text-[#004a80]" />
              Contrats Totaux
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalContracts}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Activity className="h-4 w-4 text-[#004a80]" />
              Montant Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAmount.toLocaleString('fr-FR')} DZD</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              Montant Restant
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{remainingAmount.toLocaleString('fr-FR')} DZD</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Taux de Recouvrement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{collectionRate.toFixed(1)}%</div>
          </CardContent>
        </Card>
      </div>
      
      {/* Risk Analysis Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-[#004a80]" />
              Contrats en Retard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overdueCount}</div>
            <p className="text-sm text-muted-foreground mt-1">
              {((overdueCount / totalContracts) * 100).toFixed(1)}% du total
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Exposition au Risque
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{riskExposure.toLocaleString('fr-FR')} DZD</div>
            <p className="text-sm text-muted-foreground mt-1">
              Basé sur l'âge et le montant restant
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[#004a80]" />
              Projection de Remboursement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Date(Date.now() + (remainingAmount / paidAmount) * 30 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR')}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Basé sur le taux de remboursement actuel
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Statut des Contrats</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} contrats`, '']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Montants par Mois</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => `${value.toLocaleString('fr-FR')} DZD`} />
                  <Legend />
                  <Bar dataKey="total" name="Montant Total" fill="#004a80" />
                  <Bar dataKey="paid" name="Montant Payé" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Age Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Analyse de l'Âge des Contrats Impayés</CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ageData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis yAxisId="left" orientation="left" stroke="#004a80" />
                <YAxis yAxisId="right" orientation="right" stroke="#FF8042" />
                <Tooltip formatter={(value, name) => {
                  if (name === "count") return [`${value} contrats`, "Nombre"];
                  return [`${Number(value).toLocaleString('fr-FR')} DZD`, "Montant"];
                }} />
                <Legend />
                <Bar yAxisId="left" dataKey="count" name="Nombre de Contrats" fill="#004a80" />
                <Bar yAxisId="right" dataKey="amount" name="Montant (DZD)" fill="#FF8042" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
