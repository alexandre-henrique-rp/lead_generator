import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Button from "#/componentes/ux/button";
import Card from "#/componentes/ux/card";
import {
	getStorageConfigServerFn,
	updateStorageConfigServerFn,
} from "#/api/storage";

const STORAGE_KEY = ["config", "storage"] as const;

export default function StorageConfigPanel() {
	const queryClient = useQueryClient();
	const q = useQuery({
		queryKey: STORAGE_KEY,
		queryFn: () => getStorageConfigServerFn(),
	});

	const [habilitado, setHabilitado] = useState(false);
	const [endpoint, setEndpoint] = useState("");
	const [region, setRegion] = useState("us-east-1");
	const [accessKey, setAccessKey] = useState("");
	const [secretKey, setSecretKey] = useState("");
	const [bucketPorProjeto, setBucketPorProjeto] = useState(true);
	const [bucketPrincipal, setBucketPrincipal] = useState("");
	const [forcePathStyle, setForcePathStyle] = useState(true);
	const [publicBaseUrl, setPublicBaseUrl] = useState("");
	const [politica, setPolitica] = useState("public-read");
	const [secretDefinida, setSecretDefinida] = useState(false);
	const [ok, setOk] = useState("");

	const cfg = q.data?.config;
	useEffect(() => {
		if (cfg) {
			setHabilitado(cfg.habilitado);
			setEndpoint(cfg.endpoint);
			setRegion(cfg.region);
			setAccessKey(cfg.accessKey);
			setBucketPorProjeto(cfg.bucketPorProjeto);
			setBucketPrincipal(cfg.bucketPrincipal);
			setForcePathStyle(cfg.forcePathStyle);
			setPublicBaseUrl(cfg.publicBaseUrl);
			setPolitica(cfg.politica);
			setSecretDefinida(cfg.secretKeyDefinida);
		}
	}, [cfg]);

	const salvar = useMutation({
		mutationFn: () =>
			updateStorageConfigServerFn({
				data: {
					habilitado,
					endpoint,
					region,
					accessKey,
					// só envia secret se o usuário digitou algo novo
					secretKey: secretKey.trim() || undefined,
					bucketPorProjeto,
					bucketPrincipal,
					forcePathStyle,
					publicBaseUrl,
					politica,
				},
			}),
		onSuccess: () => {
			setSecretKey("");
			setOk("Configuração de storage salva.");
			setTimeout(() => setOk(""), 3000);
			queryClient.invalidateQueries({ queryKey: STORAGE_KEY });
		},
	});

	if (q.isPending) {
		return <p className="text-xs text-slate-400">Carregando…</p>;
	}

	return (
		<Card
			header={
				<h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
					Armazenamento de Arquivos (S3 / RustFS)
				</h3>
			}
		>
			<div className="space-y-4">
				{ok && (
					<div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
						{ok}
					</div>
				)}
				<div className="rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2.5 text-[11px] text-slate-400">
					Se o armazenamento estiver <strong>desabilitado</strong> ou sem
					credenciais, os anexos são salvos localmente no servidor (fallback).
				</div>

				<label className="flex items-center gap-2 text-xs text-slate-200">
					<input
						type="checkbox"
						checked={habilitado}
						onChange={(e) => setHabilitado(e.target.checked)}
						className="accent-emerald-500"
					/>
					Habilitar armazenamento S3-compatível
				</label>

				<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
					<Campo label="Endpoint" value={endpoint} onChange={setEndpoint} placeholder="https://storage.kingdevtec.com" />
					<Campo label="Região" value={region} onChange={setRegion} placeholder="us-east-1" />
					<Campo label="Access Key" value={accessKey} onChange={setAccessKey} />
					<div>
						<label className="mb-1 block text-xs font-semibold text-slate-300">
							Secret Key{" "}
							{secretDefinida && (
								<span className="font-normal text-emerald-400">(definida)</span>
							)}
						</label>
						<input
							type="password"
							value={secretKey}
							onChange={(e) => setSecretKey(e.target.value)}
							placeholder={secretDefinida ? "•••••• (deixe vazio p/ manter)" : ""}
							className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
						/>
					</div>
					<Campo label="Public Base URL" value={publicBaseUrl} onChange={setPublicBaseUrl} placeholder="https://storage.kingdevtec.com" />
					<Campo label="Política de objetos" value={politica} onChange={setPolitica} placeholder="public-read" />
				</div>

				<label className="flex items-center gap-2 text-xs text-slate-200">
					<input
						type="checkbox"
						checked={bucketPorProjeto}
						onChange={(e) => setBucketPorProjeto(e.target.checked)}
						className="accent-indigo-500"
					/>
					Um bucket por projeto (subpastas por categoria)
				</label>

				{!bucketPorProjeto && (
					<Campo
						label="Bucket principal"
						value={bucketPrincipal}
						onChange={setBucketPrincipal}
						placeholder="king-ops"
					/>
				)}

				<label className="flex items-center gap-2 text-xs text-slate-200">
					<input
						type="checkbox"
						checked={forcePathStyle}
						onChange={(e) => setForcePathStyle(e.target.checked)}
						className="accent-indigo-500"
					/>
					Force path-style (recomendado para S3-compatível)
				</label>

				<div className="flex justify-end">
					<Button
						variant="primary"
						size="sm"
						isLoading={salvar.isPending}
						onClick={() => salvar.mutate()}
					>
						Salvar configuração
					</Button>
				</div>
			</div>
		</Card>
	);
}

function Campo(props: {
	label: string;
	value: string;
	onChange: (v: string) => void;
	placeholder?: string;
}) {
	return (
		<div>
			<label className="mb-1 block text-xs font-semibold text-slate-300">
				{props.label}
			</label>
			<input
				type="text"
				value={props.value}
				onChange={(e) => props.onChange(e.target.value)}
				placeholder={props.placeholder}
				className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none"
			/>
		</div>
	);
}
