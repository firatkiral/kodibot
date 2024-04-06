![KodiBot](https://github.com/firatkiral/kodibot/blob/main/resources/screenshot.png?raw=true)

### KodiBot - A Local Chatbot App for Desktop

KodiBot is a desktop app that enables users to run their own AI chat assistants locally and offline on Windows, Mac, and Linux operating systems. KodiBot is a standalone app and does not require an internet connection or additional dependencies to run local chat assistants. It supports both [Llama.cpp](https://github.com/ggerganov/llama.cpp) compatible models and [OpenAI](https://openai.com/) API. 

KodiBot is free and open source app developed using electronjs framework and released under the GNU General Public License.

### Features

KodiBot has a simple and user friendly interface. You can esily create chat assistant cards and customize them for specific tasks or topics by adding instructions. You can save cards to JSON file share them with others. KodiBot supports both Llama.cpp compatible models and OpenAI API. It stores your history with each chat assistant separately. You can easily navigate and switch between chat assistants from the sidebar.

### Creating Local Assistant

You can either duplicate an existing KodiBot assistant card or create a new one. If you duplicate KodiBot Assistant, you can simply customize the instructions for your specific task or topic. 

If you create a new local assistant, you can choose the default model file or you can download any llama.cpp compatible model from [huggingface.co](https://huggingface.co). You'll also need to add prompt and history template to be able to feed proper prompt to the model you choose. You can find these information in the model's documentation. You can leave other advanced settings as default.

### Using OpenAI API

With OpenAi API you can use latest Chat GPT models without paying monthly subscription fees, you only pay for what you use with a pay-as-you-go pricing. You can use OpenAI API by creating an API key from [OpenAI](https://openai.com/). Then you can add your API key to assistant settings. If your api key is valid it will automatically load available chat models such as GPT-3, GPT-4, etc. You can choose a model of your choice and start chatting with your assistant. You can also customize instructions for your specific task. 

### Usage

First install the dependencies:

```bash
npm install
```

Then run the app:

```bash
npm start
```

### Custom API Calls

When you select an assistant card, it will automatically start an API server on the API URL and port specified in the assistant settings. You can use this URL to make custom API calls to the assistant. Please see the [Llama.cpp API](https://github.com/ggerganov/llama.cpp/tree/master/examples/server) documentation for more information.

## License

KodiBot Copyright © 2024

KodiBot is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

KodiBot is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with KodiBot. If not, see <https://www.gnu.org/licenses/>.