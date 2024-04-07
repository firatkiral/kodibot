// utils.ts

const { app, BrowserWindow, ipcMain } = require('electron/main');
const { platform } = require('os');
const path = require('path');
const { spawn } = require('child_process');
const os = require("os");
const fs = require("fs");

async function startLlamaServer(api_url, modelFilePath) {
  return new Promise((resolve, reject) => {
    try {
      const serverPath = path.resolve(path.join(getBinariesPath(), './server'));
      const server = spawn(serverPath, ["-m", modelFilePath, "-c", "2048", "--port", "11465"]);
      // server.stdout.on('data', (data) => {
      //   console.log(`stdout: ${data}`);
      // });
      // server.stderr.on('data', (data) => {
      //   throw new Error(data);
      // });
      // server.on('error', (err) => {
      //   throw err;
      // });
      // server.on('close', (code) => {
      //   throw new Error(`child process exited with code ${code}`);
      // });

      const ping = (attempt) => {
        fetch(api_url, { method: 'GET' })
          .then(response => {
            if (response.status == 200) {
              return resolve(server);
            }
            throw new Error('Could not connect to server.');
          })
          .catch(err => {
            if (attempt <= 0) {
              reject(err);
              return;
            }
            setTimeout(() => ping(attempt - 1), 1000);
          });
      };
      ping(5);
    }
    catch (err) {
      reject(err);
    }
  });
}

function downloadModel(url, name, progress) {
  const _url = new URL(url);
  name = name ?? _url.pathname.split('/').pop();

  const userHomeDir = os.homedir();
  const modelFolder = `${userHomeDir}/.config/kodibot/models`;
  !fs.existsSync(modelFolder) && fs.mkdirSync(modelFolder, { recursive: true });
  const tempFilePath = `${modelFolder}/temp_${name}`;
  const filePath = `${modelFolder}/${name}`;
  const fileStream = fs.createWriteStream(tempFilePath);

  const downloadSignal = {
    stop: false,
  };

  fetch(url).then(response => {
    const contentLength = response.headers.get('content-length');
    const total = parseInt(contentLength, 10);
    let loaded = 0;

    const res = new Response(new ReadableStream({
      async start(controller) {
        const reader = response.body.getReader();
        for (; ;) {
          const { done, value } = await reader.read();
          if (done || downloadSignal.stop) {
            break;
          }
          loaded += value.byteLength;
          progress({
            percent: Math.floor((loaded / total) * 100),
            loaded,
            total,
          });
          controller.enqueue(value);
          fileStream.write(value);
        }
        progress(100);
        fileStream.end();
        controller.close();
        // rename file 
        if (downloadSignal.stop) {
          fs.unlinkSync(tempFilePath);
        }
        else {
          fs.renameSync(tempFilePath, filePath);
        }
      },
    }));
  });

  return () => {
    downloadSignal.stop = true;
  };
}

function addModel(modelPath) {
  const userHomeDir = os.homedir();
  const modelFolder = `${userHomeDir}/.config/kodibot/models`;
  !fs.existsSync(modelFolder) && fs.mkdirSync(modelFolder, { recursive: true });
  const name = path.basename(modelPath);
  const newPath = path.join(modelFolder, name);
  fs.copyFileSync(modelPath, newPath);
}

function removeModel(modelFilePath) {
  try {
    fs.unlinkSync(modelFilePath);
  } catch (error) { }
}

function getModels(modelPath) {
  !fs.existsSync(modelPath) && fs.mkdirSync(modelPath, { recursive: true });
  const models = fs.readdirSync(modelPath);
  constModelPaths = models.filter(model => !model.startsWith('.')).map(model => path.join(modelPath, model));
  return constModelPaths;
}

function getPlatform() {
  switch (platform()) {
    case 'aix':
    case 'freebsd':
    case 'linux':
    case 'openbsd':
    case 'android':
      return 'linux';
    case 'darwin':
    case 'sunos':
      return 'mac';
    case 'win32':
      return 'win';
    default:
      return null;
  }
}

function getBinariesPath() {
  const { isPackaged } = app;

  const binariesPath =
    isPackaged
      ? path.join(process.resourcesPath, 'bin')
      : path.join(app.getAppPath(), 'resources', getPlatform(), "bin");

  return binariesPath;
}

async function ask(message, history, assistant, callback, controller) {
  return new Promise(async (resolve, reject) => {
    try {
      let prompt = buildPrompt(message, history, assistant);
      let _params = {
        ...assistant.params,
        n_probs: 0,
        min_keep: 0,
        stop: buildStop(assistant),
        cache_prompt: true,
        grammar: '',
        image_data: [],
        slot_id: -1,
        stream: true,
      }

      const request = llama(prompt, _params, controller);
      let content = "";
      for await (const chunk of request) {
        content += chunk.data.content;
        callback(chunk.data.content);
      }
      resolve(content);
    } catch (e) {
      reject(e);
    }
  });
}

function buildStop(assistant) {
  return assistant.stopTemplate.map(stop => stop.replace("{{user-name}}", "user").replace("{{assistant-name}}", assistant.name));
}

function buildPrompt(message, history, assistant) {
  let historyText = ""

  for (let i = 0; i < history.length; i += 2) {
    historyText += "\n" + assistant.historyTemplate
      .replace("{{user-name}}", history[i].role)
      .replace("{{user-prompt}}", history[i].content)
      .replace("{{assistant-name}}", history[i + 1].role)
      .replace("{{assistant-prompt}}", history[i + 1].content);
  }

  return assistant.promptTemplate
    .replace("{{system-prompt}}", assistant.systemPrompt)
    .replace("{{prompt}}", message)
    .replace("{{history}}", historyText)
    .replace("{{assistant-name}}", assistant.name)
    .replace("{{user-name}}", "user")
}


// Completes the prompt as a generator. Recommended for most use cases.
//
// Example:
//
//    import { llama } from '/completion.js'
//
//    const request = llama("Tell me a joke", {n_predict: 800})
//    for await (const chunk of request) {
//      document.write(chunk.data.content)
//    }
//
async function* llama(prompt, params = {}, controller) {
  controller = controller ?? new AbortController()
  const api_url = params.api_url;
  if (!api_url) {
    throw new Error("api_url is required");
  }
  const completionParams = { ...params, prompt };

  const response = await fetch(`${api_url}/completion`, {
    method: 'POST',
    body: JSON.stringify(completionParams),
    headers: {
      'Connection': 'keep-alive',
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
      ...(params.api_key ? { 'Authorization': `Bearer ${params.api_key}` } : {})
    },
    signal: controller.signal,
  })

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
          if (result.data) {
            result.data = JSON.parse(result.data);
            content += result.data.content;

            // yield
            yield result;

            // if we got a stop token from server, we will break here
            if (result.data.stop) {
              if (result.data.generation_settings) {
                generation_settings = result.data.generation_settings;
              }
              cont = false;
              break;
            }
          }
          if (result.error) {
            try {
              result.error = JSON.parse(result.error);
              if (result.error.message.includes('slot unavailable')) {
                // Throw an error to be caught by upstream callers
                throw new Error('slot unavailable');
              } else {
                console.error(`llama.cpp error [${result.error.code} - ${result.error.type}]: ${result.error.message}`);
              }
            } catch (e) {
              console.error(`llama.cpp error ${result.error}`);
            }
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

module.exports = { startLlamaServer, getModels, addModel, removeModel, downloadModel, ask, llama };