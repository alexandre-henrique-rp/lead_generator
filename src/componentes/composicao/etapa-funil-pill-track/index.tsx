import type { ReactNode } from "react";
import { getPillState } from "./utils";

export interface EtapaFunilOption<T extends string> {
	value: T;
	label: string;
}

export interface EtapaFunilPillTrackProps<T extends string> {
	etapas: readonly EtapaFunilOption<T>[];
	atual: T;
	onChange: (value: T) => void;
	lostValue?: T;
	disabled?: boolean;
	rightSlot?: ReactNode;
}

function CheckIcon() {
	return (
		<svg
			className="w-3 h-3"
			viewBox="0 0 20 20"
			fill="none"
			stroke="currentColor"
			strokeWidth="2.5"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<path d="M4 10l4 4 8-8" />
		</svg>
	);
}

export default function EtapaFunilPillTrack<T extends string>({
	etapas,
	atual,
	onChange,
	lostValue,
	disabled = false,
	rightSlot,
}: EtapaFunilPillTrackProps<T>) {
	return (
		<div className="flex items-center gap-2 flex-wrap">
			<fieldset className="flex items-center gap-1.5 flex-wrap border-0 p-0 m-0">
				<legend className="sr-only">Estágio do funil</legend>
				{etapas.map((etapa, idx) => {
					const state = getPillState(etapas, atual, etapa.value, lostValue);
					const isLast = idx === etapas.length - 1;
					const isConnector = !isLast;

					const stateClasses: Record<typeof state, string> = {
						concluida:
							"bg-emerald-950/70 text-emerald-300 border-emerald-800 hover:bg-emerald-900/70",
						atual:
							"bg-indigo-500 text-slate-950 border-indigo-400 shadow-sm font-semibold",
						perdida:
							"bg-rose-500 text-white border-rose-400 shadow-sm font-semibold",
						futura:
							"bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200",
					};

					return (
						<div key={etapa.value} className="flex items-center gap-1.5">
							<button
								type="button"
								onClick={() => onChange(etapa.value)}
								disabled={disabled}
								aria-pressed={state === "atual" || state === "perdida"}
								aria-current={
									state === "atual" || state === "perdida" ? "step" : undefined
								}
								className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/50 disabled:opacity-50 disabled:cursor-not-allowed ${stateClasses[state]}`}
							>
								{state === "concluida" && <CheckIcon />}
								<span>{etapa.label}</span>
							</button>
							{isConnector && (
								<span
									aria-hidden="true"
									className={`w-2 h-px ${
										state === "concluida" ? "bg-emerald-800" : "bg-slate-800"
									}`}
								/>
							)}
						</div>
					);
				})}
			</fieldset>
			{rightSlot && <div className="ml-auto">{rightSlot}</div>}
		</div>
	);
}
