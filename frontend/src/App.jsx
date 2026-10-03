import { useEffect, useMemo, useState } from "react";
import "./App.css";

const mealOrder = ["breakfast", "lunch", "snacks", "dinner"];

const mealInfo = {
  breakfast: {
    title: "Morning",
    mealName: "Breakfast",
    subtitle: "Start your day right",
    emoji: "☀️",
    images: ["/images/breakfast.png"],
    className: "morning",
  },

  lunch: {
    title: "Afternoon",
    mealName: "Lunch",
    subtitle: "A satisfying midday meal",
    emoji: "🥗",
    images: [
      "/images/lunch1.jpg",
      "/images/lunch2.jpg",
    ],
    className: "afternoon",
  },

  snacks: {
    title: "Evening",
    mealName: "Snacks",
    subtitle: "Something light for the evening",
    emoji: "☕",
    images: ["/images/snacks.jpg"],
    className: "evening",
  },

  dinner: {
    title: "Night",
    mealName: "Dinner",
    subtitle: "End your day with a good meal",
    emoji: "🌙",
    images: [
      "/images/dinner1.jpg",
      "/images/dinner2.jpg",
    ],
    className: "night",
  },
};

const MONTH_NAMES = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

function getMenuFilePath(dateString, hostel, messType) {
  const date = new Date(`${dateString}T00:00:00`);
  const year = date.getFullYear();
  const monthNumber = date.getMonth() + 1;
  const monthName = MONTH_NAMES[monthNumber - 1];

  const folder = hostel === "womens" ? "womens" : "mens";

  const fileName =
    hostel === "womens"
      ? messType === "veg_non_veg"
        ? `${monthName}_womens_${year}_veg-non-veg.json`
        : `${monthName}_womens_${year}_special.json`
      : messType === "veg_non_veg"
        ? `${monthName}_${year}_veg-non-veg.json`
        : `${monthName}_${year}_special.json`;

  return `/data/${folder}/${year}/${String(monthNumber).padStart(2, "0")}/${fileName}`;
}

function getDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getTomorrowString() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return getDateString(date);
}

function getPreviousDate(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() - 1);
  return getDateString(date);
}

function getNextDate(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + 1);
  return getDateString(date);
}

