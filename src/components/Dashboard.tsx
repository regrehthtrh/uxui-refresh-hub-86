
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { insuranceStore } from "@/store/insuranceStore";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const Dashboard = () => {
  const { insuranceData } = insuranceStore();
  
  // Calculate statistics
  const totalContracts = insuranceData.length;
  const totalAmount = insuranceData.reduce((sum, contract) => sum + contract.totalAmount, 0);
  const remainingAmount = insuranceData.reduce((sum, contract) => sum + contract.remainingAmount, 0);
  const paidAmount = totalAmount - remainingAmount;
  
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
  
  // Colors for pie chart
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];
  
  return (
    <div className="space-y-8">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Contrats Totaux</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalContracts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Montant Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAmount.toLocaleString('fr-FR')} €</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Montant Restant</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{remainingAmount.toLocaleString('fr-FR')} €</div>
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
                  <Tooltip formatter={(value) => `${value.toLocaleString('fr-FR')} €`} />
                  <Legend />
                  <Bar dataKey="total" name="Montant Total" fill="#8884d8" />
                  <Bar dataKey="paid" name="Montant Payé" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
