const { app, BrowserWindow, ipcMain, dialog } = require('electron/main');
const path = require('path');
const db = require('./db');
const llama = require('./llama');
const openai = require('./openai');
const fs = require('fs');
let mainWindow;

const createWindow = () => {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 720,
        icon: path.join(__dirname, 'resources/linux/icon', 'icon.png'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        }
    });

    mainWindow.loadFile('client/index.html');

    // mainWindow.webContents.openDevTools();
};

app.whenReady().then(async val => {
    await db.init();

    ipcMain.handle('get-app', async (event) => {
        return db.App.findOne({ name: "KodiBot" });
    });

    ipcMain.handle('save-app', async (event, app) => {
        return db.App.findAndUpdate({ name: "KodiBot" }, obj => {
            obj.lastAssistantId = app.lastAssistantId;
            obj.showWelcome = app.showWelcome;
            obj.termsAccepted = app.termsAccepted;
            obj.modelPath = app.modelPath;
            obj.openLastAssistant = app.openLastAssistant;
        });
    })

    ipcMain.handle('dialog:openDirectory', async () => {
        const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
            properties: ['openDirectory']
        })
        if (canceled) {
            return
        } else {
            return filePaths[0]
        }
    })

    ipcMain.handle('quit-app', async (event) => {
        await cleanup().catch(console.error);
        await saveDatabase().catch(console.error);
        app.quit();
    });

    ipcMain.handle('init-assistant', async (event, assistantId) => {
        const appDoc = db.App.findOne({ name: "KodiBot" });
        const assistant = db.Assistant.findOne({ id: assistantId });
        if (!assistant) {
            throw new Error('missing-assistant');
        }
        if (assistant.type === 'llama') {
            const modelFilePath = path.join(appDoc.modelPath, assistant.modelFile);
            // check if model file exists            
            if (!fs.existsSync(modelFilePath)) {
                if (assistant.modelUrl) {
                    return 'download-model';
                }
                throw new Error('missing-model');
            }

            if (mainWindow.llamaServer) {
                mainWindow.llamaServer.kill();
                mainWindow.llamaServer = null;
            }

            await new Promise(resolve => setTimeout(resolve, 1000));
            return llama.startLlamaServer(assistant.params.api_url, modelFilePath, mainWindow).then(() => {
                return "initialized";
            })
        }
        else if (assistant.type === 'openai') {
            if (!assistant.params.api_key) {
                throw new Error('missing-apikey');
            }
            if (!assistant.params.api_url) {
                throw new Error('missing-apiurl');
            }
            return await openai.ask("test", [], assistant).then(response => {
                return "initialized";
            })
        }
    });

    ipcMain.handle('get-assistants', async (event) => {
        const kodibot = db.Assistant.findOne({ name: "KodiBot" });
        const assistants = db.Assistant.find({ name: { $ne: "KodiBot" } }).compoundsort([['meta.updated', true], ['meta.created', true]]).docs();
        assistants.unshift(kodibot);
        return assistants;
    });

    ipcMain.handle('duplicate-assistant', async (event, assistantId) => {
        const assistant = db.Assistant.find({ id: assistantId }).docs({ removeMeta: true })[0];
        if (!assistant) {
            throw new Error('missing-assistant');
        }
        const newAssistant = {
            ...assistant,
            id: undefined,
            editable: true,
            name: assistant.name + " (copy)",
        };
        return db.Assistant.insert(newAssistant);
    });

    ipcMain.handle('create-assistant', async (event, newAssistant) => {
        const appDoc = db.App.findOne({ name: "KodiBot" });
        const newModels = newAssistant.newModels ?? []
        const removedModels = newAssistant.removedModels ?? []

        newModels.filter(model => {
            return !removedModels.includes(path.basename(model));
        });

        for (let model of removedModels) {
            const modelFilePath = path.join(appDoc.modelPath, model);
            llama.removeModel(modelFilePath);
        }

        for (let model of newModels) {
            llama.addModel(model);
        }

        delete newAssistant.newModels;
        delete newAssistant.removedModels;

        if (newAssistant.type === 'llama') {
            return db.Assistant.insert({
                name: newAssistant.name,
                description: newAssistant.description,
                modelFile: newAssistant.modelFile,
                type: 'llama',
                systemPrompt: newAssistant.systemPrompt,
                promptTemplate: newAssistant.promptTemplate,
                historyTemplate: newAssistant.historyTemplate,
                stopTemplate: newAssistant.stopTemplate ? newAssistant.stopTemplate.split(",") : [],
                params: {
                    api_url: newAssistant.api_url,
                    api_key: newAssistant.api_key,
                    n_predict: +newAssistant.n_predict,
                    temperature: +newAssistant.temperature,
                    repeat_penalty: +newAssistant.repeat_penalty,
                    repeat_last_n: +newAssistant.repeat_last_n,
                    top_k: +newAssistant.top_k,
                    top_p: +newAssistant.top_p,
                    min_p: +newAssistant.min_p,
                    tfs_z: +newAssistant.tfs_z,
                    typical_p: +newAssistant.typical_p,
                    presence_penalty: +newAssistant.presence_penalty,
                    frequency_penalty: +newAssistant.frequency_penalty,
                    mirostat: +newAssistant.mirostat,
                    mirostat_tau: +newAssistant.mirostat_tau,
                    mirostat_eta: +newAssistant.mirostat_eta,
                }
            });
        }

        if (newAssistant.type === 'openai') {
            return db.Assistant.insert({
                name: newAssistant.name,
                description: newAssistant.description,
                modelFile: newAssistant.modelFile,
                systemPrompt: newAssistant.systemPrompt,
                type: 'openai',
                stopTemplate: newAssistant.stopTemplate ? newAssistant.stopTemplate.split(",") : [],
                params: {
                    api_url: newAssistant.api_url,
                    api_key: newAssistant.api_key,
                    max_tokens: +newAssistant.max_tokens,
                    temperature: +newAssistant.temperature,
                    top_p: +newAssistant.top_p,
                    presence_penalty: +newAssistant.presence_penalty,
                    frequency_penalty: +newAssistant.frequency_penalty,
                }
            });
        }
    });

    ipcMain.handle('update-assistant', async (event, newAssistant) => {
        const appDoc = db.App.findOne({ name: "KodiBot" });
        const assistant = db.Assistant.findOne({ id: newAssistant.id });
        if (!assistant) {
            throw new Error('missing-assistant');
        }
        if (!assistant.editable) {
            throw new Error('not-editable');
        }

        const newModels = newAssistant.newModels ?? []
        const removedModels = newAssistant.removedModels ?? []

        newModels.filter(model => {
            return !removedModels.includes(path.basename(model));
        });

        for (let model of removedModels) {
            const modelFilePath = path.join(appDoc.modelPath, model);
            llama.removeModel(modelFilePath);
        }

        for (let model of newModels) {
            llama.addModel(model);
        }

        delete newAssistant.newModels;
        delete newAssistant.removedModels;

        if (assistant.type === 'llama') {
            return db.Assistant.update({
                ...assistant,
                name: newAssistant.name,
                description: newAssistant.description,
                modelFile: newAssistant.modelFile,
                systemPrompt: newAssistant.systemPrompt,
                promptTemplate: newAssistant.promptTemplate,
                historyTemplate: newAssistant.historyTemplate,
                stopTemplate: newAssistant.stopTemplate ? newAssistant.stopTemplate.split(",") : [],
                params: {
                    ...assistant.params,
                    api_url: newAssistant.api_url,
                    api_key: newAssistant.api_key,
                    n_predict: +newAssistant.n_predict,
                    temperature: +newAssistant.temperature,
                    repeat_penalty: +newAssistant.repeat_penalty,
                    repeat_last_n: +newAssistant.repeat_last_n,
                    top_k: +newAssistant.top_k,
                    top_p: +newAssistant.top_p,
                    min_p: +newAssistant.min_p,
                    tfs_z: +newAssistant.tfs_z,
                    typical_p: +newAssistant.typical_p,
                    presence_penalty: +newAssistant.presence_penalty,
                    frequency_penalty: +newAssistant.frequency_penalty,
                    mirostat: +newAssistant.mirostat,
                    mirostat_tau: +newAssistant.mirostat_tau,
                    mirostat_eta: +newAssistant.mirostat_eta,
                }
            });
        }

        if (assistant.type === 'openai') {
            return db.Assistant.update({
                ...assistant,
                name: newAssistant.name,
                description: newAssistant.description,
                modelFile: newAssistant.modelFile,
                systemPrompt: newAssistant.systemPrompt,
                stopTemplate: newAssistant.stopTemplate ? newAssistant.stopTemplate.split(",") : [],
                params: {
                    ...assistant.params,
                    api_url: newAssistant.api_url,
                    api_key: newAssistant.api_key,
                    max_tokens: +newAssistant.max_tokens,
                    temperature: +newAssistant.temperature,
                    top_p: +newAssistant.top_p,
                    presence_penalty: +newAssistant.presence_penalty,
                    frequency_penalty: +newAssistant.frequency_penalty,
                }
            });
        }
    });

    ipcMain.handle('delete-assistant', async (event, assistantId) => {
        const assistant = db.Assistant.findOne({ id: assistantId });
        if (!assistant) {
            throw new Error('missing-assistant');
        }
        if (!assistant.editable) {
            throw new Error('not-editable');
        }
        return db.Assistant.remove(assistant);
    });

    ipcMain.handle('download-model', async (event, assistantId) => {
        const assistant = db.Assistant.findOne({ id: assistantId });
        if (!assistant) {
            throw new Error('missing-assistant');
        }
        let lastProgress = -1;

        mainWindow.stopDownload = llama.downloadModel(assistant.modelUrl, assistant.modelFile, progress => {
            if (lastProgress === progress.percent) return;
            lastProgress = progress.percent;
            mainWindow.webContents.send('download-progress', progress);
        });
        return;
    });

    ipcMain.handle('get-models', async (event, type) => {
        const appDoc = db.App.findOne({ name: "KodiBot" });
        return llama.getModels(appDoc.modelPath).map(model => path.basename(model));
    });

    ipcMain.handle('get-openai-models', async (event, apiKey) => {
        return (await openai.getModels(apiKey))?.data.filter(model => model.id.startsWith("gpt-")).map(model => model.id);
    });

    ipcMain.handle('add-model', async (event, modelPath) => {
        return llama.addModel(modelPath);
    });

    ipcMain.handle('cancel-download', async (event) => {
        mainWindow.stopDownload && mainWindow.stopDownload();
        return;
    });

    ipcMain.handle('get-history', async (event, historyId) => {
        return db.History.findOne({ id: historyId });
    });

    ipcMain.handle('delete-history', async (event, historyId) => {
        const history = db.History.findOne({ id: historyId });
        if (!history) {
            throw new Error('missing-history');
        }
        const res = db.History.remove(history);
        return res;
    });

    ipcMain.handle('get-histories', async (event, assistantId) => {
        return db.History.find({ assistantId }).compoundsort([['meta.updated', true], ['meta.created', true]]).select("title id").docs();
    });

    ipcMain.handle('clear-histories', async (event, assistantId) => {
        return db.History.findAndRemove({ assistantId });
    });

    ipcMain.handle('abort-response', async (event) => {
        return mainWindow.abortController && mainWindow.abortController.abort("Aborted by user");
    });

    ipcMain.handle('ask', async (event, message, historyId, assistantId) => {
        mainWindow.abortController = new AbortController()
        let history;
        if (historyId) {
            history = db.History.findOne({ id: historyId });
            if (!history) {
                throw new Error('missing-history');
            }
        }
        else {
            history = db.History.insert({ assistantId, title: message.substr(0, 50) + "..." });
        }
        const assistant = db.Assistant.findOne({ id: assistantId });
        db.Assistant.update(assistant); // So it will be moved to top of the list
        if (!assistant) {
            throw new Error('missing-assistant');
        }
        if (assistant.type === 'llama') {
            return llama.ask(message, history.messages, assistant, (message) => {
                mainWindow.webContents.send('respond', message);
            }, mainWindow.abortController).then(respond => {
                history.messages.push({ role: "user", content: message.trim() }, { role: assistant.name, content: respond.trim() });
                db.History.update(history);
                return history.id;
            });
        }
        else if (assistant.type === 'openai') {
            return openai.ask(message, history.messages, assistant, (message) => {
                mainWindow.webContents.send('respond', message);
            }, mainWindow.abortController).then(respond => {
                history.messages.push({ role: "user", content: message.trim() }, { role: assistant.name, content: respond.trim() });
                db.History.update(history);
                return history.id;
            });
        }
    });

    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', async () => {
    await cleanup().catch(console.error);
    await saveDatabase().catch(console.error);
    app.quit();
});


app.on('before-quit', async () => {
    await cleanup().catch(console.error);
});

async function saveDatabase() {
    return new Promise(async (resolve, reject) => {
        db.saveDatabase(function (err) {
            if (err) {
                reject(err);
            }
            else {
                console.log("database saved.");
                resolve();
            }
        });
    });
}

async function cleanup() {
    return new Promise(async (resolve, reject) => {
        try {
            mainWindow.llamaServer && mainWindow.llamaServer.kill();
            mainWindow.abortController && mainWindow.abortController.abort("Aborted by user")
            resolve();
        } catch (error) {
            reject(error);
        }
    });
}