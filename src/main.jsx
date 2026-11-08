import { StrictMode, useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'

const checklistSeed = [
  { id: 'pass', title: 'Получить постоянный пропуск', hint: 'Проверь готовность и место выдачи', done: false, tag: 'Организация' },
  { id: 'schedule', title: 'Открыть расписание', hint: 'Найди первую пару и аудиторию', done: true, tag: 'Учёба' },
  { id: 'group', title: 'Найти группу и куратора', hint: 'Контакты уже доступны в кабинете', done: false, tag: 'Организация' },
  { id: 'lms', title: 'Проверить вход в ЛМС', hint: 'Логин и пароль приходят на почту', done: false, tag: 'Учёба' },
]

const quickActions = [
  ['schedule', 'Расписание', 'Покажи мои ближайшие занятия'],
  ['room', 'Найти аудиторию', 'Как пройти в аудиторию АВ1502?'],
  ['news', 'Новости и приказы', 'Сделай выжимку новых новостей'],
  ['message', 'Написать сотруднику', 'Помоги написать сообщение сотруднику'],
]

function App() {
  const [assistantOpen, setAssistantOpen] = useState(false)
  const [onboarding, setOnboarding] = useState(() => localStorage.getItem('assistant-onboarding-done') !== 'true')
  const [checklist, setChecklist] = useState(checklistSeed)
  const [activeAction, setActiveAction] = useState(null)
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')

  const completedCount = checklist.filter(item => item.done).length
  const progress = Math.round((completedCount / checklist.length) * 100)

  useEffect(() => {
    if (assistantOpen && onboarding) setActiveAction(null)
  }, [assistantOpen, onboarding])

  const assistantReply = useMemo(() => ({
    schedule: 'Ближайшее занятие — завтра в 09:00. Группа ИТ-214, корпус А, аудитория АВ1502. Могу открыть маршрут.',
    room: 'Аудитория АВ1502 находится в корпусе А, 5 этаж. Для маршрута использую карту учебных корпусов.',
    news: 'Нашла 3 новых материала. Покажу краткую выжимку и ссылки на первоисточники, чтобы можно было проверить детали.',
    message: 'Подготовлю черновик. Сначала уточню адресата и тему обращения, а перед отправкой покажу полный текст.',
  }), [])

  function finishOnboarding() {
    localStorage.setItem('assistant-onboarding-done', 'true')
    setOnboarding(false)
    setMessages([{ from: 'assistant', text: 'Готово. Теперь я могу помочь с расписанием, аудиториями, новостями и обращениями.' }])
  }

  function toggleChecklist(id) {
    setChecklist(items => items.map(item => item.id === id ? { ...item, done: !item.done } : item))
  }

  function runQuickAction(id, label, prompt) {
    setActiveAction(id)
    setMessages(current => [...current, { from: 'user', text: prompt }, { from: 'assistant', text: assistantReply[id] || `Открываю действие «${label}».` }])
  }

  function sendMessage(event) {
    event.preventDefault()
    const value = draft.trim()
    if (!value) return
    setMessages(current => [...current, { from: 'user', text: value }, { from: 'assistant', text: 'Поняла запрос. Для точного ответа проверю официальные данные личного кабинета и покажу источник.' }])
    setDraft('')
  }

  return <main className="app-shell">
    <aside className="sidebar">
      <div className="brand-mark">М<span>П</span></div>
      <nav className="side-nav">
        <button className="nav-item active"><span className="nav-icon">⌂</span>Главная</button>
        <button className="nav-item"><span className="nav-icon">▦</span>Расписание</button>
        <button className="nav-item"><span className="nav-icon">▤</span>Сообщения</button>
        <button className="nav-item"><span className="nav-icon">⚙</span>Настройки</button>
      </nav>
      <div className="sidebar-bottom"><span className="status-dot" />Система доступна</div>
    </aside>

    <section className="page-content">
      <header className="topbar">
        <div className="search-box"><span>⌕</span><span>Поиск</span><kbd>Ctrl K</kbd></div>
        <div className="profile"><div className="profile-avatar">СВ</div><div><strong>Смелов Вадим Петрович</strong><small>ИТ-214 · 1 курс</small></div><span className="chevron">⌄</span></div>
      </header>
      <div className="content-inner">
        <div className="welcome-row"><div><p className="eyebrow">ПОНЕДЕЛЬНИК, 18 АВГУСТА</p><h1>Добрый день, Вадим</h1><p className="muted">Собрали главное на сегодня.</p></div><button className="outline-button" onClick={() => setAssistantOpen(true)}>Открыть помощника</button></div>
        <div className="dashboard-grid">
          <section className="hero-card"><div><p className="eyebrow">БЛИЖАЙШЕЕ ЗАНЯТИЕ</p><h2>Дискретная математика</h2><p className="hero-meta">Сегодня · 13:40–15:15 · гр. ИТ-214</p><button className="light-button" onClick={() => { setAssistantOpen(true); setTimeout(() => runQuickAction('room', 'Найти аудиторию', 'Как пройти в аудиторию АВ1502?'), 0) }}>Показать маршрут <span>→</span></button></div><div className="building-illustration"><div className="building-shape" /><span>АВ<br />1502</span></div></section>
          <section className="info-card"><div className="card-title"><span>Задачи на сегодня</span><span className="count">2</span></div><div className="task-line"><span className="check checked">✓</span><span>Открыть расписание</span></div><div className="task-line"><span className="check" /><span>Проверить ЛМС</span></div><div className="task-line"><span className="check" /><span>Получить пропуск</span></div><button className="text-button" onClick={() => setAssistantOpen(true)}>Открыть с помощником →</button></section>
          <section className="wide-card"><div className="card-title"><span>Последние новости</span><button className="text-button">Все новости →</button></div><article><div className="news-date">14 АВГ</div><div><strong>Старт в студенчество: советы первокурсникам</strong><p className="muted">Что важно сделать в первые дни в университете</p></div></article><article><div className="news-date">12 АВГ</div><div><strong>Обновлено расписание занятий</strong><p className="muted">Проверьте аудитории перед первым занятием</p></div></article></section>
        </div>
      </div>
    </section>

    <button className={`assistant-launcher ${assistantOpen ? 'is-open' : ''}`} aria-label="Открыть ассистента" onClick={() => setAssistantOpen(value => !value)}>
      <span className="launcher-orbit orbit-one" /><span className="launcher-orbit orbit-two" /><span className="launcher-core">AI</span>
    </button>

    {assistantOpen && <div className="assistant-overlay" role="dialog" aria-label="Ассистент личного кабинета">
      <div className="assistant-header"><div className="assistant-identity"><div className="assistant-avatar"><span className="avatar-pulse" />AI</div><div><strong>Ассистент</strong><span><i /> В сети · данные защищены</span></div></div><button className="close-button" onClick={() => setAssistantOpen(false)} aria-label="Закрыть">×</button></div>
      {onboarding ? <div className="onboarding-view"><div className="onboarding-animation" aria-label="Слот для onboarding-анимации"><div className="animation-ring ring-a" /><div className="animation-ring ring-b" /><div className="animation-core">AI</div></div><p className="eyebrow">ПЕРВЫЙ ЗАПУСК</p><h2>Начнём с главного</h2><p className="onboarding-copy">Я помогу пройти базовые шаги первокурсника, найти нужную информацию и подготовить обращение, если ответа нет.</p><div className="progress-label"><span>Чек-лист первокурсника</span><strong>{completedCount}/{checklist.length}</strong></div><div className="progress-track"><span style={{ width: `${progress}%` }} /></div><div className="checklist">{checklist.map(item => <button className={`checklist-item ${item.done ? 'done' : ''}`} key={item.id} onClick={() => toggleChecklist(item.id)}><span className="check-circle">{item.done ? '✓' : ''}</span><span className="check-text"><strong>{item.title}</strong><small>{item.hint}</small></span><span className="item-tag">{item.tag}</span></button>)}</div><button className="primary-button" onClick={finishOnboarding}>{completedCount === checklist.length ? 'Завершить онбординг' : 'Продолжить позже'}<span>→</span></button><button className="skip-button" onClick={finishOnboarding}>Пропустить и перейти в чат</button></div> : <div className="chat-view"><div className="chat-scroll"><div className="assistant-intro"><div className="mini-avatar">AI</div><div><strong>Чем помочь?</strong><p>Выбери действие или напиши вопрос — я начну с данных личного кабинета.</p></div></div>{messages.map((message, index) => <div className={`message-row ${message.from}`} key={`${message.from}-${index}`}><div className="message-bubble">{message.text}{message.from === 'assistant' && <small className="source-note">Источник: личный кабинет · проверено сейчас</small>}</div></div>)}{activeAction === 'room' && <button className="route-preview"><span className="route-icon">↗</span><span><strong>Маршрут до АВ1502</strong><small>Корпус А · 5 этаж · открыть карту</small></span><b>→</b></button>}</div><div className="quick-actions"><span className="quick-label">Быстрые действия</span><div className="quick-grid">{quickActions.map(([id, label, prompt]) => <button key={id} className="quick-button" onClick={() => runQuickAction(id, label, prompt)}>{label}<span>↗</span></button>)}</div></div><form className="chat-form" onSubmit={sendMessage}><input value={draft} onChange={event => setDraft(event.target.value)} placeholder="Напишите вопрос..." aria-label="Сообщение ассистенту" /><button type="submit" aria-label="Отправить">↑</button></form><p className="chat-disclaimer">Ассистент использует официальные данные и покажет источник ответа.</p></div>}
    </div>}
  </main>
}

createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>)
