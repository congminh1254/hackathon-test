const axios = require('axios');

export class GithubApiService {
    constructor(private readonly githubToken: string){

    }

    async postComment(url: string, content: string): Promise<any> {
        await axios.post(url, {
            body: content
        }, {
            headers: {
                Authorization: `token ${this.githubToken}`
            }
        });
    }
}