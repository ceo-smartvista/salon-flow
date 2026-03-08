import { MessageCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function WhatsAppBotPage() {
  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">WhatsApp Booking Bot</h1>
        <p className="text-muted-foreground mt-1">AI-powered booking via WhatsApp with real-time dashboard updates.</p>
      </div>

      <div className="bg-card rounded-xl border p-8 space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-success/10 flex items-center justify-center">
            <MessageCircle className="w-8 h-8 text-success" />
          </div>
          <div>
            <h2 className="text-xl font-display font-bold">Connect WhatsApp Business API</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Enable clients to book appointments by texting your salon's WhatsApp number.
            </p>
          </div>
        </div>

        <div className="space-y-4 pl-20">
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Setup Steps:</h3>
            <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-2">
              <li>Create a <strong>Meta Business Account</strong> and apply for WhatsApp Business API access</li>
              <li>Get your <strong>Phone Number ID</strong> and <strong>Access Token</strong> from the Meta Developer Dashboard</li>
              <li>Configure webhook URL to receive incoming messages</li>
              <li>Add your API credentials in the settings below</li>
            </ol>
          </div>

          <div className="bg-muted/50 rounded-xl p-5 space-y-3">
            <h3 className="font-semibold text-sm">Bot Capabilities (once connected):</h3>
            <ul className="text-sm text-muted-foreground space-y-1.5">
              <li>✅ Clients text "book" to see available slots</li>
              <li>✅ AI parses natural language booking requests</li>
              <li>✅ Automatic appointment confirmation & reminders</li>
              <li>✅ Real-time calendar & dashboard sync</li>
              <li>✅ Cancellation and rescheduling via chat</li>
            </ul>
          </div>

          <Button className="gap-2" onClick={() => window.open("https://business.facebook.com/", "_blank")}>
            <ExternalLink className="w-4 h-4" />
            Open Meta Business Suite
          </Button>
          <p className="text-xs text-muted-foreground">
            WhatsApp Business API requires a verified Meta Business Account. 
            Once you have your credentials, come back and we'll set up the integration.
          </p>
        </div>
      </div>
    </div>
  );
}
