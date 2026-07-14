import type { OnboardingGuide, OnboardingGuideKey } from './types';

const step = (
  key: string,
  pt: { title: string; body: string },
  en: { title: string; body: string },
) => ({ key, copy: { pt, en } });

export const onboardingGuides: Record<OnboardingGuideKey, OnboardingGuide> = {
  initial: {
    key: 'initial',
    version: 1,
    autoShow: true,
    steps: [
      step('welcome', { title: 'Bem-vindo ao SmartFinance', body: 'Organize as financas da casa, as contas individuais e os seus objetivos num unico sitio.' }, { title: 'Welcome to SmartFinance', body: 'Organize household finances, individual accounts, and goals in one place.' }),
      step('accounts', { title: 'Comece pelas contas', body: 'Adicione as contas que usa no dia a dia, incluindo contas partilhadas e de investimento.' }, { title: 'Start with accounts', body: 'Add the accounts you use every day, including shared and investment accounts.' }),
      step('activity', { title: 'Registe os movimentos', body: 'Cada transacao atualiza os seus saldos e torna o resumo mensal mais fiel.' }, { title: 'Record activity', body: 'Every transaction updates balances and makes your monthly summary more accurate.' }),
      step('plan', { title: 'Planeie com confianca', body: 'Use orcamentos e saving pots para transformar o que sobra em objetivos concretos.' }, { title: 'Plan with confidence', body: 'Use budgets and saving pots to turn what remains into concrete goals.' }),
    ],
  },
  dashboard: {
    key: 'dashboard',
    version: 1,
    steps: [
      step('overview', { title: 'A sua visao financeira', body: 'O topo mostra o patrimonio e os indicadores mais importantes do mes.' }, { title: 'Your financial overview', body: 'The top area shows your net worth and the most important monthly indicators.' }),
      step('sections', { title: 'Explore ao seu ritmo', body: 'Abra ou feche cada secao para focar apenas nas contas, objetivos ou movimentos que precisa de ver.' }, { title: 'Explore at your pace', body: 'Open or close each section to focus on the accounts, goals, or activity you need.' }),
    ],
  },
  accounts: {
    key: 'accounts',
    version: 1,
    steps: [
      step('ownership', { title: 'Contas claras', body: 'Cada conta indica o titular, o tipo e o saldo atual. As contas conjuntas ficam identificadas como partilhadas.' }, { title: 'Clear accounts', body: 'Every account shows its owner, type, and current balance. Joint accounts are marked as shared.' }),
      step('create', { title: 'Adicione o que usa', body: 'Crie contas correntes, poupancas e investimentos para ter uma visao completa.' }, { title: 'Add what you use', body: 'Create current, savings, and investment accounts for a complete overview.' }),
    ],
  },
  transactions: {
    key: 'transactions',
    version: 1,
    steps: [
      step('record', { title: 'Registe uma transacao', body: 'Escolha a conta, categoria, data e valor. Entradas e saidas ficam visiveis no historico.' }, { title: 'Record a transaction', body: 'Choose the account, category, date, and amount. Income and expenses remain visible in history.' }),
      step('context', { title: 'Use o contexto', body: 'A categoria, a conta e a data tornam os filtros e os relatorios mais uteis.' }, { title: 'Use context', body: 'Category, account, and date make filters and reports more useful.' }),
    ],
  },
  transfers: {
    key: 'transfers',
    version: 1,
    steps: [
      step('route', { title: 'Mova dinheiro entre contas', body: 'Uma transferencia mostra sempre a origem e o destino, sem contar como uma despesa nova.' }, { title: 'Move money between accounts', body: 'A transfer always shows its source and destination without counting as a new expense.' }),
      step('recurring', { title: 'Automatize o recorrente', body: 'Use regras recorrentes para movimentos que se repetem todos os meses.' }, { title: 'Automate recurring activity', body: 'Use recurring rules for movements that repeat every month.' }),
    ],
  },
  budget: {
    key: 'budget',
    version: 1,
    steps: [
      step('rules', { title: 'Defina as regras do mes', body: 'Planeie rendimentos, despesas e poupancas. Pode limitar cada regra aos meses em que esta ativa.' }, { title: 'Set monthly rules', body: 'Plan income, expenses, and savings. You can limit each rule to the months when it is active.' }),
      step('available', { title: 'Acompanhe o disponivel', body: 'Compare o valor planeado com o que ja aconteceu para perceber o que ainda pode usar ou transferir.' }, { title: 'Track what is available', body: 'Compare planned amounts with actual activity to see what can still be spent or transferred.' }),
    ],
  },
  savings: {
    key: 'savings',
    version: 1,
    steps: [
      step('goal', { title: 'Transforme poupanca em objetivo', body: 'Defina um alvo e acompanhe o valor em falta, o progresso e a previsao de contribuicoes.' }, { title: 'Turn savings into a goal', body: 'Set a target and follow the amount remaining, progress, and contribution forecast.' }),
      step('shared', { title: 'Individual ou conjunto', body: 'Os saving pots mantem claro quem contribui e quais pertencem a toda a casa.' }, { title: 'Individual or shared', body: 'Saving pots clearly show who contributes and which goals belong to the whole household.' }),
    ],
  },
  categories: {
    key: 'categories',
    version: 1,
    steps: [
      step('organize', { title: 'Organize as despesas', body: 'Crie categorias simples e consistentes para entender para onde vai o dinheiro.' }, { title: 'Organize expenses', body: 'Create simple, consistent categories to understand where your money goes.' }),
    ],
  },
  members: {
    key: 'members',
    version: 1,
    steps: [
      step('household', { title: 'Colabore em casa', body: 'Convide membros para partilhar contas e objetivos, mantendo a autoria de cada registo clara.' }, { title: 'Collaborate at home', body: 'Invite members to share accounts and goals while keeping each record author clear.' }),
    ],
  },
  settings: {
    key: 'settings',
    version: 1,
    steps: [
      step('preferences', { title: 'Personalize a aplicacao', body: 'Ajuste idioma, tema, moeda e outras preferencias sem alterar os seus dados financeiros.' }, { title: 'Personalize the app', body: 'Adjust language, theme, currency, and other preferences without changing financial data.' }),
      step('help', { title: 'Reveja os guias quando quiser', body: 'Pode abrir este guia novamente a qualquer momento a partir das definicoes.' }, { title: 'Review guides whenever you need', body: 'You can open this guide again at any time from Settings.' }),
    ],
  },
};

export function getOnboardingGuide(key: OnboardingGuideKey): OnboardingGuide {
  return onboardingGuides[key];
}
