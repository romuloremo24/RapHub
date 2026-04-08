// ─── Canvas starfield ──────────────────────────────────────────────────────────
function initStars() {
  const canvas = document.getElementById('stars-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, stars = [];

  const resize = () => {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  };

  const mkStar = () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    r: Math.random() * 1.2 + 0.2,
    a: Math.random(),
    da: (Math.random() * 0.003 + 0.001) * (Math.random() > 0.5 ? 1 : -1),
    vx: (Math.random() - 0.5) * 0.04,
    vy: (Math.random() - 0.5) * 0.04,
    hue: Math.random() > 0.85 ? (Math.random() > 0.5 ? 'teal' : 'coral') : 'white',
  });

  resize();
  stars = Array.from({ length: 160 }, mkStar);
  window.addEventListener('resize', () => { resize(); stars = Array.from({ length: 160 }, mkStar); });

  const COLORS = {
    teal:  (a) => `rgba(45,212,191,${a * 0.8})`,
    coral: (a) => `rgba(251,146,60,${a * 0.7})`,
    white: (a) => `rgba(255,255,255,${a * 0.7})`,
  };

  const draw = () => {
    ctx.clearRect(0, 0, W, H);
    stars.forEach(s => {
      s.a += s.da;
      if (s.a > 1 || s.a < 0) s.da *= -1;
      s.x += s.vx; s.y += s.vy;
      if (s.x < 0) s.x = W; if (s.x > W) s.x = 0;
      if (s.y < 0) s.y = H; if (s.y > H) s.y = 0;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = COLORS[s.hue](s.a);
      ctx.fill();
    });
    requestAnimationFrame(draw);
  };
  draw();
}

// ─── SVG progress ring ─────────────────────────────────────────────────────────
const RING_CIRC = 2 * Math.PI * 98; // 615.75

function updateRing(pct) {
  const ring = document.getElementById('ring-fill');
  if (!ring) return;
  ring.setAttribute('stroke-dashoffset', RING_CIRC * (1 - pct / 100));
}

function resetRing() { updateRing(0); }

// ─── Breath guide ──────────────────────────────────────────────────────────────
let _breathInterval = null;

function startBreathGuide() {
  const el = document.getElementById('breath-guide');
  if (!el || state.type !== 'breathing') return;
  let phase = true;
  const labels = { es: ['Inhala', 'Exhala'], en: ['Inhale', 'Exhale'] };
  const L = labels[state.lang];
  el.textContent = L[0];
  _breathInterval = setInterval(() => {
    phase = !phase;
    el.textContent = L[phase ? 0 : 1];
  }, 4000);
}

function stopBreathGuide() {
  clearInterval(_breathInterval);
  _breathInterval = null;
  const el = document.getElementById('breath-guide');
  if (el) el.textContent = '';
}

// ─── WakeLock ─────────────────────────────────────────────────────────────────
let _wakeLock = null;
async function acquireWakeLock() {
  try {
    if ('wakeLock' in navigator) _wakeLock = await navigator.wakeLock.request('screen');
  } catch(e) {}
}
function releaseWakeLock() {
  if (_wakeLock) { _wakeLock.release().catch(()=>{}); _wakeLock = null; }
}

// ─── State ────────────────────────────────────────────────────────────────────
const state = {
  lang: 'es',
  type: 'breathing',
  duration: 10,
  voice: true,
  speed: 0.6,
  voiceVolume: 1.0,
  selectedVoiceURI: '',
  ambient: 'none',
  ambientVolume: 0.7,
  running: false,
  elapsed: 0,
  timerId: null,
  sessionStart: null,
  ambientCtx: null,
  ambientNodes: [],
  ambientMasterGain: null,
  previewingAmbient: false,
  speechQueue: [],
};

// ─── Translations ──────────────────────────────────────────────────────────────
const T = {
  es: {
    types_label: 'Tipo de meditación',
    duration_label: 'Duración',
    voice_label: 'Voz guiada',
    voice_sub: 'Instrucciones por audio',
    voice_select_label: 'Voz',
    speed_label: 'Velocidad',
    ambient_label: 'Sonido ambiental',
    ambient_label_live: 'Ambiente · cambia en vivo',
    ambient_preview: 'Escuchar',
    ambient_stop_preview: 'Detener',
    voice_preview: 'Probar voz',
    start: 'Comenzar meditación',
    stop: 'Detener',
    elapsed: 'Transcurrido',
    remaining: 'Restante',
    completed: '¡Sesión completada! 🙏',
    min: 'min',
    ambient_none: 'Silencio',
    ambient_rain: '🌧 Lluvia',
    ambient_bowl: '🔔 Cuenco',
    ambient_ocean: '🌊 Océano',
    ambient_forest: '🌿 Bosque',
    history_title: 'Historial',
    history_empty: 'Aún no hay sesiones registradas.',
    clear_history: 'Limpiar historial',
    completed_badge: 'Completa',
    partial_badge: 'Parcial',
    voice_auto: 'Automática',
    vol_ambient: 'Ambiente',
    vol_voice: 'Voz',
  },
  en: {
    types_label: 'Meditation type',
    duration_label: 'Duration',
    voice_label: 'Guided voice',
    voice_sub: 'Audio instructions',
    voice_select_label: 'Voice',
    speed_label: 'Speed',
    ambient_label: 'Ambient sound',
    ambient_label_live: 'Ambient · change live',
    ambient_preview: 'Preview',
    ambient_stop_preview: 'Stop',
    voice_preview: 'Test voice',
    start: 'Start meditation',
    stop: 'Stop',
    elapsed: 'Elapsed',
    remaining: 'Remaining',
    completed: 'Session completed! 🙏',
    min: 'min',
    ambient_none: 'Silence',
    ambient_rain: '🌧 Rain',
    ambient_bowl: '🔔 Bowl',
    ambient_ocean: '🌊 Ocean',
    ambient_forest: '🌿 Forest',
    history_title: 'History',
    history_empty: 'No sessions recorded yet.',
    clear_history: 'Clear history',
    completed_badge: 'Complete',
    partial_badge: 'Partial',
    voice_auto: 'Automatic',
    vol_ambient: 'Ambient',
    vol_voice: 'Voice',
  },
};

// ─── Meditation types ──────────────────────────────────────────────────────────
const TYPES = {
  breathing: {
    icon: '🫁',
    es: { name: 'Respiración', desc: 'Inhala, exhala, calma' },
    en: { name: 'Breathing', desc: 'Inhale, exhale, relax' },
  },
  body_scan: {
    icon: '🧘',
    es: { name: 'Escaneo corporal', desc: 'Relaja cada parte del cuerpo' },
    en: { name: 'Body Scan', desc: 'Relax each part of your body' },
  },
  mindfulness: {
    icon: '🌸',
    es: { name: 'Atención plena', desc: 'Vive el momento presente' },
    en: { name: 'Mindfulness', desc: 'Be present in the moment' },
  },
  loving: {
    icon: '💜',
    es: { name: 'Amor bondadoso', desc: 'Cultiva amor y compasión' },
    en: { name: 'Loving Kindness', desc: 'Cultivate love and compassion' },
  },
  sleep: {
    icon: '🌙',
    es: { name: 'Para dormir', desc: 'Relájate y descansa profundo' },
    en: { name: 'Sleep', desc: 'Relax and sleep deeply' },
  },
  focus: {
    icon: '🎯',
    es: { name: 'Enfoque', desc: 'Claridad mental y concentración' },
    en: { name: 'Focus', desc: 'Mental clarity and concentration' },
  },
  wim_hof: {
    icon: '❄️',
    es: { name: 'Wim Hof', desc: '3 rondas · respiración y retención' },
    en: { name: 'Wim Hof', desc: '3 rounds · breathing & retention' },
  },
};

