async function ask(message, history, assistant, callback, controller) {
    return new Promise(async (resolve, reject) => {
        try {
            const messages = [{ role: "system", content: assistant.systemPrompt }]
            for (const message of history) {
                messages.push({ role: message.role === "user" ? "user" : "assistant", content: message.content });
            }
            messages.push({ role: "user", content: message });
    
            const params = {
                api_key: assistant.params.api_key,
                api_url: assistant.params.api_url,
                model: assistant.modelFile,
                temperature: assistant.params.temperature,
                max_tokens: assistant.params.max_tokens,
                top_p: assistant.params.top_p,
                frequency_penalty: assistant.params.frequency_penalty,
                presence_penalty: assistant.params.presence_penalty,
                stop: assistant.stopTemplate,
            }

            const request = openai(messages, params, controller);
            let content = "";
            for await (const chunk of request) {
                content += chunk.data.choices[0].delta.content;
                callback && callback(chunk.data.choices[0].delta.content);
            }
            resolve(content);
        } catch (e) {
            reject(e);
        }
    });
}

async function* openai(messages, params = {}, controller) {
    controller = controller ?? new AbortController()
    const api_url = params.api_url;
    if (!api_url) {
        throw new Error("api_url is required");
    }

    const completionParams = { ...params, messages, stream: true };
    delete completionParams.api_key
    delete completionParams.api_url

    const response = await fetch(`${api_url}`, {
        method: 'POST',
        body: JSON.stringify(completionParams),
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${params.api_key}`
        },
        signal: controller.signal,
    })

    if(response.status !== 200) {
        throw new Error(`Failed to connect openai: ${response.statusText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    let content = "";
    let leftover = ""; // Buffer for partially read lines

    try {
        let cont = true;

        while (cont) {
            const result = await reader.read();
            if (result.done) {
                break;
            }

            // Add any leftover data to the current chunk of data
            const text = leftover + decoder.decode(result.value);

            // Check if the last character is a line break
            const endsWithLineBreak = text.endsWith('\n');

            // Split the text into lines
            let lines = text.split('\n');

            // If the text doesn't end with a line break, then the last line is incomplete
            // Store it in leftover to be added to the next chunk of data
            if (!endsWithLineBreak) {
                leftover = lines.pop();
            } else {
                leftover = ""; // Reset leftover if we have a line break at the end
            }

            // Parse all sse events and add them to result
            const regex = /^(\S+):\s(.*)$/gm;
            for (const line of lines) {
                const match = regex.exec(line);
                if (match) {
                    result[match[1]] = match[2];
                    // since we know this is llama.cpp, let's just decode the json in data
                    if (result.data && result.data !== "[DONE]") {
                        result.data = JSON.parse(result.data);

                        if (result.data.choices[0].finish_reason) {
                            if (result.data.generation_settings) {
                                generation_settings = result.data.generation_settings;
                            }
                            cont = false;
                            break;
                        }

                        content += result.data.choices[0].delta.content;

                        // yield
                        yield result;
                    }
                }
            }
        }
    } catch (e) {
        if (e.name !== 'AbortError') {
            console.error("llama error: ", e);
        }
        throw e;
    }
    finally {
        controller.abort();
    }

    return content;
}

async function getModels(api_key) {
    const response = await fetch(`https://api.openai.com/v1/models`
    , {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${api_key}`
        },
    })
    return await response.json();
}

module.exports = { ask, getModels }