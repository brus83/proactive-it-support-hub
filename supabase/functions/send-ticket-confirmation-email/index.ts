
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { Resend } from 'npm:resend@4.0.0'

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { 
      ticketId, 
      userEmail, 
      ticketTitle, 
      ticketNumber, 
      priority, 
      contactName 
    } = await req.json()

    const priorityLabel = {
      'low': 'Bassa',
      'medium': 'Media', 
      'high': 'Alta',
      'urgent': 'Urgente'
    }[priority] || 'Media'

    const estimatedTime = {
      'urgent': '1-2 ore',
      'high': '4-8 ore',
      'medium': '1-2 giorni lavorativi',
      'low': '3-5 giorni lavorativi'
    }[priority] || '1-2 giorni lavorativi'

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Sistema Ticketing IT</h1>
        </div>
        
        <div style="padding: 30px; background: #f8f9fa;">
          <h2 style="color: #333; margin-bottom: 20px;">Ticket Ricevuto e Preso in Carico</h2>
          
          <p style="font-size: 16px; color: #555; margin-bottom: 20px;">
            Gentile <strong>${contactName}</strong>,
          </p>
          
          <p style="font-size: 16px; color: #555; line-height: 1.6; margin-bottom: 25px;">
            Il suo ticket è stato ricevuto e preso in carico dal nostro team IT. 
            Riceverà aggiornamenti sullo stato di avanzamento direttamente via email.
          </p>
          
          <div style="background: white; padding: 25px; border-radius: 8px; border-left: 4px solid #667eea; margin-bottom: 25px;">
            <h3 style="margin: 0 0 15px 0; color: #333;">Dettagli del Ticket</h3>
            
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 12px; border-bottom: 1px solid #eee; font-weight: bold; color: #555;">Numero Ticket:</td>
                <td style="padding: 8px 12px; border-bottom: 1px solid #eee; color: #333;">#${ticketNumber}</td>
              </tr>
              <tr>
                <td style="padding: 8px 12px; border-bottom: 1px solid #eee; font-weight: bold; color: #555;">Oggetto:</td>
                <td style="padding: 8px 12px; border-bottom: 1px solid #eee; color: #333;">${ticketTitle}</td>
              </tr>
              <tr>
                <td style="padding: 8px 12px; border-bottom: 1px solid #eee; font-weight: bold; color: #555;">Priorità:</td>
                <td style="padding: 8px 12px; border-bottom: 1px solid #eee;">
                  <span style="background: ${priority === 'urgent' ? '#dc3545' : priority === 'high' ? '#fd7e14' : priority === 'medium' ? '#ffc107' : '#28a745'}; 
                               color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
                    ${priorityLabel}
                  </span>
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 12px; font-weight: bold; color: #555;">Tempo Stimato:</td>
                <td style="padding: 8px 12px; color: #333;">${estimatedTime}</td>
              </tr>
            </table>
          </div>
          
          <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
            <h4 style="margin: 0 0 10px 0; color: #1976d2;">🔔 Prossimi Passi</h4>
            <ul style="margin: 0; padding-left: 20px; color: #555;">
              <li style="margin-bottom: 8px;">Il ticket è stato automaticamente assegnato al tecnico più adatto</li>
              <li style="margin-bottom: 8px;">Riceverà una notifica quando il tecnico inizierà a lavorare sul problema</li>
              <li style="margin-bottom: 8px;">Per aggiornamenti, può accedere al portale o rispondere a questa email</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${Deno.env.get('SUPABASE_URL')}/dashboard" 
               style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; 
                      border-radius: 6px; font-weight: bold; display: inline-block;">
              Monitora il Ticket
            </a>
          </div>
          
          <div style="border-top: 1px solid #eee; padding-top: 20px; text-align: center; color: #888; font-size: 14px;">
            <p>
              Se ha domande urgenti, può contattarci rispondendo a questa email.<br>
              <strong>Team IT - Sistema Ticketing Automatizzato</strong>
            </p>
          </div>
        </div>
      </div>
    `

    const { data, error } = await resend.emails.send({
      from: 'Sistema IT <noreply@yourdomain.com>',
      to: [userEmail],
      subject: `Ticket #${ticketNumber} - Ricevuto e Preso in Carico`,
      html: emailHtml,
    })

    if (error) {
      console.error('Errore invio email:', error)
      return new Response(
        JSON.stringify({ error: error.message }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    return new Response(
      JSON.stringify({ success: true, messageId: data?.id }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  } catch (error) {
    console.error('Errore generale:', error)
    return new Response(
      JSON.stringify({ error: 'Errore interno del server' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
