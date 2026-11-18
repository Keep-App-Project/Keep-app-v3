# Keep 1.5 — notificações no Expo SDK 58

## Mudanças

- Canal Android `keep-validade-v2` com importância ALTA, som e descrição. O identificador novo evita herdar configurações imutáveis do canal anterior. As configurações escolhidas pelo usuário no Android ainda têm prioridade.
- Avisos com título e descrição explícitos: «Validade próxima: Água» / «O produto Água vence em breve...», ou «Vence hoje: Água» no dia da validade. Para plano Business, os produtos com o mesmo dia de aviso são agrupados.
- Texto validado antes de agendar e lembretes anteriores substituídos quando houver mudança de formato.
- Handler de exibição registrado na inicialização do aplicativo.
- Tela **Meu perfil > Notificações** tem botão **Enviar notificação de teste** e informa quantos avisos estão agendados. Ao tocar no teste, espere alguns segundos e abra a central de notificações para conferir título e texto.
- Ícone branco transparente para notificações Android, em `assets/notification-icon.png`, configurado via plugin nativo. **Esse ícone só se aplica após uma nova compilação nativa (APK); o Expo Go mantém sua identidade própria.**
- Sem alterações em banco de dados ou credenciais do Supabase.

## Como testar no Android

1. Abra **Notificações** dentro da conta do Keep e ative os alertas (autorize no Android).
2. Toque em **Enviar notificação de teste**. Aguarde ~3 segundos; abra a central de notificações e confira o título *Teste de notificação do Keep* e o corpo completo.
3. Se mostrar só «Keep», expanda a notificação e confira **Configurações do Android > Apps > Expo Go (ou Keep) > Notificações** e a privacidade de prévia na tela bloqueada. O sistema pode ocultar detalhes deliberadamente.
4. Verifique a contagem de avisos agendados. Cadastre um produto com validade futura para que o agendamento seja criado.
5. Para testar a experiência nativa como app Keep, gere APK próprio. **No Android Expo Go SDK 58 apenas notificações locais são suportadas; push remoto requer um development build.**
6. A execução deve ser verificada em celular real. Testes estáticos e simulados não garantem exibição em todos os dispositivos.

## Instalação no VS Code

```bash
npm install
npx expo install --fix
npx expo-doctor@latest
npx expo start --clear
```

Nota: o Android pode adiar avisos com hora fixa por economia de bateria; a opção de entrega é `bestEffort` por padrão, sem autorização de alarme exato. Não altere para alarme exato sem avaliar a política de permissões do Android.
