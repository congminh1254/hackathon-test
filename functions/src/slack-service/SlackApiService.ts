const { WebClient } = require('@slack/web-api');

export class SlackApiService {
    private client: any | undefined;

    constructor(private readonly slackToken: string){
        
    }
    
    async postMessage(channel: string, text: string, attachments: any = null, blocks: any = null): Promise<any> {
        if (!this.client) {
            this.client = new WebClient(this.slackToken);
        }
        let message: any = {
            channel: channel,
            text: text,
        };
        if (attachments) {
            message['attachments'] = attachments;
        }
        if (blocks) {
            message['blocks'] = blocks;
        }
        const result = await this.client.chat.postMessage(message);

        return result;
    }
}