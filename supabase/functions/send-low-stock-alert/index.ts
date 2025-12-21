import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface LowStockItem {
  part_number: string;
  part_name: string;
  quantity: number;
  reorder_level: number;
  category: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Fetch low stock items
    const { data: lowStockItems, error: fetchError } = await supabaseClient
      .from("inventory")
      .select("part_number, part_name, quantity, reorder_level, category")
      .filter("quantity", "lte", supabaseClient.rpc("get_reorder_level_column"))
      .order("quantity", { ascending: true });

    // Alternative: fetch all and filter in code since the above may not work
    const { data: allItems, error } = await supabaseClient
      .from("inventory")
      .select("part_number, part_name, quantity, reorder_level, category")
      .order("quantity", { ascending: true });

    if (error) {
      throw error;
    }

    const items: LowStockItem[] = (allItems || []).filter(
      (item) => item.quantity <= item.reorder_level
    );

    if (items.length === 0) {
      return new Response(
        JSON.stringify({ message: "No low stock items found" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Get notification email from settings
    const { data: emailSetting } = await supabaseClient
      .from("settings")
      .select("value")
      .eq("key", "notification_email")
      .single();

    const { data: businessSetting } = await supabaseClient
      .from("settings")
      .select("value")
      .eq("key", "business_name")
      .single();

    const notificationEmail = emailSetting?.value;
    const businessName = businessSetting?.value || "AutoParts AZ";

    if (!notificationEmail) {
      return new Response(
        JSON.stringify({ error: "No notification email configured in settings" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Generate email HTML
    const itemsTableRows = items
      .map(
        (item) => `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${item.part_number}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${item.part_name}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${item.category}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: ${item.quantity === 0 ? '#dc2626' : '#f59e0b'}; font-weight: bold;">${item.quantity}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${item.reorder_level}</td>
        </tr>
      `
      )
      .join("");

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #f3f4f6;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <div style="background: linear-gradient(135deg, #3b82f6, #8b5cf6); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">⚠️ Low Stock Alert</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">${businessName}</p>
            </div>
            <div style="padding: 30px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                The following items are at or below their reorder levels and need restocking:
              </p>
              <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <thead>
                  <tr style="background-color: #f9fafb;">
                    <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb; color: #6b7280;">Part #</th>
                    <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb; color: #6b7280;">Name</th>
                    <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb; color: #6b7280;">Category</th>
                    <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb; color: #6b7280;">Current</th>
                    <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb; color: #6b7280;">Reorder At</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsTableRows}
                </tbody>
              </table>
              <div style="margin-top: 30px; padding: 20px; background-color: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b;">
                <p style="margin: 0; color: #92400e; font-size: 14px;">
                  <strong>Total items requiring attention:</strong> ${items.length}
                </p>
              </div>
            </div>
            <div style="background-color: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 12px;">
              <p style="margin: 0;">This is an automated notification from ${businessName}</p>
              <p style="margin: 5px 0 0 0;">Generated at ${new Date().toLocaleString()}</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send email using Resend API
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `${businessName} <onboarding@resend.dev>`,
        to: [notificationEmail],
        subject: `⚠️ Low Stock Alert - ${items.length} items need restocking`,
        html: emailHtml,
      }),
    });

    const emailResult = await emailResponse.json();

    if (!emailResponse.ok) {
      throw new Error(emailResult.message || "Failed to send email");
    }

    console.log("Email sent successfully:", emailResult);

    return new Response(
      JSON.stringify({ 
        success: true, 
        itemsCount: items.length,
        emailId: emailResult.id 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-low-stock-alert function:", error);
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
