import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { type AuditLogDTO, getAuditLogServerFn } from "#/api/integracao";
import AppShell from "#/componentes/layout/app_shell";
import IntegracoesConfigPanel from "#/componentes/orquestracao/integracoes-config-panel";
import StorageConfigPanel from "#/componentes/orquestracao/storage-config-panel";
import Button from "#/componentes/ux/button";
import Card from "#/componentes/ux/card";
import { requireUserOrRedirect } from "#/lib/auth-helper";
import { maskCpfCnpj } from "#/lib/masks";

export const Route = createFileRoute("/configuracoes")({
	beforeLoad: ({ location }) =>
		requireUserOrRedirect("/login", location.pathname),
	component: ConfiguracoesPage,
});

function ConfiguracoesPage() {
	const [activeTab, setActiveTab] = useState<
		"EMPRESA" | "PKI" | "LOGS" | "STORAGE" | "INTEGRACOES"
	>("EMPRESA");

	const [razaoSocial, setRazaoSocial] = useState("KING DEV · TEC");
	const [cnpj, setCnpj] = useState("30.367.375/0001-55");
	const [responsavelLegal, setResponsavelLegal] =
		useState("Alexandre Henrique");
	const [cidade, setCidade] = useState("Ribeirão Preto, SP — Brasil");
	const [isSaving, setIsSaving] = useState(false);
	const [saveSuccess, setSaveSuccess] = useState(false);
	const [isRotateModalOpen, setIsRotateModalOpen] = useState(false);
	const [rotateConfirmText, setRotateConfirmText] = useState("");
	const [rotateSuccess, setRotateSuccess] = useState(false);

	const handleSave = (e: React.FormEvent) => {
		e.preventDefault();
		setIsSaving(true);
		setTimeout(() => {
			setIsSaving(false);
			setSaveSuccess(true);
			setTimeout(() => setSaveSuccess(false), 3000);
		}, 400);
	};

	const handleConfirmRotate = () => {
		if (rotateConfirmText !== "ROTACIONAR") return;
		setIsRotateModalOpen(false);
		setRotateConfirmText("");
		setRotateSuccess(true);
		setTimeout(() => setRotateSuccess(false), 4000);
	};

	// AuditLog real (append-only). Cursor-based: cada "Carregar mais" busca a
	// próxima página e acumula. `lastProcessed` evita append duplicado.
	const [auditLogs, setAuditLogs] = useState<AuditLogDTO[]>([]);
	const [auditCursor, setAuditCursor] = useState<number | null>(null);
	const [auditNext, setAuditNext] = useState<number | null>(null);
	const lastProcessed = useRef<string | number | null>(null);

	const auditQuery = useQuery({
		queryKey: ["audit-log", auditCursor ?? "first"],
		queryFn: () =>
			getAuditLogServerFn({
				data: auditCursor ? { cursor: auditCursor } : undefined,
			}),
	});

	useEffect(() => {
		if (!auditQuery.data) return;
		const key = auditCursor ?? "first";
		if (lastProcessed.current === key) return;
		lastProcessed.current = key;
		setAuditLogs((prev) =>
			auditCursor ? [...prev, ...auditQuery.data.logs] : auditQuery.data.logs,
		);
		setAuditNext(auditQuery.data.nextCursor);
	}, [auditQuery.data, auditCursor]);

	const logs = auditLogs;

	return (
		<AppShell title="Configurações do Sistema" badge="King Ops Admin">
			<div className="max-w-4xl mx-auto space-y-6">
				{saveSuccess && (
					<div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs font-semibold">
						✓ Configurações da empresa atualizadas com sucesso!
					</div>
				)}

				{rotateSuccess && (
					<div className="p-4 rounded-xl bg-amber-950/60 border border-amber-800 text-amber-300 text-xs font-semibold">
						⚠️ Par de chaves RSA rotacionado com sucesso. Novo certificado ativo!
					</div>
				)}

				{/* Abas */}
				<div className="flex border-b border-slate-800 gap-6 text-xs font-semibold">
					<button
						type="button"
						onClick={() => setActiveTab("EMPRESA")}
						className={`pb-3 border-b-2 transition-colors cursor-pointer ${
							activeTab === "EMPRESA"
								? "border-indigo-500 text-indigo-400 font-bold"
								: "border-transparent text-slate-400 hover:text-slate-200"
						}`}
					>
						🏢 Dados da Empresa
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("PKI")}
						className={`pb-3 border-b-2 transition-colors cursor-pointer ${
							activeTab === "PKI"
								? "border-indigo-500 text-indigo-400 font-bold"
								: "border-transparent text-slate-400 hover:text-slate-200"
						}`}
					>
						🔐 PKI & Assinatura Digital
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("LOGS")}
						className={`pb-3 border-b-2 transition-colors cursor-pointer ${
							activeTab === "LOGS"
								? "border-indigo-500 text-indigo-400 font-bold"
								: "border-transparent text-slate-400 hover:text-slate-200"
						}`}
					>
						📋 Logs de Auditoria
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("STORAGE")}
						className={`pb-3 border-b-2 transition-colors cursor-pointer ${
							activeTab === "STORAGE"
								? "border-indigo-500 text-indigo-400 font-bold"
								: "border-transparent text-slate-400 hover:text-slate-200"
						}`}
					>
						📦 Armazenamento
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("INTEGRACOES")}
						className={`pb-3 border-b-2 transition-colors cursor-pointer ${
							activeTab === "INTEGRACOES"
								? "border-indigo-500 text-indigo-400 font-bold"
								: "border-transparent text-slate-400 hover:text-slate-200"
						}`}
					>
						🔌 Integrações
					</button>
				</div>

				{activeTab === "EMPRESA" && (
					<form onSubmit={handleSave}>
						<Card
							header={
								<h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
									Identificação Institucional para Contratos
								</h3>
							}
							footer={
								<div className="flex justify-end w-full">
									<Button
										type="submit"
										variant="primary"
										size="sm"
										isLoading={isSaving}
									>
										Salvar Dados da Empresa
									</Button>
								</div>
							}
						>
							<div className="space-y-4">
								<div>
									<label
										htmlFor="config-razao-social"
										className="block text-[11px] font-semibold text-slate-300 uppercase mb-1"
									>
										Razão Social
									</label>
									<input
										id="config-razao-social"
										type="text"
										value={razaoSocial}
										onChange={(e) => setRazaoSocial(e.target.value)}
										className="w-full text-xs border border-slate-700 bg-slate-950 rounded-lg px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
									/>
								</div>

								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div>
										<label
											htmlFor="config-cnpj"
											className="block text-[11px] font-semibold text-slate-300 uppercase mb-1"
										>
											CNPJ
										</label>
										<input
											id="config-cnpj"
											type="text"
											value={cnpj}
											onChange={(e) => setCnpj(maskCpfCnpj(e.target.value))}
											className="w-full text-xs font-mono border border-slate-700 bg-slate-950 rounded-lg px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
										/>
									</div>

									<div>
										<label
											htmlFor="config-resp-legal"
											className="block text-[11px] font-semibold text-slate-300 uppercase mb-1"
										>
											Responsável Legal
										</label>
										<input
											id="config-resp-legal"
											type="text"
											value={responsavelLegal}
											onChange={(e) => setResponsavelLegal(e.target.value)}
											className="w-full text-xs border border-slate-700 bg-slate-950 rounded-lg px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
										/>
									</div>
								</div>

								<div>
									<label
										htmlFor="config-cidade"
										className="block text-[11px] font-semibold text-slate-300 uppercase mb-1"
									>
										Endereço Sede / Comarca
									</label>
									<input
										id="config-cidade"
										type="text"
										value={cidade}
										onChange={(e) => setCidade(e.target.value)}
										className="w-full text-xs border border-slate-700 bg-slate-950 rounded-lg px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
									/>
								</div>
							</div>
						</Card>
					</form>
				)}

				{activeTab === "PKI" && (
					<Card
						header={
							<h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
								Certificado Digital In-House (X.509 / RSA)
							</h3>
						}
					>
						<div className="space-y-4 text-xs font-mono">
							<div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1.5 text-slate-300">
								<p>
									<strong className="text-slate-100">Algoritmo:</strong> RSA
									2048 bits com SHA-256
								</p>
								<p>
									<strong className="text-slate-100">Emissor:</strong> King Dev
									Tec Certificate Authority
								</p>
								<p>
									<strong className="text-slate-100">Validade:</strong> até
									26/10/2031 (4 anos e 11 meses restantes)
								</p>
								<p className="text-slate-500 text-[11px]">
									Hash SHA-256: 7f8a91b...c40d
								</p>
							</div>

							<div className="flex items-center gap-3 pt-2">
								<Button
									variant="outline"
									size="sm"
									onClick={() => setIsRotateModalOpen(true)}
								>
									Rotacionar Par de Chaves
								</Button>
								<Button variant="ghost" size="sm">
									Baixar Certificado (.pem)
								</Button>
							</div>
						</div>
					</Card>
				)}

				{activeTab === "LOGS" && (
					<Card padding="none">
						<div className="overflow-x-auto">
							<table className="w-full text-left border-collapse text-xs">
								<thead>
									<tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 font-semibold uppercase">
										<th className="py-3 px-4">Ação</th>
										<th className="py-3 px-4">Entidade</th>
										<th className="py-3 px-4">Autor</th>
										<th className="py-3 px-4">Data/Hora</th>
										<th className="py-3 px-4 text-right">IP</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-slate-800/60 font-mono">
									{logs.length === 0 && !auditQuery.isPending ? (
										<tr>
											<td
												colSpan={5}
												className="py-8 px-4 text-center text-slate-500"
											>
												Nenhuma alteração registrada ainda.
											</td>
										</tr>
									) : (
										logs.map((log) => (
											<tr
												key={log.id}
												className="hover:bg-slate-800/40 text-slate-200 transition-colors"
											>
												<td className="py-3 px-4 font-sans font-medium text-slate-100">
													{log.acao}
												</td>
												<td className="py-3 px-4 text-slate-400 text-[11px]">
													{log.entidade}
													{log.entidadeId ? ` · ${log.entidadeId}` : ""}
												</td>
												<td className="py-3 px-4 text-slate-300 text-[11px]">
													{log.autorNome ?? "—"}
												</td>
												<td className="py-3 px-4 text-slate-400 text-[11px]">
													{new Date(log.createdAt).toLocaleString("pt-BR")}
												</td>
												<td className="py-3 px-4 text-right text-slate-500 text-[11px]">
													{log.ip ?? "—"}
												</td>
											</tr>
										))
									)}
								</tbody>
							</table>
						</div>
						{auditNext && (
							<div className="flex justify-center px-4 py-3 border-t border-slate-800/60">
								<Button
									variant="ghost"
									size="sm"
									isLoading={auditQuery.isFetching}
									onClick={() => setAuditCursor(auditNext)}
								>
									Carregar mais
								</Button>
							</div>
						)}
					</Card>
				)}

				{activeTab === "STORAGE" && <StorageConfigPanel />}

				{activeTab === "INTEGRACOES" && <IntegracoesConfigPanel />}

				{/* Modal de Confirmação Rotação de Chaves PKI (P0-003) */}
				{isRotateModalOpen && (
					<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
						<div className="bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-800">
							<h3 className="text-lg font-bold text-slate-100 mb-1">
								Rotacionar Chaves PKI
							</h3>
							<p className="text-xs text-rose-400 mb-4 leading-relaxed">
								Atenção: A rotação gerará um novo par de chaves RSA e invalidará
								o certificado atual. Para confirmar a operação, digite{" "}
								<strong>ROTACIONAR</strong> abaixo.
							</p>

							<div className="space-y-4">
								<div>
									<label
										htmlFor="confirm-rotate-input"
										className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1"
									>
										Confirmação de Segurança
									</label>
									<input
										id="confirm-rotate-input"
										type="text"
										value={rotateConfirmText}
										onChange={(e) => setRotateConfirmText(e.target.value)}
										placeholder="ROTACIONAR"
										className="w-full text-xs font-mono border border-slate-700 bg-slate-950 rounded-lg p-2.5 text-slate-200 focus:border-rose-500 focus:outline-none"
									/>
								</div>

								<div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
									<Button
										type="button"
										variant="ghost"
										size="sm"
										onClick={() => {
											setIsRotateModalOpen(false);
											setRotateConfirmText("");
										}}
									>
										Cancelar
									</Button>
									<Button
										type="button"
										variant="primary"
										size="sm"
										disabled={rotateConfirmText !== "ROTACIONAR"}
										onClick={handleConfirmRotate}
										className="bg-rose-600 hover:bg-rose-500 text-white"
									>
										Confirmar Rotação
									</Button>
								</div>
							</div>
						</div>
					</div>
				)}
			</div>
		</AppShell>
	);
}
