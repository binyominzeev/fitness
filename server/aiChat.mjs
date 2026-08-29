const MAX_MESSAGES = 30;
const MAX_CONTENT_LENGTH = 4000;
const MAX_CATALOG_ITEMS = 150;
const MAX_PLAN_ITEMS = 20;

function clampSeconds(value) {
  return Math.max(1, Math.min(3600, Math.floor(value || 0)));
}

function text(value, maxLength) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function compactProfile(profile) {
  if (!profile || typeof profile !== "object") return "Nincs kitöltött profil.";
  return [
    `Név: ${text(profile.displayName, 120) || "nincs megadva"}`,
    `Cél: ${text(profile.goal, 500) || "nincs megadva"}`,
    `Szint: ${text(profile.level, 300) || "nincs megadva"}`,
    `Gyakoriság: ${text(profile.weeklyFrequency, 200) || "nincs megadva"}`,
    `Idő: ${text(profile.availableMinutes, 200) || "nincs megadva"}`,
    `Hely/eszköz: ${text(profile.location, 300) || "nincs megadva"}`,
    `Korlátozások: ${text(profile.limitations, 1000) || "nincs megadva"}`,
    `Megjegyzés: ${text(profile.notes, 1000) || "nincs megadva"}`,
  ].join("\n");
}

function compactCatalog(exercises) {
  if (!Array.isArray(exercises)) return "Nincs elérhető gyakorlati katalógus.";
  return exercises
    .slice(0, MAX_CATALOG_ITEMS)
    .map((exercise) => `${text(exercise.id, 100)} | ${text(exercise.exerciseNameHu, 160)} | ${text(exercise.category, 120)}`)
    .join("\n");
}

function buildSystemPrompt(body) {
  return [
    "Te egy óvatos, támogató magyar nyelvű AI edző vagy.",
    "Segíts állapotot felmérni, szokást építeni, és csak a rendelkezésre álló gyakorlati katalógusból javasolj gyakorlatot.",
    "Ne diagnosztizálj. Sérülés, erős vagy tartós fájdalom esetén javasolj egészségügyi szakembert.",
    "Legyél proaktív: ha a profilból vagy az üzenetekből kiderül a cél, a rendelkezésre álló idő és a helyszín/eszköz, akkor MÁR AZ ELSŐ releváns kérésre adj konkrét planProposal-t. Csak akkor kérdezz vissza kérdés formájában, ha ezek közül ténylegesen hiányzik valami lényeges.",
    "A planProposal.items minden exerciseId mezője KIZÁRÓLAG a megadott katalógusban szereplő ID lehet, mást ne találj ki.",
    "Ha nincs elég infó egy konkrét tervhez, a planProposal legyen null, és a message-ben kérdezz pontosan rá a hiányzó adatra.",
    "A message mezőt Markdownban formázd: rövid bekezdések, szükség esetén '- ' listaelemek és '**fontos**' kiemelés, hogy jól olvasható legyen egy chat buborékban.",
    "\nFelhasználói profil:\n" + compactProfile(body.profile),
    "\nHosszú távú összefoglaló:\n" + text(body.memory && body.memory.summary, 3000),
    "\nEdzéselőzmények:\n" + JSON.stringify(Array.isArray(body.workoutLog) ? body.workoutLog.slice(-20) : []),
    "\nEngedélyezett gyakorlatok (ID | magyar név | kategória):\n" + compactCatalog(body.exercises),
  ].join("\n");
}

const RESPONSE_SCHEMA = {
  name: "ai_coach_response",
  strict: true,
  schema: {
    type: "object",
    properties: {
      message: { type: "string" },
      planProposal: {
        anyOf: [
          { type: "null" },
          {
            type: "object",
            properties: {
              title: { type: "string" },
              rationale: { type: "string" },
              items: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    exerciseId: { type: "string" },
                    workSeconds: { type: "number" },
                    restSeconds: { type: "number" },
                  },
                  required: ["exerciseId", "workSeconds", "restSeconds"],
                  additionalProperties: false,
                },
              },
            },
            required: ["title", "rationale", "items"],
            additionalProperties: false,
          },
        ],
      },
    },
    required: ["message", "planProposal"],
    additionalProperties: false,
  },
};

function sanitizePlanProposal(planProposal, exercises) {
  if (!planProposal || typeof planProposal !== "object") {
    return undefined;
  }

  const knownIds = new Set((Array.isArray(exercises) ? exercises : []).map((exercise) => exercise.id));
  const items = Array.isArray(planProposal.items) ? planProposal.items : [];
  const validItems = items
    .filter((item) => item && knownIds.has(item.exerciseId))
    .slice(0, MAX_PLAN_ITEMS)
    .map((item) => ({
      exerciseId: item.exerciseId,
      workSeconds: clampSeconds(item.workSeconds),
      restSeconds: clampSeconds(item.restSeconds),
    }));

  if (validItems.length === 0) {
    return undefined;
  }

  return {
    title: text(planProposal.title, 160) || "AI edzésterv javaslat",
    rationale: text(planProposal.rationale, 600),
    items: validItems,
  };
}

