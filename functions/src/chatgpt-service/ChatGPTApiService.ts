import { OpenAIApi, Configuration, ChatCompletionRequestMessage } from "openai";

export class ChatGPTApiService {
    private client: OpenAIApi | undefined;

    constructor(private readonly openaiKey: string, private readonly model: string){
        
    }
    
    async getAnswer(question: string): Promise<string> {
        if (!this.client) {
            this.client = new OpenAIApi(
                new Configuration({apiKey: this.openaiKey})
            );
        }

        let messages: ChatCompletionRequestMessage[] = [
            { role: "user", content: question }
        ];

        const result = await this.client.createChatCompletion({
            model: this.model,
            messages: messages,
          });
         
          return result.data.choices[0].message?.content ?? 'NONE';
    }
}