// ─── Scripts ───────────────────────────────────────────────────────────────────
function getScript(type, lang, totalSecs) {
  const mid = Math.floor(totalSecs / 2);
  const q3  = Math.floor(totalSecs * 0.75);
  const end = Math.max(totalSecs - 30, mid + 10);

  const S = {
    breathing: {
      es: [
        { at: 0,   text: 'Bienvenido. Encuentra una posición cómoda y cierra suavemente los ojos.' },
        { at: 10,  text: 'Comencemos. Inhala lentamente por la nariz durante cuatro tiempos.' },
        { at: 20,  text: 'Exhala despacio por la boca. Deja que la tensión salga con cada exhalación.' },
        { at: 35,  text: 'Sigue respirando con este ritmo. Inhala... dos, tres, cuatro... Exhala... dos, tres, cuatro.' },
        { at: 70,  text: 'Cada vez que exhalas, siente cómo tu cuerpo se relaja un poco más.' },
        { at: mid, text: 'Vas muy bien. Solo tu respiración. Solo este momento.' },
        { at: q3,  text: 'Continúa respirando profundamente. Consciente de cada inhalación y exhalación.' },
        { at: end, text: 'Estamos llegando al final. Haz una respiración profunda y prepárate para volver.' },
        { at: totalSecs - 5, text: 'Mueve suavemente los dedos, abre los ojos. Gracias por este momento de paz.' },
      ],
      en: [
        { at: 0,   text: 'Welcome. Find a comfortable position and gently close your eyes.' },
        { at: 10,  text: "Let's begin. Slowly inhale through your nose for four counts." },
        { at: 20,  text: 'Now exhale slowly through your mouth. Let tension leave with each breath.' },
        { at: 35,  text: 'Keep breathing at this rhythm. Inhale... two, three, four... Exhale... two, three, four.' },
        { at: 70,  text: 'With each exhale, feel your body relax a little more.' },
        { at: mid, text: 'You are doing great. Only your breath. Only this moment.' },
        { at: q3,  text: 'Continue breathing deeply. Aware of each inhale and exhale.' },
        { at: end, text: "We're almost done. Take a deep breath and prepare to return." },
        { at: totalSecs - 5, text: 'Gently wiggle your fingers, open your eyes. Thank you for this moment of peace.' },
      ],
    },
    body_scan: {
      es: [
        { at: 0,        text: 'Cierra los ojos y recuéstate cómodamente. Vamos a recorrer tu cuerpo con atención.' },
        { at: 12,       text: 'Lleva la atención a los pies. Siente el contacto con el suelo. Relaja los dedos.' },
        { at: 45,       text: 'Sube hacia pantorrillas y rodillas. Deja que la tensión se disuelva.' },
        { at: 80,       text: 'Lleva la atención a los muslos y caderas. Suelta el peso. Déjate sostener.' },
        { at: mid,      text: 'Sube al abdomen. Siente cómo se mueve con cada respiración. Suelta toda contracción.' },
        { at: mid + 35, text: 'Ahora el pecho y los hombros. Deja caer los hombros. Relaja el pecho.' },
        { at: q3,       text: 'Los brazos, manos y dedos. Siente el peso. Suelta todo esfuerzo.' },
        { at: q3 + 30,  text: 'La cara y la cabeza. Relaja la frente, los ojos, la mandíbula. Descansa la mente.' },
        { at: end,      text: 'Tu cuerpo está completamente relajado. Disfruta esta calma.' },
        { at: totalSecs - 5, text: 'Respira profundo y regresa suavemente. Abre los ojos con gratitud.' },
      ],
      en: [
        { at: 0,        text: 'Close your eyes and lie down comfortably. We will scan your body with gentle attention.' },
        { at: 12,       text: 'Bring attention to your feet. Feel them touching the ground. Relax your toes.' },
        { at: 45,       text: 'Move up to the calves and knees. Let any tension dissolve.' },
        { at: 80,       text: 'Bring attention to your thighs and hips. Release the weight. Let yourself be held.' },
        { at: mid,      text: 'Move to your abdomen. Feel it rise and fall with each breath. Release all tension.' },
        { at: mid + 35, text: 'Now your chest and shoulders. Let your shoulders drop. Relax your chest.' },
        { at: q3,       text: 'Your arms, hands, and fingers. Feel the weight. Release all effort.' },
        { at: q3 + 30,  text: 'Your face and head. Relax your forehead, eyes, jaw. Let your mind rest.' },
        { at: end,      text: 'Your body is completely relaxed. Enjoy this calm.' },
        { at: totalSecs - 5, text: 'Take a deep breath and gently return. Open your eyes with gratitude.' },
      ],
    },
    mindfulness: {
      es: [
        { at: 0,   text: 'Siéntate con la espalda recta. No hay ningún lugar a donde ir. Solo este momento.' },
        { at: 12,  text: 'Observa tu respiración natural sin modificarla. Solo sé testigo.' },
        { at: 40,  text: 'Cuando tu mente divague, simplemente nota adónde fue y vuelve suavemente al presente.' },
        { at: 70,  text: 'El presente es este sonido, esta sensación, esta respiración. Solo esto.' },
        { at: mid, text: 'Observa los pensamientos como nubes que pasan. No los sigas. Solo observa.' },
        { at: q3,  text: 'Cada vez que regresas al presente, fortaleces tu atención. Eso es la práctica.' },
        { at: end, text: 'En estos últimos momentos, siente agradecimiento por haberte dado este tiempo.' },
        { at: totalSecs - 5, text: 'Abre los ojos lentamente. Lleva esta presencia contigo durante el día.' },
      ],
      en: [
        { at: 0,   text: "Sit with your back straight. There's nowhere to go. Only this moment." },
        { at: 12,  text: 'Observe your natural breath without changing it. Simply witness.' },
        { at: 40,  text: "When your mind wanders, just notice where it went and gently return to the present." },
        { at: 70,  text: 'The present is this sound, this sensation, this breath. Just this.' },
        { at: mid, text: "Watch thoughts like passing clouds. Don't follow them. Just observe." },
        { at: q3,  text: 'Every time you return to the present, you strengthen your attention. That is the practice.' },
        { at: end, text: 'In these final moments, feel gratitude for giving yourself this time.' },
        { at: totalSecs - 5, text: 'Slowly open your eyes. Carry this presence with you through the day.' },
      ],
    },
    loving: {
      es: [
        { at: 0,   text: 'Cierra los ojos. Lleva las manos al corazón. Siente su latido suave y constante.' },
        { at: 14,  text: 'Repite en silencio: que yo esté bien, que yo esté feliz, que yo esté en paz.' },
        { at: 45,  text: 'Ahora piensa en alguien que amas. Envíale esos mismos deseos.' },
        { at: 80,  text: 'Extiende ese amor a alguien neutral. Envíale tu calidez.' },
        { at: mid, text: 'Piensa en alguien con quien tengas dificultades. Con compasión, envíale también buenos deseos.' },
        { at: q3,  text: 'Expande ese amor a todos los seres del mundo. Que todos estén bien. Que todos sean felices.' },
        { at: end, text: 'Regresa al corazón. Siente la calidez que has cultivado.' },
        { at: totalSecs - 5, text: 'Abre los ojos llevando ese amor contigo. Gracias.' },
      ],
      en: [
        { at: 0,   text: 'Close your eyes. Bring your hands to your heart. Feel its steady, gentle beat.' },
        { at: 14,  text: 'Silently repeat: may I be well, may I be happy, may I be at peace.' },
        { at: 45,  text: 'Now think of someone you love. Send them those same wishes.' },
        { at: 80,  text: 'Extend that love to someone neutral. Send them your warmth.' },
        { at: mid, text: 'Think of someone you find difficult. With compassion, send them good wishes too.' },
        { at: q3,  text: 'Expand that love to all beings in the world. May all be well. May all be happy.' },
        { at: end, text: 'Return to your heart. Feel the warmth you have cultivated.' },
        { at: totalSecs - 5, text: 'Open your eyes carrying that love with you. Thank you.' },
      ],
    },
    sleep: {
      es: [
        { at: 0,   text: 'Recuéstate cómodamente. Permite que todo el peso de tu cuerpo caiga sobre la cama.' },
        { at: 14,  text: 'Respira profundo... y exhala soltando el día. Todo puede esperar a mañana.' },
        { at: 40,  text: 'Siente cómo tu cuerpo se hunde suavemente. Cada músculo se afloja. Los párpados pesan.' },
        { at: 70,  text: 'Imagina un lugar tranquilo. Una playa serena, un bosque suave, tu lugar favorito.' },
        { at: mid, text: 'Estás a salvo. Estás cómodo. No necesitas pensar en nada. Solo descansar.' },
        { at: q3,  text: 'Tu cuerpo sana mientras descansas. Tu mente descansa. Deja que el sueño llegue.' },
        { at: end, text: 'Deja ir cualquier pensamiento. Regresa siempre a la quietud.' },
      ],
      en: [
        { at: 0,   text: "Lie down comfortably. Allow your body's full weight to sink into the bed." },
        { at: 14,  text: 'Breathe deeply... and exhale, releasing the day. Everything can wait until tomorrow.' },
        { at: 40,  text: 'Feel your body gently sinking. Every muscle loosens. Your eyelids grow heavy.' },
        { at: 70,  text: 'Imagine a peaceful place. A calm beach, a gentle forest, your favorite spot.' },
        { at: mid, text: "You are safe. You are comfortable. You don't need to think. Just rest." },
        { at: q3,  text: 'Your body heals as you rest. Your mind rests. Let sleep come naturally.' },
        { at: end, text: 'Release any thought that appears. Always return to the stillness.' },
      ],
    },
    focus: {
      es: [
        { at: 0,   text: 'Siéntate erguido y pon los pies firmemente en el suelo. Prepárate para enfocarte.' },
        { at: 12,  text: 'Inhala por cuatro tiempos, retén dos, exhala por seis. Esto activa tu claridad mental.' },
        { at: 45,  text: 'Visualiza tu mente como un lago tranquilo. La superficie está calma. Todo es claro.' },
        { at: 75,  text: 'Imagina la tarea en que deseas enfocarte. Visualízala terminada con éxito.' },
        { at: mid, text: 'Cada respiración te da más claridad. Sientes que puedes lograr lo que te propones.' },
        { at: q3,  text: 'Tu mente está alerta, presente y poderosa. Tienes todo lo que necesitas dentro de ti.' },
        { at: end, text: 'Prepárate para salir con energía y claridad total.' },
        { at: totalSecs - 5, text: 'Abre los ojos. Estás listo. Ve y enfócate.' },
      ],
      en: [
        { at: 0,   text: 'Sit up straight with your feet firmly on the ground. Prepare to focus.' },
        { at: 12,  text: 'Inhale for four counts, hold for two, exhale for six. This activates your mental clarity.' },
        { at: 45,  text: 'Visualize your mind as a still lake. The surface is calm. Everything is clear.' },
        { at: 75,  text: 'Imagine the task you want to focus on. See it completed successfully.' },
        { at: mid, text: 'Each breath brings more clarity. You feel you can achieve what you set out to do.' },
        { at: q3,  text: 'Your mind is alert, present, and powerful. You have everything you need within you.' },
        { at: end, text: 'Prepare to step out with full energy and clarity.' },
        { at: totalSecs - 5, text: 'Open your eyes. You are ready. Go and focus.' },
      ],
    },
  };

  return (S[type]?.[lang] || []).filter(s => s.at < totalSecs);
}