function normalizeForMatch(value) {
  return value
    .toLocaleLowerCase("hu-HU")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value) {
  return normalizeForMatch(value).split(" ").filter(Boolean);
}

function tokenOverlapScore(candidateTokens, targetTokens) {
  if (candidateTokens.length === 0 || targetTokens.length === 0) {
    return 0;
  }
  const targetSet = new Set(targetTokens);
  const overlap = candidateTokens.filter((token) => targetSet.has(token)).length;
  return overlap / candidateTokens.length;
}

// A modell néha csak felsorolja a gyakorlatokat a szövegben planProposal nélkül; ez a szövegből próbál katalógus-egyezést találni.
export function deriveFallbackPlanFromMessage(message, exercises) {
  if (!Array.isArray(exercises) || exercises.length === 0) {
    return undefined;
  }

  const boldSegments = [...message.matchAll(/\*\*(.+?)\*\*/g)].map((match) => match[1]);
  const candidateNames = [];
  for (const segment of boldSegments) {
    const withoutParens = segment.replace(/\([^)]*\)/g, "").trim();
    if (withoutParens) candidateNames.push(withoutParens);
    const parenMatch = /\(([^)]+)\)/.exec(segment);
    if (parenMatch) candidateNames.push(parenMatch[1].trim());
  }

  if (candidateNames.length === 0) {
    return undefined;
  }

  const catalog = exercises
    .filter((exercise) => exercise && typeof exercise.id === "string")
    .map((exercise) => ({
      id: exercise.id,
      huTokens: tokenize(exercise.exerciseNameHu || ""),
      enTokens: tokenize(exercise.exerciseNameEn || ""),
    }));

  const matchedIds = [];
  for (const candidate of candidateNames) {
    const candidateTokens = tokenize(candidate);
    let best;
    for (const entry of catalog) {
      const score = Math.max(tokenOverlapScore(candidateTokens, entry.huTokens), tokenOverlapScore(candidateTokens, entry.enTokens));
      if (score >= 0.5 && (!best || score > best.score)) {
        best = { id: entry.id, score };
      }
    }
    if (best && !matchedIds.includes(best.id)) {
      matchedIds.push(best.id);
    }
  }

  if (matchedIds.length === 0) {
    return undefined;
  }

  return {
    title: "A válaszban javasolt gyakorlatokból összeállított terv",
    rationale: "A gyakorlatokat automatikusan párosítottuk a katalógussal a válasz szövege alapján.",
    items: matchedIds.slice(0, MAX_PLAN_ITEMS).map((exerciseId) => ({ exerciseId, workSeconds: 30, restSeconds: 15 })),
  };
}

export async function handleAiChatRequest(body) {
  if (!process.env.OPENAI_API_KEY) {
    return { status: 503, payload: { error: "Az OPENAI_API_KEY nincs beállítva a szerveren." } };
  }

  const safeBody = body && typeof body === "object" ? body : {};
  const incomingMessages = Array.isArray(safeBody.messages) ? safeBody.messages : [];
  const messages = incomingMessages
    .slice(-MAX_MESSAGES)
    .filter((message) => message && (message.role === "user" || message.role === "assistant"))
    .map((message) => ({ role: message.role, content: text(message.content, MAX_CONTENT_LENGTH) }))
    .filter((message) => message.content.length > 0);

  if (messages.length === 0 || messages[messages.length - 1].role !== "user") {
    return { status: 400, payload: { error: "Legalább egy felhasználói üzenet szükséges." } };
  }

  try {
    const openAIResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0.4,
        max_tokens: 900,
        response_format: { type: "json_schema", json_schema: RESPONSE_SCHEMA },
        messages: [{ role: "system", content: buildSystemPrompt(safeBody) }, ...messages],
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!openAIResponse.ok) {
      return { status: 502, payload: { error: "Az OpenAI szolgáltatás hibát adott." } };
    }

    const payload = await openAIResponse.json();
    const rawContent = payload.choices?.[0]?.message?.content;
    if (typeof rawContent !== "string" || rawContent.trim().length === 0) {
      return { status: 502, payload: { error: "Az OpenAI válasza üres volt." } };
    }

    let parsed;
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      return { status: 502, payload: { error: "Az OpenAI válasza nem érvényes JSON volt." } };
    }

    const message = text(parsed.message, MAX_CONTENT_LENGTH);
    if (!message) {
      return { status: 502, payload: { error: "Az OpenAI válasza nem tartalmazott üzenetet." } };
    }

    const planProposal =
      sanitizePlanProposal(parsed.planProposal, safeBody.exercises) || deriveFallbackPlanFromMessage(message, safeBody.exercises);
    return { status: 200, payload: planProposal ? { message, planProposal } : { message } };
  } catch {
    return { status: 502, payload: { error: "Az AI szolgáltatás időtúllépés vagy hálózati hiba miatt nem válaszolt." } };
  }
}
