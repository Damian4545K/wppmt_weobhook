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
app.post("/webhook", (req, res) => {
  // Parse the request body from the POST
  let body = req.body;
  // Check the Incoming webhook message
  console.log('REQUES ORIGINAL: ' + JSON.stringify(req.body, null, 2));

  // info on WhatsApp text message payload: https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/payload-examples#text-messages
  if (req.body.object) {
    if (
      req.body.entry &&
      req.body.entry[0].changes &&
      req.body.entry[0].changes[0] &&
      req.body.entry[0].changes[0].value.messages &&
      req.body.entry[0].changes[0].value.messages[0]
    ) {
      console.log("Webhook received a message event:" + req.body.entry[0].changes[0].value.contacts[0].wa_id);
      const httpsAgent = new https.Agent({
        rejectUnauthorized: false,
      });
      // Use async function for better error handling
      (async () => {
        try {
          const response = await axios({
            method: "POST",
            url: "https://20.64.248.250/BCP.DevMeta.WebHook/WebHook/WPPReceiveMessage",
            data: body,
            headers: { "Content-Type": "application/json" },
            httpsAgent: httpsAgent, // Set per request instead of global
            timeout: 10000 // 10 second timeout
          });
          console.log(`[${new Date().toISOString()}] Webhook POST succeeded. Status: ${response.status}`);
          console.log(`[${new Date().toISOString()}] Webhook response data:`, JSON.stringify(response.data, null, 2));
        } catch (error) {
          console.error(`[${new Date().toISOString()}] Webhook POST error:`, error.message);
          if (error.response) {
            console.error(`[${new Date().toISOString()}] Webhook POST failed. Status: ${error.response.status}`);
            console.error(`[${new Date().toISOString()}] Webhook error response data:`, JSON.stringify(error.response.data, null, 2));
          } else if (error.code === 'ECONNABORTED') {
            console.error(`[${new Date().toISOString()}] Webhook POST timed out`);
          } else {
            console.error(`[${new Date().toISOString()}] Webhook request error:`, error.message);
          }
        }
      })();
    }
    res.sendStatus(200);
  } else {
    // Return a '404 Not Found' if event is not from a WhatsApp API
    res.sendStatus(404);
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
