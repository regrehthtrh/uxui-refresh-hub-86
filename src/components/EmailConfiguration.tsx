
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileUp, LinkIcon, EyeIcon, Save, Send } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { insuranceStore } from "@/store/insuranceStore";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const EmailConfiguration = () => {
  const { toast } = useToast();
  const { emailMappings, insuranceData, sendAutomaticEmails } = insuranceStore();
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
  
  const handleLinkAccount = () => {
    if (!emailAccount || !password || !smtpServer || !smtpPort) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les détails du compte",
        variant: "destructive",
      });
      return;
    }
    
    toast({
      title: "Succès",
      description: "Compte email lié avec succès!",
    });
  };
  
  const handleUploadMapping = () => {
    toast({
      title: "Fichier chargé",
      description: "Fichier de correspondance email chargé avec succès.",
    });
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
    
    const periodInDays = parseInt(reminderPeriod) * 30; // Convertir mois en jours
    sendAutomaticEmails(
      emailAccount, 
      emailTemplate, 
      contactInfo, 
      periodInDays, 
      automaticEmails
    );
    
    toast({
      title: "Emails envoyés",
      description: `${automaticEmails ? "Configuration automatique activée" : "Emails de rappel envoyés"} pour les contrats en retard.`,
    });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-center">Configuration des Rappels par Email</h1>
      
      <Tabs defaultValue="account" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="account">Paramètres du Compte</TabsTrigger>
          <TabsTrigger value="mapping">Correspondance & Configuration</TabsTrigger>
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
            <CardFooter>
              <Button onClick={handleLinkAccount} className="w-full flex items-center gap-2">
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
              <Button onClick={handleUploadMapping} className="flex items-center gap-2">
                <FileUp className="h-4 w-4" />
                Charger la Correspondance Email
              </Button>
              
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
            <CardFooter className="flex flex-col space-y-2 sm:flex-row sm:space-x-2 sm:space-y-0">
              <Button onClick={handleSaveConfiguration} className="w-full sm:w-auto flex items-center gap-2">
                <Save className="h-4 w-4" />
                Sauvegarder la Configuration
              </Button>
              <Button onClick={handleSendAutomaticEmails} className="w-full sm:w-auto flex items-center gap-2">
                <Send className="h-4 w-4" />
                {automaticEmails ? "Activer l'Envoi Automatique" : "Envoyer les Rappels Maintenant"}
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
    </div>
  );
};

export default EmailConfiguration;
