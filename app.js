/**
 * ==========================================================================
 * ОСНОВНАЯ ЛОГИКА ИГРЫ: ВИКТОРИНА «ДЕНЬ РОЖДЕНИЯ ИНТЕРНЕТА»
 * ==========================================================================
 */

class QuizApp {
  constructor() {
    this.storageKey = "web_birthday_quiz_state_v2";
    this.state = this.loadState();

    // Итоговые метрики считаем из самих данных, чтобы шкала не расходилась с вопросами
    this.totalQuestions = QUIZ_DATA.reduce((sum, cat) => sum + cat.questions.length, 0);
    this.maxScore = QUIZ_DATA.reduce(
      (sum, cat) => sum + cat.questions.reduce((catSum, q) => catSum + q.points, 0),
      0
    );
    this.expertMax = QUIZ_DATA.reduce(
      (sum, cat) => sum + cat.questions.reduce((catSum, q) => catSum + (q.level >= 5 ? q.points : 0), 0),
      0
    );

    // DOM Элементы
    this.dom = {
      scoreCounter: document.getElementById("score-counter"),
      progressCounter: document.getElementById("progress-counter"),
      progressBarFill: document.getElementById("progress-bar-fill"),
      soundCheckboxes: document.querySelectorAll(".sound-checkbox"),
      btnHelp: document.getElementById("btn-help"),
      btnReset: document.getElementById("btn-reset"),
      gridContainer: document.getElementById("grid-container"),
      mobileCategoryTabs: document.getElementById("mobile-category-tabs"),
      brandLogo: document.getElementById("brand-logo"),

      // Модалки
      modalIntro: document.getElementById("modal-intro"),
      btnStartGame: document.getElementById("btn-start-game"),
      btnResumeGame: document.getElementById("btn-resume-game"),
      btnIntroReset: document.getElementById("btn-intro-reset"),
      introResumeContainer: document.getElementById("intro-resume-container"),
      resumeScoreVal: document.getElementById("resume-score-val"),

      modalQuestion: document.getElementById("modal-question"),
      btnCloseQuestion: document.getElementById("btn-close-question"),
      qCategoryIcon: document.getElementById("q-category-icon"),
      qCategoryName: document.getElementById("q-category-name"),
      qDiffBadge: document.getElementById("q-diff-badge"),
      qPointsBadge: document.getElementById("q-points-badge"),
      qMetaCounter: document.getElementById("q-meta-counter"),
      questionText: document.getElementById("question-text"),
      optionsGrid: document.getElementById("options-grid"),
      explanationContainer: document.getElementById("explanation-container"),
      expHeader: document.getElementById("exp-status-header"),
      expIconBox: document.getElementById("exp-icon-box"),
      expStatusText: document.getElementById("exp-status-text"),
      expFactText: document.getElementById("exp-fact-text"),
      btnNextQuestion: document.getElementById("btn-next-question"),

      modalResults: document.getElementById("modal-results"),
      rankHeroCard: document.getElementById("rank-hero-card"),
      rankLargeIcon: document.getElementById("rank-large-icon"),
      rankName: document.getElementById("rank-name"),
      rankDesc: document.getElementById("rank-desc"),
      resScoreVal: document.getElementById("res-score-val"),
      resAccuracyVal: document.getElementById("res-accuracy-val"),
      resCorrectCount: document.getElementById("res-correct-count"),
      resWrongCount: document.getElementById("res-wrong-count"),
      resExpertPoints: document.getElementById("res-expert-points"),
      resTimePlayed: document.getElementById("res-time-played"),
      catBreakdownList: document.getElementById("cat-breakdown-list"),
      btnShareResult: document.getElementById("btn-share-result"),
      btnReviewBoard: document.getElementById("btn-review-board"),
      btnPlayAgain: document.getElementById("btn-play-again"),

      modalConfirmReset: document.getElementById("modal-confirm-reset"),
      btnConfirmCancel: document.getElementById("btn-confirm-cancel"),
      btnConfirmOk: document.getElementById("btn-confirm-ok"),

      toast: document.getElementById("toast"),
      toastMessage: document.getElementById("toast-message"),

      // Прелоадер
      preloader: document.getElementById("page-preloader"),
      preloaderProgressBar: document.getElementById("preloader-progress-bar"),
      preloaderTimer: document.getElementById("preloader-timer"),
      btnSkipPreloader: document.getElementById("btn-skip-preloader"),
      btnThemeToggle: document.getElementById("btn-theme-toggle")
    };

    this.currentQuestionData = null;
    this.currentQuestionCategory = null;
    this.currentQuestionIndex = null;
    this.activeMobileCategory = 0; // 0..4

    this.init();
  }

