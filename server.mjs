/*
 * Starter Project for WhatsApp Echo Bot Tutorial
 *
 * Remix this as the starting point for following the WhatsApp Echo Bot tutorial
 *
 */

"use strict";

// Access token for your app
// (copy token from DevX getting started page
// and save it as environment variable into the .env file)
const token = process.env.WHATSAPP_TOKEN;

// Imports dependencies and set up http server
import request from "request";
import express from "express";
import body_parser from "body-parser";
import axios from "axios";
import https from "https";

const app = express().use(body_parser.json()); // creates express http server

// Sets server port and logs message on success
app.listen(process.env.PORT || 1337, () => console.log("webhook is listening"));

// Accepts POST requests at /webhook endpoint
app.post("/webhook", async (req, res) => {
  try {
    // Validar que sea un webhook de WhatsApp válido
    if (!req.body.object) {
      console.warn(`[${new Date().toISOString()}] Received non-WhatsApp webhook`);
      return res.sendStatus(404);
    }

    // Validar estructura del payload de manera más limpia
    const messageData = req.body.entry?.[0]?.changes?.[0]?.value;
    
    if (!messageData?.messages?.[0]) {
      console.log(`[${new Date().toISOString()}] Webhook received without message data`);
      return res.sendStatus(200);
    }

    // Extraer información importante
    const waId = messageData.contacts?.[0]?.wa_id;
    const messageType = messageData.messages[0]?.type;
    
    console.log(`[${new Date().toISOString()}] Webhook received - WA_ID: ${waId}, Type: ${messageType}`);

    // Configuración de axios
    const webhookUrl = process.env.URL_WEBHOOK;
    
    if (!webhookUrl) {
      console.error(`[${new Date().toISOString()}] URL_WEBHOOK environment variable is not set`);
      return res.status(500).send("Server configuration error");
    }

    // Configurar agente HTTPS (solo para desarrollo, en producción usar certificados válidos)
    const httpsAgent = new https.Agent({
      rejectUnauthorized: false,
      keepAlive: true,
      maxSockets: 50,
      timeout: 60000
    });

    console.log(`[${new Date().toISOString()}]  REQUEST: ${JSON.stringify(req.body, null, 2)}`);
    console.log(`[${new Date().toISOString()}]      URL: ${webhookUrl}`);
    
    // Enviar al webhook destino con timeout configurable
    const timeout = parseInt(process.env.WEBHOOK_TIMEOUT_MS) || 60000;
    
    const response = await axios.post(webhookUrl, req.body, {
      headers: { 
        "Content-Type": "application/json",
        "X-Forwarded-For": req.ip,
        "User-Agent": "Webhook-Proxy/1.0"
      },
      httpsAgent,
      timeout,
      maxContentLength: 100 * 1024 * 1024, // 50MB
      maxBodyLength: 100 * 1024 * 1024,    // 50MB
      validateStatus: (status) => status < 500 // Considerar éxito para códigos < 500
    });

    // Log del resultado
    console.log(`[${new Date().toISOString()}] RESPONSE: successfully - Status: ${response.status}, WA_ID: ${waId}`);

    // Responder inmediatamente al remitente
    res.sendStatus(200);

  } catch (error) {
    // Manejo centralizado de errores
    console.error(`[${new Date().toISOString()}] Webhook processing error:`, {
      message: error.message,
      code: error.code,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });

    // Manejo específico de errores de axios
    if (error.response) {
      console.error(`[${new Date().toISOString()}] Destination responded with error:`, {
        status: error.response.status,
        data: error.response.data
      });
    } else if (error.code === 'ECONNABORTED') {
      console.error(`[${new Date().toISOString()}] Request timeout to destination`);
    } else if (error.code === 'ENOTFOUND') {
      console.error(`[${new Date().toISOString()}] Destination host not found: ${process.env.URL_WEBHOOK}`);
    }

    // Aún respondemos 200 a WhatsApp para evitar reintentos
    // (a menos que sea un error de configuración del servidor)
    if (error.message.includes('environment variable')) {
      res.status(500).send("Server configuration error");
    } else {
      res.sendStatus(200);
    }
  }
});


app.get("/", (req, res) => {
  res.send({
    saludo: 'Webhook Meta Facebook'
  });
});
// Accepts GET requests at the /webhook endpoint. You need this URL to setup webhook initially.
// info on verification request payload: https://developers.facebook.com/docs/graph-api/webhooks/getting-started#verification-requests 
app.get("/webhook", (req, res) => {
  /**
   * UPDATE YOUR VERIFY TOKEN
   *This will be the Verify Token value when you set up webhook
  **/
  const verify_token = process.env.VERIFY_TOKEN;

  // Parse params from the webhook verification request
  let mode = req.query["hub.mode"];
  let token = req.query["hub.verify_token"];
  let challenge = req.query["hub.challenge"];

  console.log(mode, token, verify_token, challenge);
  // Check if a token and mode were sent
  if (mode && token) {
    // Check the mode and token sent are correct
    if (mode === "subscribe" && token === verify_token) {
      // Respond with 200 OK and challenge token from the request
      console.log("WEBHOOK_VERIFIED");
      res.status(200).send(challenge);
    } else {
      // Responds with '403 Forbidden' if verify tokens do not match
      res.sendStatus(403);
    }
  }
});