// ─── Protocolo Wim Hof ────────────────────────────────────────────────────────
// Basado en el método original: 3 rondas de 30 respiraciones de poder
// + retención con pulmones vacíos + inhalación de recuperación 15s
const WH = {
  rounds: 3,
  breathsPerRound: 30,
  breathMs: 3000,               // 3s por ciclo (ritmo real Wim Hof: inhala lento + exhala)
  holdDuration: [90, 105, 120], // segundos de retención por ronda (aumenta progresivamente)
  recoveryDuration: 15,         // segundos de retención en recuperación
  restBetweenRounds: 6,         // segundos de descanso entre rondas
};

let _whPhaseTimer = null;

function _whS(es, en) { speak(state.lang === 'es' ? es : en); }

function startWimHofSession() {
  state.running = true;
  state.elapsed = 0;
  state.sessionStart = new Date().toISOString();

  if (state.previewingAmbient) {
    state.previewingAmbient = false;
    updateAmbientPreviewBtn();
  }

  acquireWakeLock();
  resetRing();
  setRunningUI(true);
  document.querySelector('.orb').classList.add('active');
  playBell();
  startAmbient(state.ambient);

  // Activar modo Wim Hof en el progress card
  document.getElementById('progress-section').classList.add('wim-hof-mode');
  _whReset('—', '', '', '');

  _whS(
    'Bienvenido a la respiración de Wim Hof. Haremos tres rondas. Cada ronda: treinta respiraciones de poder, retención con pulmones vacíos, y una respiración de recuperación. Siéntate o recuéstate cómodamente.',
    'Welcome to Wim Hof breathing. We will do three rounds. Each round: thirty power breaths, empty-lung retention, and a recovery breath. Sit or lie down comfortably.'
  );

  setTimeout(() => _whStartRound(1), 9000);
}

function _whReset(count, sub, hint, phase) {
  const c = document.getElementById('wh-count');
  const s = document.getElementById('wh-count-sub');
  const h = document.getElementById('wh-hint');
  const p = document.getElementById('phase-text');
  if (c) { c.textContent = count; c.classList.remove('hold-mode'); }
  if (s) s.textContent = sub;
  if (h) h.textContent = hint;
  if (p) p.textContent = phase;
}

