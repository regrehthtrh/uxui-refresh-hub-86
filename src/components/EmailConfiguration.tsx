
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
import { AlertTriangle, Check, Send, Upload } from "lucide-react";
import { type InsuranceStatus } from "@/store/insuranceStore";

interface EmailFormValues {
  emailAccount: string;
  emailTemplate: string;
  contactInfo: string;
  reminderPeriod: number;
  automatic: boolean;
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
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  const { loadEmailMapping, insuranceData, sendEmail } = insuranceStore();
  
  const form = useForm<EmailFormValues>({
    defaultValues: {
      emailAccount: "contact@assurance.dz",
      emailTemplate: defaultTemplate,
      contactInfo: "0555 55 55 55",
      reminderPeriod: 30,
      automatic: false,
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
  
  const onSubmit = (values: EmailFormValues) => {
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
  
  const handleResetTemplate = () => {
    form.setValue("emailTemplate", defaultTemplate);
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
          <TabsTrigger value="config">Configuration Email</TabsTrigger>
          <TabsTrigger value="upload">Importer Contacts</TabsTrigger>
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
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <FormField
                      control={form.control}
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
                      control={form.control}
                      name="contactInfo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Coordonnées de contact</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Téléphone ou email" />
                          </FormControl>
                          <FormDescription>
                            Contact pour les clients (remplace {"{contactInfo}"})
                          </FormDescription>
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
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
                    control={form.control}
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

                  <FormField
                    control={form.control}
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
                            rows={10}
                            className="font-mono text-sm"
                            placeholder="Texte de l'email avec les variables {clientName}, {contractNumber}, {remainingAmount}, {timePassed}, {contactInfo}"
                          />
                        </FormControl>
                        <FormDescription>
                          Utilisez les variables {"{clientName}"}, {"{contractNumber}"}, 
                          {"{remainingAmount}"}, {"{timePassed}"}, {"{contactInfo}"}
                        </FormDescription>
                      </FormItem>
                    )}
                  />

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

export default EmailConfiguration;
