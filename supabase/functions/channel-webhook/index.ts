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

interface WhatsAppMessage {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: { body: string };
  image?: { id: string; mime_type: string; caption?: string };
  video?: { id: string; mime_type: string; caption?: string };
  audio?: { id: string; mime_type: string };
  document?: { id: string; filename: string; mime_type: string; caption?: string };
}

async function handleWhatsAppStatuses(statuses: any[]) {
  let processed = 0;

  for (const statusUpdate of statuses) {
    const whatsappMessageId = statusUpdate.id;
    const gupshupMessageId = statusUpdate.gs_id;
    const status = statusUpdate.status;
    const recipient = statusUpdate.recipient_id;
    const timestamp = statusUpdate.timestamp;

    console.log(`Processing status update: ${status} for WA message: ${whatsappMessageId}, GS message: ${gupshupMessageId}`);

    const { data: existingMessage } = await supabase
      .from("messages")
      .select("id, status, external_message_id")
      .eq("metadata->>external_id", gupshupMessageId)
      .maybeSingle();

    if (!existingMessage) {
      console.log(`WARNING: No message found with Gupshup ID: ${gupshupMessageId}`);
      continue;
    }

    console.log(`Found message ${existingMessage.id}, current status: ${existingMessage.status}`);

    const statusRecord: any = {
      message_id: existingMessage.id,
      external_message_id: whatsappMessageId,
      status: status,
      destination: recipient,
      status_timestamp: new Date(parseInt(timestamp) * 1000).toISOString(),
      metadata: {
        whatsapp_message_id: whatsappMessageId,
        gupshup_message_id: gupshupMessageId,
        conversation: statusUpdate.conversation,
        pricing: statusUpdate.pricing,
        errors: statusUpdate.errors || []
      }
    };

    if (statusUpdate.errors && statusUpdate.errors.length > 0) {
      const error = statusUpdate.errors[0];
      statusRecord.error_code = error.code?.toString();
      statusRecord.error_reason = error.title || error.message;
      statusRecord.status = 'failed';
    }

    const { data: existingStatus } = await supabase
      .from("message_status")
      .select("id")
      .eq("external_message_id", whatsappMessageId)
      .eq("status", statusRecord.status)
      .eq("status_timestamp", statusRecord.status_timestamp)
      .maybeSingle();

    if (existingStatus) {
      console.log(`Skipping duplicate status: ${statusRecord.status} for WA message ${whatsappMessageId}`);
      continue;
    }

    const { error: insertError } = await supabase.from("message_status").insert(statusRecord);

    if (insertError) {
      console.error(`Failed to insert status: ${insertError.message}`);
    } else {
      console.log(`Successfully inserted ${statusRecord.status} status for message ${existingMessage.id}`);
      processed++;
    }
  }

  return { processed };
}

async function handleGupshupMessageStatus(body: any) {
  if (body.type !== "message-event" || !body.payload) {
    return { processed: 0, skipped: "Not a message status event" };
  }

  const payload = body.payload;
  const messageId = payload.id;
  const status = payload.type;
  const destination = payload.destination;

  const statusRecord: any = {
    external_message_id: messageId,
    status: status,
    destination: destination,
    status_timestamp: new Date(body.timestamp).toISOString(),
    metadata: {
      app: body.app,
      version: body.version,
      payload: payload.payload || {}
    }
  };

  if (status === "failed" && payload.payload) {
    statusRecord.error_code = payload.payload.code?.toString();
    statusRecord.error_reason = payload.payload.reason;
  }

  const { data: existingMessage } = await supabase
    .from("messages")
    .select("id")
    .eq("metadata->>external_id", messageId)
    .maybeSingle();

  if (existingMessage) {
    statusRecord.message_id = existingMessage.id;
  }

  await supabase.from("message_status").insert(statusRecord);

  console.log(`Processed ${status} status for message ${messageId}`);
  return { processed: 1, status, messageId };
}

