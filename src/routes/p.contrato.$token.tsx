import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import Button from "#/componentes/ux/button";
import { formatCurrencyBRL, formatDateBR } from "#/lib/format";
import { maskCpfCnpj } from "#/lib/masks";
import {
	assinarContratoServerFn,
	getContratoPublicoServerFn,
} from "#/api/funil";

export const Route = createFileRoute("/p/contrato/$token")({
	component: PublicContratoPage,
});

function PublicContratoPage() {
	const { token } = Route.useParams();

	const contratoQuery = useQuery({
		queryKey: ["contrato-publico", token],
		queryFn: () => getContratoPublicoServerFn({ data: { token } }),
	});

	const [nome, setNome] = useState("");
	const [doc, setDoc] = useState("");
	const [aceiteTermos, setAceiteTermos] = useState(false);
	const [formError, setFormError] = useState("");

	const assinarMutation = useMutation({
		mutationFn: () =>
			assinarContratoServerFn({ data: { token, nome: nome.trim(), doc } }),
		onSuccess: () => {
			setFormError("");
			contratoQuery.refetch();
		},
		onError: (e: unknown) =>
			setFormError(e instanceof Error ? e.message : "Erro ao assinar."),
	});

	if (contratoQuery.isPending) {
		return (
			<Centralizado>
				<p className="text-sm text-slate-500">Carregando contrato…</p>
			</Centralizado>
		);
	}

	const contrato = contratoQuery.data?.contrato ?? null;
	if (!contrato) {
		return (
			<Centralizado>
				<div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto text-xl font-bold">
					!
				</div>
				<h2 className="text-xl font-bold text-slate-900">
					Contrato não encontrado
				</h2>
				<p className="text-xs text-slate-500">
					O link pode estar incorreto ou o contrato foi removido.
				</p>
			</Centralizado>
		);
	}

	const assinado = contrato.status === "ASSINADO";

	function handleAssinar(e: React.FormEvent) {
		e.preventDefault();
		if (!nome.trim()) {
			setFormError("Informe o nome completo do responsável.");
			return;
		}
		const digits = doc.replace(/\D/g, "");
		if (digits.length !== 11 && digits.length !== 14) {
			setFormError("Informe um CPF ou CNPJ válido.");
			return;
		}
		if (!aceiteTermos) {
			setFormError("É necessário concordar com os termos do contrato.");
			return;
		}
		setFormError("");
		assinarMutation.mutate();
	}

	return (
		<div className="min-h-screen bg-slate-50 font-sans text-slate-900 py-10 px-4 sm:px-6">
			<div className="max-w-2xl mx-auto space-y-6">
				<div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white font-bold text-base shadow-sm">
							K
						</div>
						<div>
							<h1 className="text-base font-bold text-slate-900">King Dev Tec</h1>
							<p className="text-xs text-slate-500">
								Contrato de Prestação de Serviços
							</p>
						</div>
					</div>
					<span className="text-xs font-mono px-2.5 py-1 bg-slate-100 text-slate-700 border border-slate-200 rounded-full font-semibold">
						Ref. #{contrato.uuid.slice(0, 8)}
					</span>
				</div>

				<div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-6">
					<div>
						<span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
							Projeto contratado
						</span>
						<h2 className="text-2xl font-extrabold text-slate-900 mt-1">
							{contrato.projetoNome}
						</h2>
						<p className="text-sm text-slate-600 mt-2 leading-relaxed whitespace-pre-wrap">
							{contrato.resumo}
						</p>
					</div>

					<div className="p-5 rounded-xl bg-slate-50 border border-slate-200 font-mono">
						<span className="text-[11px] text-slate-500 uppercase block">
							Valor contratado
						</span>
						<span className="text-2xl font-extrabold text-slate-900">
							{formatCurrencyBRL(contrato.precoFinalCentavos)}
						</span>
					</div>

					<div className="text-xs text-slate-600 leading-relaxed space-y-2 border-t border-slate-100 pt-4">
						<p>
							Pelo presente instrumento, a CONTRATADA (King Dev Tec) obriga-se a
							desenvolver o projeto <strong>{contrato.projetoNome}</strong>,
							conforme o escopo acima, e o CONTRATANTE obriga-se ao pagamento do
							valor contratado.
						</p>
						<p>
							A assinatura eletrônica abaixo, com registro de nome, documento,
							data e hash de integridade, tem validade como manifestação de
							vontade das partes.
						</p>
					</div>

					{assinado ? (
						<div className="p-5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-center space-y-2">
							<p className="text-sm font-bold">✓ Contrato Assinado!</p>
							<p className="text-xs text-emerald-700">
								Assinado por <strong>{contrato.assinaturaNome}</strong> (
								{maskCpfCnpj(contrato.assinaturaDoc ?? "")}) em{" "}
								{formatDateBR(contrato.assinaturaEm, true)}. O projeto foi
								liberado para execução.
							</p>
						</div>
					) : (
						<form onSubmit={handleAssinar} className="pt-2 space-y-4">
							<div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
								<span className="text-xs font-bold text-slate-800 block">
									Assinatura eletrônica
								</span>
								{formError && (
									<p className="text-xs text-rose-600 font-medium">
										✕ {formError}
									</p>
								)}
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
									<div>
										<label
											htmlFor="c-nome"
											className="block text-[11px] text-slate-600 uppercase font-semibold mb-1"
										>
											Nome completo
										</label>
										<input
											id="c-nome"
											type="text"
											required
											placeholder="Ex: João da Silva"
											value={nome}
											onChange={(e) => setNome(e.target.value)}
											className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white text-slate-900 focus:border-indigo-500 focus:outline-none"
										/>
									</div>
									<div>
										<label
											htmlFor="c-doc"
											className="block text-[11px] text-slate-600 uppercase font-semibold mb-1"
										>
											CPF ou CNPJ
										</label>
										<input
											id="c-doc"
											type="text"
											required
											placeholder="000.000.000-00"
											value={maskCpfCnpj(doc)}
											onChange={(e) => setDoc(e.target.value.replace(/\D/g, ""))}
											className="w-full text-xs font-mono border border-slate-300 rounded-lg p-2.5 bg-white text-slate-900 focus:border-indigo-500 focus:outline-none"
										/>
									</div>
								</div>
								<label className="flex items-start gap-2 text-[11px] text-slate-600">
									<input
										type="checkbox"
										checked={aceiteTermos}
										onChange={(e) => setAceiteTermos(e.target.checked)}
										className="mt-0.5 accent-indigo-600"
									/>
									<span>
										Li e concordo com os termos do contrato e autorizo a
										assinatura eletrônica.
									</span>
								</label>
							</div>

							<div className="flex justify-end">
								<Button
									type="submit"
									variant="primary"
									size="md"
									isLoading={assinarMutation.isPending}
									className="w-full sm:w-auto"
								>
									Assinar Contrato →
								</Button>
							</div>
						</form>
					)}
				</div>

				<p className="text-center text-xs text-slate-400 font-mono">
					King Dev Tec · Ribeirão Preto/SP · Contato: (16) 99602-9107
				</p>
			</div>
		</div>
	);
}

function Centralizado({ children }: { children: React.ReactNode }) {
	return (
		<div className="min-h-screen bg-slate-50 font-sans text-slate-900 py-16 px-4 text-center">
			<div className="max-w-md mx-auto bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4">
				{children}
			</div>
		</div>
	);
}
