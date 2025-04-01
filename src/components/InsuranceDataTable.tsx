
import React, { useState, useRef } from "react";
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
import { Copy, FileUp, RefreshCw, MoreHorizontal, X, Loader2 } from "lucide-react";
import ConfirmResetDialog from "./ConfirmResetDialog";

const InsuranceDataTable = () => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateSort, setDateSort] = useState("none");
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { 
    insuranceData,
    loadFile,
    resetData,
  } = insuranceStore();
  
  const handleLoadFile = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    // Vérification de la taille du fichier
    const maxSizeMB = 20; // Limite de 20 MB
    const fileSizeMB = files[0].size / (1024 * 1024);
    
    if (fileSizeMB > maxSizeMB) {
      toast({
        title: "Fichier trop volumineux",
        description: `Le fichier dépasse la limite de ${maxSizeMB} MB. Veuillez réduire sa taille.`,
        variant: "destructive"
      });
      
      // Reset the input value so the same file can be loaded again if needed
      if (event.target) event.target.value = "";
      return;
    }
    
    setIsLoading(true);
    
    try {
      toast({
        title: "Chargement en cours",
        description: "Traitement du fichier Excel, veuillez patienter...",
      });
      
      await loadFile(files[0]);
      
      toast({
        title: "Chargement réussi",
        description: "Le fichier a été chargé avec succès.",
      });
    } catch (error: any) {
      console.error("Erreur lors du traitement du fichier:", error);
      
      toast({
        title: "Erreur",
        description: `Impossible de charger le fichier: ${error.message || "Veuillez vérifier le format"}`,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      // Reset the input value so the same file can be loaded again if needed
      if (event.target) event.target.value = "";
    }
  };
  
  const handleResetData = () => {
    resetData();
    toast({
      title: "Réinitialisation",
      description: "Toutes les données ont été réinitialisées avec succès.",
    });
  };
  
  const handleResetFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setDateSort("none");
    
    toast({
      title: "Filtres réinitialisés",
      description: "Tous les filtres ont été réinitialisés.",
    });
  };
  
  const handleCopyRow = (row: any) => {
    const rowText = Object.values(row).join("\t");
    navigator.clipboard.writeText(rowText);
    toast({
      title: "Copié",
      description: "Les données de la ligne ont été copiées dans le presse-papiers.",
    });
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case "Recouvré": return "text-green-600";
      case "Partiellement recouvré": return "text-amber-500";
      case "Créance": return "text-red-600";
      default: return "";
    }
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case "Recouvré": return "🟢";
      case "Partiellement recouvré": return "🟡";
      case "Créance": return "🔴";
      default: return "";
    }
  };

  // Appliquer les filtres sur les données
  const filteredData = insuranceData.filter(item => {
    // Filtre de recherche
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      
      // Improved search functionality to check multiple fields (case insensitive)
      const matchesClientName = item.clientName?.toLowerCase().includes(query);
      const matchesContractNumber = item.contractNumber?.toLowerCase().includes(query);
      const matchesCodeAgence = item.codeAgence?.toLowerCase().includes(query);
      
      if (!matchesClientName && !matchesContractNumber && !matchesCodeAgence) return false;
    }
    
    // Filtre de statut
    if (statusFilter !== "all") {
      const statusMapping: Record<string, string> = {
        "paid": "Recouvré",
        "partial": "Partiellement recouvré",
        "unpaid": "Créance"
      };
      if (item.status !== statusMapping[statusFilter]) return false;
    }
    
    return true;
  });

  // Tri par date (si nécessaire)
  const sortedData = [...filteredData].sort((a, b) => {
    if (dateSort === "none") {
      // Garder l'ordre original du fichier Excel
      return 0;
    }
    
    const dateA = new Date(a.dateEmission).getTime();
    const dateB = new Date(b.dateEmission).getTime();
    
    return dateSort === "ascending" 
      ? dateA - dateB
      : dateB - dateA;
  });

  // Statistiques pour l'affichage du résumé
  const paidCount = filteredData.filter(item => item.status === "Recouvré").length;
  const partialCount = filteredData.filter(item => item.status === "Partiellement recouvré").length;
  const unpaidCount = filteredData.filter(item => item.status === "Créance").length;
  const totalCount = filteredData.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".xlsx,.xls"
            className="hidden"
          />
          <Button 
            onClick={handleLoadFile} 
            className="flex items-center gap-2"
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileUp className="h-4 w-4" />
            )}
            {isLoading ? "Chargement..." : "Charger Fichier"}
          </Button>
          
          <ConfirmResetDialog onConfirm={handleResetData}>
            <Button variant="secondary" className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Réinitialiser
            </Button>
          </ConfirmResetDialog>
        </div>
      </div>
      
      <div className="flex flex-wrap gap-4 items-center">
        <Input
          placeholder="Rechercher par client, police ou code agence..."
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
            <SelectItem value="paid">Statut: Recouvré</SelectItem>
            <SelectItem value="partial">Statut: Partiellement recouvré</SelectItem>
            <SelectItem value="unpaid">Statut: Créance</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={dateSort} onValueChange={setDateSort}>
          <SelectTrigger className="w-60">
            <SelectValue placeholder="Ordre original" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Ordre original</SelectItem>
            <SelectItem value="ascending">Date d'effet: Croissant</SelectItem>
            <SelectItem value="descending">Date d'effet: Décroissant</SelectItem>
          </SelectContent>
        </Select>
        
        <Button variant="outline" onClick={handleResetFilters} size="sm" className="flex items-center gap-1">
          <X className="h-4 w-4" />
          Réinitialiser filtres
        </Button>
      </div>
      
      <Card>
        <CardContent className="p-6">
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">#</TableHead>
                  <TableHead>Police N°</TableHead>
                  <TableHead className="max-w-48">Assuré</TableHead>
                  <TableHead>Code Agence</TableHead>
                  <TableHead>Date D'effet</TableHead>
                  <TableHead>Date D'échéance</TableHead>
                  <TableHead>TTC</TableHead>
                  <TableHead>Montant encaissé</TableHead>
                  <TableHead>Créances</TableHead>
                  <TableHead>Temps écoulé</TableHead>
                  <TableHead>Statut de paiement</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-16">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-muted-foreground">Chargement des données...</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : sortedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-16 text-muted-foreground">
                      Aucune donnée disponible. Veuillez charger un fichier.
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedData.map((row, index) => (
                    <TableRow key={index}>
                      <TableCell className="text-center font-medium text-muted-foreground">
                        {index + 1}
                      </TableCell>
                      <TableCell>{row.contractNumber}</TableCell>
                      <TableCell className="max-w-48">
                        <div className="truncate" title={row.clientName}>
                          {row.clientName}
                        </div>
                      </TableCell>
                      <TableCell>{row.codeAgence}</TableCell>
                      <TableCell>{row.dateEmission}</TableCell>
                      <TableCell>{row.dateEcheance}</TableCell>
                      <TableCell>{row.totalAmount.toLocaleString()} DZD</TableCell>
                      <TableCell>{row.amountPaid.toLocaleString()} DZD</TableCell>
                      <TableCell>{row.remainingAmount.toLocaleString()} DZD</TableCell>
                      <TableCell className={row.status !== "Recouvré" ? "text-red-500" : ""}>
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
              <span className="text-green-600 mx-1">🟢 {paidCount} Recouvré</span>,
              <span className="text-amber-500 mx-1">🟡 {partialCount} Partiellement recouvré</span>,
              <span className="text-red-600 mx-1">🔴 {unpaidCount} Créance</span>
              (Total : {totalCount})
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InsuranceDataTable;