function _whStartRound(round) {
  if (!state.running) return;

  const roundLbl = state.lang === 'es'
    ? `Ronda ${round} de ${WH.rounds}`
    : `Round ${round} of ${WH.rounds}`;
  const rl = document.getElementById('wh-round-label');
  if (rl) rl.textContent = roundLbl;

  _whReset(
    '1',
    `/ ${WH.breathsPerRound}`,
    state.lang === 'es' ? '↑ Inhala  ↓ Exhala' : '↑ Inhale  ↓ Exhale',
    state.lang === 'es' ? 'Respiración de poder' : 'Power breathing'
  );

  // Orb rápido + breath-guide alternado
  const orb = document.querySelector('.orb');
  orb.classList.add('wh-breathing');
  orb.classList.remove('wh-hold');

  const bg = document.getElementById('breath-guide');
  const labels = state.lang === 'es' ? ['Inhala', 'Exhala'] : ['Inhale', 'Exhale'];
  let bgPhase = true;
  if (bg) bg.textContent = labels[0];
  const bgTimer = setInterval(() => {
    if (!state.running) { clearInterval(bgTimer); return; }
    bgPhase = !bgPhase;
    if (bg) bg.textContent = labels[bgPhase ? 0 : 1];
  }, WH.breathMs / 2); // 1s por fase

  _whS(
    round === 1
      ? 'Comenzamos. Inhala profundo por la nariz y exhala por la boca. Sigue el ritmo del orbe.'
      : `Ronda ${round}. Treinta respiraciones. Sigue el ritmo.`,
    round === 1
      ? 'Begin. Deep inhale through your nose, exhale through your mouth. Follow the orb.'
      : `Round ${round}. Thirty breaths. Follow the rhythm.`
  );

  let breathCount = 0;
  _whPhaseTimer = setInterval(() => {
    if (!state.running) { clearInterval(_whPhaseTimer); clearInterval(bgTimer); return; }
    breathCount++;

    const c = document.getElementById('wh-count');
    if (c) c.textContent = breathCount;

    // Progreso del anillo: cada ronda = 1/3, dentro de ronda: breathing=60%, hold=30%, recovery=10%
    const base = (round - 1) / WH.rounds;
    const ringPct = (base + (breathCount / WH.breathsPerRound) * 0.6 / WH.rounds) * 100;
    updateRing(Math.min(ringPct, 99));

    // Hitos de voz
    if (breathCount === 10) _whS('Diez.', 'Ten.');
    else if (breathCount === 20) _whS('Veinte.', 'Twenty.');
    else if (breathCount === 25) _whS('Cinco más.', 'Five more.');
    else if (breathCount === 28) _whS('Casi.', 'Almost there.');

    if (breathCount >= WH.breathsPerRound) {
      clearInterval(_whPhaseTimer);
      clearInterval(bgTimer);
      if (bg) bg.textContent = '';
      orb.classList.remove('wh-breathing');
      setTimeout(() => _whStartHold(round), 700);
    }
  }, WH.breathMs);
}

function _whStartHold(round) {
  if (!state.running) return;

  const orb = document.querySelector('.orb');
  orb.classList.add('wh-hold');

  const holdSecs = WH.holdDuration[round - 1];
  const c = document.getElementById('wh-count');

  _whReset(
    '0:00',
    '',
    state.lang === 'es' ? 'No respires — pulmones vacíos' : 'Don\'t breathe — lungs empty',
    state.lang === 'es' ? '⬇ Retención' : '⬇ Hold'
  );
  if (c) c.classList.add('hold-mode');

  _whS(
    'Exhala completamente y retén. Pulmones vacíos. No respires.',
    'Exhale completely and hold. Lungs empty. Do not breathe.'
  );

  let holdElapsed = 0;
  _whPhaseTimer = setInterval(() => {
    if (!state.running) { clearInterval(_whPhaseTimer); return; }
    holdElapsed++;

    if (c) c.textContent = formatTime(holdElapsed);

    // Progreso anillo
    const base = (round - 1) / WH.rounds;
    const ringPct = (base + (0.6 + holdElapsed / holdSecs * 0.3) / WH.rounds) * 100;
    updateRing(Math.min(ringPct, 99));

    if (holdElapsed === 30) _whS('Treinta segundos.', 'Thirty seconds.');
    else if (holdElapsed === 60) _whS('Un minuto.', 'One minute.');
    else if (holdElapsed === holdSecs - 10) {
      _whS('Diez segundos más.', 'Ten more seconds.');
    }

    if (holdElapsed >= holdSecs) {
      clearInterval(_whPhaseTimer);
      orb.classList.remove('wh-hold');
      setTimeout(() => _whStartRecovery(round), 400);
    }
  }, 1000);
}

function _whStartRecovery(round) {
  if (!state.running) return;

  const orb = document.querySelector('.orb');
  orb.classList.add('wh-breathing');

  _whReset(
    String(WH.recoveryDuration),
    state.lang === 'es' ? 'seg' : 'sec',
    state.lang === 'es' ? 'Inhala y retén' : 'Inhale and hold',
    state.lang === 'es' ? '⬆ Recuperación' : '⬆ Recovery breath'
  );

  _whS(
    'Inhala profundo. Llena los pulmones completamente. Retén.',
    'Deep inhale. Fill your lungs completely. Hold.'
  );

  let countdown = WH.recoveryDuration;
  _whPhaseTimer = setInterval(() => {
    if (!state.running) { clearInterval(_whPhaseTimer); return; }
    countdown--;
    const c = document.getElementById('wh-count');
    if (c) c.textContent = countdown;

    if ([5, 4, 3, 2, 1].includes(countdown)) {
      _whS(String(countdown), String(countdown));
    }

    if (countdown <= 0) {
      clearInterval(_whPhaseTimer);
      orb.classList.remove('wh-breathing');

      // Progreso anillo — ronda completa
      const ringPct = round / WH.rounds * 100;
      updateRing(Math.min(ringPct, round < WH.rounds ? 99 : 100));

      _whS('Exhala.', 'Exhale.');

      if (round < WH.rounds) {
        const rl = document.getElementById('wh-round-label');
        if (rl) rl.textContent = '';
        _whReset(
          '✓',
          '',
          state.lang === 'es' ? 'Descansa...' : 'Rest...',
          state.lang === 'es' ? `Ronda ${round} completada` : `Round ${round} done`
        );
        setTimeout(() => {
          _whS(
            `Preparando ronda ${round + 1}.`,
            `Preparing round ${round + 1}.`
          );
          setTimeout(() => _whStartRound(round + 1), 3000);
        }, 1500);
      } else {
        setTimeout(_whFinish, 1500);
      }
    }
  }, 1000);
}

function _whFinish() {
  if (!state.running) return;
  updateRing(100);
  _whReset(
    '✓',
    '',
    '',
    state.lang === 'es' ? '¡Completado!' : 'Completed!'
  );
  const rl = document.getElementById('wh-round-label');
  if (rl) rl.textContent = '';

  playBell();
  setTimeout(playBell, 2500);

  _whS(
    'Excelente. Completaste las tres rondas de Wim Hof. Observa la energía y la claridad en tu mente y tu cuerpo. Bien hecho.',
    'Excellent. You completed all three Wim Hof rounds. Notice the energy and clarity in your mind and body. Well done.'
  );

  setTimeout(() => { if (state.running) stopSession(true); }, 12000);
}

function _whCleanup() {
  if (_whPhaseTimer) { clearInterval(_whPhaseTimer); _whPhaseTimer = null; }
  const orb = document.querySelector('.orb');
  if (orb) orb.classList.remove('wh-breathing', 'wh-hold');
  const bg = document.getElementById('breath-guide');
  if (bg) bg.textContent = '';
  const ps = document.getElementById('progress-section');
  if (ps) ps.classList.remove('wim-hof-mode');
  const c = document.getElementById('wh-count');
  if (c) { c.textContent = '—'; c.classList.remove('hold-mode'); }
  const s = document.getElementById('wh-count-sub');
  if (s) s.textContent = '';
  const h = document.getElementById('wh-hint');
  if (h) h.textContent = '';
  const rl = document.getElementById('wh-round-label');
  if (rl) rl.textContent = '';
}

