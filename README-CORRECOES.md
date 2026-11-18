# Keep 1.3.0 — Expo SDK 58 — Scanner + fotos na despensa

Esta versão substitui a 1.2.0. Foram revisados dois fluxos que ainda falhavam no celular: scanner de código de barras e foto que não aparecia na despensa.

## Principais mudanças

- **Scanner com duas alternativas no Android:** tenta primeiro o scanner nativo do Google (via `CameraView.launchScanner` + `onModernBarcodeScanned`); se não houver suporte ou o scanner falhar ao iniciar, usa `CameraView` no próprio aplicativo. Existe também o botão **Usar leitor alternativo na tela**. No iOS, utiliza o leitor na tela.
- **Scanner sem depender da internet:** depois de ler um código válido, o app abre o formulário de cadastro mesmo quando o Open Food Facts não identifica o produto. Dessa forma uma falha no catálogo não se confunde com uma falha na leitura.
- **Foto durável:** captura/seleção é normalizada em JPEG e copiada do cache para `Paths.document/keep-product-images` via `expo-file-system`; aparece um preview e uma mensagem dizendo que ela só será cadastrada quando o usuário tocar **Cadastrar Produto**.
- **Upload diagnosticável:** erros no arquivo local e no bucket Supabase `product-images` agora informam o problema em vez de perder silenciosamente a foto; a URL resultante é gravada no campo `image_url` do cadastro.
- **Modo visitante:** os produtos e URIs de fotos agora são guardados no AsyncStorage local, preservando a despensa após fechar/reabrir o app e tocar em **Continuar como visitante**. O botão sair limpa a despensa de visitante. Fotos não são enviadas ao Supabase no modo visitante.
- **Dependências:** alinhadas ao SDK 58: Expo 58, React 19.3, React Native 0.88.1, módulos de câmera, ImagePicker, FileSystem, ImageManipulator, WebBrowser, etc. Arquivo `.env.example` para credenciais públicas.

## Instalar no VS Code

1. Extraia o ZIP em uma pasta nova (não misture com arquivos do SDK antigo).
2. Abra o terminal na pasta e instale o Node 22.13+.
3. Execute:

```sh
npm install
npx expo install --fix
npx expo-doctor@latest
npx expo start --clear
```

4. Conecte usando **Expo Go para SDK 58**. Caso o terminal ainda informe SDK 55, você está abrindo a pasta do projeto antigo ou não executou `npm install` nesta pasta.

## Instalar no Expo Snack

- Use o ZIP **Keep-1.3-SDK58-Snack.zip**: nele há um `App.js` único e um `package.json` com dependências. Abra `https://snack.expo.dev`, selecione SDK 58, substitua `App.js` e configure as dependências indicadas no `package.json`.
- Se usar o projeto completo no Snack, mantenha a estrutura de pastas `src`; a versão de arquivo único dispensa isso.

## Supabase

- O código distribuído usa valores de exemplo em `src/services/config.js` e **não contém os dados do seu Supabase**. Para cadastrar usando conta real, configure no `.env` os valores públicos:

```env
EXPO_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=SUA-CHAVE-PUBLICA
```

- Execute o arquivo `schema-atualizado.sql` no SQL Editor do Supabase (revise antes de aplicar em uma base existente). O bucket público `product-images` deve existir e permitir que cada usuário autenticado faça upload na própria pasta.
- No Snack com `App.js` único, as variáveis de ambiente podem não estar disponíveis; o modo visitante funciona sem banco, mas para conta real você deverá inserir as credenciais públicas em `src/services/config.js` antes de gerar novamente o bundle único. Não inclua `service_role` ou uma chave secreta em aplicativos móveis.

## Roteiro de teste no celular

1. Despensa → + → Escanear código → autorize câmera → teste EAN-13 real. Caso não leia, toque **Usar leitor alternativo na tela**. Confira se o código aparece no cadastro manual, inclusive quando não for reconhecido pelo catálogo.
2. Despensa → + → Registrar manualmente → Câmera → capture uma foto → confirme o **preview** → preencha nome e data de validade → **Cadastrar Produto** → **Voltar para a despensa**; o card deve mostrar a foto e a tela de detalhes também.
3. Reinicie o aplicativo e volte ao modo visitante: o produto e a foto devem permanecer. Ao usar uma conta real, confira o banco `products.image_url` e o bucket de fotos.
4. Caso ocorra erro, capture o texto mostrado na tela e os logs do terminal `npx expo start --clear`.

## Status da validação

Foram executadas verificações de sintaxe/estrutura e **7 testes simulados** (código de barras, captura, armazenamento local, persistência de visitante, upload, scanner nativo/alternativo e cadastro com foto). Isso **não substitui o teste físico** do Expo Go no aparelho nem a validação real no Supabase, indisponíveis neste ambiente.