  // Загрузка состояния из LocalStorage
  loadState() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn("Error reading localStorage:", e);
    }

    return {
      score: 0,
      answered: {}, // { "c0_q0": { answered: true, isCorrect: true, selectedIdx: 0, points: 1, shuffled: [0,2,1,3] } }
      startTime: Date.now(),
      endTime: null,
      introSeen: false,
      theme: "dark"
    };
  }

  // Сохранение состояния
  saveState() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.state));
    } catch (e) {
      console.warn("Error saving localStorage:", e);
    }
  }

  // Сброс состояния
  resetState() {
    this.state = {
      score: 0,
      answered: {},
      startTime: Date.now(),
      endTime: null,
      introSeen: true,
      theme: this.state.theme || "dark"
    };
    this.saveState();
    this.updateHeaderUI();
    this.renderBoard();
    this.renderMobileTabs();
    this.showToast("Прогресс викторины успешно сброшен!", "🔄");
  }

  init() {
    // Инициализация фонового холста
    this.initBackgroundCanvas();

    // Отрисовка интерфейса
    this.renderBoard();
    this.renderMobileTabs();
    this.updateHeaderUI();
    this.updateSoundToggleUI();
    this.initTheme();

    // Привязка обработчиков событий
    this.bindEvents();

    // Проверка вступительного экрана
    const answeredCount = Object.keys(this.state.answered).length;
    if (answeredCount > 0 && !this.isGameOver()) {
      // Есть прогресс
      this.dom.introResumeContainer.classList.remove("hidden");
      this.dom.resumeScoreVal.textContent = this.state.score;
      this.openModal(this.dom.modalIntro);
    } else if (this.isGameOver()) {
      // Игра уже завершена
      this.closeModal(this.dom.modalIntro);
      this.showResults();
    } else {
      // Новая игра
      this.openModal(this.dom.modalIntro);
    }

    // Проверка адаптивности
    this.handleResize();
    window.addEventListener("resize", () => this.handleResize());

    // Инициализация прелоадера (20 секунд)
    this.initPreloader();
  }

  // Применение темы (без анимации — при загрузке)
  initTheme() {
    this.applyTheme(this.state.theme === "light" ? "light" : "dark");
  }

  applyTheme(theme) {
    const isLight = theme === "light";
    document.body.classList.toggle("light-theme", isLight);

    const btn = this.dom.btnThemeToggle;
    btn.querySelector(".theme-icon").textContent = isLight ? "☀️" : "🌙";
    btn.setAttribute("aria-pressed", String(isLight));
    btn.setAttribute("aria-label", isLight ? "Включить тёмную тему" : "Включить светлую тему");
    btn.title = isLight ? "Переключить на тёмную тему" : "Переключить на светлую тему";

    // Цвет системной панели браузера на мобильных
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", isLight ? "#e8edf8" : "#080b12");
  }

  // Переключение темы
  toggleTheme() {
    this.state.theme = this.state.theme === "light" ? "dark" : "light";
    this.saveState();

    // Плавный переход цветов (класс снимается через 400 мс)
    document.body.classList.add("theme-switching");
    this.applyTheme(this.state.theme);
    clearTimeout(this._themeTimer);
    this._themeTimer = setTimeout(() => {
      document.body.classList.remove("theme-switching");
    }, 400);
  }

  // ========================================================================
  // ПРЕЛОАДЕР (20 СЕКУНД)
  // ========================================================================

  initPreloader() {
    const preloader = this.dom.preloader;
    if (!preloader) return;

    const duration = 20000; // 20 секунд
    const startTime = Date.now();
    const timerEl = this.dom.preloaderTimer;
    const progressEl = this.dom.preloaderProgressBar;
    const skipBtn = this.dom.btnSkipPreloader;

    let preloaderFinished = false;

    const finishPreloader = () => {
      if (preloaderFinished) return;
      preloaderFinished = true;
      preloader.classList.add("fade-out");
      setTimeout(() => {
        if (preloader.parentNode) {
          preloader.parentNode.removeChild(preloader);
        }
      }, 850);
    };

    if (skipBtn) {
      skipBtn.addEventListener("click", () => {
        if (window.sound) window.sound.playClick();
        finishPreloader();
      });
    }

    const interval = setInterval(() => {
      if (preloaderFinished) {
        clearInterval(interval);
        return;
      }
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / duration);
      const remainingSeconds = Math.max(0, Math.ceil((duration - elapsed) / 1000));

      if (progressEl) {
        progressEl.style.width = `${progress * 100}%`;
      }
      if (timerEl) {
        timerEl.textContent = remainingSeconds;
      }

      if (elapsed >= duration) {
        clearInterval(interval);
        finishPreloader();
      }
    }, 100);
  }
  // ОБРАБОТЧИКИ СОБЫТИЙ
  // ========================================================================

  bindEvents() {
    // Пиксельный переключатель звука (синхронизация чекбоксов в шапке и модалке)
    const soundCheckboxes = document.querySelectorAll(".sound-checkbox");
    soundCheckboxes.forEach((cb) => {
      cb.addEventListener("change", (e) => {
        const shouldBeMuted = !e.target.checked;
        if (window.sound.isMuted() !== shouldBeMuted) {
          window.sound.toggleMute();
        }
        this.updateSoundToggleUI();
        this.showToast(shouldBeMuted ? "Звук выключен 🔇" : "Звук включен 🔊", shouldBeMuted ? "🔇" : "🔊");
      });
    });

    // Переключатель темы
    this.dom.btnThemeToggle.addEventListener("click", () => {
      window.sound.playClick();
      this.toggleTheme();
    });

    // Инфо / Правила
    this.dom.btnHelp.addEventListener("click", () => {
      window.sound.playClick();
      this.openModal(this.dom.modalIntro);
    });

    this.dom.brandLogo.addEventListener("click", () => {
      window.sound.playClick();
      this.openModal(this.dom.modalIntro);
    });

    // Сброс игры
    this.dom.btnReset.addEventListener("click", () => {
      window.sound.playClick();
      this.openModal(this.dom.modalConfirmReset);
    });

    this.dom.btnConfirmCancel.addEventListener("click", () => {
      window.sound.playClick();
      this.closeModal(this.dom.modalConfirmReset);
    });

    this.dom.btnConfirmOk.addEventListener("click", () => {
      window.sound.playClick();
      this.closeModal(this.dom.modalConfirmReset);
      this.resetState();
    });

    // Кнопки экрана приветствия
    this.dom.btnStartGame.addEventListener("click", () => {
      window.sound.playClick();
      this.state.introSeen = true;
      this.saveState();
      this.closeModal(this.dom.modalIntro);
    });

    this.dom.btnResumeGame.addEventListener("click", () => {
      window.sound.playClick();
      this.closeModal(this.dom.modalIntro);
    });

    this.dom.btnIntroReset.addEventListener("click", () => {
      window.sound.playClick();
      this.resetState();
      this.dom.introResumeContainer.classList.add("hidden");
    });

    // Модалка вопроса
    this.dom.btnCloseQuestion.addEventListener("click", () => {
      window.sound.playClick();
      this.closeModal(this.dom.modalQuestion);
    });

    this.dom.btnNextQuestion.addEventListener("click", () => {
      window.sound.playClick();
      this.closeModal(this.dom.modalQuestion);
      // Проверка, завершена ли вся игра
      if (this.isGameOver()) {
        setTimeout(() => this.showResults(), 350);
      }
    });

    // Экран результатов
    this.dom.btnShareResult.addEventListener("click", () => {
      window.sound.playClick();
      this.shareResult();
    });

    this.dom.btnReviewBoard.addEventListener("click", () => {
      window.sound.playClick();
      this.closeModal(this.dom.modalResults);
    });

    this.dom.btnPlayAgain.addEventListener("click", () => {
      window.sound.playClick();
      this.closeModal(this.dom.modalResults);
      this.resetState();
    });

    // Клик по шапке для повторного просмотра результатов если завершено
    const scorePill = document.querySelector(".score-pill");
    if (scorePill) {
      scorePill.addEventListener("click", () => {
        if (this.isGameOver()) {
          window.sound.playClick();
          this.showResults();
        }
      });
      scorePill.style.cursor = "pointer";
    }

    // Клавиатурные шорткаты: 1..4, A..D, Enter, Esc
    window.addEventListener("keydown", (e) => {
      // Если открыто окно вопроса
      if (this.dom.modalQuestion.classList.contains("active")) {
        // Esc закрывает окно
        if (e.key === "Escape") {
          this.closeModal(this.dom.modalQuestion);
          return;
        }

        // Если показано объяснение, Enter или Space жмет кнопку "Далее"
        if (!this.dom.explanationContainer.classList.contains("hidden")) {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            this.dom.btnNextQuestion.click();
            return;
          }
        } else {
          // Выбор варианта клавишами 1-4 или A-D
          const key = e.key.toUpperCase();
          const keyMap = { "1": 0, "2": 1, "3": 2, "4": 3, "A": 0, "B": 1, "C": 2, "D": 3, "Ф": 0, "И": 1, "С": 2, "В": 3 };
          if (keyMap[key] !== undefined) {
            const btns = this.dom.optionsGrid.querySelectorAll(".option-btn");
            if (btns[keyMap[key]] && !btns[keyMap[key]].disabled) {
              btns[keyMap[key]].click();
            }
          }
        }
      } else if (this.dom.modalIntro.classList.contains("active")) {
        if (e.key === "Enter" || e.key === " ") {
          this.dom.btnStartGame.click();
        }
      } else if (this.dom.modalResults.classList.contains("active")) {
        if (e.key === "Escape") {
          this.closeModal(this.dom.modalResults);
        }
      }
    });
  }

  // ========================================================================
  // ОТРИСОВКА ИГРОВОГО ТАБЛО (СЕТКА 5×7)
  // ========================================================================

  renderBoard() {
    this.dom.gridContainer.innerHTML = "";

    QUIZ_DATA.forEach((categoryData, catIdx) => {
      const col = document.createElement("div");
      col.className = `category-column ${catIdx === this.activeMobileCategory ? "active-mobile-col" : ""}`;
      col.dataset.catIndex = catIdx;

      // Считаем прогресс по категории
      let catAnsweredCount = 0;
      categoryData.questions.forEach((q) => {
        if (this.state.answered[q.id]) {
          catAnsweredCount++;
        }
      });

      // Шапка категории
      const headerCard = document.createElement("div");
      headerCard.className = "category-header-card glass-card";
      headerCard.style.borderTopColor = categoryData.accentColor;

      headerCard.innerHTML = `
        <div class="cat-icon-large">${categoryData.icon}</div>
        <h3 class="cat-title-text">${categoryData.category}</h3>
        <span class="cat-progress-badge" id="cat-badge-${catIdx}">${catAnsweredCount} / ${categoryData.questions.length}</span>
      `;
      col.appendChild(headerCard);

      // Список плиток вопросов
      const tilesList = document.createElement("div");
      tilesList.className = "category-tiles-list";

      categoryData.questions.forEach((question, qIdx) => {
        const isAnswered = !!this.state.answered[question.id];
        const answerInfo = this.state.answered[question.id];
        const diffConfig = DIFFICULTY_CONFIG[question.difficulty] || DIFFICULTY_CONFIG.easy;

        const tile = document.createElement("button");
        tile.className = "quiz-tile";
        tile.type = "button";
        tile.dataset.qId = question.id;
        tile.dataset.catIdx = catIdx;
        tile.dataset.qIdx = qIdx;
        tile.dataset.diff = question.difficulty;

        let statusIconHTML = "";
        if (isAnswered) {
          tile.classList.add("played");
          if (answerInfo.isCorrect) {
            tile.classList.add("correct");
            statusIconHTML = `<div class="tile-status-icon" title="Верно: +${answerInfo.points} б.">✓</div>`;
          } else {
            tile.classList.add("wrong");
            statusIconHTML = `<div class="tile-status-icon" title="Неверно (0 б.)">✕</div>`;
          }
        }

        tile.innerHTML = `
          <div class="tile-left">
            <span class="tile-lvl-label">УРОВЕНЬ ${question.level}</span>
            <span class="tile-diff-pill">${diffConfig.label}</span>
          </div>
          <div class="tile-right">
            <span class="tile-points-number">${isAnswered && !answerInfo.isCorrect ? '0' : question.points}</span>
            <span class="tile-points-suffix">б.</span>
            ${statusIconHTML}
          </div>
        `;

        tile.addEventListener("mouseenter", () => {
          if (!tile.classList.contains("played")) {
            window.sound.playHover();
          }
        });

        tile.addEventListener("click", () => {
          this.openQuestion(catIdx, qIdx);
        });

        tilesList.appendChild(tile);
      });

      col.appendChild(tilesList);
      this.dom.gridContainer.appendChild(col);
    });
  }

  // Отрисовка мобильных табов
  renderMobileTabs() {
    this.dom.mobileCategoryTabs.innerHTML = "";

    QUIZ_DATA.forEach((categoryData, catIdx) => {
      const tab = document.createElement("button");
      tab.className = `mobile-tab-btn ${catIdx === this.activeMobileCategory ? "active" : ""}`;
      tab.type = "button";
      tab.innerHTML = `<span>${categoryData.icon}</span> <span>${categoryData.category}</span>`;

      tab.addEventListener("click", () => {
        window.sound.playClick();
        this.activeMobileCategory = catIdx;
        this.updateMobileActiveCategory();
      });

      this.dom.mobileCategoryTabs.appendChild(tab);
    });
  }

  updateMobileActiveCategory() {
    const tabs = this.dom.mobileCategoryTabs.querySelectorAll(".mobile-tab-btn");
    tabs.forEach((tab, idx) => {
      tab.classList.toggle("active", idx === this.activeMobileCategory);
    });

    const columns = this.dom.gridContainer.querySelectorAll(".category-column");
    columns.forEach((col, idx) => {
      col.classList.toggle("active-mobile-col", idx === this.activeMobileCategory);
    });
  }

  handleResize() {
    if (window.innerWidth <= 992) {
      this.dom.gridContainer.classList.add("mobile-mode");
      this.updateMobileActiveCategory();
    } else {
      this.dom.gridContainer.classList.remove("mobile-mode");
      const columns = this.dom.gridContainer.querySelectorAll(".category-column");
      columns.forEach((col) => col.classList.remove("active-mobile-col"));
    }
  }

  // ========================================================================
  // МОДАЛЬНОЕ ОКНО ВОПРОСА
  // ========================================================================

  openQuestion(catIdx, qIdx) {
    const category = QUIZ_DATA[catIdx];
    const question = category.questions[qIdx];
    const isAnswered = !!this.state.answered[question.id];
    const answerInfo = this.state.answered[question.id];
    const diffConfig = DIFFICULTY_CONFIG[question.difficulty] || DIFFICULTY_CONFIG.easy;

    this.currentQuestionCategory = catIdx;
    this.currentQuestionIndex = qIdx;
    this.currentQuestionData = question;

    window.sound.playOpenQuestion();

    // Заполнение метаданных вопроса
    this.dom.qCategoryIcon.textContent = category.icon;
    this.dom.qCategoryName.textContent = category.category;
    this.dom.qDiffBadge.textContent = `${diffConfig.badgeIcon} ${diffConfig.label}`;
    this.dom.qDiffBadge.style.color = diffConfig.color;
    this.dom.qPointsBadge.textContent = `+${question.points} ${this.getPointsWord(question.points)}`;
    this.dom.qMetaCounter.textContent = `Уровень ${question.level} из ${category.questions.length} • Вопрос №${catIdx * category.questions.length + qIdx + 1}`;
    this.dom.questionText.textContent = question.question;

    // Скрываем блок пояснения по умолчанию
    this.dom.explanationContainer.classList.add("hidden");
    this.dom.optionsGrid.innerHTML = "";

    // Генерация порядка вариантов (рандомизация с сохранением)
    let shuffledIndices = [];
    if (isAnswered && answerInfo.shuffled) {
      shuffledIndices = answerInfo.shuffled;
    } else {
      // Перемешиваем индексы 0, 1, 2, 3 так, чтобы правильный ответ не был всегда первым
      shuffledIndices = [0, 1, 2, 3];
      for (let i = shuffledIndices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledIndices[i], shuffledIndices[j]] = [shuffledIndices[j], shuffledIndices[i]];
      }
      // Временно запоминаем порядок
      question._currentShuffled = shuffledIndices;
    }

    const letters = ["A", "B", "C", "D"];

    shuffledIndices.forEach((origIdx, pos) => {
      const optText = question.options[origIdx];
      const btn = document.createElement("button");
      btn.className = "option-btn";
      btn.type = "button";
      btn.dataset.origIndex = origIdx;
      btn.dataset.pos = pos;

      btn.innerHTML = `
        <span class="option-key">${letters[pos]}</span>
        <span class="option-text">${optText}</span>
        <span class="option-status-marker">✓</span>
      `;

      // Если вопрос уже был отвечен ранее (режим просмотра)
      if (isAnswered) {
        btn.disabled = true;
        if (origIdx === question.correct) {
          btn.classList.add("correct-choice");
          btn.querySelector(".option-status-marker").textContent = "✓";
        }
        if (origIdx === answerInfo.selectedIdx && !answerInfo.isCorrect) {
          btn.classList.add("wrong-choice");
          btn.querySelector(".option-status-marker").textContent = "✕";
        }
      } else {
        btn.addEventListener("click", () => {
          this.handleAnswer(btn, origIdx, shuffledIndices);
        });
      }

      this.dom.optionsGrid.appendChild(btn);
    });

    // Если вопрос уже был отвечен ранее, сразу показываем факт
    if (isAnswered) {
      this.showExplanation(answerInfo.isCorrect, question.explanation, question.points);
    }

    this.openModal(this.dom.modalQuestion);
  }

  // Обработка выбора ответа
  handleAnswer(selectedBtn, chosenOrigIdx, shuffledIndices) {
    const question = this.currentQuestionData;
    const isCorrect = chosenOrigIdx === question.correct;
    const pointsEarned = isCorrect ? question.points : 0;

    // Блокируем все варианты
    const allBtns = this.dom.optionsGrid.querySelectorAll(".option-btn");
    allBtns.forEach((btn) => (btn.disabled = true));

    // Подсветка выбранного варианта
    if (isCorrect) {
      selectedBtn.classList.add("correct-choice");
      selectedBtn.querySelector(".option-status-marker").textContent = "✓";
      window.sound.playCorrect();

      // Мини-взрыв конфетти
      const rect = selectedBtn.getBoundingClientRect();
      window.confetti.burst(rect.left + rect.width / 2, rect.top + rect.height / 2, 35);
    } else {
      selectedBtn.classList.add("wrong-choice");
      selectedBtn.querySelector(".option-status-marker").textContent = "✕";
      window.sound.playWrong();

      // Подсвечиваем верный вариант для обучения
      allBtns.forEach((btn) => {
        if (parseInt(btn.dataset.origIndex, 10) === question.correct) {
          btn.classList.add("correct-choice");
          btn.querySelector(".option-status-marker").textContent = "✓";
        }
      });
    }

    // Обновляем состояние игры
    this.state.score += pointsEarned;
    this.state.answered[question.id] = {
      answered: true,
      isCorrect,
      selectedIdx: chosenOrigIdx,
      points: pointsEarned,
      shuffled: shuffledIndices
    };

    if (this.isGameOver() && !this.state.endTime) {
      this.state.endTime = Date.now();
    }

    this.saveState();

    // Обновляем UI шапки и плитку на поле
    this.updateHeaderUI();
    this.updateTileUI(question.id, isCorrect, pointsEarned);

    // Показываем блок пояснения
    setTimeout(() => {
      this.showExplanation(isCorrect, question.explanation, pointsEarned);
    }, 280);
  }

  // Отображение пояснения к вопросу
  showExplanation(isCorrect, explanation, points) {
    this.dom.expHeader.className = `exp-header ${isCorrect ? "correct" : "wrong"}`;
    this.dom.expIconBox.textContent = isCorrect ? "✓" : "✕";
    this.dom.expStatusText.textContent = isCorrect 
      ? `ВЕРНО! +${points} ${this.getPointsWord(points)} В КОПИЛКУ 🎉` 
      : `НЕВЕРНО! ПРАВИЛЬНЫЙ ОТВЕТ ПОДСВЕЧЕН ЗЕЛЁНЫМ 💡`;

    this.dom.expFactText.textContent = explanation;
    this.dom.explanationContainer.classList.remove("hidden");
  }

  // Обновление состояния плитки на поле после ответа
  updateTileUI(questionId, isCorrect, points) {
    const tile = document.querySelector(`.quiz-tile[data-q-id="${questionId}"]`);
    if (tile) {
      tile.classList.add("played");
      tile.classList.add(isCorrect ? "correct" : "wrong");

      const rightDiv = tile.querySelector(".tile-right");
      if (rightDiv) {
        const numSpan = rightDiv.querySelector(".tile-points-number");
        if (numSpan && !isCorrect) {
          numSpan.textContent = "0";
        }
        // Добавляем иконку статуса
        const existingIcon = rightDiv.querySelector(".tile-status-icon");
        if (!existingIcon) {
          const icon = document.createElement("div");
          icon.className = "tile-status-icon";
          icon.textContent = isCorrect ? "✓" : "✕";
          rightDiv.appendChild(icon);
        }
      }
    }

    // Обновляем счётчик в шапке колонки
    if (this.currentQuestionCategory !== null) {
      const badge = document.getElementById(`cat-badge-${this.currentQuestionCategory}`);
      if (badge) {
        const catQuestions = QUIZ_DATA[this.currentQuestionCategory].questions;
        let answeredInCat = 0;
        catQuestions.forEach((q) => {
          if (this.state.answered[q.id]) answeredInCat++;
        });
        badge.textContent = `${answeredInCat} / ${catQuestions.length}`;
      }
    }
  }

  // ========================================================================
  // ОБНОВЛЕНИЕ UI ШАПКИ И МЕТРИК
  // ========================================================================

  updateHeaderUI() {
    const currentScore = this.state.score;
    const answeredCount = Object.keys(this.state.answered).length;
    const totalQuestions = this.totalQuestions;

    // Анимированный счётчик
    this.animateCounter(this.dom.scoreCounter, currentScore);

    // Прогресс
    this.dom.progressCounter.textContent = answeredCount;
    const percent = Math.round((answeredCount / totalQuestions) * 100);
    this.dom.progressBarFill.style.width = `${percent}%`;
  }

  animateCounter(element, targetValue) {
    const currentValue = parseInt(element.textContent, 10) || 0;
    if (currentValue === targetValue) return;

    const diff = targetValue - currentValue;
    const duration = 600;
    const startTime = performance.now();

    const updateStep = (time) => {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out quad
      const easeProgress = 1 - (1 - progress) * (1 - progress);
      const val = Math.round(currentValue + diff * easeProgress);

      element.textContent = val;

      if (progress < 1) {
        requestAnimationFrame(updateStep);
      } else {
        element.textContent = targetValue;
      }
    };

    requestAnimationFrame(updateStep);
  }

  updateSoundToggleUI() {
    const isMuted = window.sound.isMuted();
    const soundCheckboxes = document.querySelectorAll(".sound-checkbox");
    soundCheckboxes.forEach((cb) => {
      cb.checked = !isMuted;
    });
  }

  isGameOver() {
    return Object.keys(this.state.answered).length >= this.totalQuestions;
  }

  // ========================================================================
  // ЭКРАН РЕЗУЛЬТАТОВ (GAME OVER)
  // ========================================================================

  showResults() {
    const totalScore = this.state.score;
    const totalQuestions = this.totalQuestions;
    let correctCount = 0;
    let wrongCount = 0;
    let expertPoints = 0;

    // Очки по категориям
    const catScores = [0, 0, 0, 0, 0];

    QUIZ_DATA.forEach((cat, cIdx) => {
      cat.questions.forEach((q) => {
        const ans = this.state.answered[q.id];
        if (ans) {
          if (ans.isCorrect) {
            correctCount++;
            catScores[cIdx] += q.points;
            if (q.level >= 5) {
              expertPoints += q.points;
            }
          } else {
            wrongCount++;
          }
        }
      });
    });

    const accuracy = Math.round((correctCount / totalQuestions) * 100) || 0;

    // Определяем звание
    const rank = this.getRankByScore(totalScore);

    // Заполняем данные модалки
    this.dom.rankHeroCard.style.borderColor = rank.color;
    this.dom.rankLargeIcon.textContent = rank.icon;
    this.dom.rankName.textContent = rank.title;
    this.dom.rankDesc.textContent = rank.desc;

    this.dom.resScoreVal.textContent = totalScore;
    this.dom.resAccuracyVal.textContent = `${accuracy}%`;
    this.dom.resCorrectCount.textContent = `${correctCount} / ${totalQuestions}`;
    this.dom.resWrongCount.textContent = wrongCount;
    this.dom.resExpertPoints.textContent = `${expertPoints} / ${this.expertMax}`;

    // Расчет времени
    const durationMs = (this.state.endTime || Date.now()) - this.state.startTime;
    const minutes = Math.max(1, Math.round(durationMs / 60000));
    this.dom.resTimePlayed.textContent = `${minutes} мин`;

    // Рендерим полосы по категориям (максимум категории считается из данных)
    this.dom.catBreakdownList.innerHTML = "";
    QUIZ_DATA.forEach((cat, cIdx) => {
      const score = catScores[cIdx];
      const maxCatScore = cat.questions.reduce((sum, q) => sum + q.points, 0);
      const catPercent = Math.round((score / maxCatScore) * 100);

      const item = document.createElement("div");
      item.className = "cat-bar-item";
      item.innerHTML = `
        <div class="cat-bar-header">
          <span class="cat-bar-name">${cat.icon} ${cat.category}</span>
          <span class="cat-bar-pts">${score} / ${maxCatScore} б.</span>
        </div>
        <div class="cat-bar-track">
          <div class="cat-bar-fill" style="width: ${catPercent}%; background: linear-gradient(90deg, ${cat.accentColor}, var(--neon-green));"></div>
        </div>
      `;
      this.dom.catBreakdownList.appendChild(item);
    });

    // Открываем модалку результатов
    this.openModal(this.dom.modalResults);

    // Запускаем праздничные фанфары и салют
    setTimeout(() => {
      window.sound.playFanfare();
      window.confetti.celebrate(4500);
    }, 250);
  }

  getRankByScore(score) {
    for (const r of RANKS) {
      if (score >= r.min && score <= r.max) {
        return r;
      }
    }
    return RANKS[RANKS.length - 1];
  }

  // Поделиться результатами
  shareResult() {
    const totalScore = this.state.score;
    const rank = this.getRankByScore(totalScore);
    let correctCount = 0;
    Object.values(this.state.answered).forEach((ans) => {
      if (ans.isCorrect) correctCount++;
    });
    const accuracy = Math.round((correctCount / this.totalQuestions) * 100);

    const shareText = 
`🌐 Мой результат в викторине «День рождения Интернета»:
${rank.icon} Звание: «${rank.title}»
⚡ Набрано баллов: ${totalScore} из ${this.maxScore}
🎯 Точность ответов: ${accuracy}% (${correctCount}/${this.totalQuestions} верных)

Проверь свою цифровую эрудицию и попробуй превзойти мой рекорд! 🎉`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(shareText)
        .then(() => {
          this.showToast("Результат скопирован в буфер обмена!", "📋");
        })
        .catch(() => {
          this.fallbackCopyText(shareText);
        });
    } else {
      this.fallbackCopyText(shareText);
    }
  }

  fallbackCopyText(text) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand("copy");
      this.showToast("Результат скопирован в буфер обмена!", "📋");
    } catch (e) {
      this.showToast("Не удалось скопировать текст", "⚠️");
    }
    document.body.removeChild(textarea);
  }

  // ========================================================================
  // УПРАВЛЕНИЕ МОДАЛЬНЫМИ ОКНАМИ
  // ========================================================================

  openModal(modal) {
    if (!modal) return;
    modal.classList.add("active");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  closeModal(modal) {
    if (!modal) return;
    modal.classList.remove("active");
    modal.setAttribute("aria-hidden", "true");
    // Если других открытых модалок нет, возвращаем скролл
    const activeModals = document.querySelectorAll(".modal-backdrop.active");
    if (activeModals.length === 0) {
      document.body.style.overflow = "";
    }
  }

  // Всплывающее уведомление (Toast)
  showToast(message, icon = "✨") {
    if (!this.dom.toast) return;
    this.dom.toastMessage.textContent = message;
    const iconEl = document.getElementById("toast-icon");
    if (iconEl) iconEl.textContent = icon;

    this.dom.toast.classList.add("show");
    if (this._toastTimer) clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      this.dom.toast.classList.remove("show");
    }, 3200);
  }

  // Склонение слова "балл"
  getPointsWord(n) {
    if (n % 10 === 1 && n % 100 !== 11) return "балл";
    if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) return "балла";
    return "баллов";
  }

  // ========================================================================
  // ФОНОВЫЙ ХОЛСТ: ЖИВАЯ КИБЕР-СЕТЬ И ЧАСТИЦЫ
  // ========================================================================

  initBackgroundCanvas() {
    const canvas = document.getElementById("bg-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    window.addEventListener("resize", () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    });

    const nodeCount = Math.min(45, Math.floor((width * height) / 28000));
    const nodes = [];

    for (let i = 0; i < nodeCount; i++) {
      nodes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45,
        radius: Math.random() * 2 + 1,
        color: Math.random() > 0.5 ? 0 : 1
      });
    }

    let isVisible = true;
    document.addEventListener("visibilitychange", () => {
      isVisible = !document.hidden;
    });

    const render = () => {
      if (isVisible) {
        const isLight = document.body.classList.contains("light-theme");
        ctx.clearRect(0, 0, width, height);

        // Соединительные линии
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            const dx = nodes[i].x - nodes[j].x;
            const dy = nodes[i].y - nodes[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const maxDist = 130;

            if (dist < maxDist) {
              const alpha = (1 - dist / maxDist) * 0.12;
              ctx.strokeStyle = isLight ? `rgba(0, 110, 140, ${alpha * 1.6})` : `rgba(0, 240, 255, ${alpha})`;
              ctx.lineWidth = 0.8;
              ctx.beginPath();
              ctx.moveTo(nodes[i].x, nodes[i].y);
              ctx.lineTo(nodes[j].x, nodes[j].y);
              ctx.stroke();
            }
          }
        }

        // Рисуем узлы
        for (let i = 0; i < nodes.length; i++) {
          const n = nodes[i];
          n.x += n.vx;
          n.y += n.vy;

          if (n.x < 0 || n.x > width) n.vx *= -1;
          if (n.y < 0 || n.y > height) n.vy *= -1;

          ctx.fillStyle = isLight
            ? (n.color === 0 ? "rgba(0, 110, 140, 0.45)" : "rgba(138, 31, 209, 0.4)")
            : (n.color === 0 ? "rgba(0, 240, 255, 0.5)" : "rgba(176, 38, 255, 0.5)");
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      requestAnimationFrame(render);
    };

    render();
  }
}

// Запуск приложения при загрузке документа
document.addEventListener("DOMContentLoaded", () => {
  window.quizApp = new QuizApp();
});