// ─── Noise generators ──────────────────────────────────────────────────────────
function makeWhiteNoise(ctx, secs) {
  const size = ctx.sampleRate * secs;
  const buf = ctx.createBuffer(1, size, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < size; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

// Pink noise (1/f) — mucho más natural y suave que blanco
function makePinkNoise(ctx, secs) {
  const size = ctx.sampleRate * secs;
  const buf = ctx.createBuffer(1, size, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let b0=0, b1=0, b2=0, b3=0, b4=0, b5=0, b6=0;
  for (let i = 0; i < size; i++) {
    const w = Math.random() * 2 - 1;
    b0 = 0.99886*b0 + w*0.0555179; b1 = 0.99332*b1 + w*0.0750759;
    b2 = 0.96900*b2 + w*0.1538520; b3 = 0.86650*b3 + w*0.3104856;
    b4 = 0.55000*b4 + w*0.5329522; b5 = -0.7616*b5 - w*0.0168980;
    d[i] = (b0+b1+b2+b3+b4+b5+b6+w*0.5362) * 0.11;
    b6 = w * 0.115926;
  }
  return buf;
}

// Brown noise (ruido marrón) — graves profundos, retumbo
function makeBrownNoise(ctx, secs) {
  const size = ctx.sampleRate * secs;
  const buf = ctx.createBuffer(1, size, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < size; i++) {
    const w = Math.random() * 2 - 1;
    d[i] = (last + 0.02 * w) / 1.02;
    last = d[i];
    d[i] *= 3.5;
  }
  return buf;
}

// ─── Audio — campana (suave, tipo cuenco tibetano) ─────────────────────────────
function playBell() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    // Tres parciales armónicas suaves — ataque muy gradual, sin clipping
    const partials = [
      { freq: 396,  amp: 0.16, attack: 0.30, decay: 5.0 },
      { freq: 396 * 2.756, amp: 0.07, attack: 0.20, decay: 3.5 },
      { freq: 198,  amp: 0.06, attack: 0.40, decay: 6.0 },
    ];
    partials.forEach(p => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = p.freq;
      osc.detune.value = (Math.random() - 0.5) * 4;
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(p.amp, ctx.currentTime + p.attack);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + p.decay);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime + p.decay + 0.1);
    });
  } catch(e) {}
}

// ─── Preview de voz ────────────────────────────────────────────────────────────
function previewVoice() {
  const samples = {
    es: 'Bienvenido. Encuentra una posición cómoda, cierra los ojos y respira.',
    en: 'Welcome. Find a comfortable position, close your eyes and breathe.',
  };
  speak(samples[state.lang]);
}

// ─── Preview de ambiente ───────────────────────────────────────────────────────
function startAmbientPreview() {
  if (state.running || state.ambient === 'none') return;
  state.previewingAmbient = true;
  startAmbient(state.ambient);
  updateAmbientPreviewBtn();
}

function stopAmbientPreview() {
  state.previewingAmbient = false;
  stopAmbient();
  updateAmbientPreviewBtn();
}

function toggleAmbientPreview() {
  if (state.previewingAmbient) stopAmbientPreview();
  else startAmbientPreview();
}

function updateAmbientPreviewBtn() {
  const btn = document.getElementById('ambient-preview-btn');
  const lbl = document.getElementById('ambient-preview-label');
  if (!btn || !lbl) return;
  const t = T[state.lang];
  const active = state.previewingAmbient;
  btn.classList.toggle('active', active);
  lbl.textContent = active ? t.ambient_stop_preview : t.ambient_preview;
  // Deshabilitar si ambient es 'none' y no está previewing
  btn.style.opacity = (!active && state.ambient === 'none') ? '0.35' : '1';
  btn.style.pointerEvents = (!active && state.ambient === 'none') ? 'none' : 'auto';
}

