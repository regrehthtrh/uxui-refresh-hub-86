
import React, { useState, useRef, useMemo } from "react";
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
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { insuranceStore } from "@/store/insuranceStore";
import { useToast } from "@/hooks/use-toast";
import { Copy, FileUp, RefreshCw, MoreHorizontal, X, Loader2 } from "lucide-react";
import ConfirmResetDialog from "./ConfirmResetDialog";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis
} from "@/components/ui/pagination";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CheckIcon, ChevronsUpDown } from "lucide-react";
import AgencyFilter from "./AgencyFilter";

const ROWS_PER_PAGE = 100;

const InsuranceDataTable = () => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [codeAgenceFilter, setCodeAgenceFilter] = useState("all");
  const [dateSort, setDateSort] = useState("ascending");
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  
  const { 
    insuranceData,
    loadFile,
    resetData,
    lastUpdated,
    importSource
  } = insuranceStore();
  
  // Get unique agencies for the filter dropdown
  const uniqueAgencies = useMemo(() => {
    const agencies = new Set<string>();
    insuranceData.forEach(item => {
      if (item.codeAgence) {
        agencies.add(item.codeAgence);
      }
    });
    return Array.from(agencies).sort();
  }, [insuranceData]);
  
  const handleLoadFile = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    const maxSizeMB = 50;
    const fileSizeMB = files[0].size / (1024 * 1024);
    
    if (fileSizeMB > maxSizeMB) {
      toast({
        title: "Fichier trop volumineux",
        description: `Le fichier dépasse la limite de ${maxSizeMB} MB. Veuillez réduire sa taille.`,
        variant: "destructive"
      });
      
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
        description: `Le fichier a été chargé avec succès. ${insuranceData.length} enregistrements trouvés.`,
      });
      
      setCurrentPage(1);
    } catch (error: any) {
      console.error("Erreur lors du traitement du fichier:", error);
      
      toast({
        title: "Erreur",
        description: `Impossible de charger le fichier: ${error.message || "Veuillez vérifier le format"}`,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      if (event.target) event.target.value = "";
    }
  };
  
  const handleResetData = () => {
    resetData();
    setCurrentPage(1);
    toast({
      title: "Réinitialisation",
      description: "Toutes les données ont été réinitialisées avec succès.",
    });
  };
  
  const handleResetFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setCodeAgenceFilter("all");
    setDateSort("ascending");
    setCurrentPage(1);
    
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

  const formatContractNumber = (contractNumber: string) => {
    if (!contractNumber) {
      return <span className="text-muted-foreground italic">Non disponible</span>;
    }
    
    if (typeof contractNumber === 'string' && contractNumber.startsWith('Pas de N°')) {
      return <span className="text-muted-foreground italic">Non disponible</span>;
    }
    
    if (typeof contractNumber === 'string' && contractNumber.includes('/')) {
      return <span className="font-mono">{contractNumber}</span>;
    }
    
    return <span>{contractNumber}</span>;
  };

  const filteredData = insuranceData.filter(item => {
    // Text search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      
      const matchesClientName = item.clientName?.toLowerCase().includes(query);
      const matchesContractNumber = item.contractNumber?.toLowerCase().includes(query);
      
      if (!matchesClientName && !matchesContractNumber) return false;
    }
    
    // Status filter
    if (statusFilter !== "all") {
      const statusMapping: Record<string, string> = {
        "paid": "Recouvré",
        "partial": "Partiellement recouvré",
        "unpaid": "Créance"
      };
      if (item.status !== statusMapping[statusFilter]) return false;
    }
    
    // Code agence filter
    if (codeAgenceFilter !== "all") {
      if (item.codeAgence !== codeAgenceFilter) return false;
    }
    
    return true;
  });

  const sortedData = [...filteredData].sort((a, b) => {
    const dateA = new Date(a.dateEmission).getTime();
    const dateB = new Date(b.dateEmission).getTime();
    
    return dateSort === "ascending" 
      ? dateA - dateB
      : dateB - dateA;
  });
  
  const totalPages = Math.ceil(sortedData.length / ROWS_PER_PAGE);
  
  const startIndex = (currentPage - 1) * ROWS_PER_PAGE;
  const paginatedData = sortedData.slice(startIndex, startIndex + ROWS_PER_PAGE);
  
  const getPageNumbers = () => {
    const pageNumbers = [];
    
    pageNumbers.push(1);
    
    const rangeStart = Math.max(2, currentPage - 2);
    const rangeEnd = Math.min(totalPages - 1, currentPage + 2);
    
    if (rangeStart > 2) {
      pageNumbers.push('ellipsis1');
    }
    
    for (let i = rangeStart; i <= rangeEnd; i++) {
      pageNumbers.push(i);
    }
    
    if (rangeEnd < totalPages - 1 && totalPages > 1) {
      pageNumbers.push('ellipsis2');
    }
    
    if (totalPages > 1 && !pageNumbers.includes(totalPages)) {
      pageNumbers.push(totalPages);
    }
    
    return pageNumbers;
  };
  
  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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
        
        {lastUpdated && (
          <div className="text-sm text-muted-foreground">
            Dernière mise à jour: <span className="font-medium">{lastUpdated}</span>
            {importSource && (
              <span className="ml-1">({importSource})</span>
            )}
          </div>
        )}
      </div>
      
      <div className="flex flex-wrap gap-4 items-center">
        <Input
          placeholder="Rechercher par client ou police..."
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
            <SelectValue placeholder="Date d'effet: Croissant" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ascending">Date d'effet: Croissant</SelectItem>
            <SelectItem value="descending">Date d'effet: Décroissant</SelectItem>
          </SelectContent>
        </Select>
        
        {/* Agency filter with search */}
        <AgencyFilter 
          agencies={uniqueAgencies}
          value={codeAgenceFilter}
          onValueChange={setCodeAgenceFilter}
        />
        
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
                  paginatedData.map((row, index) => (
                    <TableRow key={index}>
                      <TableCell className="text-center font-medium text-muted-foreground">
                        {startIndex + index + 1}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium whitespace-nowrap overflow-visible">
                          {formatContractNumber(row.contractNumber)}
                        </div>
                      </TableCell>
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
          
          {totalPages > 1 && !isLoading && (
            <div className="mt-4 flex justify-center">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => handlePageChange(currentPage - 1)}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                      aria-disabled={currentPage === 1}
                    />
                  </PaginationItem>
                  
                  {getPageNumbers().map((pageNumber, i) => (
                    <PaginationItem key={i}>
                      {pageNumber === 'ellipsis1' || pageNumber === 'ellipsis2' ? (
                        <PaginationEllipsis />
                      ) : (
                        <PaginationLink
                          isActive={currentPage === pageNumber}
                          onClick={() => typeof pageNumber === 'number' && handlePageChange(pageNumber)}
                        >
                          {pageNumber}
                        </PaginationLink>
                      )}
                    </PaginationItem>
                  ))}
                  
                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => handlePageChange(currentPage + 1)}
                      className={currentPage === totalPages || totalPages === 0 ? "pointer-events-none opacity-50" : ""}
                      aria-disabled={currentPage === totalPages || totalPages === 0}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
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
            {totalPages > 1 && (
              <p className="text-sm text-muted-foreground mt-1">
                Affichage de {Math.min(ROWS_PER_PAGE, sortedData.length - startIndex)} lignes sur {totalCount} ({currentPage} sur {totalPages} pages)
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InsuranceDataTable;
