import { Metadata } from "next";
import { PolicyLayout } from "@/components/landing/policy-layout";

export const metadata: Metadata = {
  title: "Termos de Uso — ZenBotZ",
  description: "Termos e condições de uso da plataforma ZenBotZ.",
};

export default function TermsOfService() {
  return (
    <PolicyLayout title="Termos de Uso" lastUpdated="03 de abril de 2026">
      <p>
        Bem-vindo ao <strong>ZenBotZ</strong>. Ao acessar ou utilizar nossa
        plataforma, você concorda com estes Termos de Uso. Leia-os atentamente.
      </p>

      <h2>1. Definições</h2>
      <ul>
        <li>
          <strong>Plataforma:</strong> O sistema ZenBotZ, incluindo o painel web
          (app.zenbotz.com.br), APIs e integrações
        </li>
        <li>
          <strong>Usuário:</strong> Pessoa física ou jurídica que se cadastra na
          Plataforma para utilizar os serviços de automação
        </li>
        <li>
          <strong>Cliente Final:</strong> Pessoa que interage com o bot do Usuário
          via WhatsApp para realizar pedidos
        </li>
        <li>
          <strong>Bot:</strong> Assistente virtual de IA configurado pelo Usuário
          para atender Clientes Finais
        </li>
      </ul>

      <h2>2. Descrição do Serviço</h2>
      <p>
        O ZenBotZ é uma plataforma SaaS que permite a Usuários (restaurantes e
        estabelecimentos de delivery) criarem e gerenciarem bots de inteligência
        artificial no WhatsApp Business para automação de pedidos, pagamentos e
        entregas.
      </p>

      <h2>3. Cadastro e Conta</h2>
      <ul>
        <li>O Usuário deve ter pelo menos 18 anos para se cadastrar</li>
        <li>
          As informações fornecidas no cadastro devem ser verdadeiras, completas e
          atualizadas
        </li>
        <li>
          O Usuário é responsável por manter a segurança de suas credenciais de
          acesso
        </li>
        <li>
          Cada conta é de uso exclusivo do titular. O compartilhamento de
          credenciais é proibido
        </li>
        <li>
          O Usuário deve notificar imediatamente o ZenBotZ sobre qualquer uso não
          autorizado da conta
        </li>
      </ul>

      <h2>4. Uso Aceitável</h2>
      <p>O Usuário se compromete a:</p>
      <ul>
        <li>Utilizar a Plataforma apenas para fins legais e lícitos</li>
        <li>
          Respeitar as{" "}
          <a href="https://www.whatsapp.com/legal/business-policy/" target="_blank" rel="noopener noreferrer">
            Políticas do WhatsApp Business
          </a>{" "}
          e as{" "}
          <a href="https://developers.facebook.com/terms/" target="_blank" rel="noopener noreferrer">
            Políticas da Plataforma Meta
          </a>
        </li>
        <li>Não enviar spam ou mensagens não solicitadas via bot</li>
        <li>
          Não utilizar a Plataforma para vender produtos ilegais, proibidos ou
          regulamentados sem as devidas licenças
        </li>
        <li>
          Manter seu cardápio atualizado e com informações precisas (preços,
          disponibilidade, descrições)
        </li>
        <li>
          Cumprir com todas as obrigações fiscais e sanitárias aplicáveis ao seu
          estabelecimento
        </li>
      </ul>

      <h2>5. Integração WhatsApp Business</h2>
      <p>
        A integração com o WhatsApp é feita via WhatsApp Business API (Meta). Ao
        conectar sua conta, o Usuário:
      </p>
      <ul>
        <li>
          Autoriza o ZenBotZ a enviar e receber mensagens em nome do seu número
          de WhatsApp Business
        </li>
        <li>
          Concorda com os{" "}
          <a href="https://www.whatsapp.com/legal/business-terms/" target="_blank" rel="noopener noreferrer">
            Termos de Serviço do WhatsApp Business
          </a>
        </li>
        <li>
          Reconhece que o WhatsApp pode desabilitar a conta em caso de violação
          de suas políticas
        </li>
        <li>
          Entende que taxas de mensagens do WhatsApp Business API podem ser
          aplicadas pela Meta
        </li>
      </ul>

      <h2>6. Pagamentos e Assinatura</h2>
      <ul>
        <li>
          O acesso à Plataforma é oferecido mediante planos de assinatura mensal
        </li>
        <li>
          Os pagamentos são processados via Mercado Pago. O ZenBotZ não armazena
          dados de cartão de crédito
        </li>
        <li>A cobrança é recorrente e mensal, com renovação automática</li>
        <li>
          O Usuário pode cancelar a assinatura a qualquer momento. O acesso
          permanece ativo até o fim do período pago
        </li>
        <li>
          Não há reembolso proporcional por períodos parciais de uso
        </li>
        <li>
          O ZenBotZ reserva o direito de alterar preços com aviso prévio de 30
          dias
        </li>
      </ul>

      <h2>7. Integração de Pagamentos (Mercado Pago)</h2>
      <p>
        Ao configurar pagamentos PIX via Mercado Pago, o Usuário:
      </p>
      <ul>
        <li>
          Autoriza a conexão OAuth entre sua conta Mercado Pago e o ZenBotZ
        </li>
        <li>
          Reconhece que os pagamentos dos Clientes Finais são processados
          diretamente pelo Mercado Pago, e o ZenBotZ atua apenas como
          intermediário tecnológico
        </li>
        <li>
          Concorda com os{" "}
          <a href="https://www.mercadopago.com.br/ajuda/termos-e-condicoes_300" target="_blank" rel="noopener noreferrer">
            Termos e Condições do Mercado Pago
          </a>
        </li>
      </ul>

      <h2>8. Propriedade Intelectual</h2>
      <ul>
        <li>
          A Plataforma, seu código-fonte, design, marca e conteúdo são
          propriedade exclusiva do ZenBotZ
        </li>
        <li>
          O Usuário retém a propriedade sobre seu conteúdo (cardápio, imagens,
          dados do restaurante)
        </li>
        <li>
          O Usuário concede ao ZenBotZ uma licença limitada para usar seu
          conteúdo exclusivamente para a prestação dos serviços
        </li>
      </ul>

      <h2>9. Limitação de Responsabilidade</h2>
      <p>O ZenBotZ <strong>não se responsabiliza</strong> por:</p>
      <ul>
        <li>
          Erros nas respostas geradas pela inteligência artificial, incluindo
          preços incorretos resultantes de cardápio desatualizado
        </li>
        <li>
          Indisponibilidade do WhatsApp, Mercado Pago ou outros serviços de
          terceiros
        </li>
        <li>
          Pedidos não entregues, cancelados ou com problemas de qualidade do
          produto
        </li>
        <li>Perdas financeiras decorrentes de falhas na integração de pagamentos</li>
        <li>
          Danos indiretos, consequenciais ou lucros cessantes
        </li>
      </ul>
      <p>
        A responsabilidade total do ZenBotZ está limitada ao valor pago pelo
        Usuário nos últimos 3 meses de assinatura.
      </p>

      <h2>10. Disponibilidade do Serviço</h2>
      <p>
        O ZenBotZ se esforça para manter a Plataforma disponível 24/7, mas não
        garante disponibilidade ininterrupta. Manutenções programadas serão
        comunicadas com antecedência quando possível.
      </p>

      <h2>11. Suspensão e Encerramento</h2>
      <p>O ZenBotZ pode suspender ou encerrar a conta do Usuário em caso de:</p>
      <ul>
        <li>Violação destes Termos de Uso</li>
        <li>Uso da Plataforma para atividades ilegais</li>
        <li>Inadimplência no pagamento da assinatura</li>
        <li>Violação das políticas do WhatsApp Business ou Meta</li>
        <li>Comportamento abusivo ou prejudicial à Plataforma ou outros Usuários</li>
      </ul>

      <h2>12. Proteção de Dados</h2>
      <p>
        O tratamento de dados pessoais é regido pela nossa{" "}
        <a href="/privacidade">Política de Privacidade</a>, que é parte
        integrante destes Termos. O Usuário é corresponsável pela proteção dos
        dados dos Clientes Finais coletados via bot, em conformidade com a LGPD.
      </p>

      <h2>13. Alterações nos Termos</h2>
      <p>
        O ZenBotZ pode modificar estes Termos a qualquer momento. Alterações
        significativas serão comunicadas por e-mail com pelo menos 15 dias de
        antecedência. O uso continuado da Plataforma após a notificação
        constitui aceitação dos novos Termos.
      </p>

      <h2>14. Legislação Aplicável</h2>
      <p>
        Estes Termos são regidos pelas leis da República Federativa do Brasil. O
        foro da comarca de São Paulo/SP é eleito para dirimir quaisquer
        controvérsias.
      </p>

      <h2>15. Contato</h2>
      <p>
        Para questões sobre estes Termos, entre em contato:
      </p>
      <ul>
        <li>
          E-mail: <a href="mailto:contato@zenbotz.com.br">contato@zenbotz.com.br</a>
        </li>
      </ul>
    </PolicyLayout>
  );
}
