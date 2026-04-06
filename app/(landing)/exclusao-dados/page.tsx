import { Metadata } from "next";
import { PolicyLayout } from "@/components/landing/policy-layout";

export const metadata: Metadata = {
  title: "Exclusão de Dados — ZenBotZ",
  description:
    "Instruções para solicitar a exclusão dos seus dados pessoais na plataforma ZenBotZ.",
};

export default function DataDeletion() {
  return (
    <PolicyLayout
      title="Exclusão de Dados"
      lastUpdated="03 de abril de 2026"
    >
      <p>
        Em conformidade com a Lei Geral de Proteção de Dados (LGPD) e com as
        políticas da Meta/WhatsApp, o <strong>ZenBotZ</strong> oferece mecanismos
        para que você solicite a exclusão dos seus dados pessoais.
      </p>

      <h2>1. Para Usuários da Plataforma (Donos de Restaurante)</h2>
      <p>
        Se você possui uma conta no ZenBotZ e deseja excluir seus dados, siga
        estas instruções:
      </p>
      <ol>
        <li>
          Envie um e-mail para{" "}
          <a href="mailto:privacidade@zenbotz.com.br">privacidade@zenbotz.com.br</a>{" "}
          com o assunto <strong>&ldquo;Solicitação de Exclusão de Dados&rdquo;</strong>
        </li>
        <li>
          Informe o e-mail associado à sua conta e o nome do(s) bot(s) cadastrado(s)
        </li>
        <li>Confirmaremos o recebimento em até 2 dias úteis</li>
        <li>
          A exclusão será processada em até <strong>30 dias</strong> após a
          confirmação
        </li>
      </ol>

      <h3>Dados que serão excluídos:</h3>
      <ul>
        <li>Informações da conta (nome, e-mail, senha)</li>
        <li>Dados dos bots e configurações</li>
        <li>Cardápio e produtos cadastrados</li>
        <li>Histórico de pedidos</li>
        <li>Histórico de conversas com clientes</li>
        <li>Dados de contatos/clientes coletados pelo bot</li>
        <li>Credenciais de integração (WhatsApp, Mercado Pago)</li>
      </ul>

      <h3>Dados que podem ser retidos:</h3>
      <ul>
        <li>
          Registros fiscais e de transações financeiras, conforme obrigação legal
          (até 5 anos)
        </li>
        <li>
          Logs anonimizados de uso para fins estatísticos e de segurança
        </li>
      </ul>

      <h2>2. Para Clientes Finais (Consumidores via WhatsApp)</h2>
      <p>
        Se você é um consumidor que interagiu com um bot do ZenBotZ via WhatsApp e
        deseja excluir seus dados:
      </p>
      <ol>
        <li>
          Envie um e-mail para{" "}
          <a href="mailto:privacidade@zenbotz.com.br">privacidade@zenbotz.com.br</a>{" "}
          com o assunto{" "}
          <strong>&ldquo;Exclusão de Dados — Cliente Final&rdquo;</strong>
        </li>
        <li>
          Informe o número de telefone do WhatsApp utilizado na interação e, se
          possível, o nome do restaurante
        </li>
        <li>
          A exclusão será processada em até <strong>15 dias</strong> após a
          confirmação
        </li>
      </ol>

      <h3>Dados que serão excluídos:</h3>
      <ul>
        <li>Número de telefone e nome de perfil do WhatsApp</li>
        <li>Histórico de conversas com o bot</li>
        <li>Endereço(s) de entrega cadastrado(s)</li>
        <li>Histórico de pedidos</li>
      </ul>

      <h2>3. Exclusão via Facebook/Meta (Data Deletion Callback)</h2>
      <p>
        Se você conectou sua conta Facebook ao ZenBotZ via Facebook Login e deseja
        remover essa conexão:
      </p>
      <ol>
        <li>
          Acesse as{" "}
          <a
            href="https://www.facebook.com/settings?tab=applications"
            target="_blank"
            rel="noopener noreferrer"
          >
            Configurações de Apps do Facebook
          </a>
        </li>
        <li>Localize &ldquo;ZenBotZ&rdquo; na lista de aplicativos</li>
        <li>Clique em &ldquo;Remover&rdquo; para desconectar</li>
        <li>
          Isso acionará automaticamente nosso callback de exclusão, que removerá
          seus dados de autenticação Facebook em até 48 horas
        </li>
      </ol>
      <p>
        Alternativamente, envie um e-mail para{" "}
        <a href="mailto:privacidade@zenbotz.com.br">privacidade@zenbotz.com.br</a>{" "}
        informando o e-mail associado à sua conta Facebook.
      </p>

      <h2>4. Confirmação de Exclusão</h2>
      <p>
        Após o processamento da exclusão, enviaremos um e-mail de confirmação
        informando que seus dados foram removidos. Caso tenha algum dado retido
        por obrigação legal, informaremos quais dados foram mantidos e por
        quanto tempo.
      </p>

      <h2>5. Consequências da Exclusão</h2>
      <ul>
        <li>
          <strong>Usuários:</strong> A exclusão dos dados resultará no
          encerramento definitivo da conta e de todos os bots associados. Esta
          ação é irreversível.
        </li>
        <li>
          <strong>Clientes Finais:</strong> A exclusão dos dados não afeta sua
          conta do WhatsApp, apenas remove as informações armazenadas pelo
          ZenBotZ.
        </li>
      </ul>

      <h2>6. Contato</h2>
      <p>
        Para dúvidas sobre exclusão de dados ou proteção de dados pessoais:
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
