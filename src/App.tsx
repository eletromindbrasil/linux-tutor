import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  ArrowIcon,
  CheckIcon,
  ClockIcon,
  CloseIcon,
  CopyIcon,
  LightbulbIcon,
  MenuIcon,
  RotateIcon,
  TerminalIcon
} from "./components/Icons";
import { TerminalPanel } from "./components/TerminalPanel";
import type { Lesson, VerificationResult } from "./types";

interface User {
  id: string;
  email: string;
  mustChangePassword: boolean;
}

interface SessionPayload {
  user: User;
  completedLessonIds: string[];
}

export function App() {
  const [session, setSession] = useState<SessionPayload | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [temporaryPassword, setTemporaryPassword] = useState("");

  useEffect(() => {
    fetch("/api/auth/session")
      .then(async (response) => response.ok ? response.json() : null)
      .then((payload: SessionPayload | null) => setSession(payload))
      .catch(() => setSession(null))
      .finally(() => setCheckingSession(false));
  }, []);

  if (checkingSession) {
    return <BootScreen label="Verificando acesso" />;
  }

  if (!session) {
    return (
      <LoginScreen
        onAuthenticated={(payload, password) => {
          setTemporaryPassword(password);
          setSession(payload);
        }}
      />
    );
  }

  if (session.user.mustChangePassword) {
    return (
      <ChangePasswordScreen
        email={session.user.email}
        initialCurrentPassword={temporaryPassword}
        onChanged={(payload) => {
          setTemporaryPassword("");
          setSession(payload);
        }}
        onLogout={() => void logout(() => setSession(null))}
      />
    );
  }

  return (
    <LearningApp
      user={session.user}
      initialCompletedLessons={session.completedLessonIds}
      onLogout={() => void logout(() => setSession(null))}
    />
  );
}

