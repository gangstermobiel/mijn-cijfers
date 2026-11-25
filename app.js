import { initializeApp as initializeFirebaseApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  doc,
  getDoc,
  getFirestore,
  setDoc,
  enableIndexedDbPersistence
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const STORAGE_KEY = "cijferCalculatorSubjects";
const SETTINGS_KEY = "cijferCalculatorSettings";
const SCHOOL_YEARS_KEY = "cijferCalculatorSchoolYears";
const ACTIVE_SCHOOL_YEAR_KEY = "cijferCalculatorActiveSchoolYear";
const THEME_KEY = "theme";
const OFFLINE_MODE_KEY = "isOfflineMode";
const FIREBASE_APP_STATE_DOCUMENT = "data";
const USERNAME_AUTH_DOMAIN = "mijncijfers-app.firebaseapp.com";
const USERNAME_PATTERN = /^[a-z0-9_-]{3,20}$/;
const DEFAULT_SETTINGS = {
  theme: "auto",
  decimals: 1,
  passingGrade: 5.5
};

const firebaseConfig = {
  apiKey: "AIzaSyCJ7Y17oHcvQjViBzwhmUiyxjVpT9lrpv4",
  authDomain: "mijncijfers-app.firebaseapp.com",
  projectId: "mijncijfers-app",
  storageBucket: "mijncijfers-app.firebasestorage.app",
  messagingSenderId: "166570487586",
  appId: "1:166570487586:web:ef120885a123c4c5f8bf7b",
  measurementId: "G-GWQRFZWS4S"
};

console.log("Firebase config geladen voor project:", firebaseConfig.projectId);
const firebaseApp = initializeFirebaseApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);

// Enable offline persistence
if (typeof window !== "undefined") {
  try {
    enableIndexedDbPersistence(db).catch((err) => {
      if (err.code === "failed-precondition") {
        console.warn("Offline persistence: multiple tabs open. Using single-tab mode.");
      } else if (err.code === "unimplemented") {
        console.warn("Offline persistence: browser does not support IndexedDB.");
      }
    });
  } catch (err) {
    console.error("Error enabling IndexedDB persistence:", err);
  }
}

console.log("Firebase initialisatie succesvol!");

const body = document.body;
const loginModal = document.getElementById("loginModal");
const authForm = document.getElementById("authForm");
const authUsernameInput = document.getElementById("authUsernameInput");
const authPasswordInput = document.getElementById("authPasswordInput");
const authFeedback = document.getElementById("authFeedback");
const loginButton = document.getElementById("loginButton");
const registerButton = document.getElementById("registerButton");
const logoutButton = document.getElementById("logoutButton");
const schoolYearSwitcher = document.getElementById("schoolYearSwitcher");
const schoolYearToggle = document.getElementById("schoolYearToggle");
const selectedSchoolYearLabel = document.getElementById("selectedSchoolYearLabel");
const schoolYearOptions = document.getElementById("schoolYearOptions");
const activeSchoolYearLabel = document.getElementById("activeSchoolYearLabel");
const activeSchoolLevelLabel = document.getElementById("activeSchoolLevelLabel");
const schoolYearForm = document.getElementById("schoolYearForm");
const newSchoolYearInput = document.getElementById("newSchoolYearInput");
const newSchoolLevelInput = document.getElementById("newSchoolLevelInput");
const schoolYearFeedback = document.getElementById("schoolYearFeedback");
const gradeForm = document.getElementById("gradeForm");
const goalForm = document.getElementById("goalForm");
const settingsForm = document.getElementById("settingsForm");
const subjectInput = document.getElementById("subjectInput");
const gradeInput = document.getElementById("gradeInput");
const gradeWeightInput = document.getElementById("gradeWeightInput");
const gradeNoteInput = document.getElementById("gradeNoteInput");
const decimalSelect = document.getElementById("decimalSelect");
const decimalExample = document.getElementById("decimalExample");
const passingGradeInput = document.getElementById("passingGradeInput");
const passingGradeExample = document.getElementById("passingGradeExample");
const clearGradesButton = document.getElementById("clearGradesButton");
const generateReportButton = document.getElementById("generateReportButton");
const reportDialog = document.getElementById("reportDialog");
const reportDate = document.getElementById("reportDate");
const reportSchoolYear = document.getElementById("reportSchoolYear");
const reportLevel = document.getElementById("reportLevel");
const reportOverallAverage = document.getElementById("reportOverallAverage");
const reportGradeCount = document.getElementById("reportGradeCount");
const reportSubjectCount = document.getElementById("reportSubjectCount");
const reportSubjects = document.getElementById("reportSubjects");
const saveReportPdfButton = document.getElementById("saveReportPdfButton");
const closeReportButton = document.getElementById("closeReportButton");
const subjectCount = document.getElementById("subjectCount");
const gradeCount = document.getElementById("gradeCount");
const gradeTotal = document.getElementById("gradeTotal");
const gradeAverage = document.getElementById("gradeAverage");
const subjectsList = document.getElementById("subjectsList");
const subjectAveragesList = document.getElementById("subjectAveragesList");
const subjectChips = document.getElementById("subjectChips");
const goalSubjectSelect = document.getElementById("goalSubjectSelect");
const desiredAverageInput = document.getElementById("desiredAverageInput");
const goalWeightInput = document.getElementById("goalWeightInput");
const goalResultCard = document.getElementById("goalResultCard");
const subjectChartCanvas = document.getElementById("subjectChart");
const chartEmptyState = document.getElementById("chartEmptyState");
const subjectCardTemplate = document.getElementById("subjectCardTemplate");
const gradeItemTemplate = document.getElementById("gradeItemTemplate");
const tabButtons = Array.from(document.querySelectorAll(".tab-button"));
const tabPanels = Array.from(document.querySelectorAll(".tab-panel"));
const syncIndicator = document.getElementById("syncIndicator");

const weightFormatter = new Intl.NumberFormat("nl-NL", {
  maximumFractionDigits: 0
});

// Helper functies voor sync-indicator
function showSyncIndicator() {
  if (syncIndicator) {
    syncIndicator.removeAttribute("hidden");
  }
}

function hideSyncIndicator() {
  if (syncIndicator) {
    syncIndicator.setAttribute("hidden", "");
  }
}

let schoolYears = loadSchoolYears(loadSubjects());
let activeSchoolYearId = loadActiveSchoolYearId(schoolYears);
let subjects = schoolYears[activeSchoolYearId].subjects;
let settings = loadSettings();
let lastGoalState = null;
let collapsedSubjects = {};
let subjectChart = null;
let currentUser = null;
let isApplyingRemoteState = false;
let isAuthBusy = false;
let isAuthInitialized = false;
let isOfflineMode = false;

window.addEventListener("error", (event) => {
  setAuthFeedback(`Opstartfout: ${event.message}`, "error");
});

window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason;
  const message = reason && typeof reason.message === "string"
    ? reason.message
    : "Onbekende fout tijdens laden.";

  setAuthFeedback(`Laadfout: ${message}`, "error");
});