// ─── Audio — ambiente mejorado ─────────────────────────────────────────────────
function startAmbient(type) {
  stopAmbient();
  if (type === 'none') return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    state.ambientCtx = ctx;
    const nodes = [];

    // Master gain — controlado por el slider de volumen del usuario
    const master = ctx.createGain();
    master.gain.value = state.ambientVolume;
    master.connect(ctx.destination);
    state.ambientMasterGain = master;

    if (type === 'rain') {
      // Gain orgánico (variación natural — ráfagas de lluvia)
      const organic = ctx.createGain();
      organic.gain.value = 1.0;
      organic.connect(master);

      // Capa 1: retumbo profundo (brown noise, < 150 Hz)
      const src1 = ctx.createBufferSource();
      src1.buffer = makeBrownNoise(ctx, 5); src1.loop = true;
      const lp1 = ctx.createBiquadFilter(); lp1.type = 'lowpass'; lp1.frequency.value = 140;
      const g1 = ctx.createGain(); g1.gain.value = 0.30;
      src1.connect(lp1); lp1.connect(g1); g1.connect(organic);
      src1.start(); nodes.push(src1);

      // Capa 2: lluvia principal (pink noise, 800–2000 Hz)
      const src2 = ctx.createBufferSource();
      src2.buffer = makePinkNoise(ctx, 4); src2.loop = true;
      const bp2 = ctx.createBiquadFilter(); bp2.type = 'bandpass'; bp2.frequency.value = 1300; bp2.Q.value = 0.42;
      const g2 = ctx.createGain(); g2.gain.value = 0.58;
      src2.connect(bp2); bp2.connect(g2); g2.connect(organic);
      src2.start(); nodes.push(src2);

      // Capa 3: llovizna fina / chispa (pink noise, > 2800 Hz)
      const src3 = ctx.createBufferSource();
      src3.buffer = makePinkNoise(ctx, 3); src3.loop = true;
      const hp3 = ctx.createBiquadFilter(); hp3.type = 'highpass'; hp3.frequency.value = 2800;
      const g3 = ctx.createGain(); g3.gain.value = 0.16;
      src3.connect(hp3); hp3.connect(g3); g3.connect(organic);
      src3.start(); nodes.push(src3);

      // Capa 4: variación de intensidad media (segundo layer pink, frecuencia diferente)
      const src4 = ctx.createBufferSource();
      src4.buffer = makePinkNoise(ctx, 6); src4.loop = true;
      const bp4 = ctx.createBiquadFilter(); bp4.type = 'bandpass'; bp4.frequency.value = 600; bp4.Q.value = 0.6;
      const g4 = ctx.createGain(); g4.gain.value = 0.22;
      src4.connect(bp4); bp4.connect(g4); g4.connect(organic);
      src4.start(); nodes.push(src4);

      // Modulación de ráfagas — período ~35s
      let gustPhase = Math.random() * Math.PI * 2;
      const gustId = setInterval(() => {
        if (!state.ambientCtx) return;
        gustPhase += 0.18;
        const gust = 0.72 + 0.28 * (0.5 + 0.5 * Math.sin(gustPhase));
        organic.gain.setTargetAtTime(gust, ctx.currentTime, 4.5);
      }, 1000);
      nodes.push({ stop: () => clearInterval(gustId) });

    } else if (type === 'ocean') {
      // Gain de ola (oscilación lenta simulando las olas)
      const waveGain = ctx.createGain();
      waveGain.gain.value = 0.2;
      waveGain.connect(master);

      // Capa 1: rugido profundo del océano (brown noise, < 180 Hz)
      const src1 = ctx.createBufferSource();
      src1.buffer = makeBrownNoise(ctx, 7); src1.loop = true;
      const lp1 = ctx.createBiquadFilter(); lp1.type = 'lowpass'; lp1.frequency.value = 175; lp1.Q.value = 0.8;
      const g1 = ctx.createGain(); g1.gain.value = 0.65;
      src1.connect(lp1); lp1.connect(g1); g1.connect(waveGain);
      src1.start(); nodes.push(src1);

      // Capa 2: rompiente / surf (pink noise, 400–800 Hz)
      const src2 = ctx.createBufferSource();
      src2.buffer = makePinkNoise(ctx, 5); src2.loop = true;
      const bp2 = ctx.createBiquadFilter(); bp2.type = 'bandpass'; bp2.frequency.value = 560; bp2.Q.value = 0.45;
      const g2 = ctx.createGain(); g2.gain.value = 0.52;
      src2.connect(bp2); bp2.connect(g2); g2.connect(waveGain);
      src2.start(); nodes.push(src2);

      // Capa 3: espuma y salpicaduras (white noise, 2500–5000 Hz)
      const src3 = ctx.createBufferSource();
      src3.buffer = makeWhiteNoise(ctx, 3); src3.loop = true;
      const bp3 = ctx.createBiquadFilter(); bp3.type = 'bandpass'; bp3.frequency.value = 3800; bp3.Q.value = 1.1;
      const g3 = ctx.createGain(); g3.gain.value = 0.10;
      src3.connect(bp3); bp3.connect(g3); g3.connect(waveGain);
      src3.start(); nodes.push(src3);

      // Ritmo de olas (~10–13s por ciclo, aleatorio para no sonar mecánico)
      let waveT = Math.random() * Math.PI * 2;
      let wavePeriod = 11;
      const waveId = setInterval(() => {
        if (!state.ambientCtx) return;
        waveT += Math.PI * 2 / wavePeriod;
        // Variación suave del período para que no suene rítmico/artificial
        wavePeriod = 9 + Math.random() * 5;
        const envelope = 0.12 + 0.32 * (0.5 + 0.5 * Math.sin(waveT));
        waveGain.gain.setTargetAtTime(envelope, ctx.currentTime, 2.0);
      }, 1000);
      nodes.push({ stop: () => clearInterval(waveId) });

    } else if (type === 'forest') {
      // Gain de viento (ráfagas orgánicas)
      const windGain = ctx.createGain();
      windGain.gain.value = 0.55;
      windGain.connect(master);

      // Capa 1: viento base (pink noise, 500–1000 Hz)
      const src1 = ctx.createBufferSource();
      src1.buffer = makePinkNoise(ctx, 5); src1.loop = true;
      const bp1 = ctx.createBiquadFilter(); bp1.type = 'bandpass'; bp1.frequency.value = 700; bp1.Q.value = 0.32;
      const g1 = ctx.createGain(); g1.gain.value = 0.42;
      src1.connect(bp1); bp1.connect(g1); g1.connect(windGain);
      src1.start(); nodes.push(src1);

      // Capa 2: hojas y ramas (pink noise, 2000–4000 Hz)
      const src2 = ctx.createBufferSource();
      src2.buffer = makePinkNoise(ctx, 3); src2.loop = true;
      const bp2 = ctx.createBiquadFilter(); bp2.type = 'bandpass'; bp2.frequency.value = 2600; bp2.Q.value = 0.65;
      const g2 = ctx.createGain(); g2.gain.value = 0.18;
      src2.connect(bp2); bp2.connect(g2); g2.connect(windGain);
      src2.start(); nodes.push(src2);

      // Capa 3: suelo y ambiente grave (brown noise, < 200 Hz)
      const src3 = ctx.createBufferSource();
      src3.buffer = makeBrownNoise(ctx, 4); src3.loop = true;
      const lp3 = ctx.createBiquadFilter(); lp3.type = 'lowpass'; lp3.frequency.value = 180;
      const g3 = ctx.createGain(); g3.gain.value = 0.18;
      src3.connect(lp3); lp3.connect(g3); g3.connect(windGain);
      src3.start(); nodes.push(src3);

      // Ráfagas de viento (~7s período)
      let windT = Math.random() * Math.PI * 2;
      const windId = setInterval(() => {
        if (!state.ambientCtx) return;
        windT += Math.PI * 2 / 7;
        const gust = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(windT));
        windGain.gain.setTargetAtTime(gust, ctx.currentTime, 2.8);
      }, 1000);
      nodes.push({ stop: () => clearInterval(windId) });

      // Cantos de pájaros aleatorios
      let chirpTimerId = null;
      const scheduleChirp = () => {
        if (!state.ambientCtx) return;
        const delay = 3500 + Math.random() * 9000;
        chirpTimerId = setTimeout(() => {
          if (!state.ambientCtx) return;
          // 1–3 chirridos en secuencia rápida
          const count = Math.random() > 0.55 ? 1 : (Math.random() > 0.5 ? 2 : 3);
          for (let c = 0; c < count; c++) {
            const t = ctx.currentTime + c * (0.14 + Math.random() * 0.08);
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            osc.type = 'sine';
            const base = 1700 + Math.random() * 2100; // 1700–3800 Hz rango pájaro
            osc.frequency.setValueAtTime(base, t);
            osc.frequency.exponentialRampToValueAtTime(base * (1.07 + Math.random() * 0.28), t + 0.05);
            osc.frequency.exponentialRampToValueAtTime(base * (0.80 + Math.random() * 0.12), t + 0.14);
            g.gain.setValueAtTime(0, t);
            g.gain.linearRampToValueAtTime(0.055 + Math.random() * 0.045, t + 0.025);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.17);
            osc.connect(g); g.connect(master);
            osc.start(t); osc.stop(t + 0.2);
          }
          scheduleChirp();
        }, delay);
      };
      scheduleChirp();
      nodes.push({ stop: () => { if (chirpTimerId) clearTimeout(chirpTimerId); } });

    } else if (type === 'bowl') {
      // Cuenco tibetano: fundamental + parciales inarmónicas con larga resonancia
      let bowlTimerId = null;

      const playBowl = () => {
        if (!state.ambientCtx) return;
        const now = ctx.currentTime;
        // Frecuencias del cuenco tibetano (no son múltiplos armónicos — por eso suenan especiales)
        const partials = [
          { freq: 432,          amp: 0.22, decay: 15 },  // fundamental
          { freq: 432 * 2.756,  amp: 0.11, decay: 10 },  // 2° parcial (ligeramente inarmónico)
          { freq: 432 * 5.404,  amp: 0.05, decay: 7  },  // 3° parcial
          { freq: 432 * 0.5,    amp: 0.07, decay: 13 },  // sub-octava suave
        ];
        partials.forEach(p => {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.value = p.freq;
          // Micro-detune para generar batidos naturales (efecto "alive")
          osc.detune.value = (Math.random() - 0.5) * 5;
          g.gain.setValueAtTime(0, now);
          g.gain.linearRampToValueAtTime(p.amp, now + 0.07);
          g.gain.exponentialRampToValueAtTime(0.0001, now + p.decay);
          osc.connect(g); g.connect(master);
          osc.start(now); osc.stop(now + p.decay + 0.1);
        });
        // Próximo toque en 17–23s (variación para no sonar mecánico)
        const nextDelay = 17000 + Math.random() * 6000;
        bowlTimerId = setTimeout(playBowl, nextDelay);
      };

      playBowl();
      nodes.push({ stop: () => { if (bowlTimerId) clearTimeout(bowlTimerId); } });
    }

    state.ambientNodes = nodes;
  } catch(e) { console.warn('Ambient audio error:', e); }
}

function stopAmbient() {
  state.ambientNodes.forEach(n => { try { if (n.stop) n.stop(); } catch(e) {} });
  state.ambientNodes = [];
  if (state.ambientCtx) { try { state.ambientCtx.close(); } catch(e) {} state.ambientCtx = null; }
  state.ambientMasterGain = null;
}

// ─── Speech ────────────────────────────────────────────────────────────────────
function speak(text) {
  if (!state.voice) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = state.lang === 'es' ? 'es-ES' : 'en-US';
  utt.rate = state.speed;
  utt.pitch = 0.95;
  utt.volume = state.voiceVolume;

  const voices = window.speechSynthesis.getVoices();
  if (state.selectedVoiceURI) {
    const v = voices.find(v => v.voiceURI === state.selectedVoiceURI);
    if (v) utt.voice = v;
  } else {
    const auto = voices.find(v => v.lang.startsWith(state.lang === 'es' ? 'es' : 'en') && v.localService)
               || voices.find(v => v.lang.startsWith(state.lang === 'es' ? 'es' : 'en'));
    if (auto) utt.voice = auto;
  }

  window.speechSynthesis.speak(utt);
}

