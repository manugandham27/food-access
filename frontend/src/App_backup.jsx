import { useEffect, useMemo, useState } from "react";
import "./App.css";

const mealOrder = ["breakfast", "lunch", "snacks", "dinner"];
const mealInfo = {
  breakfast: {
    title: "Breakfast",
    mealName: "Breakfast",
    subtitle: "Start your day with a fresh meal",
    emoji: "🌅",
    className: "morning",
    imageNames: ["breakfast"],
  },

  lunch: {
    title: "Afternoon",
    mealName: "Lunch",
    subtitle: "A satisfying afternoon meal",
    emoji: "☀️",
    className: "afternoon",
    imageNames: ["lunch1", "lunch2"],
  },

  snacks: {
    title: "Snacks",
    mealName: "Snacks",
    subtitle: "Something light for the evening",
    emoji: "🍿",
    className: "evening",
    imageNames: ["snacks"],
  },

  dinner: {
    title: "Night",
    mealName: "Dinner",
    subtitle: "End your day with a delicious meal",
    emoji: "🌙",
    className: "night",
    imageNames: ["dinner1", "dinner2"],
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

function getMenuFilePath(dateString, messType) {
  const date = new Date(`${dateString}T00:00:00`);
  const year = date.getFullYear();
  const monthNumber = date.getMonth() + 1;
  const monthName = MONTH_NAMES[monthNumber - 1];

  const fileName =
    messType === "veg_non_veg"
      ? `${monthName}_${year}_veg-non-veg.json`
      : `${monthName}_${year}_special.json`;

  return `/data/mens/${year}/${String(monthNumber).padStart(2, "0")}/${fileName}`;
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
function MealImages({ imageNames = [], mealName }) {
  const [failedImages, setFailedImages] = useState({});

  const handleImageError = (index) => {
    setFailedImages((current) => ({
      ...current,
      [index]: true,
    }));
  };

  const visibleImages = imageNames.filter(
    (_, index) => !failedImages[index]
  );

  if (visibleImages.length === 0) {
    return (
      <div className="image-fallback">
        <span>🍽️</span>
        <p>{mealName || "Meal"}</p>
      </div>
    );
  }

  return (
    <div
      className={`meal-images ${
        visibleImages.length === 1
          ? "single-image"
          : "multiple-images"
      }`}
    >
      {imageNames.map((name, index) => {
        if (failedImages[index]) return null;

        return (
          <img
            key={`${name}-${index}`}
            src={`/images/${name}.${name === "breakfast" ? "png" : "jpg"}`}
            alt={`${mealName || "Meal"} ${name}`}
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

  // Keep the original two-column/table presentation.
  // Items are split as evenly as possible between the two tables.
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
          <div className="food-item" key={`${meal}-${itemNumber}`}>
            <span className="food-number">
              {String(itemNumber + 1).padStart(2, "0")}
            </span>

            <span className="food-dot">•</span>

            <span className="food-name">{getItemText(item)}</span>
          </div>
        );
      })}
    </div>
  );

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
          {renderTable(columns[0], 0)}
          {columns[1].length > 0 && renderTable(columns[1], midpoint)}
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
        imageNames={info.imageNames}
        mealName={info.mealName}
      />
    </div>
  );

  const imageFirst = meal === "lunch" || meal === "dinner";

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

function App() {
  /*
   * Persistent app state:
   * - First visit opens in dark mode.
   * - After the user chooses a theme, that choice is remembered.
   * - If the user previously reached a menu, reopen directly in
   *   the menu instead of making them go through Hostel -> Mess.
   * - The menu itself always resets to the CURRENT automatic meal
   *   when the site is reopened; an old manual meal is not restored.
   */
  const savedScreen = localStorage.getItem("messmate-last-screen");
  const savedMessType = localStorage.getItem("messmate-last-mess-type");

  const initialScreen =
    savedScreen === "menu" || savedScreen === "mess"
      ? savedScreen
      : "hostel";

  const initialMessType =
    savedMessType === "special" ||
    savedMessType === "veg_non_veg"
      ? savedMessType
      : "veg_non_veg";

  const [screen, setScreen] = useState(initialScreen);
  const [messType, setMessType] = useState(initialMessType);

  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem("messmate-theme");
    const initialTheme =
      savedTheme === "light" || savedTheme === "dark"
        ? savedTheme
        : "dark";

    // Apply the first-visit theme before the page is painted.
    document.documentElement.setAttribute(
      "data-theme",
      initialTheme
    );

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

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 30000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadMenu = async () => {
      setMenuLoading(true);
      setMenuError("");
      setMenuData(null);

      try {
        const filePath = getMenuFilePath(
          selectedDate,
          messType
        );

        const response = await fetch(filePath, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(
            `Menu file not found (${response.status})`
          );
        }

        const data = await response.json();

        if (!cancelled) {
          setMenuData(data);
        }
      } catch (error) {
        if (!cancelled) {
          setMenuData(null);
          setMenuError(error.message);
        }
      } finally {
        if (!cancelled) {
          setMenuLoading(false);
        }
      }
    };

    loadMenu();

    return () => {
      cancelled = true;
    };
  }, [selectedDate, messType]);

  useEffect(() => {
    document.documentElement.setAttribute(
      "data-theme",
      theme
    );

    localStorage.setItem(
      "messmate-theme",
      theme
    );
  }, [theme]);

  /*
   * Persist navigation so the static site behaves like an app.
   * A menu session is restored as the current automatic menu, not
   * the old manually selected meal.
   */
  useEffect(() => {
    localStorage.setItem(
      "messmate-last-screen",
      screen
    );
  }, [screen]);

  useEffect(() => {
    localStorage.setItem(
      "messmate-last-mess-type",
      messType
    );
  }, [messType]);

  useEffect(() => {
    if (!manualSelection) {
      const automaticMeal = getAutomaticMeal();

      let targetDate = new Date();

      if (automaticMeal.dateOffset === 1) {
        targetDate.setDate(
          targetDate.getDate() + 1
        );
      }

      setSelectedDate(getDateString(targetDate));
      setSelectedMeal(automaticMeal.meal);
    }
  }, [currentTime, manualSelection]);

  const toggleTheme = () => {
    setTheme((currentTheme) =>
      currentTheme === "light"
        ? "dark"
        : "light"
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

  const goBackToHostel = () => {
    localStorage.setItem(
      "messmate-last-screen",
      "hostel"
    );
    setScreen("hostel");
  };

  const goBackToMessSelection = () => {
    localStorage.setItem(
      "messmate-last-screen",
      "mess"
    );
    setScreen("mess");
  };

  const selectMess = (type) => {
    setMessType(type);

    const automatic = getAutomaticMeal();

    setSelectedDate(getAutomaticDate());
    setSelectedMeal(automatic.meal);
    setManualSelection(false);

    localStorage.setItem(
      "messmate-last-mess-type",
      type
    );
    localStorage.setItem(
      "messmate-last-screen",
      "menu"
    );

    setScreen("menu");
  };

  const goToAutomaticMenu = () => {
    const automatic = getAutomaticMeal();

    setSelectedDate(getAutomaticDate());
    setSelectedMeal(automatic.meal);
    setManualSelection(false);
  };

  const selectDate = (date) => {
    setSelectedDate(date);
    setManualSelection(true);
  };

  const goToPreviousDate = () => {
    setSelectedDate((currentDate) =>
      getPreviousDate(currentDate)
    );

    setManualSelection(true);
  };

  const goToNextDate = () => {
    setSelectedDate((currentDate) =>
      getNextDate(currentDate)
    );

    setManualSelection(true);
  };

  const selectMealManually = (meal) => {
    setSelectedMeal(meal);
    setManualSelection(true);
  };

  const getStatusText = () => {
    if (manualSelection) {
      return "MANUAL VIEW";
    }

    if (automaticMeal.status === "upNext") {
      return "UP NEXT";
    }

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
      <div className="app">
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
                onClick={() => setScreen("mess")}
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
                disabled
              >
                <div className="hostel-icon">
                  🏡
                </div>

                <div className="hostel-card-content">
                  <span className="card-eyebrow">
                    COMING SOON
                  </span>

                  <h2>Women's Hostel</h2>

                  <p>
                    Menu will be available soon
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
      <div className="app">
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
              MEN'S HOSTEL
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
    <div className="app">
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
          </div>
        </div>

        <div className="header-actions">
          <div className="header-mess">
            {messType === "veg_non_veg"
              ? "Veg / Non-Veg"
              : "Special Mess"}
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