
import { create } from 'zustand';
import * as XLSX from 'xlsx';
import { format, differenceInDays } from 'date-fns';
import { persist } from 'zustand/middleware';

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

interface SentEmailRecord {
  contractNumber: string;
  emailSent: boolean;
  sentAt?: string;
}

interface InsuranceStore {
  insuranceData: InsuranceData[];
  emailMappings: EmailMapping[];
  sentEmails: SentEmailRecord[];
  loadFile: (file: File) => Promise<void>;
  resetData: () => void;
  loadEmailMapping: (file: File) => Promise<void>;
  sendEmail: (emailAccount: string, emailTemplate: string, contactInfo: string, reminderPeriod: number, automatic: boolean) => void;
  getEmailsSent: () => SentEmailRecord[];
  getTopDebtors: (count: number) => {clientName: string, remainingAmount: number}[];
}

export const insuranceStore = create<InsuranceStore>()(
  persist(
    (set, get) => ({
      insuranceData: [],
      emailMappings: [],
      sentEmails: [],
      
      loadFile: async (file) => {
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
            "Total Amount Due": ["net a payer", "net à payer", "net_a_payer", "montant", "total"],
            "Amount Paid": ["montant_paye", "montant_payé", "amount_paid", "montant encaissé", "paid", "paiement"],
            "Remaining Amount": ["solde", "reste", "remaining", "restant", "remaining amount"]
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
                case "Amount Paid":
                  const paid = parseFloat(String(value).replace(/[^\d.-]/g, ""));
                  result.amountPaid = isNaN(paid) ? 0 : paid;
                  break;
                case "Remaining Amount":
                  const remaining = parseFloat(String(value).replace(/[^\d.-]/g, ""));
                  result.remainingAmount = isNaN(remaining) ? 0 : remaining;
                  break;
              }
            }
            
            // Calculs et valeurs par défaut
            if (result.totalAmount === undefined && result.amountPaid !== undefined && result.remainingAmount !== undefined) {
              result.totalAmount = (result.amountPaid || 0) + (result.remainingAmount || 0);
            }
            
            if (result.amountPaid === undefined && result.totalAmount !== undefined && result.remainingAmount !== undefined) {
              result.amountPaid = (result.totalAmount || 0) - (result.remainingAmount || 0);
            }
            
            if (result.remainingAmount === undefined && result.totalAmount !== undefined && result.amountPaid !== undefined) {
              result.remainingAmount = (result.totalAmount || 0) - (result.amountPaid || 0);
            }
            
            // Déterminer le statut
            if (result.remainingAmount !== undefined && result.totalAmount !== undefined) {
              if (result.remainingAmount <= 0) {
                result.status = 'Payé';
              } else if (result.remainingAmount < result.totalAmount) {
                result.status = 'Partiellement payé';
              } else {
                result.status = 'Impayé';
              }
            } else {
              result.status = 'Impayé';
            }
            
            return result;
          });
          
          // Filtrer les données incomplètes
          const validData = processedData.filter(
            item => item.clientName && item.contractNumber && item.dateEmission && 
                   typeof item.totalAmount === 'number' && typeof item.remainingAmount === 'number'
          ) as InsuranceData[];
          
          // Mettre à jour le store - si un contrat existe déjà, mettre à jour ses valeurs
          set(state => {
            const existingData = [...state.insuranceData];
            const existingContractMap = new Map<string, number>();
            
            // Créer un map des contrats existants avec leur index dans le tableau
            existingData.forEach((item, index) => {
              existingContractMap.set(item.contractNumber, index);
            });
            
            // Mettre à jour ou ajouter les données
            validData.forEach(newItem => {
              if (existingContractMap.has(newItem.contractNumber)) {
                // Mettre à jour le contrat existant
                const index = existingContractMap.get(newItem.contractNumber)!;
                existingData[index] = {
                  ...existingData[index],
                  remainingAmount: newItem.remainingAmount,
                  amountPaid: newItem.amountPaid || existingData[index].amountPaid,
                  status: newItem.status
                };
              } else {
                // Ajouter le nouveau contrat
                existingData.push(newItem);
              }
            });
            
            return { insuranceData: existingData };
          });
          
        } catch (error) {
          console.error("Erreur lors du traitement du fichier:", error);
          throw error;
        }
      },
      
      resetData: () => {
        set({ insuranceData: [], emailMappings: [], sentEmails: [] });
        localStorage.removeItem('sentEmails');
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
          
          // Extraire les données uniques (eviter les doublons)
          const seenEmails = new Set<string>();
          const emailMappings = jsonData
            .map(row => ({
              clientName: (row as any)['Client Name'] || '',
              email: (row as any)['Email'] || ''
            }))
            .filter(item => {
              if (item.clientName && item.email && !seenEmails.has(item.email)) {
                seenEmails.add(item.email);
                return true;
              }
              return false;
            });
          
          set({ emailMappings });
          
        } catch (error) {
          console.error("Erreur lors du chargement du fichier de mapping:", error);
          throw error;
        }
      },
      
      sendEmail: (emailAccount, emailTemplate, contactInfo, reminderPeriod, automatic) => {
        const { insuranceData, emailMappings } = get();
        
        // Filtrer les contrats en retard selon la période définie (en jours)
        const now = new Date();
        const overdueContracts = insuranceData.filter(contract => {
          if (contract.status === 'Payé') return false;
          
          const emissionDate = new Date(contract.dateEmission);
          const daysPassed = differenceInDays(now, emissionDate);
          return daysPassed >= reminderPeriod;
        });
        
        console.log(`Envoi d'emails pour ${overdueContracts.length} contrats en retard`);
        
        // Get existing sent emails from localStorage
        const sentEmailsData = localStorage.getItem('sentEmails');
        const existingSentEmails: SentEmailRecord[] = sentEmailsData 
          ? JSON.parse(sentEmailsData) 
          : [];
        
        // Make a copy for updates
        const updatedSentEmails = [...existingSentEmails];
        
        // Simulation d'envoi d'emails
        overdueContracts.forEach(contract => {
          // Trouver l'email correspondant au client
          const clientMapping = emailMappings.find(mapping => 
            mapping.clientName.toLowerCase() === contract.clientName.toLowerCase()
          );
          
          if (!clientMapping || !clientMapping.email) {
            console.log(`Pas d'email trouvé pour: ${contract.clientName}`);
            return;
          }
          
          // Générer le contenu de l'email
          const emailContent = emailTemplate
            .replace(/{clientName}/g, contract.clientName)
            .replace(/{contractNumber}/g, contract.contractNumber)
            .replace(/{remainingAmount}/g, contract.remainingAmount.toString())
            .replace(/{timePassed}/g, contract.timePassed)
            .replace(/{contactInfo}/g, contactInfo || "[Coordonnées de contact]");
          
          console.log(`Email envoyé à: ${clientMapping.email}`);
          console.log(`Contenu: ${emailContent}`);
          
          // Ajouter à la liste des emails envoyés
          if (!updatedSentEmails.some(item => item.contractNumber === contract.contractNumber)) {
            updatedSentEmails.push({
              contractNumber: contract.contractNumber,
              emailSent: true,
              sentAt: new Date().toISOString()
            });
          }
        });
        
        // Sauvegarder dans localStorage and update state
        localStorage.setItem('sentEmails', JSON.stringify(updatedSentEmails));
        set({ sentEmails: updatedSentEmails });
        
        // Si l'option automatique est activée, nous configurerions ici un intervalle 
        // pour envoyer périodiquement des emails (simulé pour cette démo)
        if (automatic) {
          console.log(`Emails automatiques configurés pour être envoyés tous les ${reminderPeriod / 30} mois`);
        }
      },
      
      getEmailsSent: () => {
        // Get emails from state first
        const { sentEmails } = get();
        if (sentEmails.length > 0) {
          return sentEmails;
        }
        
        // If not in state, try localStorage
        const sentEmailsData = localStorage.getItem('sentEmails');
        if (!sentEmailsData) return [];
        
        try {
          const parsedEmails = JSON.parse(sentEmailsData) as SentEmailRecord[];
          // Update state with emails from localStorage
          set({ sentEmails: parsedEmails });
          return parsedEmails;
        } catch (error) {
          console.error("Erreur lors de la récupération des emails envoyés:", error);
          return [];
        }
      },
      
      // Nouvelle fonction pour obtenir les 5 plus grands débiteurs
      getTopDebtors: (count = 5) => {
        const { insuranceData } = get();
        
        // Filtrer les contrats impayés ou partiellement payés
        const debtors = insuranceData
          .filter(item => item.status !== 'Payé')
          .map(item => ({
            clientName: item.clientName,
            remainingAmount: item.remainingAmount
          }))
          // Trier par montant restant décroissant
          .sort((a, b) => b.remainingAmount - a.remainingAmount)
          // Prendre les N premiers
          .slice(0, count);
        
        return debtors;
      }
    }),
    {
      name: 'insurance-storage',
      partialize: (state) => ({
        insuranceData: state.insuranceData,
        emailMappings: state.emailMappings,
        sentEmails: state.sentEmails
      })
    }
  )
);
