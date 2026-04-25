import React, { useState, useEffect, useRef, useCallback } from "react";
import { storage } from "./storage.js";

// ============================================================
// FONTS & GLOBAL STYLES
// ============================================================
const GlobalStyles = () => (
  <style>{`
    * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
    html, body, #root { margin: 0; padding: 0; min-height: 100%; }
    body {
      font-family: 'Verlag', 'Verlag A', 'Verlag B', 'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif;
      font-weight: 400;
      color: #000;
      background: #f2ecff;
      overscroll-behavior: none;
    }
    body.dark { background: #050505; color: #fff; }
    /* Wrap the entire app in a horizontal overflow guard rather than the body,
       so internal horizontal scroll containers (sunset widget tiles) still work on iOS. */
    .app-shell { overflow-x: clip; }

    /* Headings: Verlag Black, uppercase */
    .font-display {
      font-family: 'Verlag Black', 'Verlag A', 'Verlag B', 'Verlag', 'Montserrat', sans-serif;
      font-weight: 900;
      text-transform: uppercase;
    }
    /* Labels / metadata — same family, bolder + tracked */
    .font-mono {
      font-family: 'Verlag', 'Verlag A', 'Verlag B', 'Montserrat', sans-serif;
      font-weight: 700;
      letter-spacing: 0.12em;
    }

    /* ==========================================================
       ANIMATED FLOATING GRADIENT BACKGROUND
       ========================================================== */
    .bg-stage {
      position: fixed;
      inset: 0;
      z-index: -1;
      overflow: hidden;
      pointer-events: none;
    }
    .blob {
      position: absolute;
      border-radius: 50%;
      filter: blur(90px);
      opacity: 0.85;
      will-change: transform;
    }
    /* Mobile: heavier blur is washed-out by mobile GPUs, and tall portrait viewports
       leave the corners sparse. Tighten blur and scale up coverage. */
    @media (max-width: 768px) {
      .blob { filter: blur(50px); opacity: 1; }
    }
    .blob-1 { width: 70vmax; height: 70vmax; background: #7ef7ff; top: -30vmax; left: -25vmax; animation: floatA 32s ease-in-out infinite alternate; }
    .blob-2 { width: 60vmax; height: 60vmax; background: #ffc2ce; top: -20vmax; right: -25vmax; animation: floatB 38s ease-in-out infinite alternate; }
    .blob-3 { width: 65vmax; height: 65vmax; background: #9080ff; bottom: -25vmax; left: -20vmax; animation: floatC 30s ease-in-out infinite alternate; }
    .blob-4 { width: 55vmax; height: 55vmax; background: #e872f5; bottom: -15vmax; right: -20vmax; animation: floatD 34s ease-in-out infinite alternate; }
    .blob-5 { width: 48vmax; height: 48vmax; background: #ffd0dc; top: 30vmax; left: 25vmax; animation: floatE 26s ease-in-out infinite alternate; }

    @keyframes floatA {
      0% { transform: translate(0,0) scale(1); }
      50% { transform: translate(25vmax, 20vmax) scale(1.15); }
      100% { transform: translate(10vmax, 45vmax) scale(0.9); }
    }
    @keyframes floatB {
      0% { transform: translate(0,0) scale(1); }
      50% { transform: translate(-30vmax, 25vmax) scale(1.2); }
      100% { transform: translate(-5vmax, 50vmax) scale(0.85); }
    }
    @keyframes floatC {
      0% { transform: translate(0,0) scale(1); }
      50% { transform: translate(25vmax, -20vmax) scale(1.15); }
      100% { transform: translate(-10vmax, -40vmax) scale(0.95); }
    }
    @keyframes floatD {
      0% { transform: translate(0,0) scale(1); }
      50% { transform: translate(-25vmax, -25vmax) scale(1.1); }
      100% { transform: translate(10vmax, -10vmax) scale(1.3); }
    }
    @keyframes floatE {
      0% { transform: translate(0,0) scale(1); }
      50% { transform: translate(-30vmax, -15vmax) scale(1.25); }
      100% { transform: translate(20vmax, 25vmax) scale(0.8); }
    }
    body.dark .blob { opacity: 0.18; filter: blur(140px); }
    @media (max-width: 768px) {
      body.dark .blob { filter: blur(80px); opacity: 0.25; }
    }

    @media (prefers-reduced-motion: reduce) {
      .blob { animation: none !important; }
    }
    .bg-stage-static .blob { animation: none !important; }

    /* ==========================================================
       DARK MODE OVERRIDES — gradient UI over black
       ========================================================== */
    :root {
      --grad: linear-gradient(135deg, #7ef7ff 0%, #ffc2ce 25%, #e872f5 50%, #9080ff 75%, #7ef7ff 100%);
    }

    body.dark .border-black {
      border-color: transparent;
      border-image: var(--grad) 1;
    }
    body.dark .border-dashed { border-style: dashed; }
    body.dark .border-black\\/20 { border-color: rgba(255,255,255,0.25); }
    body.dark .border-white { border-color: #fff; }

    body.dark .bg-black { background: var(--grad); color: #000; }
    body.dark .text-black { color: #fff; }
    body.dark .text-white { color: #000; }

    body.dark .hover\\:bg-black:hover { background: var(--grad); color: #000; }
    body.dark .hover\\:text-white:hover { color: #000; }
    body.dark .hover\\:bg-black\\/5:hover { background: rgba(255,255,255,0.06); }

    body.dark .bg-white { background: rgba(255,255,255,0.08); }
    body.dark .bg-white\\/40 { background: rgba(255,255,255,0.1); }
    body.dark .bg-white\\/50 { background: rgba(255,255,255,0.12); }
    body.dark .bg-white\\/60 { background: rgba(255,255,255,0.15); }
    .holo-bg-contained {
      background: rgba(255, 255, 255, 0.75);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
    }
    body.dark .holo-bg-contained {
      background: rgba(5, 5, 5, 0.9);
    }

    body.dark input, body.dark textarea, body.dark select { color: #fff; }
    body.dark .placeholder\\:text-black\\/40::placeholder { color: rgba(255,255,255,0.4); }

    input, textarea, select, button { font-family: inherit; }
    input:focus, textarea:focus, select:focus { outline: none; }

    .no-scrollbar::-webkit-scrollbar { display: none; }
    .no-scrollbar { scrollbar-width: none; }

    .fade-in { animation: fadeIn 0.3s ease; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }

    .drawer-enter { animation: drawerIn 0.25s ease; }
    @keyframes drawerIn { from { transform: translateX(100%); } to { transform: translateX(0); } }

    .prose-simple p { margin: 0 0 0.75em 0; }
    .prose-simple p:last-child { margin-bottom: 0; }
    .prose-simple strong { font-weight: 700; }
    .prose-simple em { font-style: italic; }

    .spinner {
      width: 24px; height: 24px;
      border: 2px solid currentColor; border-top-color: transparent;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Gradient text utility */
    .grad-text {
      background: var(--grad);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
    }
  `}</style>
);

// Animated background wrapper — 5 floating blurred blobs
const AnimatedBackground = ({ animated = true }) => (
  <div className={`bg-stage ${animated ? "" : "bg-stage-static"}`} aria-hidden>
    <div className="blob blob-1" />
    <div className="blob blob-2" />
    <div className="blob blob-3" />
    <div className="blob blob-4" />
    <div className="blob blob-5" />
  </div>
);

// ============================================================
// LOGO
// ============================================================
const Logo = ({ className = "", style = {} }) => (
  <svg
    className={className}
    style={style}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 263.98 168.76"
    fill="currentColor"
  >
    <g>
      <polygon points="101.24 33.24 97.2 55.66 105.96 55.51 101.24 33.24" />
      <path d="M0,44.89l21.86,42.7,217.11-2.19.53-9.41-21.14-5.54h21.86L245.74,0,21.86,4.37,0,44.89ZM188.86,12.27c6.46-.11,11.36,1.76,14.71,5.61,3.35,3.85,5.08,8.75,5.18,14.7.1,5.66-1.39,10.58-4.46,14.74-3.07,4.16-7.5,6.29-13.28,6.39-1.02.02-1.78,0-2.3-.04l.37,21.41-8.84.15-1.07-62.11c2.82-.5,6.05-.78,9.67-.85ZM129.62,13.71l4.5-.16,14.01,34.01,12.24-34.46h4.5s2.6,62.34,2.6,62.34l-8.67.15-1.13-35.85-8.5,24.71-1.87.03-9.77-24.65.2,36.12-8.5.15.37-62.39ZM98.01,13.92l5.95-.1,15.86,62.45-8.84.15-3.2-13.12-12.15.21-2.75,13.22-8.58.15,13.7-62.96ZM51.98,23.17c3.47-6.04,8-9.1,13.61-9.2,3.62-.06,6.96,1.04,10,3.31l-3.44,7.37c-2.18-1.66-4.32-2.47-6.42-2.44-2.83.05-5.17,2.18-7.03,6.41-1.85,4.22-2.72,9.93-2.59,17.13.13,7.7,1.23,13.65,3.28,17.83,2.06,4.19,4.61,6.25,7.67,6.2,2.04-.03,4.04-.89,5.99-2.57l3.35,7.17c-3.13,2.43-6.45,3.68-9.96,3.74-5.32.09-9.85-2.66-13.57-8.27-3.72-5.6-5.67-13.33-5.84-23.19-.17-9.63,1.48-17.46,4.95-23.5Z" />
      <path d="M190.71,45.89c2.89-.05,5.15-1.21,6.78-3.47,1.63-2.27,2.41-5.44,2.34-9.52-.07-4.02-.97-7.14-2.71-9.34-1.74-2.21-4.02-3.29-6.85-3.24-.17,0-.88.07-2.12.21l.44,25.23c.91.1,1.62.14,2.13.13Z" />
      <path d="M69.56,136.23c-1.42.05-2.58.14-3.49.28l.3,9.28c1.31.07,2.61.08,3.88.04,4.62-.15,6.88-1.82,6.78-5.03-.1-3.2-2.59-4.72-7.47-4.57Z" />
      <path d="M69.3,129.96c4.48-.14,6.66-1.73,6.57-4.75-.04-1.27-.59-2.3-1.66-3.09-1.06-.78-2.54-1.15-4.43-1.09-1.27.04-2.67.21-4.19.52l.27,8.35c1.06.08,2.21.09,3.44.05Z" />
      <polygon points="104.75 137.88 112.66 137.63 108.42 128.15 104.75 137.88" />
      <path d="M205.71,128.55c-.86.03-1.49.54-1.91,1.55-.42,1-.6,2.35-.55,4.03.05,1.49.31,2.76.78,3.8.47,1.05,1.11,1.56,1.92,1.53.83-.03,1.43-.57,1.82-1.63.38-1.06.55-2.39.5-3.98-.05-1.56-.29-2.84-.71-3.84-.42-1-1.04-1.49-1.84-1.46Z" />
      <path d="M33.52,100.24l-.32,5.23,13.85,4.58h-14.57l-5.51,58.7,191.1-4.37,21.86-33.17-21.86-37.54-184.54,6.56ZM82.71,149.96c-3.04,2.36-7.41,3.63-13.12,3.81-3.6.12-7.59-.03-11.98-.43l-1.26-39.08c3.84-.71,7.56-1.12,11.16-1.24,5.53-.18,9.87.73,13.01,2.72,3.14,1.99,4.76,4.48,4.86,7.46.13,4.04-2.07,7.08-6.59,9.12,5.4,1.43,8.18,4.47,8.33,9.13.11,3.31-1.36,6.14-4.4,8.5ZM119.07,151.79l-3.24-7.16-13.81.45-2.77,7.36-9.44.31,17.53-40.94,1.26-.04,20.13,39.72-9.66.31ZM160.49,146.76c-2.89,2.99-7.06,4.57-12.52,4.75-5.42.17-9.62-1.13-12.58-3.91-2.97-2.78-4.54-6.94-4.72-12.47l-.77-23.74,9.28-.3.75,23.09c.2,6.08,2.86,9.03,7.99,8.87,5.09-.17,7.54-3.28,7.35-9.36l-.75-23.09,9.28-.3.77,23.74c.18,5.49-1.18,9.74-4.07,12.73ZM183.83,142.93l-.15-2.23c2.19-3.98,4.04-7.67,5.54-11.07,1.3-2.88,1.92-5.08,1.87-6.62-.04-1.12-.31-1.99-.82-2.61-.51-.62-1.19-.91-2.05-.89-1.07.03-2.23.63-3.46,1.8l-1.88-2.65c1.85-1.75,3.78-2.65,5.78-2.72,1.78-.06,3.25.5,4.4,1.67s1.76,2.76,1.82,4.76c.08,2.37-.73,5.3-2.43,8.8-.43.89-1.81,3.6-4.14,8.13l7.14-.23.11,3.48-11.75.38ZM210.64,139.84c-1.05,1.78-2.58,2.7-4.58,2.77-1.95.06-3.53-.74-4.73-2.41-1.2-1.67-1.85-3.96-1.95-6.87-.11-3.49.52-6.82,1.9-9.98,1.38-3.16,3.57-5.86,6.57-8.11l2.1,2.57c-3.29,2.67-5.5,6.02-6.64,10.04.85-1.54,1.98-2.34,3.37-2.38,1.66-.05,2.96.69,3.9,2.24.94,1.55,1.45,3.45,1.52,5.73.08,2.49-.41,4.63-1.46,6.41Z" />
      <polygon points="249.19 2.05 251.23 2.05 251.23 13.27 253.07 13.27 253.07 2.05 255.11 2.05 255.11 .34 249.19 .34 249.19 2.05" />
      <polygon points="263.67 .32 262.73 .31 260.07 7.42 257.28 .31 256.35 .32 256.05 13.27 257.81 13.27 257.9 5.78 259.84 10.93 260.23 10.93 262.08 5.83 262.18 13.27 263.98 13.27 263.67 .32" />
    </g>
  </svg>
);

