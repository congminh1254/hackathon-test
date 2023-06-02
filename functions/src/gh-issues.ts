const admin = require("firebase-admin");
const functions = require("firebase-functions");
import { ChatGPTApiService } from "./chatgpt-service/ChatGPTApiService";
import { GithubApiService } from "./github-service/GithubApiService";
import { SlackApiService } from "./slack-service/SlackApiService";

const openaiKey = process.env.OPENAI_KEY ?? "";
const openaiModel = process.env.OPENAI_MODEL ?? "gpt-3.5-turbo";
const slackChannel = process.env.SLACK_CHANNEL ?? "";
const slackToken = process.env.SLACK_TOKEN ?? "";
const githubToken = process.env.GITHUB_TOKEN ?? "";

export const handleOpenIssue = async function (issue: any) {
  const database = admin.database;
  await database().ref("issues").child(issue.id).set(issue);

  functions.logger.info(`Handling issue: ${issue.id}`, {
    structuredData: true,
  });
  functions.logger.debug(`OpenAI Key: ${openaiKey}, Model: ${openaiModel}`, {
    structuredData: true,
  });

  const chatGPTApiService = new ChatGPTApiService(openaiKey, openaiModel);
  const answer = await chatGPTApiService.getAnswer(issue.body);

  const finalAnswer = `Hi @${issue.user.login},\n\n${answer}\n\nThanks!`;

  const slackApiService = new SlackApiService(slackToken);
  await slackApiService.postMessage(
    slackChannel,
    "We have a new Github Issue",
    [
      {
        title: "Title",
        text: `${issue.user.login}: ${issue.title}`,
      },
      {
        title: "Body",
        text: issue.body,
      },
      {
        title: "Generated Answer",
        text: finalAnswer,
      },
      {
        fallback: "Approve this generated answer and post it to Github",
        title: "Approve this generated answer and post it to Github",
        callback_id: `approve-${issue.id}`,
        color: "#3AA3E3",
        attachment_type: "default",
        actions: [
          {
            name: "approve",
            text: "Approve",
            type: "button",
            value: "approve",
            style: "primary",
          },
          {
            name: "reject",
            text: "Reject",
            type: "button",
            value: "reject",
            style: "danger",
          },
          {
            name: "view",
            text: "View on Github",
            type: "button",
            value: "view",
            url: issue.html_url,
          },
        ],
      },
    ]
  );

  await database().ref("issues").child(issue.id).update({
    answer: finalAnswer,
    pending: true,
  });

  return finalAnswer;
};

export const handleSlackAction = async function (payload: any) {
  const database = admin.database;
  const issueId = payload.callback_id.split("-")[1];
  const issue = (
    await database().ref("issues").child(issueId).once("value")
  ).val();
  const slackApiService = new SlackApiService(slackToken);
  const githubApiService = new GithubApiService(githubToken);
  let response: any = "OK";
  switch (payload.actions[0].value) {
    case "approve":
      functions.logger.info(`Approving issue: ${issueId}`, {
        structuredData: true,
      });
      response = {
        text: "Approved Github Issue",
        attachments: [
          {
            title: "Title",
            text: `${issue.user.login}: ${issue.title}`,
          },
          {
            title: "Body",
            text: issue.body,
          },
          {
            title: "Approved Answer",
            text: issue.answer,
          },
          {
            fallback: "View on Github",
            title: "View on Github",
            callback_id: `view-${issue.id}`,
            color: "#3AA3E3",
            attachment_type: "default",
            actions: [
              {
                name: "view",
                text: "View on Github",
                type: "button",
                value: "view",
                url: issue.html_url,
              },
            ],
          },
        ],
      };
      await slackApiService.postMessage(
        slackChannel,
        response.text,
        response.attachments
      );
      await githubApiService.postComment(issue.comments_url, issue.answer);
      await database().ref("issues").child(issueId).update({
        pending: false,
        approved: true,
        approvedAnswer: issue.answer,
        approvedBy: payload.user.name,
      });
      break;
    case "reject":
      functions.logger.info(`Rejecting issue: ${issueId}`, {
        structuredData: true,
      });
      response = {
        text: "Rejected Github Issue",
        attachments: [
          {
            title: "Title",
            text: `${issue.user.login}: ${issue.title}`,
          },
          {
            title: "Body",
            text: issue.body,
          },
          {
            title: "Rejected Answer",
            text: issue.answer,
          },
          {
            text: "This answer was rejected by " + payload.user.name,
          },
          {
            fallback: "View on Github",
            title: "View on Github",
            callback_id: `view-${issue.id}`,
            color: "#3AA3E3",
            attachment_type: "default",
            actions: [
              {
                name: "view",
                text: "View on Github",
                type: "button",
                value: "view",
                url: issue.html_url,
              },
            ],
          },
        ],
      };
      await slackApiService.postMessage(
        slackChannel,
        response.text,
        response.attachments
      );
      await database().ref("issues").child(issueId).update({
        pending: false,
        rejected: true,
        rejectedBy: payload.user.name,
      });
      break;
    default:
      functions.logger.error(`Unknown action: ${payload.actions[0].value}`, {
        structuredData: true,
      });
      break;
  }
  functions.logger.info(`Handled action: ${payload.actions[0].value}`, {
    structuredData: true,
  });
  return response;
};

export const handleGithubIssue = async function (body: any) {
  switch (body.action) {
    case "opened":
      let response = await handleOpenIssue(body.issue);
      return response;
    default:
      throw new Error(`Unknown action: ${body.action}`);
  }
};
