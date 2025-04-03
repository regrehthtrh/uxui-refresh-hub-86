import { create } from "zustand";
import * as XLSX from "xlsx";
import { differenceInDays, parse, format, isValid } from "date-fns";
import { fr } from 'date-fns/locale';

// Define the structure of our insurance data
export interface InsuranceRecord {
  contractNumber: string;
  clientName: string;
  codeAgence: string;
  dateEmission: string;
  dateEcheance: string;
  totalAmount: number;
  amountPaid: number;
  remainingAmount: number;
  timePassed: string;
  status: string;
}

// Define column mappings (Excel column names to our data structure)
interface ColumnMapping {
  contractNumber: string[];
  clientName: string[];
  codeAgence: string[];
  dateEmission: string[];
  dateEcheance: string[];
  amountFields: {
    totalAmount: string[];
    amountPaid: string[];
    remainingAmount: string[];
  };
}

// Helper function to parse date from string in specific formats
const parseDate = (dateStr: string | number): Date | null => {
  // Handle Excel's numeric dates
  if (typeof dateStr === 'number') {
    // Convert Excel serial date to JavaScript Date
    const excelDate = new Date(Math.round((dateStr - 25569) * 86400 * 1000));
    if (isValid(excelDate)) {
      return excelDate;
    }
  }
  
  if (typeof dateStr !== 'string' || !dateStr) {
    return null;
  }

  // Try multiple common date formats
  const dateFormats = [
    'dd/MM/yyyy',
    'yyyy-MM-dd',
    'MM/dd/yyyy',
    'dd-MM-yyyy',
    'dd.MM.yyyy',
    'yyyy/MM/dd'
  ];

  for (const dateFormat of dateFormats) {
    const date = parse(dateStr, dateFormat, new Date());
    if (isValid(date)) {
      return date;
    }
  }
  
  return null;
};

// Helper function to format dates consistently
const formatDate = (date: Date | null): string => {
  if (!date || !isValid(date)) return "Date inconnue";
  
  return format(date, 'dd/MM/yyyy', { locale: fr });
};

// Helper function to calculate time passed in days between dates
const getTimePassed = (startDate: Date | null, endDate: Date | null): string => {
  if (!startDate || !endDate || !isValid(startDate) || !isValid(endDate)) {
    return "Période inconnue";
  }
  
  const days = differenceInDays(endDate, startDate);
  
  if (days < 0) {
    return `${Math.abs(days)} jours dépassés`;
  } else if (days === 0) {
    return "Aujourd'hui";
  } else {
    return `${days} jours restants`;
  }
};

// Helper function to calculate payment status
const calculatePaymentStatus = (totalAmount: number, amountPaid: number): string => {
  if (amountPaid >= totalAmount) {
    return "Recouvré";
  } else if (amountPaid > 0) {
    return "Partiellement recouvré";
  } else {
    return "Créance";
  }
};

// Helper to normalize numeric values
const normalizeNumber = (value: any): number => {
  if (typeof value === 'number') return value;
  
  if (typeof value === 'string') {
    // Remove any non-numeric characters except for decimal point
    const numStr = value.replace(/[^0-9.,]/g, '').replace(',', '.');
    const parsed = parseFloat(numStr);
    return isNaN(parsed) ? 0 : parsed;
  }
  
  return 0;
};

// Helper to handle contract numbers in different formats
const cleanContractNumber = (contractNumber: any): string => {
  // Handle null or undefined
  if (contractNumber === null || contractNumber === undefined) {
    return "Pas de N°";
  }
  
  // If it's already a string
  if (typeof contractNumber === 'string') {
    // Trim any whitespace
    const trimmed = contractNumber.trim();
    
    // If empty after trimming
    if (trimmed === '') {
      return "Pas de N°";
    }
    
    // Return the trimmed string as-is to preserve all formats
    return trimmed;
  }
  
  // If it's a number, convert to string
  if (typeof contractNumber === 'number') {
    return String(contractNumber);
  }
  
  // For any other type, try converting to string
  try {
    return String(contractNumber);
  } catch (e) {
    console.error("Failed to convert contract number to string:", contractNumber);
  }
  
  // Return the cleaned contract number
  return "Pas de N°";
};

