/**
 * email-template.ts — renderização do HTML da 1ª mensagem (canal EMAIL).
 *
 * Função PURA e isomórfica: recebe o assunto + corpo gerados pelo Gemini
 * e devolve o HTML completo no visual dark/índigo da King Dev, pronto
 * pra preview na UI (iframe) e pra copiar/colar no cliente de email
 * (fase 2: envio via SMTP — hoje é SÓ geração + preview).
 *
 * Compatibilidade com clientes de email (Outlook/Gmail/Apple Mail):
 * - layout em <table> com estilos INLINE (sem CSS externo)
 * - width fluido (max-width 600px) → responsivo sem media query
 * - todo texto interpolado passa por escapeHtml (XSS-safe)
 */

export interface EmailRenderizado {
	/** Assunto escapado (também usado no <title> e no preheader). */
	assunto: string;
	/** HTML completo do documento. */
	html: string;
}

interface EmailPrimeiraMensagemInput {
	/** Assunto do email (≤60 chars, gerado pelo Gemini). */
	assunto: string;
	/** Corpo em texto puro — parágrafos separados por quebra de linha. */
	corpo: string;
}

/** Escapa HTML de texto vindo do Gemini/input (nunca confie em LLM). */
export function escaparHtml(texto: string): string {
	return texto
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");
}

/** Quebra o corpo em parágrafos (linha em branco OU quebra simples). */
function paraParagrafos(corpo: string): string[] {
	return corpo
		.split(/\n+/)
		.map((p) => p.trim())
		.filter(Boolean);
}

const ESTILO_PARAGRAFO =
	"margin:0 0 16px 0;font-size:16px;line-height:1.65;color:#C9C9D6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;";

const ESTILO_ASSINATURA =
	"margin:24px 0 0 0;font-size:16px;line-height:1.65;color:#F4F4F6;font-weight:600;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;";

/**
 * Monta o email HTML da 1ª mensagem no visual King Dev.
 *
 * Visual: fundo quase-preto, card índigo-escuro com borda, wordmark
 * "King Dev Tec" com destaque índigo, corpo em parágrafos corridos e
 * rodapé discreto. Escuro por padrão (é a identidade) — clientes com
 * dark-mode desligado caem nos mesmos hex (inline, sem preferência).
 */
export function renderizarEmailPrimeiraMensagem(
	input: EmailPrimeiraMensagemInput,
): EmailRenderizado {
	const assunto = escaparHtml(input.assunto.trim());
	const paragrafos = paraParagrafos(input.corpo);

	const corpoHtml =
		paragrafos.length === 0
			? ""
			: paragrafos
					.map((paragrafo, i) => {
						const ehAssinatura =
							i === paragrafos.length - 1 && /^Abraço,?\s/i.test(paragrafo);
						return `<p style="${ehAssinatura ? ESTILO_ASSINATURA : ESTILO_PARAGRAFO}">${escaparHtml(paragrafo)}</p>`;
					})
					.join("\n          ");

	const html = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="x-apple-disable-message-reformatting" />
    <title>${assunto}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#0A0A10;">
    <!-- preheader: o que aparece na lista de emails sem poluir o corpo -->
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
      ${assunto}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
    </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#0A0A10" style="background-color:#0A0A10;">
      <tr>
        <td align="center" style="padding:32px 12px;">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background-color:#13131C;border:1px solid #2A2A3D;border-radius:16px;">
            <tr>
              <td style="padding:28px 32px 20px 32px;">
                <div style="font-size:19px;font-weight:700;color:#F4F4F6;letter-spacing:-0.2px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
                  King Dev<span style="color:#818CF8;"> Tec</span>
                </div>
                <div style="margin-top:4px;font-size:12px;color:#8B8B9E;letter-spacing:0.4px;text-transform:uppercase;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
                  Software sob medida pra negócios locais
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px;">
                <div style="height:1px;background-color:#2A2A3D;font-size:1px;line-height:1px;">&nbsp;</div>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 8px 32px;">
          ${corpoHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:12px 32px 28px 32px;">
                <div style="height:1px;background-color:#2A2A3D;font-size:1px;line-height:1px;margin-bottom:16px;">&nbsp;</div>
                <div style="font-size:12px;line-height:1.6;color:#8B8B9E;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
                  King Dev Tec · Ribeirão Preto e região<br />
                  Software sob medida, automações e sistemas internos.
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

	return { assunto: input.assunto.trim(), html };
}
