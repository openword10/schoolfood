const form = document.getElementById("meal-form");
const fmSeqInput = document.getElementById("fmSeq");
const mealItems = document.getElementById("meal-items");
const mealDate = document.getElementById("meal-date");
const mealMeta = document.getElementById("meal-meta");
const statusText = document.getElementById("status");
const prevButton = document.getElementById("prev-meal");
const nextButton = document.getElementById("next-meal");
const findNextButton = document.getElementById("find-next");
const agentToggle = document.getElementById("agent-toggle");
const photoInput = document.getElementById("photo-input");
const mealPhoto = document.getElementById("meal-photo");
const prevWeekButton = document.getElementById("prev-week");
const nextWeekButton = document.getElementById("next-week");
const weekdayButtons = Array.from(document.querySelectorAll(".weekday"));

const API_URL =
  "https://seocheon-m.goeyi.kr/seocheon-m/ad/fm/foodmenu/selectFoodData.do";

const weekdays = ["월", "화", "수", "목", "금", "토", "일"];
const weekOffsets = new Map();

const tryFixEncoding = (value) => {
  if (!value) return value;
  try {
    const bytes = Uint8Array.from([...value].map((char) => char.charCodeAt(0)));
    const decoded = new TextDecoder("utf-8").decode(bytes);
    if (decoded && /[가-힣]/.test(decoded)) {
      return decoded;
    }
  } catch (error) {
    return value;
  }
  return value;
};

const formatDateTag = (dateInfo) => {
  if (!dateInfo) return "-";
  const date = new Date(dateInfo.year, dateInfo.month - 1, dateInfo.day);
  const dayIndex = (date.getDay() + 6) % 7;
  return `${dateInfo.year}.${String(dateInfo.month).padStart(2, "0")}.${String(
    dateInfo.day
  ).padStart(2, "0")} (${weekdays[dayIndex]})`;
};

const updateWeekNav = (dateInfo) => {
  if (!dateInfo) return;
  const baseDate = new Date(dateInfo.year, dateInfo.month - 1, dateInfo.day);
  const mondayOffset = (baseDate.getDay() + 6) % 7;
  const monday = new Date(baseDate);
  monday.setDate(baseDate.getDate() - mondayOffset);

  weekOffsets.clear();
  weekdayButtons.forEach((button) => {
    const offset = Number(button.dataset.weekday || 0);
    const targetDate = new Date(monday);
    targetDate.setDate(monday.getDate() + offset);
    button.textContent = `${weekdays[offset]} ${targetDate.getDate()}`;
    const deltaDays = Math.round((targetDate - baseDate) / 86400000);
    weekOffsets.set(button, deltaDays);
    button.classList.toggle("active", deltaDays === 0);
  });
};

const decodeMenu = (value) => {
  if (!value) return [];
  const fixed = tryFixEncoding(value);
  return fixed
    .split("\r\n")
    .map((item) => item.trim())
    .filter(Boolean);
};

const renderMenu = (data) => {
  mealItems.innerHTML = "";
  mealMeta.textContent = "";

  if (!data) {
    mealItems.innerHTML = "<li>급식 데이터를 불러오지 못했어요.</li>";
    mealDate.textContent = "-";
    statusText.textContent = "급식 데이터를 가져오지 못했습니다. fmSeq를 확인해 주세요.";
    return;
  }

  const menu = decodeMenu(data.fmCn || data.food?.fmCn);
  const dateInfo = data.food?.fmDt?.date;

  mealDate.textContent = dateInfo ? formatDateTag(dateInfo) : "날짜 정보 없음";
  updateWeekNav(dateInfo);

  if (menu.length === 0) {
    mealItems.innerHTML = "<li>등록된 급식 메뉴가 없습니다.</li>";
  } else {
    menu.forEach((item) => {
      const li = document.createElement("li");
      li.textContent = item;
      mealItems.appendChild(li);
    });
  }

  const title = tryFixEncoding(data.fmTitle || data.food?.fmTitle || "");
  mealMeta.textContent = `fmSeq: ${data.fmSeq || data.food?.fmSeq || "-"}${title ? ` · ${title}` : ""}`;
  statusText.textContent = "급식 데이터를 불러왔습니다.";
};

const requestMeal = async (fmSeq) => {
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      },
      body: new URLSearchParams({ fmSeq }),
    });

    return await response.json();
  } catch (error) {
    return null;
  }
};

const fetchMeal = async (fmSeq) => {
  statusText.textContent = "급식 데이터를 불러오는 중...";
  const data = await requestMeal(fmSeq);
  renderMenu(data);
};

const stepMeal = (direction) => {
  const current = Number(fmSeqInput.value || 0);
  const nextValue = Math.max(1, current + direction);
  fmSeqInput.value = String(nextValue);
  fetchMeal(String(nextValue));
};

const findNextMeal = async () => {
  const current = Number(fmSeqInput.value || 0);
  const maxTries = agentToggle.checked ? 30 : 1;
  statusText.textContent = "다음 급식을 찾는 중...";

  for (let step = 1; step <= maxTries; step += 1) {
    const candidate = current + step;
    const data = await requestMeal(String(candidate));
    const menu = decodeMenu(data?.fmCn || data?.food?.fmCn);
    if (menu.length > 0) {
      fmSeqInput.value = String(candidate);
      renderMenu(data);
      return;
    }
  }

  statusText.textContent = "다음 급식을 찾지 못했어요. 번호를 직접 입력해 주세요.";
};

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const fmSeq = fmSeqInput.value.trim();
  if (fmSeq) {
    fetchMeal(fmSeq);
  }
});

prevButton.addEventListener("click", () => stepMeal(-1));
nextButton.addEventListener("click", () => stepMeal(1));
findNextButton.addEventListener("click", () => {
  findNextMeal();
});

weekdayButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const delta = weekOffsets.get(button);
    if (delta === undefined) {
      statusText.textContent = "먼저 급식을 불러와 주세요.";
      return;
    }
    stepMeal(delta);
  });
});

prevWeekButton.addEventListener("click", () => {
  stepMeal(-7);
});

nextWeekButton.addEventListener("click", () => {
  stepMeal(7);
});

photoInput.addEventListener("change", (event) => {
  const [file] = event.target.files;
  if (!file) return;
  const url = URL.createObjectURL(file);
  mealPhoto.src = url;
  mealPhoto.alt = "업로드한 급식 사진";
});

fetchMeal(fmSeqInput.value.trim());
