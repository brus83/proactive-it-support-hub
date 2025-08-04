import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotificationEmailRequest {
  to: string;
  title: string;
  message: string;
  type: string;
  category: string;
  ticket_id?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Processing notification email request");
    
    const { to, title, message, type, category, ticket_id }: NotificationEmailRequest = await req.json();

    // Validate required fields
    if (!to || !title || !message) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, title, message" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const getEmailTemplate = (type: string, category: string) => {
      const baseStyle = `
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        line-height: 1.6;
        color: #333;
      `;

      const getTypeColor = (type: string) => {
        switch (type) {
          case 'warning': return '#f59e0b';
          case 'error': return '#ef4444';
          case 'success': return '#10b981';
          default: return '#3b82f6';
        }
      };

      const getCategoryIcon = (category: string) => {
        switch (category) {
          case 'new_ticket': return '🎫';
          case 'escalation': return '⚠️';
          case 'deadline': return '⏰';
          case 'reminder': return '🔔';
          default: return 'ℹ️';
        }
      };

      return `
        <div style="${baseStyle}">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: ${getTypeColor(type)}; margin: 0; font-size: 24px;">
                ${getCategoryIcon(category)} ${title}
              </h1>
            </div>
            
            <div style="background-color: #f9fafb; padding: 20px; border-radius: 6px; margin-bottom: 20px;">
              <p style="margin: 0; font-size: 16px;">${message}</p>
            </div>
            
            ${ticket_id ? `
              <div style="text-align: center; margin: 20px 0;">
                <a href="${Deno.env.get('SUPABASE_URL') || 'https://your-app.com'}/dashboard" 
                   style="background-color: ${getTypeColor(type)}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  Visualizza Ticket
                </a>
              </div>
            ` : ''}
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            
            <div style="text-align: center; color: #6b7280; font-size: 14px;">
              <p>Questo è un messaggio automatico dal sistema di gestione ticket.</p>
              <p>Se non desideri più ricevere queste notifiche, puoi modificare le tue impostazioni nel dashboard.</p>
            </div>
          </div>
        </div>
      `;
    };

    const emailResponse = await resend.emails.send({
      from: "Ticket System <notifications@resend.dev>",
      to: [to],
      subject: title,
      html: getEmailTemplate(type, category),
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-notification-email function:", error);
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