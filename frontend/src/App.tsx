import { FormEvent, useEffect, useMemo, useState } from 'react';
import { api, Appointment, Doctor, Exam, formatDate, formatTime, Slot } from './api';

function saoPauloDate(offsetDays = 0): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const get = (key: string) => parts.find((part) => part.type === key)?.value ?? '';
  const date = new Date(`${get('year')}-${get('month')}-${get('day')}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

function todayDate(): string { return saoPauloDate(0); }
function tomorrowDate(): string { return saoPauloDate(1); }

export default function App() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [searchResults, setSearchResults] = useState<Exam[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [search, setSearch] = useState('');
  const [examId, setExamId] = useState<number | null>(null);
  const [doctorId, setDoctorId] = useState<number | null>(null);
  const [date, setDate] = useState(tomorrowDate);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [patientName, setPatientName] = useState('');
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [confirmation, setConfirmation] = useState<Appointment | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([api.searchExams(''), api.getDoctors()])
      .then(([examResults, doctorResults]) => {
        if (!active) return;
        setExams(examResults);
        setSearchResults(examResults);
        setDoctors(doctorResults);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Não foi possível carregar os dados iniciais.');
      })
      .finally(() => { if (active) setLoadingInitial(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    const timeout = window.setTimeout(() => {
      api.searchExams(search)
        .then((results) => { if (active) setSearchResults(results); })
        .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : 'Falha ao buscar exames.'); });
    }, 220);
    return () => { active = false; window.clearTimeout(timeout); };
  }, [search]);

  const selectedExam = useMemo(() => exams.find((exam) => exam.id === examId), [exams, examId]);
  const selectedDoctor = useMemo(() => doctors.find((doctor) => doctor.id === doctorId), [doctors, doctorId]);
  const canSearchSlots = Boolean(examId && doctorId && date);

  function resetAvailability() {
    setSlots([]);
    setSelectedSlot(null);
    setConfirmation(null);
    setNotice('');
  }

  async function searchSlots() {
    if (!canSearchSlots || !examId || !doctorId) return;
    setError('');
    setNotice('');
    setConfirmation(null);
    setSelectedSlot(null);
    setSlots([]);
    setLoadingSlots(true);
    try {
      const result = await api.getAvailability(doctorId, examId, date);
      setSlots(result.slots);
      if (result.slots.length === 0) setNotice('Não encontramos horários livres nessa data. Tente outro dia ou profissional.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível consultar a agenda.');
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }

  async function submitBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedExam || !selectedDoctor || !selectedSlot) {
      setError('Escolha um exame, um médico e um horário antes de confirmar.');
      return;
    }
    setError('');
    setNotice('');
    setBooking(true);
    try {
      const result = await api.createAppointment({
        patientName: patientName.trim(),
        examId: selectedExam.id,
        doctorId: selectedDoctor.id,
        startAt: selectedSlot.startAt,
      });
      setConfirmation(result);
      setNotice('Agendamento confirmado com sucesso.');
      setSlots((current) => current.filter((slot) => slot.startAt !== result.startAt));
      setSelectedSlot(null);
      setPatientName('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível concluir o agendamento.');
      // Reload availability after a conflict so the displayed list stays accurate.
      try {
        const result = await api.getAvailability(selectedDoctor.id, selectedExam.id, date);
        setSlots(result.slots);
      } catch { /* The original booking error is the most useful message. */ }
    } finally {
      setBooking(false);
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#inicio" aria-label="Clara, início">
          <span className="brand-mark" aria-hidden="true"><span /></span>
          <span>clara<span className="brand-dot">.</span></span>
        </a>
        <div className="topbar-note"><span className="status-dot" /> Agendamento online <span className="topbar-divider">·</span> Simples, claro e seguro</div>
      </header>

      <main id="inicio">
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow"><span className="eyebrow-line" /> CUIDADO QUE COMEÇA COM VOCÊ</div>
            <h1>Seu próximo passo<br />para se <em>cuidar melhor.</em></h1>
            <p>Encontre seu exame, escolha o melhor horário e agende em poucos passos.</p>
            <div className="hero-trust"><span className="check-circle">✓</span> Horários atualizados <span className="trust-separator">/</span> Agendamento sem complicação</div>
          </div>
          <div className="hero-art" aria-label="Ilustração abstrata de cuidado e saúde" role="img">
            <div className="art-ring ring-one" /><div className="art-ring ring-two" />
            <div className="art-orb"><span className="orb-cross">+</span></div>
            <div className="art-leaf leaf-one" /><div className="art-leaf leaf-two" />
            <div className="art-caption"><span>01</span><span>Seu cuidado, no seu tempo.</span></div>
          </div>
        </section>

        {error && <div className="alert alert-error" role="alert"><span className="alert-icon">!</span><span>{error}</span><button type="button" aria-label="Fechar mensagem" onClick={() => setError('')}>×</button></div>}
        {notice && <div className={`alert ${confirmation ? 'alert-success' : 'alert-neutral'}`} role="status"><span className="alert-icon">{confirmation ? '✓' : 'i'}</span><span>{notice}</span><button type="button" aria-label="Fechar mensagem" onClick={() => setNotice('')}>×</button></div>}

        {confirmation && (
          <section className="confirmation-card" aria-live="polite">
            <div className="confirmation-icon">✓</div>
            <div className="confirmation-content">
              <p className="section-kicker">AGENDAMENTO REALIZADO</p>
              <h2>Está confirmado, {confirmation.patientName.split(' ')[0]}.</h2>
              <p>Guarde os dados abaixo para consultar seu agendamento.</p>
              <div className="confirmation-details">
                <div><span>Protocolo</span><strong>CL-{String(confirmation.id).padStart(5, '0')}</strong></div>
                <div><span>Exame</span><strong>{confirmation.exam.name}</strong></div>
                <div><span>Profissional</span><strong>{confirmation.doctor.name}</strong></div>
                <div><span>Data e horário</span><strong>{formatDate(date)} · {formatTime(confirmation.startAt)}</strong></div>
              </div>
              <button className="button button-secondary" onClick={() => { setConfirmation(null); setNotice(''); resetAvailability(); }} type="button">Fazer novo agendamento</button>
            </div>
          </section>
        )}

        <section className="booking-layout" aria-label="Formulário de agendamento">
          <div className="booking-main">
            <div className="section-heading">
              <div><p className="section-kicker">VAMOS COMEÇAR</p><h2>Agende seu exame</h2></div>
              <span className="required-note"><span>*</span> Campos obrigatórios</span>
            </div>

            <div className="step-block">
              <div className="step-heading"><span className="step-number">01</span><div><h3>Qual exame você precisa?</h3><p>Busque pelo nome do exame no catálogo.</p></div></div>
              <label className="field-label" htmlFor="exam-search">Buscar exame <span>*</span></label>
              <div className="search-field"><span className="search-icon" aria-hidden="true">⌕</span><input id="exam-search" type="search" placeholder="Ex.: ultrassonografia, raio-X..." value={search} onChange={(event) => { setSearch(event.target.value); resetAvailability(); }} /></div>
              {loadingInitial ? <div className="inline-loading"><span className="spinner" /> Carregando catálogo...</div> : (
                <div className="exam-results" role="listbox" aria-label="Resultados de exames">
                  {searchResults.length === 0 ? <div className="empty-results">Nenhum exame encontrado. Tente outra palavra.</div> : searchResults.slice(0, 6).map((exam) => (
                    <button type="button" role="option" aria-selected={examId === exam.id} key={exam.id} className={`exam-option ${examId === exam.id ? 'is-selected' : ''}`} onClick={() => { setExamId(exam.id); resetAvailability(); }}>
                      <span className="exam-icon" aria-hidden="true">✳</span><span className="exam-name">{exam.name}<small>{exam.durationMinutes} minutos</small></span><span className="option-check">{examId === exam.id ? '✓' : '+'}</span>
                    </button>
                  ))}
                </div>
              )}
              {searchResults.length > 6 && <p className="result-hint">Mostrando até 6 resultados. Refine a busca para encontrar outro exame.</p>}
              {selectedExam && <p className="selection-summary"><span className="check-circle">✓</span> Selecionado: <strong>{selectedExam.name}</strong> · {selectedExam.durationMinutes} min</p>}
            </div>

            <div className="step-divider" />
            <div className="step-block">
              <div className="step-heading"><span className="step-number">02</span><div><h3>Quando e com quem?</h3><p>Escolha um profissional e consulte os horários livres.</p></div></div>
              <div className="field-grid">
                <div className="field-group"><label className="field-label" htmlFor="doctor">Profissional <span>*</span></label><div className="select-wrap"><select id="doctor" value={doctorId ?? ''} onChange={(event) => { setDoctorId(event.target.value ? Number(event.target.value) : null); resetAvailability(); }}><option value="">Selecione um médico</option>{doctors.map((doctor) => <option value={doctor.id} key={doctor.id}>{doctor.name}</option>)}</select><span className="select-chevron">⌄</span></div>{selectedDoctor && <small className="field-help">{selectedDoctor.crm}</small>}</div>
                <div className="field-group"><label className="field-label" htmlFor="date">Data desejada <span>*</span></label><input className="date-input" id="date" type="date" min={todayDate()} value={date} onChange={(event) => { setDate(event.target.value); resetAvailability(); }} /></div>
              </div>
              <button type="button" className="button button-primary search-slots-button" onClick={searchSlots} disabled={!canSearchSlots || loadingSlots || loadingInitial}>{loadingSlots ? <><span className="spinner spinner-light" /> Consultando agenda...</> : <>Ver horários disponíveis <span aria-hidden="true">→</span></>}</button>

              {(slots.length > 0 || loadingSlots) && <div className="slots-panel"><div className="slots-heading"><h4>Horários livres</h4><span>{slots.length} {slots.length === 1 ? 'opção' : 'opções'}</span></div><p className="slots-date">{date ? formatDate(date) : ''} <span>·</span> duração de {selectedExam?.durationMinutes ?? '—'} min</p><div className="slots-grid">{slots.map((slot) => <button type="button" className={`slot-option ${selectedSlot?.startAt === slot.startAt ? 'is-selected' : ''}`} key={slot.startAt} onClick={() => setSelectedSlot(slot)} aria-pressed={selectedSlot?.startAt === slot.startAt}>{formatTime(slot.startAt)}<small>até {formatTime(slot.endAt)}</small></button>)}</div>{selectedSlot && <p className="selection-summary"><span className="check-circle">✓</span> Horário selecionado: <strong>{formatTime(selectedSlot.startAt)}–{formatTime(selectedSlot.endAt)}</strong></p>}</div>}
            </div>

            <div className="step-divider" />
            <form className="step-block patient-form" onSubmit={submitBooking}>
              <div className="step-heading"><span className="step-number">03</span><div><h3>Quem vai realizar o exame?</h3><p>Informe o nome do paciente para finalizar.</p></div></div>
              <label className="field-label" htmlFor="patient-name">Nome do paciente <span>*</span></label>
              <input className="text-input" id="patient-name" type="text" autoComplete="name" minLength={2} maxLength={120} required placeholder="Digite seu nome completo" value={patientName} onChange={(event) => setPatientName(event.target.value)} />
              <button className="button button-primary confirm-button" type="submit" disabled={!selectedExam || !selectedDoctor || !selectedSlot || patientName.trim().length < 2 || booking}>{booking ? <><span className="spinner spinner-light" /> Confirmando...</> : <>Confirmar agendamento <span aria-hidden="true">→</span></>}</button>
              <p className="privacy-note"><span aria-hidden="true">⌑</span> Seus dados são usados apenas para registrar este agendamento demonstrativo.</p>
            </form>
          </div>

          <aside className="booking-aside">
            <div className="summary-card">
              <div className="summary-top"><div className="summary-icon">✳</div><span>RESUMO</span></div>
              <h3>Seu agendamento</h3><p className="summary-intro">Confira as informações selecionadas até aqui.</p>
              <div className="summary-line"><span className="summary-number">01</span><div><small>Exame</small><strong>{selectedExam?.name ?? 'Nenhum exame selecionado'}</strong>{selectedExam && <em>{selectedExam.durationMinutes} minutos</em>}</div></div>
              <div className="summary-line"><span className="summary-number">02</span><div><small>Profissional</small><strong>{selectedDoctor?.name ?? 'Escolha um profissional'}</strong>{selectedDoctor && <em>{selectedDoctor.crm}</em>}</div></div>
              <div className="summary-line"><span className="summary-number">03</span><div><small>Data e horário</small><strong>{selectedSlot ? formatDate(date) : (date ? formatDate(date) : 'Escolha uma data')}</strong><em>{selectedSlot ? `${formatTime(selectedSlot.startAt)} – ${formatTime(selectedSlot.endAt)}` : 'Selecione um horário livre'}</em></div></div>
              <div className="summary-rule" />
              <div className="summary-help"><span className="help-icon">?</span><div><strong>Precisa de ajuda?</strong><p>Os horários exibidos consideram a duração do exame e a agenda do profissional.</p></div></div>
            </div>
            <div className="aside-note"><span className="aside-note-icon">✦</span><div><strong>Um cuidado de cada vez.</strong><p>Planeje seu exame com tranquilidade. A confirmação aparece nesta tela após o agendamento.</p></div></div>
          </aside>
        </section>
      </main>
      <footer className="footer"><a className="brand brand-footer" href="#inicio"><span className="brand-mark" aria-hidden="true"><span /></span><span>clara<span className="brand-dot">.</span></span></a><span>Projeto demonstrativo · Agendamento de exames de imagem</span><span className="footer-dot">●</span></footer>
    </div>
  );
}
