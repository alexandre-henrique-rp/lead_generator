import { useEffect, useRef } from "react";
import Button from "#/componentes/ux/button";

export interface PerdidoConfirmModalProps {
	open: boolean;
	leadNome?: string;
	isLoading?: boolean;
	onClose: () => void;
	onConfirm: () => void;
}

function AlertIcon() {
	return (
		<svg
			className="w-6 h-6"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
			<line x1="12" y1="9" x2="12" y2="13" />
			<line x1="12" y1="17" x2="12.01" y2="17" />
		</svg>
	);
}

export default function PerdidoConfirmModal({
	open,
	leadNome,
	isLoading = false,
	onClose,
	onConfirm,
}: PerdidoConfirmModalProps) {
	const dialogRef = useRef<HTMLDialogElement>(null);

	useEffect(() => {
		const dialog = dialogRef.current;
		if (!dialog) return;
		if (open && !dialog.open) {
			dialog.showModal();
		} else if (!open && dialog.open) {
			dialog.close();
		}
	}, [open]);

	useEffect(() => {
		const dialog = dialogRef.current;
		if (!dialog) return;
		const handleCancel = (e: Event) => {
			e.preventDefault();
			onClose();
		};
		dialog.addEventListener("cancel", handleCancel);
		return () => dialog.removeEventListener("cancel", handleCancel);
	}, [onClose]);

	return (
		<dialog
			ref={dialogRef}
			className="bg-transparent p-0 m-0 max-w-md w-full backdrop:bg-black/70"
		>
			<div
				role="alertdialog"
				aria-modal="true"
				aria-labelledby="perdido-title"
				aria-describedby="perdido-desc"
				className="rounded-xl border border-rose-800/60 bg-slate-900 text-slate-200 shadow-xl p-6 m-4"
			>
				<div className="flex items-start gap-3">
					<div className="flex-shrink-0 w-10 h-10 rounded-full bg-rose-950/70 text-rose-400 flex items-center justify-center border border-rose-800/60">
						<AlertIcon />
					</div>
					<div className="flex-1 min-w-0">
						<h2
							id="perdido-title"
							className="text-sm font-bold text-slate-100 uppercase tracking-wider"
						>
							Marcar lead como Perdido
						</h2>
						<p
							id="perdido-desc"
							className="text-xs text-slate-400 mt-2 leading-relaxed"
						>
							Esta ação move o lead
							{leadNome ? (
								<>
									{" "}
									<span className="font-semibold text-slate-200">
										"{leadNome}"
									</span>{" "}
								</>
							) : (
								" "
							)}
							para o estágio{" "}
							<span className="font-semibold text-rose-300">Perdido</span>. Você
							poderá reabrir o lead depois se mudar de ideia.
						</p>
					</div>
				</div>
				<div className="mt-5 flex items-center justify-end gap-2">
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={onClose}
						disabled={isLoading}
						autoFocus
					>
						Cancelar
					</Button>
					<Button
						type="button"
						variant="danger"
						size="sm"
						onClick={onConfirm}
						isLoading={isLoading}
					>
						Marcar como Perdido
					</Button>
				</div>
			</div>
		</dialog>
	);
}
