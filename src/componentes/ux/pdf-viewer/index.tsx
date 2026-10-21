import { useEffect, useRef, useState } from "react";

/**
 * Renderiza um PDF como páginas empilhadas em <canvas>, ocupando 100% da
 * largura do container — sem a moldura/toolbar do viewer nativo. O PDF
 * "faz parte" da página.
 */
export default function PdfViewer({ url }: { url: string }) {
	const containerRef = useRef<HTMLDivElement>(null);
	const [erro, setErro] = useState("");
	const [carregando, setCarregando] = useState(true);
	const [numPaginas, setNumPaginas] = useState(0);

	useEffect(() => {
		let cancelado = false;
		const container = containerRef.current;
		if (!container) return;

		async function render() {
			setCarregando(true);
			setErro("");
			try {
				const pdfjs = await import("pdfjs-dist");
				// Worker: usa o worker do próprio pacote via URL (Vite resolve).
				const workerUrl = new URL(
					"pdfjs-dist/build/pdf.worker.min.mjs",
					import.meta.url,
				).toString();
				pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

				const loadingTask = pdfjs.getDocument({ url });
				const pdf = await loadingTask.promise;
				if (cancelado) return;
				setNumPaginas(pdf.numPages);

				// Limpa render anterior.
				if (container) container.innerHTML = "";

				const larguraAlvo = container?.clientWidth || 800;

				for (let n = 1; n <= pdf.numPages; n++) {
					if (cancelado) return;
					const page = await pdf.getPage(n);
					const viewportBase = page.getViewport({ scale: 1 });
					const escala = larguraAlvo / viewportBase.width;
					const viewport = page.getViewport({ scale: escala });

					const canvas = document.createElement("canvas");
					const ctx = canvas.getContext("2d");
					if (!ctx) continue;
					// Suporte a telas retina.
					const dpr = Math.min(window.devicePixelRatio || 1, 2);
					canvas.width = Math.floor(viewport.width * dpr);
					canvas.height = Math.floor(viewport.height * dpr);
					canvas.style.width = "100%";
					canvas.style.height = "auto";
					canvas.style.display = "block";
					ctx.scale(dpr, dpr);

					container?.appendChild(canvas);
					await page.render({ canvas, canvasContext: ctx, viewport }).promise;
				}
				if (!cancelado) setCarregando(false);
			} catch (e) {
				if (!cancelado) {
					setErro(
						e instanceof Error ? e.message : "Não foi possível carregar o PDF.",
					);
					setCarregando(false);
				}
			}
		}

		render();
		return () => {
			cancelado = true;
		};
	}, [url]);

	return (
		<div className="w-full">
			{carregando && (
				<p className="text-xs text-slate-500 py-4 text-center">
					Carregando apresentação…
				</p>
			)}
			{erro && (
				<div className="text-xs text-rose-500 py-4 text-center">
					{erro}{" "}
					<a href={url} target="_blank" rel="noreferrer" className="underline">
						Abrir PDF
					</a>
				</div>
			)}
			<div ref={containerRef} className="w-full space-y-4" aria-hidden={carregando} />
			{!carregando && !erro && numPaginas > 0 && (
				<p className="text-[10px] text-slate-400 text-center pt-2">
					{numPaginas} página{numPaginas === 1 ? "" : "s"}
				</p>
			)}
		</div>
	);
}