// ============================================================
// UTILS
// ============================================================
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

const resizeImage = (file, maxSize = 1000) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > height && width > maxSize) { height = (height / width) * maxSize; width = maxSize; }
      else if (height > maxSize) { width = (width / height) * maxSize; height = maxSize; }
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = reject;
    img.src = e.target.result;
  };
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

const formatDate = (date, time) => {
  if (!date) return "";
  const d = new Date(date + (time ? "T" + time : "T00:00"));
  if (isNaN(d)) return date;
  const opts = { day: "2-digit", month: "short", year: "numeric" };
  let str = d.toLocaleDateString("pl-PL", opts);
  if (time) str += ` · ${time.slice(0, 5)}`;
  return str;
};

// ============================================================
// SEED DEMO DATA (runs once)
// ============================================================
const seedDemoData = async () => {
  try {
    const flag = await storage.get("seeded:v1");
    if (flag) return;

    // Sample users
    const sampleUsers = [
      { username: "marek", firstName: "Marek", lastName: "Nowak" },
      { username: "ania", firstName: "Ania", lastName: "Kowalska" },
      { username: "piotr", firstName: "Piotr", lastName: "Wiśniewski" },
      { username: "kasia", firstName: "Kasia", lastName: "Lewandowska" },
    ];
    for (const u of sampleUsers) {
      const exists = await storage.get("user:" + u.username);
      if (!exists) {
        await storage.set("user:" + u.username, {
          id: u.username, username: u.username, password: "kosmos",
          firstName: u.firstName, lastName: u.lastName, profilePicture: null, role: "basic"
        });
      }
    }

    // Cnoty kosmiczne
    const cnoty = [
      { title: "Ciekawość", description: "Zadawaj pytania. Dziw się światu. Otwórz się na to, czego jeszcze nie rozumiesz — tam zaczyna się podróż." },
      { title: "Otwartość", description: "Spotkaj drugą osobę bez z góry przygotowanej odpowiedzi. Pozwól, żeby zaskoczyła cię inaczej, niż się spodziewasz." },
      { title: "Wspólnota", description: "Tu nie ma widzów. Każdy z nas współtworzy to miejsce.\n\n**Dbaj o innych tak, jak chciałbyś, żeby dbano o ciebie.**" },
      { title: "Zachwyt", description: "Nie zapominaj podnosić głowy. Nocne niebo, poranna mgła, nagły śmiech przyjaciela — to wszystko jest festiwalem." },
      { title: "Hojność", description: "Podziel się jedzeniem, czasem, uwagą. Najlepsze rzeczy dzieją się wtedy, gdy dajemy więcej, niż musimy." },
      { title: "Obecność", description: "Schowaj telefon. Bądź tu, gdzie jesteś. *To wszystko dzieje się tylko teraz — i tylko raz.*" },
    ];
    for (let i = 0; i < cnoty.length; i++) {
      const id = "seed-cnota-" + i;
      await storage.set("cnota:" + id, { id, order: i, ...cnoty[i] });
    }

    // Stacje kosmiczne
    const stacje = [
      { sid: "seed-s1", title: "Strefa Chill", description: "Poduchy, koce, cisza. Miejsce, żeby zwolnić między wydarzeniami. Zagaduj innych tylko wtedy, gdy wyraźnie mają na to ochotę.", visibility: "public", owners: ["ania"], createdBy: "ania" },
      { sid: "seed-s2", title: "Warsztat dźwięku", description: "Misy tybetańskie, gongi, drumle. Przynieś ze sobą coś, co brzmi — albo po prostu przyjdź posłuchać.", visibility: "public", owners: ["piotr"], createdBy: "piotr", date: "2026-06-20", time: "16:00" },
      { sid: "seed-s3", title: "Ceremonia herbaty", description: "Wolne parzenia, oolongi i shou pu-erhy. Sesja trwa około godziny. Maks. 12 osób — zapisuj się u Kasi.", visibility: "public", owners: ["kasia", "marek"], createdBy: "kasia", date: "2026-06-21", time: "10:30" },
      { sid: "seed-s4", title: "Nocne obserwacje", description: "Teleskop stawiamy po zmierzchu, w łące za namiotami. Ciepłe ubranie i latarka z czerwonym filtrem mile widziane.", visibility: "public", owners: ["marek"], createdBy: "marek", date: "2026-06-20", time: "22:30" },
      { sid: "seed-s5", title: "Śniadaniowa kawiarnia", description: "Kawa z Chemexa i naleśniki od 8:30. Przyjdź w piżamie, jeśli chcesz.", visibility: "public", owners: ["ania", "kasia"], createdBy: "ania", date: "2026-06-21", time: "08:30" },
      { sid: "seed-s6", title: "Niespodzianka dla gospodarza", description: "Ciiii... tego ma nie widzieć bau.", visibility: "hidden", owners: ["ania", "piotr", "kasia", "marek"], createdBy: "ania" },
    ];
    for (const s of stacje) {
      const { sid, ...rest } = s;
      await storage.set("stacja:" + sid, { id: sid, image: null, date: null, time: null, ...rest });
    }

    // Wydarzenia (festival-wide events)
    const events = [
      { eid: "seed-e1", title: "Otwarcie festiwalu", description: "Zbiórka przy wielkim ognisku. Przedstawiamy siebie, miejsce, plan weekendu. Dla tych, co dojechali wcześniej: grill od 18:00.", date: "2026-06-19", time: "19:00" },
      { eid: "seed-e2", title: "Wspólne śniadanie", description: "Sala wspólna. Każdy przynosi coś do stołu — kawa i owsianka od gospodarza.", date: "2026-06-20", time: "09:00" },
      { eid: "seed-e3", title: "Joga w łące", description: "Delikatna, 60-minutowa sesja dla każdego poziomu. Matę możesz pożyczyć od organizatorów.", date: "2026-06-20", time: "10:30" },
      { eid: "seed-e4", title: "Wspólny obiad", description: "Dania roślinne od kuchni festiwalowej, długi stół, jedna rozmowa na raz.", date: "2026-06-20", time: "14:00" },
      { eid: "seed-e5", title: "Koncert przy ognisku", description: "Gitary, ukulele, śpiewy. Setlista układa się sama. Jeśli grasz — zagraj.", date: "2026-06-20", time: "21:00" },
      { eid: "seed-e6", title: "Closing circle", description: "Ostatnie spotkanie w kręgu. Dzielimy się tym, czego nie chcemy zabrać ze sobą — i tym, co chcemy.", date: "2026-06-21", time: "15:00" },
    ];
    for (const e of events) {
      const { eid, ...rest } = e;
      await storage.set("wydarzenie:" + eid, { id: eid, image: null, ...rest });
    }

    // O Festiwalu sections
    const sections = [
      { icon: "✧", title: "Koncept", content: "Camp Bau to mały, prywatny festiwal dla grupki przyjaciół.\n\nNie organizujemy go dla zysku, nie sprzedajemy biletów, nie zapraszamy gwiazd. Zapraszamy **siebie nawzajem**. To wszystko.\n\nTrzy dni, jedna łąka, jedno niebo." },
      { icon: "☽", title: "Zasady", content: "**1.** Jeśli coś przynosisz, po sobie sprzątasz.\n\n**2.** Każdy pomysł jest dobry, dopóki nie psuje nikomu niczego.\n\n**3.** Telefon w kieszeni, chyba że robisz zdjęcie — wtedy udostępnij grupie.\n\n**4.** Nie musisz nic. Serio, *nic*." },
      { icon: "☄", title: "Co zabrać", content: "Śpiwór, ciepłą bluzę na wieczór, butelkę na wodę, coś do stołu (słodkiego albo słonego, obojętnie).\n\nDla chętnych: instrument, książkę do czytania w cieniu, coś, co chcesz pokazać innym, latarkę czołówkę." },
      { icon: "☉", title: "Jedzenie", content: "Kuchnia festiwalowa gotuje dwa posiłki dziennie — śniadanie i obiad. Kolacja jest wspólna, z tego co przywieziemy.\n\nJest roślinnie. Jeśli masz alergię lub specjalną dietę, napisz do gospodarza przed przyjazdem." },
      { icon: "❂", title: "FAQ", content: "**Czy mogę przyjechać z psem?** Tak, jeśli jest spokojny z ludźmi i innymi zwierzętami.\n\n**Czy będzie prąd?** Tak, ale niezawodnie raczej nie. Powerbank mile widziany.\n\n**Czy będzie sieć?** Słaba. I to jest jedna z najlepszych cech tego miejsca.\n\n**Czy mogę zaprosić znajomego?** Najpierw zapytaj bau." },
    ];
    for (let i = 0; i < sections.length; i++) {
      const id = "seed-sec-" + i;
      await storage.set("fsection:" + id, { id, order: i, photo: null, ...sections[i] });
    }

    // Miejsce
    const existingMiejsce = await storage.get("miejsce");
    if (!existingMiejsce) {
      await storage.set("miejsce", {
        photos: [],
        address: "Siedlisko pod Jarząbkami\nul. Leśna 7, 05-600 Grójec\nMazowsze, Polska",
        mapQuery: "Grójec, Polska",
        lat: 51.8667,
        lng: 20.8667,
        contact: "**bau** (gospodarz): 600 000 000\nEmail: bau@campbau.pl\n\nDojazd: najlepiej samochodem. Z Warszawy ~1h.\nPKP: stacja Grójec + 15 min pieszo."
      });
    }

    await storage.set("seeded:v1", { at: Date.now() });
  } catch (err) {
    console.warn("Seed failed:", err);
  }
};

// ============================================================
// UI PRIMITIVES
// ============================================================
const Button = ({ children, onClick, variant = "filled", className = "", type = "button", disabled, size = "md" }) => {
  const base = "font-display font-semibold uppercase tracking-wide transition-opacity disabled:opacity-40 disabled:cursor-not-allowed";
  const sizes = { sm: "px-4 py-2 text-xs", md: "px-7 py-3.5 text-sm", lg: "px-9 py-4 text-base" };
  const variants = {
    filled: "bg-black text-white border border-black hover:opacity-80",
    outline: "bg-transparent text-black border border-black hover:bg-black hover:text-white",
    ghost: "bg-transparent text-black border border-transparent hover:border-black",
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
};

const Input = ({ label, ...props }) => (
  <label className="block">
    {label && <span className="block font-mono text-xs uppercase tracking-widest mb-1.5">{label}</span>}
    <input {...props}
      className={`w-full bg-transparent border border-black px-4 py-3 text-base placeholder:text-black/40 ${props.className || ""}`} />
  </label>
);

const Textarea = ({ label, ...props }) => (
  <label className="block">
    {label && <span className="block font-mono text-xs uppercase tracking-widest mb-1.5">{label}</span>}
    <textarea {...props} rows={props.rows || 4}
      className={`w-full bg-transparent border border-black px-4 py-3 text-base placeholder:text-black/40 resize-y ${props.className || ""}`} />
  </label>
);

const Select = ({ label, children, ...props }) => (
  <label className="block">
    {label && <span className="block font-mono text-xs uppercase tracking-widest mb-1.5">{label}</span>}
    <select {...props}
      className={`w-full bg-transparent border border-black px-4 py-3 text-base appearance-none cursor-pointer ${props.className || ""}`}>
      {children}
    </select>
  </label>
);

const Card = ({ children, className = "", onClick }) => (
  <div onClick={onClick}
    className={`border border-black ${onClick ? "cursor-pointer hover:bg-black/5" : ""} ${className}`}>
    {children}
  </div>
);

const Modal = ({ open, onClose, title, children, maxWidth = "max-w-lg" }) => {
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className={`holo-bg-contained border border-black w-full ${maxWidth} max-h-[90vh] overflow-y-auto fade-in`} onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-black text-white border-b border-black px-5 py-4 flex items-center justify-between z-10">
          <h2 className="font-display text-lg">{title}</h2>
          <button onClick={onClose} className="text-2xl leading-none p-1" aria-label="Close">✕</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
};

// Global error toast — listens for "storage:error" events from src/storage.js
const ErrorToast = () => {
  const [errors, setErrors] = useState([]);
  useEffect(() => {
    const handler = (e) => {
      const { op, key, message } = e.detail || {};
      const id = Date.now() + Math.random();
      setErrors(es => [...es, { id, op, key, message }]);
      setTimeout(() => setErrors(es => es.filter(x => x.id !== id)), 8000);
    };
    window.addEventListener("storage:error", handler);
    return () => window.removeEventListener("storage:error", handler);
  }, []);
  if (errors.length === 0) return null;
  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-md z-[100] space-y-2 pointer-events-none">
      {errors.map(e => (
        <div key={e.id} className="bg-black text-white border border-black p-3 fade-in pointer-events-auto">
          <div className="font-mono text-[10px] uppercase tracking-widest opacity-70 mb-1">
            Błąd zapisu {e.op && `· ${e.op}`} {e.key && `· ${e.key}`}
          </div>
          <div className="text-sm break-words">{e.message}</div>
        </div>
      ))}
    </div>
  );
};

