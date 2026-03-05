/**
 * Maps known backend error strings to safe, user-facing Portuguese messages.
 * Never exposes raw backend details (SQL errors, stack traces, internal paths) to users.
 */

const ERROR_MAP: Record<string, string> = {
  "email already registered": "Não foi possível criar a conta. Verifique os dados e tente novamente.",
  "invalid credentials": "Email ou senha incorretos.",
  "incorrect password": "Senha atual incorreta.",
  "token expired": "O link expirou. Solicite um novo.",
  "token invalid": "Link inválido. Solicite um novo.",
  "invalid token": "Link inválido. Solicite um novo.",
  "user not found": "Não foi possível processar a solicitação.",
  "bot not found": "Bot não encontrado.",
  "unauthorized": "Sessão expirada. Faça login novamente.",
  "forbidden": "Você não tem permissão para esta ação.",
  "rate limit exceeded": "Muitas tentativas. Aguarde antes de tentar novamente.",
  "cep not found": "CEP não encontrado na base de dados.",
  "invalid cep": "CEP inválido.",
  "catalog processing failed": "Erro ao processar o cardápio. Tente novamente.",
  "file too large": "Arquivo muito grande.",
  "whatsapp connection failed": "Não foi possível concluir a conexão com o WhatsApp.",
  "email não verificado": "Seu e-mail ainda não foi verificado.",
  "email not verified": "Seu e-mail ainda não foi verificado.",
  "token inválido ou expirado": "O link expirou ou é inválido. Solicite um novo.",
  "muitas tentativas": "Muitas tentativas. Aguarde antes de tentar novamente.",
  "too many requests": "Muitas tentativas. Aguarde antes de tentar novamente.",
  "falha ao enviar e-mail": "Não foi possível enviar o e-mail. Tente novamente.",
};

export function getSafeErrorMessage(error: unknown, fallback: string): string {
  try {
    const detail = (error as { response?: { data?: { detail?: unknown } } })
      ?.response?.data?.detail;

    if (typeof detail !== "string") return fallback;

    const lower = detail.toLowerCase();
    for (const [key, message] of Object.entries(ERROR_MAP)) {
      if (lower.includes(key)) return message;
    }

    return fallback;
  } catch {
    return fallback;
  }
}
