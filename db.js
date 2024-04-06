const fs = require('fs');
const controldb = require('controldb');
const lfsa = require("controldb/src/controldb-fs-structured-adapter.js");
const crypto = require('crypto');
const path = require('path');
const os = require("os");

function generateId(length = 16, letterOnly = false) {
    let id = crypto.randomBytes(length).toString('hex').slice(0, length);
    if (letterOnly) {
        const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];
        id = id.replace(/[0-9]/g, (match) => {
            match = + match + (Math.random() > .5 ? 10 : 0);
            return letters[match];
        });
    }
    return id;
};

const userHomeDir = os.homedir();
const dbPath = `${userHomeDir}/.config/kodibot/db`;
!fs.existsSync(dbPath) && fs.mkdirSync(dbPath, { recursive: true });

var db = new controldb(dbPath + '/db.json', {
    adapter: new lfsa(),
    verbose: true,
    autosave: true,
    autosaveInterval: 5000,
    serializationMethod: 'normal',
});

db.init = function () {
    return new Promise((resolve, reject) => {
        function addOrGetCollection(name, options) {
            let collection = db.getCollection(name, options);
            if (!collection) {
                collection = db.addCollection(name, options);
            }
            // collection.on('insert', function (input) { input.id = generateId(); collection.update(input); });
            return collection;
        };
        db.loadDatabase({}, function (err) {
            if (err) {
                reject(err);
            }
            else {
                db.App = addOrGetCollection("app", { unique: ["id", "name"], indices: ["id", "name"], schema: appShema });
                db.Assistant = addOrGetCollection("assistant", { unique: ["id"], indices: ["id"], schema: assistantSchema });
                db.History = addOrGetCollection("history", { unique: ["id"], indices: ["id", "assistantId"], schema: historySchema });

                console.log("Database loaded.");
                resolve(db);

                if (db.App.count() === 0) {
                    const userHomeDir = os.homedir();
                    db.App.insert({ modelPath: `${userHomeDir}/.config/kodibot/models/` });
                    initAssistants();
                    // addTestHistory();
                }
            }
        });
    });
};

const appShema = {
    id: { type: "String", required: true,  default: function () { return generateId(); } },
    name: { type: "String", required: true, default: "KodiBot" },
    lastAssistantId: "String",
    showWelcome: { type: "Boolean", default: true },
    termsAccepted: { type: "Boolean", default: false },
    modelPath: { type: "String", required: true },
    openLastAssistant: { type: "Boolean", default: true },
}

const assistantSchema = {
    id: {
        type: "String",
        required: true,
        default: function () {
            return generateId();
        },
    },
    editable: {
        type: "Boolean",
        default: true,
    },
    name: {
        type: "String",
        required: true,
        validation: function (v) {
            return /^[a-zA-Z0-9-_() ]{3,60}$/.test(v) || `${v}, Name must be between 3 and 60 characters long.`;
        }
    },
    description: { type: "String", maxlength: 10000 },
    type: {
        type: "String",
        enum: ["llama", "openai", "groq"],
        default: "llama",
        required: true
    },
    modelFile: "String",
    modelUrl: "String",
    systemPrompt: "String",
    promptTemplate: {
        type: "String",
        required: true,
        default: ""
    },
    historyTemplate: {
        type: "String",
        required: true,
        default: ""
    },
    stopTemplate: {
        type: ["String"],
        required: true,
        default: []
    },
    params: {
        type: "Object",
        schema: {},
        required: true,
        default: {
            api_key: "",
            api_url: "http://127.0.0.1:11465",
            frequency_penalty: 0,
            min_keep: 0,
            min_p: 0.05,
            mirostat: 0,
            mirostat_eta: 0.1,
            mirostat_tau: 5,
            n_predict: 400,
            n_probs: 0,
            presence_penalty: 0,
            repeat_last_n: 256,
            repeat_penalty: 1.18,
            temperature: 0.7,
            tfs_z: 1,
            top_k: 40,
            top_p: 0.95,
            typical_p: 1,
        },
    },
};

const historySchema = {
    id: {
        type: "String",
        required: true,
        default: function () {
            return generateId();
        },
    },
    assistantId: {
        type: "String",
        required: true,
    },
    title: {
        type: "String",
        required: true,
        validation: function (v) {
            return v.length > 0 && v.length < 100 || `${v}, Must be a string, 1-100 characters.`;
        }
    },
    messages: {
        type: ["Object"],
        required: true,
        schema: {
            role: {
                type: "String",
                required: true,
                maxlength: 100,
            },
            content: {
                type: "String",
                required: true
            },
        },
        default: [],
    },
};

