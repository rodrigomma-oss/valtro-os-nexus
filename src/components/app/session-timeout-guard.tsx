import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useSessionTimeout } from "@/hooks/use-session-timeout";

/**
 * Guarda de sessão da área autenticada.
 * Renderiza o aviso pré-logout e delega a lógica ao hook `useSessionTimeout`.
 */
export function SessionTimeoutGuard() {
  const { warningOpen, reason, secondsRemaining, extendSession, signOutNow } =
    useSessionTimeout();

  const isMax = reason === "max_duration";

  return (
    <AlertDialog open={warningOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Sessão prestes a expirar</AlertDialogTitle>
          <AlertDialogDescription>
            {isMax
              ? `Por segurança, o tempo máximo de sessão foi atingido. Sua sessão será encerrada em aproximadamente ${secondsRemaining} segundo(s) e será necessário entrar novamente.`
              : `Sua sessão será encerrada em aproximadamente ${secondsRemaining} segundo(s) por inatividade. Deseja continuar conectado?`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={signOutNow}>Encerrar agora</AlertDialogCancel>
          {!isMax && (
            <AlertDialogAction onClick={extendSession}>Continuar conectado</AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
