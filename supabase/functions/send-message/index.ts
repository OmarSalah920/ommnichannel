import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface SendMessageRequest {
  conversation_id: string;
  content: string;
  message_type?: string;
}

interface SendResult {
  success: boolean;
  external_id?: string;
  error?: string;
  error_code?: string;
  details?: any;
}

function formatPhoneNumber(phone: string): string {
  return phone.replace(/\s+/g, '').replace(/[^\d]/g, '');
}

async function logSendAttempt(
  conversationId: string,
  channelType: string,
  recipientId: string,
  content: string,
  success: boolean,
  errorMessage: string | null,
  apiResponse: any,
  externalMessageId: string | null
) {
  try {
    await supabase.from("message_send_logs").insert({
      conversation_id: conversationId,
      channel_type: channelType,
      recipient_id: recipientId,
      content: content.substring(0, 500),
      success,
      error_message: errorMessage,
      api_response: apiResponse,
      external_message_id: externalMessageId,
    });
  } catch (error) {
    console.error("Failed to log send attempt:", error);
  }
}

async function sendWhatsAppViaGupshup(
  config: any,
  recipientId: string,
  content: string
): Promise<SendResult> {
  const apiKey = config.gupshup_api_key;
  const appName = config.gupshup_app_name;
  const sourcePhone = config.source_phone;

  console.log("=== Gupshup Send Config ===");
  console.log("App Name:", appName);
  console.log("Source Phone:", sourcePhone);
  console.log("Recipient:", recipientId);
  console.log("API Key exists:", !!apiKey);

  if (!apiKey || !appName || !sourcePhone) {
    const missing = [];
    if (!apiKey) missing.push("gupshup_api_key");
    if (!appName) missing.push("gupshup_app_name");
    if (!sourcePhone) missing.push("source_phone");

    return {
      success: false,
      error: `Missing WhatsApp configuration: ${missing.join(", ")}`,
      error_code: "CONFIG_MISSING",
      details: { missing }
    };
  }

  const formattedSource = formatPhoneNumber(sourcePhone);
  const formattedDestination = formatPhoneNumber(recipientId);

  const messagePayload = {
    type: "text",
    text: content,
    previewUrl: true,
  };

  const requestBody = new URLSearchParams({
    channel: "whatsapp",
    source: formattedSource,
    destination: formattedDestination,
    "src.name": appName,
    message: JSON.stringify(messagePayload),
  });

  console.log("=== Gupshup API Request ===");
  console.log("URL: https://api.gupshup.io/wa/api/v1/msg");
  console.log("Source:", formattedSource);
  console.log("Destination:", formattedDestination);
  console.log("Message:", JSON.stringify(messagePayload));

  try {
    const response = await fetch("https://api.gupshup.io/wa/api/v1/msg", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Cache-Control": "no-cache",
        "apikey": apiKey,
      },
      body: requestBody.toString(),
    });

    const responseText = await response.text();
    console.log("=== Gupshup API Response ===");
    console.log("Status:", response.status);
    console.log("Response:", responseText);

    let result: any;
    try {
      result = JSON.parse(responseText);
    } catch {
      return {
        success: false,
        error: `Invalid API response: ${responseText}`,
        error_code: "INVALID_RESPONSE",
        details: { responseText, status: response.status }
      };
    }

    if (!response.ok) {
      return {
        success: false,
        error: result.message || `API error: ${response.status}`,
        error_code: result.code || "API_ERROR",
        details: result
      };
    }

    if (result.status === "submitted") {
      console.log("Message submitted successfully, ID:", result.messageId);
      return {
        success: true,
        external_id: result.messageId,
        details: result
      };
    }

    if (result.status === "error") {
      return {
        success: false,
        error: result.message || "Gupshup returned error status",
        error_code: result.code || "GUPSHUP_ERROR",
        details: result
      };
    }

    return {
      success: false,
      error: `Unexpected status: ${result.status}`,
      error_code: "UNEXPECTED_STATUS",
      details: result
    };

  } catch (error) {
    console.error("Gupshup API call failed:", error);
    return {
      success: false,
      error: `Network error: ${String(error)}`,
      error_code: "NETWORK_ERROR",
      details: { error: String(error) }
    };
  }
}

async function sendMessengerMessage(
  config: any,
  recipientId: string,
  content: string
): Promise<SendResult> {
  const pageAccessToken = config.page_access_token;

  if (!pageAccessToken) {
    return {
      success: false,
      error: "Missing Messenger page_access_token",
      error_code: "CONFIG_MISSING"
    };
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/me/messages?access_token=${pageAccessToken}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient: { id: recipientId },
          messaging_type: "RESPONSE",
          message: { text: content },
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result.error?.message || "Messenger API error",
        error_code: result.error?.code?.toString() || "API_ERROR",
        details: result
      };
    }

    return {
      success: true,
      external_id: result.message_id,
      details: result
    };
  } catch (error) {
    return {
      success: false,
      error: `Network error: ${String(error)}`,
      error_code: "NETWORK_ERROR"
    };
  }
}

