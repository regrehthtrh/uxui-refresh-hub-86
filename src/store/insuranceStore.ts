
import { create } from 'zustand';

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

export const insuranceStore = create<InsuranceStore>((set) => ({
  insuranceData: [],
  emailMappings: [],
  
  loadCreanceFile: async (file) => {
    // In a real implementation, this would process the Excel file
    // For now, just simulate loading data
    console.log("Loading creance file:", file.name);
    set({ 
      insuranceData: [] // Replace with actual processed data
    });
  },
  
  loadRecouvrementFile: async (file) => {
    // In a real implementation, this would process the Excel file
    console.log("Loading recouvrement file:", file.name);
    // Process and update insurance data with payment info
  },
  
  resetData: () => {
    set({ insuranceData: [] });
  },
  
  loadEmailMapping: async (file) => {
    // In a real implementation, this would process the Excel file
    console.log("Loading email mapping file:", file.name);
    set({ 
      emailMappings: [] // Replace with actual processed data
    });
  },
}));