function formatDate(dateString) {
  if (!dateString) return "";

  const date = new Date(`${dateString}T00:00:00`);

  return date.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function getAutomaticMeal() {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const totalMinutes = hours * 60 + minutes;

  if (totalMinutes < 10 * 60) {
    return {
      meal: "breakfast",
      dateOffset: 0,
      status: "serving",
    };
  }

  if (totalMinutes < 15 * 60) {
    return {
      meal: "lunch",
      dateOffset: 0,
      status: "serving",
    };
  }

  if (totalMinutes <= 18 * 60 + 30) {
    return {
      meal: "snacks",
      dateOffset: 0,
      status: "serving",
    };
  }

  if (totalMinutes <= 21 * 60 + 30) {
    return {
      meal: "dinner",
      dateOffset: 0,
      status: "serving",
    };
  }

  return {
    meal: "breakfast",
    dateOffset: 1,
    status: "upNext",
  };
}

function getAutomaticDate() {
  const automaticMeal = getAutomaticMeal();

  if (automaticMeal.dateOffset === 1) {
    return getTomorrowString();
  }

  return getDateString();
}

function getItemText(item) {
  if (typeof item === "string") {
    return item;
  }

  if (item && typeof item === "object") {
    return (
      item.name ||
      item.item ||
      item.food ||
      item.description ||
      JSON.stringify(item)
    );
  }

  return String(item);
}

function MealImages({ images, mealName }) {
  const [failedImages, setFailedImages] = useState([]);

  const validImages = images.filter(
    (_, index) => !failedImages.includes(index)
  );

  const handleImageError = (index) => {
    setFailedImages((current) => {
      if (current.includes(index)) {
        return current;
      }

      return [...current, index];
    });
  };

  if (validImages.length === 0) {
    return (
      <div className="image-fallback">
        <div className="image-fallback-content">
          <span>🍽️</span>
          <p>{mealName}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`meal-images ${
        images.length > 1 ? "multiple-images" : "single-image"
      }`}
    >
      {images.map((image, index) => {
        if (failedImages.includes(index)) {
          return null;
        }

        return (
          <img
            key={image}
            src={image}
            alt={`${mealName} food`}
            className="meal-image"
            onError={() => handleImageError(index)}
          />
        );
      })}
    </div>
  );
}

function MealSection({ meal, items, info }) {
  const safeItems = Array.isArray(items) ? items : [];

  const content = (
    <div className="meal-content">
      <div className="meal-label">
        <span className="meal-emoji">{info.emoji}</span>
        <span>{info.title}</span>
      </div>

      <h2>{info.mealName}</h2>

      <p className="meal-subtitle">{info.subtitle}</p>

      {safeItems.length > 0 ? (
        <div className="food-tables">
          {(() => {
            const midpoint = Math.ceil(safeItems.length / 2);
            const columns = [
              safeItems.slice(0, midpoint),
              safeItems.slice(midpoint),
            ];

            const renderTable = (tableItems, startIndex) => (
              <div className="food-table">
                {tableItems.map((item, index) => {
                  const itemNumber = startIndex + index;

                  return (
                    <div
                      className="food-item"
                      key={`${meal}-${itemNumber}`}
                    >
                      <span className="food-number">
                        {String(itemNumber + 1).padStart(2, "0")}
                      </span>

                      <span className="food-dot">•</span>

                      <span className="food-name">
                        {getItemText(item)}
                      </span>
                    </div>
                  );
                })}
              </div>
            );

            return (
              <>
                {renderTable(columns[0], 0)}
                {columns[1].length > 0 &&
                  renderTable(columns[1], midpoint)}
              </>
            );
          })()}
        </div>
      ) : (
        <div className="no-items">
          No menu items available for this meal.
        </div>
      )}
    </div>
  );

  const image = (
    <div className="meal-image-wrapper">
      <MealImages
        images={info.images}
        mealName={info.mealName}
      />
    </div>
  );

  const imageFirst =
    meal === "lunch" || meal === "dinner";

  return (
    <section className={`meal-section ${info.className}`}>
      {imageFirst ? (
        <>
          {image}
          {content}
        </>
      ) : (
        <>
          {content}
          {image}
        </>
      )}
    </section>
  );
}

function MealSlider({
  selectedMeal,
  setSelectedMeal,
  selectedMenu,
}) {
  const currentIndex = mealOrder.indexOf(selectedMeal);

  const goPrevious = () => {
    const previousIndex =
      currentIndex === 0
        ? mealOrder.length - 1
        : currentIndex - 1;

    setSelectedMeal(mealOrder[previousIndex]);
  };

  const goNext = () => {
    const nextIndex =
      currentIndex === mealOrder.length - 1
        ? 0
        : currentIndex + 1;

    setSelectedMeal(mealOrder[nextIndex]);
  };

  const handleTouchStart = (event) => {
    event.currentTarget.dataset.touchStart =
      event.touches[0].clientX;
  };

  const handleTouchEnd = (event) => {
    const startX = Number(
      event.currentTarget.dataset.touchStart
    );

    const endX = event.changedTouches[0].clientX;

    if (!startX) return;

    const difference = startX - endX;

    if (Math.abs(difference) < 50) return;

    if (difference > 0) {
      goNext();
    } else {
      goPrevious();
    }
  };

  const info = mealInfo[selectedMeal];
  const items = selectedMenu?.meals?.[selectedMeal] || [];

  return (
    <div className="meal-slider-wrapper">
      <button
        className="meal-arrow meal-arrow-left"
        onClick={goPrevious}
        aria-label="Previous meal"
      >
        ←
      </button>

      <div
        className="meal-slider"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <MealSection
          meal={selectedMeal}
          items={items}
          info={info}
        />
      </div>

      <button
        className="meal-arrow meal-arrow-right"
        onClick={goNext}
        aria-label="Next meal"
      >
        →
      </button>

      <div className="meal-dots">
        {mealOrder.map((meal, index) => (
          <button
            key={meal}
            className={`meal-dot ${
              index === currentIndex ? "active" : ""
            }`}
            onClick={() => setSelectedMeal(meal)}
            aria-label={`Show ${mealInfo[meal].mealName}`}
          />
        ))}
      </div>

      <div className="swipe-hint">
        ← Swipe or use arrows to explore meals →
      </div>
    </div>
  );
}

function safeGetStorage(key, fallback = null) {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function safeSetStorage(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage can be blocked in private/restricted browser contexts.
  }
}

function App() {
  /*
   * Reliable startup:
   * - Every fresh page load starts at Hostel Selection.
   * - We do NOT restore an old menu/mess screen from localStorage.
   *   This prevents stale navigation state from opening a broken menu.
   * - Theme and last hostel are still remembered.
   * - Menu data is fetched only after the user actually enters the menu.
   */
  const savedHostel = safeGetStorage("messmate-hostel-type", "");

  const initialHostel =
    savedHostel === "womens" || savedHostel === "mens"
      ? savedHostel
      : "";

  const [screen, setScreen] = useState("hostel");
  const [hostel, setHostel] = useState(initialHostel);
  const [messType, setMessType] = useState("veg_non_veg");

  const [theme, setTheme] = useState(() => {
    const savedTheme = safeGetStorage("messmate-theme");
    const initialTheme =
      savedTheme === "light" || savedTheme === "dark"
        ? savedTheme
        : "dark";

    document.documentElement.setAttribute("data-theme", initialTheme);
    return initialTheme;
  });

  const initialAutomaticMeal = getAutomaticMeal();

  const [selectedDate, setSelectedDate] = useState(
    getAutomaticDate()
  );

  const [selectedMeal, setSelectedMeal] = useState(
    initialAutomaticMeal.meal
  );

  const [manualSelection, setManualSelection] =
    useState(false);

  const [currentTime, setCurrentTime] =
    useState(new Date());

  const [menuData, setMenuData] = useState(null);
  const [menuLoading, setMenuLoading] = useState(false);
  const [menuError, setMenuError] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);

  /* Keep automatic meal/date fresh while the page is open. */
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 30000);

    return () => clearInterval(timer);
  }, []);

  /*
   * Load only when the actual Menu screen is open.
   * Abort the previous request when hostel/mess/date changes so a slow
   * old request can never overwrite the newly selected menu.
   */
  useEffect(() => {
    if (screen !== "menu" || !hostel) {
      setMenuLoading(false);
      setMenuData(null);
      setMenuError("");
      return;
    }

    const controller = new AbortController();
    let active = true;

    const loadMenu = async () => {
      setMenuLoading(true);
      setMenuError("");
      setMenuData(null);

      try {
        const filePath = getMenuFilePath(
          selectedDate,
          hostel,
          messType
        );

        const response = await fetch(`${filePath}?v=${loadAttempt}`, {
          cache: "no-store",
          signal: controller.signal,
          headers: {
            Accept: "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(
            `Menu file not found (${response.status})`
          );
        }

        const data = await response.json();

        if (!data || typeof data !== "object" || !data.menus) {
          throw new Error("Invalid menu data format");
        }

        if (active) {
          setMenuData(data);
        }
      } catch (error) {
        if (error?.name === "AbortError") {
          return;
        }

        if (active) {
          setMenuData(null);
          setMenuError(
            error?.message || "Unable to load the menu."
          );
        }
      } finally {
        if (active) {
          setMenuLoading(false);
        }
      }
    };

    loadMenu();

    return () => {
      active = false;
      controller.abort();
    };
  }, [screen, selectedDate, hostel, messType, loadAttempt]);

  useEffect(() => {
    document.documentElement.setAttribute(
      "data-theme",
      theme
    );

    safeSetStorage("messmate-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (hostel) {
      safeSetStorage("messmate-hostel-type", hostel);
    }
  }, [hostel]);

  useEffect(() => {
    if (!manualSelection) {
      const automaticMeal = getAutomaticMeal();
      const targetDate = new Date();

      if (automaticMeal.dateOffset === 1) {
        targetDate.setDate(targetDate.getDate() + 1);
      }

      setSelectedDate(getDateString(targetDate));
      setSelectedMeal(automaticMeal.meal);
    }
  }, [currentTime, manualSelection]);

  const toggleTheme = () => {
    setTheme((currentTheme) =>
      currentTheme === "light" ? "dark" : "light"
    );
  };

  const selectedDayMenu =
    menuData?.menus?.[selectedDate];

  const automaticMeal = useMemo(
    () => getAutomaticMeal(),
    [currentTime]
  );

  const automaticDate = useMemo(
    () => getAutomaticDate(),
    [currentTime]
  );

  const isAutomaticView =
    !manualSelection &&
    selectedDate === automaticDate &&
    selectedMeal === automaticMeal.meal;

  const resetMenuState = () => {
    setMenuData(null);
    setMenuError("");
    setMenuLoading(false);
    setLoadAttempt((value) => value + 1);
  };

  const selectHostel = (type) => {
    const automatic = getAutomaticMeal();

    setHostel(type);
    setMessType("veg_non_veg");
    setSelectedDate(getAutomaticDate());
    setSelectedMeal(automatic.meal);
    setManualSelection(false);
    resetMenuState();

    safeSetStorage("messmate-hostel-type", type);
    setScreen("mess");
  };

  const changeHostelType = () => {
    setSelectedDate(getAutomaticDate());
    setSelectedMeal(getAutomaticMeal().meal);
    setManualSelection(false);
    resetMenuState();
    setScreen("hostel");
  };

  const goBackToHostel = () => {
    resetMenuState();
    setScreen("hostel");
  };

  const goBackToMessSelection = () => {
    resetMenuState();
    setScreen("mess");
  };

  const selectMess = (type) => {
    const automatic = getAutomaticMeal();

    setMessType(type);
    setSelectedDate(getAutomaticDate());
    setSelectedMeal(automatic.meal);
    setManualSelection(false);
    resetMenuState();
    setScreen("menu");
  };

  const goToAutomaticMenu = () => {
    const automatic = getAutomaticMeal();

    setSelectedDate(getAutomaticDate());
    setSelectedMeal(automatic.meal);
    setManualSelection(false);
    resetMenuState();
  };

  const selectDate = (date) => {
    if (!date) return;
    setSelectedDate(date);
    setManualSelection(true);
    resetMenuState();
  };

  const goToPreviousDate = () => {
    setSelectedDate((currentDate) =>
      getPreviousDate(currentDate)
    );
    setManualSelection(true);
    resetMenuState();
  };

  const goToNextDate = () => {
    setSelectedDate((currentDate) =>
      getNextDate(currentDate)
    );
    setManualSelection(true);
    resetMenuState();
  };

  const selectMealManually = (meal) => {
    setSelectedMeal(meal);
    setManualSelection(true);
  };

  const retryMenu = () => {
    setMenuError("");
    setMenuData(null);
    setMenuLoading(true);
    setLoadAttempt((value) => value + 1);
  };

  const getStatusText = () => {
    if (manualSelection) return "MANUAL VIEW";
    if (automaticMeal.status === "upNext") return "UP NEXT";
    return "SERVING NOW";
  };

  const getStatusDescription = () => {
    if (manualSelection) {
      return "You are viewing a manually selected meal";
    }

    if (automaticMeal.status === "upNext") {
      return "Today's meals are complete";
    }

    return `${mealInfo[automaticMeal.meal].mealName} is currently active`;
  };

  if (screen === "hostel") {
    return (
      <div className={`app hostel-${hostel || "selection"}`}>
        <div className="top-bar">
          <div className="brand-badge">
            🍽️ MESSMATE
          </div>

          <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {theme === "light" ? "🌙" : "☀️"}
          </button>
        </div>

        <main className="hero-screen">
          <div className="hero-content">
            <div className="hero-small-text">
              VIT HOSTEL MESS
            </div>

            <h1>
              What are you
              <br />
              <span>eating today?</span>
            </h1>

            <p>
              Choose your hostel to explore today's
              <br />
              mess menu.
            </p>

            <div className="hostel-cards">
              <button
                className="hostel-card mens-card"
                onClick={() => selectHostel("mens")}
              >
                <div className="hostel-icon">
                  🏠
                </div>

                <div className="hostel-card-content">
                  <span className="card-eyebrow">
                    AVAILABLE NOW
                  </span>

                  <h2>Men's Hostel</h2>

                  <p>
                    View Veg / Non-Veg and Special
                    Mess
                  </p>
                </div>

                <span className="card-arrow">
                  →
                </span>
              </button>

              <button
                className="hostel-card womens-card"
                onClick={() => selectHostel("womens")}
              >
                <div className="hostel-icon">
                  🏡
                </div>

                <div className="hostel-card-content">
                  <span className="card-eyebrow">
                    AVAILABLE NOW
                  </span>

                  <h2>Women's Hostel</h2>

                  <p>
                    View Veg / Non-Veg and Special
                    Mess
                  </p>
                </div>

                <span className="card-arrow">
                  →
                </span>
              </button>
            </div>
          </div>
        </main>

        <footer className="footer">
          <span>MESSMATE</span>
          <span>•</span>
          <span>HOSTEL FOOD MADE SIMPLE</span>
        </footer>
      </div>
    );
  }

  if (screen === "mess") {
    return (
      <div className={`app hostel-${hostel || "selection"}`}>
        <div className="selection-topbar">
          <button
            className="back-button"
            onClick={goBackToHostel}
          >
            ← Back
          </button>

          <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {theme === "light" ? "🌙" : "☀️"}
          </button>
        </div>

        <main className="selection-screen">
          <div className="selection-heading">
            <div className="hero-small-text">
              {hostel === "womens" ? "WOMEN'S HOSTEL" : "MEN'S HOSTEL"}
            </div>

            <h1>
              Choose your
              <br />
              <span>mess type.</span>
            </h1>

            <p>
              Select the menu you want to explore.
            </p>
          </div>

          <div className="mess-cards">
            <button
              className="mess-card veg-card"
              onClick={() =>
                selectMess("veg_non_veg")
              }
            >
              <div className="mess-card-top">
                <span className="mess-icon">
                  🥗
                </span>

                <span className="mess-card-arrow">
                  →
                </span>
              </div>

              <div className="mess-card-content">
                <span className="card-eyebrow">
                  DAILY MENU
                </span>

                <h2>Veg / Non-Veg</h2>

                <p>
                  Regular hostel mess menu with
                  vegetarian and non-vegetarian
                  options.
                </p>
              </div>
            </button>

            <button
              className="mess-card special-card"
              onClick={() =>
                selectMess("special")
              }
            >
              <div className="mess-card-top">
                <span className="mess-icon">
                  ✨
                </span>

                <span className="mess-card-arrow">
                  →
                </span>
              </div>

              <div className="mess-card-content">
                <span className="card-eyebrow">
                  SPECIAL MENU
                </span>

                <h2>Special Mess</h2>

                <p>
                  Explore special menu items and
                  different meal selections.
                </p>
              </div>
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={`app hostel-${hostel || "selection"}`}>
      <header className="menu-header">
        <div className="menu-header-left">
          <button
            className="back-button"
            onClick={goBackToMessSelection}
          >
            ← Back
          </button>

          <div className="menu-brand">
            <span>🍽️</span>
            <strong>MESSMATE</strong>
            <span className="header-hostel">
              {hostel === "womens" ? "Women's Hostel" : "Men's Hostel"}
            </span>
          </div>
        </div>

        <div className="header-actions">
          <button
            className="change-hostel-button"
            onClick={changeHostelType}
          >
            Change Hostel Type
          </button>

          <div className="mess-type-switcher">
            <button
              className="mess-type-button"
              type="button"
              onClick={() =>
                selectMess(
                  messType === "veg_non_veg"
                    ? "special"
                    : "veg_non_veg"
                )
              }
              aria-label="Change mess type"
              title="Change mess type"
            >
              <span className="mess-type-icon">
                {messType === "veg_non_veg" ? "🥗" : "✨"}
              </span>
              <span className="mess-type-label">
                {messType === "veg_non_veg"
                  ? "Veg / Non-Veg"
                  : "Special Mess"}
              </span>
              <span className="mess-type-chevron">⌄</span>
            </button>

            <div className="mess-type-menu" aria-hidden="true">
              <button
                type="button"
                onClick={() => selectMess("veg_non_veg")}
              >
                🥗 Veg / Non-Veg
              </button>
              <button
                type="button"
                onClick={() => selectMess("special")}
              >
                ✨ Special Mess
              </button>
            </div>
          </div>

          <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {theme === "light" ? "🌙" : "☀️"}
          </button>
        </div>
      </header>

      <main className="menu-page">
        <section className="date-section">
          <div className="date-heading">
            <div className="hero-small-text">
              {messType === "veg_non_veg"
                ? "REGULAR MESS"
                : "SPECIAL MESS"}
            </div>

            <h1>
              Your meal,
              <br />
              <span>your choice.</span>
            </h1>
          </div>

          <div className="date-controls">
            <button
              className="date-nav"
              onClick={goToPreviousDate}
              aria-label="Previous date"
            >
              ←
            </button>

            <div className="date-display">
              <span className="date-calendar-icon">
                📅
              </span>

              <div>
                <small>MENU FOR</small>

                <strong>
                  {formatDate(selectedDate)}
                </strong>
              </div>
            </div>

            <button
              className="date-nav"
              onClick={goToNextDate}
              aria-label="Next date"
            >
              →
            </button>
          </div>

          <div className="date-actions">
            <button
              className={`today-button ${
                isAutomaticView ? "active" : ""
              }`}
              onClick={goToAutomaticMenu}
            >
              ⚡ Current Menu
            </button>

            <div className="date-picker-wrapper">
              <span>Choose date</span>

              <input
                type="date"
                value={selectedDate}
                onChange={(event) =>
                  selectDate(event.target.value)
                }
              />
            </div>
          </div>
        </section>

        <section className="status-section">
          <div className="menu-status">
            <div className="status-left">
              <span
                className={`status-dot ${
                  isAutomaticView
                    ? "live"
                    : "manual"
                }`}
              />

              <div>
                <strong>
                  {getStatusText()}
                </strong>

                <span>
                  {getStatusDescription()}
                </span>
              </div>
            </div>

            <div className="status-meal">
              {mealInfo[selectedMeal].emoji}{" "}
              {mealInfo[selectedMeal].mealName}
            </div>
          </div>
        </section>

        <section className="meal-navigation">
          <div className="meal-tabs">
            {mealOrder.map((meal) => {
              const info = mealInfo[meal];

              return (
                <button
                  key={meal}
                  className={`meal-tab ${
                    info.className
                  } ${
                    selectedMeal === meal
                      ? "active"
                      : ""
                  }`}
                  onClick={() =>
                    selectMealManually(meal)
                  }
                >
                  <span>{info.emoji}</span>

                  <div>
                    <strong>
                      {info.mealName}
                    </strong>

                    <small>
                      {info.title}
                    </small>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {menuLoading ? (
          <section className="empty-menu data-loading">
            <div className="loading-spinner" />
            <h2>Loading menu...</h2>
            <p>
              Loading the menu for{" "}
              <strong>
                {formatDate(selectedDate)}
              </strong>
              .
            </p>
          </section>
        ) : selectedDayMenu ? (
          <MealSlider
            selectedMeal={selectedMeal}
            setSelectedMeal={
              selectMealManually
            }
            selectedMenu={selectedDayMenu}
          />
        ) : (
          <section className="empty-menu">
            <div className="empty-icon">
              🍽️
            </div>

            <h2>Menu unavailable</h2>

            <p>
              We don't have menu data for{" "}
              <strong>
                {formatDate(selectedDate)}
              </strong>
              {menuError ? "." : "."}
            </p>

            <button
              onClick={goToAutomaticMenu}
              className="today-button"
            >
              Return to Current Menu
            </button>
          </section>
        )}
      </main>

      <footer className="footer menu-footer">
        <span>MESSMATE</span>
        <span>•</span>
        <span>HOSTEL FOOD MADE SIMPLE</span>
      </footer>
    </div>
  );
}

export default App;