const ImageUpload = ({ value, onChange, label = "Image", maxSize = 1000 }) => {
  const inputRef = useRef();
  const [loading, setLoading] = useState(false);
  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const dataUrl = await resizeImage(file, maxSize);
      onChange(dataUrl);
    } catch (err) { alert("Błąd wczytywania: " + err.message); }
    setLoading(false);
    e.target.value = "";
  };
  return (
    <div>
      {label && <span className="block font-mono text-xs uppercase tracking-widest mb-1.5">{label}</span>}
      <div className="flex items-start gap-3">
        {value && (
          <div className="relative">
            <img src={value} alt="" className="w-24 h-24 object-cover border border-black" />
            <button type="button" onClick={() => onChange(null)}
              className="absolute -top-2 -right-2 w-6 h-6 bg-black text-white text-xs border border-black flex items-center justify-center">✕</button>
          </div>
        )}
        <div className="flex-1">
          <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
          <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={loading}>
            {loading ? "..." : value ? "Zmień" : "Wybierz plik"}
          </Button>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// SIMPLE MARKDOWN (bold, italic, line breaks)
// ============================================================
const renderRichText = (text) => {
  if (!text) return null;
  const paragraphs = text.split(/\n\n+/);
  return paragraphs.map((para, i) => {
    // Replace **bold** and *italic*
    const parts = [];
    let remaining = para;
    let key = 0;
    const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|\_[^_]+\_)/g;
    let lastIndex = 0;
    let m;
    while ((m = regex.exec(remaining)) !== null) {
      if (m.index > lastIndex) parts.push(remaining.slice(lastIndex, m.index));
      const tok = m[0];
      if (tok.startsWith("**")) parts.push(<strong key={key++}>{tok.slice(2, -2)}</strong>);
      else parts.push(<em key={key++}>{tok.slice(1, -1)}</em>);
      lastIndex = m.index + tok.length;
    }
    if (lastIndex < remaining.length) parts.push(remaining.slice(lastIndex));
    // Preserve line breaks within paragraph
    const withBreaks = [];
    parts.forEach((p, j) => {
      if (typeof p === "string") {
        const lines = p.split("\n");
        lines.forEach((l, k) => {
          withBreaks.push(<span key={`${j}-${k}`}>{l}</span>);
          if (k < lines.length - 1) withBreaks.push(<br key={`br-${j}-${k}`} />);
        });
      } else withBreaks.push(p);
    });
    return <p key={i}>{withBreaks}</p>;
  });
};

// ============================================================
// AUTH: LOGIN VIEW
// ============================================================
const LoginView = ({ onLogin, initError }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const doLogin = async () => {
    if (loading) return;
    setError("");
    setLoading(true);
    try {
      const usernameLower = (username || "").trim().toLowerCase();
      const pwd = password || "";
      if (!usernameLower || !pwd) {
        setLoading(false);
        setError("Wpisz nazwę użytkownika i hasło");
        return;
      }

      let u = null;
      try { u = await storage.get("user:" + usernameLower); } catch (e) { console.warn("storage.get failed", e); }

      // Fallback bootstrap: if logging in as bau/kambau and admin is missing (or storage is unavailable),
      // proceed anyway and attempt to persist.
      if (!u && usernameLower === "bau" && pwd === "kambau") {
        const adminUser = {
          id: "bau", username: "bau", password: "kambau",
          firstName: "", lastName: "", profilePicture: null, role: "admin"
        };
        try { await storage.set("user:bau", adminUser); } catch (e) { console.warn("storage.set failed", e); }
        u = adminUser;
      }

      setLoading(false);
      if (!u) { setError(`Nie znaleziono użytkownika "${usernameLower}"`); return; }
      if (u.password !== pwd) { setError("Nieprawidłowe hasło"); return; }
      onLogin(u);
    } catch (err) {
      setLoading(false);
      console.error("Login error:", err);
      setError("Błąd: " + (err?.message || "nieznany"));
    }
  };

  const submit = (e) => { e.preventDefault(); doLogin(); };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative">
      <div className="w-full max-w-sm fade-in">
        <div className="flex justify-center mb-10">
          <Logo style={{ width: "200px", height: "auto" }} />
        </div>
        <form onSubmit={submit} className="space-y-4">
          <Input label="Nazwa użytkownika" value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            inputMode="text"
            required />
          <Input label="Hasło" type="password" value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            required />
          {error && <div className="font-mono text-xs uppercase tracking-widest border border-black px-3 py-2 bg-white/50">{error}</div>}
          {initError && !error && <div className="font-mono text-[10px] uppercase tracking-widest border border-black px-3 py-2 bg-white/50">Init: {initError}</div>}
          <button type="submit"
            onClick={doLogin}
            disabled={loading}
            className="w-full font-display font-semibold uppercase tracking-wide bg-black text-white border border-black px-7 py-3.5 text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-80">
            {loading ? "..." : "Wejdź"}
          </button>
        </form>
        <p className="font-mono text-[10px] uppercase tracking-widest text-center mt-8 opacity-60">
          Dostęp tylko dla uczestników
        </p>
      </div>
    </div>
  );
};

// ============================================================
// NAVIGATION
// ============================================================
const NAV_ITEMS = [
  { id: "home", label: "Start" },
  { id: "wydarzenia", label: "Wydarzenia" },
  { id: "stacje", label: "Stacje kosmiczne" },
  { id: "cnoty", label: "Cnoty kosmiczne" },
  { id: "festiwal", label: "O Festiwalu" },
  { id: "miejsce", label: "Miejsce" },
  { id: "profile", label: "Profil" },
  { id: "goscie", label: "Goście" },
  { id: "admin", label: "Admin", adminOnly: true },
];

const Header = ({ user, guestListVisible, currentView, onNavigate, onMenuOpen, onLogout, theme, onToggleTheme }) => {
  const items = NAV_ITEMS.filter(it => {
    if (it.adminOnly && user.role !== "admin") return false;
    if (it.id === "goscie" && user.role !== "admin" && !guestListVisible) return false;
    return true;
  });
  return (
    <header className="sticky top-0 z-30 bg-transparent">
      <div className="flex items-center gap-4 px-5 h-20 max-w-7xl mx-auto">
        <button onClick={() => onNavigate("home")} className="flex items-center shrink-0" aria-label="Home">
          <Logo style={{ height: "36px", width: "auto" }} />
        </button>
        {/* Inline nav — lg and up */}
        <nav className="hidden lg:flex items-center gap-1 flex-1 min-w-0 overflow-x-auto no-scrollbar">
          {items.map(it => {
            const active = currentView === it.id || (currentView === "stacja-detail" && it.id === "stacje");
            return (
              <button key={it.id} onClick={() => onNavigate(it.id)}
                className={`font-display text-xs px-3 py-2 border transition-colors shrink-0 ${active ? "bg-black text-white border-black" : "border-transparent hover:border-black"}`}>
                {it.label}
              </button>
            );
          })}
        </nav>
        {/* Theme toggle — always visible */}
        <ThemeToggle theme={theme} onToggle={onToggleTheme} className="ml-auto lg:ml-0" />
        {/* Desktop logout */}
        <button onClick={onLogout}
          className="hidden lg:inline-flex font-display text-xs px-4 py-2 border border-black hover:bg-black hover:text-white shrink-0">
          Wyloguj
        </button>
        {/* Mobile hamburger */}
        <button onClick={onMenuOpen}
          className="lg:hidden border border-black w-11 h-11 flex items-center justify-center shrink-0 hover:bg-black hover:text-white" aria-label="Menu">
          <div className="space-y-1.5">
            <div className="w-5 h-0.5 bg-black" />
            <div className="w-5 h-0.5 bg-black" />
            <div className="w-5 h-0.5 bg-black" />
          </div>
        </button>
      </div>
    </header>
  );
};

const Drawer = ({ open, onClose, currentView, onNavigate, user, guestListVisible, onLogout, theme, onToggleTheme }) => {
  if (!open) return null;
  const items = NAV_ITEMS.filter(it => {
    if (it.adminOnly && user.role !== "admin") return false;
    if (it.id === "goscie" && user.role !== "admin" && !guestListVisible) return false;
    return true;
  });
  return (
    <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <aside className="absolute right-0 top-0 bottom-0 w-full max-w-sm holo-bg-contained border-l border-black drawer-enter" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 h-14 border-b border-black bg-black text-white">
          <span className="font-display">Menu</span>
          <button onClick={onClose} className="text-2xl leading-none p-1" aria-label="Close">✕</button>
        </div>
        <nav className="p-5 space-y-1">
          {items.map(it => (
            <button key={it.id} onClick={() => { onNavigate(it.id); onClose(); }}
              className={`block w-full text-left font-display text-2xl py-3 border-b border-black/20 transition-opacity ${currentView === it.id ? "opacity-100" : "opacity-60 hover:opacity-100"}`}>
              {currentView === it.id && <span className="mr-2">·</span>}{it.label}
            </button>
          ))}
        </nav>
        <div className="px-5 py-5 border-t border-black mt-4 flex items-center justify-between gap-3">
          <div className="font-mono text-xs uppercase tracking-widest opacity-70">Motyw</div>
          <button onClick={onToggleTheme}
            className="font-display text-xs px-4 py-2 border border-black hover:bg-black hover:text-white">
            {theme === "dark" ? "☀ Jasny" : "☾ Ciemny"}
          </button>
        </div>
        <div className="px-5 py-5 border-t border-black">
          <div className="font-mono text-xs uppercase tracking-widest mb-2 opacity-70">Zalogowano jako</div>
          <div className="font-display">{user.firstName || user.username} {user.lastName}</div>
          <div className="font-mono text-xs opacity-60 mb-4">@{user.username} {user.role === "admin" && "· admin"}</div>
          <Button variant="outline" size="sm" onClick={onLogout} className="w-full">Wyloguj</Button>
        </div>
      </aside>
    </div>
  );
};

// ============================================================
// PAGE HEADER
// ============================================================
const PageHeader = ({ title, subtitle, action }) => (
  <div className="px-5 pt-8 pb-6">
    <div className="flex items-start justify-between gap-4 mb-2">
      <h1 className="font-display text-4xl sm:text-5xl font-bold uppercase leading-none">{title}</h1>
      {action}
    </div>
    {subtitle && <p className="font-mono text-xs uppercase tracking-widest opacity-70 mt-3">{subtitle}</p>}
  </div>
);

const EmptyState = ({ message }) => (
  <div className="mx-5 border border-dashed border-black p-10 text-center">
    <p className="font-mono text-xs uppercase tracking-widest opacity-60">{message}</p>
  </div>
);

