
import { create } from 'zustand';
import * as XLSX from 'xlsx';
import { format, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';

// Fonction utilitaire pour convertir les jours en format lisible (années, mois, jours)
const convertDaysToMonthsDays = (days: number): string => {
  if (isNaN(days)) return "";
  
  const years = Math.floor(days / 360);
  const remainingDays = days % 360;
  const months = Math.floor(remainingDays / 30);
  const remainingDaysAfterMonths = remainingDays % 30;
  
  const parts = [];
  
  if (years > 0) {
    parts.push(years === 1 ? "1 an" : `${years} ans`);
  }
  
  if (months > 0) {
    parts.push(`${months} mois`);
  }
  
  if (remainingDaysAfterMonths > 0) {
    parts.push(`${remainingDaysAfterMonths} jours`);
  }
  
  return parts.length > 0 ? parts.join(", ") : "";
};

// Fonction pour normaliser les noms de colonnes
const normalizeColumnName = (col: string): string => {
  if (typeof col !== 'string') return '';
  
  // Supprimer les accents
  const normalized = col
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  
  // Convertir en minuscules et remplacer les espaces par des underscores
  return normalized
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')
    .replace(/\xa0/g, '_');
};

// Fonction pour trouver la meilleure correspondance de colonne
const findBestColumnMatch = (columns: string[], possibleMatches: string[]): string | null => {
  // Vérification directe (correspondance exacte)
  for (const col of columns) {
    if (possibleMatches.some(match => match.toLowerCase() === col.toLowerCase())) {
      return col;
    }
  }
  
  // Normaliser les colonnes pour une recherche plus souple
  const normalizedColumns = columns.map(normalizeColumnName);
  
  // Recherche dans les colonnes normalisées
  for (let i = 0; i < columns.length; i++) {
    const col = columns[i];
    const normalizedCol = normalizedColumns[i];
    
    if (possibleMatches.some(match => normalizedCol.includes(match.toLowerCase()))) {
      return col;
    }
  }
  
  // Recherche inverse
  for (const match of possibleMatches) {
    for (let i = 0; i < columns.length; i++) {
      const col = columns[i];
      const normalizedCol = normalizedColumns[i];
      
      if (normalizedCol.includes(match.toLowerCase()) || 
          match.toLowerCase().includes(normalizedCol)) {
        return col;
      }
    }
  }
  
  // Recherche avec expression régulière
  for (const match of possibleMatches) {
    const pattern = new RegExp(`.*${match.toLowerCase()}.*`);
    for (let i = 0; i < columns.length; i++) {
      const normalizedCol = normalizedColumns[i];
      
      if (pattern.test(normalizedCol)) {
        return columns[i];
      }
    }
  }
  
  return null;
};

type InsuranceStatus = 'Payé' | 'Partiellement payé' | 'Impayé';

interface InsuranceData {
  contractNumber: string;
  clientName: string;
  dateEmission: string;
  totalAmount: number;
  amountPaid: number;
  remainingAmount: number;
  timePassed: string;
  status: InsuranceStatus;
}

interface EmailMapping {
  clientName: string;
  email: string;
}

interface InsuranceStore {
  insuranceData: InsuranceData[];
  emailMappings: EmailMapping[];
  loadCreanceFile: (file: File) => Promise<void>;
  loadRecouvrementFile: (file: File) => Promise<void>;
  resetData: () => void;
  loadEmailMapping: (file: File) => Promise<void>;
}

export const insuranceStore = create<InsuranceStore>((set, get) => ({
  insuranceData: [],
  emailMappings: [],
  
  loadCreanceFile: async (file) => {
    try {
      // Lire le fichier Excel
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: "A" });
      
      if (jsonData.length <= 1) {
        throw new Error("Fichier vide ou mal formaté");
      }
      
      // Obtenir les en-têtes
      const headers = jsonData[0] as Record<string, any>;
      const rows = jsonData.slice(1) as Record<string, any>[];
      
      // Mapper les colonnes
      const columnMatchers = {
        "Client Name": ["assure", "assuré", "client name", "client", "nom", "assure"],
        "Contract Number": ["no police", "no_police", "numero_police", "police", "contrat"],
        "Date Emission": ["emission", "date", "date_emission", "date d'emission"],
        "Total Amount Due": ["net a payer", "net à payer", "net_a_payer", "montant", "total"]
      };
      
      const columnMapping: Record<string, string> = {};
      const columnsArray = Object.keys(headers);
      
      for (const [targetField, possibleMatches] of Object.entries(columnMatchers)) {
        const bestMatch = findBestColumnMatch(
          columnsArray.map(key => String(headers[key])), 
          possibleMatches
        );
        
        if (bestMatch) {
          const headerKey = columnsArray.find(key => headers[key] === bestMatch);
          if (headerKey) {
            columnMapping[headerKey] = targetField;
          }
        }
      }
      
      // Vérifier que toutes les colonnes requises sont trouvées
      const mustHave = ["Client Name", "Contract Number", "Date Emission", "Total Amount Due"];
      const missing = mustHave.filter(field => !Object.values(columnMapping).includes(field));
      
      if (missing.length > 0) {
        throw new Error(`Colonnes manquantes: ${missing.join(", ")}`);
      }
      
      // Traiter les données
      const processedData: Partial<InsuranceData>[] = rows.map(row => {
        const result: Partial<InsuranceData> = {};
        
        for (const [excelCol, targetField] of Object.entries(columnMapping)) {
          const value = row[excelCol];
          
          switch(targetField) {
            case "Client Name":
            case "Contract Number":
              result[targetField.replace(/\s+/g, "").charAt(0).toLowerCase() + targetField.replace(/\s+/g, "").slice(1) as keyof InsuranceData] = 
                String(value || "");
              break;
            case "Date Emission":
              let dateValue;
              if (value instanceof Date) {
                dateValue = value;
              } else if (typeof value === 'number' && value > 10000) {
                // Excel date serial number
                dateValue = new Date(Math.round((value - 25569) * 86400 * 1000));
              } else if (typeof value === 'string' && value) {
                dateValue = new Date(value);
              } else {
                dateValue = new Date();
              }
              
              result.dateEmission = format(dateValue, 'yyyy-MM-dd');
              // Calculer le temps écoulé
              const daysPassed = differenceInDays(new Date(), dateValue);
              result.timePassed = convertDaysToMonthsDays(daysPassed);
              break;
            case "Total Amount Due":
              const amount = parseFloat(String(value).replace(/[^\d.-]/g, ""));
              result.totalAmount = isNaN(amount) ? 0 : amount;
              break;
          }
        }
        
        // Valeurs par défaut
        result.amountPaid = 0;
        result.remainingAmount = result.totalAmount || 0;
        result.status = 'Impayé';
        
        return result;
      });
      
      // Filtrer les données incomplètes
      const validData = processedData.filter(
        item => item.clientName && item.contractNumber && item.dateEmission && typeof item.totalAmount === 'number'
      ) as InsuranceData[];
      
      // Mettre à jour le store
      set(state => {
        const existingData = state.insuranceData || [];
        
        // Combiner avec les données existantes, en évitant les doublons par numéro de contrat
        const existingContractNumbers = new Set(existingData.map(item => item.contractNumber));
        const newItems = validData.filter(item => !existingContractNumbers.has(item.contractNumber));
        
        return { 
          insuranceData: [...existingData, ...newItems] 
        };
      });
      
    } catch (error) {
      console.error("Erreur lors du traitement du fichier de créance:", error);
      throw error;
    }
  },
  
  loadRecouvrementFile: async (file) => {
    try {
      // Lire le fichier Excel
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: "A" });
      
      if (jsonData.length <= 1) {
        throw new Error("Fichier vide ou mal formaté");
      }
      
      // Obtenir les en-têtes
      const headers = jsonData[0] as Record<string, any>;
      const rows = jsonData.slice(1) as Record<string, any>[];
      
      // Mapper les colonnes
      const columnMatchers = {
        "Client Name": ["assure", "assuré", "client name", "client", "nom", "assure"],
        "Contract Number": ["no police", "no_police", "numero_police", "police", "contrat"],
        "Amount Paid": ["montant_paye", "montant_payé", "amount_paid", "montant encaissé", "paid", "paiement"]
      };
      
      const columnMapping: Record<string, string> = {};
      const columnsArray = Object.keys(headers);
      
      for (const [targetField, possibleMatches] of Object.entries(columnMatchers)) {
        const bestMatch = findBestColumnMatch(
          columnsArray.map(key => String(headers[key])), 
          possibleMatches
        );
        
        if (bestMatch) {
          const headerKey = columnsArray.find(key => headers[key] === bestMatch);
          if (headerKey) {
            columnMapping[headerKey] = targetField;
          }
        }
      }
      
      // Vérifier que les colonnes requises sont trouvées
      const mustHave = ["Client Name", "Contract Number"];
      const missing = mustHave.filter(field => !Object.values(columnMapping).includes(field));
      
      if (missing.length > 0) {
        throw new Error(`Colonnes manquantes: ${missing.join(", ")}`);
      }
      
      // Traiter les données
      const paymentsData = rows.map(row => {
        const result: Record<string, any> = {};
        
        for (const [excelCol, targetField] of Object.entries(columnMapping)) {
          const value = row[excelCol];
          
          switch(targetField) {
            case "Client Name":
            case "Contract Number":
              result[targetField] = String(value || "");
              break;
            case "Amount Paid":
              const amount = parseFloat(String(value).replace(/[^\d.-]/g, ""));
              result[targetField] = isNaN(amount) ? 0 : amount;
              break;
          }
        }
        
        return result;
      });
      
      // Créer un map des paiements par numéro de contrat
      const paymentsByContract: Record<string, number> = {};
      
      paymentsData.forEach(payment => {
        if (payment["Contract Number"] && payment["Amount Paid"]) {
          const contractNumber = payment["Contract Number"];
          if (!paymentsByContract[contractNumber]) {
            paymentsByContract[contractNumber] = 0;
          }
          paymentsByContract[contractNumber] += payment["Amount Paid"];
        }
      });
      
      // Mettre à jour le store avec les informations de paiement
      set(state => {
        const updatedData = state.insuranceData.map(item => {
          const amountPaid = paymentsByContract[item.contractNumber] || 0;
          const remainingAmount = item.totalAmount - amountPaid;
          let status: InsuranceStatus = 'Impayé';
          
          if (amountPaid >= item.totalAmount) {
            status = 'Payé';
          } else if (amountPaid > 0) {
            status = 'Partiellement payé';
          }
          
          return {
            ...item,
            amountPaid,
            remainingAmount,
            status
          };
        });
        
        return { insuranceData: updatedData };
      });
      
    } catch (error) {
      console.error("Erreur lors du traitement du fichier de recouvrement:", error);
      throw error;
    }
  },
  
  resetData: () => {
    set({ insuranceData: [] });
  },
  
  loadEmailMapping: async (file) => {
    try {
      // Lire le fichier Excel
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      
      // Vérifier si le fichier contient les colonnes nécessaires
      const firstRow = jsonData[0] as Record<string, any>;
      
      if (!firstRow || !('Client Name' in firstRow) || !('Email' in firstRow)) {
        throw new Error("Le fichier de mapping doit contenir les colonnes 'Client Name' et 'Email'");
      }
      
      const emailMappings = jsonData.map(row => ({
        clientName: (row as any)['Client Name'] || '',
        email: (row as any)['Email'] || ''
      })).filter(item => item.clientName && item.email);
      
      set({ emailMappings });
      
    } catch (error) {
      console.error("Erreur lors du chargement du fichier de mapping:", error);
      throw error;
    }
  },
}));
