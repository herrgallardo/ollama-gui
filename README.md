# 🦙 Ollama Chat GUI

A modern, feature-rich web interface for interacting with Ollama models locally. Built with Next.js 15, TypeScript, and Tailwind CSS.

![Next.js](https://img.shields.io/badge/Next.js-15.4.6-black?style=flat-square&logo=next.js)
![React](https://img.shields.io/badge/React-19.1.0-blue?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-38B2AC?style=flat-square&logo=tailwind-css)

## ✨ Features

### Core Functionality

- 💬 **Real-time Chat Interface** - Stream responses from Ollama models with live token generation
- 🎯 **Multiple Model Support** - Switch between any installed Ollama models on the fly
- 💾 **Conversation Management** - Create, save, and organize multiple chat sessions
- 📊 **Performance Metrics** - Live display of token generation speed, processing time, and model performance
- 🔍 **Search** - Search across all conversations and messages
- 📌 **Pin Conversations** - Keep important chats easily accessible

### User Experience

- 🌙 **Dark/Light Mode** - Automatic theme detection with manual override
- 📱 **Responsive Design** - Works seamlessly on desktop, tablet, and mobile
- ⚡ **Fast & Efficient** - Optimized for performance with React 19 and Next.js 15
- 🎨 **Beautiful UI** - Modern interface built with shadcn/ui components
- ✍️ **Markdown Support** - Full markdown rendering with syntax highlighting
- 🔄 **Auto-save** - All conversations automatically saved to local storage

### Advanced Features

- 📥 **Import/Export** - Backup and restore conversations as JSON
- 🚦 **Connection Status** - Real-time Ollama connection monitoring
- ⏱️ **Detailed Metrics** - Token count, generation speed, prompt evaluation time
- 🛑 **Streaming Control** - Stop generation mid-stream
- 🗂️ **Sidebar Navigation** - Collapsible sidebar with conversation history

## 🚀 Quick Start

### Prerequisites

1. **Install Ollama** - Download and install from [ollama.ai](https://ollama.ai)
2. **Install Node.js** - Version 18+ required
3. **Pull a Model** - Run `ollama pull llama3.2` (or any model you prefer)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/ollama-gui.git
cd ollama-gui

# Install dependencies
npm install
# or
yarn install
# or
pnpm install

# Start Ollama service (in a separate terminal)
ollama serve

# Run the development server
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📖 Usage

### Starting a Conversation

1. Ensure Ollama is running (`ollama serve`)
2. Select a model from the dropdown in the header
3. Type your message and press Enter or click Send
4. Watch as the response streams in with live metrics

### Managing Conversations

- **New Chat**: Click the "New Chat" button or the `+` icon
- **Switch Conversations**: Click any conversation in the sidebar
- **Pin Important Chats**: Use the dropdown menu to pin conversations
- **Delete**: Remove conversations via the dropdown menu
- **Search**: Use the search bar to find specific messages or conversations

### Performance Metrics

Toggle metrics display with the eye icon to see:

- Token generation speed (tokens/second)
- Total processing time
- Number of tokens generated
- Prompt evaluation time
- Model loading time

### Import/Export

- **Export**: Click "Export" to download all conversations as JSON
- **Import**: Click "Import" to restore previously exported conversations

## 🛠️ Development

### Project Structure

```plaintext
ollama-gui/
├── app/
│   ├── api/
│   │   ├── chat/          # Chat completion endpoint
│   │   ├── models/        # Model listing endpoint
│   │   └── ollama/status/ # Connection status endpoint
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/
│   ├── ui/               # shadcn/ui components
│   ├── Chat.tsx          # Main chat interface
│   ├── ChatLayout.tsx    # Layout wrapper
│   ├── ConversationSidebar.tsx
│   ├── MetricsDisplay.tsx
│   └── OllamaStatusIndicator.tsx
├── lib/
│   ├── store.ts          # Zustand state management
│   ├── types.ts          # TypeScript type definitions
│   └── utils.ts          # Utility functions
└── public/
    └── llama-icon.png    # App icon
```

### Technologies Used

- **Framework**: [Next.js 15.4.6](https://nextjs.org/) with App Router
- **Language**: [TypeScript 5](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/) with CSS variables
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/) with Radix UI
- **State Management**: [Zustand](https://github.com/pmndrs/zustand) with persistence
- **Icons**: [Lucide React](https://lucide.dev/)
- **Markdown**: [React Markdown](https://github.com/remarkjs/react-markdown) with GFM

### Available Scripts

```bash
# Development
npm run dev          # Start development server with Turbopack

# Production
npm run build        # Build for production
npm run start        # Start production server

# Code Quality
npm run lint         # Run ESLint
```

### Environment Variables

No environment variables required! The app connects to Ollama on `http://localhost:11434` by default.

## 🔧 Configuration

### Customizing Ollama Host

To connect to Ollama running on a different host/port, modify the API routes in:

- `/app/api/chat/route.ts`
- `/app/api/models/route.ts`
- `/app/api/ollama/status/route.ts`

Change `http://localhost:11434` to your Ollama instance URL.

### Supported Models

This interface works with any Ollama model. Popular options:

- `llama3.2` - Fast and efficient
- `llama3.1` - More capable
- `mistral` - Good for coding
- `codellama` - Specialized for code
- `phi3` - Microsoft's compact model

Install models with: `ollama pull <model-name>`

## 🐛 Troubleshooting

### Ollama Not Connected

- Ensure Ollama is running: `ollama serve`
- Check if Ollama is accessible: `curl http://localhost:11434/api/tags`
- Verify no firewall is blocking port 11434

### No Models Available

- Install at least one model: `ollama pull llama3.2`
- Check installed models: `ollama list`

### Slow Performance

- Try a smaller model (e.g., `phi3` or `llama3.2:3b`)
- Check available system RAM
- Close other applications using significant resources

### Chat History Lost

- Conversations are stored in browser localStorage
- Clearing browser data will remove history
- Use Export feature to backup important conversations

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

## 🙏 Acknowledgments

- [Ollama](https://ollama.ai) for the amazing local LLM runtime
- [shadcn/ui](https://ui.shadcn.com/) for the beautiful component system
- [Vercel](https://vercel.com) for Next.js and the deployment platform

## 📞 Support

If you encounter any issues or have questions:

1. Check the [Troubleshooting](#-troubleshooting) section
2. Search existing [GitHub Issues](https://github.com/yourusername/ollama-gui/issues)
3. Create a new issue with detailed information about your problem

---

Built with ❤️ for the local AI community