// Define the store
export interface InsuranceStore {
  insuranceData: InsuranceRecord[];
  isLoading: boolean;
  loadFile: (file: File) => Promise<void>;
  resetData: () => void;
}

// Function to detect column mappings based on headers
const detectColumnMapping = (headers: string[]): ColumnMapping => {
  // Default mapping structure
  const mapping: ColumnMapping = {
    contractNumber: [],
    clientName: [],
    codeAgence: [],
    dateEmission: [],
    dateEcheance: [],
    amountFields: {
      totalAmount: [],
      amountPaid: [],
      remainingAmount: []
    }
  };
  
  // Mapping rules: keywords that might appear in column headers
  const rules = {
    contractNumber: ["police", "n°", "numero", "numéro", "contrat", "no", "contract"],
    clientName: ["assuré", "assure", "client", "nom", "souscripteur", "name"],
    codeAgence: ["agence", "code agence", "numag", "num ag", "agency"],
    dateEmission: ["date d'effet", "effet", "emission", "émission", "start date", "date début"],
    dateEcheance: ["échéance", "echeance", "fin", "end date", "date fin", "expiry"],
    totalAmount: ["prime ttc", "ttc", "prime", "total", "montant total", "amount due"],
    amountPaid: ["encaissé", "encaisse", "payé", "paye", "reglé", "regle", "paid", "payment"],
    remainingAmount: ["reste", "créance", "creance", "solde", "impayé", "impaye", "outstanding", "remaining"]
  };
  
  // Loop through each header and check against our rules
  headers.forEach((header, index) => {
    if (!header) return;
    
    const headerLower = header.toString().toLowerCase();
    
    // Check for each field
    for (const [field, keywords] of Object.entries(rules)) {
      if (keywords.some(keyword => headerLower.includes(keyword))) {
        if (field === 'totalAmount' || field === 'amountPaid' || field === 'remainingAmount') {
          // For amount fields
          mapping.amountFields[field as keyof typeof mapping.amountFields].push(header);
        } else {
          // For other fields
          mapping[field as keyof Omit<ColumnMapping, 'amountFields'>].push(header);
        }
      }
    }
  });
  
  return mapping;
};

// Function to extract values from a row using our mappings
const extractValue = (row: Record<string, any>, fieldMappings: string[], defaultValue: any = null): any => {
  for (const field of fieldMappings) {
    if (field in row && row[field] !== undefined && row[field] !== null) {
      return row[field];
    }
  }
  return defaultValue;
};

