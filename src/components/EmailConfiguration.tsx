import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table, TableBody, TableCell, TableHead, 
  TableHeader, TableRow 
} from "@/components/ui/table";
import { insuranceStore } from "@/store/insuranceStore";

const formSchema = z.object({
  smtpServer: z.string().min(1, "Veuillez saisir le serveur SMTP"),
  smtpPort: z.string().min(1, "Veuillez saisir le port SMTP"),
  username: z.string().min(1, "Veuillez saisir votre adresse email"),
  password: z.string().min(1, "Veuillez saisir votre mot de passe"),
  fromName: z.string().min(1, "Veuillez saisir le nom de l'expéditeur"),
  subject: z.string().min(1, "Veuillez saisir un sujet"),
  emailTemplate: z.string().min(1, "Veuillez saisir un modèle d'email")
});

const EmailConfiguration = () => {
  const [activeTab, setActiveTab] = useState("config");
  const { insuranceData } = insuranceStore();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      smtpServer: "smtp.example.com",
      smtpPort: "587",
      username: "votre@email.com",
      password: "",
      fromName: "Service Assurance",
      subject: "Rappel de paiement - Police d'assurance",
      emailTemplate: `Cher(e) {clientName},

Nous vous rappelons que votre police d'assurance n°{contractNumber} arrive à échéance le {dateEcheance}.

Montant restant à payer: {remainingAmount} DZD

Merci de procéder au règlement de ce montant dans les plus brefs délais.

Cordialement,
L'équipe Service Assurance`
    }
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values);
    // This was a placeholder for email functionality, but we'll skip it as it's not implemented
  }
  
  // Dummy data for email table - would normally come from an API or store
  const emailData = insuranceData
    .filter(item => item.status !== "Recouvré")
    .map(item => ({
      id: Math.random().toString(36).substring(7),
      contractNumber: item.contractNumber,
      clientName: item.clientName,
      email: `client_${item.contractNumber.replace(/\W/g, '')}@example.com`,
      sent: false,
      dateToSend: "Immédiat"
    }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Configuration des Rappels Email</h1>
      <p className="text-muted-foreground">
        Configurez vos paramètres SMTP et créez des modèles d'email pour envoyer des rappels aux clients.
      </p>
      
      <Tabs defaultValue="config" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="config">Configuration SMTP</TabsTrigger>
          <TabsTrigger value="template">Modèle d'Email</TabsTrigger>
          <TabsTrigger value="emails">Emails à envoyer</TabsTrigger>
        </TabsList>
        
        <TabsContent value="config">
          <Card>
            <CardHeader>
              <CardTitle>Configuration du serveur SMTP</CardTitle>
              <CardDescription>
                Configurez le serveur SMTP pour l'envoi des emails de rappel.
              </CardDescription>
            </CardHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="smtpServer"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Serveur SMTP</FormLabel>
                          <FormControl>
                            <Input placeholder="smtp.exemple.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="smtpPort"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Port SMTP</FormLabel>
                          <FormControl>
                            <Input placeholder="587" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Adresse Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="votre@email.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mot de Passe</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••••••" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="fromName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nom de l'Expéditeur</FormLabel>
                        <FormControl>
                          <Input placeholder="Service Assurance" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
                <CardFooter>
                  <Button type="submit">Enregistrer la configuration</Button>
                </CardFooter>
              </form>
            </Form>
          </Card>
        </TabsContent>
        
        <TabsContent value="template">
          <Card>
            <CardHeader>
              <CardTitle>Modèle d'Email</CardTitle>
              <CardDescription>
                Créez votre modèle d'email pour les rappels. Utilisez les variables entre accolades pour personnaliser le contenu.
              </CardDescription>
            </CardHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="subject"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sujet de l'Email</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="emailTemplate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contenu de l'Email</FormLabel>
                        <FormControl>
                          <Textarea rows={10} {...field} />
                        </FormControl>
                        <FormDescription>
                          Variables disponibles: {'{clientName}'}, {'{contractNumber}'}, {'{dateEcheance}'}, {'{remainingAmount}'}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
                <CardFooter>
                  <Button type="submit">Enregistrer le modèle</Button>
                </CardFooter>
              </form>
            </Form>
          </Card>
        </TabsContent>
        
        <TabsContent value="emails">
          <Card>
            <CardHeader>
              <CardTitle>Emails à envoyer</CardTitle>
              <CardDescription>
                Liste des emails de rappel à envoyer aux clients ayant des créances.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Police N°</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Date d'envoi</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {emailData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                          Aucun email à envoyer
                        </TableCell>
                      </TableRow>
                    ) : (
                      emailData.map((email) => (
                        <TableRow key={email.id}>
                          <TableCell>{email.contractNumber}</TableCell>
                          <TableCell>{email.clientName}</TableCell>
                          <TableCell>{email.email}</TableCell>
                          <TableCell>{email.dateToSend}</TableCell>
                          <TableCell>{email.sent ? "Envoyé" : "En attente"}</TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" disabled={!form.formState.isValid}>
                              Envoyer
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
            <CardFooter>
              <Button disabled={!form.formState.isValid || emailData.length === 0}>
                Envoyer tous les emails
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EmailConfiguration;
