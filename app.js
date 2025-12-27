const mealItems = document.getElementById("meal-items");
const mealDate = document.getElementById("meal-date");
const mealPhoto = document.getElementById("meal-photo");
const weekdayButtons = Array.from(document.querySelectorAll(".weekday"));

const API_URL =
  "https://seocheon-m.goeyi.kr/seocheon-m/ad/fm/foodmenu/selectFoodData.do";
const DEFAULT_SEQ = 243715;

const weekdays = ["월", "화", "수", "목", "금", "토", "일"];
const weekOffsets = new Map();
let currentSeq = DEFAULT_SEQ;

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

  if (!data) {
    mealItems.innerHTML = "<li>급식 데이터를 불러오지 못했어요.</li>";
    mealDate.textContent = "-";
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
  const data = await requestMeal(fmSeq);
  renderMenu(data);
};

const stepMeal = (direction) => {
  const nextValue = Math.max(1, currentSeq + direction);
  currentSeq = nextValue;
  fetchMeal(String(nextValue));
};

weekdayButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const delta = weekOffsets.get(button);
    if (delta === undefined) return;
    stepMeal(delta);
  });
});

mealPhoto.addEventListener("error", () => {
  mealPhoto.src = "meal-photo.svg";
});

fetchMeal(String(currentSeq));
