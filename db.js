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
            min_p: 0.05,
            mirostat: 0,
            mirostat_eta: 0.1,
            mirostat_tau: 5,
            n_predict: 400,
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
        }
    ];

    for (let assistant of assistants.reverse()) {
        db.Assistant.insert(assistant);
        await new Promise(resolve => setTimeout(resolve, 10)); // prevent having the same created date
    }
}

module.exports = db;