async function handleWhatsAppWebhook(body: any, channelType: string) {
  const entry = body.entry?.[0];
  const changes = entry?.changes?.[0];
  const value = changes?.value;

  if (value?.statuses) {
    console.log("Processing WhatsApp status updates");
    return await handleWhatsAppStatuses(value.statuses);
  }

  if (!value?.messages) {
    console.log("No messages or statuses found in WhatsApp webhook payload");
    return { processed: 0 };
  }

  const phoneNumberId = value.metadata?.phone_number_id;

  const { data: channel } = await supabase
    .from("channels")
    .select("*")
    .eq("type", channelType)
    .eq("is_active", true)
    .maybeSingle();

  if (!channel) return { error: `${channelType} channel not configured` };

  let processed = 0;

  for (const message of value.messages) {
    const waMessage = message as WhatsAppMessage;
    const contactInfo = value.contacts?.find((c: any) => c.wa_id === waMessage.from);

    let { data: customer } = await supabase
      .from("customers")
      .select("*")
      .eq("channel_type", channelType)
      .eq("external_id", waMessage.from)
      .maybeSingle();

    if (!customer) {
      const { data: newCustomer } = await supabase
        .from("customers")
        .insert({
          external_id: waMessage.from,
          channel_type: channelType,
          name: contactInfo?.profile?.name || waMessage.from,
          metadata: { wa_id: waMessage.from, profile: contactInfo?.profile, phone_number_id: phoneNumberId },
        })
        .select()
        .single();
      customer = newCustomer;
    }

    if (!customer) continue;

    let { data: conversation } = await supabase
      .from("conversations")
      .select("*")
      .eq("customer_id", customer.id)
      .eq("channel_id", channel.id)
      .in("status", ["new", "open", "pending"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!conversation) {
      const { data: newConversation } = await supabase
        .from("conversations")
        .insert({
          channel_id: channel.id,
          customer_id: customer.id,
          status: "open",
          priority: "medium",
          subject: `${channelType} conversation with ${customer.name}`,
        })
        .select()
        .single();
      conversation = newConversation;
    }

    if (!conversation) continue;

    let content = "";
    let contentType = "text";
    let messageMetadata: any = {
      timestamp: waMessage.timestamp,
      phone_number_id: phoneNumberId,
      external_id: waMessage.id,
      gs_app_id: body.gs_app_id
    };

    switch (waMessage.type) {
      case "text":
        content = waMessage.text?.body || "";
        break;
      case "image":
        contentType = "image";
        content = waMessage.image?.caption || "";
        messageMetadata.attachment = { type: "image", id: waMessage.image?.id, mime_type: waMessage.image?.mime_type };
        break;
      case "video":
        contentType = "video";
        content = waMessage.video?.caption || "";
        messageMetadata.attachment = { type: "video", id: waMessage.video?.id, mime_type: waMessage.video?.mime_type };
        break;
      case "audio":
        contentType = "audio";
        messageMetadata.attachment = { type: "audio", id: waMessage.audio?.id, mime_type: waMessage.audio?.mime_type };
        break;
      case "document":
        contentType = "document";
        content = waMessage.document?.caption || "";
        messageMetadata.attachment = { type: "document", id: waMessage.document?.id, filename: waMessage.document?.filename, mime_type: waMessage.document?.mime_type };
        break;
      default:
        content = `[${waMessage.type} message]`;
    }

    await supabase.from("messages").insert({
      conversation_id: conversation.id,
      sender_type: "customer",
      content,
      content_type: contentType,
      metadata: messageMetadata,
    });

    await supabase
      .from("conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", conversation.id);

    processed++;
  }

  return { processed };
}

async function handleMessengerWebhook(body: any) {
  const entry = body.entry?.[0];
  const messaging = entry?.messaging?.[0];

  if (!messaging?.message) return { processed: 0 };

  const senderId = messaging.sender?.id;
  const pageId = messaging.recipient?.id;

  const { data: channel } = await supabase
    .from("channels")
    .select("*")
    .eq("type", "messenger")
    .eq("is_active", true)
    .maybeSingle();

  if (!channel) return { error: "Messenger channel not configured" };

  let { data: customer } = await supabase
    .from("customers")
    .select("*")
    .eq("channel_type", "messenger")
    .eq("external_id", senderId)
    .maybeSingle();

  if (!customer) {
    const { data: newCustomer } = await supabase
      .from("customers")
      .insert({
        external_id: senderId,
        channel_type: "messenger",
        name: `Messenger User ${senderId.slice(-6)}`,
        metadata: { psid: senderId, page_id: pageId },
      })
      .select()
      .single();
    customer = newCustomer;
  }

  if (!customer) return { error: "Failed to create customer" };

  let { data: conversation } = await supabase
    .from("conversations")
    .select("*")
    .eq("customer_id", customer.id)
    .eq("channel_id", channel.id)
    .in("status", ["new", "open", "pending"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!conversation) {
    const { data: newConversation } = await supabase
      .from("conversations")
      .insert({
        channel_id: channel.id,
        customer_id: customer.id,
        status: "open",
        priority: "medium",
        subject: `Messenger conversation with ${customer.name}`,
      })
      .select()
      .single();
    conversation = newConversation;
  }

  if (!conversation) return { error: "Failed to create conversation" };

  const msg = messaging.message;
  let content = msg.text || "";
  let contentType = "text";
  let messageMetadata: any = { timestamp: messaging.timestamp, page_id: pageId, external_id: msg.mid };

  if (msg.attachments && msg.attachments.length > 0) {
    const att = msg.attachments[0];
    contentType = att.type === "image" ? "image" :
                  att.type === "video" ? "video" :
                  att.type === "audio" ? "audio" : "document";
    messageMetadata.attachment = { type: att.type, url: att.payload.url };
  }

  await supabase.from("messages").insert({
    conversation_id: conversation.id,
    sender_type: "customer",
    content,
    content_type: contentType,
    metadata: messageMetadata,
  });

  await supabase
    .from("conversations")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", conversation.id);

  return { processed: 1 };
}

async function handleInstagramWebhook(body: any) {
  const entry = body.entry?.[0];
  const messaging = entry?.messaging?.[0];

  if (!messaging?.message) return { processed: 0 };

  const senderId = messaging.sender?.id;
  const recipientId = messaging.recipient?.id;

  const { data: channel } = await supabase
    .from("channels")
    .select("*")
    .eq("type", "instagram")
    .eq("is_active", true)
    .maybeSingle();

  if (!channel) return { error: "Instagram channel not configured" };

  let { data: customer } = await supabase
    .from("customers")
    .select("*")
    .eq("channel_type", "instagram")
    .eq("external_id", senderId)
    .maybeSingle();

  if (!customer) {
    const { data: newCustomer } = await supabase
      .from("customers")
      .insert({
        external_id: senderId,
        channel_type: "instagram",
        name: `Instagram User ${senderId.slice(-6)}`,
        metadata: { igsid: senderId, recipient_id: recipientId },
      })
      .select()
      .single();
    customer = newCustomer;
  }

  if (!customer) return { error: "Failed to create customer" };

  let { data: conversation } = await supabase
    .from("conversations")
    .select("*")
    .eq("customer_id", customer.id)
    .eq("channel_id", channel.id)
    .in("status", ["new", "open", "pending"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!conversation) {
    const { data: newConversation } = await supabase
      .from("conversations")
      .insert({
        channel_id: channel.id,
        customer_id: customer.id,
        status: "open",
        priority: "medium",
        subject: `Instagram conversation with ${customer.name}`,
      })
      .select()
      .single();
    conversation = newConversation;
  }

  if (!conversation) return { error: "Failed to create conversation" };

  const msg = messaging.message;
  let content = msg.text || "";
  let contentType = "text";
  let messageMetadata: any = { timestamp: messaging.timestamp, external_id: msg.mid };

  if (msg.attachments && msg.attachments.length > 0) {
    const att = msg.attachments[0];
    contentType = att.type === "image" ? "image" :
                  att.type === "video" ? "video" : "document";
    messageMetadata.attachment = { type: att.type, url: att.payload?.url };
  }

  await supabase.from("messages").insert({
    conversation_id: conversation.id,
    sender_type: "customer",
    content,
    content_type: contentType,
    metadata: messageMetadata,
  });

  await supabase
    .from("conversations")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", conversation.id);

  return { processed: 1 };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const url = new URL(req.url);
  let body: any = null;

  try {
    const channelType = url.searchParams.get("channel") || "whatsapp";

    if (req.method === "GET") {
      const mode = url.searchParams.get("hub.mode");
      const token = url.searchParams.get("hub.verify_token");
      const challenge = url.searchParams.get("hub.challenge");

      if (mode === "subscribe") {
        const { data: channel } = await supabase
          .from("channels")
          .select("config")
          .eq("type", channelType)
          .maybeSingle();

        const expectedToken = (channel?.config as any)?.webhook_verify_token;

        if (token === expectedToken) {
          return new Response(challenge, { status: 200, headers: corsHeaders });
        }
      }

      return new Response("Forbidden", { status: 403, headers: corsHeaders });
    }

    if (req.method === "POST") {
      body = await req.json();

      console.log("=== Incoming Webhook ===");
      console.log("URL:", url.pathname + url.search);
      console.log("Body type:", body.type);
      console.log("Body object:", body.object);
      console.log("Full body:", JSON.stringify(body, null, 2));

      await supabase.from("webhook_logs").insert({
        webhook_url: url.pathname + url.search,
        method: req.method,
        headers: Object.fromEntries(req.headers.entries()),
        body: body,
        processed: false,
      });

      let result;
      let errorMsg: string | null = null;

      try {
        if (body.type === "message-event") {
          console.log("Processing Gupshup message status event");
          result = await handleGupshupMessageStatus(body);
        } else if (body.object === "whatsapp_business_account" && body.entry) {
          console.log("Processing WhatsApp webhook");
          result = await handleWhatsAppWebhook(body, channelType);
        } else if (body.object === "page") {
          console.log("Processing Messenger webhook");
          result = await handleMessengerWebhook(body);
        } else if (body.object === "instagram") {
          console.log("Processing Instagram webhook");
          result = await handleInstagramWebhook(body);
        } else {
          console.log("Unknown webhook type, keys:", Object.keys(body));
          result = { error: "Unknown webhook type", received: Object.keys(body) };
          errorMsg = "Unknown webhook type";
        }

        await supabase.from("webhook_logs").insert({
          webhook_url: url.pathname + url.search,
          method: req.method,
          body: body,
          processed: !errorMsg,
          error: errorMsg,
        });
      } catch (handlerError) {
        errorMsg = String(handlerError);
        throw handlerError;
      }

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  } catch (error) {
    const errorMsg = String(error);

    if (body) {
      await supabase.from("webhook_logs").insert({
        webhook_url: url.pathname + url.search,
        method: req.method,
        body: body,
        processed: false,
        error: errorMsg,
      });
    }

    return new Response(JSON.stringify({ error: "Internal server error", details: errorMsg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});