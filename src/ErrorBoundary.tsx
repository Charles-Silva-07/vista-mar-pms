import { Component, type ErrorInfo, type ReactNode } from "react";

export class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  override state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    // Fica no console pra facilitar diagnóstico (ex.: conflito com extensão do navegador).
    console.error("Erro não tratado na aplicação:", error, info.componentStack);
  }

  override render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Algo deu errado
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            A página encontrou um erro inesperado. Isso às vezes acontece por conflito com alguma
            extensão do navegador (tradutor, tema, gerenciador de senha). Tente recarregar; se
            persistir, teste numa janela anônima.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <button
              onClick={() => location.reload()}
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Recarregar página
            </button>
          </div>
        </div>
      </div>
    );
  }
}
