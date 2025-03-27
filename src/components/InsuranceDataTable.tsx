
import React, { useState } from "react";
import { 
  Table, TableBody, TableCell, TableHead, 
  TableHeader, TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { insuranceStore } from "@/store/insuranceStore";
import { useToast } from "@/hooks/use-toast";
import { Copy, FileUp, RefreshCw, MoreHorizontal } from "lucide-react";

const InsuranceDataTable = () => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateSort, setDateSort] = useState("ascending");
  
  // This would be loaded from your store in a real implementation
  const [insuranceData, setInsuranceData] = useState<any[]>([]);
  
  const handleLoadCreanceFile = () => {
    toast({
      title: "File Upload",
      description: "Creance file has been loaded successfully.",
    });
  };
  
  const handleLoadRecouvrementFile = () => {
    toast({
      title: "File Upload",
      description: "Recouvrement file has been loaded successfully.",
    });
  };
  
  const handleResetData = () => {
    toast({
      title: "Data Reset",
      description: "All data has been reset successfully.",
    });
  };
  
  const handleResetFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setDateSort("ascending");
  };
  
  const handleCopyRow = (row: any) => {
    toast({
      title: "Copied",
      description: "Row data copied to clipboard.",
    });
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case "Payé": return "text-green-600";
      case "Partiellement payé": return "text-amber-500";
      case "Impayé": return "text-red-600";
      default: return "";
    }
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case "Payé": return "🟢";
      case "Partiellement payé": return "🟡";
      case "Impayé": return "🔴";
      default: return "";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between gap-4">
        <div className="flex gap-2">
          <Button onClick={handleLoadCreanceFile} className="flex items-center gap-2">
            <FileUp className="h-4 w-4" />
            Charger créance
          </Button>
          <Button onClick={handleLoadRecouvrementFile} className="flex items-center gap-2">
            <FileUp className="h-4 w-4" />
            Charger recouvrement
          </Button>
          <Button variant="secondary" onClick={handleResetData} className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Réinitialiser
          </Button>
        </div>
      </div>
      
      <div className="flex flex-wrap gap-4 items-center">
        <Input
          placeholder="Rechercher un client..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-xs"
        />
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Statut: Tous" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Statut: Tous</SelectItem>
            <SelectItem value="paid">Statut: Payé</SelectItem>
            <SelectItem value="partial">Statut: Partiellement payé</SelectItem>
            <SelectItem value="unpaid">Statut: Impayé</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={dateSort} onValueChange={setDateSort}>
          <SelectTrigger className="w-60">
            <SelectValue placeholder="Date d'émission: Croissant" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ascending">Date d'émission: Croissant</SelectItem>
            <SelectItem value="descending">Date d'émission: Décroissant</SelectItem>
          </SelectContent>
        </Select>
        
        <Button variant="outline" onClick={handleResetFilters} size="sm">
          Réinitialiser filtres
        </Button>
      </div>
      
      <Card>
        <CardHeader className="px-6 pt-6 pb-0">
          <CardTitle className="text-xl">Polices d'assurance</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-medium">N° Police</TableHead>
                  <TableHead className="font-medium">Assuré</TableHead>
                  <TableHead className="font-medium">Date d'émission</TableHead>
                  <TableHead className="font-medium">Net à Payer</TableHead>
                  <TableHead className="font-medium">Montant encaissé</TableHead>
                  <TableHead className="font-medium">Solde</TableHead>
                  <TableHead className="font-medium">Temps écoulé</TableHead>
                  <TableHead className="font-medium">Statut de paiement</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {insuranceData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-16 text-muted-foreground">
                      Aucune donnée disponible. Veuillez charger un fichier créance.
                    </TableCell>
                  </TableRow>
                ) : (
                  insuranceData.map((row, index) => (
                    <TableRow key={index}>
                      <TableCell>{row.contractNumber}</TableCell>
                      <TableCell>{row.clientName}</TableCell>
                      <TableCell>{row.dateEmission}</TableCell>
                      <TableCell>{row.totalAmount} DZD</TableCell>
                      <TableCell>{row.amountPaid} DZD</TableCell>
                      <TableCell>{row.remainingAmount} DZD</TableCell>
                      <TableCell className={row.status !== "Payé" ? "text-red-500" : ""}>
                        {row.timePassed}
                      </TableCell>
                      <TableCell className={getStatusColor(row.status)}>
                        {getStatusIcon(row.status)} {row.status}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleCopyRow(row)}>
                              <Copy className="mr-2 h-4 w-4" />
                              Copier la ligne
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      <Card className="bg-muted/40">
        <CardContent className="p-6">
          <div className="text-center">
            <p className="text-base font-medium">
              Statut global : 
              <span className="text-green-600 mx-1">🟢 0 Payé</span>,
              <span className="text-amber-500 mx-1">🟡 0 Partiellement payé</span>,
              <span className="text-red-600 mx-1">🔴 0 Impayé</span>
              (Total : 0)
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InsuranceDataTable;
