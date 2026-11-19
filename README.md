#  Keep

> Controle a validade dos alimentos da sua despensa, receba alertas antes de vencer, aproveite o que você já tem em receitas e reduza o desperdício.



**Keep** é um aplicativo mobile (Android e iOS) feito com **React Native + Expo** e **Supabase**. Ele ajuda pessoas e pequenos comércios a saber o que está na despensa, o que está perto de vencer e quanto dinheiro se perde com produtos descartados.


##Autores
- Lucas Duarte de Carvalho – Desenvolvedor Mobile/ Desktop e DPO; 

- Pedro Henrique de Lima Mendes – Documentação e DPO; 

- Pietro Fernando Arruda Silvestre – Designer e UX/UI Dev; 

- Rafael Fonseca Xavier – Desenvolvedor Mobile/ Desktop e UX/UI Dev; 

- Raphaela Lima Costa – Documentação e Designer;
---

## ✨ Funcionalidades

### 🧺 Despensa
- Cadastro de produtos com nome, marca, categoria, local de armazenamento, datas de compra e validade, quantidade e preço.
- **Categorias:** Laticínios, Carnes, Hortifruti, Grãos e cereais, Bebidas, Padaria, Congelados e Outros.
- **Armazenamento:** Geladeira, Congelador ou Despensa.
- Cada produto tem um status de validade: **ok**, **vence em breve** (até 5 dias) ou **vencido**.
- Edição de nome, quantidade e validade; descarte de produtos com registro de perda.

