import { StrictMode, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./styles.css";

const checklistSeed = [
  {
    id: "pass",
    title: "Получить постоянный пропуск",
    hint: "Проверь готовность и место выдачи",
    done: false,
    tag: "Организация",
  },
  {
    id: "schedule",
    title: "Открыть расписание",
    hint: "Найди первую пару и аудиторию",
    done: true,
    tag: "Учёба",
  },
  {
    id: "group",
    title: "Найти группу и куратора",
    hint: "Контакты уже доступны в кабинете",
    done: false,
    tag: "Организация",
  },
  {
    id: "lms",
    title: "Проверить вход в ЛМС",
    hint: "Логин и пароль приходят на почту",
    done: false,
    tag: "Учёба",
  },
];
const quickActions = [
  ["schedule", "Расписание", "Покажи мои ближайшие занятия"],
  ["room", "Найти аудиторию", "Как пройти в аудиторию АВ4002?"],
  ["news", "Новости и приказы", "Сделай выжимку новых новостей"],
  ["message", "Написать сотруднику", "Помоги написать сообщение сотруднику"],
];
const campusDirectory = [
  {
    id: "semenovskaya",
    title: "Кампус на Большой Семёновской",
    aliases: ["большой семеновской", "семеновской", "семеновская"],
    buildings: "А, Б, В, Н и НД",
    address: "ул. Большая Семёновская, д. 38",
  },
  {
    id: "avtozavodskaya",
    title: "Кампус на Автозаводской",
    aliases: ["автозаводской", "автозаводская", "ав"],
    buildings: "корпуса 1, 2, 4 и 5",
    address: "ул. Автозаводская, д. 16",
    locations: [
      { id: "1", title: "корпус 1", lat: 55.704220, lon: 37.645196 },
      { id: "2", title: "корпус 2", lat: 55.704599, lon: 37.645705 },
      { id: "4", title: "корпус 4", lat: 55.704306, lon: 37.646579 },
      { id: "5", title: "корпус 5", lat: 55.705437, lon: 37.646714 },
    ],
  },
  {
    id: "pryanishnikova",
    title: "Кампус на Прянишникова",
    aliases: ["прянишникова", "прянишниковой", "пр"],
    buildings: "корпуса 1 и 2",
    address: "ул. Прянишникова, д. 2А",
    locations: [
      { id: "1", title: "корпус 1", lat: 55.833268, lon: 37.544180 },
      { id: "2", title: "корпус 2", lat: 55.833708, lon: 37.543758 },
    ],
  },
  {
    id: "pavla-korchagina",
    title: "Кампус на Павла Корчагина",
    aliases: ["павла корчагина", "корчагина", "пк"],
    buildings: "единственный корпус",
    address: "129626, Москва, ул. Павла Корчагина, д. 22",
    locations: [{ id: "1", title: "единственный корпус", lat: 55.819540, lon: 37.663485 }],
  },
  {
    id: "mikhalkovskaya",
    title: "Учебный корпус на Михалковской",
    aliases: ["михалковской", "михалковская"],
    buildings: "корпус на Михалковской",
    address: "125493, Москва, ул. Михалковская, д. 7",
  },
];
const roomPrefixes = {
  ав: campusDirectory[1],
  пр: campusDirectory[2],
  пк: campusDirectory[3],
  а: campusDirectory[0],
  б: campusDirectory[0],
  в: campusDirectory[0],
  н: campusDirectory[0],
  нд: campusDirectory[0],
};
const normalizeQuery = (value) =>
  value.toLowerCase().replaceAll("ё", "е").replace(/[«»"'`]/g, "").replace(/\s+/g, " ").trim();
const extractRoom = (value) => {
  const match = normalizeQuery(value).match(
    /(?:^|[^а-яa-z])(ав|пр|пк|нд|а|б|в|н)\s*[-№]?\s*(\d{3,4})(?!\d)/i,
  );
  if (!match) return null;
  const prefix = match[1].toLowerCase();
  const number = match[2];
  return {
    code: `${prefix.toUpperCase()}${number}`,
    prefix,
    number,
    campus: roomPrefixes[prefix],
  };
};
const findCampus = (query) =>
  campusDirectory.find((campus) =>
    campus.aliases?.some((alias) =>
      alias.length <= 2 ? query.split(/\s+/).includes(alias) : query.includes(alias),
    ),
  );
const extractBuilding = (query) => {
  const match = query.match(/(?:корпус|здани[ея])\s*[-№]?\s*(1|2|4|5)\b/i);
  return match?.[1] ?? null;
};
const thinkingPhrases = [
  "Разбираю запрос по шагам",
  "Сверяю детали, чтобы не выдать догадку",
  "Ищу самый короткий путь к ответу",
  "Проверяю контекст личного кабинета",
  "Собираю ответ без лишнего шума",
  "Сопоставляю факты и формулировки",
  "Думаю, как сделать это проще",
  "Проверяю, не упустил ли важную деталь",
  "Навожу порядок в данных",
  "Готовлю следующий полезный шаг",
];

function RouteMap({ route }) {
  const mapElementRef = useRef(null);
  const mapInstanceRef = useRef(null);
  useEffect(() => {
    if (!mapElementRef.current || !route?.mapLocations?.length) return undefined;
    const locations = route.mapLocations;
    const selectedId = route.selectedLocationId;
    const map = L.map(mapElementRef.current, {
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: false,
    });
    mapInstanceRef.current = map;
    L.control.zoom({ position: "bottomright" }).addTo(map);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      // attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);
    const bounds = L.latLngBounds(locations.map((location) => [location.lat, location.lon]));
    locations.forEach((location) => {
      const selected = location.id === selectedId;
      const icon = L.divIcon({
        className: "campus-marker-wrapper",
        html: `<span class="campus-marker${selected ? " is-selected" : ""}">${location.id}</span>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });
      L.marker([location.lat, location.lon], { icon, title: location.title })
        .addTo(map)
        .bindTooltip(location.title, { direction: "top", offset: [0, -14] });
    });
    if (locations.length === 1) {
      map.setView([locations[0].lat, locations[0].lon], 17);
    } else {
      map.fitBounds(bounds, { padding: [28, 28], maxZoom: 17 });
    }
    window.setTimeout(() => map.invalidateSize(), 0);
    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [route]);
  return <div className="route-map-viewport" ref={mapElementRef} aria-label={`Карта: ${route.title}`} />;
}

function AssistantOverlay({ standalone = false }) {
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [isPreloading, setIsPreloading] = useState(standalone);
  const [onboarding, setOnboarding] = useState(
    () => localStorage.getItem("assistant-onboarding-done") !== "true",
  );
  const [checklist, setChecklist] = useState(checklistSeed);
  const [activeAction, setActiveAction] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [thinkingText, setThinkingText] = useState(thinkingPhrases[0]);
  const [typingMessage, setTypingMessage] = useState(null);
  const chatScrollRef = useRef(null);
  const completedCount = checklist.filter((item) => item.done).length;
  const progress = Math.round((completedCount / checklist.length) * 100);
  const replies = useMemo(
    () => ({
      schedule:
        "Ближайшее занятие — завтра в 09:00. Группа ИТ-214, корпус А, аудитория АВ1502. Могу открыть маршрут.",
      room: "Аудитория АВ4002 находится в корпусе АВ, 4 этаж. Для маршрута использую карту учебных корпусов.",
      news: "Нашла 3 новых материала. Покажу краткую выжимку и ссылки на первоисточники, чтобы можно было проверить детали.",
      message:
        "Подготовлю черновик. Сначала уточню адресата и тему обращения, а перед отправкой покажу полный текст.",
    }),
    [],
  );
  useEffect(() => {
    if (assistantOpen && onboarding) setActiveAction(null);
  }, [assistantOpen, onboarding]);
  useEffect(() => {
    if (!standalone) return undefined;
    const timer = window.setTimeout(() => {
      setIsPreloading(false);
      setAssistantOpen(true);
    }, 1800);
    return () => window.clearTimeout(timer);
  }, [standalone]);
  useEffect(() => {
    if (!typingMessage) return undefined;
    if (typingMessage.index >= typingMessage.text.length) {
      setMessages((current) => [
        ...current,
        {
          from: "assistant",
          text: typingMessage.text,
          route: typingMessage.route ?? null,
        },
      ]);
      setTypingMessage(null);
      return undefined;
    }
    const timer = window.setTimeout(() => {
      setTypingMessage((current) =>
        current ? { ...current, index: current.index + 1 } : current,
      );
    }, 18);
    return () => window.clearTimeout(timer);
  }, [typingMessage]);
  useEffect(() => {
    const scrollContainer = chatScrollRef.current;
    if (!scrollContainer) return;
    scrollContainer.scrollTop = scrollContainer.scrollHeight;
  }, [assistantOpen, messages, typingMessage, isThinking, activeAction]);
  const finishOnboarding = () => {
    localStorage.setItem("assistant-onboarding-done", "true");
    setOnboarding(false);
    setMessages([
      {
        from: "assistant",
        text: "Готово. Теперь я могу помочь с расписанием, аудиториями, новостями и обращениями.",
      },
    ]);
  };
  const toggleChecklist = (id) =>
    setChecklist((items) =>
      items.map((item) =>
        item.id === id ? { ...item, done: !item.done } : item,
      ),
    );
  const buildMapUrl = (campus, location) => {
    if (!location) return null;
    const pad = 0.0018;
    const bbox = `${(location.lon - pad).toFixed(6)}%2C${(location.lat - pad).toFixed(6)}%2C${(location.lon + pad).toFixed(6)}%2C${(location.lat + pad).toFixed(6)}`;
    return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${location.lat}%2C${location.lon}`;
  };
  const getCampusLocation = (campus, roomNumber, buildingId = null) => {
    if (!campus.locations?.length) return null;
    if (campus.locations.length === 1) return campus.locations[0];
    const requestedId = buildingId ?? roomNumber?.charAt(0);
    return campus.locations.find((location) => location.id === requestedId) ?? null;
  };
  const buildRouteCard = (room) => {
    const navigationPrefix = {
      ав: "av",
      пр: "pr",
      пк: "pk",
      а: "a",
      б: "b",
      в: "v",
      н: "n",
      нд: "nd",
    }[room.prefix] ?? room.prefix;
    const location = getCampusLocation(room.campus, room.number);
    return {
      title: `Маршрут до ${room.code}`,
      details: `${room.campus.title}${location ? ` · ${location.title}` : ""}`,
      url: `https://mpunav.ru/?space=${navigationPrefix}-${room.number}`,
      mapUrl: buildMapUrl(room.campus, location),
      mapLocations: room.campus.locations ?? [],
      selectedLocationId: location?.id ?? null,
      address: `${room.campus.address}${location ? ` · ${location.title}` : ""}`,
    };
  };
  const buildCampusRoute = (campus, buildingId) => {
    const location = getCampusLocation(campus, null, buildingId);
    if (!location) return null;
    return {
      title: `${campus.title} — ${location.title}`,
      details: location.title,
      url: `https://www.openstreetmap.org/?mlat=${location.lat}&mlon=${location.lon}#map=19/${location.lat}/${location.lon}`,
      mapUrl: buildMapUrl(campus, location),
      mapLocations: campus.locations ?? [],
      selectedLocationId: location.id,
      address: `${campus.address} · ${location.title}`,
    };
  };
  const resolveUserRequest = (value) => {
    const query = normalizeQuery(value);
    const room = extractRoom(query);
    if (room) {
      const location = getCampusLocation(room.campus, room.number);
      const buildingLabel = location?.title?.replace("корпус ", "корпуса ") ?? room.campus.buildings;
      const campusName = room.campus.title.replace(/^Кампус на /, "");
      return {
        reply: `Аудитория ${room.code} находится в здании ${buildingLabel} на ${campusName}. Вот он на карте:`,
        route: buildRouteCard(room),
      };
    }
    const campus = findCampus(query);
    const buildingId = extractBuilding(query);
    if (campus && buildingId) {
      const route = buildCampusRoute(campus, buildingId);
      return {
        reply: route
          ? `${campus.title}, ${route.details}. Адрес: ${campus.address}. Показываю нужный корпус на карте.`
          : `${campus.title} находится по адресу ${campus.address}. Для этого кампуса доступны: ${campus.buildings}.`,
        route,
      };
    }
    if (campus) {
      return {
        reply: `${campus.title} находится по адресу ${campus.address}. ${campus.buildings}. ${campus.locations ? `Можно уточнить корпус: ${campus.locations.map((location) => location.title).join(", ")}.` : ""}`,
        route: null,
      };
    }
    if (/(корпус|корпуса|адрес|кампус|автозаводск|семеновск|михалковск|прянишников|корчагин|где наход|как добрат|как доех|как пройти)/i.test(query)) {
      return {
        reply: `Адреса корпусов Московского Политеха:\n\n• ${campusDirectory[0].title}: ${campusDirectory[0].address}. Корпуса: ${campusDirectory[0].buildings}.\n• ${campusDirectory[1].title}: ${campusDirectory[1].address}. ${campusDirectory[1].buildings}.\n• ${campusDirectory[2].title}: ${campusDirectory[2].address}. ${campusDirectory[2].buildings}.\n• ${campusDirectory[3].title}: ${campusDirectory[3].address}. ${campusDirectory[3].buildings}.\n• ${campusDirectory[4].title}: ${campusDirectory[4].address}.`,
        route: null,
      };
    }
    if (/(расписан|заняти|пара|урок|групп|дисциплин|во сколько|когда следующ)/i.test(query)) {
      return { reply: replies.schedule, route: null };
    }
    if (/(новост|приказ|объявлен|событи|меропр|что нового)/i.test(query)) {
      return { reply: replies.news, route: null };
    }
    if (/(телефон|тел|контакт|почт|email|e-mail|приемн|приёмн)/i.test(query)) {
      return {
        reply: "Могу помочь найти контакты приёмной комиссии, деканата или другого подразделения. Уточните, какой именно контакт нужен.",
        route: null,
      };
    }
    if (/(часы|время работы|работает|открыт|закрыт)/i.test(query)) {
      return {
        reply: "Уточните подразделение или корпус — тогда я смогу подобрать часы работы. Например: «часы работы приёмной комиссии». ",
        route: null,
      };
    }
    if (/(написать|сообщен|сотрудник|куратор|обращен|задать вопрос)/i.test(query)) {
      return { reply: replies.message, route: null };
    }
    if (/(помощ|умееш|можеш|что ты|как пользоваться|подскажи)/i.test(query)) {
      return {
        reply: "Я понимаю запросы про расписание, корпуса и адреса, аудитории и маршруты, новости, приказы, контакты и обращения. Можно написать «ПР0000», «где корпус 4 на Автозаводской», «адрес Павла Корчагина» или «телефон приёмной».",
        route: null,
      };
    }
    return {
      reply: "Я не нашёл точного совпадения. Попробуйте указать аудиторию (например, ПР0000 или ПК000), улицу, номер корпуса либо тему: расписание, новости, контакты или обращение.",
      route: null,
    };
  };
  const respondAfterThinking = (reply, route = null) => {
    setThinkingText(
      thinkingPhrases[Math.floor(Math.random() * thinkingPhrases.length)],
    );
    setIsThinking(true);
    window.setTimeout(() => {
      setTypingMessage({ text: reply, index: 0, route });
      setIsThinking(false);
    }, 900);
  };
  const runQuickAction = (id, label, prompt) => {
    setActiveAction(id);
    setMessages((current) => [...current, { from: "user", text: prompt }]);
    const result = id === "room"
      ? resolveUserRequest(prompt)
      : { reply: replies[id] || `Открываю действие «${label}».`, route: null };
    respondAfterThinking(result.reply, result.route);
  };
  const sendMessage = (event) => {
    event.preventDefault();
    const value = draft.trim();
    if (!value) return;
    setMessages((current) => [...current, { from: "user", text: value }]);
    setDraft("");
    const result = resolveUserRequest(value);
    respondAfterThinking(result.reply, result.route);
  };

  return (
    <>
      {standalone && isPreloading && (
        <div className="assistant-preloader" role="status" aria-live="polite">
          <video
            className="preloader-video"
            src="/assets/assistant-button-motion.mp4"
            poster="/assets/assistant-button-placeholder.gif"
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            aria-hidden="true"
          />
        </div>
      )}
      {!standalone && (
        <button
          className={`assistant-launcher ${assistantOpen ? "is-open" : ""}`}
          aria-label="Открыть Выход"
          onClick={() => setAssistantOpen((value) => !value)}
        >
          <video
            className="launcher-video"
            src="/assets/assistant-button-motion.mp4"
            poster="/assets/assistant-button-placeholder.gif"
            autoPlay
            loop
            muted
            playsInline
            aria-hidden="true"
          />
        </button>
      )}
      {assistantOpen && (
        <>
          {!standalone && (
            <button
              className="assistant-backdrop"
              aria-label="Закрыть чат"
              onClick={() => setAssistantOpen(false)}
            />
          )}
          <div
            className={`assistant-overlay ${standalone ? "standalone-overlay" : ""}`}
            role="dialog"
            aria-label={standalone ? "Самостоятельный ассистент Выход" : "Выход личного кабинета"}
          >
            <div className="assistant-header">
              <div className="assistant-identity">
                <div className="assistant-avatar">
                  <video
                    className="avatar-video"
                    src="/assets/assistant-button-motion.mp4"
                    autoPlay
                    loop
                    muted
                    playsInline
                    aria-hidden="true"
                  />
                </div>
                <div>
                  <strong>Выход</strong>
                </div>
              </div>
              {!standalone && (
                <button
                  className="close-button"
                  onClick={() => setAssistantOpen(false)}
                  aria-label="Закрыть"
                >
                  ×
                </button>
              )}
            </div>
            {onboarding ? (
              <div className="onboarding-view">
                <div
                  className="onboarding-animation"
                  aria-label="Слот для onboarding-анимации"
                >
                  <div className="animation-ring ring-a" />
                  <div className="animation-ring ring-b" />
                  <div className="animation-core">AI</div>
                </div>
                <p className="eyebrow">ПЕРВЫЙ ЗАПУСК</p>
                <h2>Начнём с главного</h2>
                <p className="onboarding-copy">
                  Я помогу пройти базовые шаги первокурсника, найти нужную
                  информацию и подготовить обращение, если ответа нет.
                </p>
                <div className="progress-label">
                  <span>Чек-лист первокурсника</span>
                  <strong>
                    {completedCount}/{checklist.length}
                  </strong>
                </div>
                <div className="progress-track">
                  <span style={{ width: `${progress}%` }} />
                </div>
                <div className="checklist">
                  {checklist.map((item) => (
                    <button
                      className={`checklist-item ${item.done ? "done" : ""}`}
                      key={item.id}
                      onClick={() => toggleChecklist(item.id)}
                    >
                      <span className="check-circle">
                        {item.done ? "✓" : ""}
                      </span>
                      <span className="check-text">
                        <strong>{item.title}</strong>
                        <small>{item.hint}</small>
                      </span>
                      <span className="item-tag">{item.tag}</span>
                    </button>
                  ))}
                </div>
                <button className="primary-button" onClick={finishOnboarding}>
                  {completedCount === checklist.length
                    ? "Завершить онбординг"
                    : "Продолжить позже"}
                  <span>→</span>
                </button>
                <button className="skip-button" onClick={finishOnboarding}>
                  Пропустить и перейти в чат
                </button>
              </div>
            ) : (
              <div className="chat-view">
                <div className="chat-scroll" ref={chatScrollRef}>
                  <div className="assistant-intro">
                    <div className="mini-avatar">A</div>
                    <div>
                      <strong>Привет, Вадим! Я твой Выход. Чем могу тебе помочь?</strong>
                    </div>
                  </div>
                  {messages.map((message, index) => (
                    <div
                      className={`message-row ${message.from}`}
                      key={`${message.from}-${index}`}
                    >
                      <div className="message-bubble">
                        {message.text}
                        {message.route?.mapLocations?.length > 0 && (
                          <RouteMap route={message.route} />
                        )}
                        {message.route?.address && (
                          <small className="route-map-address">
                            {message.route.address}
                          </small>
                        )}
                        {message.from === "assistant" && (
                          <small className="source-note">
                            Источник: личный кабинет · проверено сейчас
                          </small>
                        )}
                      </div>
                      {message.route && (
                        <a
                          className="route-preview"
                          href={message.route.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <span className="route-icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24" focusable="false">
                              <path d="M12 21s7-6.1 7-12A7 7 0 0 0 5 9c0 5.9 7 12 7 12Z" />
                              <circle cx="12" cy="9" r="2.4" />
                            </svg>
                          </span>
                          <span>
                            <strong>{message.route.title}</strong>
                            <small>{message.route.details}</small>
                          </span>
                          <b>→</b>
                        </a>
                      )}
                    </div>
                  ))}
                  {typingMessage && (
                    <div className="message-row assistant is-typing">
                      <div className="message-bubble">
                        {typingMessage.text.slice(0, typingMessage.index)}
                        <span className="typing-caret" aria-hidden="true" />
                      </div>
                    </div>
                  )}
                  {isThinking && (
                    <div className="thinking-indicator" aria-live="polite">
                      <span className="thinking-mark" aria-hidden="true">
                        <i />
                        <i />
                        <i />
                      </span>
                      <span>
                        <strong>{thinkingText}</strong>
                        <small>Выход собирает ответ</small>
                      </span>
                    </div>
                  )}
                </div>
                <div className="quick-actions">
                  <span className="quick-label">Быстрые действия</span>
                  <div className="quick-grid">
                    {quickActions.map(([id, label, prompt]) => (
                      <button
                        key={id}
                        className="quick-button"
                        onClick={() => runQuickAction(id, label, prompt)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <form className="chat-form" onSubmit={sendMessage}>
                  <button
                    type="button"
                    className="attach-button"
                    aria-label="Прикрепить файл"
                  >
                    +
                  </button>
                  <input
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder="Введите запрос"
                    aria-label="Сообщение ассистенту"
                  />
                  <button type="submit" aria-label="Отправить">
                    ➤
                  </button>
                </form>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}

function ModePicker({ onSelect }) {
  return (
    <main className="mode-picker">
      <section className="mode-picker-card">
        <div className="mode-picker-intro">
          <span className="mode-picker-kicker">ПРОТОТИП «ВЫХОД»</span>
          <h1>Как запустить ассистента?</h1>
          <p>Выберите сценарий. Оба варианта используют одного ассистента, но работают в разных окружениях.</p>
        </div>
        <div className="mode-options">
          <button className="mode-card" onClick={() => onSelect("cabinet")}>
            <span className="mode-card-number">01</span>
            <span className="mode-card-copy">
              <strong>В личном кабинете</strong>
              <small>Ассистент поверх действующего кабинета Московского Политеха.</small>
            </span>
            <b aria-hidden="true">→</b>
          </button>
          <button className="mode-card mode-card-accent" onClick={() => onSelect("standalone")}>
            <span className="mode-card-number">02</span>
            <span className="mode-card-copy">
              <strong>Самостоятельный режим</strong>
              <small>Отдельное рабочее пространство без iframe и фонового кабинета.</small>
            </span>
            <b aria-hidden="true">→</b>
          </button>
        </div>
        <p className="mode-picker-note">В самостоятельном режиме ассистент запускается автоматически после короткого preloader-экрана.</p>
      </section>
    </main>
  );
}

const isFirefox =
  typeof navigator !== "undefined" && /Firefox/i.test(navigator.userAgent);
const cabinetFrameSource = "https://e.mospolytech.ru/#/home";

function CabinetMode({ onChangeMode }) {
  return (
    <main className="app-shell cabinet-shell">
      {isFirefox ? (
        <div
          className="firefox-cabinet-background"
          role="img"
          aria-label="Снимок личного кабинета Московского Политеха"
        />
      ) : (
        <iframe
          className="cabinet-frame"
          title="Личный кабинет Московского Политеха"
          src={cabinetFrameSource}
          loading="eager"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      )}
      <button className="mode-switch-button" onClick={onChangeMode}>Выбрать режим</button>
      <AssistantOverlay />
    </main>
  );
}

function StandaloneMode({ onChangeMode }) {
  return (
    <main className="app-shell standalone-shell">
      <button className="mode-switch-button standalone-mode-switch" onClick={onChangeMode}>
        Выбрать режим
      </button>
      <AssistantOverlay standalone />
    </main>
  );
}

function App() {
  const initialMode = new URLSearchParams(window.location.search).get("mode");
  const [mode, setMode] = useState(
    initialMode === "cabinet" || initialMode === "standalone" ? initialMode : null,
  );
  const selectMode = (nextMode) => {
    const url = new URL(window.location.href);
    url.searchParams.set("mode", nextMode);
    window.history.replaceState({}, "", url);
    setMode(nextMode);
  };
  const chooseAgain = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete("mode");
    window.history.replaceState({}, "", url);
    setMode(null);
  };

  if (!mode) return <ModePicker onSelect={selectMode} />;
  return mode === "cabinet"
    ? <CabinetMode onChangeMode={chooseAgain} />
    : <StandaloneMode onChangeMode={chooseAgain} />;
}
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
