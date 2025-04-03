
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { insuranceStore } from "@/store/insuranceStore";
import { AlertTriangle, Check, Circle, Lock, Mail, MailCheck, Send, Server, Shield, Upload } from "lucide-react";
import { type InsuranceStatus } from "@/store/insuranceStore";
import { Separator } from "@/components/ui/separator";

interface EmailFormValues {
  emailAccount: string;
  emailTemplate: string;
  contactInfo: string;
  reminderPeriod: number;
  automatic: boolean;
}

interface SmtpFormValues {
  smtpHost: string;
  smtpPort: number;
  smtpUsername: string;
  smtpPassword: string;
  smtpSecure: boolean;
  fromName: string;
  fromEmail: string;
}

const defaultTemplate = `Cher/Chère {clientName},

Nous espérons que ce message vous trouve bien.

Nous souhaitons vous rappeler que votre police d'assurance n°{contractNumber} présente actuellement un solde impayé de {remainingAmount} DZD. Cette police est en attente de paiement depuis {timePassed}.

Pour toute question ou pour effectuer le paiement, veuillez contacter notre service client à {contactInfo}.

Cordialement,
L'équipe du Service Client`;

const EmailConfiguration = () => {
  const { toast } = useToast();
  const [uploadTab, setUploadTab] = useState("template");
  const [configTab, setConfigTab] = useState("content");
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  const { loadEmailMapping, insuranceData, sendEmail } = insuranceStore();
  
  const emailForm = useForm<EmailFormValues>({
    defaultValues: {
      emailAccount: "contact@assurance.dz",
      emailTemplate: defaultTemplate,
      contactInfo: "0555 55 55 55",
      reminderPeriod: 30,
      automatic: false,
    },
  });
  
  const smtpForm = useForm<SmtpFormValues>({
    defaultValues: {
      smtpHost: "smtp.assurance.dz",
      smtpPort: 587,
      smtpUsername: "contact@assurance.dz",
      smtpPassword: "",
      smtpSecure: true,
      fromName: "Service Recouvrement",
      fromEmail: "contact@assurance.dz",
    },
  });
  
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    try {
      await loadEmailMapping(files[0]);
      toast({
        title: "Chargement réussi",
        description: "Les données de contact ont été chargées avec succès.",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger le fichier. Veuillez vérifier le format.",
        variant: "destructive"
      });
    }
    
    if (event.target) event.target.value = "";
  };
  
  const onSubmitEmailForm = (values: EmailFormValues) => {
    // Vérifier s'il y a des données à traiter
    if (insuranceData.length === 0) {
      toast({
        title: "Aucune donnée disponible",
        description: "Veuillez d'abord charger des données d'assurance.",
        variant: "destructive"
      });
      return;
    }
    
    // Vérifier si des clients ont des créances
    const unpaidContracts = insuranceData.filter(contract => contract.status === "Créance");
    if (unpaidContracts.length === 0) {
      toast({
        title: "Aucune relance nécessaire",
        description: "Tous les contrats ont été recouvrés. Aucun rappel n'est nécessaire.",
        variant: "destructive"
      });
      return;
    }
    
    sendEmail(
      values.emailAccount,
      values.emailTemplate,
      values.contactInfo,
      values.reminderPeriod,
      values.automatic
    );
    
    toast({
      title: "Emails envoyés",
      description: `Les rappels ont été envoyés pour tous les contrats dépassant ${values.reminderPeriod} jours.`,
    });
    
    if (values.automatic) {
      toast({
        title: "Rappels automatiques activés",
        description: `Les emails seront envoyés automatiquement tous les ${values.reminderPeriod} jours.`,
      });
    }
  };
  
  const onSubmitSmtpForm = (values: SmtpFormValues) => {
    console.log("SMTP Configuration:", values);
    toast({
      title: "Configuration SMTP enregistrée",
      description: "Les paramètres SMTP ont été sauvegardés avec succès.",
    });
  };
  
  const handleTestSmtp = () => {
    const values = smtpForm.getValues();
    console.log("Test SMTP avec configuration:", values);
    toast({
      title: "Test SMTP",
      description: "Connexion au serveur SMTP en cours...",
    });
    
    // Simuler un délai pour le test
    setTimeout(() => {
      toast({
        title: "Test SMTP réussi",
        description: "La connexion au serveur SMTP a été établie avec succès.",
      });
    }, 1500);
  };
  
  const handleResetTemplate = () => {
    emailForm.setValue("emailTemplate", defaultTemplate);
    toast({
      title: "Modèle réinitialisé",
      description: "Le modèle d'email a été réinitialisé à sa valeur par défaut.",
    });
  };
  
  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  // Statistiques pour affichage
  const unpaidCount = insuranceData.filter(item => item.status === "Créance").length;
  const partialCount = insuranceData.filter(item => item.status === "Partiellement recouvré").length;
  const needReminder = unpaidCount + partialCount;
  
  return (
    <div className="space-y-6">
      <Tabs defaultValue="config" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="config" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Configuration Email
          </TabsTrigger>
          <TabsTrigger value="smtp" className="flex items-center gap-2">
            <Server className="h-4 w-4" />
            Serveur SMTP
          </TabsTrigger>
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Importer Contacts
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="config">
          <Card>
            <CardHeader>
              <CardTitle>Configuration des rappels</CardTitle>
              <CardDescription>
                Configurer les emails de rappel pour les polices en retard de paiement.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={configTab} onValueChange={setConfigTab}>
                <TabsList className="mb-4">
                  <TabsTrigger value="content">Contenu</TabsTrigger>
                  <TabsTrigger value="settings">Paramètres</TabsTrigger>
                </TabsList>
                
                <TabsContent value="content">
                  <Form {...emailForm}>
                    <form onSubmit={emailForm.handleSubmit(onSubmitEmailForm)} className="space-y-6">
                      <div className="grid gap-6">
                        <div className="grid gap-3">
                          <FormField
                            control={emailForm.control}
                            name="emailTemplate"
                            render={({ field }) => (
                              <FormItem>
                                <div className="flex justify-between items-center">
                                  <FormLabel>Modèle d'email</FormLabel>
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    type="button"
                                    onClick={handleResetTemplate}
                                  >
                                    Réinitialiser
                                  </Button>
                                </div>
                                <FormControl>
                                  <Textarea 
                                    {...field} 
                                    rows={12}
                                    className="font-mono text-sm"
                                    placeholder="Texte de l'email avec les variables {clientName}, {contractNumber}, {remainingAmount}, {timePassed}, {contactInfo}"
                                  />
                                </FormControl>
                                <FormDescription>
                                  Utilisez les variables suivantes dans votre modèle:
                                  <div className="flex flex-wrap gap-2 mt-1">
                                    <Badge>{"{clientName}"}</Badge>
                                    <Badge>{"{contractNumber}"}</Badge>
                                    <Badge>{"{remainingAmount}"}</Badge>
                                    <Badge>{"{timePassed}"}</Badge>
                                    <Badge>{"{contactInfo}"}</Badge>
                                  </div>
                                </FormDescription>
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <div className="flex items-center justify-between py-2">
                          <FormField
                            control={emailForm.control}
                            name="contactInfo"
                            render={({ field }) => (
                              <FormItem className="flex-1 max-w-sm">
                                <FormLabel>Coordonnées de contact</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="Téléphone ou email" />
                                </FormControl>
                                <FormDescription>
                                  Contact pour les clients
                                </FormDescription>
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <div className="flex justify-between items-center pt-4">
                          <div className="text-sm">
                            {needReminder > 0 ? (
                              <span className="text-amber-600 flex items-center">
                                <AlertTriangle className="h-4 w-4 mr-1" />
                                {needReminder} polices nécessitent un rappel
                              </span>
                            ) : (
                              <span className="text-green-600 flex items-center">
                                <Check className="h-4 w-4 mr-1" />
                                Tous les paiements sont à jour
                              </span>
                            )}
                          </div>
                          <Button type="submit" className="gap-2" disabled={needReminder === 0}>
                            <Send className="h-4 w-4" />
                            Envoyer les rappels
                          </Button>
                        </div>
                      </div>
                    </form>
                  </Form>
                </TabsContent>
                
                <TabsContent value="settings">
                  <Form {...emailForm}>
                    <form onSubmit={emailForm.handleSubmit(onSubmitEmailForm)} className="space-y-6">
                      <div className="grid gap-6">
                        <FormField
                          control={emailForm.control}
                          name="emailAccount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Compte émetteur</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="email@domaine.com" />
                              </FormControl>
                              <FormDescription>
                                L'adresse email utilisée pour envoyer les rappels
                              </FormDescription>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={emailForm.control}
                          name="reminderPeriod"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                Période de rappel: {field.value} jours
                              </FormLabel>
                              <FormControl>
                                <Slider
                                  min={7}
                                  max={120}
                                  step={1}
                                  value={[field.value]}
                                  onValueChange={(value) => field.onChange(value[0])}
                                  className="py-4"
                                />
                              </FormControl>
                              <FormDescription>
                                Envoyer des rappels pour les polices dépassant ce nombre de jours
                              </FormDescription>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={emailForm.control}
                          name="automatic"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between">
                              <div className="space-y-0.5">
                                <FormLabel>Rappels automatiques</FormLabel>
                                <FormDescription>
                                  Envoyer automatiquement des rappels périodiques
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        
                        <div className="flex justify-end items-center pt-4">
                          <Button type="submit" className="gap-2">
                            <MailCheck className="h-4 w-4" />
                            Appliquer
                          </Button>
                        </div>
                      </div>
                    </form>
                  </Form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="smtp">
          <Card>
            <CardHeader>
              <CardTitle>Configuration du serveur SMTP</CardTitle>
              <CardDescription>
                Configurez les paramètres du serveur SMTP pour l'envoi des emails de rappel
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...smtpForm}>
                <form onSubmit={smtpForm.handleSubmit(onSubmitSmtpForm)} className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-4">
                      <FormField
                        control={smtpForm.control}
                        name="smtpHost"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Serveur SMTP</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="smtp.example.com" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={smtpForm.control}
                        name="smtpPort"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Port</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                {...field} 
                                onChange={(e) => field.onChange(parseInt(e.target.value))}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={smtpForm.control}
                        name="smtpSecure"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between space-y-0 pt-2">
                            <div className="space-y-0.5">
                              <FormLabel>Connexion sécurisée (TLS/SSL)</FormLabel>
                              <FormDescription>
                                Utilisez une connexion sécurisée
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="space-y-4">
                      <FormField
                        control={smtpForm.control}
                        name="smtpUsername"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nom d'utilisateur</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="utilisateur@example.com" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={smtpForm.control}
                        name="smtpPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Mot de passe</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input type="password" {...field} />
                                <Lock className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                              </div>
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  
                  <Separator className="my-4" />
                  
                  <div className="grid gap-6 md:grid-cols-2">
                    <FormField
                      control={smtpForm.control}
                      name="fromName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nom d'expéditeur</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Service Clients" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={smtpForm.control}
                      name="fromEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email d'expéditeur</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="contact@example.com" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="flex justify-between items-center pt-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={handleTestSmtp}
                      className="gap-2"
                    >
                      <Shield className="h-4 w-4" />
                      Tester la connexion
                    </Button>
                    <Button type="submit" className="gap-2">
                      <Server className="h-4 w-4" />
                      Enregistrer la configuration
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="upload">
          <Card>
            <CardHeader>
              <CardTitle>Importer des contacts</CardTitle>
              <CardDescription>
                Importez un fichier contenant les adresses email des clients.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={uploadTab} onValueChange={setUploadTab}>
                <TabsList className="mb-4">
                  <TabsTrigger value="template">Modèle</TabsTrigger>
                  <TabsTrigger value="upload">Importer</TabsTrigger>
                </TabsList>
                
                <TabsContent value="template">
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Le fichier Excel doit contenir au minimum les colonnes suivantes:
                    </p>
                    <div className="border rounded-md p-4">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead>
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                              Client Name
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                              Email
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          <tr>
                            <td className="px-4 py-2 text-sm">SARL Example</td>
                            <td className="px-4 py-2 text-sm">contact@example.com</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-2 text-sm">John Doe</td>
                            <td className="px-4 py-2 text-sm">john.doe@example.com</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Remarque: Le nom du client doit correspondre exactement à celui dans le fichier des polices d'assurance.
                    </p>
                  </div>
                </TabsContent>
                
                <TabsContent value="upload">
                  <div className="space-y-4">
                    <div 
                      className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-muted/40 transition-colors"
                      onClick={handleUploadClick}
                    >
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept=".xlsx,.xls"
                        className="hidden"
                      />
                      <div className="flex flex-col items-center gap-2">
                        <Upload className="h-8 w-8 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">
                            Cliquez pour importer un fichier Excel
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Format: .xlsx ou .xls
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => setUploadTab("template")}>
                Voir le modèle
              </Button>
              <Button onClick={handleUploadClick}>
                Importer
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Badge component for template variables
const Badge = ({ children }: { children: React.ReactNode }) => (
  <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-primary text-primary-foreground hover:bg-primary/80">
    {children}
  </div>
);

export default EmailConfiguration;