function populateVoiceSelect() {
  const sel = document.getElementById('voice-select');
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return; // aún no cargaron, se volverá a llamar

  const langPrefix = state.lang === 'es' ? 'es' : 'en';
  let filtered = voices.filter(v => v.lang.startsWith(langPrefix));
  // Si no hay voces en el idioma seleccionado, mostrar todas
  if (!filtered.length) filtered = voices;

  sel.innerHTML = `<option value="">${T[state.lang].voice_auto}</option>`;
  filtered.forEach(v => {
    const opt = document.createElement('option');
    opt.value = v.voiceURI;
    opt.textContent = `${v.name} (${v.lang})`;
    if (v.voiceURI === state.selectedVoiceURI) opt.selected = true;
    sel.appendChild(opt);
  });
}

// ─── Log (localStorage) ────────────────────────────────────────────────────────
const LOG_KEY = 'medita-log';

function loadLog() {
  try { return JSON.parse(localStorage.getItem(LOG_KEY)) || []; } catch(e) { return []; }
}

function saveLog(entry) {
  const log = loadLog();
  log.unshift(entry);
  if (log.length > 100) log.pop();
  localStorage.setItem(LOG_KEY, JSON.stringify(log));
}

function clearLog() {
  localStorage.removeItem(LOG_KEY);
}

// ─── Session ───────────────────────────────────────────────────────────────────
function startSession() {
  // Wim Hof tiene su propio motor completamente separado
  if (state.type === 'wim_hof') {
    startWimHofSession();
    return;
  }

  const totalSecs = state.duration * 60;
  const script = getScript(state.type, state.lang, totalSecs);
  state.elapsed = 0;
  state.running = true;
  state.sessionStart = new Date().toISOString();

  // Detener preview si estaba activo
  if (state.previewingAmbient) {
    state.previewingAmbient = false;
    updateAmbientPreviewBtn();
  }

  acquireWakeLock();
  resetRing();
  startBreathGuide();
  setRunningUI(true);
  document.querySelector('.orb').classList.add('active');
  playBell();
  startAmbient(state.ambient);

  state.speechQueue = script.map(s => ({ ...s, done: false }));

  state.timerId = setInterval(() => {
    state.elapsed++;

    state.speechQueue.forEach(cue => {
      if (!cue.done && state.elapsed >= cue.at) {
        cue.done = true;
        speak(cue.text);
        document.getElementById('phase-text').textContent = cue.text;
      }
    });

    const pct = Math.min((state.elapsed / totalSecs) * 100, 100);
    document.getElementById('progress-bar').style.width = pct + '%';
    updateRing(pct);
    document.getElementById('elapsed-time').textContent = formatTime(state.elapsed);
    document.getElementById('remaining-time').textContent = formatTime(Math.max(0, totalSecs - state.elapsed));

    if (state.elapsed >= totalSecs) stopSession(true);
  }, 1000);
}

function stopSession(completed = false) {
  clearInterval(state.timerId);
  _whCleanup(); // limpia si era Wim Hof
  releaseWakeLock();
  stopBreathGuide();
  resetRing();
  window.speechSynthesis.cancel();
  stopAmbient();

  saveLog({
    date: state.sessionStart,
    type: state.type,
    duration: state.duration,
    elapsed: state.elapsed,
    lang: state.lang,
    completed,
  });

  if (completed) {
    playBell();
    setTimeout(playBell, 2000);
    showToast(T[state.lang].completed);
  }

  state.running = false;
  document.querySelector('.orb').classList.remove('active');
  setRunningUI(false);
  document.getElementById('progress-bar').style.width = '0%';
  document.getElementById('elapsed-time').textContent = '0:00';
  document.getElementById('remaining-time').textContent = formatTime(state.duration * 60);
  document.getElementById('phase-text').textContent = '';
}

// ─── History modal ─────────────────────────────────────────────────────────────
function openHistory() {
  renderHistory();
  document.getElementById('history-overlay').classList.add('open');
}

function closeHistory() {
  document.getElementById('history-overlay').classList.remove('open');
}

function renderHistory() {
  const list = document.getElementById('history-list');
  const log = loadLog();
  const t = T[state.lang];
  const lang = state.lang;

  if (!log.length) {
    list.innerHTML = `<div class="history-empty">${t.history_empty}</div>`;
    return;
  }

  list.innerHTML = '';
  log.forEach(entry => {
    const typeInfo = TYPES[entry.type] || { icon: '🧘', es: { name: entry.type }, en: { name: entry.type } };
    const typeName = typeInfo[lang]?.name || typeInfo.es.name;
    const date = new Date(entry.date);
    const dateStr = date.toLocaleDateString(lang === 'es' ? 'es-CL' : 'en-US', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
    const durStr = `${entry.duration} ${t.min}`;
    const elapsedStr = entry.elapsed < entry.duration * 60
      ? ` · ${formatTime(entry.elapsed)} ${lang === 'es' ? 'transcurridos' : 'elapsed'}`
      : '';
    const badgeClass = entry.completed ? 'badge-done' : 'badge-partial';
    const badgeLabel = entry.completed ? t.completed_badge : t.partial_badge;
    const item = document.createElement('div');
    item.className = 'history-item';
    item.innerHTML = `
      <div class="history-icon-wrap type-bg-${entry.type}">${typeInfo.icon}</div>
      <div class="history-info">
        <div class="history-type">${typeName}</div>
        <div class="history-meta">${dateStr} · ${durStr}${elapsedStr}</div>
      </div>
      <span class="history-badge ${badgeClass}">${badgeLabel}</span>
    `;
    list.appendChild(item);
  });
}

// ─── UI helpers ────────────────────────────────────────────────────────────────
function setRunningUI(running) {
  const t = T[state.lang];

  // Botón start/stop (correcto: solo actualiza el span de texto)
  document.getElementById('btn-text').textContent = running ? t.stop : t.start;
  document.getElementById('start-btn').classList.toggle('stop-mode', running);

  // Progress card
  document.getElementById('progress-section').classList.toggle('visible', running);

  // Bloquear controles durante sesión (NO incluye ambient-pill)
  const lockable = document.querySelectorAll(
    '.type-card, .stepper-btn, .lang-btn, .voice-select, #speed-slider'
  );
  lockable.forEach(el => {
    el.disabled = running;
    el.style.opacity = running ? '0.4' : '1';
    el.style.pointerEvents = running ? 'none' : 'auto';
  });
  document.querySelector('.toggle').style.pointerEvents = running ? 'none' : 'auto';
  document.getElementById('history-btn').style.pointerEvents = running ? 'none' : 'auto';

  // Indicador LIVE en ambient
  const liveBadge = document.getElementById('ambient-live');
  if (liveBadge) liveBadge.classList.toggle('visible', running);

  // Etiqueta del ambient cambia durante sesión
  const ambientLabel = document.getElementById('ambient-label');
  if (ambientLabel) {
    ambientLabel.textContent = running ? t.ambient_label_live : t.ambient_label;
  }

  // Sync sliders de volumen con estado actual
  const ambVolSlider = document.getElementById('ambient-vol');
  const voiceVolSlider = document.getElementById('voice-vol');
  if (ambVolSlider) ambVolSlider.value = state.ambientVolume;
  if (voiceVolSlider) voiceVolSlider.value = state.voiceVolume;
}

function formatTime(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3500);
}