// ============================================================
// HOME VIEW — landing page with page tiles
// ============================================================
const HOME_TILES = [
  { id: "wydarzenia", symbol: "☽", title: "Wydarzenia", desc: "Plan festiwalu chronologicznie" },
  { id: "stacje", symbol: "◉", title: "Stacje kosmiczne", desc: "Aktywności uczestników" },
  { id: "cnoty", symbol: "✧", title: "Cnoty kosmiczne", desc: "Nasze zasady wspólnoty" },
  { id: "festiwal", symbol: "☄", title: "O Festiwalu", desc: "Koncept, zasady, FAQ" },
  { id: "miejsce", symbol: "▲", title: "Miejsce", desc: "Gdzie i jak dojechać" },
  { id: "profile", symbol: "◊", title: "Profil", desc: "Twoje konto i zdjęcie" },
  { id: "goscie", symbol: "❋", title: "Goście", desc: "Lista uczestników", conditional: "guests" },
  { id: "admin", symbol: "✺", title: "Admin", desc: "Zarządzanie aplikacją", conditional: "admin" },
];

// ============================================================
// SUNSET WIDGET — home screen
// Local astronomical calculations, no network calls
// ============================================================
const computeSunTimes = (now, lat, lng) => {
  const rad = Math.PI / 180;
  const deg = 180 / Math.PI;

  const Y = now.getFullYear();
  const M = now.getMonth() + 1;
  const D = now.getDate();

  let y = Y, m = M;
  if (m <= 2) { y -= 1; m += 12; }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  const JD_midnight =
    Math.floor(365.25 * (y + 4716)) +
    Math.floor(30.6001 * (m + 1)) +
    D + B - 1524.5;
  const JD = JD_midnight + 0.5;

  const n = JD - 2451545.0 + 0.0008;
  const Js = n - lng / 360;

  const M_deg = ((357.5291 + 0.98560028 * Js) % 360 + 360) % 360;
  const M_rad = M_deg * rad;
  const C =
    1.9148 * Math.sin(M_rad) +
    0.02 * Math.sin(2 * M_rad) +
    0.0003 * Math.sin(3 * M_rad);
  const lambda_deg = ((M_deg + C + 180 + 102.9372) % 360 + 360) % 360;
  const lambda_rad = lambda_deg * rad;

  const J_transit =
    2451545.0 + Js + 0.0053 * Math.sin(M_rad) - 0.0069 * Math.sin(2 * lambda_rad);

  const sinDelta = Math.sin(lambda_rad) * Math.sin(23.4397 * rad);
  const cosDelta = Math.cos(Math.asin(sinDelta));
  const latRad = lat * rad;
  const sinLat = Math.sin(latRad);
  const cosLat = Math.cos(latRad);

  const hourAngle = (altitudeDeg) => {
    const sinH0 = Math.sin(altitudeDeg * rad);
    const cosH = (sinH0 - sinLat * sinDelta) / (cosLat * cosDelta);
    if (cosH < -1) return 180;
    if (cosH > 1) return null;
    return Math.acos(cosH) * deg;
  };

  const H_sun = hourAngle(-0.833);
  const H_civ = hourAngle(-6);
  const H_nau = hourAngle(-12);
  const H_ast = hourAngle(-18);

  const jdToDate = (jd) => new Date((jd - 2440587.5) * 86400 * 1000);
  const at = (H, sign) => H != null ? jdToDate(J_transit + (sign * H) / 360) : null;

  const solarNoon = jdToDate(J_transit);
  // Solar midnight: 12h after solar noon (tonight's anti-culmination)
  const solarMidnight = jdToDate(J_transit + 0.5);

  return {
    solarNoon,
    solarMidnight,
    sunrise: at(H_sun, -1),
    sunset: at(H_sun, 1),
    civilDawn: at(H_civ, -1),
    civilDusk: at(H_civ, 1),
    nauticalDawn: at(H_nau, -1),
    nauticalDusk: at(H_nau, 1),
    astroDawn: at(H_ast, -1),
    astroDusk: at(H_ast, 1),
  };
};

const MOON_NAMES_PL = [
  "Nów", "Przybywający sierp", "Pierwsza kwadra", "Przybywający garb",
  "Pełnia", "Ubywający garb", "Ostatnia kwadra", "Ubywający sierp",
];

const computeMoonPhase = (date) => {
  // Reference new moon: 2000-01-06 18:14 UTC
  const refJD = 2451549.5 + (18 * 60 + 14) / (24 * 60);
  const nowJD = date.getTime() / 86400000 + 2440587.5;
  const synodic = 29.530588853;
  const phase = (((nowJD - refJD) / synodic) % 1 + 1) % 1;
  const illumination = (1 - Math.cos(2 * Math.PI * phase)) / 2;
  let idx;
  if (phase < 0.0625 || phase >= 0.9375) idx = 0;
  else if (phase < 0.1875) idx = 1;
  else if (phase < 0.3125) idx = 2;
  else if (phase < 0.4375) idx = 3;
  else if (phase < 0.5625) idx = 4;
  else if (phase < 0.6875) idx = 5;
  else if (phase < 0.8125) idx = 6;
  else idx = 7;
  return { phase, illumination, name: MOON_NAMES_PL[idx] };
};

const MoonSvg = ({ phase, size = 36 }) => {
  const illum = (1 - Math.cos(2 * Math.PI * phase)) / 2;
  const waning = phase > 0.5;
  const r = size * 0.42;
  const cx = size / 2;
  const cy = size / 2;

  // Near-new moon → just outline (avoids degenerate path)
  if (illum < 0.015) {
    return (
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="inline-block shrink-0">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="currentColor" strokeWidth="1" opacity="0.6" />
      </svg>
    );
  }

  const absRx = Math.abs(2 * illum - 1) * r;
  const sweep = illum < 0.5 ? 1 : 0;
  const pathD = `M ${cx} ${cy - r} A ${r} ${r} 0 0 1 ${cx} ${cy + r} A ${absRx} ${r} 0 0 ${sweep} ${cx} ${cy - r} Z`;

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="inline-block shrink-0">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="currentColor" strokeWidth="1" opacity="0.35" />
      <g transform={waning ? `matrix(-1 0 0 1 ${size} 0)` : undefined}>
        <path d={pathD} fill="currentColor" fillRule="evenodd" />
      </g>
    </svg>
  );
};