async function sendInstagramMessage(
  config: any,
  recipientId: string,
  content: string
): Promise<SendResult> {
  const pageAccessToken = config.page_access_token;

  if (!pageAccessToken) {
    return {
      success: false,
      error: "Missing Instagram page_access_token",
      error_code: "CONFIG_MISSING"
    };
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/me/messages?access_token=${pageAccessToken}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient: { id: recipientId },
          message: { text: content },
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result.error?.message || "Instagram API error",
        error_code: result.error?.code?.toString() || "API_ERROR",
        details: result
      };
    }

    return {
      success: true,
      external_id: result.message_id,
      details: result
    };
  } catch (error) {
    return {
      success: false,
      error: `Network error: ${String(error)}`,
      error_code: "NETWORK_ERROR"
    };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  console.log("=== Send Message Request ===");
  console.log("Method:", req.method);
  console.log("URL:", req.url);

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.log("Missing authorization header");
      return new Response(JSON.stringify({ error: "Unauthorized", error_code: "NO_AUTH" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let body: SendMessageRequest;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body", error_code: "INVALID_JSON" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { conversation_id, content, message_type = "text" } = body;
    console.log("Conversation ID:", conversation_id);
    console.log("Content:", content?.substring(0, 50));
    console.log("Message Type:", message_type);

    if (!conversation_id || !content) {
      return new Response(JSON.stringify({
        error: "Missing required fields",
        error_code: "MISSING_FIELDS",
        details: { conversation_id: !!conversation_id, content: !!content }
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .select(`
        *,
        channel:channels(*),
        customer:customers(*)
      `)
      .eq("id", conversation_id)
      .single();

    if (convError) {
      console.error("Error fetching conversation:", convError);
      return new Response(JSON.stringify({
        error: "Failed to fetch conversation",
        error_code: "DB_ERROR",
        details: convError
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!conversation) {
      return new Response(JSON.stringify({
        error: "Conversation not found",
        error_code: "NOT_FOUND"
      }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const channel = conversation.channel;
    const customer = conversation.customer;

    console.log("Channel:", channel?.type, "Active:", channel?.is_active);
    console.log("Customer:", customer?.external_id);

    if (!channel) {
      return new Response(JSON.stringify({
        error: "Channel not found",
        error_code: "NO_CHANNEL"
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!channel.is_active) {
      return new Response(JSON.stringify({
        error: "Channel is not active",
        error_code: "CHANNEL_INACTIVE"
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!customer) {
      return new Response(JSON.stringify({
        error: "Customer not found",
        error_code: "NO_CUSTOMER"
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sendResult: SendResult;

    switch (channel.type) {
      case "whatsapp":
        sendResult = await sendWhatsAppViaGupshup(
          channel.config,
          customer.external_id,
          content
        );
        break;
      case "messenger":
        sendResult = await sendMessengerMessage(
          channel.config,
          customer.external_id,
          content
        );
        break;
      case "instagram":
        sendResult = await sendInstagramMessage(
          channel.config,
          customer.external_id,
          content
        );
        break;
      default:
        return new Response(JSON.stringify({
          error: `Unsupported channel type: ${channel.type}`,
          error_code: "UNSUPPORTED_CHANNEL"
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    console.log("=== Send Result ===");
    console.log("Success:", sendResult.success);
    console.log("External ID:", sendResult.external_id);
    console.log("Error:", sendResult.error);

    await logSendAttempt(
      conversation_id,
      channel.type,
      customer.external_id,
      content,
      sendResult.success,
      sendResult.error || null,
      sendResult.details || {},
      sendResult.external_id || null
    );

    if (!sendResult.success) {
      return new Response(JSON.stringify({
        success: false,
        error: sendResult.error,
        error_code: sendResult.error_code,
        details: sendResult.details
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);

    const { data: savedMessage, error: insertError } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversation_id,
        sender_type: "agent",
        sender_id: user?.id,
        content: content,
        content_type: message_type,
        status: "enqueued",
        metadata: {
          external_id: sendResult.external_id,
          channel_type: channel.type,
          sent_at: new Date().toISOString()
        },
      })
      .select()
      .single();

    if (insertError) {
      console.error("Failed to save message to database:", insertError);
    } else {
      console.log("Message saved with ID:", savedMessage?.id);

      await supabase.from("message_status").insert({
        message_id: savedMessage?.id,
        external_message_id: sendResult.external_id,
        status: "enqueued",
        status_timestamp: new Date().toISOString(),
        metadata: {
          channel_type: channel.type,
          initial_status: true
        }
      });
    }

    await supabase
      .from("conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", conversation_id);

    return new Response(JSON.stringify({
      success: true,
      external_id: sendResult.external_id,
      message_id: savedMessage?.id,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("=== Unhandled Error ===");
    console.error(error);

    return new Response(JSON.stringify({
      success: false,
      error: "Internal server error",
      error_code: "INTERNAL_ERROR",
      details: String(error)
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});