// ─── Render ────────────────────────────────────────────────────────────────────
function renderTypes() {
  const grid = document.getElementById('types-grid');
  grid.innerHTML = '';
  Object.entries(TYPES).forEach(([key, t]) => {
    const card = document.createElement('div');
    card.className = 'type-card' + (state.type === key ? ' selected' : '');
    card.innerHTML = `
      <div class="type-icon-wrap type-bg-${key}">${t.icon}</div>
      <div class="type-name">${t[state.lang].name}</div>
      <div class="type-desc">${t[state.lang].desc}</div>`;
    card.addEventListener('click', () => {
      if (state.running) return;
      state.type = key;
      renderTypes();
    });
    grid.appendChild(card);
  });

  // Wim Hof tiene duración fija — oculta el stepper
  const durSection = document.getElementById('duration-section');
  const whFixedText = document.getElementById('wh-fixed-text');
  if (durSection) {
    const isWH = state.type === 'wim_hof';
    durSection.classList.toggle('wh-fixed', isWH);
    if (whFixedText) {
      whFixedText.textContent = state.lang === 'es' ? '~11 min · 3 rondas' : '~11 min · 3 rounds';
    }
  }
}

function renderAmbient() {
  const wrap = document.getElementById('ambient-pills');
  wrap.innerHTML = '';
  const t = T[state.lang];
  const opts = [
    { key: 'none',   label: t.ambient_none },
    { key: 'rain',   label: t.ambient_rain },
    { key: 'bowl',   label: t.ambient_bowl },
    { key: 'ocean',  label: t.ambient_ocean },
    { key: 'forest', label: t.ambient_forest },
  ];
  opts.forEach(o => {
    const pill = document.createElement('button');
    pill.className = 'ambient-pill' + (state.ambient === o.key ? ' selected' : '');
    pill.textContent = o.label;
    pill.addEventListener('click', () => {
      state.ambient = o.key;
      renderAmbient();
      if (state.running) {
        // Cambio en vivo durante sesión
        stopAmbient();
        if (o.key !== 'none') startAmbient(o.key);
      } else if (state.previewingAmbient) {
        // Cambio en vivo durante preview
        stopAmbient();
        if (o.key !== 'none') startAmbient(o.key);
        else stopAmbientPreview();
      }
      updateAmbientPreviewBtn();
    });
    wrap.appendChild(pill);
  });
}

function updateDurDisplay() {
  document.getElementById('dur-value').textContent = state.duration;
  document.getElementById('remaining-time').textContent = formatTime(state.duration * 60);
}

function applyLanguage() {
  const t = T[state.lang];
  document.getElementById('types-label').textContent = t.types_label;
  document.getElementById('duration-label').textContent = t.duration_label;
  document.getElementById('step-unit').textContent = t.min;
  document.getElementById('voice-label').textContent = t.voice_label;
  document.getElementById('voice-sub').textContent = t.voice_sub;
  document.getElementById('voice-select-label').textContent = t.voice_select_label;
  document.getElementById('speed-label').textContent = t.speed_label;
  document.getElementById('ambient-label').textContent = state.running ? t.ambient_label_live : t.ambient_label;
  document.getElementById('btn-text').textContent = state.running ? t.stop : t.start;
  document.getElementById('elapsed-label').textContent = t.elapsed;
  document.getElementById('remaining-label').textContent = t.remaining;
  document.getElementById('history-title').textContent = t.history_title;
  document.getElementById('clear-btn-label').textContent = t.clear_history;

  const voicePreviewLabel = document.getElementById('voice-preview-label');
  if (voicePreviewLabel) voicePreviewLabel.textContent = t.voice_preview;
  updateAmbientPreviewBtn();

  const volAmbientLabel = document.getElementById('vol-ambient-label');
  const volVoiceLabel = document.getElementById('vol-voice-label');
  if (volAmbientLabel) volAmbientLabel.textContent = t.vol_ambient;
  if (volVoiceLabel) volVoiceLabel.textContent = t.vol_voice;

  const taglines = { es: 'Respira. Siente. Descansa.', en: 'Breathe. Feel. Rest.' };
  const tagEl = document.getElementById('hero-tagline');
  if (tagEl && !state.running) tagEl.textContent = taglines[state.lang];

  document.querySelectorAll('.lang-btn').forEach(b => b.classList.toggle('active', b.dataset.lang === state.lang));
  renderTypes();
  renderAmbient();
  populateVoiceSelect();
}

// ─── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {

  // Language
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (state.running) return;
      state.lang = btn.dataset.lang;
      state.selectedVoiceURI = '';
      applyLanguage();
    });
  });

  // Duration stepper
  document.getElementById('dur-minus').addEventListener('click', () => {
    if (state.running || state.duration <= 1) return;
    state.duration--;
    updateDurDisplay();
  });
  document.getElementById('dur-plus').addEventListener('click', () => {
    if (state.running || state.duration >= 120) return;
    state.duration++;
    updateDurDisplay();
  });

  // Voice toggle
  document.getElementById('voice-toggle').addEventListener('click', function() {
    state.voice = !state.voice;
    this.classList.toggle('on', state.voice);
    document.getElementById('voice-settings').classList.toggle('hidden', !state.voice);
  });

  // Voice selector
  document.getElementById('voice-select').addEventListener('change', function() {
    state.selectedVoiceURI = this.value;
  });

  // Speed slider
  const speedSlider = document.getElementById('speed-slider');
  speedSlider.addEventListener('input', function() {
    state.speed = parseFloat(this.value);
    document.getElementById('speed-val').textContent = state.speed.toFixed(2) + '×';
  });

  // Preview de voz
  const voicePreviewBtn = document.getElementById('voice-preview-btn');
  if (voicePreviewBtn) voicePreviewBtn.addEventListener('click', previewVoice);

  // Preview de ambiente
  const ambPreviewBtn = document.getElementById('ambient-preview-btn');
  if (ambPreviewBtn) ambPreviewBtn.addEventListener('click', toggleAmbientPreview);

  // Ambient volume slider (en vivo)
  const ambVolSlider = document.getElementById('ambient-vol');
  if (ambVolSlider) {
    ambVolSlider.addEventListener('input', function() {
      state.ambientVolume = parseFloat(this.value);
      if (state.ambientMasterGain) {
        state.ambientMasterGain.gain.setTargetAtTime(state.ambientVolume, state.ambientCtx.currentTime, 0.05);
      }
    });
  }

  // Voice volume slider (en vivo — aplica en el próximo speak())
  const voiceVolSlider = document.getElementById('voice-vol');
  if (voiceVolSlider) {
    voiceVolSlider.addEventListener('input', function() {
      state.voiceVolume = parseFloat(this.value);
    });
  }

  // History
  document.getElementById('history-btn').addEventListener('click', openHistory);
  document.getElementById('history-close').addEventListener('click', closeHistory);
  document.getElementById('history-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('history-overlay')) closeHistory();
  });
  document.getElementById('clear-history').addEventListener('click', () => {
    clearLog();
    renderHistory();
  });

  // Start / Stop
  document.getElementById('start-btn').addEventListener('click', () => {
    state.running ? stopSession(false) : startSession();
  });

  // Voices async load — Android WebView no siempre dispara onvoiceschanged
  const loadVoices = () => populateVoiceSelect();
  window.speechSynthesis.onvoiceschanged = loadVoices;
  loadVoices();
  // Reintentos para WebView Android donde onvoiceschanged no se dispara
  let _voiceRetries = 0;
  const _voiceRetry = setInterval(() => {
    if (window.speechSynthesis.getVoices().length > 0) {
      populateVoiceSelect();
      clearInterval(_voiceRetry);
    } else if (++_voiceRetries > 20) {
      clearInterval(_voiceRetry); // máximo 5 segundos de intentos
    }
  }, 250);

  // Init UI
  applyLanguage();
  updateDurDisplay();
  updateAmbientPreviewBtn();
  document.querySelector('.orb').classList.remove('active');
  initStars();

  // Service Worker (solo fuera de Capacitor)
  if (!window.Capacitor && 'serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
});
