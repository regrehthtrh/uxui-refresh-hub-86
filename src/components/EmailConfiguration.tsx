
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileUp, LinkIcon, EyeIcon, Save } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

const EmailConfiguration = () => {
  const { toast } = useToast();
  const [emailAccount, setEmailAccount] = useState("");
  const [password, setPassword] = useState("");
  const [smtpServer, setSmtpServer] = useState("smtp.live.com");
  const [smtpPort, setSmtpPort] = useState("587");
  const [contactInfo, setContactInfo] = useState("");
  const [overduePeriod, setOverduePeriod] = useState("2");
  const [previewText, setPreviewText] = useState("");
  
  const handleLinkAccount = () => {
    if (!emailAccount || !password || !smtpServer || !smtpPort) {
      toast({
        title: "Error",
        description: "Please fill in all account details",
        variant: "destructive",
      });
      return;
    }
    
    toast({
      title: "Success",
      description: "Email account linked successfully!",
    });
  };
  
  const handleUploadMapping = () => {
    toast({
      title: "File Upload",
      description: "Email mapping file loaded successfully.",
    });
  };
  
  const handleGeneratePreview = () => {
    const preview = `
Dear John Doe,

This is a reminder regarding your outstanding payment of 5000 DZD for contract 12345.
Your payment is overdue by 45 days. Please arrange for payment as soon as possible.

If you have any questions or need assistance, please contact us at: ${contactInfo || "[Contact Info]"}.

Best regards,
Your Management Team
    `;
    
    setPreviewText(preview);
  };
  
  const handleSaveConfiguration = () => {
    if (!emailAccount) {
      toast({
        title: "Warning",
        description: "Please link your email account first.",
      });
      return;
    }
    
    toast({
      title: "Configuration Saved",
      description: "Email reminder configuration has been saved.",
    });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-center">Email Reminder Configuration</h1>
      
      <Tabs defaultValue="account" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="account">Account Setup</TabsTrigger>
          <TabsTrigger value="mapping">Mapping & Configuration</TabsTrigger>
          <TabsTrigger value="preview">Email Preview</TabsTrigger>
        </TabsList>
        
        <TabsContent value="account">
          <Card>
            <CardHeader>
              <CardTitle>Email Account Settings</CardTitle>
              <CardDescription>
                Configure the email account that will be used to send reminders
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Account</Label>
                  <Input
                    id="email"
                    placeholder="your_hotmail@hotmail.com"
                    value={emailAccount}
                    onChange={(e) => setEmailAccount(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="smtp">SMTP Server</Label>
                  <Input
                    id="smtp"
                    value={smtpServer}
                    onChange={(e) => setSmtpServer(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="port">SMTP Port</Label>
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
                Link Account
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="mapping">
          <Card>
            <CardHeader>
              <CardTitle>Mapping & Overdue Configuration</CardTitle>
              <CardDescription>
                Configure email mapping and overdue thresholds
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Button onClick={handleUploadMapping} className="flex items-center gap-2">
                <FileUp className="h-4 w-4" />
                Upload Email Mapping
              </Button>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="threshold">Overdue threshold (months)</Label>
                  <Input
                    id="threshold"
                    type="number"
                    value={overduePeriod}
                    onChange={(e) => setOverduePeriod(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="contact">Contact Info</Label>
                  <Input
                    id="contact"
                    placeholder="e.g., support@yourcompany.com"
                    value={contactInfo}
                    onChange={(e) => setContactInfo(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="auto-emails">Enable Automatic Emails</Label>
                  <Switch id="auto-emails" />
                </div>
                <p className="text-sm text-muted-foreground">
                  When enabled, the system will automatically send reminder emails based on your configuration
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="preview">
          <Card>
            <CardHeader>
              <CardTitle>Email Preview</CardTitle>
              <CardDescription>
                Preview how your reminder emails will look
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-muted p-4 rounded-md min-h-[300px] whitespace-pre-line">
                {previewText || "Click 'Generate Preview' to see an example email"}
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-2 sm:flex-row sm:space-x-2 sm:space-y-0">
              <Button onClick={handleGeneratePreview} className="w-full sm:w-auto flex items-center gap-2">
                <EyeIcon className="h-4 w-4" />
                Generate Preview
              </Button>
              <Button onClick={handleSaveConfiguration} className="w-full sm:w-auto flex items-center gap-2">
                <Save className="h-4 w-4" />
                Save Configuration
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EmailConfiguration;