### 📷 Scanner de código de barras
- No Android, tenta primeiro o **scanner nativo do Google** e, se ele não estiver disponível, usa a câmera dentro do próprio app. Também há o botão **Usar leitor alternativo na tela**.
- No iOS, usa o leitor na tela.
- Formatos aceitos: EAN-13, EAN-8, UPC-A, UPC-E, Code 128, Code 39, Code 93, ITF-14 e Codabar.
- Consulta o catálogo do [Open Food Facts](https://world.openfoodfacts.org/) para preencher o cadastro. Se o produto não for encontrado, ou se estiver sem internet, o formulário abre com o código já lido, para você completar manualmente.
- Zeros à esquerda do código são preservados.

### 🖼️ Fotos dos produtos
- Tire uma foto ou escolha da galeria; a imagem é convertida para JPEG e guardada de forma durável no aparelho.
- Há uma prévia antes de salvar. A foto só é cadastrada quando você toca em **Cadastrar Produto**.
- Com conta, a foto é enviada ao bucket `product-images` do Supabase Storage.

### 🔔 Alertas de validade
- Notificações locais **3 dias antes** do vencimento e **no dia do vencimento**, às 9h.
- Textos claros, como *"Validade próxima: Água"* e *"Vence hoje: Água"*.
- No plano Business, produtos com o mesmo dia de aviso são agrupados em uma única notificação.
- Botão de **notificação de teste** e contagem de avisos agendados em **Meu perfil > Notificações**.

### 🛒 Listas de compras
- Crie listas, adicione itens e marque como comprados.
- Itens pendentes podem ser adicionados a partir da despensa.
- Ao marcar um item como comprado, o estoque é atualizado.

### 🍳 Receitas com o que você tem
- 10 receitas brasileiras com ingredientes e modo de preparo.
- O app compara os ingredientes com a sua despensa e mostra: *"Você tem todos os ingredientes"*, *"Você tem 3/5 • faltam 2"* ou *"Usa X, que vence em breve"*.
- Produtos **vencidos não contam** como disponíveis. Receitas que aproveitam itens perto de vencer ganham destaque.

### 📊 Relatórios de perdas
- Histórico mensal de perdas por valor e por unidades, com variação em relação ao mês anterior.
- Perdas por categoria (planos Casa e Business).
- Valor financeiro das perdas.
- O relatório usa apenas os dados do próprio usuário e começa zerado.

### 👤 Conta e acesso
- Cadastro e login com **e-mail e senha** ou **Google** (via Supabase OAuth).
- Recuperação e redefinição de senha por e-mail.
- Edição de perfil, troca de senha e e-mail, e **exclusão da própria conta** (remove também as fotos do usuário).
- **Modo visitante:** use o app sem criar conta. A despensa fica salva localmente (AsyncStorage) e é apagada ao sair do modo visitante. Fotos não são enviadas ao Supabase nesse modo.

---

## 💳 Planos

| Recurso | Visitante / Freemium | Keep Casa | Keep Business |
|---|---|---|---|
| Preço (ilustrativo) | Grátis | R$ 9,90/mês ou R$ 99,00/ano | R$ 29,90/mês ou R$ 299,00/ano |
| Produtos | até 30 | ilimitado | ilimitado |
| Alertas de validade | ✅ | ✅ | ✅ |
| Scanner de código de barras | ✅ | ✅ | ✅ |
| Listas de compras | 🔒 | ✅ ilimitadas | ✅ ilimitadas |
| Receitas com a despensa | 🔒 | ✅ | ✅ |
| Relatórios | 🔒 | ✅ | ✅ |
| Histórico do relatório | 3 meses | 6 meses | 12 meses |
| Perdas por categoria | ❌ | ✅ | ✅ |
| Valor das perdas | ❌ | ❌ | ✅ |
| Agrupamento de alertas | ❌ | ❌ | ✅ |

> ⚠️ **Os preços são apenas ilustrativos. Não há cobrança real implementada** (veja [Limitações conhecidas](#-limitações-conhecidas)).

As regras de cada plano ficam centralizadas em [`src/utils/permissions.js`](src/utils/permissions.js) e são validadas também no banco de dados.

---

## 🛠️ Tecnologias

| Camada | Tecnologia |
|---|---|
| Framework | [Expo](https://expo.dev/) SDK 58 · React 19.3 · React Native 0.88 |
| Navegação | React Navigation 7 (bottom tabs + native stack) |
| Backend | [Supabase](https://supabase.com/) (Auth, PostgreSQL com RLS e Storage) |
| Câmera e scanner | `expo-camera` · `expo-image-picker` · `expo-image-manipulator` |
| Arquivos | `expo-file-system` |
| Notificações | `expo-notifications` (locais) |
| Armazenamento local | `@react-native-async-storage/async-storage` |
| Gráficos e ícones | `react-native-svg` · `@expo/vector-icons` |
| Fonte | Nunito (`@expo-google-fonts/nunito`) |
| Catálogo de produtos | API do Open Food Facts |

---

## 📁 Estrutura do projeto

```
keep/
├── App.js                      # Entrada: fontes, splash, notificações e providers
├── index.js
├── app.json                    # Configuração do Expo (permissões, plugins)
├── schema-atualizado.sql       # Esquema do banco (Supabase)
├── .env.example                # Modelo das variáveis de ambiente
├── assets/
│   └── notification-icon.png   # Ícone monocromático das notificações Android
└── src/
    ├── components/             # Botões, cards, inputs, cabeçalhos, logo...
    ├── context/                # AuthContext e PantryContext
    ├── navigation/             # Tabs principais e stacks de cada aba
    ├── screens/
    │   ├── Auth/               # Splash, boas-vindas, login, cadastro, senha
    │   ├── Pantry/             # Despensa, cadastro (scanner/manual), detalhes
    │   ├── Lists/              # Listas de compras
    │   ├── Recipes/            # Receitas
    │   ├── Reports/            # Relatórios de perdas
    │   └── Settings/           # Conta, perfil, notificações, planos, ajuda
    ├── services/               # Supabase, produtos, listas, relatórios, notificações...
    ├── theme/                  # Cores, espaçamentos e tipografia
    └── utils/                  # Datas, máscaras, código de barras, fotos, permissões
```

---

## 🚀 Como rodar

### Pré-requisitos

- [Node.js](https://nodejs.org/) **22.13 ou superior**
- Um celular com o app **Expo Go compatível com o SDK 58** (ou um emulador Android/iOS)
- (Opcional) Um projeto no [Supabase](https://supabase.com/) para usar contas reais

### Passo a passo

```bash
# 1. Clone o repositório
git clone https://github.com/SEU-USUARIO/keep.git
cd keep

# 2. Instale as dependências
npm install

# 3. Alinhe as versões ao SDK 58 e verifique o projeto
npx expo install --fix
npx expo-doctor@latest

# 4. Crie o arquivo de ambiente
cp .env.example .env
# edite o .env com as credenciais do seu Supabase

# 5. Inicie o app
npx expo start --clear
```

Escaneie o QR Code com o Expo Go.

> 💡 **Quer só testar?** Pule o Supabase e toque em **Continuar como visitante**. A despensa funciona localmente, sem banco de dados.

> Se o terminal informar um SDK antigo (por exemplo, SDK 55), você está abrindo a pasta de um projeto antigo ou não rodou `npm install` nesta pasta.

### Scripts disponíveis

| Comando | O que faz |
|---|---|
| `npm start` | Inicia o Expo limpando o cache |
| `npm run android` | Abre no Android |
| `npm run ios` | Abre no iOS |
| `npm run web` | Abre no navegador |
| `npm run check-sdk` | Verifica se as dependências estão no SDK correto |
| `npm run doctor` | Roda o `expo-doctor` |

---

## 🗄️ Configuração do Supabase

1. Crie um projeto em [supabase.com](https://supabase.com/).
2. Em **Project Settings → API**, copie a **Project URL** e a chave pública **anon** para o `.env`:

   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=SUA-CHAVE-PUBLICA
   ```

3. Em **SQL Editor → New query**, cole e execute todo o arquivo [`schema-atualizado.sql`](schema-atualizado.sql). Ele é seguro para rodar mais de uma vez, mas **revise antes de aplicar em um banco que já tenha dados**.
4. Confirme que o bucket público `product-images` foi criado. Cada usuário só escreve na própria pasta.
5. Em **Authentication → URL Configuration**, libere as URLs de redirecionamento do app, com o esquema `keep://` (`auth-callback` para o login com Google e `reset-password` para a recuperação de senha). No modo de desenvolvimento, o app imprime no console a URL exata que deve ser liberada.
6. Para entrar com Google, ative o provedor em **Authentication → Providers**.

> 🔒 **Nunca** coloque a chave `service_role` (ou qualquer chave secreta) em um app mobile. Use apenas a chave pública `anon`.

### O que o esquema cria

| Item | Descrição |
|---|---|
| `profiles` | Dados do usuário, plano e preferência de notificações |
| `products` | Produtos da despensa |
| `shopping_lists` / `shopping_list_items` | Listas de compras e seus itens |
| `loss_events` | Histórico de perdas, usado nos relatórios |
| **RLS** | Cada usuário acessa somente os próprios dados |
| **Storage** | Bucket `product-images` com políticas por pasta de usuário |
| **Triggers** | Limites do Freemium (30 produtos e 2 listas) validados no banco |
| **Funções (RPC)** | `change_plan`, `discard_product`, `add_pending_shopping_items`, `update_pantry_product`, `set_shopping_item_bought`, `delete_own_account` |

O usuário não consegue alterar a coluna `plan` diretamente; a mudança passa pela função `change_plan()`.

---

## 🔔 Notificações

- Canal Android `keep-validade-v2`, com importância alta e som.
- Avisos agendados às **9h**, 3 dias antes e no dia da validade, apenas para produtos com quantidade maior que zero.
- Lembretes antigos são substituídos quando algo muda, sem apagar notificações de outras funcionalidades.
- O limite é de 60 avisos agendados por vez.
- A entrega usa o modo `bestEffort`, sem alarme exato. O Android pode adiar avisos para economizar bateria. Não mude para alarme exato sem avaliar a política de permissões do Android.

### Como testar no Android

1. Entre com uma conta ou como visitante e abra **Meu perfil > Notificações**. Ative os alertas e autorize no Android.
2. Toque em **Enviar notificação de teste**, aguarde cerca de 3 segundos e abra a central de notificações.
3. Se aparecer só "Keep", expanda a notificação e confira **Configurações do Android > Apps > Expo Go (ou Keep) > Notificações** e a privacidade de prévia na tela bloqueada.
4. Cadastre um produto com validade futura e confira a contagem de avisos agendados.

> **Expo Go:** no SDK 58, o Expo Go suporta apenas notificações **locais**. Push remoto exige um *development build*. O ícone monocromático de notificação (`assets/notification-icon.png`) só vale em builds nativos próprios (APK); o Expo Go mantém a identidade dele.

---

## ✅ Roteiro de testes

Teste no celular, com o Expo Go (SDK 58):

**Scanner**
- [ ] Despensa → **+** → **Escanear código** → autorize a câmera → leia um EAN-13 real.
- [ ] Se não ler, toque em **Usar leitor alternativo na tela**.
- [ ] Teste um produto não encontrado no catálogo, internet desligada, código com zero à esquerda, permissão negada e cancelamento do scanner.

**Fotos**
- [ ] **Registrar manualmente** → câmera ou galeria → confirme a prévia.
- [ ] Preencha nome e validade → **Cadastrar Produto** → a foto deve aparecer no card da despensa e nos detalhes.
- [ ] Reinicie o app no modo visitante: produto e foto devem continuar lá.
- [ ] Com conta real, confira `products.image_url` e o bucket `product-images`.

**Interface**
- [ ] Meu perfil: o botão salvar só aparece ao editar algo; teclado e navegação funcionam.
- [ ] Planos: a comparação rola na vertical e na horizontal.
- [ ] Cadastro de produto: as duas opções ficam visíveis e clicáveis, sem a barra inferior por cima.

**Notificações:** veja [Como testar no Android](#como-testar-no-android).

Se algo falhar, copie o texto do erro exibido na tela e os logs do terminal (`npx expo start --clear`).

---

## 🎨 Personalização

| O que mudar | Onde |
|---|---|
| Limites e regras dos planos | `src/utils/permissions.js` |
| Preços e textos dos planos | `src/services/plansService.js` |
| Receitas | `src/services/recipesData.js` (cada ingrediente tem `keywords` para o casamento com a despensa) |
| Categorias e locais de armazenamento | `src/services/productsService.js` |
| Contatos exibidos na tela **Ajuda** | `CONTACT` em `src/services/config.js` |
| Cores, espaçamentos e fonte | `src/theme/` |

A tela **Ajuda** só exibe os canais de contato que não forem os valores de exemplo. Troque os dados de `CONTACT` pelos seus.

---

## ⚠️ Limitações conhecidas

- **Sem pagamento integrado.** Qualquer usuário logado consegue escolher qualquer plano. Antes de cobrar de verdade, remova a função `change_plan` e altere o `plan` somente por webhook de pagamento, usando `service_role` no servidor.
- **Sem push remoto.** Os alertas são notificações locais agendadas no aparelho.
- **Validação em aparelho físico pendente.** As verificações feitas até aqui foram de sintaxe, estrutura e testes simulados. Permissões reais, decodificação pelo sensor da câmera, exibição de notificações e upload ao Supabase ainda precisam ser conferidos no celular.
- No modo visitante, as fotos ficam apenas no aparelho e a despensa é apagada ao sair desse modo.
- O app está travado no tema claro e em orientação retrato.

---

## 📝 Histórico de versões

### 1.5.0 — Notificações
- Botão de teste de notificação, contagem de avisos agendados e verificação de permissão.
- Novo canal Android `keep-validade-v2`, com textos explícitos por produto e agrupamento no plano Business.
- Ícone nativo monocromático para builds próprios.

### 1.4.0 — Correções visuais
- Barra de navegação exibida apenas nas telas principais de cada aba.
- Botões inferiores movidos para um rodapé em fluxo, respeitando safe-area e teclado.
- Scanner com aviso após 7 s sem iniciar e botão de reiniciar.
- Tabela de planos com rolagem horizontal; Ajuda sem contatos de exemplo.

### 1.3.0 — Scanner e fotos
- Scanner nativo do Google com alternativa na tela.
- Cadastro mesmo quando o catálogo não reconhece o produto.
- Fotos duráveis, com upload diagnosticável.
- Modo visitante com persistência local.
- Dependências alinhadas ao Expo SDK 58.

---

## 🤝 Contribuindo

Sugestões e correções são bem-vindas. Abra uma *issue* descrevendo o problema ou a ideia, ou envie um *pull request*.

## 📄 Licença

Defina aqui a licença do projeto (por exemplo, MIT) e adicione o arquivo `LICENSE` ao repositório.
