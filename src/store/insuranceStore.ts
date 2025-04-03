import { create } from 'zustand';
import * as XLSX from 'xlsx';
import { format, differenceInDays, isValid } from 'date-fns';
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

// Safe date format function to prevent "Invalid time value" errors
const safeFormatDate = (date: Date | null): string => {
  if (!date || !isValid(date)) {
    return "";
  }
  try {
    return format(date, 'yyyy-MM-dd');
  } catch (error) {
    console.error("Error formatting date:", error);
    return "";
  }
};

// Safe difference in days function
const safeDifferenceInDays = (dateLeft: Date, dateRight: Date): number => {
  try {
    if (!isValid(dateLeft) || !isValid(dateRight)) {
      return 0;
    }
    return differenceInDays(dateLeft, dateRight);
  } catch (error) {
    console.error("Error calculating days difference:", error);
    return 0;
  }
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

// Improved function to properly handle contract number formatting
const cleanContractNumber = (value: any): string => {
  // Handle null or undefined
  if (value === null || value === undefined) {
    return "";
  }
  
  // Convert to string and trim
  let contractNumber = String(value).trim();
  
  // Check for common Excel errors
  if (contractNumber === "" || 
      contractNumber === "#N/A" || 
      contractNumber === "#REF!" || 
      contractNumber === "#VALUE!" ||
      contractNumber === "#DIV/0!" ||
      contractNumber === "#NAME?" ||
      contractNumber === "#NULL!" ||
      contractNumber === "#NUM!" ||
      /^#+$/.test(contractNumber)) {
    return "";
  }
  
  // Special handling for contract number format P/A16004/4/24/000284
  // Ensure all parts of the format are preserved
  if (/^P\/[A-Z0-9]+\/\d+\/\d+\/\d+$/.test(contractNumber)) {
    return contractNumber;
  }
  
  // Return the cleaned contract number
  return contractNumber;
};

// Définir les types corrects
export type InsuranceStatus = 'Recouvré' | 'Partiellement recouvré' | 'Créance';

interface InsuranceData {
  contractNumber: string;
  clientName: string;
  codeAgence: string;
  dateEmission: string;
  dateEcheance: string;
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
          console.log("Début du traitement du fichier Excel de taille:", file.size);
          
          // Lire le fichier Excel avec un traitement de fichiers volumineux
          const data = await file.arrayBuffer();
          console.log("Fichier converti en ArrayBuffer, taille:", data.byteLength);
          
          const workbook = XLSX.read(data, {
            cellFormula: false, // Désactiver les formules pour améliorer les performances
            cellHTML: false,   // Désactiver le HTML pour améliorer les performances
            cellText: true,    // Activer le texte brut pour améliorer les performances
            type: 'array',     // Optimisé pour les fichiers volumineux
            cellDates: true,   // Convertir les dates en objets Date automatiquement
            dateNF: 'yyyy-mm-dd', // Format de date par défaut
          });
          
          console.log("Workbook chargé, feuilles disponibles:", workbook.SheetNames);
          
          // Vérifier si la feuille spécifiée existe
          const sheetName = "Etat des Créances DSI";
          let targetSheetName = "";
          
          if (workbook.SheetNames.includes(sheetName)) {
            targetSheetName = sheetName;
            console.log(`Utilisation de la feuille spécifiée: ${targetSheetName}`);
          } else {
            // Chercher une correspondance partielle ou utiliser la première feuille
            const partialMatch = workbook.SheetNames.find(name => 
              name.toLowerCase().includes("créances") || 
              name.toLowerCase().includes("creances") ||
              name.toLowerCase().includes("etat")
            );
            
            if (partialMatch) {
              targetSheetName = partialMatch;
              console.log(`Feuille correspondante trouvée: ${targetSheetName}`);
            } else if (workbook.SheetNames.length > 0) {
              targetSheetName = workbook.SheetNames[0];
              console.log(`Utilisation de la première feuille disponible: ${targetSheetName}`);
            } else {
              throw new Error("Le fichier Excel ne contient aucune feuille");
            }
          }
          
          const worksheet = workbook.Sheets[targetSheetName];
          console.log("Feuille chargée, préparation à l'extraction des données");
          
          // Obtenir les données en mode texte pour éviter les problèmes de conversion
          const allData = XLSX.utils.sheet_to_json(worksheet, { 
            header: "A", 
            range: 10,
            raw: false, // Très important: garder les valeurs en tant que texte pour éviter les problèmes
            defval: ""
          });
          
          console.log(`Données extraites: ${allData.length} lignes trouvées`);
          
          if (allData.length <= 1) {
            throw new Error("Données insuffisantes dans la feuille spécifiée");
          }
          
          // Obtenir les en-têtes
          const headers = allData[0] as Record<string, any>;
          console.log("En-têtes de colonnes:", Object.values(headers));
          
          // Mapper les colonnes selon les nouvelles spécifications
          const columnMatchers = {
            "Client Name": ["assure", "assuré", "client name", "client", "nom", "assure", "assuré_cmpt"],
            "Contract Number": ["no police", "police n°", "no_police", "numero_police", "police", "contrat"],
            "Code Agence": ["code agence", "code_agence", "agence", "code", "agency"],
            "Date Emission": ["date d'effet", "effet", "date effet", "emission", "date"],
            "Date Echeance": ["date d'échéance", "échéance", "echeance", "date echeance"],
            "Total Amount Due": ["ttc", "net a payer", "net à payer", "net_a_payer", "montant", "total"],
            "Amount Paid": ["encst/recv/annul à m-1", "montant_paye", "montant_payé", "amount_paid", "montant encaissé", "paid", "paiement"],
            "Remaining Amount": ["créances", "creances", "solde", "reste", "remaining", "restant", "remaining amount"]
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
            console.error("Colonnes manquantes:", missing);
            throw new Error(`Colonnes manquantes: ${missing.join(", ")}`);
          }
          
          console.log("Mappage de colonnes réussi:", columnMapping);
          
          // Process all rows - skip the header row (index 0)
          console.log(`Traitement de toutes les ${allData.length-1} lignes`);
          
          try {
            // Optimized processing - use a more efficient approach for large datasets
            const processedData: InsuranceData[] = [];
            const batchSize = 500; // Process in smaller batches to prevent UI freezes
            const startTime = Date.now();
            
            // Skip the header row (index 0)
            for (let i = 1; i < allData.length; i++) {
              const row = allData[i] as Record<string, any>;
              
              // Skip completely empty rows
              if (Object.values(row).every(val => !val)) {
                continue;
              }
              
              // Only log progress for larger batches
              if (i % 1000 === 0) {
                console.log(`Processing row ${i}/${allData.length-1} (${Math.round((i/(allData.length-1))*100)}%)`);
              }
              
              const result: InsuranceData = {
                clientName: "",
                contractNumber: "",
                codeAgence: "",
                dateEmission: "",
                dateEcheance: "",
                totalAmount: 0,
                amountPaid: 0,
                remainingAmount: 0,
                timePassed: "",
                status: "Créance"
              };
              
              // First ensure we always have the key fields with special handling for contract numbers
              let hasContractNumber = false;
              let hasClientName = false;
              
              for (const [excelCol, targetField] of Object.entries(columnMapping)) {
                if (targetField === "Contract Number") {
                  // IMPROVED: Better handling for contract numbers using our new function
                  const rawValue = row[excelCol];
                  const cleanedValue = cleanContractNumber(rawValue);
                  
                  // Only set "Pas de N°" if really no contract number was found
                  if (cleanedValue && cleanedValue.length > 0) {
                    result.contractNumber = cleanedValue;
                    hasContractNumber = true;
                  } else {
                    result.contractNumber = `Pas de N° ${i}`;
                  }
                } else if (targetField === "Client Name") {
                  result.clientName = String(row[excelCol] || "").trim() || `Client-${i}`;
                  hasClientName = true;
                }
              }
              
              // If we're missing key fields after special handling, generate them
              if (!hasContractNumber) {
                result.contractNumber = `Pas de N° ${i}`;
              }
              if (!hasClientName) {
                result.clientName = `Client-${i}`;
              }
              
              // Now process all other fields
              for (const [excelCol, targetField] of Object.entries(columnMapping)) {
                const value = row[excelCol];
                
                // Skip the fields we've already processed
                if (targetField === "Contract Number" || targetField === "Client Name") {
                  continue;
                }
                
                switch(targetField) {
                  case "Code Agence":
                    result.codeAgence = String(value || "").trim();
                    break;
                  case "Date Emission":
                  case "Date Echeance":
                    const fieldName = targetField === "Date Emission" ? "dateEmission" : "dateEcheance";
                    let dateValue: Date | null = null;
                    
                    try {
                      if (value instanceof Date) {
                        dateValue = value;
                      } else if (typeof value === 'number' && value > 10000) {
                        // Excel date serial number
                        dateValue = new Date(Math.round((value - 25569) * 86400 * 1000));
                      } else if (typeof value === 'string' && value) {
                        // Try different date formats
                        const formatsToTry = [
                          // Standard formats
                          new Date(value),
                          // DD/MM/YYYY
                          new Date(value.split('/').reverse().join('-')),
                          // DD-MM-YYYY
                          new Date(value.split('-').reverse().join('-'))
                        ];
                        
                        for (const date of formatsToTry) {
                          if (isValid(date)) {
                            dateValue = date;
                            break;
                          }
                        }
                      }
                      
                      // If we have a valid date value, format it and calculate time passed
                      if (dateValue && isValid(dateValue)) {
                        result[fieldName] = safeFormatDate(dateValue);
                        
                        // Calculer le temps écoulé seulement pour la date d'émission
                        if (targetField === "Date Emission" && dateValue) {
                          const daysPassed = safeDifferenceInDays(new Date(), dateValue);
                          result.timePassed = convertDaysToMonthsDays(daysPassed);
                        }
                      }
                    } catch (error) {
                      console.error(`Error processing date for ${fieldName}:`, error);
                    }
                    break;
                  case "Total Amount Due":
                    try {
                      let amount: number;
                      if (typeof value === 'number') {
                        amount = value;
                      } else if (typeof value === 'string') {
                        // Handle various number formats and clean them
                        const cleanValue = value
                          .replace(/\s/g, '')  // Remove spaces
                          .replace(/,/g, '.') // Replace comma with dot
                          .replace(/[^\d.-]/g, ""); // Keep only digits, dots and minus
                          
                        amount = parseFloat(cleanValue);
                      } else {
                        amount = 0;
                      }
                      result.totalAmount = isNaN(amount) ? 0 : amount;
                    } catch (error) {
                      console.error("Error parsing total amount:", error);
                      result.totalAmount = 0;
                    }
                    break;
                  case "Amount Paid":
                    try {
                      let paid: number;
                      if (typeof value === 'number') {
                        paid = value;
                      } else if (typeof value === 'string') {
                        // Handle various number formats
                        const cleanValue = value
                          .replace(/\s/g, '')  // Remove spaces
                          .replace(/,/g, '.') // Replace comma with dot
                          .replace(/[^\d.-]/g, ""); // Keep only digits, dots and minus
                          
                        paid = parseFloat(cleanValue);
                      } else {
                        paid = 0;
                      }
                      result.amountPaid = isNaN(paid) ? 0 : paid;
                    } catch (error) {
                      console.error("Error parsing paid amount:", error);
                      result.amountPaid = 0;
                    }
                    break;
                  case "Remaining Amount":
                    try {
                      let remaining: number;
                      if (typeof value === 'number') {
                        remaining = value;
                      } else if (typeof value === 'string') {
                        // Handle various number formats
                        const cleanValue = value
                          .replace(/\s/g, '')  // Remove spaces
                          .replace(/,/g, '.') // Replace comma with dot
                          .replace(/[^\d.-]/g, ""); // Keep only digits, dots and minus
                          
                        remaining = parseFloat(cleanValue);
                      } else {
                        remaining = 0;
                      }
                      result.remainingAmount = isNaN(remaining) ? 0 : remaining;
                    } catch (error) {
                      console.error("Error parsing remaining amount:", error);
                      result.remainingAmount = 0;
                    }
                    break;
                }
              }
              
              // Calculs et valeurs par défaut
              if (result.totalAmount === 0 && result.amountPaid !== 0 && result.remainingAmount !== 0) {
                result.totalAmount = (result.amountPaid || 0) + (result.remainingAmount || 0);
              }
              
              if (result.amountPaid === 0 && result.totalAmount !== 0 && result.remainingAmount !== 0) {
                result.amountPaid = (result.totalAmount || 0) - (result.remainingAmount || 0);
              }
              
              if (result.remainingAmount === 0 && result.totalAmount !== 0 && result.amountPaid !== 0) {
                result.remainingAmount = (result.totalAmount || 0) - (result.amountPaid || 0);
              }
              
              // Déterminer le statut avec les nouveaux noms
              if (result.remainingAmount <= 0) {
                result.status = 'Recouvré';
              } else if (result.remainingAmount < result.totalAmount) {
                result.status = 'Partiellement recouvré';
              } else {
                result.status = 'Créance';
              }
              
              processedData.push(result);
              
              // Update in batches to avoid UI freezes for very large files
              if (i % batchSize === 0 || i === allData.length - 1) {
                const progress = Math.round((i / (allData.length - 1)) * 100);
                console.log(`Processed ${i}/${allData.length-1} rows (${progress}%)`);
              }
            }
            
            const endTime = Date.now();
            console.log(`Données valides extraites: ${processedData.length} entrées en ${(endTime - startTime)/1000} secondes`);
            
            // Mettre à jour le store - en une seule opération pour améliorer les performances
            set(state => {
              return { insuranceData: processedData };
            });
            
            console.log("Traitement du fichier Excel terminé avec succès");
            
          } catch (error) {
            console.error("Erreur lors du traitement des données:", error);
            throw error;
          }
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
          if (contract.status === 'Recouvré') return false;
          
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
      
      getTopDebtors: (count = 5) => {
        const { insuranceData } = get();
        
        // Filtrer les contrats impayés ou partiellement payés
        const debtors = insuranceData
          .filter(item => item.status !== 'Recouvré')
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
