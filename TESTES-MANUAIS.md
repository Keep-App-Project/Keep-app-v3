# Casos de teste Keep — Expo Go SDK 58

**Código de barras:** EAN-13 reconhecido, produto não localizado no catálogo, internet desligada, lanterna no leitor alternativo, permissão câmera negada, código com zero no início, cancelamento do scanner do Google, modo alternativo no Android.

**Fotos:** foto tirada e confirmada, foto cancelada, galeria, JPEG/HEIC, preview no formulário, produto salvo com URL, produto exibido na despensa, imagem nos detalhes do produto, erro de permissão, conexão lenta, bucket Supabase ausente, reinício do app no visitante.

**Dependências:** rodar `npm install`, `npx expo install --check`, `npx expo-doctor@latest`; abrir Expo Go SDK 58 e verificar o scanner e a câmera fisicamente.

**Não testado no dispositivo neste ambiente:** permissões reais, decodificação por sensor e upload ao Supabase do usuário.