function createId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `grade-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatGrade(value) {
  return new Intl.NumberFormat("nl-NL", {
    minimumFractionDigits: settings.decimals,
    maximumFractionDigits: settings.decimals
  }).format(value);
}

function formatWeight(value) {
  return weightFormatter.format(value);
}

// Helper functie: zet komma's om naar punten en converteert naar getal
function parseGradeValue(value) {
  if (!value) return 0;
  const normalized = String(value).replace(",", ".");
  const num = Number(normalized);
  return !isNaN(num) ? num : 0;
}

function normalizeSubjectName(value) {
  const cleanedValue = value.trim().replace(/\s+/g, " ");

  if (!cleanedValue) {
    return "";
  }

  const lowercaseValue = cleanedValue.toLocaleLowerCase("nl-NL");

  return lowercaseValue.charAt(0).toLocaleUpperCase("nl-NL") + lowercaseValue.slice(1);
}

function getSubjectKey(subjectName) {
  return subjectName.toLocaleLowerCase("nl-NL");
}

function sanitizeGrade(rawGrade) {
  const parsedGrade = parseGradeValue(rawGrade.grade);
  const parsedWeight = parseGradeValue(rawGrade.weight);
  const note = typeof rawGrade.note === "string" ? rawGrade.note.trim() : "";

  if (Number.isNaN(parsedGrade) || parsedGrade < 1 || parsedGrade > 10) {
    return null;
  }

  return {
    id: rawGrade.id || createId(),
    grade: parsedGrade,
    weight: Number.isNaN(parsedWeight) || parsedWeight < 1 ? 1 : Math.round(parsedWeight),
    note
  };
}

function mergeSubjectRecord(collection, subjectName, rawGrades) {
  const normalizedName = normalizeSubjectName(subjectName);

  if (!normalizedName) {
    return;
  }

  const subjectKey = getSubjectKey(normalizedName);

  if (!collection[subjectKey]) {
    collection[subjectKey] = {
      name: normalizedName,
      grades: [],
      targetAverage: null
    };
  }

  if (typeof rawGrades === "object" && !Array.isArray(rawGrades) && rawGrades) {
    const parsedTargetAverage = parseGradeValue(rawGrades.targetAverage);

    if (parsedTargetAverage > 0 && parsedTargetAverage >= 1 && parsedTargetAverage <= 10) {
      collection[subjectKey].targetAverage = Math.round(parsedTargetAverage * 10) / 10;
    }
  }

  const gradesArray = Array.isArray(rawGrades) ? rawGrades : [];

  gradesArray.forEach((rawGrade) => {
    const sanitizedGrade = sanitizeGrade(rawGrade);

    if (sanitizedGrade) {
      collection[subjectKey].grades.push(sanitizedGrade);
    }
  });
}

function sanitizeSubjects(rawValue) {
  const normalizedSubjects = {};

  if (!rawValue || typeof rawValue !== "object") {
    return normalizedSubjects;
  }

  if (Array.isArray(rawValue)) {
    rawValue.forEach((entry) => {
      if (!entry || typeof entry !== "object") {
        return;
      }

      mergeSubjectRecord(normalizedSubjects, entry.subject || "", [entry]);
    });

    return normalizedSubjects;
  }

  const source = rawValue.subjects && typeof rawValue.subjects === "object"
    ? rawValue.subjects
    : rawValue;

  Object.entries(source).forEach(([fallbackKey, entry]) => {
    if (Array.isArray(entry)) {
      mergeSubjectRecord(normalizedSubjects, fallbackKey, entry);
      return;
    }

    if (!entry || typeof entry !== "object") {
      return;
    }

    const subjectName = entry.name || entry.subject || fallbackKey;
    mergeSubjectRecord(normalizedSubjects, subjectName, entry.grades);

    const subjectKey = getSubjectKey(normalizeSubjectName(subjectName));
    const parsedTargetAverage = parseGradeValue(entry.targetAverage);

    if (
      normalizedSubjects[subjectKey] &&
      parsedTargetAverage > 0 &&
      parsedTargetAverage >= 1 &&
      parsedTargetAverage <= 10
    ) {
      normalizedSubjects[subjectKey].targetAverage = Math.round(parsedTargetAverage * 10) / 10;
    }
  });

  return normalizedSubjects;
}

function loadSubjects() {
  const savedValue = localStorage.getItem(STORAGE_KEY);

  if (!savedValue) {
    return {};
  }

  try {
    return sanitizeSubjects(JSON.parse(savedValue));
  } catch (error) {
    console.error("Kon opgeslagen cijfers niet laden.", error);
    return {};
  }
}

function getDefaultSchoolYearId(date = new Date()) {
  const year = date.getFullYear() - (date.getMonth() < 7 ? 1 : 0);
  return `${year}-${year + 1}`;
}

function isValidSchoolYearId(value) {
  if (typeof value !== "string") {
    return false;
  }

  const match = value.match(/^(\d{4})-(\d{4})$/);
  return Boolean(match && Number(match[2]) === Number(match[1]) + 1);
}

function sanitizeSchoolYears(rawValue, legacySubjects = {}) {
  const normalizedSchoolYears = {};

  if (rawValue && typeof rawValue === "object" && !Array.isArray(rawValue)) {
    Object.entries(rawValue).forEach(([schoolYearId, record]) => {
      if (!isValidSchoolYearId(schoolYearId) || !record || typeof record !== "object") {
        return;
      }

      normalizedSchoolYears[schoolYearId] = {
        level: typeof record.level === "string" ? record.level.trim().slice(0, 60) : "",
        subjects: sanitizeSubjects(record.subjects)
      };
    });
  }

  if (Object.keys(normalizedSchoolYears).length === 0) {
    const schoolYearId = getDefaultSchoolYearId();
    normalizedSchoolYears[schoolYearId] = {
      level: "",
      subjects: sanitizeSubjects(legacySubjects)
    };
  }

  return normalizedSchoolYears;
}

function loadSchoolYears(legacySubjects) {
  const savedValue = localStorage.getItem(SCHOOL_YEARS_KEY);

  if (!savedValue) {
    return sanitizeSchoolYears(null, legacySubjects);
  }

  try {
    return sanitizeSchoolYears(JSON.parse(savedValue), legacySubjects);
  } catch (error) {
    console.error("Kon opgeslagen schooljaren niet laden.", error);
    return sanitizeSchoolYears(null, legacySubjects);
  }
}

function loadActiveSchoolYearId(years) {
  const savedValue = localStorage.getItem(ACTIVE_SCHOOL_YEAR_KEY);
  return savedValue && years[savedValue] ? savedValue : Object.keys(years).sort().at(-1);
}

function sanitizeSettings(rawValue) {
  const normalizedSettings = { ...DEFAULT_SETTINGS };

  if (!rawValue || typeof rawValue !== "object") {
    return normalizedSettings;
  }

  const parsedDecimals = parseGradeValue(rawValue.decimals);
  const parsedPassingGrade = parseGradeValue(rawValue.passingGrade);
  const rawTheme = rawValue.theme === "dark" ? "dark" : rawValue.theme === "light" ? "light" : rawValue.theme === "auto" ? "auto" : null;

  if (parsedDecimals === 1 || parsedDecimals === 2) {
    normalizedSettings.decimals = parsedDecimals;
  }

  if (!Number.isNaN(parsedPassingGrade) && parsedPassingGrade >= 1 && parsedPassingGrade <= 10) {
    normalizedSettings.passingGrade = Math.round(parsedPassingGrade * 10) / 10;
  }

  if (rawTheme) {
    normalizedSettings.theme = rawTheme;
  } else {
    const legacyTheme = localStorage.getItem(THEME_KEY);

    if (legacyTheme === "dark" || legacyTheme === "light") {
      normalizedSettings.theme = legacyTheme;
    }
  }

  return normalizedSettings;
}

function loadSettings() {
  const savedValue = localStorage.getItem(SETTINGS_KEY);

  if (!savedValue) {
    return sanitizeSettings({});
  }

  try {
    return sanitizeSettings(JSON.parse(savedValue));
  } catch (error) {
    console.error("Kon opgeslagen instellingen niet laden.", error);
    return sanitizeSettings({});
  }
}

function saveSubjects() {
  schoolYears[activeSchoolYearId].subjects = subjects;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ subjects }));
  localStorage.setItem(SCHOOL_YEARS_KEY, JSON.stringify(schoolYears));
  localStorage.setItem(ACTIVE_SCHOOL_YEAR_KEY, activeSchoolYearId);
  void syncRemoteAppState();
}

function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  localStorage.setItem(THEME_KEY, settings.theme);
  void syncRemoteAppState();
}

function setAuthFeedback(message = "", type = "") {
  if (!authFeedback) {
    return;
  }

  authFeedback.textContent = message;
  authFeedback.hidden = !message;
  authFeedback.classList.toggle("is-error", type === "error");
  authFeedback.classList.toggle("is-success", type === "success");
}

function updateAuthStatusMessages(message) {
  const allStatusMessages = document.querySelectorAll("[data-auth-status]");
  allStatusMessages.forEach((element) => {
    element.textContent = message;
  });
}

function setAuthBusyState(isBusy, message = "") {
  isAuthBusy = isBusy;

  if (!currentUser) {
    authUsernameInput.disabled = isBusy;
    authPasswordInput.disabled = isBusy;
    loginButton.disabled = isBusy;
    registerButton.disabled = isBusy;
  }

  logoutButton.disabled = isBusy;

  if (message) {
    setAuthFeedback(message);
  }
}

function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  toast.setAttribute("role", "status");

  container.appendChild(toast);

  // Auto-remove after 3 seconds
  const timeoutId = setTimeout(() => {
    toast.classList.add("leaving");
    setTimeout(() => {
      toast.remove();
    }, 280); // Match animation duration
  }, 3000);

  // Cleanup if user manually removes
  toast.addEventListener("animationend", () => {
    if (toast.classList.contains("leaving")) {
      toast.remove();
    }
  });
}

function getUserAppStateRef(user = currentUser) {
  if (!user) {
    return null;
  }

  return doc(db, "users", user.uid, "app", FIREBASE_APP_STATE_DOCUMENT);
}

async function syncRemoteAppState() {
  if (!currentUser || isApplyingRemoteState) {
    return;
  }

  const userDocRef = getUserAppStateRef();

  if (!userDocRef) {
    return;
  }

  try {
    showSyncIndicator();
    
    await setDoc(userDocRef, {
      subjects,
      settings,
      schoolYears,
      activeSchoolYearId
    }, { merge: true });
  } catch (error) {
    console.error("Kon gegevens niet online opslaan.", error);
  } finally {
    hideSyncIndicator();
  }
}

function applyAppState(remoteData) {
  schoolYears = sanitizeSchoolYears(remoteData.schoolYears, remoteData.subjects);
  activeSchoolYearId = remoteData.activeSchoolYearId && schoolYears[remoteData.activeSchoolYearId]
    ? remoteData.activeSchoolYearId
    : Object.keys(schoolYears).sort().at(-1);
  subjects = schoolYears[activeSchoolYearId].subjects;
  settings = sanitizeSettings(remoteData.settings);
  applyThemeToDocument(settings.theme);
  updateThemeSelector(settings.theme);
  saveSettings();
  saveSubjects();
  renderApp();
}

async function loadRemoteAppState(user) {
  const userDocRef = getUserAppStateRef(user);

  if (!userDocRef) {
    return;
  }

  try {
    showSyncIndicator();
    
    const snapshot = await getDoc(userDocRef);

    if (!snapshot.exists()) {
      await syncRemoteAppState();
      return;
    }

    const remoteData = snapshot.data();

    isApplyingRemoteState = true;
    applyAppState(remoteData);
  } catch (error) {
    console.error("Kon online gegevens niet laden.", error);
  } finally {
    isApplyingRemoteState = false;
    hideSyncIndicator();
  }
}

function updateAuthUi() {
  const app = document.querySelector(".app");
  const loginModal = document.getElementById("loginModal");
  
  if (currentUser) {
    // ✓ GEBRUIKER IS INGELOGD - TOON DE APP
    console.log("updateAuthUi: Gebruiker ingelogd");
    
    updateAuthStatusMessages("Ingelogd.");
    logoutButton.hidden = false;
    authForm.hidden = true;
    setAuthFeedback("Je bent succesvol ingelogd.", "success");
    
    // Verberg login modal
    if (loginModal) {
      loginModal.hidden = true;
      loginModal.setAttribute("aria-hidden", "true");
    }
    
    // Toon app
    if (app) {
      app.hidden = false;
      app.setAttribute("aria-hidden", "false");
    }
    
    // Zorg dat gebruiker kan scrollen
    document.body.style.overflow = "";
    
    return;
  }

  // ✕ GEBRUIKER IS NIET INGELOGD - BLOKKEER DE APP
  console.log("updateAuthUi: Geen gebruiker ingelogd");
  if (reportDialog.open) {
    reportDialog.close();
  }
  
  updateAuthStatusMessages("Niet ingelogd. Log in om je gegevens online op te slaan.");
  logoutButton.hidden = true;
  authForm.hidden = false;
  authPasswordInput.disabled = false;
  authUsernameInput.disabled = false;
  authForm.reset();
  loginButton.disabled = false;
  registerButton.disabled = false;
  setAuthFeedback("");
  
  // Toon login modal
  if (loginModal) {
    loginModal.hidden = false;
    loginModal.setAttribute("aria-hidden", "false");
  }
  
  // Verberg app
  if (app) {
    app.hidden = true;
    app.setAttribute("aria-hidden", "true");
  }
  
  // Blokkeer scrollbar
  document.body.style.overflow = "hidden";
}

function getFriendlyAuthMessage(error) {
  const code = error && typeof error.code === "string" ? error.code : "";

  switch (code) {
    case "auth/email-already-in-use":
      return "Deze gebruikersnaam is al in gebruik.";
    case "auth/invalid-email":
      return "Gebruikersnaam is ongeldig. Gebruik 3–20 letters, cijfers, _ of -.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "De combinatie van gebruikersnaam en wachtwoord klopt niet.";
    case "auth/weak-password":
      return "Kies een sterker wachtwoord van minstens 6 tekens.";
    case "auth/network-request-failed":
      return "De verbinding met Firebase lukt niet. Controleer je internet of lokale server.";
    case "auth/operation-not-allowed":
      return "Email/Password login staat nog niet aan in Firebase Authentication.";
    case "auth/unauthorized-domain":
      return "Deze website-domeinnaam is nog niet toegestaan in Firebase Authentication.";
    default:
      return error && typeof error.message === "string"
        ? error.message
        : "Er ging iets mis bij authenticatie.";
  }
}

async function handleAuthError(error) {
  console.error("Authenticatie mislukt.", error);
  setAuthFeedback(getFriendlyAuthMessage(error), "error");
}

function getSortedSubjects() {
  return Object.entries(subjects)
    .sort(([, subjectA], [, subjectB]) => subjectA.name.localeCompare(subjectB.name, "nl-NL"))
    .map(([key, subject]) => ({ key, ...subject }));
}

function getSubjectStats(grades) {
  const totalWeight = grades.reduce((sum, item) => sum + item.weight, 0);
  const weightedSum = grades.reduce((sum, item) => sum + (item.grade * item.weight), 0);
  const average = totalWeight > 0 ? weightedSum / totalWeight : 0;

  return {
    count: grades.length,
    totalWeight,
    weightedSum,
    average
  };
}

function getOverallStats() {
  const allGrades = getSortedSubjects().flatMap((subject) => subject.grades);
  const stats = getSubjectStats(allGrades);

  return {
    subjectCount: Object.keys(subjects).length,
    gradeCount: allGrades.length,
    weightedSum: stats.weightedSum,
    average: stats.average
  };
}

function getThemePalette() {
  const styles = getComputedStyle(body);

  return {
    text: styles.getPropertyValue("--text").trim() || "#111111",
    muted: styles.getPropertyValue("--text-muted").trim() || "#676767",
    border: styles.getPropertyValue("--border").trim() || "rgba(17, 17, 17, 0.1)",
    accent: styles.getPropertyValue("--accent").trim() || "#111111",
    surface: styles.getPropertyValue("--surface").trim() || "#ffffff"
  };
}

function setTheme(theme) {
  const next = theme === "dark" ? "dark" : theme === "light" ? "light" : "auto";
  settings.theme = next;
  applyThemeToDocument(next);
  updateThemeSelector(next);
  // Ensure theme is stored explicitly for legacy/quick access
  try {
    localStorage.setItem(THEME_KEY, next);
  } catch (err) {
    // ignore
  }
  saveSettings();
  renderSubjectChart();
}

function toggleTheme() {
  const currentTheme = body.getAttribute("data-theme") === "dark" ? "dark" : "light";
  setTheme(currentTheme === "dark" ? "light" : "dark");
}

function applyThemeToDocument(theme) {
  if (theme === "auto") {
    body.removeAttribute("data-theme");
  } else {
    body.setAttribute("data-theme", theme);
  }
}

function updateThemeSelector(theme) {
  const sel = document.getElementById("themeSelector");
  const slider = document.getElementById("themeSlider");

  if (sel) {
    sel.value = theme === "auto" ? "auto" : theme === "dark" ? "dark" : "light";
  }

  if (!slider) {
    return;
  }

  const map = { light: 0, auto: 1, dark: 2 };
  const pos = map[theme] ?? 0;
  slider.dataset.pos = String(pos);

  const knob = slider.querySelector(".slider-knob");
  if (knob) {
    knob.style.transform = `translateX(${pos * 100}%)`;
  }

  const options = Array.from(slider.querySelectorAll('.theme-option'));
  options.forEach((btn, idx) => {
    const active = idx === pos;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-checked', String(active));
  });
}

function updateSettingsForm() {
  decimalSelect.value = String(settings.decimals);
  renderCustomSelectOptions(decimalSelect);
  passingGradeInput.value = settings.passingGrade.toFixed(1);
  decimalExample.textContent = `Voorbeeld: ${formatGrade(7.35)}`;

  const orangeUpperBound = Math.min(10, settings.passingGrade + 0.4);
  const greenLowerBound = Math.min(10, settings.passingGrade + 0.5);

  passingGradeExample.textContent =
    `Voorbeeld: ${formatGrade(settings.passingGrade)} t/m ${formatGrade(orangeUpperBound)} wordt oranje, vanaf ${formatGrade(greenLowerBound)} groen.`;
}

function getGradeStatus(grade) {
  if (grade < settings.passingGrade) {
    return "insufficient";
  }

  if (grade < settings.passingGrade + 0.5) {
    return "warning";
  }

  return "sufficient";
}

function activateTab(targetPanelId) {
  tabButtons.forEach((button) => {
    const isActive = button.dataset.tabTarget === targetPanelId;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", String(isActive));
    button.tabIndex = isActive ? 0 : -1;
  });

  tabPanels.forEach((panel) => {
    const isActive = panel.id === targetPanelId;
    panel.classList.toggle("is-active", isActive);
    panel.hidden = !isActive;
  });
}

function showEmptyGoalState() {
  goalResultCard.className = "goal-result-card empty-state-card";
  goalResultCard.innerHTML = `
    <div class="empty-state-content">
      <h3>Nog geen berekening</h3>
      <p>Kies een vak en doelgemiddelde om je benodigde cijfer te zien.</p>
    </div>
  `;
}

function createGoalState(subjectKey, desiredAverage, nextWeight) {
  const subject = subjects[subjectKey];

  if (!subject) {
    return null;
  }

  const stats = getSubjectStats(subject.grades);
  const requiredGrade =
    ((desiredAverage * (stats.totalWeight + nextWeight)) - stats.weightedSum) / nextWeight;

  let message = "";

  if (requiredGrade > 10) {
    message = `Zelfs met een 10,0 haal je ${formatGrade(desiredAverage)} niet. Je zou ${formatGrade(requiredGrade)} nodig hebben.`;
  } else if (requiredGrade <= 1) {
    message = `Je doel is al binnen bereik. Zelfs met een 1,0 blijf je op minstens ${formatGrade(desiredAverage)} gemiddeld.`;
  } else {
    message = `Je moet minimaal ${formatGrade(roundUpToTenth(requiredGrade))} halen om op ${formatGrade(desiredAverage)} uit te komen.`;
  }

  return {
    subjectKey,
    subjectName: subject.name,
    currentAverage: stats.average,
    desiredAverage,
    nextWeight,
    message
  };
}

function renderGoalResult(state = lastGoalState) {
  if (!state) {
    showEmptyGoalState();
    return;
  }

  goalResultCard.className = "goal-result-card";
  goalResultCard.replaceChildren();

  const wrapper = document.createElement("div");
  wrapper.className = "empty-state-content";

  const title = document.createElement("h3");
  title.textContent = state.subjectName;

  const message = document.createElement("p");
  message.textContent = state.message;

  const currentAverage = document.createElement("p");
  currentAverage.textContent = `Huidig gemiddelde: ${formatGrade(state.currentAverage)}`;

  const desiredAverage = document.createElement("p");
  desiredAverage.textContent = `Gewenst gemiddelde: ${formatGrade(state.desiredAverage)}`;

  const nextWeight = document.createElement("p");
  nextWeight.textContent = `Volgende weging: ${formatWeight(state.nextWeight)}`;

  wrapper.append(title, message, currentAverage, desiredAverage, nextWeight);
  goalResultCard.appendChild(wrapper);
}

function updateSummary() {
  const stats = getOverallStats();

  subjectCount.textContent = String(stats.subjectCount);
  gradeCount.textContent = String(stats.gradeCount);
  gradeTotal.textContent = formatGrade(stats.weightedSum);
  gradeAverage.textContent = formatGrade(stats.average);
}

function destroySubjectChart() {
  if (subjectChart) {
    subjectChart.destroy();
    subjectChart = null;
  }
}

function renderSubjectChart() {
  const sortedSubjects = getSortedSubjects();

  if (!subjectChartCanvas || !chartEmptyState) {
    return;
  }

  if (typeof Chart === "undefined") {
    destroySubjectChart();
    subjectChartCanvas.hidden = true;
    chartEmptyState.hidden = false;
    chartEmptyState.innerHTML = `
      <h3>Grafiek niet beschikbaar</h3>
      <p>Chart.js kon niet worden geladen.</p>
    `;
    return;
  }

  if (sortedSubjects.length === 0) {
    destroySubjectChart();
    subjectChartCanvas.hidden = true;
    chartEmptyState.hidden = false;
    chartEmptyState.innerHTML = `
      <h3>Nog geen grafiek</h3>
      <p>Voeg vakken en cijfers toe om gemiddelden en doelgemiddelden te zien.</p>
    `;
    return;
  }

  const palette = getThemePalette();
  const subjectLabels = sortedSubjects.map((subject) => subject.name);
  const subjectAverages = sortedSubjects.map((subject) => getSubjectStats(subject.grades).average);
  const subjectTargets = sortedSubjects.map((subject) => {
    if (typeof subject.targetAverage === "number") {
      return subject.targetAverage;
    }

    return null;
  });
  const labels = subjectLabels;

  subjectChartCanvas.hidden = false;
  chartEmptyState.hidden = true;

  const chartData = {
    labels,
    datasets: [
      {
        type: "bar",
        label: "Gemiddelde",
        data: subjectAverages,
        backgroundColor: "rgba(96, 165, 250, 0.82)",
        borderColor: "rgba(125, 190, 255, 0.95)",
        borderWidth: 1,
        borderRadius: 14,
        borderSkipped: false,
        barPercentage: 0.5,
        categoryPercentage: 0.62,
        hoverBackgroundColor: "rgba(125, 190, 255, 0.92)",
        hoverBorderColor: "rgba(147, 197, 253, 1)"
      },
      {
        type: "line",
        label: "Doelgemiddelde",
        data: subjectTargets,
        borderColor: "rgba(248, 168, 205, 0.92)",
        backgroundColor: "rgba(248, 168, 205, 0.12)",
        borderWidth: 2.5,
        pointRadius: 0,
        pointHoverRadius: 0,
        pointHitRadius: 10,
        spanGaps: true,
        tension: 0.4
      },
      {
        type: "line",
        label: "Voldoendegrens",
        data: [
          { x: -0.5, y: settings.passingGrade },
          { x: labels.length - 0.5, y: settings.passingGrade }
        ],
        borderColor: "rgba(148, 163, 184, 0.75)",
        borderWidth: 1.25,
        pointRadius: 0,
        pointHoverRadius: 0,
        pointHitRadius: 0,
        tension: 0,
        fill: false,
        borderDash: [5, 5],
        parsing: false
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 320,
      easing: "easeOutCubic"
    },
    interaction: {
      mode: "index",
      intersect: false
    },
    scales: {
      y: {
        min: 0,
        max: 10,
        border: {
          display: false
        },
        ticks: {
          stepSize: 1,
          color: palette.muted,
          padding: 10,
          callback(value) {
            return formatGrade(Number(value));
          }
        },
        grid: {
          color: "rgba(148, 163, 184, 0.16)",
          drawTicks: false
        }
      },
      x: {
        type: "category",
        border: {
          display: false
        },
        ticks: {
          color: palette.muted,
          padding: 8
        },
        grid: {
          display: false
        }
      }
    },
    plugins: {
      legend: {
        position: "top",
        align: "start",
        labels: {
          color: palette.text,
          usePointStyle: true,
          pointStyle: "circle",
          boxWidth: 8,
          boxHeight: 8,
          padding: 18
        }
      },
      tooltip: {
        backgroundColor: "rgba(15, 23, 42, 0.92)",
        titleColor: "#f8fafc",
        bodyColor: "#e2e8f0",
        borderColor: "rgba(148, 163, 184, 0.24)",
        borderWidth: 1,
        padding: 12,
        displayColors: true,
        callbacks: {
          label(context) {
            const value = context.parsed.y;

            if (typeof value !== "number") {
              return `${context.dataset.label}: nog niet ingesteld`;
            }

            return `${context.dataset.label}: ${formatGrade(value)}`;
          }
        }
      }
    }
  };

  destroySubjectChart();
  subjectChart = new Chart(subjectChartCanvas, {
    type: "bar",
    data: chartData,
    options: chartOptions
  });
}

function toggleSubjectCollapse(subjectKey) {
  collapsedSubjects[subjectKey] = !collapsedSubjects[subjectKey];
  renderSubjectsList();
}

function createGradeDeleteButton(subjectKey, gradeId, labelText) {
  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "subject-delete-button";
  deleteButton.textContent = labelText;
  deleteButton.style.minWidth = "auto";
  deleteButton.style.minHeight = "2.4rem";
  deleteButton.style.padding = "0.65rem 0.85rem";
  deleteButton.style.borderRadius = "14px";
  deleteButton.style.flexShrink = "0";
  deleteButton.addEventListener("click", () => deleteGrade(subjectKey, gradeId));

  return deleteButton;
}

function renderSubjectsList() {
  const sortedSubjects = getSortedSubjects();
  subjectsList.innerHTML = "";

  if (sortedSubjects.length === 0) {
    subjectsList.innerHTML = `
      <article class="subject-card empty-state-card">
        <div class="empty-state-content">
          <h3>Nog geen vakken</h3>
          <p>Voeg in het tabblad Toevoegen je eerste cijfer toe.</p>
        </div>
      </article>
    `;
    return;
  }

  sortedSubjects.forEach((subject) => {
    const cardFragment = subjectCardTemplate.content.cloneNode(true);
    const card = cardFragment.querySelector(".subject-card");
    const toggleButton = cardFragment.querySelector(".subject-toggle-button");
    const nameElement = cardFragment.querySelector(".subject-name");
    const averageElement = cardFragment.querySelector(".subject-average");
    const countElement = cardFragment.querySelector(".subject-count");
    const contentElement = cardFragment.querySelector(".subject-card-content");
    const targetLabel = cardFragment.querySelector(".subject-target-label");
    const targetInput = cardFragment.querySelector(".subject-target-input");
    const gradeListElement = cardFragment.querySelector(".subject-grade-list");
    const deleteSubjectButton = cardFragment.querySelector(".subject-delete-button");
    const stats = getSubjectStats(subject.grades);
    const isCollapsed = Boolean(collapsedSubjects[subject.key]);
    const targetInputId = `subject-target-${subject.key}`;

    nameElement.textContent = subject.name;
    averageElement.textContent = `Gemiddelde: ${formatGrade(stats.average)}`;
    countElement.textContent = `${stats.count} cijfer${stats.count === 1 ? "" : "s"}`;
    targetLabel.setAttribute("for", targetInputId);
    targetInput.id = targetInputId;
    targetInput.value = typeof subject.targetAverage === "number"
      ? subject.targetAverage.toFixed(1)
      : "";
    deleteSubjectButton.textContent = "Wis vak";
    deleteSubjectButton.addEventListener("click", () => deleteSubject(subject.key));
    toggleButton.setAttribute("aria-expanded", String(!isCollapsed));
    toggleButton.addEventListener("click", () => toggleSubjectCollapse(subject.key));
    card.classList.toggle("is-collapsed", isCollapsed);
    contentElement.hidden = isCollapsed;
    targetInput.addEventListener("change", (event) => handleSubjectTargetChange(subject.key, event));
    targetInput.addEventListener("blur", (event) => handleSubjectTargetChange(subject.key, event));

    subject.grades.forEach((gradeEntry) => {
      const gradeFragment = gradeItemTemplate.content.cloneNode(true);
      const gradeItem = gradeFragment.querySelector(".subject-grade-item");
      const scoreElement = gradeFragment.querySelector(".subject-grade-score");
      const noteElement = gradeFragment.querySelector(".subject-grade-note");
      const weightElement = gradeFragment.querySelector(".subject-grade-weight");
      const actionWrapper = document.createElement("div");

      scoreElement.textContent = formatGrade(gradeEntry.grade);
      noteElement.textContent = gradeEntry.note || "Zonder omschrijving";
      weightElement.textContent = `Weging ${formatWeight(gradeEntry.weight)}`;
      gradeItem.dataset.gradeStatus = getGradeStatus(gradeEntry.grade);

      actionWrapper.style.display = "grid";
      actionWrapper.style.gap = "0.45rem";
      actionWrapper.style.justifyItems = "end";
      actionWrapper.style.flexShrink = "0";
      actionWrapper.appendChild(weightElement);
      actionWrapper.appendChild(createGradeDeleteButton(subject.key, gradeEntry.id, "Wis"));

      gradeItem.appendChild(actionWrapper);
      gradeListElement.appendChild(gradeItem);
    });

    card.dataset.subjectKey = subject.key;
    subjectsList.appendChild(card);
  });
}

function renderSubjectChips() {
  const sortedSubjects = getSortedSubjects();
  subjectChips.innerHTML = "";

  if (sortedSubjects.length === 0) {
    subjectChips.innerHTML = '<p class="empty-state">Nog geen vakken beschikbaar.</p>';
    return;
  }

  sortedSubjects.forEach((subject) => {
    const chipButton = document.createElement("button");
    chipButton.type = "button";
    chipButton.textContent = subject.name;
    chipButton.addEventListener("click", () => {
      subjectInput.value = subject.name;
      gradeInput.focus();
    });
    subjectChips.appendChild(chipButton);
  });
}

function renderGoalSubjectOptions() {
  const sortedSubjects = getSortedSubjects();
  const previousValue = goalSubjectSelect.value;

  goalSubjectSelect.innerHTML = '<option value="">Kies een vak</option>';

  sortedSubjects.forEach((subject) => {
    const option = document.createElement("option");
    option.value = subject.key;
    option.textContent = subject.name;
    goalSubjectSelect.appendChild(option);
  });

  if (subjects[previousValue]) {
    goalSubjectSelect.value = previousValue;
    renderCustomSelectOptions(goalSubjectSelect);
    return;
  }

  if (lastGoalState && subjects[lastGoalState.subjectKey]) {
    goalSubjectSelect.value = lastGoalState.subjectKey;
  }

  renderCustomSelectOptions(goalSubjectSelect);
}

const customSelectControls = new WeakMap();

function renderCustomSelectOptions(select) {
  const control = customSelectControls.get(select);
  if (!control) {
    return;
  }

  const selectedOption = Array.from(select.options).find((option) => option.value === select.value);
  control.button.textContent = selectedOption?.textContent || "Kies een optie";
  control.options.replaceChildren();

  Array.from(select.options).forEach((option) => {
    const optionButton = document.createElement("button");
    optionButton.type = "button";
    optionButton.className = "custom-select-option";
    optionButton.textContent = option.textContent;
    optionButton.setAttribute("role", "option");
    optionButton.setAttribute("aria-selected", String(option.value === select.value));
    optionButton.classList.toggle("is-active", option.value === select.value);
    optionButton.disabled = option.disabled;
    optionButton.addEventListener("click", () => {
      select.value = option.value;
      select.dispatchEvent(new Event("change", { bubbles: true }));
      control.options.hidden = true;
      control.button.setAttribute("aria-expanded", "false");
    });
    control.options.appendChild(optionButton);
  });
}

function enhanceSelect(select) {
  if (customSelectControls.has(select)) {
    renderCustomSelectOptions(select);
    return;
  }

  const wrapper = document.createElement("div");
  wrapper.className = "custom-select";
  select.parentElement.insertBefore(wrapper, select);
  wrapper.appendChild(select);
  select.classList.add("native-select-control");
  select.tabIndex = -1;
  select.setAttribute("aria-hidden", "true");

  const button = document.createElement("button");
  button.type = "button";
  button.className = "custom-select-toggle";
  button.setAttribute("role", "combobox");
  button.setAttribute("aria-haspopup", "listbox");
  button.setAttribute("aria-expanded", "false");
  const label = select.labels?.[0]?.textContent.trim();
  button.setAttribute("aria-label", label || "Kies een optie");

  const options = document.createElement("div");
  options.className = "custom-select-options";
  options.setAttribute("role", "listbox");
  options.hidden = true;

  wrapper.append(button, options);
  customSelectControls.set(select, { wrapper, button, options });

  button.addEventListener("click", () => {
    const isExpanded = button.getAttribute("aria-expanded") === "true";
    button.setAttribute("aria-expanded", String(!isExpanded));
    options.hidden = isExpanded;
  });
  select.addEventListener("change", () => renderCustomSelectOptions(select));

  document.addEventListener("click", (event) => {
    if (!wrapper.contains(event.target)) {
      options.hidden = true;
      button.setAttribute("aria-expanded", "false");
    }
  });

  renderCustomSelectOptions(select);
}

function renderSchoolYears() {
  const schoolYearIds = Object.keys(schoolYears).sort().reverse();
  schoolYearOptions.replaceChildren();

  schoolYearIds.forEach((schoolYearId) => {
    const option = document.createElement("button");
    const level = schoolYears[schoolYearId].level;
    option.type = "button";
    option.className = "school-year-option";
    option.setAttribute("role", "option");
    option.setAttribute("aria-selected", String(schoolYearId === activeSchoolYearId));
    option.classList.toggle("is-active", schoolYearId === activeSchoolYearId);

    const yearName = document.createElement("span");
    yearName.className = "school-year-option-name";
    yearName.textContent = schoolYearId;

    const levelName = document.createElement("span");
    levelName.className = "school-year-option-level";
    levelName.textContent = level || "Niveau niet ingesteld";

    option.append(yearName, levelName);
    option.addEventListener("click", () => selectSchoolYear(schoolYearId));
    schoolYearOptions.appendChild(option);
  });

  selectedSchoolYearLabel.textContent = schoolYearIds.length > 1
    ? `${activeSchoolYearId} · ${schoolYears[activeSchoolYearId].level || "Niveau niet ingesteld"}`
    : activeSchoolYearId;
  activeSchoolYearLabel.textContent = `Schooljaar ${activeSchoolYearId}`;
  activeSchoolLevelLabel.textContent = schoolYears[activeSchoolYearId].level || "Niveau niet ingesteld";
}

function renderSubjectAverages() {
  const sortedSubjects = getSortedSubjects();
  subjectAveragesList.replaceChildren();

  if (sortedSubjects.length === 0) {
    const emptyState = document.createElement("p");
    emptyState.className = "empty-state";
    emptyState.textContent = "Voeg cijfers toe om je vakgemiddelden hier te zien.";
    subjectAveragesList.appendChild(emptyState);
    return;
  }

  sortedSubjects.forEach((subject) => {
    const stats = getSubjectStats(subject.grades);
    const item = document.createElement("article");
    item.className = "subject-average-card";

    const name = document.createElement("h3");
    name.textContent = subject.name;

    const average = document.createElement("p");
    average.className = "subject-average-value";
    average.textContent = formatGrade(stats.average);

    const count = document.createElement("p");
    count.className = "subject-average-count";
    count.textContent = `${stats.count} cijfer${stats.count === 1 ? "" : "s"}`;

    item.append(name, average, count);
    subjectAveragesList.appendChild(item);
  });
}

function renderApp() {
  renderSchoolYears();
  updateSummary();
  renderSubjectChart();
  renderSubjectAverages();
  renderSubjectsList();
  renderSubjectChips();
  renderGoalSubjectOptions();
  updateSettingsForm();

  if (lastGoalState) {
    lastGoalState = createGoalState(
      lastGoalState.subjectKey,
      lastGoalState.desiredAverage,
      lastGoalState.nextWeight
    );
  }

  renderGoalResult();
}

function selectSchoolYear(nextSchoolYearId) {
  if (!schoolYears[nextSchoolYearId] || nextSchoolYearId === activeSchoolYearId) {
    schoolYearOptions.hidden = true;
    schoolYearToggle.setAttribute("aria-expanded", "false");
    return;
  }

  schoolYears[activeSchoolYearId].subjects = subjects;
  activeSchoolYearId = nextSchoolYearId;
  subjects = schoolYears[activeSchoolYearId].subjects;
  lastGoalState = null;
  saveSubjects();
  renderApp();
}

function toggleSchoolYearOptions() {
  const isExpanded = schoolYearToggle.getAttribute("aria-expanded") === "true";
  schoolYearToggle.setAttribute("aria-expanded", String(!isExpanded));
  schoolYearOptions.hidden = isExpanded;
}

function closeSchoolYearOptions(event) {
  if (!schoolYearSwitcher.contains(event.target)) {
    schoolYearOptions.hidden = true;
    schoolYearToggle.setAttribute("aria-expanded", "false");
  }
}

function handleSchoolYearSubmit(event) {
  event.preventDefault();

  const schoolYearId = newSchoolYearInput.value.trim();
  const level = newSchoolLevelInput.value.trim();

  if (!isValidSchoolYearId(schoolYearId)) {
    schoolYearFeedback.textContent = "Gebruik een schooljaar als 2025-2026.";
    schoolYearFeedback.classList.add("is-error");
    newSchoolYearInput.focus();
    return;
  }

  if (!level || level.length > 60) {
    schoolYearFeedback.textContent = "Vul een niveau in van maximaal 60 tekens.";
    schoolYearFeedback.classList.add("is-error");
    newSchoolLevelInput.focus();
    return;
  }

  schoolYears[activeSchoolYearId].subjects = subjects;
  const isExistingSchoolYear = Boolean(schoolYears[schoolYearId]);

  if (isExistingSchoolYear) {
    schoolYears[schoolYearId].level = level;
  } else {
    schoolYears[schoolYearId] = { level, subjects: {} };
  }

  activeSchoolYearId = schoolYearId;
  subjects = schoolYears[activeSchoolYearId].subjects;
  lastGoalState = null;
  schoolYearForm.reset();
  schoolYearFeedback.textContent = isExistingSchoolYear
    ? `Niveau voor schooljaar ${schoolYearId} bijgewerkt.`
    : `Schooljaar ${schoolYearId} (${level}) is toegevoegd.`;
  schoolYearFeedback.classList.remove("is-error");
  saveSubjects();
  renderApp();
}

function addGrade(event) {
  event.preventDefault();

  const normalizedSubject = normalizeSubjectName(subjectInput.value);
  const parsedGrade = parseGradeValue(gradeInput.value);
  const parsedWeight = parseGradeValue(gradeWeightInput.value);
  const note = gradeNoteInput.value.trim();

  if (!normalizedSubject) {
    alert("Vul eerst een vak in.");
    subjectInput.focus();
    return;
  }

  if (Number.isNaN(parsedGrade) || parsedGrade < 1 || parsedGrade > 10) {
    alert("Voer een geldig cijfer in tussen 1,0 en 10,0.");
    gradeInput.focus();
    return;
  }

  if (Number.isNaN(parsedWeight) || parsedWeight < 1) {
    alert("Voer een geldige weging in vanaf 1.");
    gradeWeightInput.focus();
    return;
  }

  const subjectKey = getSubjectKey(normalizedSubject);

  if (!subjects[subjectKey]) {
    subjects[subjectKey] = {
      name: normalizedSubject,
      grades: [],
      targetAverage: null
    };
  }

  subjects[subjectKey].name = normalizedSubject;
  subjects[subjectKey].grades.push({
    id: createId(),
    grade: parsedGrade,
    weight: Math.round(parsedWeight),
    note
  });

  saveSubjects();
  renderApp();
  showToast(`Cijfer ${parsedGrade} voor ${normalizedSubject} opgeslagen! ✓`, "success");

  gradeForm.reset();
  subjectInput.value = normalizedSubject;
  gradeWeightInput.value = "1";
  gradeInput.focus();
}

function deleteGrade(subjectKey, gradeId) {
  const subject = subjects[subjectKey];

  if (!subject) {
    return;
  }

  subject.grades = subject.grades.filter((gradeEntry) => gradeEntry.id !== gradeId);

  if (subject.grades.length === 0) {
    delete subjects[subjectKey];
    delete collapsedSubjects[subjectKey];
  }

  saveSubjects();
  renderApp();
}

function deleteSubject(subjectKey) {
  if (!subjects[subjectKey]) {
    return;
  }

  delete subjects[subjectKey];
  delete collapsedSubjects[subjectKey];
  saveSubjects();
  renderApp();
}

function handleSubjectTargetChange(subjectKey, event) {
  const subject = subjects[subjectKey];

  if (!subject) {
    return;
  }

  const rawValue = event.currentTarget.value.trim();

  if (!rawValue) {
    subject.targetAverage = null;
    saveSubjects();
    renderApp();
    return;
  }

  const parsedTargetAverage = parseGradeValue(rawValue);

  if (Number.isNaN(parsedTargetAverage) || parsedTargetAverage < 1 || parsedTargetAverage > 10) {
    event.currentTarget.value = typeof subject.targetAverage === "number"
      ? subject.targetAverage.toFixed(1)
      : "";
    return;
  }

  subject.targetAverage = Math.round(parsedTargetAverage * 10) / 10;
  saveSubjects();
  renderApp();
}

function clearGrades() {
  if (Object.keys(subjects).length === 0) {
    return;
  }

  const userConfirmed = window.confirm("Weet je zeker dat je alle cijfers wilt wissen?");

  if (!userConfirmed) {
    return;
  }

  subjects = {};
  lastGoalState = null;
  saveSubjects();
  renderApp();
}

function generateReport() {
  if (!currentUser) {
    updateAuthUi();
    return;
  }

  if (Object.keys(subjects).length === 0) {
    showToast("Voeg eerst cijfers toe voordat je een rapport maakt.", "info");
    return;
  }

  const sortedSubjects = getSortedSubjects().map((subject) => ({
    ...subject,
    stats: getSubjectStats(subject.grades)
  }));
  const overallStats = getOverallStats();
  const totalGrades = sortedSubjects.reduce((count, subject) => count + subject.stats.count, 0);
  const reportDateValue = new Date().toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });

  reportDate.textContent = `Uitgegeven op ${reportDateValue}`;
  reportSchoolYear.textContent = activeSchoolYearId;
  reportLevel.textContent = schoolYears[activeSchoolYearId].level || "Niet ingesteld";
  reportOverallAverage.textContent = formatGrade(overallStats.average);
  reportGradeCount.textContent = `${totalGrades} cijfer${totalGrades === 1 ? "" : "s"} in totaal`;
  reportSubjectCount.textContent = `${sortedSubjects.length} vak${sortedSubjects.length === 1 ? "" : "ken"}`;
  reportSubjects.replaceChildren();

  sortedSubjects.forEach((subject) => {
    const row = document.createElement("tr");
    const nameCell = document.createElement("th");
    const averageCell = document.createElement("td");
    const targetCell = document.createElement("td");
    const countCell = document.createElement("td");

    nameCell.scope = "row";
    nameCell.textContent = subject.name;
    averageCell.textContent = subject.stats.count ? formatGrade(subject.stats.average) : "—";
    targetCell.textContent = typeof subject.targetAverage === "number"
      ? formatGrade(subject.targetAverage)
      : "—";
    countCell.textContent = String(subject.stats.count);
    row.append(nameCell, averageCell, targetCell, countCell);
    reportSubjects.appendChild(row);
  });

  reportDialog.showModal();
  closeReportButton.focus();
}

function generateReportLegacy() {
  const data = subjects;
  console.log("Rapport data:", data);

  if (Object.keys(subjects).length === 0) {
    showToast("Je hebt nog geen vakken om een rapport van te genereren.", "info");
    return;
  }

  const reportWindow = window.open("", "rapport", "width=1000,height=800");
  if (!reportWindow) {
    showToast("Het rapportvenster kon niet worden geopend. Sta pop-ups toe en probeer opnieuw.", "error");
    return;
  }

  const reportDate = new Date().toLocaleDateString("nl-NL", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });
  const reportSchoolYear = `${activeSchoolYearId} · ${schoolYears[activeSchoolYearId].level || "Niveau niet ingesteld"}`;

  function parseReportNumber(value) {
    return parseFloat(String(value).replace(",", "."));
  }

  const reportDecimals = settings.decimals === 2 ? 2 : 1;

  function getReportGradeParts(grades) {
    return (grades || []).reduce((parts, grade) => {
      const gradeValue = parseReportNumber(grade.grade ?? grade.value);
      const gradeWeight = parseReportNumber(grade.weight);

      if (!Number.isNaN(gradeValue) && !Number.isNaN(gradeWeight) && gradeWeight > 0) {
        parts.validCount += 1;
        parts.weightedSum += gradeValue * gradeWeight;
        parts.totalWeight += gradeWeight;
      }

      return parts;
    }, {
      validCount: 0,
      weightedSum: 0,
      totalWeight: 0
    });
  }

  const subjectsArray = Object.values(data).map(subject => {
    const gradeParts = getReportGradeParts(subject.grades);
    const average = gradeParts.totalWeight > 0
      ? gradeParts.weightedSum / gradeParts.totalWeight
      : 0;
    const targetAverage = parseReportNumber(subject.targetAverage);

    return {
      name: subject.name,
      average: average > 0 ? average.toFixed(reportDecimals) : "—",
      gradeCount: gradeParts.validCount,
      targetAverage: !Number.isNaN(targetAverage) && targetAverage > 0 ? targetAverage.toFixed(reportDecimals) : "—",
      averageRaw: average,
      weightedSum: gradeParts.weightedSum,
      totalWeight: gradeParts.totalWeight
    };
  }).sort((a, b) => b.averageRaw - a.averageRaw);

  // Bereken algeheel gemiddelde van alle opgeslagen cijfers met dezelfde gewogen formule.
  const overallParts = subjectsArray.reduce((parts, subject) => {
    parts.weightedSum += subject.weightedSum;
    parts.totalWeight += subject.totalWeight;
    return parts;
  }, {
    weightedSum: 0,
    totalWeight: 0
  });

  const overallAverage = overallParts.totalWeight > 0
    ? overallParts.weightedSum / overallParts.totalWeight
    : 0;

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="nl">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Cijfer Rapport</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          background: #f5f5f5;
          padding: 2rem;
          line-height: 1.6;
        }
        
        .report-container {
          max-width: 900px;
          margin: 0 auto;
          background: white;
          border-radius: 12px;
          padding: 3rem 2rem;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        .report-header {
          text-align: center;
          margin-bottom: 3rem;
          border-bottom: 2px solid #111111;
          padding-bottom: 2rem;
        }
        
        .report-title {
          font-size: 2.5rem;
          font-weight: 800;
          color: #111111;
          margin-bottom: 0.5rem;
        }
        
        .report-subtitle {
          font-size: 1rem;
          color: #666;
          margin-bottom: 1rem;
        }
        
        .report-date {
          font-size: 0.9rem;
          color: #999;
        }
        
        .summary-section {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.5rem;
          margin-bottom: 2.5rem;
        }
        
        .summary-card {
          background: linear-gradient(135deg, #f5f5f5 0%, #efefef 100%);
          padding: 1.5rem;
          border-radius: 8px;
          text-align: center;
        }
        
        .summary-label {
          font-size: 0.9rem;
          color: #666;
          margin-bottom: 0.5rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        
        .summary-value {
          font-size: 2.5rem;
          font-weight: 800;
          color: #111111;
        }
        
        .subjects-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
          margin-top: 2rem;
        }
        
        .subject-card {
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 1.5rem;
          background: #fafafa;
        }
        
        .subject-name {
          font-size: 1.2rem;
          font-weight: 700;
          color: #111111;
          margin-bottom: 1rem;
        }
        
        .subject-info {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.75rem;
          padding-bottom: 0.75rem;
          border-bottom: 1px solid #e0e0e0;
        }
        
        .subject-info-label {
          font-size: 0.85rem;
          color: #666;
          font-weight: 600;
        }
        
        .subject-info-value {
          font-size: 0.9rem;
          font-weight: 700;
          color: #111111;
        }
        
        @media print {
          body {
            background: white;
            padding: 0;
          }
          .report-container {
            box-shadow: none;
            padding: 0;
          }
          .print-button {
            display: none;
          }
        }
        
        .print-button {
          display: block;
          margin: 2rem auto 0;
          padding: 0.75rem 2rem;
          background: #111111;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }
        
        .print-button:hover {
          background: #333;
        }
      </style>
    </head>
    <body>
      <div class="report-container">
        <div class="report-header">
          <h1 class="report-title">📊 Cijfer Rapport</h1>
          <p class="report-subtitle">Overzicht ${escapeHtml(reportSchoolYear)}</p>
          <p class="report-date">${reportDate}</p>
        </div>
        
        <div class="summary-section">
          <div class="summary-card">
            <div class="summary-label">Vakken</div>
            <div class="summary-value">${subjectsArray.length}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">Gemiddelde Cijfer</div>
            <div class="summary-value">${overallAverage > 0 ? overallAverage.toFixed(reportDecimals) : "—"}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">Totaal Vakken</div>
            <div class="summary-value">${subjectsArray.filter(s => s.gradeCount > 0).length}</div>
          </div>
        </div>
        
        <h2 style="margin: 2rem 0 1.5rem; font-size: 1.5rem; color: #111111;">Overzicht per Vak</h2>
        
        <div class="subjects-grid">
          ${subjectsArray.map(subject => `
            <div class="subject-card">
              <div class="subject-name">${escapeHtml(subject.name)}</div>
              <div class="subject-info">
                <span class="subject-info-label">Gemiddelde</span>
                <span class="subject-info-value">${subject.average}</span>
              </div>
              <div class="subject-info">
                <span class="subject-info-label">Doelgemiddelde</span>
                <span class="subject-info-value">${subject.targetAverage}</span>
              </div>
              <div class="subject-info">
                <span class="subject-info-label">Aantal Cijfers</span>
                <span class="subject-info-value">${subject.gradeCount}</span>
              </div>
            </div>
          `).join('')}
        </div>
        
        <button class="print-button" onclick="window.print()">🖨️ Afdrukken / Opslaan als PDF</button>
      </div>
    </body>
    </html>
  `;

  reportWindow.document.write(htmlContent);
  reportWindow.document.close();
}

