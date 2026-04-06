import { Metadata } from "next";
import { PolicyLayout } from "@/components/landing/policy-layout";

export const metadata: Metadata = {
  title: "Politica de Privacidade — ZenBotZ",
  description:
    "Saiba como o ZenBotZ coleta, usa e protege seus dados pessoais.",
};

export default function PrivacyPolicy() {
  return (
    <PolicyLayout title="Politica de Privacidade" lastUpdated="03 de abril de 2026">
      <p>
        A <strong>ZenBotZ</strong> (&ldquo;nós&rdquo;, &ldquo;nosso&rdquo; ou &ldquo;Plataforma&rdquo;) se compromete com a proteção da
        privacidade dos seus usuários. Esta Política de Privacidade descreve como
        coletamos, usamos, compartilhamos e protegemos suas informações pessoais
        quando você utiliza nossos serviços, em conformidade com a Lei Geral de
        Proteção de Dados (LGPD — Lei nº 13.709/2018).
      </p>

      <h2>1. Informações que Coletamos</h2>

      <h3>1.1 Dados fornecidos por você</h3>
      <ul>
        <li>Nome completo e e-mail ao criar sua conta</li>
        <li>Senha (armazenada de forma criptografada)</li>
        <li>Informações do restaurante: nome, endereço, cardápio, horário de funcionamento</li>
        <li>Dados de pagamento via integração OAuth com Mercado Pago (não armazenamos dados de cartão)</li>
      </ul>

      <h3>1.2 Dados coletados automaticamente</h3>
      <ul>
        <li>Endereço IP e informações do navegador</li>
        <li>Dados de uso da plataforma (páginas acessadas, funcionalidades utilizadas)</li>
        <li>Cookies essenciais para autenticação e segurança</li>
      </ul>

      <h3>1.3 Dados dos clientes finais (via WhatsApp)</h3>
      <ul>
        <li>Número de telefone do WhatsApp</li>
        <li>Nome de perfil do WhatsApp</li>
        <li>Mensagens trocadas com o bot (histórico de conversa)</li>
        <li>Endereço de entrega informado durante o pedido</li>
        <li>Histórico de pedidos</li>
      </ul>

      <h2>2. Como Usamos Seus Dados</h2>
      <ul>
        <li>Fornecer e manter nossos serviços de automação via WhatsApp</li>
        <li>Processar pedidos e pagamentos</li>
        <li>Enviar notificações sobre pedidos e status</li>
        <li>Melhorar nossos serviços e a experiência do usuário</li>
        <li>Garantir a segurança da plataforma</li>
        <li>Cumprir obrigações legais e regulatórias</li>
      </ul>

      <h2>3. Inteligência Artificial e Processamento de Dados</h2>
      <p>
        Utilizamos modelos de inteligência artificial (IA) de terceiros (OpenAI) para
        processar as mensagens recebidas dos clientes finais via WhatsApp. As mensagens
        são enviadas à API da OpenAI exclusivamente para gerar respostas contextuais
        relacionadas ao cardápio e pedidos. Não utilizamos os dados dos clientes para
        treinar modelos de IA próprios.
      </p>

      <h2>4. Compartilhamento de Dados</h2>
      <p>Compartilhamos dados apenas com:</p>
      <ul>
        <li>
          <strong>Meta/WhatsApp:</strong> Para envio e recebimento de mensagens via
          WhatsApp Business API (conforme os{" "}
          <a href="https://www.whatsapp.com/legal/business-policy/" target="_blank" rel="noopener noreferrer">
            Termos do WhatsApp Business
          </a>
          )
        </li>
        <li>
          <strong>Mercado Pago:</strong> Para processamento de pagamentos PIX via
          integração OAuth
        </li>
        <li>
          <strong>OpenAI:</strong> Para processamento de linguagem natural das
          conversas
        </li>
        <li>
          <strong>Amazon Web Services (AWS):</strong> Infraestrutura de hospedagem
          com data center em Virginia, EUA
        </li>
        <li>
          <strong>Sentry:</strong> Para monitoramento de erros da aplicação (dados
          anonimizados)
        </li>
      </ul>
      <p>
        Não vendemos, alugamos ou compartilhamos seus dados pessoais com
        terceiros para fins de marketing.
      </p>

      <h2>5. Segurança dos Dados</h2>
      <p>Adotamos as seguintes medidas de segurança:</p>
      <ul>
        <li>Autenticação via cookies httpOnly com proteção CSRF</li>
        <li>Criptografia de credenciais de pagamento (Fernet encryption)</li>
        <li>Rate limiting para prevenção de ataques</li>
        <li>Verificação de assinatura HMAC-SHA256 em webhooks</li>
        <li>Transmissão de dados exclusivamente via HTTPS</li>
        <li>Logs estruturados com mascaramento de dados pessoais (PII)</li>
      </ul>

      <h2>6. Retenção de Dados</h2>
      <p>
        Mantemos seus dados enquanto sua conta estiver ativa. Logs de uso e eventos
        de monitoramento são retidos por até 90 dias. Ao solicitar exclusão da conta,
        seus dados serão removidos em até 30 dias, exceto quando houver obrigação
        legal de retenção.
      </p>

      <h2>7. Seus Direitos (LGPD)</h2>
      <p>Você tem o direito de:</p>
      <ul>
        <li>Acessar seus dados pessoais</li>
        <li>Corrigir dados incompletos ou inexatos</li>
        <li>Solicitar a exclusão dos seus dados (veja nossa{" "}
          <a href="/exclusao-dados">página de exclusão de dados</a>)
        </li>
        <li>Revogar o consentimento a qualquer momento</li>
        <li>Solicitar a portabilidade dos dados</li>
        <li>Obter informações sobre o compartilhamento de dados</li>
      </ul>

      <h2>8. Cookies</h2>
      <p>Utilizamos apenas cookies essenciais:</p>
      <ul>
        <li>
          <strong>access_token:</strong> Cookie httpOnly para autenticação segura
          (gerenciado pelo servidor)
        </li>
        <li>
          <strong>zenbots_auth:</strong> Cookie de presença para verificações
          client-side
        </li>
        <li>
          <strong>csrf_token:</strong> Token de proteção contra ataques CSRF
        </li>
      </ul>
      <p>Não utilizamos cookies de rastreamento ou publicidade.</p>

      <h2>9. Menores de Idade</h2>
      <p>
        Nossos serviços não são direcionados a menores de 18 anos. Não coletamos
        intencionalmente dados de menores. Se tomarmos conhecimento de que
        coletamos dados de um menor, tomaremos medidas para excluí-los.
      </p>

      <h2>10. Alterações nesta Política</h2>
      <p>
        Podemos atualizar esta Política de Privacidade periodicamente. Notificaremos
        sobre alterações significativas por e-mail ou aviso na plataforma. O uso
        continuado dos serviços após as alterações constitui aceitação da política
        revisada.
      </p>

      <h2>11. Contato</h2>
      <p>
        Para questões sobre privacidade ou exercer seus direitos, entre em contato:
      </p>
      <ul>
        <li>
          E-mail: <a href="mailto:privacidade@zenbotz.com.br">privacidade@zenbotz.com.br</a>
        </li>
        <li>
          E-mail geral: <a href="mailto:contato@zenbotz.com.br">contato@zenbotz.com.br</a>
        </li>
      </ul>
    </PolicyLayout>
  );
}
