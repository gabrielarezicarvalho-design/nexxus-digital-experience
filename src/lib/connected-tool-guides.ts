export type ConnectedTool = { id: string; name: string; x: number; y: number; size: number; kind: 'claude' | 'opencode' | 'codex' | 'editor' | 'general' };

// Coordinates are percentages of the original 590 × 586 illustration.
export const connectedToolGuides: ConnectedTool[] = [
  { id: 'ai-client', name: 'Cliente de IA', x: 33.1, y: 9.4, size: 9, kind: 'general' },
  { id: 'terminal-client', name: 'Cliente de terminal', x: 22.4, y: 33.1, size: 9, kind: 'general' },
  { id: 'pi', name: 'Pi', x: 93.9, y: 37.4, size: 9, kind: 'general' },
  { id: 'api-client', name: 'Cliente API', x: 18.3, y: 55.6, size: 9, kind: 'general' },
  { id: 'api-terminal', name: 'Terminal API', x: 84.4, y: 55.6, size: 9, kind: 'general' },
  { id: 'coding-assistant', name: 'Assistente de código', x: 93.9, y: 62.5, size: 9, kind: 'general' },
  { id: 'ai-assistant', name: 'Assistente de IA', x: 33.1, y: 90.4, size: 9, kind: 'general' },
  { id: 'xcode', name: 'Xcode', x: 57.6, y: 5.8, size: 9, kind: 'general' },
  { id: 'kilo', name: 'Kilo Code', x: 40, y: 18.2, size: 9, kind: 'editor' },
  { id: 'opencode', name: 'OpenCode', x: 62.9, y: 18.2, size: 9, kind: 'opencode' },
  { id: 'neovim', name: 'Neovim', x: 80.3, y: 16.2, size: 9, kind: 'general' },
  { id: 'terminal', name: 'Terminal', x: 14.2, y: 25.8, size: 9, kind: 'claude' },
  { id: 'claude', name: 'Claude Code', x: 51.4, y: 29.1, size: 14, kind: 'claude' },
  { id: 'goose', name: 'Goose', x: 80.3, y: 33.1, size: 9, kind: 'general' },
  { id: 'cherry', name: 'Cherry Studio', x: 7.1, y: 49.8, size: 9, kind: 'general' },
  { id: 'cursor', name: 'Cursor', x: 30.7, y: 49.8, size: 14, kind: 'editor' },
  { id: 'powershell', name: 'PowerShell', x: 72, y: 49.8, size: 14, kind: 'claude' },
  { id: 'cline', name: 'Cline', x: 14.2, y: 73.9, size: 9, kind: 'editor' },
  { id: 'codex', name: 'Codex', x: 30, y: 75.6, size: 9, kind: 'codex' },
  { id: 'vscode', name: 'VS Code', x: 51.4, y: 70.6, size: 14, kind: 'editor' },
  { id: 'windsurf', name: 'Windsurf', x: 72.9, y: 75.6, size: 9, kind: 'editor' },
  { id: 'roo', name: 'Roo Code', x: 80.3, y: 83.6, size: 9, kind: 'editor' },
  { id: 'zed', name: 'Zed', x: 51.4, y: 83.6, size: 9, kind: 'general' },
  { id: 'interpreter', name: 'Open Interpreter', x: 57.6, y: 94.2, size: 9, kind: 'general' },
];

