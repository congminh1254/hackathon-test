import * as functions from "firebase-functions";
import { handleGithubIssue, handleSlackAction } from "./gh-issues";
const admin = require("firebase-admin");
admin.initializeApp();

// // Start writing functions
// // https://firebase.google.com/docs/functions/typescript
//
export const helloWorld = functions.https.onRequest((request, response) => {
  functions.logger.info("Hello logs!", { structuredData: true });
  response.send("Hello from Firebase!");
});

export const githubWebhook = functions.https.onRequest(async (request, response) => {
  functions.logger.info("Github Webhook!", { structuredData: true });
  functions.logger.debug(request.headers, { structuredData: true });
  functions.logger.debug(request.body, { structuredData: true });

  // Generate answer
  const answer = await handleGithubIssue(request.body);
  response.send(answer);
});

export const slackWebhook = functions.https.onRequest(async (request, response) => {
    functions.logger.info("Slack Webhook!", { structuredData: true });
    functions.logger.debug(request.headers, { structuredData: true });
    functions.logger.debug(request.body, { structuredData: true });
    
    const payload = JSON.parse(request.body.payload);
    await handleSlackAction(payload);

    response.send('OK');
});