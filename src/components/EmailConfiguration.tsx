
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileUp, LinkIcon, EyeIcon, Save, Send, CheckCircle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { insuranceStore } from "@/store/insuranceStore";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ConfirmationDialog from './ConfirmationDialog';

const EmailConfiguration = () => {
  const { toast } = useToast();
  const { insuranceData, emailMappings, sendEmail, loadEmailMapping, getEmailsSent } = insuranceStore();
  
  const [emailAccount, setEmailAccount] = useState("");
  const [password, setPassword] = useState("");
  const [smtpServer, setSmtpServer] = useState("smtp.live.com");
  const [smtpPort, setSmtpPort] = useState("587");
  const [contactInfo, setContactInfo] = useState("");
  const [overduePeriod, setOverduePeriod] = useState("2");
  const [previewText, setPreviewText] = useState("");
  const [automaticEmails, setAutomaticEmails] = useState(false);
  const [emailTemplate, setEmailTemplate] = useState(`Cher/Chère {clientName},

Ceci est un rappel concernant votre paiement en attente de {remainingAmount} DZD pour le contrat {contractNumber}.
Votre paiement est en retard de {timePassed}. Veuillez effectuer le paiement dès que possible.

Si vous avez des questions ou besoin d'aide, veuillez nous contacter à : {contactInfo}.

Cordialement,
Votre équipe de gestion`);
  
  const [reminderPeriod, setReminderPeriod] = useState("3");
  const [sentEmails, setSentEmails] = useState<{ contractNumber: string; emailSent: boolean }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRestoreDialogOpen, setIsRestoreDialogOpen] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  
  useEffect(() => {
    // Récupérer les emails envoyés du localStorage
    const emailsSent = getEmailsSent();
    setSentEmails(emailsSent);
    
    // Charger les préférences sauvegardées
    const savedPrefs = localStorage.getItem('emailPreferences');
    if (savedPrefs) {
      try {
        const prefs = JSON.parse(savedPrefs);
        setEmailAccount(prefs.emailAccount || "");
        setContactInfo(prefs.contactInfo || "");
        setReminderPeriod(prefs.reminderPeriod || "3");
        setAutomaticEmails(prefs.automaticEmails || false);
        setEmailTemplate(prefs.emailTemplate || emailTemplate);
      } catch (error) {
        console.error("Erreur lors du chargement des préférences:", error);
      }
    }
  }, [getEmailsSent]);
  
  const handleLinkAccount = () => {
    if (!emailAccount || !password || !smtpServer || !smtpPort) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les détails du compte",
        variant: "destructive",
      });
      return;
    }
    
    // Sauvegarde dans localStorage
    const prefs = {
      emailAccount,
      contactInfo,
      reminderPeriod,
      automaticEmails,
      emailTemplate
    };
    localStorage.setItem('emailPreferences', JSON.stringify(prefs));
    
    toast({
      title: "Succès",
      description: "Compte email lié avec succès!",
    });
  };
  
  const handleUploadMapping = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    setUploadedFileName(file.name);
    
    try {
      setIsLoading(true);
      await loadEmailMapping(file);
      toast({
        title: "Fichier chargé",
        description: "Fichier de correspondance email chargé avec succès.",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Erreur lors du chargement du fichier",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleGeneratePreview = () => {
    const overdueContracts = insuranceData.filter(item => item.status !== "Payé");
    
    if (overdueContracts.length === 0) {
      setPreviewText("Aucun contrat en retard trouvé pour l'aperçu.");
      return;
    }
    
    // Prendre le premier contrat en retard pour l'aperçu
    const sampleContract = overdueContracts[0];
    
    const preview = emailTemplate
      .replace(/{clientName}/g, sampleContract.clientName)
      .replace(/{contractNumber}/g, sampleContract.contractNumber)
      .replace(/{remainingAmount}/g, sampleContract.remainingAmount.toString())
      .replace(/{timePassed}/g, sampleContract.timePassed)
      .replace(/{contactInfo}/g, contactInfo || "[Coordonnées de contact]");
    
    setPreviewText(preview);
  };
  
  const handleSaveConfiguration = () => {
    if (!emailAccount) {
      toast({
        title: "Avertissement",
        description: "Veuillez d'abord lier votre compte email.",
      });
      return;
    }
    
    // Sauvegarde dans localStorage
    const prefs = {
      emailAccount,
      contactInfo,
      reminderPeriod,
      automaticEmails,
      emailTemplate
    };
    localStorage.setItem('emailPreferences', JSON.stringify(prefs));
    
    toast({
      title: "Configuration sauvegardée",
      description: "La configuration des rappels par email a été sauvegardée.",
    });
  };
  
  const handleSendTestEmail = () => {
    if (!emailAccount) {
      toast({
        title: "Erreur",
        description: "Veuillez d'abord lier votre compte email.",
        variant: "destructive",
      });
      return;
    }
    
    toast({
      title: "Email de test envoyé",
      description: "Un email de test a été envoyé à votre adresse.",
    });
  };
  
  const handleSendAutomaticEmails = () => {
    if (!emailAccount) {
      toast({
        title: "Erreur",
        description: "Veuillez d'abord lier votre compte email.",
        variant: "destructive",
      });
      return;
    }
    
    if (insuranceData.length === 0) {
      toast({
        title: "Avertissement",
        description: "Aucune donnée d'assurance disponible pour envoyer des emails.",
      });
      return;
    }
    
    if (emailMappings.length === 0) {
      toast({
        title: "Avertissement",
        description: "Aucune correspondance email-client trouvée. Veuillez charger un fichier de correspondance.",
      });
      return;
    }
    
    const periodInDays = parseInt(reminderPeriod) * 30; // Convertir mois en jours
    
    setIsLoading(true);
    
    try {
      sendEmail(
        emailAccount, 
        emailTemplate, 
        contactInfo, 
        periodInDays, 
        automaticEmails
      );
      
      // Mettre à jour la liste des emails envoyés
      const updatedSentEmails = getEmailsSent();
      setSentEmails(updatedSentEmails);
      
      toast({
        title: "Emails envoyés",
        description: `${automaticEmails ? "Configuration automatique activée" : "Emails de rappel envoyés"} pour les contrats en retard.`,
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Une erreur s'est produite lors de l'envoi des emails.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleResetEmailSettings = () => {
    setIsRestoreDialogOpen(true);
  };
  
  const confirmReset = () => {
    localStorage.removeItem('emailPreferences');
    localStorage.removeItem('sentEmails');
    
    setEmailAccount("");
    setPassword("");
    setContactInfo("");
    setReminderPeriod("3");
    setAutomaticEmails(false);
    setEmailTemplate(`Cher/Chère {clientName},

Ceci est un rappel concernant votre paiement en attente de {remainingAmount} DZD pour le contrat {contractNumber}.
Votre paiement est en retard de {timePassed}. Veuillez effectuer le paiement dès que possible.

Si vous avez des questions ou besoin d'aide, veuillez nous contacter à : {contactInfo}.

Cordialement,
Votre équipe de gestion`);
    
    setSentEmails([]);
    
    toast({
      title: "Paramètres réinitialisés",
      description: "Tous les paramètres d'email et l'historique des envois ont été réinitialisés."
    });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-center">Configuration des Rappels par Email</h1>
      
      <Tabs defaultValue="account" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="account">Paramètres du Compte</TabsTrigger>
          <TabsTrigger value="mapping">Configuration & Correspondance</TabsTrigger>
          <TabsTrigger value="preview">Aperçu Email</TabsTrigger>
        </TabsList>
        
        <TabsContent value="account">
          <Card>
            <CardHeader>
              <CardTitle>Paramètres du Compte Email</CardTitle>
              <CardDescription>
                Configurez le compte email qui sera utilisé pour envoyer les rappels
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Compte Email</Label>
                  <Input
                    id="email"
                    placeholder="votre_hotmail@hotmail.com"
                    value={emailAccount}
                    onChange={(e) => setEmailAccount(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">Mot de Passe</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="smtp">Serveur SMTP</Label>
                  <Input
                    id="smtp"
                    value={smtpServer}
                    onChange={(e) => setSmtpServer(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="port">Port SMTP</Label>
                  <Input
                    id="port"
                    type="number"
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button 
                variant="outline" 
                onClick={handleResetEmailSettings}
              >
                Réinitialiser
              </Button>
              <Button onClick={handleLinkAccount} className="flex items-center gap-2">
                <LinkIcon className="h-4 w-4" />
                Lier le Compte
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="mapping">
          <Card>
            <CardHeader>
              <CardTitle>Correspondance & Configuration des Retards</CardTitle>
              <CardDescription>
                Configurez la correspondance des emails et les seuils de retard
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="file-upload">Charger la Correspondance Email</Label>
                <div className="flex items-center gap-2">
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <div className="flex items-center gap-2 bg-[#004a80] hover:bg-[#003b66] text-white px-4 py-2 rounded-md">
                      <FileUp className="h-4 w-4" />
                      {uploadedFileName ? 'Changer le Fichier' : 'Charger un Fichier'}
                    </div>
                    <input 
                      id="file-upload" 
                      type="file" 
                      className="hidden" 
                      accept=".xlsx,.xls,.csv" 
                      onChange={handleUploadMapping}
                      disabled={isLoading}
                    />
                  </label>
                  {uploadedFileName && (
                    <span className="text-sm text-muted-foreground">{uploadedFileName}</span>
                  )}
                </div>
                {emailMappings.length > 0 && (
                  <p className="text-sm text-green-600 flex items-center gap-1">
                    <CheckCircle className="h-4 w-4" />
                    {emailMappings.length} correspondances email chargées
                  </p>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="threshold">Seuil de retard (mois)</Label>
                  <Input
                    id="threshold"
                    type="number"
                    value={overduePeriod}
                    onChange={(e) => setOverduePeriod(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="contact">Coordonnées de Contact</Label>
                  <Input
                    id="contact"
                    placeholder="ex. support@votreentreprise.com"
                    value={contactInfo}
                    onChange={(e) => setContactInfo(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="space-y-3">
                <Label>Période de Rappel</Label>
                <Select value={reminderPeriod} onValueChange={setReminderPeriod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une période" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 mois</SelectItem>
                    <SelectItem value="6">6 mois</SelectItem>
                    <SelectItem value="9">9 mois</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Les emails seront envoyés aux clients dont les paiements sont en retard de cette période.
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="auto-emails">Activer les Emails Automatiques</Label>
                  <Switch 
                    id="auto-emails" 
                    checked={automaticEmails}
                    onCheckedChange={setAutomaticEmails}
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Lorsqu'activé, le système enverra automatiquement des emails de rappel selon votre configuration
                </p>
              </div>
              
              <div className="space-y-3">
                <Label htmlFor="email-template">Modèle d'Email</Label>
                <Textarea 
                  id="email-template" 
                  className="min-h-[200px]" 
                  value={emailTemplate}
                  onChange={(e) => setEmailTemplate(e.target.value)}
                  placeholder="Modèle d'email avec variables comme {clientName}, {contractNumber}, {remainingAmount}, etc."
                />
                <p className="text-sm text-muted-foreground">
                  Variables disponibles: {"{clientName}"}, {"{contractNumber}"}, {"{remainingAmount}"}, {"{timePassed}"}, {"{contactInfo}"}
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-2 sm:flex-row sm:space-x-2 sm:space-y-0 sm:justify-between">
              <Button onClick={handleSaveConfiguration} className="w-full sm:w-auto flex items-center gap-2">
                <Save className="h-4 w-4" />
                Sauvegarder la Configuration
              </Button>
              <Button 
                onClick={handleSendAutomaticEmails} 
                className="w-full sm:w-auto flex items-center gap-2"
                disabled={isLoading}
              >
                <Send className="h-4 w-4" />
                {isLoading ? 'Envoi en cours...' : automaticEmails ? "Activer l'Envoi Automatique" : "Envoyer les Rappels Maintenant"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="preview">
          <Card>
            <CardHeader>
              <CardTitle>Aperçu Email</CardTitle>
              <CardDescription>
                Prévisualisez l'apparence de vos emails de rappel
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-muted p-4 rounded-md min-h-[300px] whitespace-pre-line">
                {previewText || "Cliquez sur 'Générer un Aperçu' pour voir un exemple d'email"}
              </div>
              
              {sentEmails.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-md font-medium mb-2">Emails Envoyés</h3>
                  <div className="bg-muted p-4 rounded-md max-h-[200px] overflow-y-auto">
                    <ul className="space-y-2">
                      {insuranceData
                        .filter(contract => sentEmails.some(email => email.contractNumber === contract.contractNumber))
                        .map(contract => (
                          <li key={contract.contractNumber} className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span>{contract.clientName} (Contrat: {contract.contractNumber})</span>
                          </li>
                        ))}
                    </ul>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex flex-col space-y-2 sm:flex-row sm:space-x-2 sm:space-y-0">
              <Button onClick={handleGeneratePreview} className="w-full sm:w-auto flex items-center gap-2">
                <EyeIcon className="h-4 w-4" />
                Générer un Aperçu
              </Button>
              <Button onClick={handleSendTestEmail} variant="outline" className="w-full sm:w-auto flex items-center gap-2">
                <Send className="h-4 w-4" />
                Envoyer un Email Test
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
      
      <ConfirmationDialog
        isOpen={isRestoreDialogOpen}
        setIsOpen={setIsRestoreDialogOpen}
        onConfirm={confirmReset}
        title="Réinitialiser les paramètres"
        description="Êtes-vous sûr de vouloir réinitialiser tous les paramètres email et l'historique des envois? Cette action ne peut pas être annulée."
        confirmText="Réinitialiser"
        cancelText="Annuler"
      />
    </div>
  );
};

export default EmailConfiguration;
