
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface TicketClosureEmailRequest {
  ticketId: string;
  ticketTitle: string;
  contactEmail: string;
  contactName: string;
  closureNotes: string;
  closedBy: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      ticketId, 
      ticketTitle, 
      contactEmail, 
      contactName, 
      closureNotes, 
      closedBy 
    }: TicketClosureEmailRequest = await req.json();

    const emailResponse = await resend.emails.send({
      from: "Sistema Ticketing IT <noreply@yourcompany.com>",
      to: [contactEmail],
      subject: `Ticket #${ticketId} Chiuso - ${ticketTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #22c55e;">Ticket Chiuso</h2>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0;">Dettagli Ticket</h3>
            <p><strong>ID Ticket:</strong> #${ticketId}</p>
            <p><strong>Titolo:</strong> ${ticketTitle}</p>
            <p><strong>Cliente:</strong> ${contactName}</p>
            <p><strong>Chiuso da:</strong> ${closedBy}</p>
          </div>

          ${closureNotes ? `
            <div style="background-color: #e6f7ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin: 0 0 10px 0; color: #1890ff;">Note di Chiusura</h3>
              <p style="margin: 0;">${closureNotes}</p>
            </div>
          ` : ''}

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
            <p style="color: #666; font-size: 14px;">
              Grazie per aver utilizzato il nostro sistema di supporto IT.
              <br>
              Se hai bisogno di ulteriore assistenza, non esitare a contattarci.
            </p>
          </div>
        </div>
      `,
    });

    console.log("Email di chiusura ticket inviata:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Errore nell'invio email di chiusura ticket:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