function escapeHtml(text) {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function roundUpToTenth(value) {
  return Math.ceil(value * 10) / 10;
}

function calculateGoal(event) {
  event.preventDefault();

  const subjectKey = goalSubjectSelect.value;
  const desiredAverage = parseGradeValue(desiredAverageInput.value);
  const nextWeight = parseGradeValue(goalWeightInput.value);

  if (!subjects[subjectKey]) {
    alert("Kies een vak waarvoor je al cijfers hebt.");
    goalSubjectSelect.focus();
    return;
  }

  if (Number.isNaN(desiredAverage) || desiredAverage < 1 || desiredAverage > 10) {
    alert("Voer een geldig doelgemiddelde in tussen 1,0 en 10,0.");
    desiredAverageInput.focus();
    return;
  }

  if (Number.isNaN(nextWeight) || nextWeight < 1) {
    alert("Voer een geldige weging in vanaf 1.");
    goalWeightInput.focus();
    return;
  }

  lastGoalState = createGoalState(subjectKey, desiredAverage, nextWeight);
  renderGoalResult(lastGoalState);
}

function handleDecimalChange() {
  settings.decimals = Number(decimalSelect.value) === 2 ? 2 : 1;
  saveSettings();
  renderApp();
}

function handlePassingGradeChange() {
  const parsedPassingGrade = parseGradeValue(passingGradeInput.value);

  if (parsedPassingGrade < 1 || parsedPassingGrade > 10) {
    passingGradeInput.value = settings.passingGrade.toFixed(1);
    updateSettingsForm();
    return;
  }

  settings.passingGrade = Math.round(parsedPassingGrade * 10) / 10;
  saveSettings();
  renderApp();
}

function getUsernameCredentials() {
  const username = authUsernameInput.value.trim().toLowerCase();

  if (!USERNAME_PATTERN.test(username)) {
    setAuthFeedback("Gebruikersnaam moet 3–20 tekens zijn: letters, cijfers, _ of -.", "error");
    authUsernameInput.focus();
    return null;
  }

  if (!authPasswordInput.value) {
    setAuthFeedback("Vul je wachtwoord in.", "error");
    authPasswordInput.focus();
    return null;
  }

  return {
    email: `${username}@${USERNAME_AUTH_DOMAIN}`,
    password: authPasswordInput.value
  };
}

async function handleLogin(event) {
  event.preventDefault();

  if (isAuthBusy) {
    return;
  }

  const credentials = getUsernameCredentials();
  if (!credentials) {
    return;
  }

  try {
    setAuthBusyState(true, "Bezig met inloggen...");
    const result = await signInWithEmailAndPassword(auth, credentials.email, credentials.password);
    console.log("Firebase login succesvol!", result.user.uid);
    setAuthFeedback("Inloggen gelukt.", "success");
    showToast("Ingelogd! 🎉", "success");
  } catch (error) {
    console.error("Firebase login fout:", error.code, error.message);
    await handleAuthError(error);
  } finally {
    setAuthBusyState(false);
  }
}

async function handleRegister() {
  if (isAuthBusy) {
    return;
  }

  const credentials = getUsernameCredentials();
  if (!credentials) {
    return;
  }

  try {
    setAuthBusyState(true, "Bezig met account aanmaken...");
    const result = await createUserWithEmailAndPassword(auth, credentials.email, credentials.password);
    console.log("Firebase account aangemaakt!", result.user.uid);
    setAuthFeedback("Account aangemaakt. Je bent nu ingelogd.", "success");
    showToast("Account aangemaakt! Welkom! 🎉", "success");
  } catch (error) {
    console.error("Firebase register fout:", error.code, error.message);
    await handleAuthError(error);
  } finally {
    setAuthBusyState(false);
  }
}

async function handleLogout() {
  if (isAuthBusy) {
    return;
  }

  try {
    setAuthBusyState(true, "Bezig met uitloggen...");
    await signOut(auth);
    showToast("Uitgelogd!", "info");
  } catch (error) {
    await handleAuthError(error);
  } finally {
    setAuthBusyState(false);
  }
}

function handleTabClick(event) {
  const button = event.currentTarget;
  activateTab(button.dataset.tabTarget);
}

function handleTabKeyboard(event) {
  const currentIndex = tabButtons.indexOf(event.currentTarget);
  let nextIndex = currentIndex;

  if (event.key === "ArrowRight") {
    nextIndex = (currentIndex + 1) % tabButtons.length;
  } else if (event.key === "ArrowLeft") {
    nextIndex = (currentIndex - 1 + tabButtons.length) % tabButtons.length;
  } else if (event.key === "Home") {
    nextIndex = 0;
  } else if (event.key === "End") {
    nextIndex = tabButtons.length - 1;
  } else {
    return;
  }

  event.preventDefault();
  tabButtons[nextIndex].focus();
  activateTab(tabButtons[nextIndex].dataset.tabTarget);
}

function handleSubjectBlur() {
  subjectInput.value = normalizeSubjectName(subjectInput.value);
}





function initializeFirebaseSync() {
  console.log("Firebase sync initialiseren met projectId:", firebaseConfig.projectId);
  
  onAuthStateChanged(auth, async (user) => {
    console.log("onAuthStateChanged triggered:", user ? "Gebruiker ingelogd" : "Geen gebruiker ingelogd");
    
    currentUser = user;
    isAuthInitialized = true;

    if (user) {
      console.log("✓ Gebruiker ingelogd");
      isOfflineMode = false;
      localStorage.removeItem(OFFLINE_MODE_KEY);
      updateAuthUi(); // Update UI: toon app, verberg modal
      await loadRemoteAppState(currentUser); // Laad gebruiker gegevens
    } else {
      console.log("✕ Geen gebruiker ingelogd - controleer offline fallback");
      // Check if we have local data (offline mode)
      const hasLocalData = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(SETTINGS_KEY);
      if (hasLocalData) {
        console.log("📱 Offline mode: gebruikmaken van lokale gegevens");
        isOfflineMode = true;
        localStorage.setItem(OFFLINE_MODE_KEY, "true");
        showToast("📡 Offline: werking met lokale gegevens", "info");
      }
      updateAuthUi(); // Update UI: verberg app, toon modal
      renderApp(); // Render met lokale data
    }
  });
  
  console.log("Firebase onAuthStateChanged listener ingesteld");
}

function initializeNetworkSync() {
  // Auto-sync when back online
  window.addEventListener("online", async () => {
    console.log("🌐 Terug online! Synchroniseren...");
    if (currentUser && isOfflineMode) {
      isOfflineMode = false;
      localStorage.removeItem(OFFLINE_MODE_KEY);
      showToast("Terug online! Synchroniseren met server...", "success");
      await syncRemoteAppState();
      showToast("Data gesynchroniseerd! ✓", "success");
    }
  });

  // Show notification when going offline
  window.addEventListener("offline", () => {
    console.log("📡 Offline - werken met lokale gegevens");
    isOfflineMode = true;
    localStorage.setItem(OFFLINE_MODE_KEY, "true");
    showToast("📡 Offline: wijzigingen worden lokaal opgeslagen", "info");
  });
}

function initializeApp() {
  console.log("App initialiseren...");
  
  // Check of kritieke elementen bestaan
  if (!authForm) {
    console.error("FOUT: authForm element niet gevonden!");
  }
  if (!loginButton) {
    console.error("FOUT: loginButton element niet gevonden!");
  }
  if (!authUsernameInput) {
    console.error("FOUT: authUsernameInput element niet gevonden!");
  }
  
  // Zet initiële theme: controleer localStorage en pas toe (auto volgt systeeminstelling)
  try {
    const storedTheme = localStorage.getItem(THEME_KEY);

    if (storedTheme === "dark" || storedTheme === "light" || storedTheme === "auto") {
      settings.theme = storedTheme;
    }
  } catch (err) {
    // ignore localStorage errors
  }

  applyThemeToDocument(settings.theme);
  updateThemeSelector(settings.theme);
  enhanceSelect(goalSubjectSelect);
  enhanceSelect(decimalSelect);
  
  // BELANGRIJK: Zorg dat de app VERBORGEN blijft tot Firebase auth volledig is geverifieerd
  // De login modal MOET eerst verschijnen - dit is de veilige default
  const app = document.querySelector(".app");
  if (app) {
    app.hidden = true;
    app.setAttribute("aria-hidden", "true");
  }
  
  // Login modal wordt getoond door updateAuthUi() als gebruiker niet is ingelogd
  // Nu nog verborgen, zal aangeroepen worden door Firebase auth listener
  if (loginModal) {
    loginModal.hidden = true;
    loginModal.setAttribute("aria-hidden", "true");
  }
  
  // Zorg dat scrollbar is geblokkeerd totdat Firebase klaar is
  document.body.style.overflow = "hidden";
  
  // Sla subjects op
  saveSubjects();
  
  // Activeer overzicht tab
  activateTab("panel-overview");
  
  // Render app met huidige data (maar dit zal nog niet zichtbaar zijn)
  renderApp();
  
  // Event listeners
  

  // Theme keuze via slider (buttons)
  const slider = document.getElementById("themeSlider");
  if (slider) {
    const options = Array.from(slider.querySelectorAll('.theme-option'));

    options.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const v = btn.dataset.value === 'dark' ? 'dark' : btn.dataset.value === 'light' ? 'light' : 'auto';
        try { localStorage.setItem(THEME_KEY, v); } catch (err) { /* ignore */ }
        setTheme(v);
      });
    });

    // Arrow-key navigation between the three buttons
    slider.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const activeIndex = options.findIndex((o) => document.activeElement === o);
      if (activeIndex === -1) return;

      e.preventDefault();
      const nextIndex = e.key === 'ArrowRight'
        ? Math.min(options.length - 1, activeIndex + 1)
        : Math.max(0, activeIndex - 1);

      options[nextIndex].focus();
    });
  }
  authForm.addEventListener("submit", handleLogin);
  registerButton.addEventListener("click", handleRegister);
  logoutButton.addEventListener("click", handleLogout);
  schoolYearToggle.addEventListener("click", toggleSchoolYearOptions);
  document.addEventListener("click", closeSchoolYearOptions);
  schoolYearForm.addEventListener("submit", handleSchoolYearSubmit);
  gradeForm.addEventListener("submit", addGrade);
  goalForm.addEventListener("submit", calculateGoal);
  settingsForm.addEventListener("submit", (event) => event.preventDefault());
  clearGradesButton.addEventListener("click", clearGrades);
  generateReportButton.addEventListener("click", generateReport);
  closeReportButton.addEventListener("click", () => reportDialog.close());
  saveReportPdfButton.addEventListener("click", () => window.print());
  subjectInput.addEventListener("blur", handleSubjectBlur);
  decimalSelect.addEventListener("change", handleDecimalChange);
  passingGradeInput.addEventListener("change", handlePassingGradeChange);
  passingGradeInput.addEventListener("blur", handlePassingGradeChange);

  tabButtons.forEach((button) => {
    button.addEventListener("click", handleTabClick);
    button.addEventListener("keydown", handleTabKeyboard);
  });

  console.log("App geladen. Firebase auth wordt geïnitialiseerd...");
  
  // Initialiseer network sync listeners (offline/online)
  initializeNetworkSync();
  
  // Initialiseer Firebase auth listener - DIT BEPAALT of de app of login modal zichtbaar is
  initializeFirebaseSync();
}

initializeApp();