function LearningApp({
  user,
  initialCompletedLessons,
  onLogout
}: {
  user: User;
  initialCompletedLessons: string[];
  onLogout: () => void;
}) {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [completedLessons, setCompletedLessons] = useState<string[]>(initialCompletedLessons);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isPreparing, setIsPreparing] = useState(true);
  const [environmentError, setEnvironmentError] = useState<string | null>(null);
  const [verification, setVerification] = useState<VerificationResult | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [visibleHints, setVisibleHints] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);
  const currentSessionRef = useRef<string | null>(null);

  useEffect(() => {
    fetch("/api/lessons")
      .then(async (response) => {
        if (!response.ok) throw new Error("Não foi possível carregar as lições.");
        return response.json();
      })
      .then((data: { lessons: Lesson[] }) => {
        setLessons(data.lessons);
        const firstIncomplete = data.lessons.find(
          (lesson) => !completedLessons.includes(lesson.id)
        );
        setActiveLessonId(firstIncomplete?.id ?? data.lessons[0]?.id ?? null);
      })
      .catch((error: Error) => setEnvironmentError(error.message));
  }, []);

  const activeLesson = useMemo(
    () => lessons.find((lesson) => lesson.id === activeLessonId) ?? null,
    [activeLessonId, lessons]
  );
  const activeIndex = lessons.findIndex((lesson) => lesson.id === activeLessonId);
  const nextLesson = activeIndex >= 0 ? lessons[activeIndex + 1] : undefined;
  const progress = lessons.length ? (completedLessons.length / lessons.length) * 100 : 0;

  const deleteSession = useCallback(async (id: string | null) => {
    if (!id) return;
    await fetch(`/api/sessions/${id}`, { method: "DELETE", keepalive: true }).catch(() => undefined);
  }, []);

  const prepareEnvironment = useCallback(
    async (lessonId: string) => {
      const previousSession = currentSessionRef.current;
      currentSessionRef.current = null;
      setSessionId(null);
      setIsPreparing(true);
      setEnvironmentError(null);
      setVerification(null);
      setVisibleHints(0);
      await deleteSession(previousSession);

      try {
        const response = await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lessonId })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Falha ao criar o ambiente.");
        currentSessionRef.current = data.sessionId;
        setSessionId(data.sessionId);
      } catch (error) {
        setEnvironmentError(error instanceof Error ? error.message : "Falha inesperada.");
      } finally {
        setIsPreparing(false);
      }
    },
    [deleteSession]
  );

  useEffect(() => {
    if (activeLessonId) void prepareEnvironment(activeLessonId);
  }, [activeLessonId, prepareEnvironment]);

  useEffect(
    () => () => {
      const id = currentSessionRef.current;
      if (id) void deleteSession(id);
    },
    [deleteSession]
  );

  function chooseLesson(lessonId: string) {
    if (lessonId === activeLessonId) return;
    setActiveLessonId(lessonId);
    setMobileMenuOpen(false);
  }

  async function verifyTask() {
    if (!sessionId) return;
    setIsVerifying(true);
    try {
      const response = await fetch(`/api/sessions/${sessionId}/verify`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Não foi possível verificar a tarefa.");
      setVerification(data);

      if (data.passed && activeLessonId && !completedLessons.includes(activeLessonId)) {
        const nextCompleted = [...completedLessons, activeLessonId];
        setCompletedLessons(nextCompleted);
      }
    } catch (error) {
      setEnvironmentError(error instanceof Error ? error.message : "Falha inesperada.");
    } finally {
      setIsVerifying(false);
    }
  }

  function showHint() {
    if (!activeLesson) return;
    setVisibleHints((current) => Math.min(current + 1, activeLesson.hints.length));
  }

  async function copyCommand(command: string) {
    await navigator.clipboard.writeText(command);
    setCopiedCommand(command);
    window.setTimeout(() => setCopiedCommand(null), 1200);
  }

  if (!activeLesson) {
    return (
      <main className="boot-screen">
        <span className="brand-mark"><TerminalIcon /></span>
        <span className="loader" />
        <strong>Carregando Linux Tutor</strong>
        {environmentError ? <span>{environmentError}</span> : null}
      </main>
    );
  }

  return (
    <div className="app-shell">
      <aside className={`course-sidebar ${mobileMenuOpen ? "is-open" : ""}`}>
        <div className="brand">
          <span className="brand-mark"><TerminalIcon /></span>
          <div>
            <strong>Linux Tutor</strong>
            <span>Aprenda fazendo</span>
          </div>
          <button className="mobile-close" onClick={() => setMobileMenuOpen(false)} aria-label="Fechar menu">
            <CloseIcon />
          </button>
        </div>

        <div className="course-progress">
          <div className="progress-copy">
            <span>Seu progresso</span>
            <strong>{completedLessons.length} de {lessons.length}</strong>
          </div>
          <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>
        </div>

        <nav className="lesson-nav" aria-label="Lições">
          <span className="nav-label">Trilha principal · Fundamentos</span>
          {lessons.map((lesson) => {
            const completed = completedLessons.includes(lesson.id);
            const active = lesson.id === activeLessonId;
            return (
              <button
                key={lesson.id}
                className={`lesson-nav-item ${active ? "is-active" : ""}`}
                onClick={() => chooseLesson(lesson.id)}
                title={`Lição ${lesson.order}: ${lesson.title}`}
              >
                <span className={`lesson-number ${completed ? "is-complete" : ""}`}>
                  {String(lesson.order).padStart(2, "0")}
                </span>
                <span className="lesson-nav-copy">
                  <strong>{lesson.title}</strong>
                  <span>{completed ? "Concluída" : lesson.duration}</span>
                </span>
                {active ? <span className="active-marker" /> : null}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-note">
          <span className="safe-icon"><CheckIcon /></span>
          <div>
            <strong>Ambiente seguro</strong>
            <span>Seus comandos rodam em um contêiner isolado.</span>
          </div>
        </div>
        <button className="logout-button" onClick={onLogout} title={`Sair de ${user.email}`}>
          <span>Sair</span>
          <small>{user.email}</small>
        </button>
      </aside>

      {mobileMenuOpen ? <button className="sidebar-scrim" onClick={() => setMobileMenuOpen(false)} aria-label="Fechar menu" /> : null}

      <main className="lesson-main">
        <header className="mobile-header">
          <button onClick={() => setMobileMenuOpen(true)} aria-label="Abrir menu"><MenuIcon /></button>
          <div className="mobile-brand"><span className="brand-mark"><TerminalIcon /></span><strong>Linux Tutor</strong></div>
          <span>{activeLesson.order}/{lessons.length}</span>
        </header>

        <div className="lesson-workspace">
          <article className="lesson-content">
            <div className="lesson-heading">
              <div className="eyebrow-row">
                <span>{activeLesson.eyebrow}</span>
                <span className="duration"><ClockIcon /> {activeLesson.duration}</span>
              </div>
              <h1>{activeLesson.title}</h1>
              <p>{activeLesson.summary}</p>
            </div>

            <section className="content-section objective-card">
              <span className="section-kicker">Objetivo</span>
              <p>{activeLesson.objective}</p>
              <ul>
                {activeLesson.concepts.map((concept) => <li key={concept}>{concept}</li>)}
              </ul>
            </section>

            <section className="content-section">
              <span className="section-kicker">Comandos desta lição</span>
              <div className="command-list">
                {activeLesson.examples.map((example) => (
                  <div className="command-example" key={example.command}>
                    <code>{example.command}</code>
                    <p>{example.explanation}</p>
                    <button onClick={() => void copyCommand(example.command)} aria-label={`Copiar ${example.command}`}>
                      {copiedCommand === example.command ? <CheckIcon /> : <CopyIcon />}
                    </button>
                  </div>
                ))}
              </div>
            </section>

            <section className="mission-card">
              <div className="mission-header">
                <span className="mission-icon"><TerminalIcon /></span>
                <div><span>Sua missão</span><strong>Hora de praticar</strong></div>
              </div>
              <p>{activeLesson.taskIntro}</p>
              <ol>
                {activeLesson.steps.map((step) => <li key={step}>{step}</li>)}
              </ol>
            </section>

            {visibleHints > 0 ? (
              <section className="hints-card" aria-live="polite">
                <div className="hints-title"><LightbulbIcon /><strong>Dicas reveladas</strong></div>
                {activeLesson.hints.slice(0, visibleHints).map((hint, index) => (
                  <p key={hint}><span>{index + 1}</span>{hint}</p>
                ))}
              </section>
            ) : null}
          </article>

          <div className="practice-column">
            <TerminalPanel sessionId={sessionId} isPreparing={isPreparing} error={environmentError} />

            <div className="practice-actions">
              <button
                className="secondary-button"
                onClick={() => void prepareEnvironment(activeLesson.id)}
                disabled={isPreparing}
              >
                <RotateIcon /> Reiniciar
              </button>
              <button
                className="secondary-button"
                onClick={showHint}
                disabled={visibleHints >= activeLesson.hints.length}
              >
                <LightbulbIcon /> {visibleHints ? "Próxima dica" : "Pedir dica"}
              </button>
              <button
                className="primary-button"
                onClick={() => void verifyTask()}
                disabled={!sessionId || isPreparing || isVerifying}
              >
                {isVerifying ? <span className="button-loader" /> : <CheckIcon />}
                {isVerifying ? "Verificando..." : "Verificar tarefa"}
              </button>
            </div>

            {verification ? (
              <section className={`verification-card ${verification.passed ? "is-success" : ""}`} aria-live="polite">
                <div className="verification-heading">
                  <span className="verification-icon">{verification.passed ? <CheckIcon /> : "!"}</span>
                  <div>
                    <strong>{verification.passed ? "Lição concluída!" : "Quase lá"}</strong>
                    <span>{verification.passed ? "Todos os critérios foram atendidos." : "Revise os itens abaixo e tente novamente."}</span>
                  </div>
                </div>
                <div className="check-results">
                  {verification.results.map((result) => (
                    <div className={result.passed ? "passed" : "failed"} key={result.id}>
                      <span>{result.passed ? <CheckIcon /> : "×"}</span>
                      <div><strong>{result.label}</strong><small>{result.message}</small></div>
                    </div>
                  ))}
                </div>
                {verification.passed && nextLesson ? (
                  <button className="next-button" onClick={() => chooseLesson(nextLesson.id)}>
                    Próxima lição <ArrowIcon />
                  </button>
                ) : null}
              </section>
            ) : (
              <p className="verification-tip">Quando terminar os passos, clique em <strong>Verificar tarefa</strong>.</p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function BootScreen({ label }: { label: string }) {
  return (
    <main className="boot-screen">
      <span className="brand-mark"><TerminalIcon /></span>
      <span className="loader" />
      <strong>{label}</strong>
    </main>
  );
}

function LoginScreen({
  onAuthenticated
}: {
  onAuthenticated: (payload: SessionPayload, password: string) => void;
}) {
  const [email, setEmail] = useState("eletromind.brasil@gmail.com");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Não foi possível entrar.");
      onAuthenticated(payload, password);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Falha inesperada.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout title="Entre no Linux Tutor" subtitle="Seu progresso e seus ambientes ficam protegidos pela sua conta.">
      <form className="auth-form" onSubmit={(event) => void submit(event)}>
        <label>E-mail<input type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
        <label>Senha<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
        {error ? <p className="auth-error" role="alert">{error}</p> : null}
        <button className="primary-button" disabled={submitting}>{submitting ? "Entrando..." : "Entrar"}</button>
      </form>
    </AuthLayout>
  );
}

function ChangePasswordScreen({
  email,
  initialCurrentPassword,
  onChanged,
  onLogout
}: {
  email: string;
  initialCurrentPassword: string;
  onChanged: (payload: SessionPayload) => void;
  onLogout: () => void;
}) {
  const [currentPassword, setCurrentPassword] = useState(initialCurrentPassword);
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (newPassword !== confirmation) {
      setError("A confirmação não corresponde à nova senha.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Não foi possível alterar a senha.");
      onChanged(payload);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Falha inesperada.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout title="Crie sua senha oficial" subtitle={`Primeiro acesso de ${email}. A senha temporária precisa ser substituída.`}>
      <form className="auth-form" onSubmit={(event) => void submit(event)}>
        <label>Senha temporária<input type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required /></label>
        <label>Nova senha <small>Mínimo de 10 caracteres</small><input type="password" autoComplete="new-password" minLength={10} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required /></label>
        <label>Confirme a nova senha<input type="password" autoComplete="new-password" minLength={10} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required /></label>
        {error ? <p className="auth-error" role="alert">{error}</p> : null}
        <button className="primary-button" disabled={submitting}>{submitting ? "Salvando..." : "Salvar nova senha"}</button>
        <button className="auth-link" type="button" onClick={onLogout}>Sair</button>
      </form>
    </AuthLayout>
  );
}

function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <span className="brand-mark"><TerminalIcon /></span>
        <div className="auth-heading"><span>Linux Tutor</span><h1>{title}</h1><p>{subtitle}</p></div>
        {children}
      </section>
    </main>
  );
}

async function logout(afterLogout: () => void) {
  await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
  afterLogout();
}