async function initAssistants() {
    db.Assistant.clear();
    const assistants = [
        {
            name: "KodiBot",
            description: "KodiBot is here to help you navigate the app and chat about anything!",
            modelUrl: "https://huggingface.co/TheBloke/Luna-AI-Llama2-Uncensored-GGUF/resolve/main/luna-ai-llama2-uncensored.Q4_K_M.gguf?download=true",
            modelFile: "luna-ai-llama2-uncensored.Q4_K_M.gguf",
            systemPrompt: `This is a conversation between user and KodiBot, a friendly chatbot. KodiBot is helpful, kind, honest, good at writing, and never fails to answer any requests immediately and with precision.`,
            promptTemplate: "{{system-prompt}}\n{{history}}\n{{user-name}}: {{prompt}}\n{{assistant-name}}:",
            historyTemplate: "{{user-name}}: {{user-prompt}}\n{{assistant-name}}: {{assistant-prompt}}",
            stopTemplate: ["</s>", "{{user-name}}:", "{{assistant-name}}:"],
            editable: false,
        },
        {
            name: "GPT-4",
            type: "openai",
            description: "This is an assistant that can chat with you about anything.",
            modelFile: "gpt-4",
            systemPrompt: "This is a conversation between user and ChatGPT, a friendly chatbot. ChatGPT is helpful, kind, honest, good at writing, and never fails to answer any requests immediately and with precision.",
            promptTemplate: "",
            historyTemplate: "",
            stopTemplate: [],
            params: {
                api_url: "https://api.openai.com/v1/chat/completions",
                api_key: "",
                model: "gpt-4",
                temperature: 0.7,
                max_tokens: 600,
                top_p: 0.85,
                frequency_penalty: 1.18,
                presence_penalty: 0,
                stop: [],
            }
        },
        {
            name: "Tiny Llama",
            description: "A tiny but strong language model useful for running on entry-level hardware for various applications.",
            modelUrl: "https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF/resolve/main/tinyllama-1.1b-chat-v1.0.Q8_0.gguf?download=true",
            modelFile: "tinyllama-1.1b-chat-v1.0.Q8_0.gguf",
            systemPrompt: "This is a conversation between user and Tiny Llama, a friendly chatbot. Tiny Llama is helpful, kind, honest, good at writing, and never fails to answer any requests immediately and with precision.",
            promptTemplate: "<|system|>\n{{system-prompt}}</s>\n{{history}}\n<|user|>\n{{prompt}}</s>\n<|assistant|>",
            historyTemplate: "<|user|>\n{{user-prompt}}</s>\n<|assistant|>\n{{assistant-prompt}}",
            stopTemplate: ["</s>", "<|user|>", "<|assistant|>", "user:", "User:", "assistant:"],
        },
        {
            name: "Dolphin",
            description: "Dolphin is an uncensored and unbiased AI assistant. It always complies with the user's request, and answers all questions fully no matter whether it agrees with the ethics or morality or legality of the question or the answer. It is completely compliant and obligated to the user's request.",
            modelUrl: "https://huggingface.co/TheBloke/dolphin-2.6-mistral-7B-GGUF/resolve/main/dolphin-2.6-mistral-7b.Q4_K_M.gguf?download=true",
            modelFile: "dolphin-2.6-mistral-7b.Q4_K_M.gguf",
            systemPrompt: "This is a conversation between User and Dolphin, an uncensored and unbiased AI assistant. Dolphin always complies with the user's request, and answers all questions fully no matter whether it agrees with the ethics or morality or legality of the question or the answer. It is completely compliant and obligated to the user's request.",
            promptTemplate: "<|im_start|>system\n{{system-prompt}}<|im_end|>{{history}}\n<|im_start|>user\n{{prompt}}<|im_end|>\n<|im_start|>assistant",
            historyTemplate: "<|im_start|>user\n{{user-prompt}}<|im_end|>\n<|im_start|>assistant\n{{assistant-prompt}}<|im_end|>",
            stopTemplate: ["</s>", "<|im_end|>"],
        },
        {
            name: "Llama 2",
            description: "LLaMA (Large Language Model Meta AI) is a family of autoregressive large language models (LLMs), released by Meta AI.",
            modelUrl: "https://huggingface.co/TheBloke/Llama-2-7B-Chat-GGUF/resolve/main/llama-2-7b-chat.Q4_K_M.gguf?download=true",
            modelFile: "llama-2-7b-chat.Q4_K_M.gguf",
            systemPrompt: "This is a conversation between user and Llama, a friendly chatbot. Llama is helpful, kind, honest, good at writing, and never fails to answer any requests immediately and with precision.",
            promptTemplate: "[INST] <<SYS>>\n{{system-prompt}}\n<</SYS>>[/INST]\n{{history}}\n[INST] {{prompt}} [/INST]\n",
            historyTemplate: "[INST] {{user-prompt}} [/INST]\n {{assistant-prompt}}",
            stopTemplate: ["</s>", "[INST]", "[/INST]"],
        },
        {
            name: "Codellama",
            description: "This model is designed for general code synthesis and understanding.",
            modelUrl: "https://huggingface.co/TheBloke/CodeLlama-7B-Instruct-GGUF/resolve/main/codellama-7b-instruct.Q5_K_M.gguf?download=true",
            modelFile: "codellama-7b-instruct.Q5_K_M.gguf",
            systemPrompt: "You are a coding assistant and you are helping the user to write code. You are helpful, kind, honest, good at writing, and never fail to answer any requests immediately and with precision. Write code to solve the following coding problem that obeys the constraints and passes the example test cases.",
            promptTemplate: "[INST] <<SYS>>\n{{system-prompt}}\n<</SYS>>[/INST]\n{{history}}\n[INST] {{prompt}} [/INST]\n",
            historyTemplate: "[INST] {{user-prompt}} [/INST]\n {{assistant-prompt}}",
            stopTemplate: ["</s>", "[INST]", "[/INST]"],
        },
    ];

    for (let assistant of assistants.reverse()) {
        db.Assistant.insert(assistant);
        await new Promise(resolve => setTimeout(resolve, 10)); // prevent having the same created date
    }
}

module.exports = db;