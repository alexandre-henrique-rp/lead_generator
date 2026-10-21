import { describe, expect, it } from "vitest";
import {
	buildColdOutreachPrompt,
	buildMelhoriaDeMensagemPrompt,
	type LeadInput,
} from "./cold-outreach";

const leadBase: LeadInput = {
	nome: "Padaria do João",
	razaoSocial: "Padaria do João LTDA",
	cidade: "Ribeirão Preto",
	uf: "SP",
	etapaFunil: "NOVO",
	observacoes: "Achou no Google Maps, parece boa opção.",
	cnaeFiscalDescricao:
		"Padaria e confeitaria com predominância de produção própria",
	porte: "MICRO",
	dataInicioAtividade: new Date("2018-03-15"),
	capitalSocialCentavos: 50_000_00,
	descricaoSituacaoCadastral: "ATIVA",
	website: null,
};

describe("buildColdOutreachPrompt", () => {
	it("retorna string não-vazia", () => {
		const prompt = buildColdOutreachPrompt(leadBase);
		expect(prompt).toBeTruthy();
		expect(prompt.length).toBeGreaterThan(500);
	});

	it("inclui a persona do Alexandre", () => {
		const prompt = buildColdOutreachPrompt(leadBase);
		expect(prompt).toMatch(/Alexandre/);
		expect(prompt).toMatch(/King Dev Tec/);
	});

	it("inclui o framework de análise", () => {
		const prompt = buildColdOutreachPrompt(leadBase);
		expect(prompt).toMatch(/ciclo de digitalização/i);
		expect(prompt).toMatch(/gargalo operacional/i);
	});

	it("inclui regras de PT-BR explícitas", () => {
		const prompt = buildColdOutreachPrompt(leadBase);
		expect(prompt).toMatch(/PT-BR brasileiro/);
		expect(prompt).toMatch(/WhatsApp/);
	});

	it("lista anti-padrões de marketing fluff", () => {
		const prompt = buildColdOutreachPrompt(leadBase);
		expect(prompt).toMatch(/Gostaríamos de apresentar/);
		expect(prompt).toMatch(/transformação digital/i);
		expect(prompt).toMatch(/Não perca/);
	});

	it("injeta os dados do lead no prompt", () => {
		const prompt = buildColdOutreachPrompt(leadBase);
		expect(prompt).toMatch(/Padaria do João/);
		expect(prompt).toMatch(/Ribeirão Preto/);
		expect(prompt).toMatch(/Padaria e confeitaria/);
		expect(prompt).toMatch(/MICRO/);
	});

	it("lida com observações nulas sem quebrar", () => {
		const prompt = buildColdOutreachPrompt({
			...leadBase,
			observacoes: null,
		});
		expect(prompt).toMatch(/nenhuma — use o que tem nos outros campos/);
	});

	it("lida com dataInicioAtividade nula", () => {
		const prompt = buildColdOutreachPrompt({
			...leadBase,
			dataInicioAtividade: null,
		});
		// Não deve mencionar "null" nem quebrar
		expect(prompt).not.toMatch(/null/);
	});

	it("lida com lead mínimo (só nome)", () => {
		const leadMin: LeadInput = {
			nome: "João",
			razaoSocial: null,
			cidade: null,
			uf: null,
			etapaFunil: "NOVO",
			observacoes: null,
			cnaeFiscalDescricao: null,
			porte: null,
			dataInicioAtividade: null,
			capitalSocialCentavos: null,
			descricaoSituacaoCadastral: null,
			website: null,
		};
		const prompt = buildColdOutreachPrompt(leadMin);
		expect(prompt).toBeTruthy();
		expect(prompt).toMatch(/João/);
		expect(prompt).toMatch(/não informado/);
	});

	it("exige JSON estruturado no output", () => {
		const prompt = buildColdOutreachPrompt(leadBase);
		expect(prompt).toMatch(/"analise"/);
		expect(prompt).toMatch(/"mensagem"/);
	});

	it("orienta WhatsApp com CTA de pergunta aberta + 5 minutos", () => {
		const prompt = buildColdOutreachPrompt(leadBase);
		expect(prompt).toMatch(/CTA \(invariante\)/i);
		expect(prompt).toMatch(/pergunta aberta/i);
		expect(prompt).toMatch(/5 minutos/);
		expect(prompt).toMatch(/por aqui mesmo/);
	});

	it("inclui perfil de Saúde com aviso de LGPD", () => {
		const prompt = buildColdOutreachPrompt(leadBase);
		expect(prompt).toMatch(/## Saúde/);
		expect(prompt).toMatch(/clínica médica/);
		expect(prompt).toMatch(/agendamento online/);
		expect(prompt).toMatch(/LGPD/);
		expect(prompt).toMatch(/dados sensíveis de saúde/);
	});

	it("inclui perfil de Educação com atenção a menor de idade", () => {
		const prompt = buildColdOutreachPrompt(leadBase);
		expect(prompt).toMatch(/## Educação/);
		expect(prompt).toMatch(/matrícula/);
		expect(prompt).toMatch(/responsável/);
		expect(prompt).toMatch(/consentimento do responsável/);
	});

	it("inclui perfil de Imobiliárias com foco em CRM de leads", () => {
		const prompt = buildColdOutreachPrompt(leadBase);
		expect(prompt).toMatch(/## Imobiliárias/);
		expect(prompt).toMatch(/CRM de leads/);
		expect(prompt).toMatch(/follow-up/);
	});

	it("inclui perfil de Construção e Engenharia focado em orçamento de obra", () => {
		const prompt = buildColdOutreachPrompt(leadBase);
		expect(prompt).toMatch(/## Construção/);
		expect(prompt).toMatch(/orçamento de obra/);
		expect(prompt).toMatch(/SINAPI/);
	});

	it("menciona regra de LGPD aplicada por setor (não só Saúde)", () => {
		const prompt = buildColdOutreachPrompt(leadBase);
		// A frase final do bloco deve orientar a LLM a mencionar LGPD quando
		// o lead mexe com dados sensíveis
		expect(prompt).toMatch(/LGPD\/compliance/);
	});

	it("inclui contexto local de Ribeirão Preto", () => {
		const prompt = buildColdOutreachPrompt(leadBase);
		expect(prompt).toMatch(/CONTEXTO LOCAL/);
		expect(prompt).toMatch(/Ribeirão Preto/);
		expect(prompt).toMatch(/cultura "pé no chão"/i);
		expect(prompt).toMatch(/calor/);
		expect(prompt).toMatch(/interior paulista/);
	});

	it("inclui perfil de Comércio local — Alimentação", () => {
		const prompt = buildColdOutreachPrompt(leadBase);
		expect(prompt).toMatch(/## Comércio local — Alimentação/);
		expect(prompt).toMatch(/CMV/);
		expect(prompt).toMatch(/cardápio digital/);
	});

	it("inclui perfil de Comércio local — Moda e calçados", () => {
		const prompt = buildColdOutreachPrompt(leadBase);
		expect(prompt).toMatch(/## Comércio local — Moda/);
		expect(prompt).toMatch(/loja de rua/);
		expect(prompt).toMatch(/catálogo digital/);
	});

	it("inclui perfil de Serviço automotivo (mecânica, AC de carro)", () => {
		const prompt = buildColdOutreachPrompt(leadBase);
		expect(prompt).toMatch(/## Serviço automotivo/);
		expect(prompt).toMatch(/ar-condicionado de carro/);
		expect(prompt).toMatch(/agenda de oficina/);
	});

	it("inclui perfil de Refrigeração comercial", () => {
		const prompt = buildColdOutreachPrompt(leadBase);
		expect(prompt).toMatch(/## Refrigeração comercial/);
		expect(prompt).toMatch(/câmara fria/);
		expect(prompt).toMatch(/manutenção preventiva/);
	});

	it("inclui perfil de Beleza e bem-estar", () => {
		const prompt = buildColdOutreachPrompt(leadBase);
		expect(prompt).toMatch(/## Beleza e bem-estar/);
		expect(prompt).toMatch(/Booksy/);
		expect(prompt).toMatch(/comissão/);
	});

	it("inclui perfil de Agronegócio com atenção à sazonalidade", () => {
		const prompt = buildColdOutreachPrompt(leadBase);
		expect(prompt).toMatch(/## Agronegócio/);
		expect(prompt).toMatch(/sazonalidade/i);
		expect(prompt).toMatch(/cana/);
		expect(prompt).toMatch(/rastreabilidade/);
		expect(prompt).toMatch(/agrônomo/);
	});

	it("inclui perfil de Logística e transporte focado no corredor Anhanguera", () => {
		const prompt = buildColdOutreachPrompt(leadBase);
		expect(prompt).toMatch(/## Logística/);
		expect(prompt).toMatch(/Corredor Anhanguera|Anhanguera/);
		expect(prompt).toMatch(/CT-e|MDF-e/);
		expect(prompt).toMatch(/manutenção preventiva/);
	});

	it("inclui perfil de Indústria leve e manufatura pequena", () => {
		const prompt = buildColdOutreachPrompt(leadBase);
		expect(prompt).toMatch(/## Indústria leve/);
		expect(prompt).toMatch(/PCP/);
		expect(prompt).toMatch(/NR-12/);
		expect(prompt).toMatch(/OEE/);
	});

	it("inclui perfil de Assistência técnica de eletrônicos e TI", () => {
		const prompt = buildColdOutreachPrompt(leadBase);
		expect(prompt).toMatch(/## Assistência técnica de eletrônicos/);
		expect(prompt).toMatch(/celular/);
		expect(prompt).toMatch(/notebook/);
		expect(prompt).toMatch(/Ordem de Serviço|OS/);
		expect(prompt).toMatch(/IMEI/);
		expect(prompt).toMatch(/garantia/);
	});

	it("inclui perfil de Pet shop e Veterinária", () => {
		const prompt = buildColdOutreachPrompt(leadBase);
		expect(prompt).toMatch(/## Pet shop/);
		expect(prompt).toMatch(/clínica veterinária/);
		expect(prompt).toMatch(/CRM por tutor|aniversário/);
		expect(prompt).toMatch(/cartão de vacina/);
	});

	it("inclui perfil de Eventos com ALTA TEMPORADA out-fev", () => {
		const prompt = buildColdOutreachPrompt(leadBase);
		expect(prompt).toMatch(/## Eventos/);
		expect(prompt).toMatch(/cerimonialista/);
		expect(prompt).toMatch(/buffet/);
		expect(prompt).toMatch(/RSVP/);
		expect(prompt).toMatch(/out-fev|outubro|novembro/);
	});

	it("inclui perfil de Serviços financeiros com compliance SUSEP", () => {
		const prompt = buildColdOutreachPrompt(leadBase);
		expect(prompt).toMatch(/## Serviços financeiros/);
		expect(prompt).toMatch(/corretora/);
		expect(prompt).toMatch(/SUSEP|seguro/);
		expect(prompt).toMatch(/renovação/);
	});

	it("inclui perfil de Igrejas e ONGs com dízimo via Pix", () => {
		const prompt = buildColdOutreachPrompt(leadBase);
		expect(prompt).toMatch(/## Igrejas/);
		expect(prompt).toMatch(/dízimo/);
		expect(prompt).toMatch(/Pix/);
		expect(prompt).toMatch(/prestação de contas/);
	});

	it("especifica gênero masculino do Alexandre (evita 'Sou a Alexandre')", () => {
		const prompt = buildColdOutreachPrompt(leadBase);
		expect(prompt).toMatch(/o Alexandre|masculino/);
		expect(prompt).toMatch(/nunca "a Alexandre"/);
	});

	it("inclui bloco de humanização de CNAE com exemplos", () => {
		const prompt = buildColdOutreachPrompt(leadBase);
		expect(prompt).toMatch(/HUMANIZAÇÃO DE CNAE/);
		expect(prompt).toMatch(/jargão/);
		expect(prompt).toMatch(/padaria/);
		expect(prompt).toMatch(/loja de roupa/);
	});

	it("tem escada de personalização (observações > site > CNAE)", () => {
		const prompt = buildColdOutreachPrompt(leadBase);
		expect(prompt).toMatch(/Escada de personalização/);
		expect(prompt).toMatch(/Observações do Operador.*OURO/s);
		expect(prompt).toMatch(/Site existente/);
	});

	it("força 3 linhas de oferta no formato Serviço (benefício);", () => {
		const prompt = buildColdOutreachPrompt(leadBase);
		expect(prompt).toMatch(/exatamente 3 linhas de oferta/);
		expect(prompt).toMatch(/Serviço \(benefício concreto\);/);
		expect(prompt).toMatch(/PRINCIPAL \+ EXPANSAO \+ ENTRADA/);
	});

	it("banir promessa de vídeo, exemplo, print ou demo", () => {
		const prompt = buildColdOutreachPrompt(leadBase);
		expect(prompt).toMatch(/vídio|vídeo/i);
		expect(prompt).toMatch(/NÃO promete vídeo, exemplo, print ou demo/);
		expect(prompt).toMatch(/Te mando um vídeo/);
	});

	it("bane 'Abração' (typo de Abraço)", () => {
		const prompt = buildColdOutreachPrompt(leadBase);
		expect(prompt).toMatch(/Abração.*typo/);
	});

	it("inclui Golden Example do Arquétipo A (lanchonete) como gabarito", () => {
		const prompt = buildColdOutreachPrompt(leadBase);
		expect(prompt).toMatch(/Anatomia do Arquétipo A/);
		expect(prompt).toMatch(/Fala, pessoal do Mau Mau!/);
		expect(prompt).toMatch(/49 anos de chão/);
		expect(prompt).toMatch(/Sou da King Dev, aqui da região/);
		expect(prompt).toMatch(/Automação de atendimento no WhatsApp/);
		expect(prompt).toMatch(/Abraço, Alexandre \| King Dev/);
	});

	it("inclui skeletons dos arquétipos B, C e D", () => {
		const prompt = buildColdOutreachPrompt(leadBase);
		expect(prompt).toMatch(/Skeleton do Arquétipo B/);
		expect(prompt).toMatch(/Skeleton do Arquétipo C/);
		expect(prompt).toMatch(/Skeleton do Arquétipo D/);
		expect(prompt).toMatch(/CUSTO E INTEGRAÇÃO/);
		expect(prompt).toMatch(/CONFIANÇA E AGENDA/);
		expect(prompt).toMatch(/CRESCIMENTO E AQUISIÇÃO/);
	});

	it("inclui Quality Gate com auto-verificação", () => {
		const prompt = buildColdOutreachPrompt(leadBase);
		expect(prompt).toMatch(/QUALITY GATE/);
		expect(prompt).toMatch(/AUTO-VERIFICAÇÃO/);
		expect(prompt).toMatch(/Mensagem genérica = output rejeitado/);
	});

	it("Quality Gate lista todos os checks críticos", () => {
		const prompt = buildColdOutreachPrompt(leadBase);
		// Cada checkbox do Quality Gate
		expect(prompt).toMatch(/abre com hook personalizado/i);
		expect(prompt).toMatch(/ARQUÉTIPO escolhido é coerente/);
		expect(prompt).toMatch(/MASCULINO.*Alexandre/);
		expect(prompt).toMatch(/HUMANIZADO/);
		expect(prompt).toMatch(/EXATAMENTE 3 linhas/);
		expect(prompt).toMatch(/detalhe operacional nomeável/);
		expect(prompt).toMatch(
			/pergunta aberta \+ "5 minutos" \+ "por aqui mesmo"/,
		);
		expect(prompt).toMatch(/Ribeirão Preto/);
		expect(prompt).toMatch(/oportunidades.*PRINCIPAL e 1 EXPANSAO/s);
		expect(prompt).toMatch(/oportunidade PRINCIPAL é de software\/automação/);
	});

	it("inclui bloco de arquétipos com os 4 tipos", () => {
		const prompt = buildColdOutreachPrompt(leadBase);
		expect(prompt).toMatch(/ARQUÉTIPOS DE MENSAGEM/);
		expect(prompt).toMatch(/A — OPERAÇÃO DE BALCÃO\/PICO/);
		expect(prompt).toMatch(/B — CUSTO E INTEGRAÇÃO/);
		expect(prompt).toMatch(/C — CONFIANÇA E AGENDA/);
		expect(prompt).toMatch(/D — CRESCIMENTO E AQUISIÇÃO/);
		expect(prompt).toMatch(/a estrutura MUDA com o setor/);
	});

	it("taggeia setores com arquétipo recomendado", () => {
		const prompt = buildColdOutreachPrompt(leadBase);
		expect(prompt).toMatch(/## Comércio local — Alimentação.*\[Arquétipo A\]/);
		expect(prompt).toMatch(/## Logística e transporte.*\[Arquétipo B\]/);
		expect(prompt).toMatch(/## Serviço profissional.*\[Arquétipo C\]/);
		expect(prompt).toMatch(/## Educação.*\[Arquétipo D\]/);
		expect(prompt).toMatch(
			/## Igrejas e ONGs.*\[Arquétipo C — tom respeitoso\]/,
		);
	});

	it("inclui mapa de oportunidades com prioridades", () => {
		const prompt = buildColdOutreachPrompt(leadBase);
		expect(prompt).toMatch(/MAPA DE OPORTUNIDADES DE TI/);
		expect(prompt).toMatch(/3 a 5 oportunidades/);
		expect(prompt).toMatch(/"ENTRADA" \| "PRINCIPAL" \| "EXPANSAO"/);
		expect(prompt).toMatch(/titulo/);
		expect(prompt).toMatch(/dor/);
		expect(prompt).toMatch(/servico/);
		expect(prompt).toMatch(/ganho/);
		expect(prompt).toMatch(/mínimo 1 `PRINCIPAL` e no mínimo 1 `EXPANSAO`/);
	});

	it("PRINCIPAL é sempre software/automação; marketing é secundário", () => {
		const prompt = buildColdOutreachPrompt(leadBase);
		expect(prompt).toMatch(
			/PRINCIPAL` é \*\*SEMPRE software, automação ou integração\*\*/,
		);
		expect(prompt).toMatch(/no máximo 1/);
		expect(prompt).toMatch(/Exceção:\*\* arquétipo D/);
		expect(prompt).toMatch(/NÃO resolve o custo e o gargalo de operação/);
	});

	it("arquétipo C prioriza automação de rotina interna (contabilidade)", () => {
		const prompt = buildColdOutreachPrompt(leadBase);
		expect(prompt).toMatch(/Repertório do C por setor/);
		expect(prompt).toMatch(/Contabilidade/);
		expect(prompt).toMatch(/recibo\/NF-e de honorário/);
		expect(prompt).toMatch(/Pix recorrente de honorário/);
		expect(prompt).toMatch(
			/Marketing \(SEO, tráfego pago\) só entra como 3ª linha/,
		);
	});

	it("exige schema de saída com oportunidades", () => {
		const prompt = buildColdOutreachPrompt(leadBase);
		expect(prompt).toMatch(/"oportunidades"/);
		expect(prompt).toMatch(/prioridade/);
	});

	it("posicionamento invariante é a apresentação padrão", () => {
		const prompt = buildColdOutreachPrompt(leadBase);
		expect(prompt).toMatch(/Sou da King Dev, aqui da região/);
		expect(prompt).toMatch(/POSICIONAMENTO \(invariante\)/);
	});

	it("orienta gancho de tempo de casa quando ≥ 10 anos", () => {
		const prompt = buildColdOutreachPrompt(leadBase);
		expect(prompt).toMatch(/Tempo de casa \(≥ 10 anos\)/);
		expect(prompt).toMatch(/NUNCA invente número que não veio no input/);
	});

	it("persona inclui serviços de marketing digital e novos de TI", () => {
		const prompt = buildColdOutreachPrompt(leadBase);
		expect(prompt).toMatch(/Tráfego pago \(Meta Ads \/ Google Ads\)/);
		expect(prompt).toMatch(/Landing page \+ funil/);
		expect(prompt).toMatch(/Google Meu Negócio/);
		expect(prompt).toMatch(/Pix recorrente/);
		expect(prompt).toMatch(/NF-e\/NFS-e/);
		expect(prompt).toMatch(/TV de propaganda digital/);
		expect(prompt).toMatch(/IoT/);
		expect(prompt).toMatch(/gestão de conteúdo\/redes sociais/);
	});

	it("trata observações como dados E instruções diretas pra IA", () => {
		const prompt = buildColdOutreachPrompt(leadBase);
		expect(prompt).toMatch(/INSTRUÇÕES DO OPERADOR/);
		expect(prompt).toMatch(/DOIS papéis/);
		expect(prompt).toMatch(/INSTRUÇÕES DIRETAS pra você/);
		expect(prompt).toMatch(/"Não fale de tráfego pago nesse lead"/);
		expect(prompt).toMatch(/Instrução do Operador é \*\*OBRIGATÓRIA\*\*/);
		expect(prompt).toMatch(
			/Observações do Operador \(dados \+ instruções diretas/,
		);
		expect(prompt).toMatch(
			/Se as Observações do Operador trouxerem INSTRUÇÕES/,
		);
	});
});

describe("buildColdOutreachPrompt — pesquisa, variedade e canal EMAIL", () => {
	const leadComPesquisa: LeadInput = {
		...leadBase,
		pesquisa: {
			resumo:
				"Padaria artesanal que assa 12 pães próprios e faz delivery próprio na região.",
			site: "https://padariadojoao.com.br",
			emails: ["contato@padariadojoao.com.br"],
			telefones: ["(16) 99999-9999"],
			whatsapp: "5516999999999",
			decisores: [{ nome: "Joaquim Souza", cargo: "sócio" }],
			pesquisadoEm: new Date("2026-10-19"),
			fonte: "gemini-grounded",
		},
	};

	// ── A2: pesquisa entra no prompt ──
	it("inclui o bloco de instruções PESQUISA DA EMPRESA", () => {
		const prompt = buildColdOutreachPrompt(leadBase);
		expect(prompt).toMatch(/PESQUISA DA EMPRESA/);
		expect(prompt).toMatch(/1 fato específico da pesquisa/);
		expect(prompt).toMatch(/Decisor nomeado/);
		expect(prompt).toMatch(/NUNCA cite a fonte/);
		expect(prompt).toMatch(/Sinais da pesquisa viram oferta de software/);
	});

	it("injeta os dados da pesquisa persistida (nível topo da escada)", () => {
		const prompt = buildColdOutreachPrompt(leadComPesquisa);
		expect(prompt).toMatch(/PESQUISA NA WEB — resumo/);
		expect(prompt).toMatch(/padaria artesanal que assa 12 pães/i);
		expect(prompt).toMatch(/PESQUISA NA WEB — site encontrado/);
		expect(prompt).toMatch(/https:\/\/padariadojoao\.com\.br/);
		expect(prompt).toMatch(/PESQUISA NA WEB — decisores/);
		expect(prompt).toMatch(/Joaquim Souza — sócio/);
		expect(prompt).toMatch(/fonte: gemini-grounded/);
		// JSON-as-string nunca vaza como "null" no prompt
		expect(prompt).not.toMatch(/\bnull\b/);
	});

	it("sem pesquisa: instruções ficam, mas os dados não inventam o bloco", () => {
		const prompt = buildColdOutreachPrompt(leadBase);
		expect(prompt).toMatch(/PESQUISA DA EMPRESA/);
		expect(prompt).not.toMatch(/PESQUISA NA WEB — resumo/);
	});

	it("escada de personalização coloca a pesquisa no nível topo", () => {
		const prompt = buildColdOutreachPrompt(leadBase);
		expect(prompt).toMatch(
			/Pesquisa da empresa \(QUANDO EXISTIR — nível topo\)/,
		);
		expect(prompt).toMatch(/Observações do Operador \(OURO\)/);
	});

	// ── A3: variedade + curiosidade + anti-concorrente ──
	it("inclui bloco de variedade com 8 aberturas e curiosidade honesta", () => {
		const prompt = buildColdOutreachPrompt(leadBase);
		expect(prompt).toMatch(/VARIEDADE E CURIOSIDADE/);
		expect(prompt).toMatch(/ABERTURAS — escolha UMA por mensagem/);
		expect(prompt).toMatch(/CURIOSIDADE HONESTA/);
		expect(prompt).toMatch(/PROIBIDO clickbait mentiroso/);
		expect(prompt).toMatch(/lacuna aberta/);
	});

	it("proíbe citar CONCORRENTES como gancho (regra dura)", () => {
		const prompt = buildColdOutreachPrompt(leadBase);
		expect(prompt).toMatch(/PROIBIDO citar CONCORRENTES/);
		expect(prompt).toMatch(/REGRA DURA: NUNCA cite concorrente do lead/);
		expect(prompt).toMatch(/NENHUM CONCORRENTE do lead foi citado/);
	});

	it("oferece variações de posicionamento e CTA", () => {
		const prompt = buildColdOutreachPrompt(leadBase);
		expect(prompt).toMatch(/POSICIONAMENTO — 2-3 variações/);
		expect(prompt).toMatch(/CTA — 2-3 variações/);
		expect(prompt).toMatch(/Sou da King Dev, daqui/);
	});

	it("bane abertura-cópia repetida nos anti-padrões", () => {
		const prompt = buildColdOutreachPrompt(leadBase);
		expect(prompt).toMatch(/Usar a MESMA abertura-cópia em qualquer lead/);
	});

	// ── A4/A5: oportunidades dev + quality gate ampliado ──
	it("catálogo mapeia sinais concretos pra ofertas de software", () => {
		const prompt = buildColdOutreachPrompt(leadBase);
		expect(prompt).toMatch(/Site existe, mas ninguém pede por lá/);
		expect(prompt).toMatch(/cada venda vira retrabalho manual/);
		expect(prompt).toMatch(/Vários sócios\/decisores sem visão do negócio/);
	});

	it("mapa de oportunidades exige sinal concreto da pesquisa", () => {
		const prompt = buildColdOutreachPrompt(leadBase);
		expect(prompt).toMatch(
			/no mínimo 1 oportunidade deve vir de um sinal CONCRETO dela/,
		);
	});

	it("quality gate ampliado: pesquisa, oferta dev e variedade", () => {
		const prompt = buildColdOutreachPrompt(leadBase);
		expect(prompt).toMatch(
			/PESQUISA NA WEB, a mensagem cita pelo menos 1 fato específico dela/,
		);
		expect(prompt).toMatch(
			/NO MÍNIMO 1 das 3 linhas é software, automação, sistema ou integração contextual/,
		);
		expect(prompt).toMatch(/aberturas do bloco VARIEDADE E CURIOSIDADE/);
		expect(prompt).toMatch(/lacuna de curiosidade honesta/);
	});

	// ── B2: canal EMAIL ──
	it("canal EMAIL: estrutura de email com assunto e CTA duplo", () => {
		const prompt = buildColdOutreachPrompt(leadBase, "EMAIL");
		expect(prompt).toMatch(/ESTRUTURA DO EMAIL/);
		expect(prompt).toMatch(/campo "assunto"/);
		expect(prompt).toMatch(/até 60 caracteres/);
		expect(prompt).toMatch(/responde aqui ou chama no zap/);
		expect(prompt).toMatch(/Extras do canal EMAIL/);
		expect(prompt).toMatch(/"assunto":/);
		expect(prompt).toMatch(/REGRAS INEGOCIÁVEIS DE PT-BR/);
	});

	it("canal EMAIL: qualidade do assunto entra no quality gate", () => {
		const prompt = buildColdOutreachPrompt(leadBase, "EMAIL");
		expect(prompt).toMatch(/O campo "assunto" EXISTE, tem até 60 caracteres/);
		expect(prompt).toMatch(/TERMINA com a assinatura em parágrafo próprio/);
	});

	it("canal WHATSAPP (padrão): não pede estrutura de email", () => {
		const prompt = buildColdOutreachPrompt(leadBase);
		// o bloco de estrutura de email só entra no prompt quando canal=EMAIL
		// (a referência "(ver ESTRUTURA DO EMAIL)" do bloco de variedade é ok)
		expect(prompt).not.toMatch(/# ESTRUTURA DO EMAIL/);
		expect(prompt).not.toMatch(/"assunto":/);
		expect(prompt).not.toMatch(/Extras do canal EMAIL/);
		expect(prompt).toMatch(/até 6 blocos curtos, PT-BR WhatsApp/);
	});
});

describe("buildMelhoriaDeMensagemPrompt", () => {
	it("instrui a iterar em cima da mensagem atual, não gerar do zero", () => {
		const prompt = buildMelhoriaDeMensagemPrompt("Mensagem antiga do operador");
		expect(prompt).toMatch(/MODO MELHORIA/);
		expect(prompt).toMatch(/NÃO comece do zero/);
		expect(prompt).toMatch(/Mensagem antiga do operador/);
	});

	it("ordena as melhorias por prioridade operacional", () => {
		const prompt = buildMelhoriaDeMensagemPrompt("x");
		expect(prompt).toMatch(/Especificidade operacional/);
		expect(prompt).toMatch(/Personalização/);
		expect(prompt).toMatch(/Força do benefício/);
		expect(prompt).toMatch(/Clareza da pergunta do CTA/);
	});

	it("proíbe inventar vídeo/exemplo e exige JSON no contrato", () => {
		const prompt = buildMelhoriaDeMensagemPrompt("x");
		expect(prompt).toMatch(/NUNCA adicione vídeo, exemplo, print, demo/);
		expect(prompt).toMatch(/Refaça também/);
		expect(prompt).toMatch(/APENAS com o JSON válido/);
	});

	it("orienta variedade de abertura e anti-concorrente na melhoria", () => {
		const prompt = buildMelhoriaDeMensagemPrompt("x");
		expect(prompt).toMatch(/VARIEDADE E CURIOSIDADE/);
		expect(prompt).toMatch(/cita CONCORRENTE/);
		expect(prompt).toMatch(/fato da PESQUISA NA WEB/);
	});

	it("canal EMAIL: manda manter assunto e parágrafos corridos", () => {
		const prompt = buildMelhoriaDeMensagemPrompt("x", "EMAIL");
		expect(prompt).toMatch(/Extras do modo melhoria no canal EMAIL/);
		expect(prompt).toMatch(/campo "assunto"/);
		expect(prompt).toMatch(/PARÁGRAFOS CORRIDOS/);
		expect(prompt).toMatch(/responde aqui ou chama no zap/);
	});

	it("canal WHATSAPP (padrão): não mostra os extras de email", () => {
		const prompt = buildMelhoriaDeMensagemPrompt("x");
		expect(prompt).not.toMatch(/Extras do modo melhoria no canal EMAIL/);
	});
});
