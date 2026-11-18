# Keep 1.4 — correções visuais (Expo SDK 58)

Base: Keep 1.3 corrigido SDK 58. Nenhuma mudança em credenciais, registros ou esquema Supabase.

## Alterações

- Barra de navegação laranja agora é mostrada somente nas **telas principais** de cada aba. Telas internas, câmera, detalhes do produto, perfil, planos e cadastro não ficam mais cobertos.
- Botões inferiores do perfil, plano, scanner e cadastro foram movidos para um rodapé **em fluxo**, abaixo do conteúdo rolável. Agora respeitam safe-area e teclado, em vez de usar `position: absolute`.
- O botão “Salvar alterações” do Perfil só aparece quando alguma informação muda; no plano atual, o botão redundante deixou de aparecer.
- Corrigida a folha modal de escolha de cadastro: fundo branco, duas opções de fácil toque, ajuste ao rodapé do aparelho e navegação sem barra inferior sobreposta.
- A tabela de planos tem rolagem horizontal para evitar textos comprimidos em aparelhos menores; abas não ficam por trás do cabeçalho.
- Scanner embutido: removido `overflow: hidden` do contêiner da CameraView (potencial problema de SurfaceView no Android), exibido aviso quando não inicia em 7 s e botão de reiniciar, além de saída manual sempre acessível. **O funcionamento da câmera depende de validação no aparelho.**
- Valores longos de detalhes do produto podem quebrar/encolher sem ultrapassar os limites da tela.
- Ajuda: não são mais exibidos e-mails, URLs e QR Codes de exemplo como se fossem canais oficiais. Configure os canais reais em `src/services/config.js`.
- Cadastro manual: prévia da foto maior e sem sobreposição com o cabeçalho.
- Configuração do Android com `softwareKeyboardLayoutMode: resize`.
- Pacote único para Snack reconstruído a partir dos fontes corrigidos, incluindo o módulo `react/jsx-runtime` que faltava ao mapa de dependências da versão anterior.

## Testar no celular

1. Abrir e rolar Meu perfil sem alterações; depois editar o nome e conferir o botão salvar, teclado e a navegação.
2. Abrir Planos e rolar vertical e horizontalmente a comparação; alternar planos.
3. Abrir cadastro de produto: ambas as opções devem permanecer visíveis e clicáveis, sem barra inferior.
4. No scanner, usar **Escanear código com a câmera** e **Usar leitor alternativo na tela**. Se a câmera continuar preta, tocar **Tentar novamente** e enviar o log `onMountError` do Expo Go.
5. Abrir Detalhes e Ajuda; conferir textos e margens.
6. Tirar foto no cadastro e salvar o produto; confirmar que a foto está visível na despensa.

## Limitação

Os 73 arquivos JavaScript passaram validação de sintaxe/transpilação, 304 importações locais foram conferidas e 13 verificações estáticas de layout executadas. Ainda não houve teste em aparelho físico nem execução integrada com Supabase real. O ícone cinza flutuante de engrenagem observado nas capturas não foi identificado no código e pode vir do sistema Android ou Expo Go; não foi alterado.
