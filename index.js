const express = require('express');
const axios = require('axios');
const app = express();
const port = 5000;

app.use(express.json());

const sendPrompt = async (prompt, system, model) => {
    const url = "http://127.0.0.1:11434/api/generate";
    const headers = {
        'Content-Type': 'application/json'
    };
    const payload = {
        model: model,
        prompt: prompt,
        system: system,
        template: "",
        context: [],
        options: { temperature: 0.8 }
    };

    try {
        const response = await axios.post(url, payload, { headers: headers, responseType: 'stream' });
        let fullResponse = '';
        let buffer = '';

        for await (const chunk of response.data) {
            buffer += chunk.toString('utf-8');
            try {
                // Attempt to find a complete JSON object
                const endOfJson = buffer.indexOf('\n');
                if (endOfJson !== -1) {
                    const jsonPart = buffer.slice(0, endOfJson);
                    buffer = buffer.slice(endOfJson + 1);
                    const jsonResponse = JSON.parse(jsonPart);
                    let cleanResponse = jsonResponse.response || "";
                    // Replace escaped newlines and other common escaped characters
                    cleanResponse = cleanResponse
                        .replace(/\\n/g, '\n')
                        .replace(/\\t/g, '\t')
                        .replace(/\\\"/g, '"')
                        .replace(/\\'/g, "'");
                    fullResponse += cleanResponse;
                    if (jsonResponse.done) {
                        break;
                    }
                }
            } catch (error) {
                console.error('Error parsing JSON:', error);
                // Handle incomplete JSON or parsing errors
            }
        }
        return fullResponse;
    } catch (error) {
        console.error('Error during API call:', error);
        return `Error decoding JSON: ${error.message}`;
    }
};

app.post('/generate', async (req, res) => {
    const { prompt = '', system = 'You are a knowledgeable and helpful assistant.', model = 'mistral' } = req.body;
    const response = await sendPrompt(prompt, system, model);
    res.json({ response });
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});

