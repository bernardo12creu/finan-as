# 🟢 Fechô — Controle de Gastos Mensais

O **Fechô** é um Progressive Web App (PWA) mobile-first moderno, rápido e 100% offline para controle e fechamento financeiro pessoal e familiar.

---

## 🚀 Tecnologias & Stack
- **Framework & Build:** Vite + React 18 + TypeScript (`strict: true`)
- **Estilização & Design Tokens:** Tailwind CSS v4 + Design Tokens em variáveis CSS (`:root`)
- **PWA & Offline:** `vite-plugin-pwa` (Workbox Service Worker, App Shell precache, prompt de atualização, manifest standalone)
- **Persistência Local & Reatividade:** Dexie.js (IndexedDB) com índices compostos + `dexie-react-hooks` (`useLiveQuery`)
- **Gerenciamento de Estado:** Zustand (sessão de usuário/workspace, toasts, modais)
- **Gráficos & Métricas:** Recharts (rosca de despesas por categoria, histórico de 6 meses)
- **Formulários & Datas:** date-fns (pt-BR)
- **Animações & Gestos:** Framer Motion (Bottom Sheet com swipe down, toasts com desfazer)
- **Exportação:** SheetJS (`xlsx`) para planilhas Excel e gerador nativo de CSV
- **Testes & Qualidade:** Vitest + Testing Library + ESLint

---

## 🛠️ Instalação e Execução no Windows (PowerShell)

### Pré-requisitos
- Node.js 20+ ou 22+ (LTS) instalado no Windows.

### 1. Clonar ou Acessar a Pasta do Projeto
Abra o **PowerShell** no Windows e navegue até a pasta:
```powershell
cd "c:\Users\berna\OneDrive\Documentos\finanças"
```

### 2. Instalar as Dependências
Execute o comando:
```powershell
npm.cmd install
```
*(Dica: Se a política de execução de scripts do PowerShell exibir restrições no `npm`, use `npm.cmd` ou execute `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`).*

### 3. Rodar o Servidor de Desenvolvimento
Para abrir localmente com suporte a rede local (Wi-Fi):
```powershell
npm.cmd run dev -- --host
```
O console exibirá as URLs de acesso:
- **No computador:** `http://localhost:5173/`
- **No celular (mesma rede Wi-Fi):** `http://<SEU_IP_LOCAL>:5173/` (ex: `http://192.168.1.38:5173/`)

---

## 📱 Como Testar e Instalar o PWA no Celular

### No Android (Google Chrome)
1. Conecte o celular na **mesma rede Wi-Fi** do computador.
2. Abra o Google Chrome no celular e acerte o endereço do Network exibido no terminal (ex: `http://192.168.1.38:5173`).
3. Toque no banner **"Instalar no Celular"** na tela de **Ajustes**, ou toque nos três pontinhos do Chrome ➔ **"Instalar aplicativo"** (ou "Adicionar à tela inicial").
4. O app será adicionado como um aplicativo nativo independente, com ícone próprio e sem barra de URL.

### No iOS (Safari)
1. Conecte o iPhone na **mesma rede Wi-Fi**.
2. Abra o Safari e digite o endereço Network (ex: `http://192.168.1.38:5173`).
3. Toque no botão de **Compartilhar** (quadrado com seta para cima no Safari).
4. Role para baixo e selecione **"Adicionar à Tela de Início"**.
5. Abra pelo novo ícone verde do Fechô. O app rodará em modo *standalone* com suporte completo a safe-areas do iPhone.

---

## 🧪 Rodando Testes e Qualidade

### Executar a Suíte de Testes (Vitest)
```powershell
npm.cmd run test
```
*Garante:*
- Formatação e parsing de moeda BRL em centavos (sem desvios de float).
- Lógica de teclado numérico "centavos primeiro".
- Geração de parcelas com distribuição de centavos de arredondamento na 1ª parcela.
- Regra de fechamento de faturas de cartão de crédito (antes/no dia/após fechamento).
- Idempotência de regras de recorrência.
- Limites e status de orçamentos (normal, atenção, estourado).
- **Isolamento estrito entre Workspaces** (registros de um workspace nunca vazam para outro).

### Checagem de Linter (ESLint)
```powershell
npm.cmd run lint
```

### Build de Produção
```powershell
npm.cmd run build
```

---

## 💎 Funcionalidades Principais
1. **Lançamento em até 3 toques:** FAB central (+) ➔ Digitar valor no teclado centavos primeiro ➔ Categoria ➔ Salvar.
2. **Toast Imediato com Desfazer:** Notificação com contagem regressiva de 5 segundos para desfazer com 1 toque.
3. **Resumo Mensal com Fade:** Saldo do mês, receitas vs despesas, variação vs mês anterior e progresso do orçamento total.
4. **Fechamento do Mês (Wrapped):** Resumo visual com maior peso por categoria, economia, orçamento cumprido/estourado e exportação instantânea para **Excel (.xlsx)** e **CSV**.
5. **Demonstração Integrada:** Botão para carregar 3 meses de dados completos com múltiplos cartões, despesas, parcelamentos e regras fixas.