const base = 'https://api.cloudnexa.com.br';
export function connectedToolGuide(tool: ConnectedTool, windows: boolean, english: boolean) {
  const env = (name: string, value: string) => windows ? `$env:${name} = "${value}"` : `export ${name}="${value}"`;
  const key = 'sk-nx-SUA_CHAVE';
  const text = (pt: string, en: string) => english ? en : pt;
  const caveat = text('Use um modelo liberado para sua chave. As opções disponíveis variam por plano e pela versão da ferramenta.', 'Use a model enabled for your key. Available options depend on your plan and tool version.');
  if (tool.kind === 'claude') return {
    description: text('Claude Code no terminal com sua chave NEXA CLOUD.', 'Claude Code in your terminal with your NEXA CLOUD key.'),
    steps: [text('Instale o Node.js LTS e o Claude Code: npm install -g @anthropic-ai/claude-code.', 'Install Node.js LTS and Claude Code: npm install -g @anthropic-ai/claude-code.'), text(windows ? 'Abra o PowerShell e cole os comandos ao lado, substituindo SUA_CHAVE pela sua chave completa.' : 'Abra o Terminal e cole os comandos ao lado, substituindo SUA_CHAVE pela sua chave completa.', 'Open your terminal and paste the commands, replacing SUA_CHAVE with your complete key.'), text('Na pasta do projeto, execute claude. Se houver uma sessão anterior, use /logout e abra novamente.', 'Run claude in your project folder. If already signed in, use /logout and reopen.')],
    label: windows ? 'PowerShell' : 'Terminal — macOS / Linux',
    code: `${env('ANTHROPIC_BASE_URL', base)}\n${env('ANTHROPIC_AUTH_TOKEN', key)}\n\nclaude\n/model claude-sonnet-5-5`, caveat,
  };
  if (tool.kind === 'opencode') return {
    description: text('Seu projeto no OpenCode com a API NEXA CLOUD.', 'Your OpenCode project with the NEXA CLOUD API.'),
    steps: [text('Instale o Node.js LTS e o OpenCode: npm install -g opencode-ai.', 'Install Node.js LTS and OpenCode: npm install -g opencode-ai.'), text('Salve a configuração ao lado em opencode.json na pasta do seu projeto, substituindo SUA_CHAVE.', 'Save this configuration as opencode.json in your project folder, replacing SUA_CHAVE.'), text('Execute opencode nessa pasta e selecione NEXA API / claude-sonnet-5.', 'Run opencode in that folder and select NEXA API / claude-sonnet-5.')],
    label: 'opencode.json',
    code: JSON.stringify({ $schema: 'https://opencode.ai/config.json', provider: { nexa: { npm: '@ai-sdk/openai-compatible', name: 'NEXA API', options: { baseURL: `${base}/v1`, apiKey: key }, models: { 'claude-sonnet-5-5': { name: 'claude-sonnet-5-5' } } } } }, null, 2), caveat,
  };
  if (tool.kind === 'codex') return {
    description: text('O agente de código no terminal com a Responses API da NEXA.', 'The terminal coding agent with the NEXA Responses API.'),
    steps: [text('Instale o Node.js LTS e o Codex: npm install -g @openai/codex.', 'Install Node.js LTS and Codex: npm install -g @openai/codex.'), text('Salve a configuração ao lado no arquivo indicado. Substitua SUA_CHAVE pela chave completa do seu painel.', 'Save this configuration at the shown path. Replace SUA_CHAVE with the full key from your dashboard.'), text('Abra um terminal novo e execute codex na pasta do seu projeto.', 'Open a new terminal and run codex in your project folder.')],
    label: windows ? '%USERPROFILE%\\.codex\\config.toml' : '~/.codex/config.toml',
    code: `model = "claude-sonnet-5-5"\nmodel_provider = "nexa"\n\n[model_providers.nexa]\nname = "NEXA CLOUD"\nbase_url = "${base}/v1"\nwire_api = "responses"\nexperimental_bearer_token = "${key}"`, caveat,
  };
  return {
    description: text(`Conexão da API NEXA CLOUD no ${tool.name}.`, `NEXA CLOUD API connection in ${tool.name}.`),
    steps: [text('Abra as configurações de IA da ferramenta ou da extensão instalada.', 'Open the AI settings of the tool or installed extension.'), text('Se a sua versão oferecer um provedor OpenAI compatível com endereço personalizado, informe a base URL e a chave ao lado.', 'If your version offers an OpenAI-compatible provider with a custom URL, enter the base URL and key shown here.'), text('Escolha um modelo permitido para sua chave. Se não houver suporte a endereço personalizado, consulte a documentação da ferramenta.', 'Choose a model allowed for your key. If custom URLs are not supported, consult the tool documentation.')],
    label: text('Dados de conexão — OpenAI compatível', 'Connection details — OpenAI compatible'),
    code: `Base URL: ${base}/v1\nAPI key: ${key}\nModel: claude-sonnet-5-5`,
    caveat: text('Integração dependente da versão e da extensão. Não é uma configuração específica validada desta ferramenta.', 'Integration depends on the version and extension. This is not a validated tool-specific configuration.'),
  };
}