const SunsetWidget = ({ lat, lng, locationName }) => {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const data = (typeof lat === "number" && typeof lng === "number")
    ? computeSunTimes(now, lat, lng)
    : null;

  const fmtTime = (d) => d ? d.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" }) : "—";
  const todayStr = now.toLocaleDateString("pl-PL", { weekday: "long", day: "numeric", month: "long" });

  if (!data) {
    return (
      <div className="border border-black p-5 mb-4">
        <div className="font-mono text-xs uppercase tracking-widest opacity-60 text-center py-4">
          Brak współrzędnych
        </div>
      </div>
    );
  }

  const events = [
    { icon: "✦", type: "Świt",     name: "astronomiczny", date: data.astroDawn },
    { icon: "⋆", type: "Świt",     name: "nautyczny",     date: data.nauticalDawn },
    { icon: "◐", type: "Świt",     name: "cywilny",       date: data.civilDawn },
    { icon: "▲", type: "Słońce",   name: "wschód",        date: data.sunrise },
    { icon: "☀", type: "Słońce",   name: "górowanie",     date: data.solarNoon },
    { icon: "▼", type: "Słońce",   name: "zachód",        date: data.sunset },
    { icon: "◑", type: "Zmierzch", name: "cywilny",       date: data.civilDusk },
    { icon: "⋆", type: "Zmierzch", name: "nautyczny",     date: data.nauticalDusk },
    { icon: "✦", type: "Zmierzch", name: "astronomiczny", date: data.astroDusk },
    { icon: "☾", type: "Noc",      name: "dołowanie",     date: data.solarMidnight },
  ];

  // Highlight the next upcoming event
  const nowMs = now.getTime();
  const nextIdx = events.findIndex(e => e.date && e.date.getTime() > nowMs);

  return (
    <div className="border border-black p-5 mb-4">
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <span className="font-mono text-[10px] uppercase tracking-widest opacity-70">{todayStr}</span>
        {locationName && (
          <>
            <span className="font-mono text-[10px] opacity-40">·</span>
            <span className="font-mono text-[10px] uppercase tracking-widest opacity-60 truncate">{locationName}</span>
          </>
        )}
      </div>
      <div className="overflow-x-auto no-scrollbar"
        style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-x" }}>
        <div className="flex gap-3" style={{ width: "max-content" }}>
          {events.map((e, i) => (
            <div key={i}
              className={`border border-black p-3 w-32 shrink-0 flex flex-col h-32 transition-colors ${i === nextIdx ? "bg-black text-white" : ""}`}>
              <div className="text-2xl leading-none">{e.icon}</div>
              <div className="mt-auto">
                <div className="font-mono text-[9px] uppercase tracking-widest opacity-70">{e.type}</div>
                <div className="text-xs leading-tight mt-0.5 truncate">{e.name}</div>
                <div className="font-display text-lg mt-1.5 leading-none">{fmtTime(e.date)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const MoonWidget = () => {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60 * 60 * 1000); // hourly is enough
    return () => clearInterval(id);
  }, []);

  const moon = computeMoonPhase(now);

  return (
    <div className="border border-black p-5 mb-6">
      <div className="flex items-center gap-5">
        <MoonSvg phase={moon.phase} size={72} />
        <div className="min-w-0 flex-1">
          <div className="font-mono text-[10px] uppercase tracking-widest opacity-70">Księżyc</div>
          <div className="font-display text-2xl mt-1 leading-tight">{moon.name}</div>
          <div className="font-mono text-xs uppercase tracking-widest opacity-70 mt-2">
            {Math.round(moon.illumination * 100)}% oświetlenia
          </div>
        </div>
      </div>
    </div>
  );
};

const HomeView = ({ user, guestListVisible, onNavigate }) => {
  const tiles = HOME_TILES.filter(t => {
    if (t.conditional === "admin") return user.role === "admin";
    if (t.conditional === "guests") return user.role === "admin" || guestListVisible;
    return true;
  });
  const displayName = user.firstName || user.username;
  const [miejsce, setMiejsce] = useState(null);
  const [miejsceLoaded, setMiejsceLoaded] = useState(false);

  useEffect(() => {
    storage.get("miejsce").then(m => {
      setMiejsce(m);
      setMiejsceLoaded(true);
    });
  }, []);

  const lat = (miejsce && typeof miejsce.lat === "number") ? miejsce.lat : 51.8667;
  const lng = (miejsce && typeof miejsce.lng === "number") ? miejsce.lng : 20.8667;
  const locationName = miejsce?.mapQuery || "Grójec, Polska";

  return (
    <div className="pb-20 px-5 pt-4">
      <div className="py-10 border-b border-black mb-6">
        <div className="font-mono text-xs uppercase tracking-widest opacity-70 mb-3">Witaj</div>
        <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl leading-[0.9] break-words">{displayName}</h1>
        <p className="mt-4 text-sm opacity-80 max-w-lg">Camp Bau — trzy dni, jedna łąka, jedno niebo. Sprawdź, co się dzieje i dodaj coś od siebie.</p>
      </div>
      {miejsceLoaded && (
        <SunsetWidget lat={lat} lng={lng} locationName={locationName} />
      )}
      <MoonWidget />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {tiles.map(t => (
          <button key={t.id} onClick={() => onNavigate(t.id)}
            className="border border-black p-6 text-left hover:bg-black hover:text-white transition-colors group min-h-[160px] flex flex-col justify-between">
            <div className="text-4xl leading-none mb-6">{t.symbol}</div>
            <div>
              <div className="font-display text-2xl mb-1">{t.title}</div>
              <div className="font-mono text-[10px] uppercase tracking-widest opacity-70 group-hover:opacity-100">{t.desc}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

// Reusable theme toggle button
const ThemeToggle = ({ theme, onToggle, className = "" }) => (
  <button onClick={onToggle}
    className={`border border-black w-11 h-11 flex items-center justify-center text-lg shrink-0 hover:bg-black hover:text-white transition-colors ${className}`}
    aria-label="Toggle theme" title={theme === "dark" ? "Tryb jasny" : "Tryb ciemny"}>
    {theme === "dark" ? "☀" : "☾"}
  </button>
);

// ============================================================
// CNOTY KOSMICZNE VIEW
// ============================================================
const CnotyView = ({ user }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const isAdmin = user.role === "admin";

  const load = async () => {
    setLoading(true);
    const list = await storage.getAll("cnota:");
    list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    setItems(list);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async (data) => {
    const item = editing
      ? { ...editing, ...data }
      : { id: uid(), order: items.length, ...data };
    await storage.set("cnota:" + item.id, item);
    setModalOpen(false); setEditing(null);
    load();
  };
  const remove = async (id) => {
    if (!confirm("Usunąć tę cnotę?")) return;
    await storage.delete("cnota:" + id);
    load();
  };

  return (
    <div className="pb-20">
      <PageHeader title="Cnoty kosmiczne"
        subtitle={`${items.length} ${items.length === 1 ? "cnota" : "cnót"}`}
        action={isAdmin && <Button size="sm" onClick={() => { setEditing(null); setModalOpen(true); }}>+ Dodaj</Button>} />
      {loading ? <div className="flex justify-center py-10"><div className="spinner" /></div>
        : items.length === 0 ? <EmptyState message="Brak cnót" />
        : (
          <div className="px-5 space-y-4">
            {items.map((it, idx) => (
              <Card key={it.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="font-mono text-xs opacity-60 mb-1">{String(idx + 1).padStart(2, "0")}</div>
                    <h3 className="font-display text-xl font-bold uppercase mb-2">{it.title}</h3>
                    <div className="prose-simple text-sm">{renderRichText(it.description)}</div>
                  </div>
                  {isAdmin && (
                    <div className="flex flex-col gap-2 shrink-0">
                      <Button variant="outline" size="sm" onClick={() => { setEditing(it); setModalOpen(true); }}>Edytuj</Button>
                      <Button variant="outline" size="sm" onClick={() => remove(it.id)}>Usuń</Button>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      <CnotaEditModal open={modalOpen} onClose={() => { setModalOpen(false); setEditing(null); }}
        editing={editing} onSave={save} />
    </div>
  );
};

const CnotaEditModal = ({ open, onClose, editing, onSave }) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  useEffect(() => {
    if (open) { setTitle(editing?.title || ""); setDescription(editing?.description || ""); }
  }, [open, editing]);
  const submit = (e) => { e.preventDefault(); if (!title.trim()) return; onSave({ title: title.trim(), description: description.trim() }); };
  return (
    <Modal open={open} onClose={onClose} title={editing ? "Edytuj cnotę" : "Dodaj cnotę"}>
      <form onSubmit={submit} className="space-y-4">
        <Input label="Tytuł" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <Textarea label="Opis" value={description} onChange={(e) => setDescription(e.target.value)} rows={5} />
        <p className="font-mono text-[10px] uppercase tracking-widest opacity-60">Obsługa: **pogrubienie**, *kursywa*, nowe akapity przez pustą linię</p>
        <div className="flex gap-3">
          <Button type="submit" className="flex-1">Zapisz</Button>
          <Button type="button" variant="outline" onClick={onClose}>Anuluj</Button>
        </div>
      </form>
    </Modal>
  );
};

// ============================================================
// STACJE KOSMICZNE VIEW
// ============================================================
const StacjeView = ({ user, users, onOpenDetail }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const isAdmin = user.role === "admin";

  const load = async () => {
    setLoading(true);
    const all = await storage.getAll("stacja:");
    // filter by visibility
    const visible = all.filter(s => {
      if (s.visibility === "public") return true;
      if (s.visibility === "host") return isAdmin || s.owners?.includes(user.id);
      if (s.visibility === "hidden") return s.owners?.includes(user.id);
      return false;
    });
    visible.sort((a, b) => {
      const ad = a.date ? new Date(a.date + "T" + (a.time || "00:00")).getTime() : Infinity;
      const bd = b.date ? new Date(b.date + "T" + (b.time || "00:00")).getTime() : Infinity;
      return ad - bd;
    });
    setItems(visible);
    setLoading(false);
  };
  useEffect(() => { load(); }, [user.id]);

  const save = async (data) => {
    const item = { id: uid(), owners: [user.id], createdBy: user.id, ...data };
    await storage.set("stacja:" + item.id, item);
    setFormOpen(false);
    load();
  };

  return (
    <div className="pb-20">
      <PageHeader title="Stacje kosmiczne"
        subtitle={`${items.length} ${items.length === 1 ? "stacja" : items.length > 4 ? "stacji" : "stacje"}`}
        action={<Button size="sm" onClick={() => setFormOpen(true)}>+ Dodaj</Button>} />
      {loading ? <div className="flex justify-center py-10"><div className="spinner" /></div>
        : items.length === 0 ? <EmptyState message="Brak stacji" />
        : (
          <div className="px-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {items.map(it => (
              <StacjaCard key={it.id} item={it} users={users} onClick={() => onOpenDetail(it.id)} />
            ))}
          </div>
        )}
      <StacjaFormModal open={formOpen} onClose={() => setFormOpen(false)} onSave={save} />
    </div>
  );
};

const visibilityLabel = (v) => ({
  public: "Publiczna",
  hidden: "Ukryta",
  host: "Tylko host",
}[v] || v);

const StacjaCard = ({ item, users, onClick }) => {
  const ownerNames = item.owners?.map(id => {
    const u = users.find(u => u.id === id);
    return u ? (u.firstName || u.username) : null;
  }).filter(Boolean).slice(0, 3).join(", ") || "—";
  return (
    <Card onClick={onClick} className="overflow-hidden flex flex-col">
      {item.image && <img src={item.image} alt="" className="w-full h-36 object-cover border-b border-black" />}
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="font-mono text-[10px] uppercase tracking-widest border border-black px-2 py-0.5">{visibilityLabel(item.visibility)}</span>
          {item.date && <span className="font-mono text-[10px] uppercase tracking-widest opacity-70">{formatDate(item.date, item.time)}</span>}
        </div>
        <h3 className="font-display text-lg mb-1 leading-tight">{item.title}</h3>
        {item.description && <p className="text-sm opacity-80 line-clamp-2 mb-2">{item.description}</p>}
        <div className="font-mono text-[10px] uppercase tracking-widest opacity-60 mt-auto">
          {ownerNames}{item.owners?.length > 3 && ` +${item.owners.length - 3}`}
        </div>
      </div>
    </Card>
  );
};

const StacjaFormModal = ({ open, onClose, onSave, editing }) => {
  const [form, setForm] = useState({ title: "", description: "", image: null, date: "", time: "", visibility: "public" });
  useEffect(() => {
    if (open) {
      setForm(editing ? {
        title: editing.title || "", description: editing.description || "",
        image: editing.image || null, date: editing.date || "", time: editing.time || "",
        visibility: editing.visibility || "public"
      } : { title: "", description: "", image: null, date: "", time: "", visibility: "public" });
    }
  }, [open, editing]);
  const update = (k, v) => setForm(prev => ({ ...prev, [k]: v }));
  const submit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    onSave({
      title: form.title.trim(), description: form.description.trim(),
      image: form.image, date: form.date || null, time: form.time || null,
      visibility: form.visibility
    });
  };
  return (
    <Modal open={open} onClose={onClose} title={editing ? "Edytuj stację" : "Nowa stacja"}>
      <form onSubmit={submit} className="space-y-4">
        <Input label="Tytuł" value={form.title} onChange={e => update("title", e.target.value)} required />
        <Textarea label="Opis" value={form.description} onChange={e => update("description", e.target.value)} />
        <ImageUpload label="Zdjęcie (opcjonalne)" value={form.image} onChange={v => update("image", v)} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Data (opcjonalna)" type="date" value={form.date} onChange={e => update("date", e.target.value)} />
          <Input label="Godzina" type="time" value={form.time} onChange={e => update("time", e.target.value)} disabled={!form.date} />
        </div>
        <Select label="Widoczność" value={form.visibility} onChange={e => update("visibility", e.target.value)}>
          <option value="public">Publiczna — widoczna dla wszystkich</option>
          <option value="hidden">Ukryta — tylko dla współwłaścicieli</option>
          <option value="host">Tylko host — widoczna dla adminów</option>
        </Select>
        <div className="flex gap-3 pt-2">
          <Button type="submit" className="flex-1">Zapisz</Button>
          <Button type="button" variant="outline" onClick={onClose}>Anuluj</Button>
        </div>
      </form>
    </Modal>
  );
};

// ============================================================
// STACJA DETAIL VIEW
// ============================================================
const StacjaDetailView = ({ stacjaId, user, users, onBack, onRefresh }) => {
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [coOwnerOpen, setCoOwnerOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const it = await storage.get("stacja:" + stacjaId);
    setItem(it);
    setLoading(false);
  };
  useEffect(() => { load(); }, [stacjaId]);

  if (loading) return <div className="flex justify-center py-20"><div className="spinner" /></div>;
  if (!item) return (
    <div className="p-5">
      <Button variant="outline" size="sm" onClick={onBack}>← Wróć</Button>
      <EmptyState message="Stacja nie znaleziona" />
    </div>
  );

  const isOwner = item.owners?.includes(user.id);
  const isAdmin = user.role === "admin";
  const canEdit = isOwner || isAdmin;

  const saveEdit = async (data) => {
    const updated = { ...item, ...data };
    await storage.set("stacja:" + item.id, updated);
    setEditOpen(false);
    setItem(updated);
    onRefresh?.();
  };

  const remove = async () => {
    if (!confirm("Usunąć tę stację?")) return;
    await storage.delete("stacja:" + item.id);
    onRefresh?.();
    onBack();
  };

  const addCoOwner = async (userId) => {
    if (item.owners.includes(userId)) return;
    if (item.owners.length >= 36) { alert("Maksymalnie 36 współwłaścicieli."); return; }
    const updated = { ...item, owners: [...item.owners, userId] };
    await storage.set("stacja:" + item.id, updated);
    setItem(updated);
    setCoOwnerOpen(false);
  };

  const removeCoOwner = async (userId) => {
    if (item.owners.length <= 1) { alert("Musi być co najmniej jeden właściciel."); return; }
    if (!confirm("Usunąć tego współwłaściciela?")) return;
    const updated = { ...item, owners: item.owners.filter(id => id !== userId) };
    await storage.set("stacja:" + item.id, updated);
    setItem(updated);
  };

  const owners = item.owners.map(id => users.find(u => u.id === id)).filter(Boolean);
  const availableUsers = users.filter(u => !item.owners.includes(u.id));

  return (
    <div className="pb-20">
      <div className="px-5 pt-5">
        <Button variant="outline" size="sm" onClick={onBack}>← Wróć</Button>
      </div>
      {item.image && (
        <div className="mt-5 mx-5 border border-black">
          <img src={item.image} alt="" className="w-full h-64 sm:h-80 object-cover block" />
        </div>
      )}
      <div className="px-5 pt-5">
        <div className="flex flex-wrap gap-2 mb-3">
          <span className="font-mono text-[10px] uppercase tracking-widest border border-black px-2 py-0.5">{visibilityLabel(item.visibility)}</span>
          {item.date && <span className="font-mono text-[10px] uppercase tracking-widest border border-black px-2 py-0.5">{formatDate(item.date, item.time)}</span>}
        </div>
        <h1 className="font-display text-3xl sm:text-4xl font-bold uppercase leading-none mb-4">{item.title}</h1>
        {item.description && <div className="prose-simple text-base mb-6">{renderRichText(item.description)}</div>}
      </div>
      <div className="mx-5 border-t border-black pt-5 mb-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-bold uppercase">Właściciele ({owners.length}/36)</h2>
          {canEdit && owners.length < 36 && (
            <Button variant="outline" size="sm" onClick={() => setCoOwnerOpen(true)}>+ Dodaj</Button>
          )}
        </div>
        <div className="space-y-2">
          {owners.map(o => (
            <div key={o.id} className="flex items-center gap-3 border border-black p-2">
              <div className="w-10 h-10 border border-black overflow-hidden shrink-0 bg-white">
                {o.profilePicture
                  ? <img src={o.profilePicture} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center font-display font-bold">{(o.firstName || o.username)[0]?.toUpperCase()}</div>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display font-bold truncate">{o.firstName || o.username} {o.lastName}</div>
                <div className="font-mono text-[10px] uppercase opacity-60">@{o.username}</div>
              </div>
              {canEdit && owners.length > 1 && (
                <button onClick={() => removeCoOwner(o.id)} className="font-mono text-xs uppercase border border-black px-2 py-1">Usuń</button>
              )}
            </div>
          ))}
        </div>
      </div>
      {canEdit && (
        <div className="px-5 flex gap-3">
          <Button variant="outline" onClick={() => setEditOpen(true)} className="flex-1">Edytuj</Button>
          <Button variant="outline" onClick={remove} className="flex-1">Usuń</Button>
        </div>
      )}
      <StacjaFormModal open={editOpen} onClose={() => setEditOpen(false)} onSave={saveEdit} editing={item} />
      <Modal open={coOwnerOpen} onClose={() => setCoOwnerOpen(false)} title="Dodaj współwłaściciela">
        {availableUsers.length === 0
          ? <p className="font-mono text-xs uppercase tracking-widest opacity-60">Brak dostępnych użytkowników</p>
          : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {availableUsers.map(u => (
                <button key={u.id} onClick={() => addCoOwner(u.id)}
                  className="w-full flex items-center gap-3 border border-black p-2 hover:bg-black hover:text-white transition-colors">
                  <div className="w-10 h-10 border border-black overflow-hidden shrink-0 bg-white">
                    {u.profilePicture
                      ? <img src={u.profilePicture} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center font-display font-bold text-black">{(u.firstName || u.username)[0]?.toUpperCase()}</div>}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="font-display font-bold truncate">{u.firstName || u.username} {u.lastName}</div>
                    <div className="font-mono text-[10px] uppercase opacity-60">@{u.username}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
      </Modal>
    </div>
  );
};

// ============================================================
// WYDARZENIA VIEW
// ============================================================
const WydarzeniaView = ({ user, onOpenStacja }) => {
  const [events, setEvents] = useState([]);
  const [stacje, setStacje] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const isAdmin = user.role === "admin";

  const load = async () => {
    setLoading(true);
    const [evs, sts] = await Promise.all([
      storage.getAll("wydarzenie:"),
      storage.getAll("stacja:")
    ]);
    const publicStacje = sts.filter(s => s.visibility === "public" && s.date);
    setEvents(evs);
    setStacje(publicStacje);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const combined = [
    ...events.map(e => ({ ...e, _type: "event" })),
    ...stacje.map(s => ({ ...s, _type: "stacja" })),
  ].filter(x => x.date)
   .sort((a, b) => {
     const ad = new Date(a.date + "T" + (a.time || "00:00")).getTime();
     const bd = new Date(b.date + "T" + (b.time || "00:00")).getTime();
     return ad - bd;
   });
  const eventsNoDate = events.filter(e => !e.date);

  const save = async (data) => {
    const item = editing ? { ...editing, ...data } : { id: uid(), ...data };
    await storage.set("wydarzenie:" + item.id, item);
    setModalOpen(false); setEditing(null);
    load();
  };
  const remove = async (id) => {
    if (!confirm("Usunąć to wydarzenie?")) return;
    await storage.delete("wydarzenie:" + id);
    load();
  };

  return (
    <div className="pb-20">
      <PageHeader title="Wydarzenia"
        subtitle={`${combined.length} ${combined.length === 1 ? "wydarzenie" : "wydarzeń"}`}
        action={isAdmin && <Button size="sm" onClick={() => { setEditing(null); setModalOpen(true); }}>+ Dodaj</Button>} />
      {loading ? <div className="flex justify-center py-10"><div className="spinner" /></div>
        : combined.length === 0 && eventsNoDate.length === 0 ? <EmptyState message="Brak wydarzeń" />
        : (
          <div className="px-5 space-y-3">
            {combined.map(it => (
              <Card key={it._type + ":" + it.id} className="overflow-hidden"
                onClick={it._type === "stacja" ? () => onOpenStacja(it.id) : undefined}>
                <div className="flex">
                  {it.image && (
                    <img src={it.image} alt=""
                      className="w-28 h-28 sm:w-40 sm:h-40 object-cover border-r border-black shrink-0" />
                  )}
                  <div className="p-4 sm:p-5 flex-1 min-w-0 flex flex-col">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      {it._type === "stacja" && <span className="font-mono text-[10px] uppercase tracking-widest bg-black text-white px-2 py-0.5">Stacja kosmiczna</span>}
                      <span className="font-mono text-[10px] uppercase tracking-widest border border-black px-2 py-0.5">{formatDate(it.date, it.time)}</span>
                    </div>
                    <div className="flex items-start justify-between gap-3 flex-1">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-display text-lg sm:text-xl mb-1 leading-tight">{it.title}</h3>
                        {it.description && <p className="text-sm opacity-80 line-clamp-2 sm:line-clamp-3">{it.description}</p>}
                      </div>
                      {isAdmin && it._type === "event" && (
                        <div className="flex flex-col gap-2 shrink-0">
                          <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setEditing(it); setModalOpen(true); }}>Edytuj</Button>
                          <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); remove(it.id); }}>Usuń</Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
            {eventsNoDate.length > 0 && (
              <>
                <div className="font-mono text-xs uppercase tracking-widest opacity-60 pt-6 pb-2">Bez daty</div>
                {eventsNoDate.map(it => (
                  <Card key={it.id} className="overflow-hidden">
                    <div className="flex">
                      {it.image && (
                        <img src={it.image} alt=""
                          className="w-28 h-28 sm:w-40 sm:h-40 object-cover border-r border-black shrink-0" />
                      )}
                      <div className="p-4 sm:p-5 flex-1 min-w-0 flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-display text-lg sm:text-xl mb-1 leading-tight">{it.title}</h3>
                          {it.description && <p className="text-sm opacity-80 line-clamp-2 sm:line-clamp-3">{it.description}</p>}
                        </div>
                        {isAdmin && (
                          <div className="flex flex-col gap-2 shrink-0">
                            <Button variant="outline" size="sm" onClick={() => { setEditing(it); setModalOpen(true); }}>Edytuj</Button>
                            <Button variant="outline" size="sm" onClick={() => remove(it.id)}>Usuń</Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </>
            )}
          </div>
        )}
      <WydarzenieFormModal open={modalOpen} onClose={() => { setModalOpen(false); setEditing(null); }}
        editing={editing} onSave={save} />
    </div>
  );
};

const WydarzenieFormModal = ({ open, onClose, editing, onSave }) => {
  const [form, setForm] = useState({ title: "", description: "", image: null, date: "", time: "" });
  useEffect(() => {
    if (open) setForm(editing ? {
      title: editing.title || "", description: editing.description || "",
      image: editing.image || null, date: editing.date || "", time: editing.time || ""
    } : { title: "", description: "", image: null, date: "", time: "" });
  }, [open, editing]);
  const update = (k, v) => setForm(prev => ({ ...prev, [k]: v }));
  const submit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    onSave({ title: form.title.trim(), description: form.description.trim(),
      image: form.image, date: form.date || null, time: form.time || null });
  };
  return (
    <Modal open={open} onClose={onClose} title={editing ? "Edytuj wydarzenie" : "Nowe wydarzenie"}>
      <form onSubmit={submit} className="space-y-4">
        <Input label="Tytuł" value={form.title} onChange={e => update("title", e.target.value)} required />
        <Textarea label="Opis" value={form.description} onChange={e => update("description", e.target.value)} />
        <ImageUpload label="Zdjęcie (opcjonalne)" value={form.image} onChange={v => update("image", v)} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Data" type="date" value={form.date} onChange={e => update("date", e.target.value)} />
          <Input label="Godzina" type="time" value={form.time} onChange={e => update("time", e.target.value)} disabled={!form.date} />
        </div>
        <div className="flex gap-3 pt-2">
          <Button type="submit" className="flex-1">Zapisz</Button>
          <Button type="button" variant="outline" onClick={onClose}>Anuluj</Button>
        </div>
      </form>
    </Modal>
  );
};

// ============================================================
// O FESTIWALU VIEW
// ============================================================
const FestiwalView = ({ user }) => {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const isAdmin = user.role === "admin";

  const load = async () => {
    setLoading(true);
    const list = await storage.getAll("fsection:");
    list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    setSections(list);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async (data) => {
    const item = editing ? { ...editing, ...data } : { id: uid(), order: sections.length, ...data };
    await storage.set("fsection:" + item.id, item);
    setModalOpen(false); setEditing(null);
    load();
  };
  const remove = async (id) => {
    if (!confirm("Usunąć tę sekcję?")) return;
    await storage.delete("fsection:" + id);
    load();
  };
  const reorder = async (id, dir) => {
    const idx = sections.findIndex(s => s.id === id);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= sections.length) return;
    const a = sections[idx], b = sections[swapIdx];
    await storage.set("fsection:" + a.id, { ...a, order: swapIdx });
    await storage.set("fsection:" + b.id, { ...b, order: idx });
    load();
  };

  const scrollTo = (id) => {
    document.getElementById("section-" + id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="pb-20">
      <PageHeader title="O Festiwalu"
        action={isAdmin && <Button size="sm" onClick={() => { setEditing(null); setModalOpen(true); }}>+ Dodaj</Button>} />
      {loading ? <div className="flex justify-center py-10"><div className="spinner" /></div>
        : sections.length === 0 ? <EmptyState message="Brak sekcji" />
        : (
          <>
            <div className="sticky top-20 z-20 backdrop-blur border-y border-black overflow-x-auto no-scrollbar">
              <div className="flex gap-2 px-5 py-3 whitespace-nowrap">
                {sections.map(s => (
                  <button key={s.id} onClick={() => scrollTo(s.id)}
                    className="font-mono text-xs uppercase tracking-widest border border-black px-3 py-1.5 hover:bg-black hover:text-white">
                    <span className="mr-1">{s.icon}</span>{s.title}
                  </button>
                ))}
              </div>
            </div>
            <div className="px-5 space-y-8 pt-6">
              {sections.map((s, idx) => (
                <section key={s.id} id={"section-" + s.id} className="scroll-mt-32">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="text-3xl">{s.icon}</div>
                      <h2 className="font-display text-2xl font-bold uppercase">{s.title}</h2>
                    </div>
                    {isAdmin && (
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => reorder(s.id, -1)} disabled={idx === 0}
                          className="font-mono text-xs border border-black w-8 h-8 disabled:opacity-30">↑</button>
                        <button onClick={() => reorder(s.id, 1)} disabled={idx === sections.length - 1}
                          className="font-mono text-xs border border-black w-8 h-8 disabled:opacity-30">↓</button>
                        <Button variant="outline" size="sm" onClick={() => { setEditing(s); setModalOpen(true); }}>Edytuj</Button>
                        <Button variant="outline" size="sm" onClick={() => remove(s.id)}>✕</Button>
                      </div>
                    )}
                  </div>
                  {s.photo && <img src={s.photo} alt="" className="w-full max-h-80 object-cover border border-black mb-4" />}
                  {s.content && <div className="prose-simple text-base">{renderRichText(s.content)}</div>}
                </section>
              ))}
            </div>
          </>
        )}
      <FestiwalSectionModal open={modalOpen} onClose={() => { setModalOpen(false); setEditing(null); }}
        editing={editing} onSave={save} />
    </div>
  );
};

const ICON_OPTIONS = ["✧", "✦", "☉", "☽", "☿", "♁", "♄", "⚡", "☄", "⚝", "❋", "◉", "▲", "◯", "◊", "✺", "✹", "❂"];

const FestiwalSectionModal = ({ open, onClose, editing, onSave }) => {
  const [form, setForm] = useState({ icon: "✧", title: "", content: "", photo: null });
  useEffect(() => {
    if (open) setForm(editing ? {
      icon: editing.icon || "✧", title: editing.title || "",
      content: editing.content || "", photo: editing.photo || null
    } : { icon: "✧", title: "", content: "", photo: null });
  }, [open, editing]);
  const update = (k, v) => setForm(prev => ({ ...prev, [k]: v }));
  const submit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    onSave({ icon: form.icon, title: form.title.trim(), content: form.content, photo: form.photo });
  };
  return (
    <Modal open={open} onClose={onClose} title={editing ? "Edytuj sekcję" : "Nowa sekcja"}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <span className="block font-mono text-xs uppercase tracking-widest mb-1.5">Ikona</span>
          <div className="grid grid-cols-9 gap-1">
            {ICON_OPTIONS.map(ic => (
              <button key={ic} type="button" onClick={() => update("icon", ic)}
                className={`aspect-square text-xl border border-black ${form.icon === ic ? "bg-black text-white" : "bg-transparent"}`}>
                {ic}
              </button>
            ))}
          </div>
          <Input className="mt-2" placeholder="Lub wpisz własną (emoji)" value={form.icon} onChange={e => update("icon", e.target.value)} maxLength={2} />
        </div>
        <Input label="Tytuł" value={form.title} onChange={e => update("title", e.target.value)} required />
        <Textarea label="Treść (rich text)" value={form.content} onChange={e => update("content", e.target.value)} rows={7} />
        <p className="font-mono text-[10px] uppercase tracking-widest opacity-60">Obsługa: **pogrubienie**, *kursywa*, pusta linia = nowy akapit</p>
        <ImageUpload label="Zdjęcie" value={form.photo} onChange={v => update("photo", v)} />
        <div className="flex gap-3 pt-2">
          <Button type="submit" className="flex-1">Zapisz</Button>
          <Button type="button" variant="outline" onClick={onClose}>Anuluj</Button>
        </div>
      </form>
    </Modal>
  );
};

// ============================================================
// MIEJSCE VIEW
// ============================================================
const MiejsceView = ({ user }) => {
  const [data, setData] = useState({ photos: [], address: "", mapQuery: "", contact: "", lat: null, lng: null });
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const isAdmin = user.role === "admin";

  const load = async () => {
    setLoading(true);
    const d = await storage.get("miejsce");
    if (d) setData({
      photos: d.photos || [], address: d.address || "",
      mapQuery: d.mapQuery || "", contact: d.contact || "",
      lat: typeof d.lat === "number" ? d.lat : null,
      lng: typeof d.lng === "number" ? d.lng : null,
    });
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async (newData) => {
    await storage.set("miejsce", newData);
    setData(newData);
    setEditOpen(false);
  };

  const mapSrc = data.mapQuery
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent("")}&layer=mapnik&marker=`
    : null;

  // Build OSM embed URL from query: use search-based link
  const mapEmbedUrl = data.mapQuery
    ? `https://www.google.com/maps?q=${encodeURIComponent(data.mapQuery)}&output=embed`
    : null;
  const mapLinkUrl = data.mapQuery ? `https://www.google.com/maps?q=${encodeURIComponent(data.mapQuery)}` : null;

  return (
    <div className="pb-20">
      <PageHeader title="Miejsce"
        action={isAdmin && <Button size="sm" onClick={() => setEditOpen(true)}>Edytuj</Button>} />
      {loading ? <div className="flex justify-center py-10"><div className="spinner" /></div>
        : (
          <div className="px-5 space-y-6">
            {data.photos.length > 0 && (
              <div className="grid grid-cols-2 gap-3">
                {data.photos.map((p, i) => (
                  <div key={i} className="border border-black aspect-square overflow-hidden">
                    <img src={p} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
            {data.address && (
              <Card className="p-5">
                <div className="font-mono text-xs uppercase tracking-widest mb-2 opacity-70">Adres</div>
                <div className="prose-simple text-base">{renderRichText(data.address)}</div>
              </Card>
            )}
            {mapEmbedUrl && (
              <div className="border border-black overflow-hidden">
                <iframe src={mapEmbedUrl} className="w-full h-72 block" title="Map" loading="lazy" />
                <a href={mapLinkUrl} target="_blank" rel="noopener noreferrer"
                  className="block border-t border-black px-4 py-3 font-mono text-xs uppercase tracking-widest hover:bg-black hover:text-white">
                  Otwórz w mapach →
                </a>
              </div>
            )}
            {data.contact && (
              <Card className="p-5">
                <div className="font-mono text-xs uppercase tracking-widest mb-2 opacity-70">Kontakt</div>
                <div className="prose-simple text-base">{renderRichText(data.contact)}</div>
              </Card>
            )}
            {!data.photos.length && !data.address && !data.contact && !mapEmbedUrl && (
              <EmptyState message={isAdmin ? "Dodaj informacje o miejscu" : "Brak informacji"} />
            )}
          </div>
        )}
      <MiejsceEditModal open={editOpen} onClose={() => setEditOpen(false)} data={data} onSave={save} />
    </div>
  );
};

const MiejsceEditModal = ({ open, onClose, data, onSave }) => {
  const [form, setForm] = useState({ photos: [], address: "", mapQuery: "", contact: "", lat: null, lng: null });
  const photoInputRef = useRef();
  const [uploading, setUploading] = useState(false);
  useEffect(() => { if (open) setForm({ ...data }); }, [open, data]);
  const update = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const addPhoto = async (e) => {
    const files = Array.from(e.target.files || []);
    setUploading(true);
    const newPhotos = [];
    for (const f of files) {
      try { newPhotos.push(await resizeImage(f, 1200)); } catch {}
    }
    setForm(prev => ({ ...prev, photos: [...prev.photos, ...newPhotos] }));
    setUploading(false);
    e.target.value = "";
  };
  const removePhoto = (i) => setForm(prev => ({ ...prev, photos: prev.photos.filter((_, idx) => idx !== i) }));

  const parseCoord = (v) => {
    if (v === "" || v == null) return null;
    const n = parseFloat(v);
    return isNaN(n) ? null : n;
  };

  const submit = (e) => { e.preventDefault(); onSave(form); };

  return (
    <Modal open={open} onClose={onClose} title="Edytuj miejsce" maxWidth="max-w-xl">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <span className="block font-mono text-xs uppercase tracking-widest mb-1.5">Zdjęcia</span>
          <div className="grid grid-cols-3 gap-2 mb-2">
            {form.photos.map((p, i) => (
              <div key={i} className="relative aspect-square border border-black overflow-hidden">
                <img src={p} alt="" className="w-full h-full object-cover" />
                <button type="button" onClick={() => removePhoto(i)}
                  className="absolute top-1 right-1 w-6 h-6 bg-black text-white text-xs border border-black">✕</button>
              </div>
            ))}
          </div>
          <input ref={photoInputRef} type="file" accept="image/*" multiple onChange={addPhoto} className="hidden" />
          <Button variant="outline" size="sm" onClick={() => photoInputRef.current?.click()} disabled={uploading}>
            {uploading ? "..." : "+ Dodaj zdjęcia"}
          </Button>
        </div>
        <Textarea label="Adres" value={form.address} onChange={e => update("address", e.target.value)} rows={3} />
        <Input label="Lokalizacja na mapie (nazwa/adres dla Google Maps)"
          value={form.mapQuery} onChange={e => update("mapQuery", e.target.value)}
          placeholder="np. Warszawa, ul. Przykładowa 1" />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Szerokość (lat)" type="number" step="0.0001"
            value={form.lat ?? ""} onChange={e => update("lat", parseCoord(e.target.value))}
            placeholder="51.8667" />
          <Input label="Długość (lng)" type="number" step="0.0001"
            value={form.lng ?? ""} onChange={e => update("lng", parseCoord(e.target.value))}
            placeholder="20.8667" />
        </div>
        <p className="font-mono text-[10px] uppercase tracking-widest opacity-60">Współrzędne są używane do widgetu zachodu słońca</p>
        <Textarea label="Kontakt" value={form.contact} onChange={e => update("contact", e.target.value)} rows={4}
          placeholder="Telefon, email, itp." />
        <div className="flex gap-3 pt-2">
          <Button type="submit" className="flex-1">Zapisz</Button>
          <Button type="button" variant="outline" onClick={onClose}>Anuluj</Button>
        </div>
      </form>
    </Modal>
  );
};

// ============================================================
// PROFILE VIEW
// ============================================================
const ProfileView = ({ user, onUpdate, animated, onToggleAnimated, theme, onToggleTheme }) => {
  const [form, setForm] = useState({
    firstName: user.firstName || "", lastName: user.lastName || "",
    username: user.username, password: "", newPassword: "", profilePicture: user.profilePicture || null
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  const update = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const save = async (e) => {
    e.preventDefault();
    setMsg(null); setSaving(true);

    const updated = { ...user };
    updated.firstName = form.firstName.trim();
    updated.lastName = form.lastName.trim();
    updated.profilePicture = form.profilePicture;

    // Username change
    const newUsername = form.username.trim().toLowerCase();
    if (newUsername !== user.username) {
      if (!newUsername) { setMsg({ type: "error", text: "Nazwa użytkownika jest wymagana" }); setSaving(false); return; }
      const existing = await storage.get("user:" + newUsername);
      if (existing) { setMsg({ type: "error", text: "Ta nazwa jest już zajęta" }); setSaving(false); return; }
      await storage.delete("user:" + user.username);
      updated.username = newUsername;
      updated.id = newUsername;
    }

    // Password change
    if (form.newPassword) {
      if (!form.password) { setMsg({ type: "error", text: "Podaj obecne hasło" }); setSaving(false); return; }
      if (form.password !== user.password) { setMsg({ type: "error", text: "Nieprawidłowe obecne hasło" }); setSaving(false); return; }
      updated.password = form.newPassword;
    }

    await storage.set("user:" + updated.username, updated);
    onUpdate(updated);
    setSaving(false);
    setMsg({ type: "success", text: "Zapisano" });
    setForm(prev => ({ ...prev, password: "", newPassword: "" }));
  };

  return (
    <div className="pb-20">
      <PageHeader title="Profil" subtitle={"@" + user.username + (user.role === "admin" ? " · admin" : "")} />
      <form onSubmit={save} className="px-5 space-y-5">
        <div className="flex flex-col items-center gap-3 py-4">
          <div className="w-28 h-28 border border-black overflow-hidden bg-white/40">
            {form.profilePicture
              ? <img src={form.profilePicture} alt="" className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center font-display text-4xl font-bold">{(form.firstName || form.username)[0]?.toUpperCase()}</div>}
          </div>
          <div className="flex gap-2">
            <ImageUpload value={form.profilePicture} onChange={v => update("profilePicture", v)} label="" maxSize={600} />
          </div>
        </div>
        <Input label="Imię" value={form.firstName} onChange={e => update("firstName", e.target.value)} />
        <Input label="Nazwisko" value={form.lastName} onChange={e => update("lastName", e.target.value)} />
        <Input label="Nazwa użytkownika" value={form.username} onChange={e => update("username", e.target.value)} />
        <div className="border-t border-black pt-5 space-y-3">
          <div className="font-mono text-xs uppercase tracking-widest opacity-70">Wygląd</div>
          <div className="flex items-center justify-between gap-3 py-1">
            <div className="min-w-0">
              <div className="text-sm">Tryb ciemny</div>
              <div className="font-mono text-[10px] uppercase tracking-widest opacity-60 mt-0.5">
                {theme === "dark" ? "Włączony" : "Wyłączony"}
              </div>
            </div>
            <button type="button" onClick={onToggleTheme}
              className="font-display text-xs px-4 py-2 border border-black hover:bg-black hover:text-white shrink-0">
              {theme === "dark" ? "☀ Jasny" : "☾ Ciemny"}
            </button>
          </div>
          <div className="flex items-center justify-between gap-3 py-1">
            <div className="min-w-0">
              <div className="text-sm">Animowane tło</div>
              <div className="font-mono text-[10px] uppercase tracking-widest opacity-60 mt-0.5">
                {animated ? "Włączone" : "Wyłączone"}
              </div>
            </div>
            <button type="button" onClick={onToggleAnimated}
              className="font-display text-xs px-4 py-2 border border-black hover:bg-black hover:text-white shrink-0">
              {animated ? "Wyłącz" : "Włącz"}
            </button>
          </div>
          <p className="font-mono text-[10px] uppercase tracking-widest opacity-60">Ustawienia są zapisywane na tym urządzeniu.</p>
        </div>
        <div className="border-t border-black pt-5 space-y-4">
          <div className="font-mono text-xs uppercase tracking-widest opacity-70">Zmień hasło</div>
          <Input label="Obecne hasło" type="password" value={form.password} onChange={e => update("password", e.target.value)} autoComplete="current-password" />
          <Input label="Nowe hasło" type="password" value={form.newPassword} onChange={e => update("newPassword", e.target.value)} autoComplete="new-password" />
          <p className="font-mono text-[10px] uppercase tracking-widest opacity-60">Hasła nie da się zresetować. Zapamiętaj nowe.</p>
        </div>
        {msg && (
          <div className={`font-mono text-xs uppercase tracking-widest border border-black px-3 py-2 ${msg.type === "error" ? "bg-white/60" : "bg-black text-white"}`}>
            {msg.text}
          </div>
        )}
        <Button type="submit" className="w-full" disabled={saving}>{saving ? "..." : "Zapisz"}</Button>
      </form>
    </div>
  );
};

// ============================================================
// GOŚCIE (GUEST LIST) VIEW
// ============================================================
const GoscieView = ({ user, users }) => {
  const sorted = [...users].sort((a, b) => {
    const an = (a.firstName || a.username).toLowerCase();
    const bn = (b.firstName || b.username).toLowerCase();
    return an.localeCompare(bn);
  });
  return (
    <div className="pb-20">
      <PageHeader title="Goście" subtitle={`${users.length} ${users.length === 1 ? "osoba" : "osób"}`} />
      <div className="px-5 space-y-2">
        {sorted.map(u => (
          <div key={u.id} className="flex items-center gap-3 border border-black p-3">
            <div className="w-12 h-12 border border-black overflow-hidden shrink-0 bg-white">
              {u.profilePicture
                ? <img src={u.profilePicture} alt="" className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center font-display text-lg font-bold">{(u.firstName || u.username)[0]?.toUpperCase()}</div>}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-display font-bold truncate">{u.firstName || u.username} {u.lastName}</div>
              <div className="font-mono text-[10px] uppercase opacity-60">@{u.username}{u.role === "admin" && " · admin"}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================
// ADMIN VIEW
// ============================================================
const AdminView = ({ user, users, onReloadUsers, guestListVisible, onToggleGuestList }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const save = async (data) => {
    const username = data.username.trim().toLowerCase();
    if (!username) return;

    if (!editing) {
      // new user
      const existing = await storage.get("user:" + username);
      if (existing) { alert("Ta nazwa jest zajęta"); return; }
      const newUser = {
        id: username, username, password: data.password,
        firstName: data.firstName || "", lastName: data.lastName || "",
        profilePicture: null, role: data.role || "basic"
      };
      await storage.set("user:" + username, newUser);
    } else {
      // edit
      const updated = { ...editing };
      updated.firstName = data.firstName;
      updated.lastName = data.lastName;
      updated.role = data.role;
      if (username !== editing.username) {
        const existing = await storage.get("user:" + username);
        if (existing) { alert("Ta nazwa jest zajęta"); return; }
        await storage.delete("user:" + editing.username);
        updated.username = username;
        updated.id = username;
      }
      if (data.password) updated.password = data.password;
      await storage.set("user:" + updated.username, updated);
    }
    setModalOpen(false); setEditing(null);
    onReloadUsers();
  };

  const remove = async (u) => {
    if (u.username === user.username) { alert("Nie możesz usunąć siebie"); return; }
    if (!confirm(`Usunąć użytkownika @${u.username}?`)) return;
    await storage.delete("user:" + u.username);
    onReloadUsers();
  };

  return (
    <div className="pb-20">
      <PageHeader title="Admin" subtitle="Zarządzanie aplikacją" />
      <div className="px-5 space-y-6">
        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-display font-bold uppercase mb-1">Lista gości</div>
              <div className="font-mono text-xs uppercase tracking-widest opacity-70">
                {guestListVisible ? "Widoczna dla wszystkich" : "Widoczna tylko dla adminów"}
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={onToggleGuestList}>
              {guestListVisible ? "Ukryj" : "Pokaż"}
            </Button>
          </div>
        </Card>
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-bold uppercase">Użytkownicy ({users.length})</h2>
            <Button size="sm" onClick={() => { setEditing(null); setModalOpen(true); }}>+ Dodaj</Button>
          </div>
          <div className="space-y-2">
            {users.map(u => (
              <div key={u.id} className="flex items-center gap-3 border border-black p-3">
                <div className="w-10 h-10 border border-black overflow-hidden shrink-0 bg-white">
                  {u.profilePicture
                    ? <img src={u.profilePicture} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center font-display font-bold">{(u.firstName || u.username)[0]?.toUpperCase()}</div>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-display font-bold truncate">{u.firstName || u.username} {u.lastName}</div>
                  <div className="font-mono text-[10px] uppercase opacity-60">@{u.username}{u.role === "admin" && " · admin"}</div>
                </div>
                <Button variant="outline" size="sm" onClick={() => { setEditing(u); setModalOpen(true); }}>Edytuj</Button>
                {u.username !== user.username && (
                  <Button variant="outline" size="sm" onClick={() => remove(u)}>Usuń</Button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      <UserEditModal open={modalOpen} onClose={() => { setModalOpen(false); setEditing(null); }}
        editing={editing} onSave={save} />
    </div>
  );
};

const UserEditModal = ({ open, onClose, editing, onSave }) => {
  const [form, setForm] = useState({ username: "", password: "", firstName: "", lastName: "", role: "basic" });
  useEffect(() => {
    if (open) setForm(editing ? {
      username: editing.username, password: "",
      firstName: editing.firstName || "", lastName: editing.lastName || "",
      role: editing.role || "basic"
    } : { username: "", password: "", firstName: "", lastName: "", role: "basic" });
  }, [open, editing]);
  const update = (k, v) => setForm(prev => ({ ...prev, [k]: v }));
  const submit = (e) => {
    e.preventDefault();
    if (!form.username.trim()) return;
    if (!editing && !form.password) { alert("Hasło jest wymagane dla nowego użytkownika"); return; }
    onSave(form);
  };
  return (
    <Modal open={open} onClose={onClose} title={editing ? "Edytuj użytkownika" : "Nowy użytkownik"}>
      <form onSubmit={submit} className="space-y-4">
        <Input label="Nazwa użytkownika" value={form.username} onChange={e => update("username", e.target.value)} required />
        <Input label={editing ? "Nowe hasło (opcjonalne)" : "Hasło"}
          type="text" value={form.password} onChange={e => update("password", e.target.value)} />
        <Input label="Imię" value={form.firstName} onChange={e => update("firstName", e.target.value)} />
        <Input label="Nazwisko" value={form.lastName} onChange={e => update("lastName", e.target.value)} />
        <Select label="Rola" value={form.role} onChange={e => update("role", e.target.value)}>
          <option value="basic">Uczestnik</option>
          <option value="admin">Admin</option>
        </Select>
        <div className="flex gap-3 pt-2">
          <Button type="submit" className="flex-1">Zapisz</Button>
          <Button type="button" variant="outline" onClick={onClose}>Anuluj</Button>
        </div>
      </form>
    </Modal>
  );
};

// ============================================================
// MAIN APP
// ============================================================
export default function App() {
  const [initialized, setInitialized] = useState(false);
  const [sessionRestored, setSessionRestored] = useState(false);
  const [initError, setInitError] = useState(null);
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [view, setView] = useState("home");
  const [stacjaId, setStacjaId] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [guestListVisible, setGuestListVisible] = useState(false);
  const [stacjeRefreshKey, setStacjeRefreshKey] = useState(0);
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem("campbau:theme");
      if (saved === "dark" || saved === "light") return saved;
    } catch {}
    return "light";
  });

  const [animated, setAnimated] = useState(() => {
    try {
      const saved = localStorage.getItem("campbau:animated");
      if (saved === "false") return false;
    } catch {}
    return true;
  });

  // Toggle .dark class on body whenever theme changes
  useEffect(() => {
    document.body.classList.toggle("dark", theme === "dark");
    try { localStorage.setItem("campbau:theme", theme); } catch {}
    return () => { document.body.classList.remove("dark"); };
  }, [theme]);

  // Persist animated preference
  useEffect(() => {
    try { localStorage.setItem("campbau:animated", animated ? "true" : "false"); } catch {}
  }, [animated]);

  const toggleTheme = () => setTheme(t => t === "dark" ? "light" : "dark");
  const toggleAnimated = () => setAnimated(a => !a);

  // Initialize default admin, settings, demo data
  useEffect(() => {
    (async () => {
      try {
        // Fast path — if already initialized once, skip the whole bootstrap.
        // Just load settings in parallel with whatever happens next.
        const seededFlag = await storage.get("seeded:v1");
        if (seededFlag) {
          const settings = await storage.get("settings");
          setGuestListVisible(!!settings?.guestListVisible);
          setInitialized(true);
          return;
        }

        // First-run bootstrap. Run independent ops in parallel.
        const [existing, settings, miejsce] = await Promise.all([
          storage.get("user:bau"),
          storage.get("settings"),
          storage.get("miejsce"),
        ]);

        const writes = [];
        if (!existing) {
          writes.push(storage.set("user:bau", {
            id: "bau", username: "bau", password: "kambau",
            firstName: "", lastName: "", profilePicture: null, role: "admin"
          }));
        }
        if (!settings) {
          writes.push(storage.set("settings", { guestListVisible: false }));
        } else {
          setGuestListVisible(!!settings.guestListVisible);
        }
        if (miejsce && (typeof miejsce.lat !== "number" || typeof miejsce.lng !== "number")) {
          writes.push(storage.set("miejsce", { ...miejsce, lat: 51.8667, lng: 20.8667 }));
        }
        await Promise.all(writes);

        // Seed demo data on first run
        await seedDemoData();
      } catch (err) {
        console.error("Init error:", err);
        setInitError(err?.message || String(err));
      }
      setInitialized(true);
    })();
  }, []);

  const loadUsers = useCallback(async () => {
    const all = await storage.getAll("user:");
    setUsers(all);
  }, []);

  useEffect(() => { if (user) loadUsers(); }, [user, loadUsers]);

  // Restore session on init
  useEffect(() => {
    if (!initialized) return;
    if (sessionRestored) return;
    let cancelled = false;
    (async () => {
      try {
        const savedUsername = localStorage.getItem("campbau:session");
        if (savedUsername) {
          const u = await storage.get("user:" + savedUsername);
          if (!cancelled && u) {
            setUser(u);
            const s = await storage.get("settings");
            if (!cancelled) setGuestListVisible(!!s?.guestListVisible);
          } else if (!cancelled) {
            // Session pointed to a user that no longer exists
            try { localStorage.removeItem("campbau:session"); } catch {}
          }
        }
      } catch (err) {
        console.warn("Session restore failed:", err);
      } finally {
        if (!cancelled) setSessionRestored(true);
      }
    })();
    return () => { cancelled = true; };
  }, [initialized, sessionRestored]);

  const onLogin = async (u) => {
    setUser(u);
    setView("home");
    try { localStorage.setItem("campbau:session", u.username); } catch {}
    const s = await storage.get("settings");
    setGuestListVisible(!!s?.guestListVisible);
  };

  const onLogout = () => {
    setUser(null);
    setDrawerOpen(false);
    setView("home");
    try { localStorage.removeItem("campbau:session"); } catch {}
  };

  const onUpdateUser = (updated) => {
    setUser(updated);
    try { localStorage.setItem("campbau:session", updated.username); } catch {}
    loadUsers();
  };

  const onToggleGuestList = async () => {
    const next = !guestListVisible;
    await storage.set("settings", { guestListVisible: next });
    setGuestListVisible(next);
  };

  const navigate = (v) => {
    setView(v);
    setStacjaId(null);
  };

  const openStacjaDetail = (id) => {
    setStacjaId(id);
    setView("stacja-detail");
  };

  if (!initialized || !sessionRestored) {
    return (
      <>
        <GlobalStyles />
        <AnimatedBackground />
        <div className="min-h-screen flex items-center justify-center">
          <div className="spinner" />
        </div>
      </>
    );
  }

  if (!user) {
    return (
      <>
        <GlobalStyles />
        <AnimatedBackground />
        <LoginView onLogin={onLogin} initError={initError} />
      </>
    );
  }

  let content = null;
  switch (view) {
    case "home":
      content = <HomeView user={user} guestListVisible={guestListVisible} onNavigate={navigate} />; break;
    case "wydarzenia":
      content = <WydarzeniaView user={user} onOpenStacja={openStacjaDetail} />; break;
    case "stacje":
      content = <StacjeView key={stacjeRefreshKey} user={user} users={users} onOpenDetail={openStacjaDetail} />; break;
    case "stacja-detail":
      content = <StacjaDetailView stacjaId={stacjaId} user={user} users={users}
        onBack={() => { setView("stacje"); setStacjaId(null); }}
        onRefresh={() => setStacjeRefreshKey(k => k + 1)} />; break;
    case "cnoty":
      content = <CnotyView user={user} />; break;
    case "festiwal":
      content = <FestiwalView user={user} />; break;
    case "miejsce":
      content = <MiejsceView user={user} />; break;
    case "profile":
      content = <ProfileView user={user} onUpdate={onUpdateUser}
        animated={animated} onToggleAnimated={toggleAnimated}
        theme={theme} onToggleTheme={toggleTheme} />; break;
    case "goscie":
      if (user.role !== "admin" && !guestListVisible) { content = <EmptyState message="Brak dostępu" />; }
      else content = <GoscieView user={user} users={users} />;
      break;
    case "admin":
      if (user.role !== "admin") { content = <EmptyState message="Brak dostępu" />; }
      else content = <AdminView user={user} users={users} onReloadUsers={loadUsers}
        guestListVisible={guestListVisible} onToggleGuestList={onToggleGuestList} />;
      break;
    default:
      content = <HomeView user={user} guestListVisible={guestListVisible} onNavigate={navigate} />;
  }

  return (
    <>
      <GlobalStyles />
      <AnimatedBackground animated={animated} />
      <div className="min-h-screen relative app-shell">
        <Header user={user} guestListVisible={guestListVisible}
          currentView={view} onNavigate={navigate}
          onMenuOpen={() => setDrawerOpen(true)} onLogout={onLogout}
          theme={theme} onToggleTheme={toggleTheme} />
        <main className="fade-in max-w-7xl mx-auto" key={view + stacjaId}>{content}</main>
        <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)}
          currentView={view} onNavigate={navigate} user={user}
          guestListVisible={guestListVisible} onLogout={onLogout}
          theme={theme} onToggleTheme={toggleTheme} />
      </div>
      <ErrorToast />
    </>
  );
}
