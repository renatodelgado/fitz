# Fitz

Uma calculadora nutricional moderna para estimar gasto calórico diário e
distribuição de macronutrientes de forma simples e intuitiva.

O projeto transforma o fluxo originalmente criado em Python, no arquivo
`tmb.py`, em uma aplicação web responsiva e instalável. Cada pergunta é
apresentada em uma etapa separada, reduzindo a complexidade do preenchimento.

## Funcionalidades

- Questionário guiado, com uma pergunta por tela
- Estimativa da Taxa Metabólica Basal (TMB)
- Cálculo de calorias de manutenção conforme o nível de atividade
- Definição de déficit calórico
- Sugestão de carboidratos, proteínas e gorduras
- Referências de peso baseadas em diferentes valores de IMC
- Tela final com resumo, gráfico e explicação dos resultados
- Validação de dados e prevenção de resultados incompatíveis
- Progresso salvo localmente no navegador
- Layout responsivo para celulares, tablets e computadores
- Suporte a instalação como PWA e funcionamento offline

## Tecnologias

- [React](https://react.dev/)
- [Vite](https://vite.dev/)
- [Lucide React](https://lucide.dev/)
- [Vite PWA](https://vite-pwa-org.netlify.app/)
- CSS responsivo
- ESLint

## Como executar

### Requisitos

- Node.js 20 ou superior
- npm

### Instalação

```bash
git clone URL_DO_REPOSITORIO
cd fitz
npm install
```

Inicie o servidor de desenvolvimento:

```bash
npm run dev
```

O endereço local será exibido no terminal, normalmente:

```text
http://localhost:5173
```

## Comandos

```bash
# Executa o ambiente de desenvolvimento
npm run dev

# Verifica o código com ESLint
npm run lint

# Gera a versão de produção
npm run build

# Visualiza localmente a versão de produção
npm run preview
```

Os arquivos finais de produção são gerados na pasta `dist`.

## Como os cálculos funcionam

A TMB é estimada pela equação de Mifflin-St Jeor:

```text
Homens:   (10 × peso) + (6,25 × altura) - (5 × idade) + 5
Mulheres: (10 × peso) + (6,25 × altura) - (5 × idade) - 161
```

Em seguida, a TMB é multiplicada pelo fator correspondente ao nível de
atividade física. O déficit escolhido é descontado desse resultado para
calcular a meta calórica diária.

A distribuição de macronutrientes utiliza o peso de referência selecionado
pelo usuário. Toda a lógica está centralizada em
[`src/calculations.js`](src/calculations.js).

## Estrutura do projeto

```text
fitz/
├── public/
│   └── icon.svg
├── src/
│   ├── App.jsx
│   ├── calculations.js
│   ├── main.jsx
│   └── styles.css
├── index.html
├── tmb.py
├── vite.config.js
└── package.json
```

## PWA

O Fitz possui manifesto web, service worker com atualização automática e
cache dos arquivos essenciais. Após o primeiro acesso, navegadores compatíveis
podem oferecer a instalação da aplicação no dispositivo.

Para testar o comportamento de produção do PWA:

```bash
npm run build
npm run preview
```

## Aviso

Os resultados apresentados são estimativas educacionais e não substituem
avaliação, diagnóstico ou prescrição de nutricionista ou outro profissional
de saúde qualificado.

---

Desenvolvido a partir de uma calculadora nutricional em Python, agora com uma
experiência web mais acessível, agradável e responsiva.