// Initialize the store
export const insuranceStore = create<InsuranceStore>((set) => ({
  insuranceData: [],
  isLoading: false,
  
  loadFile: async (file: File) => {
    set({ isLoading: true });
    
    try {
      // Read the file as an array buffer
      const buffer = await file.arrayBuffer();
      
      // Parse the Excel file
      const workbook = XLSX.read(buffer, { type: 'array' });
      
      // Get the first sheet name
      const firstSheetName = workbook.SheetNames[0];
      
      // Get the first sheet
      const worksheet = workbook.Sheets[firstSheetName];
      
      // Convert the sheet to JSON
      const data = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
      
      if (data.length === 0) {
        throw new Error("Aucune donnée trouvée dans le fichier Excel");
      }
      
      // Get the headers from the first row
      const headers = Object.keys(data[0]);
      
      // Detect column mappings based on headers
      const columnMapping = detectColumnMapping(headers);
      
      console.log("Detected column mappings:", columnMapping);
      
      // Process the data rows
      const processedData: InsuranceRecord[] = [];
      
      data.forEach((row: Record<string, any>) => {
        try {
          // Initialize a result object
          const result: InsuranceRecord = {
            contractNumber: "Pas de N°",
            clientName: "Non renseigné",
            codeAgence: "Non renseigné",
            dateEmission: "Non renseignée",
            dateEcheance: "Non renseignée",
            totalAmount: 0,
            amountPaid: 0,
            remainingAmount: 0,
            timePassed: "Non calculé",
            status: "Créance"
          };
          
          // Process each field, with a broader approach to finding contract numbers
          
          // Try to find contract number in any field if specific mapping doesn't work
          let foundContractNumber = false;
          
          // First check the mapped columns
          for (const excelCol of columnMapping.contractNumber) {
            if (excelCol in row) {
              const rawValue = row[excelCol];
              if (rawValue !== null && rawValue !== undefined && rawValue !== '') {
                result.contractNumber = cleanContractNumber(rawValue);
                foundContractNumber = true;
                break;
              }
            }
          }
          
          // If no contract number found yet, try to find it in any field containing relevant text
          if (!foundContractNumber) {
            for (const key in row) {
              const value = row[key];
              const keyLower = key.toLowerCase();
              if (
                (keyLower.includes('police') || keyLower.includes('contrat') || keyLower.includes('numero')) &&
                value !== null && value !== undefined && value !== ''
              ) {
                result.contractNumber = cleanContractNumber(value);
                foundContractNumber = true;
                break;
              }
            }
          }
          
          // Handle client name
          let hasClientName = false;
          for (const excelCol of columnMapping.clientName) {
            if (excelCol in row && row[excelCol]) {
              result.clientName = String(row[excelCol]).trim();
              hasClientName = true;
              break;
            }
          }
          
          // Try harder to find client name if not found yet
          if (!hasClientName) {
            for (const key in row) {
              const keyLower = key.toLowerCase();
              if ((keyLower.includes('client') || keyLower.includes('assuré') || keyLower.includes('nom')) && row[key] && typeof row[key] === 'string') {
                result.clientName = row[key].trim();
                hasClientName = true;
                break;
              }
            }
          }
          
          // Only skip if both are missing
          if (!foundContractNumber && !hasClientName) {
            console.warn("Skipping row without contract number and client name", row);
            return;
          }
          
          // Extract code agence with broader search
          const codeAgence = extractValue(row, columnMapping.codeAgence, "");
          result.codeAgence = codeAgence ? String(codeAgence) : "Non renseigné";
          
          if (!result.codeAgence || result.codeAgence === "Non renseigné") {
            // Try to find code agence in any field
            for (const key in row) {
              const keyLower = key.toLowerCase();
              if ((keyLower.includes('agence') || keyLower.includes('agency') || keyLower.includes('ag')) && row[key] && row[key] !== '') {
                result.codeAgence = String(row[key]);
                break;
              }
            }
          }
          
          // Parse dates
          const emissionDateRaw = extractValue(row, columnMapping.dateEmission);
          const echeanceDateRaw = extractValue(row, columnMapping.dateEcheance);
          
          const emissionDate = parseDate(emissionDateRaw);
          const echeanceDate = parseDate(echeanceDateRaw);
          
          result.dateEmission = formatDate(emissionDate);
          result.dateEcheance = formatDate(echeanceDate);
          
          // Calculate time passed
          result.timePassed = getTimePassed(new Date(), echeanceDate);
          
          // Handle amounts
          const totalAmount = normalizeNumber(extractValue(row, columnMapping.amountFields.totalAmount, 0));
          const amountPaid = normalizeNumber(extractValue(row, columnMapping.amountFields.amountPaid, 0));
          
          result.totalAmount = totalAmount;
          result.amountPaid = amountPaid;
          result.remainingAmount = Math.max(0, totalAmount - amountPaid);
          
          // Calculate payment status
          result.status = calculatePaymentStatus(totalAmount, amountPaid);
          
          processedData.push(result);
        } catch (rowError) {
          console.error("Error processing row:", rowError, row);
        }
      });
      
      // Update the store with the processed data
      set({ insuranceData: processedData, isLoading: false });
      
      console.log(`Processed ${processedData.length} records from Excel file`);
    } catch (error) {
      set({ isLoading: false });
      console.error("Error processing Excel file:", error);
      throw error;
    }
  },
  
  resetData: () => {
    set({ insuranceData: [] });
  }
}));
