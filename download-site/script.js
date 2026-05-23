(function () {
  "use strict";

  // Existing release contract data
  const RELEASE = {
    appName: "EatFitAI",
    version: "1.0.0",
    packageName: "com.eatfitai.app",
    releaseTag: "android-v1.0.0",
    fileName: "EatFitAI-android-v1.0.0.apk",
    fileSize: "152.96 MiB",
    sha256: "ee54bb43412b2be1c1df43a2c0f2da0282f7567c171a7c94d6f78d8935a638b5",
    downloadUrl:
      "https://github.com/anthonyconghieu/EatFitAI_v1/releases/download/android-v1.0.0/EatFitAI-android-v1.0.0.apk",
    releaseUrl: "",
    repositoryUrl: "",
  };

  const SHA256_PATTERN = /^[a-f0-9]{64}$/i;
  const isChecksumReady = SHA256_PATTERN.test(RELEASE.sha256);
  let isMochiTipDismissed = localStorage.getItem("mochiTipDismissed") === "true";

  // Helper selectors
  function setText(selector, value) {
    document.querySelectorAll(selector).forEach((element) => {
      element.textContent = value;
    });
  }

  function setHref(selector, value) {
    document.querySelectorAll(selector).forEach((element) => {
      element.setAttribute("href", value);
    });
  }

  function formatMochiText(text) {
    if (!text) return "";
    return text.replace(/(\S+)\s+(\S+)$/, '<span class="mochi-emoji-wrap">$1&nbsp;$2</span>');
  }

  // 1. Floating Header
  const siteHeader = document.getElementById("siteHeader");

  window.addEventListener("scroll", () => {
    // Sticky Header background morphing
    if (siteHeader) {
      if (window.scrollY > 50) {
        siteHeader.classList.add("scrolled");
      } else {
        siteHeader.classList.remove("scrolled");
      }
    }
  });

  // Mobile Menu Toggle (SPA Optimized)
  const menuToggle = document.getElementById("menuToggle");
  const navLinks = document.querySelector(".nav-links");
  if (menuToggle && navLinks) {
    const toggleMenu = (show) => {
      if (show) {
        navLinks.classList.add("mobile-open");
        menuToggle.classList.add("active");
      } else {
        navLinks.classList.remove("mobile-open");
        menuToggle.classList.remove("active");
      }
    };

    menuToggle.addEventListener("click", () => {
      const isVisible = navLinks.classList.contains("mobile-open");
      toggleMenu(!isVisible);
    });

    // Close menu when a link is clicked
    const links = navLinks.querySelectorAll("a");
    links.forEach(link => {
      link.addEventListener("click", () => {
        if (window.innerWidth <= 1024) {
          toggleMenu(false);
        }
      });
    });

    // Also close menu when action button (Tải APK) is clicked
    const actionBtn = document.querySelector(".nav-actions .btn-nav");
    if (actionBtn) {
      actionBtn.addEventListener("click", () => {
        if (window.innerWidth <= 1024) {
          toggleMenu(false);
        }
      });
    }

    // Also close menu when brand link is clicked
    const brandLink = document.querySelector(".brand");
    if (brandLink) {
      brandLink.addEventListener("click", () => {
        if (window.innerWidth <= 1024) {
          toggleMenu(false);
        }
      });
    }
  }

  // 1.5. SPA Page Switcher Logic
  const pageMap = {
    top: [".hero", ".stats-bar", ".bottom-cta-section"],
    features: ["#features", "#how"],
    simulator: ["#simulator"],
    tdee: ["#tdee"],
    showcase: ["#showcase"],
    faq: ["#faq"],
    download: ["#download", "#install"]
  };

  let isPageTransitioning = false;

  function resetPageScroll() {
    window.scrollTo({ top: 0, behavior: "instant" });
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "instant" });
    });
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "instant" });
    }, 80);
  }

  function switchPage(pageId) {
    if (!pageMap[pageId] || isPageTransitioning) return;

    // Đồng bộ URL hash để hỗ trợ deep linking và nút back/forward mà không reload trang
    const targetHash = pageId === "top" ? "#top" : "#" + pageId;
    if (window.location.hash !== targetHash) {
      history.pushState(null, null, targetHash);
    }

    // Get currently active sections
    const activeSections = Array.from(document.querySelectorAll(".spa-section.active-page"));

    // Get target sections to display
    const targetSelectors = pageMap[pageId];
    const targetSections = [];
    targetSelectors.forEach(sel => {
      const el = document.querySelector(sel);
      if (el) targetSections.push(el);
    });

    // If we're already on this page and nothing is active (like initial load), just show it instantly
    if (activeSections.length === 0) {
      const allSections = document.querySelectorAll(
        ".hero, .stats-bar, #simulator, #tdee, #features, #how, #showcase, #download, #install, #faq, .bottom-cta-section"
      );
      allSections.forEach(sec => {
        sec.classList.add("hidden-page");
        sec.classList.remove("exit-page", "active-page");
      });

      targetSections.forEach(sec => {
        sec.classList.remove("hidden-page", "exit-page");
      });
      if (targetSections.length > 0) {
        targetSections[0].offsetHeight; // Reflow
      }
      targetSections.forEach(sec => {
        sec.classList.add("active-page");
      });

      resetPageScroll();
      updateActiveNavLinks(pageId);

      // Khởi tạo quét AR khi người dùng truy cập trực tiếp qua deep link (#simulator) nhằm tránh lỗi hiển thị 0 KCAL do thiếu dữ liệu quét ban đầu
      if (pageId === "simulator") {
        const activeFoodBtn = document.querySelector(".food-btn.active");
        const key = activeFoodBtn ? activeFoodBtn.dataset.food : "pho";
        const data = SIMULATOR_DATABASE[key];
        if (data) {
          triggerARScan(data);
        }
      }

      updateMochiWidgetForPage(pageId);
      return;
    }

    isPageTransitioning = true;

    // Show curtain
    const curtain = document.getElementById("pageTransitionCurtain");
    if (curtain) {
      curtain.classList.add("active");
    }

    // Wait for curtain to fade-in (300ms)
    setTimeout(() => {
      // Hide all sections first
      const allSections = document.querySelectorAll(
        ".hero, .stats-bar, #simulator, #tdee, #features, #how, #showcase, #download, #install, #faq, .bottom-cta-section"
      );
      allSections.forEach(sec => {
        sec.classList.add("hidden-page");
        sec.classList.remove("exit-page", "active-page");
      });

      // Scroll window to top instantly
      resetPageScroll();

      // Show target sections
      targetSections.forEach(sec => {
        sec.classList.remove("hidden-page");
      });

      // Force reflow
      if (targetSections.length > 0) {
        targetSections[0].offsetHeight;
      }

      // Phase 3: Enter new sections
      targetSections.forEach(sec => {
        sec.classList.add("active-page");
      });

      // Update Nav active states
      updateActiveNavLinks(pageId);

      // Trigger AR Scan simulator if needed
      if (pageId === "simulator") {
        const activeFoodBtn = document.querySelector(".food-btn.active");
        const key = activeFoodBtn ? activeFoodBtn.dataset.food : "pho";
        const data = SIMULATOR_DATABASE[key];
        if (data) {
          triggerARScan(data);
        }
      }

      // Update MoChi assistant widget
      updateMochiWidgetForPage(pageId);

      // Brief delay before fading out curtain
      setTimeout(() => {
        if (curtain) {
          curtain.classList.remove("active");
        }
        isPageTransitioning = false;
      }, 200);
    }, 300);
  }

  function updateActiveNavLinks(pageId) {
    const navLinksList = document.querySelectorAll(".nav-links a");
    navLinksList.forEach(link => link.classList.remove("active"));

    const navActionsBtn = document.querySelector(".nav-actions .btn-nav");
    if (navActionsBtn) navActionsBtn.classList.remove("active");

    if (pageId === "top") {
      const link = document.querySelector('.nav-links a[href="#top"]');
      if (link) link.classList.add("active");
    } else if (pageId === "features") {
      const link = document.querySelector('.nav-links a[href="#features"]');
      if (link) link.classList.add("active");
    } else if (pageId === "simulator") {
      const link = document.querySelector('.nav-links a[href="#simulator"]');
      if (link) link.classList.add("active");
    } else if (pageId === "tdee") {
      const link = document.querySelector('.nav-links a[href="#tdee"]');
      if (link) link.classList.add("active");
    } else if (pageId === "showcase") {
      const link = document.querySelector('.nav-links a[href="#showcase"]');
      if (link) link.classList.add("active");
    } else if (pageId === "faq") {
      const link = document.querySelector('.nav-links a[href="#faq"]');
      if (link) link.classList.add("active");
    } else if (pageId === "download") {
      if (navActionsBtn) navActionsBtn.classList.add("active");
    }
  }

  function updateMochiWidgetForPage(pageId) {
    const widgetBubble = document.getElementById("mochiWidgetBubble");
    const widgetText = document.getElementById("mochiWidgetText");
    const widgetImg = document.getElementById("mochiWidgetImg");

    if (widgetBubble && widgetText && widgetImg) {
      const dismissed = localStorage.getItem("mochiTipDismissed") === "true";

      // Define page-specific messages and icons
      const pageWidgetConfig = {
        top: {
          text: "Chào bạn! Hãy khám phá các tính năng của EatFitAI cùng tớ nhé! 💚",
          img: "./assets/mochi/mochi-success.png"
        },
        features: {
          text: "EatFitAI hỗ trợ bạn ghi chép bữa ăn, tính toán calo và bảo mật tuyệt đối! 🛡️",
          img: "./assets/mochi/mochi-secure.png"
        },
        simulator: {
          text: "Nhấp chọn món ăn bên dưới để trải nghiệm công nghệ quét AR thông minh từ tớ nhé! 🍜",
          img: "./assets/mochi/mochi-analyzing.png"
        },
        tdee: {
          text: "Điền các chỉ số cơ thể để tớ tính toán mức calo và chia tỷ lệ macro chuẩn nhé! ⚖️",
          img: "./assets/mochi/mochi-scale.png"
        },
        showcase: {
          text: "Giao diện app được thiết kế trực quan, thân thiện. Bạn thích màn hình nào nhất? 📱",
          img: "./assets/mochi/mochi-idle.png"
        },
        faq: {
          text: "Bạn có thắc mắc gì không? Đọc các câu trả lời bên dưới hoặc click vào tớ nhé! 💬",
          img: "./assets/mochi/mochi-thinking.png"
        },
        download: {
          text: "Tải app sạch 100%, an toàn bảo mật. Để tớ đồng hành cùng bạn mỗi ngày nha! 🎉",
          img: "./assets/mochi/mochi-celebrate.png"
        }
      };

      const config = pageWidgetConfig[pageId] || pageWidgetConfig.top;

      widgetImg.setAttribute("data-current-img", config.img);
      widgetImg.src = config.img;

      if (dismissed) {
        widgetBubble.classList.remove("active");
        return;
      }

      widgetText.innerHTML = formatMochiText(config.text);

      // Auto-open widget bubble with a nice delay so it transitions smoothly after page renders
      setTimeout(() => {
        const isCurrentlyDismissed = localStorage.getItem("mochiTipDismissed") === "true";
        if (!isCurrentlyDismissed) {
          widgetBubble.classList.add("active");
        } else {
          widgetBubble.classList.remove("active");
        }
      }, 500);
    }
  }

  function handleNavigation() {
    const hash = window.location.hash || "#top";
    let targetPage = "top";

    if (hash === "#features") targetPage = "features";
    else if (hash === "#simulator") targetPage = "simulator";
    else if (hash === "#tdee") targetPage = "tdee";
    else if (hash === "#showcase") targetPage = "showcase";
    else if (hash === "#faq") targetPage = "faq";
    else if (hash === "#download" || hash === "#install") targetPage = "download";

    switchPage(targetPage);
  }

  // Listen for hash changes
  window.addEventListener("hashchange", handleNavigation);

  // 2. AR Camera Scanner Simulator Database
  const SIMULATOR_DATABASE = {
    pho: {
      dishName: "Phở Bò Hà Nội",
      weight: "Phần ăn tiêu chuẩn (~530g)",
      calories: 550,
      protein: 32,
      carbs: 65,
      fat: 18,
      confidence: "95% Khớp",
      image: "./assets/pho-bowl.jpg",
      advice: "Phở bò cung cấp lượng đạm lý tưởng và cân đối dinh dưỡng. Để bữa ăn hoàn hảo hơn, hãy vắt thêm chanh để vitamin C giúp hấp thụ sắt trong thịt bò tốt hơn. Hạn chế uống cạn nước dùng nếu bạn đang cần kiểm soát lượng natri (muối).",
      boxes: [
        { label: "Bánh Phở (150g)", t: 25, l: 20, w: 60, h: 50 },
        { label: "Thịt Bò Tái (80g)", t: 40, l: 35, w: 32, h: 22 },
        { label: "Hành Lá & Ngò", t: 18, l: 50, w: 25, h: 15 }
      ]
    },
    bunbo: {
      dishName: "Bún Bò Huế Sông Hương",
      weight: "Tô đầy đủ (~600g)",
      calories: 620,
      protein: 28,
      carbs: 70,
      fat: 24,
      confidence: "92% Khớp",
      image: "./assets/bunbo-bowl.png",
      advice: "Bún bò Huế cung cấp nguồn đạm dồi dào từ nạm bò và giò heo. Tuy nhiên nước dùng chứa nhiều váng mỡ, bạn có thể yêu cầu bớt mỡ nước khi gọi món và ăn kèm nhiều rau cải con, bắp chuối để bổ sung chất xơ hòa tan.",
      boxes: [
        { label: "Sợi Bún (180g)", t: 30, l: 25, w: 50, h: 45 },
        { label: "Nạm Bò (70g)", t: 45, l: 32, w: 28, h: 20 },
        { label: "Chả Cua Huế", t: 25, l: 45, w: 20, h: 18 }
      ]
    },
    comtam: {
      dishName: "Cơm Tấm Sườn Bì Chả",
      weight: "Dĩa cơm sườn chả (~450g)",
      calories: 710,
      protein: 35,
      carbs: 85,
      fat: 26,
      confidence: "94% Khớp",
      image: "./assets/comtam-dish.png",
      advice: "Cơm tấm là bữa ăn giàu năng lượng (GI cao). Hàm lượng đạm rất cao từ sườn nướng và chả trứng. Hãy ăn kèm đầy đủ dưa leo, cà chua và cải chua để giảm tốc độ hấp thụ đường của tinh bột gạo tấm.",
      boxes: [
        { label: "Sườn Nướng (120g)", t: 35, l: 18, w: 42, h: 38 },
        { label: "Cơm Tấm (160g)", t: 22, l: 55, w: 35, h: 32 },
        { label: "Chả Trứng Hấp", t: 60, l: 40, w: 22, h: 18 }
      ]
    },
    banhmi: {
      dishName: "Bánh Mì Thịt Nguội",
      weight: "Ổ vừa (~180g)",
      calories: 420,
      protein: 16,
      carbs: 52,
      fat: 17,
      confidence: "96% Khớp",
      image: "./assets/banhmi-sandwich.png",
      advice: "Bánh mì cung cấp nguồn tinh bột nhanh tiện lợi. Tỷ lệ đạm ở mức vừa phải. Bạn hãy bổ sung nhiều dưa leo, đồ chua và ngò rí kẹp trong bánh để bổ sung vitamin, chất xơ tự nhiên giúp tiêu hóa tốt hơn.",
      boxes: [
        { label: "Vỏ Bánh Mì (100g)", t: 20, l: 10, w: 80, h: 60 },
        { label: "Pate & Bơ", t: 45, l: 30, w: 40, h: 18 },
        { label: "Thịt Nguội & Chả", t: 38, l: 25, w: 50, h: 22 }
      ]
    }
  };

  let activeFoodKey = "pho";
  const simScanBar = document.getElementById("simScanBar");
  const arBoundingBoxes = document.getElementById("arBoundingBoxes");
  const simFoodPhoto = document.getElementById("simFoodPhoto");
  const simStatusToast = document.getElementById("simStatusToast");

  const simDishName = document.getElementById("simDishName");
  const simDishWeight = document.getElementById("simDishWeight");
  const simConfidence = document.getElementById("simConfidence");
  const simCalorieNumber = document.getElementById("simCalorieNumber");
  const simCalorieCircle = document.getElementById("simCalorieCircle");

  const simProteinVal = document.getElementById("simProteinVal");
  const simProteinBar = document.getElementById("simProteinBar");
  const simCarbsVal = document.getElementById("simCarbsVal");
  const simCarbsBar = document.getElementById("simCarbsBar");
  const simFatVal = document.getElementById("simFatVal");
  const simFatBar = document.getElementById("simFatBar");
  const simAdviceText = document.getElementById("simAdviceText");
  const adviceMochiAvatar = document.getElementById("adviceMochiAvatar");

  // State variables to prevent race conditions during scanning / animations
  let activeTimers = [];
  let activeAnimationFrames = new Map();
  let initialScanTimeoutId = null;

  function clearAllActiveEffects() {
    // Clear the initial page load scan timeout if user interacts before it fires
    if (initialScanTimeoutId) {
      clearTimeout(initialScanTimeoutId);
      initialScanTimeoutId = null;
    }

    // Clear all active timeouts in the simulator
    activeTimers.forEach((id) => clearTimeout(id));
    activeTimers = [];

    // Cancel all running requestAnimationFrame animations
    for (const [element, frameId] of activeAnimationFrames.entries()) {
      cancelAnimationFrame(frameId);
    }
    activeAnimationFrames.clear();
  }

  // Animate values counter
  function animateValue(element, start, end, duration, suffix = "") {
    if (!element) return;

    // Chế độ instant lập tức (cho chụp màn hình test)
    const isInstant = new URLSearchParams(window.location.search).get('instant') === 'true';
    if (isInstant) {
      element.textContent = end + suffix;
      return;
    }

    // Cancel any existing animation frame on this element to prevent overlapping counters
    if (activeAnimationFrames.has(element)) {
      cancelAnimationFrame(activeAnimationFrames.get(element));
    }

    let startTimestamp = null;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      element.textContent = Math.floor(progress * (end - start) + start) + suffix;
      if (progress < 1) {
        const frameId = window.requestAnimationFrame(step);
        activeAnimationFrames.set(element, frameId);
      } else {
        activeAnimationFrames.delete(element);
      }
    };
    const initialFrameId = window.requestAnimationFrame(step);
    activeAnimationFrames.set(element, initialFrameId);
  }

  // Trigger AR Scanner simulated scanning sequence
  function triggerARScan(foodData) {
    if (!simScanBar || !arBoundingBoxes) return;

    // Prevent race conditions: clear any existing scans or animations first
    clearAllActiveEffects();

    const isInstant = new URLSearchParams(window.location.search).get('instant') === 'true';

    if (isInstant) {
      // Chế độ render lập tức đồng bộ (cho chụp ảnh tự động)
      simScanBar.classList.remove("scanning");
      if (simStatusToast) {
        simStatusToast.textContent = "AR Camera Active";
        simStatusToast.style.background = "rgba(0, 0, 0, 0.6)";
      }

      // Populate text details
      if (simDishName) simDishName.textContent = foodData.dishName;
      if (simDishWeight) simDishWeight.textContent = foodData.weight;
      if (simConfidence) simConfidence.textContent = foodData.confidence;
      if (simAdviceText) simAdviceText.textContent = foodData.advice;
      if (adviceMochiAvatar) {
        adviceMochiAvatar.src = "./assets/mochi/mochi-success.png";
      }

      // Inject Bounding Boxes lập tức
      arBoundingBoxes.innerHTML = "";
      foodData.boxes.forEach((box) => {
        const div = document.createElement("div");
        div.className = "ar-bbox detected";
        div.style.top = box.t + "%";
        div.style.left = box.l + "%";
        div.style.width = box.w + "%";
        div.style.height = box.h + "%";
        div.innerHTML = `<span class="ar-bbox-label">${box.label}</span>`;
        arBoundingBoxes.appendChild(div);
      });

      // Gán các giá trị macros/calories
      if (simCalorieNumber) simCalorieNumber.textContent = foodData.calories;
      if (simProteinVal) simProteinVal.textContent = foodData.protein + "g";
      if (simCarbsVal) simCarbsVal.textContent = foodData.carbs + "g";
      if (simFatVal) simFatVal.textContent = foodData.fat + "g";

      // Set progress bar widths
      if (simProteinBar) {
        const pct = Math.min((foodData.protein / 50) * 100, 100);
        simProteinBar.style.width = pct + "%";
      }
      if (simCarbsBar) {
        const pct = Math.min((foodData.carbs / 120) * 100, 100);
        simCarbsBar.style.width = pct + "%";
      }
      if (simFatBar) {
        const pct = Math.min((foodData.fat / 40) * 100, 100);
        simFatBar.style.width = pct + "%";
      }

      // SVG Circular Ring offset
      if (simCalorieCircle) {
        const strokePercentage = Math.min(foodData.calories / 900, 1);
        const offset = 314.16 - 314.16 * strokePercentage;
        simCalorieCircle.style.strokeDashoffset = offset;
      }
      return;
    }

    // Reset previous view state
    arBoundingBoxes.innerHTML = "";
    simScanBar.classList.add("scanning");
    if (simStatusToast) {
      simStatusToast.textContent = "AI Đang phân tích hình ảnh...";
      simStatusToast.style.background = "rgba(15, 159, 104, 0.8)";
    }

    // Reset numeric values
    if (simCalorieNumber) simCalorieNumber.textContent = "0";
    if (simProteinVal) simProteinVal.textContent = "0g";
    if (simCarbsVal) simCarbsVal.textContent = "0g";
    if (simFatVal) simFatVal.textContent = "0g";
    if (simProteinBar) simProteinBar.style.width = "0%";
    if (simCarbsBar) simCarbsBar.style.width = "0%";
    if (simFatBar) simFatBar.style.width = "0%";
    if (simCalorieCircle) {
      simCalorieCircle.style.strokeDashoffset = "314.16"; // Reset ring
    }
    if (simAdviceText) {
      simAdviceText.textContent = "Hệ thống đang đối chiếu dữ liệu với Viện Dinh Dưỡng Quốc Gia...";
    }
    if (adviceMochiAvatar) {
      adviceMochiAvatar.src = "./assets/mochi/mochi-thinking.png";
    }

    // 1.8 seconds simulated scan duration
    const mainScanTimeout = setTimeout(() => {
      simScanBar.classList.remove("scanning");
      if (simStatusToast) {
        simStatusToast.textContent = "Quét AR hoàn tất!";
        simStatusToast.style.background = "rgba(15, 159, 104, 0.9)";

        const toastTimeout = setTimeout(() => {
          simStatusToast.textContent = "AR Camera Active";
          simStatusToast.style.background = "rgba(0, 0, 0, 0.6)";
        }, 1500);
        activeTimers.push(toastTimeout);
      }

      // Populate text details
      if (simDishName) simDishName.textContent = foodData.dishName;
      if (simDishWeight) simDishWeight.textContent = foodData.weight;
      if (simConfidence) simConfidence.textContent = foodData.confidence;
      if (simAdviceText) simAdviceText.textContent = foodData.advice;
      if (adviceMochiAvatar) {
        adviceMochiAvatar.src = "./assets/mochi/mochi-success.png";
      }

      // Inject Bounding Boxes sequentially
      foodData.boxes.forEach((box, i) => {
        const boxTimeout = setTimeout(() => {
          const div = document.createElement("div");
          div.className = "ar-bbox";
          div.style.top = box.t + "%";
          div.style.left = box.l + "%";
          div.style.width = box.w + "%";
          div.style.height = box.h + "%";
          div.innerHTML = `<span class="ar-bbox-label">${box.label}</span>`;
          arBoundingBoxes.appendChild(div);

          // Force reflow and add detection class
          const detectTimeout = setTimeout(() => div.classList.add("detected"), 50);
          activeTimers.push(detectTimeout);
        }, i * 200); // Cascaded appearance
        activeTimers.push(boxTimeout);
      });

      // Animate numbers and rings
      const animateTimeout = setTimeout(() => {
        animateValue(simCalorieNumber, 0, foodData.calories, 1000);
        animateValue(simProteinVal, 0, foodData.protein, 1000, "g");
        animateValue(simCarbsVal, 0, foodData.carbs, 1000, "g");
        animateValue(simFatVal, 0, foodData.fat, 1000, "g");

        // Set progress bar widths based on typical Vietnamese macro ratios
        if (simProteinBar) {
          const pct = Math.min((foodData.protein / 50) * 100, 100);
          simProteinBar.style.width = pct + "%";
        }
        if (simCarbsBar) {
          const pct = Math.min((foodData.carbs / 120) * 100, 100);
          simCarbsBar.style.width = pct + "%";
        }
        if (simFatBar) {
          const pct = Math.min((foodData.fat / 40) * 100, 100);
          simFatBar.style.width = pct + "%";
        }

        // SVG Circular Ring animation offset (Stroke circumference is 314.16)
        if (simCalorieCircle) {
          const strokePercentage = Math.min(foodData.calories / 900, 1);
          const offset = 314.16 - 314.16 * strokePercentage;
          simCalorieCircle.style.strokeDashoffset = offset;
        }
      }, 300);
      activeTimers.push(animateTimeout);

    }, 1800);
    activeTimers.push(mainScanTimeout);
  }

  // Bind food grid selector clicks
  const foodButtons = document.querySelectorAll(".food-btn");
  foodButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.classList.contains("active")) return;

      foodButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      const key = btn.dataset.food;
      activeFoodKey = key;
      const data = SIMULATOR_DATABASE[key];

      if (data) {
        // Set phone preview photo back to default preset image
        if (simFoodPhoto) {
          simFoodPhoto.src = data.image;
        }
        triggerARScan(data);
      }
    });
  });

  // ==========================================================================
  // SIMULATOR PRESET TĨNH TỐI ƯU HÓA 2026 (KHÔNG CẦN QUYỀN CAMERA VÀ TẢI ẢNH THẬT)
  // Lý do thiết kế: Tránh việc xin quyền phần cứng camera gây phiền toái cho người dùng
  // và giảm dung lượng DOM, tối ưu hóa tốc độ tải trang 100% mượt mà.
  // ==========================================================================

  // --- C. INTERACTIVE 3D PERSPECTIVE TILT EFFECT ---
  // Đã loại bỏ hoàn toàn 3D perspective tilt chạy bằng JS để tiết kiệm 100% tài nguyên CPU/GPU.
  // Thay thế bằng hover CSS tĩnh cực kỳ nhẹ nhàng, mượt mà và dịu mắt.

  // 3. TDEE & Target Nutrient Calculator (Real-time & Smooth Animations 2026)
  const tdeeSubmitBtn = document.getElementById("calcSubmitBtn");
  const resultsPlaceholder = document.getElementById("resultsPlaceholder");
  const resultsContent = document.getElementById("resultsContent");
  const tdeeResultsBox = document.getElementById("tdeeResults");

  const resultTdeeVal = document.getElementById("resultTdeeVal");
  const resultExplanation = document.getElementById("resultExplanation");
  const resProteinGrams = document.getElementById("resProteinGrams");
  const resProteinKcal = document.getElementById("resProteinKcal");
  const resCarbsGrams = document.getElementById("resCarbsGrams");
  const resCarbsKcal = document.getElementById("resCarbsKcal");
  const resFatGrams = document.getElementById("resFatGrams");
  const resFatKcal = document.getElementById("resFatKcal");

  let isCalculatedFirstTime = false;

  // Add hidden-results class initially to avoid premature neon borders
  if (tdeeResultsBox && resultsPlaceholder && !resultsPlaceholder.classList.contains("hidden")) {
    tdeeResultsBox.classList.add("hidden-results");
  }

  function calculateTDEE(isRealTime = false) {
    const ageInput = document.getElementById("calcAge");
    const heightInput = document.getElementById("calcHeight");
    const weightInput = document.getElementById("calcWeight");
    const activityInput = document.getElementById("calcActivity");
    const goalInput = document.getElementById("calcGoal");
    const genderMaleInput = document.getElementById("genderMale");

    if (!ageInput || !heightInput || !weightInput || !activityInput || !goalInput || !genderMaleInput) return;

    const age = parseInt(ageInput.value);
    const height = parseInt(heightInput.value);
    const weight = parseInt(weightInput.value);
    const activity = parseFloat(activityInput.value);
    const goal = goalInput.value;
    const isMale = genderMaleInput.checked;

    if (!age || !height || !weight) return;

    // Update dynamic range slider labels in real-time
    const ageVal = document.getElementById("ageValDisplay");
    const heightVal = document.getElementById("heightValDisplay");
    const weightVal = document.getElementById("weightValDisplay");
    if (ageVal) ageVal.textContent = age;
    if (heightVal) heightVal.textContent = height;
    if (weightVal) weightVal.textContent = weight;

    // Mifflin-St Jeor Formula
    let bmr = 0;
    if (isMale) {
      bmr = 10 * weight + 6.25 * height - 5 * age + 5;
    } else {
      bmr = 10 * weight + 6.25 * height - 5 * age - 161;
    }

    // Total Daily Energy Expenditure
    const tdee = Math.round(bmr * activity);
    let targetKcal = tdee;
    let goalText = "";

    if (goal === "lose") {
      targetKcal = Math.max(tdee - 450, isMale ? 1500 : 1200); // Healthy floor
      goalText = `Mức calorie này giúp bạn giảm cân an toàn (thâm hụt lành mạnh) mà không gây mệt mỏi cho cơ thể.`;
    } else if (goal === "gain") {
      targetKcal = tdee + 350;
      goalText = `Mức năng lượng này giúp bổ sung năng lượng tối ưu hỗ trợ quá trình tăng cơ và cân nặng lành mạnh.`;
    } else {
      goalText = `Mức calorie này giúp bạn duy trì cân nặng ổn định, đảm bảo hệ trao đổi chất hoạt động cân bằng nhất.`;
    }

    // Macro Distribution: Protein 2g/kg weight, Fat 25% of Kcal, Carbs remaining
    const proteinG = Math.round(weight * 2.0);
    const proteinK = proteinG * 4;

    const fatK = Math.round(targetKcal * 0.25);
    const fatG = Math.round(fatK / 9);

    const carbsK = Math.max(targetKcal - (proteinK + fatK), 0);
    const carbsG = Math.round(carbsK / 4);

    // Hide placeholder, show content
    if (resultsPlaceholder) resultsPlaceholder.classList.add("hidden");
    if (resultsContent) resultsContent.classList.remove("hidden");
    if (tdeeResultsBox) tdeeResultsBox.classList.remove("hidden-results");

    // Dynamic Mochi Reaction animation (mochi-bounce) when pulling sliders
    const tdeeMochiAvatar = document.getElementById("tdeeMochiAvatar");
    if (tdeeMochiAvatar && isRealTime) {
      tdeeMochiAvatar.classList.add("mochi-bounce");
      const removeBounce = () => {
        tdeeMochiAvatar.classList.remove("mochi-bounce");
        tdeeMochiAvatar.removeEventListener("animationend", removeBounce);
      };
      tdeeMochiAvatar.addEventListener("animationend", removeBounce);
    }

    // Smooth fluid numerical transitions instead of resetting to 0
    if (!isCalculatedFirstTime) {
      // First calculation: Animate values from 0
      animateValue(resultTdeeVal, 0, targetKcal, 800);
      animateValue(resProteinGrams, 0, proteinG, 800);
      animateValue(resCarbsGrams, 0, carbsG, 800);
      animateValue(resFatGrams, 0, fatG, 800);
      isCalculatedFirstTime = true;
    } else {
      // Real-time slide interactions: Animate smoothly from the CURRENT displayed number to the NEW target
      const currentTdee = parseInt(resultTdeeVal.textContent) || 0;
      const currentProtein = parseInt(resProteinGrams.textContent) || 0;
      const currentCarbs = parseInt(resCarbsGrams.textContent) || 0;
      const currentFat = parseInt(resFatGrams.textContent) || 0;

      animateValue(resultTdeeVal, currentTdee, targetKcal, 250);
      animateValue(resProteinGrams, currentProtein, proteinG, 250);
      animateValue(resCarbsGrams, currentCarbs, carbsG, 250);
      animateValue(resFatGrams, currentFat, fatG, 250);
    }

    if (resultExplanation) resultExplanation.textContent = goalText;
    if (resProteinKcal) resProteinKcal.textContent = `${proteinK} kcal`;
    if (resCarbsKcal) resCarbsKcal.textContent = `${carbsK} kcal`;
    if (resFatKcal) resFatKcal.textContent = `${fatK} kcal`;

    // Update MoChi dynamic advice & avatar based on weight goals
    const tdeeAdviceText = document.getElementById("tdeeAdviceText");
    if (tdeeAdviceText && tdeeMochiAvatar) {
      if (goal === "lose") {
        tdeeAdviceText.textContent = "Tớ khuyên bạn nên tập trung bổ sung nguồn Protein chất lượng cao từ thịt trắng như ức gà, cá, kết hợp các loại tinh bột hấp thụ chậm (gạo lứt, khoai lang) để duy trì cảm giác no lâu. Ăn thật nhiều rau xanh để giảm hấp thụ calo thừa nhé! 💚";
        tdeeMochiAvatar.src = "./assets/mochi/mochi-scale.png";
      } else if (goal === "gain") {
        tdeeAdviceText.textContent = "Để tăng cơ hoặc tăng cân lành mạnh, hãy tập trung vào thặng dư calo tích cực từ các chất béo tốt (bơ, hạt điều, hạnh nhân) kết hợp protein từ thịt đỏ và tập luyện kháng lực. MoChi chúc bạn sớm đạt thể hình mong ước! 💪";
        tdeeMochiAvatar.src = "./assets/mochi/mochi-meal.png";
      } else {
        tdeeAdviceText.textContent = "Giữ cân là trạng thái cân bằng hoàn hảo! Hãy duy trì lối sống lành mạnh bằng cách cân bằng các bữa ăn đầy đủ 3 nhóm dưỡng chất chính, tăng cường uống nước và giữ tinh thần thoải mái cùng MoChi mỗi ngày nhé! ✨";
        tdeeMochiAvatar.src = "./assets/mochi/mochi-idle.png";
      }
    }

    // Reset macro suggestions box and remove active state from result cards
    const macroCards = document.querySelectorAll(".macro-result-card");
    macroCards.forEach((c) => c.classList.remove("active"));

    const tdeeFoodSuggestions = document.getElementById("tdeeFoodSuggestions");
    if (tdeeFoodSuggestions) {
      tdeeFoodSuggestions.innerHTML = `
        <h5>💡 Gợi ý thực phẩm Việt Nam tốt</h5>
        <p>Nhấp chọn các thẻ Protein, Carbs hoặc Fat ở trên để xem các gợi ý thực phẩm lành mạnh giàu nhóm chất tương ứng từ MoChi nhé!</p>
      `;
    }
  }

  // Hook up event listeners for Real-time instant calculations (Xu hướng 2026)
  const ageSlider = document.getElementById("calcAge");
  const heightSlider = document.getElementById("calcHeight");
  const weightSlider = document.getElementById("calcWeight");
  const activitySelect = document.getElementById("calcActivity");
  const goalSelect = document.getElementById("calcGoal");
  const genderRadios = document.querySelectorAll("input[name='gender']");

  if (ageSlider) ageSlider.addEventListener("input", () => calculateTDEE(true));
  if (heightSlider) heightSlider.addEventListener("input", () => calculateTDEE(true));
  if (weightSlider) weightSlider.addEventListener("input", () => calculateTDEE(true));
  if (activitySelect) activitySelect.addEventListener("change", () => calculateTDEE(true));
  if (goalSelect) goalSelect.addEventListener("change", () => calculateTDEE(true));
  genderRadios.forEach((r) => {
    r.addEventListener("change", () => calculateTDEE(true));
  });

  // Handle submit button for fallback compatibility
  if (tdeeSubmitBtn) {
    tdeeSubmitBtn.addEventListener("click", (e) => {
      e.preventDefault();
      calculateTDEE(false);
    });
  }

  // Pre-calculate initially to show interactive results right away
  calculateTDEE(true);

  // 4. Bento Card Mouse Follow Glowing effect
  const glowCards = document.querySelectorAll("[data-glow-card]");
  glowCards.forEach((card) => {
    card.addEventListener("mousemove", (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty("--mouse-x", `${x}px`);
      card.style.setProperty("--mouse-y", `${y}px`);
    });
  });

  // 5. Interactive App Showcase Screen Slider & Hotspots
  const showcaseTabs = document.querySelectorAll(".showcase-tab");
  const showcaseSlides = document.querySelectorAll(".showcase-slide");
  const showcaseTooltip = document.getElementById("showcaseTooltip");

  showcaseTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      if (tab.classList.contains("active")) return;

      showcaseTabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");

      const slideIndex = tab.dataset.slide;
      showcaseSlides.forEach((slide) => {
        slide.classList.remove("active");
        if (slide.id === `slide-img-${slideIndex}`) {
          slide.classList.add("active");
        }
      });

      // Reset tooltip text
      if (showcaseTooltip) {
        showcaseTooltip.textContent = "Chạm hoặc di chuột qua các điểm nhấp nháy để khám phá";
      }
    });
  });

  // Hotspots hover tooltips
  const hotspots = document.querySelectorAll(".hotspot");
  hotspots.forEach((hs) => {
    hs.addEventListener("mouseenter", () => {
      if (showcaseTooltip) {
        showcaseTooltip.textContent = hs.dataset.tip;
        showcaseTooltip.style.borderColor = "var(--brand-primary)";
      }
    });
    hs.addEventListener("mouseleave", () => {
      if (showcaseTooltip) {
        showcaseTooltip.textContent = "Chạm hoặc di chuột qua các điểm nhấp nháy để khám phá";
        showcaseTooltip.style.borderColor = "var(--border-light)";
      }
    });
  });

  // 6. FAQs Smooth Accordion Heights
  const faqTriggers = document.querySelectorAll(".faq-accordion-trigger");
  faqTriggers.forEach((trigger) => {
    trigger.addEventListener("click", () => {
      const parent = trigger.parentElement;
      const content = trigger.nextElementSibling;
      const isActive = parent.classList.contains("active");

      // Close all other accordion items first
      document.querySelectorAll(".faq-accordion-item").forEach((item) => {
        item.classList.remove("active");
        const c = item.querySelector(".faq-accordion-content");
        if (c) c.style.maxHeight = null;
      });

      // Toggle current item
      if (!isActive) {
        parent.classList.add("active");
        if (content) {
          // Dynamic scrollHeight in pixels for smooth CSS transition
          content.style.maxHeight = content.scrollHeight + "px";
        }
      }
    });
  });

  // 7. Clipboard Copy with Elegant Floating Toast
  const toastBox = document.getElementById("toastBox");
  function showToast(message) {
    if (!toastBox) return;
    toastBox.textContent = message;
    toastBox.classList.add("show");
    setTimeout(() => {
      toastBox.classList.remove("show");
    }, 2500);
  }

  function getCopyValue(key) {
    if (key === "downloadUrl") {
      return RELEASE.downloadUrl;
    }
    if (key === "sha256" && isChecksumReady) {
      return RELEASE.sha256;
    }
    return "";
  }

  async function copyText(value) {
    if (!value) return false;
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(value);
      return true;
    }

    const textArea = document.createElement("textarea");
    textArea.value = value;
    textArea.setAttribute("readonly", "");
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    document.body.appendChild(textArea);
    textArea.select();
    try {
      return document.execCommand("copy");
    } finally {
      document.body.removeChild(textArea);
    }
  }

  function wireCopyButtons() {
    document.querySelectorAll("[data-copy]").forEach((button) => {
      button.addEventListener("click", async () => {
        const val = getCopyValue(button.dataset.copy);
        const ok = await copyText(val).catch(() => false);
        if (ok) {
          showToast("Đã sao chép mã SHA-256 vào bộ nhớ tạm!");
        } else {
          showToast("Có lỗi xảy ra. Hãy bôi đen copy trực tiếp.");
        }
      });
    });
  }

  // 8. Qr Code Generator & Release verification
  function setQrImage() {
    const image = document.querySelector("[data-qr-image]");
    const spinner = document.getElementById("qrSpinner");
    if (!image) return;

    const qrUrl = new URL("https://api.qrserver.com/v1/create-qr-code/");
    qrUrl.searchParams.set("size", "220x220");
    qrUrl.searchParams.set("format", "svg");
    qrUrl.searchParams.set("margin", "14");
    qrUrl.searchParams.set("data", RELEASE.downloadUrl);

    image.onload = () => {
      if (spinner) spinner.style.display = "none";
    };
    image.src = qrUrl.toString();
  }

  function updateReleaseState() {
    document.body.dataset.releaseReady = String(isChecksumReady);
    const statusText = isChecksumReady ? "Ổn định & Sẵn sàng" : "Đang đồng bộ APK mới...";
    setText("[data-release-status]", statusText);

    const checksumButtons = document.querySelectorAll('[data-copy="sha256"]');
    checksumButtons.forEach((button) => {
      button.disabled = !isChecksumReady;
    });
  }

  async function fetchDownloadCount() {
    const cacheKey = "eatfitai_download_count";
    const cacheTimeKey = "eatfitai_download_count_time";
    const cacheDuration = 5 * 60 * 1000; // 5 minutes cache

    const now = Date.now();
    const cachedCount = localStorage.getItem(cacheKey);
    const cachedTime = localStorage.getItem(cacheTimeKey);

    if (cachedCount && cachedTime && (now - Number(cachedTime) < cacheDuration)) {
      setText("[data-download-count]", `${cachedCount} lượt`);
      return;
    }

    try {
      const response = await fetch(
        "https://api.github.com/repos/anthonyconghieu/EatFitAI_v1/releases/tags/android-v1.0.0"
      );
      if (!response.ok) {
        throw new Error(`GitHub API HTTP error: ${response.status}`);
      }

      const data = await response.json();
      const apkAsset = data.assets && data.assets.find(
        (asset) => asset.name === RELEASE.fileName
      );

      if (apkAsset && typeof apkAsset.download_count === "number") {
        const count = apkAsset.download_count;
        const formattedCount = new Intl.NumberFormat("vi-VN").format(count);
        setText("[data-download-count]", `${formattedCount} lượt`);

        localStorage.setItem(cacheKey, formattedCount);
        localStorage.setItem(cacheTimeKey, now.toString());
      } else {
        setText("[data-download-count]", "0 lượt");
      }
    } catch (error) {
      console.error("Lỗi khi lấy số lượt tải từ GitHub:", error);
      if (cachedCount) {
        setText("[data-download-count]", `${cachedCount} lượt`);
      } else {
        setText("[data-download-count]", "-- lượt");
      }
    }
  }

  const MACRO_FOOD_SUGGESTIONS = {
    protein: {
      title: "💡 Gợi ý thực phẩm Việt giàu Đạm (Protein):",
      items: [
        "<strong>Ức gà ta luộc/áp chảo</strong>: Nguồn protein tinh khiết cực kỳ ít mỡ (khoảng 31g đạm/100g).",
        "<strong>Thịt bò thăn/bắp bò</strong>: Giàu protein dồi dào, kẽm và sắt (khoảng 26g đạm/100g).",
        "<strong>Trứng vịt lộn hoặc trứng gà</strong>: Giá thành rẻ, dễ hấp thu và dễ chế biến ăn sáng.",
        "<strong>Đậu phụ trắng (Tàu hũ)</strong>: Lựa chọn tuyệt vời cho người ăn chay (khoảng 8g đạm/100g).",
        "<strong>Cá thu/Cá lóc đồng</strong>: Protein lành mạnh đi kèm axit béo Omega-3 tốt cho tim mạch."
      ]
    },
    carbs: {
      title: "💡 Gợi ý tinh bột phức (Carbs tốt) Việt Nam:",
      items: [
        "<strong>Cơm gạo lứt đỏ/đen</strong>: Giàu chất xơ, không gây tăng đường huyết đột ngột.",
        "<strong>Khoai lang mật/khoai luộc</strong>: Nguồn tinh bột hấp thu chậm lý tưởng cho bữa phụ.",
        "<strong>Bánh mì nguyên cám hoặc yến mạch</strong>: Cung cấp năng lượng bền bỉ cho cả ngày dài.",
        "<strong>Ngô (Bắp) luộc dẻo</strong>: Món ăn dân dã, nhiều chất xơ giúp no lâu và hỗ trợ tiêu hóa tốt.",
        "<strong>Khoai môn/Khoai sọ</strong>: Ít calo, nhiều chất xơ hòa tan tốt cho đường ruột."
      ]
    },
    fat: {
      title: "💡 Gợi ý chất béo tốt (Healthy Fat) Việt Nam:",
      items: [
        "<strong>Trái bơ sáp Đắk Lắk</strong>: Nữ hoàng chất béo lành mạnh, giàu vitamin E và chất xơ.",
        "<strong>Hạt điều Bình Phước</strong>: Hạt ăn vặt giàu chất béo không bão hòa đơn tốt cho tim mạch.",
        "<strong>Đậu phộng (Lạc) luộc</strong>: Món ăn bình dân cung cấp năng lượng và chất béo thực vật dồi dào.",
        "<strong>Hạt mè (vừng) đen/trắng</strong>: Rắc lên các món ăn giúp bổ sung béo tốt và canxi.",
        "<strong>Dầu dừa nguyên chất hoặc dầu olive</strong>: Phù hợp để trộn salad và áp chảo nhẹ nhàng."
      ]
    }
  };

  function setupMochiInteractivity() {
    // 1. Setup Macro result card clicks
    const macroCards = document.querySelectorAll(".macro-result-card");
    const tdeeFoodSuggestions = document.getElementById("tdeeFoodSuggestions");

    if (macroCards && tdeeFoodSuggestions) {
      macroCards.forEach((card) => {
        card.addEventListener("click", () => {
          // Toggle active class
          macroCards.forEach((c) => c.classList.remove("active"));
          card.classList.add("active");

          const macroType = card.dataset.macro;
          const suggestion = MACRO_FOOD_SUGGESTIONS[macroType];

          if (suggestion) {
            tdeeFoodSuggestions.classList.remove("hidden");

            let listHtml = `<h5>${suggestion.title}</h5>`;
            listHtml += `<ul>`;
            suggestion.items.forEach(item => {
              listHtml += `<li>${item}</li>`;
            });
            listHtml += `</ul>`;

            tdeeFoodSuggestions.innerHTML = listHtml;
            tdeeFoodSuggestions.style.display = "block"; // Ensure visible

            tdeeFoodSuggestions.scrollIntoView({ behavior: "smooth", block: "nearest" });
          }
        });
      });
    }

    // 1b. NÂNG CẤP THEO DÕI NƯỚC HAI CHIỀU & LƯU LOCALSTORAGE (XU HƯỚNG 2026)
    const btnAddWater = document.getElementById("btn-add-water");
    const btnSubWater = document.getElementById("btn-sub-water");
    const waterCupWave = document.getElementById("water-cup-wave");
    const waterPercentText = document.getElementById("water-percent-text");
    const waterLbl = document.getElementById("water-lbl");
    const targetWater = 2000;

    // Đọc lượng nước đã lưu trữ hoặc mặc định là 1500ml
    let currentWater = parseInt(localStorage.getItem("water_intake")) || 1500;

    function updateWaterUI(silently = false) {
      if (!waterCupWave || !waterPercentText) return;
      const percentage = Math.min((currentWater / targetWater) * 100, 100);
      waterCupWave.style.height = `${percentage}%`;
      waterPercentText.textContent = `${Math.round(percentage)}%`;

      const waterTextVal = document.getElementById("water-text-val");
      if (waterTextVal) {
        waterTextVal.textContent = `${currentWater} / ${targetWater} ml`;
      }

      localStorage.setItem("water_intake", currentWater);

      if (!silently) {
        playHapticClick("pop");
      }
    }

    // Khởi tạo hiển thị lần đầu
    updateWaterUI(true);

    if (btnAddWater) {
      btnAddWater.addEventListener("click", () => {
        if (currentWater >= 3000) {
          showToast("Bạn đã uống khá nhiều nước rồi, hãy uống từ từ nhé! 💧🌟");
          return;
        }
        currentWater += 250;
        updateWaterUI();

        // Gọi sủi bọt khí ga sủi tăm Đợt 3 nâng cấp 2026
        if (typeof spawnBubbles === "function") {
          spawnBubbles();
        }

        if (currentWater >= targetWater) {
          showToast("Chúc mừng! Bạn đã hoàn thành mục tiêu 2000ml nước! 🎉💧");
        } else {
          showToast(`Đã uống thêm 250ml nước! Tổng cộng: ${currentWater}ml 💧`);
        }
      });
    }

    if (btnSubWater) {
      btnSubWater.addEventListener("click", () => {
        if (currentWater <= 0) {
          showToast("Lượng nước đã giảm về 0 ml! 💧");
          return;
        }
        currentWater = Math.max(0, currentWater - 250);
        updateWaterUI();
        showToast(`Đã giảm 250ml nước! Tổng cộng: ${currentWater}ml 💧`);
      });
    }

    // 1c. TỔNG HỢP ÂM THANH PHẢN HỒI CƠ HỌC (WEB AUDIO API HAPTICS)
    let audioCtx = null;
    function playHapticClick(type = "click") {
      try {
        if (!audioCtx) {
          audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === "suspended") {
          audioCtx.resume();
        }

        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        const now = audioCtx.currentTime;

        if (type === "click") {
          osc.type = "sine";
          osc.frequency.setValueAtTime(800, now);
          osc.frequency.exponentialRampToValueAtTime(150, now + 0.08);
          gain.gain.setValueAtTime(0.06, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
          osc.start(now);
          osc.stop(now + 0.08);
        } else if (type === "pop") {
          osc.type = "triangle";
          osc.frequency.setValueAtTime(300, now);
          osc.frequency.exponentialRampToValueAtTime(600, now + 0.12);
          gain.gain.setValueAtTime(0.08, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
          osc.start(now);
          osc.stop(now + 0.12);
        } else if (type === "beep") {
          osc.type = "sine";
          osc.frequency.setValueAtTime(1000, now);
          gain.gain.setValueAtTime(0.03, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
          osc.start(now);
          osc.stop(now + 0.15);
        }
      } catch (err) {
        // Tắt lỗi âm thanh
      }
    }

    // 1d. CYBERPUNK DARK/LIGHT MODE SWITCHER
    const themeToggleBtn = document.getElementById("themeToggleBtn");
    if (themeToggleBtn) {
      const sunIcon = themeToggleBtn.querySelector(".sun-icon");
      const moonIcon = themeToggleBtn.querySelector(".moon-icon");

      const currentTheme = localStorage.getItem("theme") || "dark";
      if (currentTheme === "light") {
        document.body.classList.add("light-theme");
        if (sunIcon) sunIcon.style.display = "none";
        if (moonIcon) moonIcon.style.display = "block";
      }

      themeToggleBtn.addEventListener("click", () => {
        playHapticClick("click");
        const isLight = document.body.classList.toggle("light-theme");
        if (isLight) {
          localStorage.setItem("theme", "light");
          if (sunIcon) sunIcon.style.display = "none";
          if (moonIcon) moonIcon.style.display = "block";
          showToast("Đã chuyển sang chế độ Sáng ngọc trai ☀️");
        } else {
          localStorage.setItem("theme", "dark");
          if (sunIcon) sunIcon.style.display = "block";
          if (moonIcon) moonIcon.style.display = "none";
          showToast("Đã chuyển sang chế độ Tối Cyberpunk 🌙");
        }
      });
    }

    // 1e. AI TIME-BASED WELCOME & GRADIENT PERSONALIZATION
    const heroSection = document.getElementById("top");
    const heroMochiSpeech = document.querySelector(".hero .bento-mochi-speech");
    if (heroSection) {
      const hour = new Date().getHours();
      let greeting = "";

      if (hour >= 5 && hour < 11) {
        greeting = "Chào buổi sáng đầy năng lượng! Hãy nạp đủ calo lành mạnh để đón chào ngày mới năng động cùng MoChi nhé! ☀️🌱";
        heroSection.style.background = "linear-gradient(135deg, #05070d 0%, #151a24 50%, #1e112a 100%)";
      } else if (hour >= 11 && hour < 16) {
        greeting = "Buổi trưa ngon miệng và đủ chất nhé! Đừng quên quét món ăn Việt để kiểm soát calorie nạp vào nha! 🍜⚖️";
        heroSection.style.background = "linear-gradient(135deg, #05070d 0%, #0c1a17 50%, #0b0e17 100%)";
      } else if (hour >= 16 && hour < 19) {
        greeting = "Hoàng hôn buông xuống dịu mát rồi. Bữa xế chiều nhẹ nhàng thanh đạm sẽ rất lý tưởng đó! 🌆🍉";
        heroSection.style.background = "linear-gradient(135deg, #05070d 0%, #1a150e 50%, #170d1a 100%)";
      } else {
        greeting = "Buổi tối thư giãn và ấm áp nhé! Một giấc ngủ ngon và ghi chép đầy đủ nhật ký sẽ giúp giữ dáng hoàn hảo! 🌙💤";
        heroSection.style.background = "linear-gradient(135deg, #05070d 0%, #0b0e17 100%)";
      }

      if (heroMochiSpeech) {
        heroMochiSpeech.textContent = greeting;
      }
    }

    // 1f. SUPABASE CLOUD SYNC INTERACTIVE BADGE
    const simSyncBtn = document.getElementById("simSyncBtn");
    if (simSyncBtn) {
      simSyncBtn.addEventListener("click", () => {
        if (simSyncBtn.classList.contains("syncing") || simSyncBtn.classList.contains("success")) return;

        simSyncBtn.classList.add("syncing");
        const statusText = document.getElementById("simSyncStatusText");
        if (statusText) {
          statusText.innerHTML = `<span class="status-dot pulse-amber"></span> Đang đồng bộ...`;
        }
        playHapticClick("click");

        setTimeout(() => {
          simSyncBtn.classList.remove("syncing");
          simSyncBtn.classList.add("success");

          if (statusText) {
            statusText.innerHTML = `<span class="status-dot pulse-green"></span> Đã sao lưu 100%`;
          }
          playHapticClick("pop");
          showToast("Đồng bộ đám mây thành công! Dữ liệu đã lưu trữ an toàn 🛡️");

          setTimeout(() => {
            simSyncBtn.classList.remove("success");
            if (statusText) {
              statusText.innerHTML = `<span class="status-dot pulse-green"></span> Đồng bộ 1-chạm`;
            }
          }, 3000);
        }, 1500);
      });
    }

    // 1g. BENTO VOICE WAVEFORM CANVAS & MOCHI RESPONSE MOCKUP
    const simVoiceMicBtn = document.getElementById("simVoiceMicBtn");
    const voiceWaveform = document.getElementById("voiceWaveform");
    const voiceWaveLabel = document.getElementById("voiceWaveLabel");

    if (simVoiceMicBtn && voiceWaveform && voiceWaveLabel) {
      const ctx = voiceWaveform.getContext("2d");
      let waveAnimId = null;
      let isListening = false;
      let wavePhase = 0;

      function drawWave() {
        if (!isListening) return;

        ctx.clearRect(0, 0, voiceWaveform.width, voiceWaveform.height);
        ctx.strokeStyle = "#9d7cff";
        ctx.lineWidth = 2.5;

        ctx.beginPath();
        for (let i = 0; i < voiceWaveform.width; i++) {
          const amp = Math.sin(wavePhase + i * 0.1) * (voiceWaveform.height / 2.5);
          const y = (voiceWaveform.height / 2) + amp * (Math.sin(wavePhase * 0.5) * 0.6 + 0.4);
          if (i === 0) {
            ctx.moveTo(i, y);
          } else {
            ctx.lineTo(i, y);
          }
        }
        ctx.stroke();

        wavePhase += 0.25;
        waveAnimId = requestAnimationFrame(drawWave);
      }

      simVoiceMicBtn.addEventListener("click", () => {
        if (isListening) return;

        isListening = true;
        simVoiceMicBtn.classList.add("listening");
        voiceWaveLabel.textContent = "Đang nói...";
        playHapticClick("beep");
        drawWave();

        setTimeout(() => {
          isListening = false;
          cancelAnimationFrame(waveAnimId);
          simVoiceMicBtn.classList.remove("listening");
          voiceWaveLabel.textContent = "Nhập để nói...";
          playHapticClick("click");

          ctx.clearRect(0, 0, voiceWaveform.width, voiceWaveform.height);

          const voiceChat = document.querySelector(".bento-voice-chat");
          if (voiceChat) {
            const userMsg = document.createElement("div");
            userMsg.className = "chat-bubble bubble-user";
            userMsg.innerHTML = `<span><svg class="chat-icon-svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v1a7 7 0 0 1-14 0v-1"/><line x1="12" x2="12" y1="19" y2="22"/></svg> Chiều ăn bún riêu cua và chạy bộ 5000 bước</span>`;

            const aiMsg = document.createElement("div");
            aiMsg.className = "chat-bubble bubble-ai";
            aiMsg.innerHTML = `<span><svg class="chat-icon-svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="12" x="3" y="8" rx="2"/><path d="M12 2v6"/><path d="M8 8v1M16 8v1"/><circle cx="8" cy="14" r="1"/><circle cx="16" cy="14" r="1"/></svg> Ghi nhận: Bún Riêu Cua (+410 kcal) &amp; Khấu trừ: -200 kcal</span>`;

            voiceChat.appendChild(userMsg);

            setTimeout(() => {
              voiceChat.appendChild(aiMsg);
              playHapticClick("pop");
              showToast("Đã ghi nhận giọng nói của bạn vào Nhật ký! 🗣️⚡");
              voiceChat.scrollTop = voiceChat.scrollHeight;
            }, 800);
          }
        }, 3000);
      });
    }

    // 1h. LOẠI BỎ HIỆU ỨNG CHUỘT NẶNG NỀ (Đã thanh lọc để tối ưu hóa CPU 100%)

    // 1i. WIRE HAPTIC FEEDBACK TO STATIC BUTTONS & INPUTS
    const hapticElements = document.querySelectorAll(
      ".nav-links a, .btn-primary, .btn-secondary, .btn-nav, .theme-toggle-btn, .water-btn, .calc-btn, .food-item, .showcase-tab, .faq-question"
    );
    hapticElements.forEach(el => {
      el.addEventListener("click", () => playHapticClick("click"));
    });

    const tdeeInputs = document.querySelectorAll(".tdee-form-grid input[type='range']");
    tdeeInputs.forEach(input => {
      input.addEventListener("input", () => {
        if (Math.random() < 0.25) {
          playHapticClick("click");
        }
      });
    });


    // 2. Setup Floating Widget
    const mochiWidget = document.getElementById("mochiWidget");
    const mochiWidgetBubble = document.getElementById("mochiWidgetBubble");
    const mochiWidgetText = document.getElementById("mochiWidgetText");
    const mochiWidgetImg = document.getElementById("mochiWidgetImg");
    const mochiBubbleClose = document.getElementById("mochiBubbleClose");

    const MOCHI_TIPS = [
      "Ăn một bát phở bò nạm sẽ cung cấp khoảng 550 kcal. Hãy nhớ ăn thêm nhiều rau thơm để bổ sung chất xơ nhé! 🌿",
      "Uống đủ 2 lít nước mỗi ngày giúp tăng cường trao đổi chất và hỗ trợ đào thải độc tố cực kỳ tốt đó! 💧",
      "Bạn có biết bún bò Huế chứa khá nhiều natri? Tránh húp hết nước lèo nếu bạn đang trong chế độ kiêng muối nhé! 🍜",
      "Cơm tấm sườn bì chả là nguồn năng lượng dồi dào (~710 kcal). Thêm dưa leo và cà chua để bổ sung chất xơ hòa tan nào! 🥒",
      "Khi ăn bánh mì thịt, hãy kẹp thêm nhiều ngò rí, đồ chua để bổ sung vitamin giúp hệ tiêu hóa khỏe mạnh hơn! 🥖",
      "Đừng bỏ bữa sáng nha! Một bữa sáng giàu protein sẽ giúp bạn no lâu và tràn đầy năng lượng làm việc cả ngày. 🍳",
      "Hãy nhai thật kỹ và ăn chậm lại. Não bộ cần khoảng 20 phút để nhận tín hiệu rằng dạ dày của bạn đã no đó! 🧠",
      "Muốn tăng cân lành mạnh? Hãy chọn các loại hạt dinh dưỡng như hạt điều, hạt chia hoặc bơ đậu phộng vào bữa phụ nhé! 🥜",
      "Cố gắng ngủ đủ 7-8 tiếng mỗi đêm. Thiếu ngủ sẽ kích thích hormone thèm ăn cortisol và làm chậm trao đổi chất đấy! 😴",
      "Hãy ăn phong phú nhiều màu sắc rau củ quả để đảm bảo nạp đủ vitamin và khoáng chất cần thiết nhất nhé! 🌈"
    ];

    let widgetResetTimeout = null;

    if (mochiWidget && mochiWidgetBubble && mochiWidgetText && mochiWidgetImg) {
      const avatarWrapper = mochiWidget.querySelector(".mochi-avatar-wrapper");
      if (avatarWrapper) {
        // Hover interaction: change pose on mouseenter
        avatarWrapper.addEventListener("mouseenter", () => {
          mochiWidgetImg.src = "./assets/mochi/mochi-success.png";
        });

        // Hover interaction: revert to page-specific pose on mouseleave
        avatarWrapper.addEventListener("mouseleave", () => {
          if (widgetResetTimeout) return; // Keep showing success if tip is active
          const currentImg = mochiWidgetImg.getAttribute("data-current-img") || "./assets/mochi/mochi-idle.png";
          mochiWidgetImg.src = currentImg;
        });

        avatarWrapper.addEventListener("click", (e) => {
          e.stopPropagation();

          mochiWidgetBubble.classList.add("active");

          const randomTip = MOCHI_TIPS[Math.floor(Math.random() * MOCHI_TIPS.length)];
          mochiWidgetText.innerHTML = formatMochiText(randomTip);

          mochiWidgetImg.src = "./assets/mochi/mochi-success.png";

          if (widgetResetTimeout) clearTimeout(widgetResetTimeout);
          widgetResetTimeout = setTimeout(() => {
            widgetResetTimeout = null;
            const currentImg = mochiWidgetImg.getAttribute("data-current-img") || "./assets/mochi/mochi-idle.png";
            mochiWidgetImg.src = currentImg;
          }, 6000);
        });
      }

      if (mochiBubbleClose) {
        mochiBubbleClose.addEventListener("click", (e) => {
          e.stopPropagation();
          mochiWidgetBubble.classList.remove("active");
          localStorage.setItem("mochiTipDismissed", "true"); // Dismissed permanently
        });
      }
    }
  }

  // Hydrate static details on loading
  function hydratePage() {
    document.title = `Tải ${RELEASE.appName} cho Android — Ứng dụng dinh dưỡng Việt`;

    setText("[data-version]", RELEASE.version);
    setText("[data-package-name]", RELEASE.packageName);
    // Hidden to protect repository privacy
    // setText("[data-release-tag]", RELEASE.releaseTag);
    // setText("[data-file-name]", RELEASE.fileName);
    setText("[data-file-size]", RELEASE.fileSize);
    // setText("[data-download-url]", RELEASE.downloadUrl);
    setText("[data-sha256]", RELEASE.sha256);

    setHref("[data-download-link]", RELEASE.downloadUrl);
    // Hidden to protect repository privacy
    // setHref("[data-release-link]", RELEASE.releaseUrl);
    // setHref("[data-repo-link]", RELEASE.repositoryUrl);

    setQrImage();
    updateReleaseState();
    fetchDownloadCount();
    wireCopyButtons();

    // Setup interactive MoChi elements
    setupMochiInteractivity();

    // Khởi tạo các nâng cấp đột phá UI/UX 2026 đợt 2
    initBentoScanInteractive();
    initBentoStreakInteractive();
    initTdeeGoalTabsInteractive();
    // initMagneticInteraction(); -> Đã được loại bỏ hoàn toàn để tiết kiệm CPU và chạy hover CSS tĩnh dịu nhẹ

    // Khởi tạo các nâng cấp đột phá UI/UX 2026 đợt 3
    // initBentoSpotlightInteractive(); -> Đã thay thế bằng hover CSS tĩnh tiết kiệm CPU
    initBentoMacrosInteractive();
    initTdeeSlidersTooltipInteractive();
    initTdeeCopyInteractive();
    initBentoRecipeCarouselInteractive();
    initWaterBubblesInteractive();

  }

  // ==========================================================================
  // NÂNG CẤP ĐỘT PHÁ TỐI ƯU UI/UX ĐỢT 2 - XU HƯỚNG TƯƠNG TÁC 2026
  // ==========================================================================

  // --- A. BENTO CARD 1: CAMERA AI DEEP INTERACTIVE SCAN 2026 ---
  // Lý do thiết kế: Tạo ra một demo tương tác siêu nhanh (Instant Micro-experience)
  // giúp người dùng chạm vào là có phản hồi quang học và thông tin dinh dưỡng tức thời.
  function initBentoScanInteractive() {
    const bentoScanBtn = document.getElementById("bentoScanBtn");
    const bentoLaserBar = document.getElementById("bentoLaserBar");
    const bentoScanTooltip = document.getElementById("bentoScanTooltip");

    if (!bentoScanBtn || !bentoLaserBar || !bentoScanTooltip) return;

    let isBentoScanning = false;

    bentoScanBtn.addEventListener("click", () => {
      if (isBentoScanning) return;
      isBentoScanning = true;

      // Ẩn tooltip cũ nếu có
      bentoScanTooltip.classList.add("hidden");

      // Cập nhật trạng thái nút bấm
      bentoScanBtn.classList.add("active");
      bentoScanBtn.querySelector("span").textContent = "Đang quét AI...";

      // Kích hoạt vệt laser quét phát sáng
      bentoLaserBar.classList.add("scanning");

      // Phát âm thanh quét tạch tạch cơ học nhẹ thông qua Web Audio API
      playHapticClick("click");
      setTimeout(() => playHapticClick("click"), 150);
      setTimeout(() => playHapticClick("click"), 300);
      setTimeout(() => playHapticClick("click"), 450);
      setTimeout(() => playHapticClick("click"), 600);
      setTimeout(() => playHapticClick("click"), 750);
      setTimeout(() => playHapticClick("click"), 900);
      setTimeout(() => playHapticClick("click"), 1050);
      setTimeout(() => playHapticClick("click"), 1200);

      // Sau 1.5 giây hoàn tất quét
      setTimeout(() => {
        isBentoScanning = false;
        bentoLaserBar.classList.remove("scanning");

        bentoScanBtn.classList.remove("active");
        bentoScanBtn.querySelector("span").textContent = "Thử quét AI";

        // Phát âm thanh thành công bíp cao tần nhẹ
        playHapticClick("pop");

        // Hiển thị tooltip kết quả
        bentoScanTooltip.classList.remove("hidden");

        // Tự động ẩn sau 6 giây
        setTimeout(() => {
          if (!isBentoScanning) {
            bentoScanTooltip.classList.add("hidden");
          }
        }, 6000);

      }, 1500);
    });
  }

  // --- B. BENTO CARD 6: STREAK SPARKLE FLAME & XP LEVEL UP 2026 ---
  // Lý do thiết kế: Khơi dậy niềm vui của người dùng (Gamification) thông qua các phản hồi xúc giác ảo
  // và hiệu ứng bùng ngọn lửa lấp lánh cực kỳ ấn tượng khi bấm chuỗi điểm danh.
  function initBentoStreakInteractive() {
    const bentoStreakBtn = document.getElementById("bentoStreakBtn");
    const bentoStreakFlame = document.getElementById("bentoStreakFlame");
    const bentoStreakVal = document.getElementById("bentoStreakVal");
    const bentoStreakLevel = document.getElementById("bentoStreakLevel");
    const bentoXPText = document.getElementById("bentoXPText");
    const bentoXPBar = document.getElementById("bentoXPBar");

    if (!bentoStreakBtn || !bentoStreakFlame || !bentoStreakVal || !bentoXPBar) return;

    // Phục hồi trạng thái nếu đã điểm danh trong phiên hiện tại
    const isClaimed = localStorage.getItem("bento_streak_claimed") === "true";
    if (isClaimed) {
      bentoStreakBtn.classList.add("claimed");
      bentoStreakBtn.querySelector("span").textContent = "Đã điểm danh ✔";
      bentoStreakFlame.classList.add("active");
      bentoStreakVal.textContent = "Chuỗi 6 ngày";
      if (bentoStreakLevel) bentoStreakLevel.textContent = "Cấp 12";
      if (bentoXPText) bentoXPText.textContent = "Tiến trình cấp: 1,350 / 1,500 XP";
      bentoXPBar.style.width = "90%";
    }

    bentoStreakBtn.addEventListener("click", () => {
      if (localStorage.getItem("bento_streak_claimed") === "true") return;

      // Lưu trạng thái tránh điểm danh lặp
      localStorage.setItem("bento_streak_claimed", "true");

      // Cập nhật trạng thái nút
      bentoStreakBtn.classList.add("claimed");
      bentoStreakBtn.querySelector("span").textContent = "Đã điểm danh ✔";

      // Kích hoạt ngọn lửa bùng cháy lấp lánh neon
      bentoStreakFlame.classList.add("active");

      // Phát âm thanh chúc mừng tưng bừng bằng Web Audio API
      playHapticClick("pop");
      setTimeout(() => playHapticClick("pop"), 180);

      // Tăng số ngày streak nhảy số mượt
      bentoStreakVal.style.transform = "scale(1.2)";
      bentoStreakVal.style.transition = "transform 0.3s ease";
      setTimeout(() => {
        bentoStreakVal.textContent = "Chuỗi 6 ngày";
        bentoStreakVal.style.transform = "scale(1)";
      }, 300);

      // Tăng điểm kinh nghiệm XP và co dãn thanh tiến trình cực mượt
      if (bentoXPText) {
        bentoXPText.textContent = "Tiến trình cấp: 1,350 / 1,500 XP";
      }
      bentoXPBar.style.transition = "width 1.2s cubic-bezier(0.25, 0.8, 0.25, 1)";
      bentoXPBar.style.width = "90%";
    });
  }

  // --- C. TDEE AI GOAL PLANNER GOAL TABS DEEP LOGIC 2026 ---
  // Lý do thiết kế: Biến máy tính TDEE tĩnh thành một bộ công cụ lập kế hoạch dinh dưỡng chủ động (AI Nutrient Planner),
  // cho phép tùy biến lượng Calories khuyên dùng và phân chia Macronutrients tự động theo mục tiêu thời gian thực.
  function initTdeeGoalTabsInteractive() {
    const goalTabs = document.querySelectorAll(".goal-tab-btn");
    const resultTdeeVal = document.getElementById("resultTdeeVal");
    const resultExplanation = document.getElementById("resultExplanation");
    const resProteinGrams = document.getElementById("resProteinGrams");
    const resProteinKcal = document.getElementById("resProteinKcal");
    const resCarbsGrams = document.getElementById("resCarbsGrams");
    const resCarbsKcal = document.getElementById("resCarbsKcal");
    const resFatGrams = document.getElementById("resFatGrams");
    const resFatKcal = document.getElementById("resFatKcal");

    if (!goalTabs.length || !resultTdeeVal) return;

    // Biến lưu giữ TDEE cơ sở (base TDEE) đã được tính từ form nhập liệu
    // Nếu chưa tính, chúng ta sẽ tạm đọc giá trị trên màn hình làm base
    let baseTdee = parseInt(resultTdeeVal.textContent) || 2000;

    // Theo dõi giá trị TDEE thay đổi từ slider gốc để cập nhật baseTdee thời gian thực
    const observer = new MutationObserver(() => {
      const activeTab = document.querySelector(".goal-tab-btn.active");
      const currentVal = parseInt(resultTdeeVal.textContent);

      // Chỉ cập nhật baseTdee khi giá trị này được sinh ra bởi sliders kéo, không phải do chuyển tab
      if (activeTab) {
        const goal = activeTab.getAttribute("data-goal");
        let offset = 0;
        if (goal === "cutting") offset = -500;
        if (goal === "bulking") offset = 300;

        // Tránh lặp vô hạn bằng cách kiểm tra
        const expectedVal = baseTdee + offset;
        if (currentVal !== expectedVal) {
          baseTdee = currentVal - offset;
        }
      }
    });

    observer.observe(resultTdeeVal, { childList: true, characterData: true, subtree: true });

    goalTabs.forEach(tab => {
      tab.addEventListener("click", () => {
        if (tab.classList.contains("active")) return;

        playHapticClick("click");

        // Gỡ active của các tab khác
        goalTabs.forEach(t => t.classList.remove("active"));
        tab.classList.add("active");

        const goal = tab.getAttribute("data-goal");
        let offset = 0;
        let explanationText = "";

        // Thiết lập offset calo và lời giải thích khoa học theo từng mục tiêu
        if (goal === "maintenance") {
          offset = 0;
          explanationText = "Mức calorie này giúp bạn duy trì cân nặng ổn định dựa trên thông số cơ thể và mức vận động hiện tại.";
        } else if (goal === "cutting") {
          offset = -500;
          explanationText = "Mức calorie thâm hụt khoa học này giúp bạn kích hoạt quá trình đốt mỡ thừa an toàn mà vẫn giữ nguyên khối lượng cơ bắp.";
        } else if (goal === "bulking") {
          offset = 300;
          explanationText = "Mức calorie thặng dư nhẹ này hỗ trợ tối ưu hóa quá trình tổng hợp Protein cơ bắp khi kết hợp luyện tập kháng lực.";
        }

        const targetCalories = Math.max(1200, baseTdee + offset); // Giới hạn tối thiểu 1200 calo an toàn sinh học

        // Chạy fluid animation tăng/giảm số Calo
        animateNumberChange(resultTdeeVal, parseInt(resultTdeeVal.textContent) || 0, targetCalories, 400);

        if (resultExplanation) {
          resultExplanation.textContent = explanationText;
        }

        // Tính toán lại Macros dựa trên chế độ ăn và Calo mục tiêu
        updateMacrosBasedOnGoal(goal, targetCalories);
      });
    });

    // Hàm phụ trợ chạy số nhảy mượt
    function animateNumberChange(element, start, end, duration) {
      const isInstant = new URLSearchParams(window.location.search).get('instant') === 'true';
      if (isInstant) {
        element.textContent = end;
        return;
      }
      if (start === end) return;
      const startTime = performance.now();

      function updateNumber(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeProgress = 1 - Math.pow(1 - progress, 3); // Ease Out Cubic
        const current = Math.round(start + (end - start) * easeProgress);

        element.textContent = current;

        if (progress < 1) {
          requestAnimationFrame(updateNumber);
        } else {
          element.textContent = end;
        }
      }
      requestAnimationFrame(updateNumber);
    }

    // Hàm tính toán và co dãn Macros mượt mà
    function updateMacrosBasedOnGoal(goal, calories) {
      let pPct = 0.30, cPct = 0.45, fPct = 0.25; // Mặc định Giữ cân

      if (goal === "cutting") {
        pPct = 0.40; cPct = 0.30; fPct = 0.30; // Nhiều đạm, ít carb giảm mỡ
      } else if (goal === "bulking") {
        pPct = 0.30; cPct = 0.50; fPct = 0.20; // Nhiều carb tăng năng lượng tập
      }

      // Đổi thành grams (Đạm/Carb = 4 kcal/g, Fat = 9 kcal/g)
      const pGrams = Math.round((calories * pPct) / 4);
      const cGrams = Math.round((calories * cPct) / 4);
      const fGrams = Math.round((calories * fPct) / 9);

      const pKcal = Math.round(calories * pPct);
      const cKcal = Math.round(calories * cPct);
      const fKcal = Math.round(calories * fPct);

      // Cập nhật các trường dữ liệu
      if (resProteinGrams) resProteinGrams.textContent = pGrams;
      if (resProteinKcal) resProteinKcal.textContent = `${pKcal} kcal`;
      if (resCarbsGrams) resCarbsGrams.textContent = cGrams;
      if (resCarbsKcal) resCarbsKcal.textContent = `${cKcal} kcal`;
      if (resCarbsKcal) resCarbsKcal.textContent = `${pKcal} kcal`;
      if (resCarbsKcal) resCarbsKcal.textContent = `${cKcal} kcal`;
      if (resFatGrams) resFatGrams.textContent = fGrams;
      if (resFatKcal) resFatKcal.textContent = `${fKcal} kcal`;

      // Cập nhật co dãn thanh đo hình quạt hoặc thanh tiến trình dinh dưỡng tương ứng
      const proteinFill = document.getElementById("resProteinBarFill");
      const carbsFill = document.getElementById("resCarbsBarFill");
      const fatFill = document.getElementById("resFatBarFill");

      if (proteinFill) {
        proteinFill.style.transition = "width 0.6s cubic-bezier(0.25, 0.8, 0.25, 1)";
        proteinFill.style.width = `${pPct * 100}%`;
      }
      if (carbsFill) {
        carbsFill.style.transition = "width 0.6s cubic-bezier(0.25, 0.8, 0.25, 1)";
        carbsFill.style.width = `${cPct * 100}%`;
      }
      if (fatFill) {
        fatFill.style.transition = "width 0.6s cubic-bezier(0.25, 0.8, 0.25, 1)";
        fatFill.style.width = `${fPct * 100}%`;
      }

      // Đổi gợi ý món ăn dinh dưỡng Việt phù hợp mục tiêu
      updateVietMealSuggestions(goal);
    }

    // Gợi ý thực phẩm Việt Nam lành mạnh tương ứng mục tiêu
    function updateVietMealSuggestions(goal) {
      const suggestWrapper = document.getElementById("tdeeFoodSuggestions");
      const titleEl = document.getElementById("macroSuggestionsTitle");
      const contentEl = document.getElementById("macroSuggestionsContent");
      if (!suggestWrapper) return;

      suggestWrapper.classList.remove("hidden");

      let title = "💡 Gợi ý thực phẩm Việt Nam lành mạnh";
      let htmlContent = "";

      if (goal === "maintenance") {
        title = "💡 Gợi ý thực phẩm Giữ Cân lành mạnh";
        htmlContent = `
          <ul style="list-style: none; padding: 0; margin: 8px 0 0 0; display: grid; gap: 8px;">
            <li style="background: rgba(15, 159, 104, 0.05); padding: 8px 12px; border-radius: 8px; border-left: 3px solid var(--brand-primary); font-size: 0.72rem;">
              <strong>Phở Bò Gầu Giòn (~540 kcal)</strong>: 32g Protein, 58g Carbs, 16g Fat. Ăn kèm nhiều giá đỗ trần giúp bổ sung vitamin và xơ.
            </li>
            <li style="background: rgba(15, 159, 104, 0.05); padding: 8px 12px; border-radius: 8px; border-left: 3px solid var(--brand-primary); font-size: 0.72rem;">
              <strong>Cơm Tấm Sườn Nướng (~625 kcal)</strong>: 36g Protein, 75g Carbs, 18g Fat. Chọn miếng sườn nướng mỏng ít mỡ đạm dồi dào.
            </li>
            <li style="background: rgba(15, 159, 104, 0.05); padding: 8px 12px; border-radius: 8px; border-left: 3px solid var(--brand-primary); font-size: 0.72rem;">
              <strong>Gỏi Cuốn Tôm Thịt Heo (~320 kcal)</strong>: 18g Protein, 42g Carbs, 8g Fat. Bữa phụ nhẹ nhàng, thanh mát giải nhiệt.
            </li>
          </ul>
        `;
      } else if (goal === "cutting") {
        title = "⚡ Gợi ý thực phẩm Giảm Mỡ tối ưu";
        htmlContent = `
          <ul style="list-style: none; padding: 0; margin: 8px 0 0 0; display: grid; gap: 8px;">
            <li style="background: rgba(0, 242, 254, 0.05); padding: 8px 12px; border-radius: 8px; border-left: 3px solid #00F2FE; font-size: 0.72rem;">
              <strong>Salad Ức Gà Thảo Mộc (~380 kcal)</strong>: 42g Protein, 18g Carbs, 12g Fat. Giàu đạm sinh học cao giúp no lâu bảo vệ cơ bắp.
            </li>
            <li style="background: rgba(0, 242, 254, 0.05); padding: 8px 12px; border-radius: 8px; border-left: 3px solid #00F2FE; font-size: 0.72rem;">
              <strong>Cá Quả Hấp Hành Thì Là (~310 kcal)</strong>: 34g Protein, 8g Carbs, 14g Fat. Nguồn đạm trắng tinh khiết, ít béo cực lành mạnh.
            </li>
            <li style="background: rgba(0, 242, 254, 0.05); padding: 8px 12px; border-radius: 8px; border-left: 3px solid #00F2FE; font-size: 0.72rem;">
              <strong>Trứng Cuộn Bông Cải Xanh (~280 kcal)</strong>: 22g Protein, 8g Carbs, 16g Fat. Bữa sáng mỏng nhẹ, ít calo và dồi dào choline.
            </li>
          </ul>
        `;
      } else if (goal === "bulking") {
        title = "💪 Gợi ý thực phẩm Tăng Cơ dồi dào";
        htmlContent = `
          <ul style="list-style: none; padding: 0; margin: 8px 0 0 0; display: grid; gap: 8px;">
            <li style="background: rgba(255, 115, 0, 0.05); padding: 8px 12px; border-radius: 8px; border-left: 3px solid #FF7300; font-size: 0.72rem;">
              <strong>Cơm Tấm Sườn Trứng Ốp La (~780 kcal)</strong>: 48g Protein, 90g Carbs, 24g Fat. Thêm trứng ốp la cung cấp nhiều năng lượng phát triển cơ.
            </li>
            <li style="background: rgba(255, 115, 0, 0.05); padding: 8px 12px; border-radius: 8px; border-left: 3px solid #FF7300; font-size: 0.72rem;">
              <strong>Bò Né Bánh Mì Đặc Biệt (~820 kcal)</strong>: 54g Protein, 85g Carbs, 28g Fat. Nguồn Creatine và kẽm lý tưởng để tăng sức mạnh tập nặng.
            </li>
            <li style="background: rgba(255, 115, 0, 0.05); padding: 8px 12px; border-radius: 8px; border-left: 3px solid #FF7300; font-size: 0.72rem;">
              <strong>Bún Bò Giò Heo Đặc Biệt (~690 kcal)</strong>: 38g Protein, 82g Carbs, 22g Fat. Đầy đủ collagen và calories thúc đẩy phục hồi xương khớp.
            </li>
          </ul>
        `;
      }

      if (titleEl) titleEl.innerHTML = title;
      if (contentEl) contentEl.innerHTML = htmlContent;
    }
  }

  // --- D. SPATIAL MAGNETIC INTERACTION LOGIC ---
  // Đã được loại bỏ hoàn toàn khỏi JS để tối ưu hóa CPU render, thay bằng CSS transition scale(1.02) khi hover.

  // ==========================================================================
  // NÂNG CẤP ĐỘT PHÁ TỐI ƯU UI/UX ĐỢT 3 - XU HƯỚNG TƯƠNG TÁC CỰC HẠN 2026
  // ==========================================================================

  // --- 1. BENTO SPOTLIGHT DYNAMIC MOUSE GLOW ---
  // Đã thay thế bằng hover CSS tĩnh để tối ưu hóa tài nguyên render CPU 100% mượt mà.

  // --- 2. INTERACTIVE SVG MACROS RINGS & TOOLTIPS ---
  // Lý do thiết kế: Tạo phản hồi vi mô (micro-interaction) trực quan. Thay vì biểu đồ tĩnh,
  // khi di chuột vào từng vòng tròn sẽ zoom và hiển thị tooltip thông tin chi tiết.
  function initBentoMacrosInteractive() {
    try {
      const ringGroups = document.querySelectorAll(".macro-ring-group");
      const tooltip = document.getElementById("bentoMacroTooltip");
      const container = document.querySelector(".bento-macros-layout");

      if (!ringGroups.length || !tooltip || !container) return;

      const macroData = {
        protein: { label: "Đạm (Protein)", val: "120g / 150g", percent: "80%", emoji: "🍗" },
        carbs: { label: "Tinh bột (Carbs)", val: "180g / 220g", percent: "81%", emoji: "🍚" },
        fat: { label: "Chất béo (Fat)", val: "45g / 60g", percent: "75%", emoji: "🥑" }
      };

      ringGroups.forEach(group => {
        const macroKey = group.getAttribute("data-macro");
        const data = macroData[macroKey];
        if (!data) return;

        group.addEventListener("mouseenter", () => {
          tooltip.innerHTML = `<strong>${data.label}</strong>: ${data.val} (${data.percent}) ${data.emoji}`;
          tooltip.classList.add("show");
          // Định vị tĩnh ở tâm phía trên của SVG vòng tròn
          tooltip.style.left = "50%";
          tooltip.style.top = "-10px";
          playHapticClick("pop"); // Phát âm thanh cơ học nhẹ khi chạm vòng
        });

        group.addEventListener("mouseleave", () => {
          tooltip.classList.remove("show");
        });
      });
    } catch (err) {
      console.error("Lỗi khởi tạo Bento Macros Tooltips:", err);
    }
  }

  // --- 3. SMART FLOATING SLIDER THUMB TOOLTIPS (TDEE SLIDERS) ---
  // Lý do thiết kế: Giúp người dùng quan sát chỉ số kéo của thanh trượt ngay tại vị trí ngón tay/chuột,
  // triệt tiêu sự phân tâm khi phải đảo mắt nhìn sang các nhãn số bên ngoài.
  function initTdeeSlidersTooltipInteractive() {
    try {
      const sliders = document.querySelectorAll(".tdee-sliders-container input[type='range']");

      sliders.forEach(slider => {
        if (!slider) return;

        const container = slider.closest(".range-input-container");
        if (!container) return;

        // Đảm bảo có tooltip container
        let tooltip = container.querySelector(".tdee-slider-tooltip");
        if (!tooltip) {
          tooltip = document.createElement("div");
          tooltip.className = "tdee-slider-tooltip";
          container.appendChild(tooltip);
        }

        const unit = slider.getAttribute("data-unit") || "";

        function updateTooltipPos() {
          const min = parseFloat(slider.min) || 0;
          const max = parseFloat(slider.max) || 100;
          const val = parseFloat(slider.value) || 0;
          const percent = ((val - min) / (max - min)) * 100;

          // Tính toán bù trừ lệch trục động theo kích thước núm kéo
          // Trên desktop núm kéo rộng 18px, trên mobile là 14px
          const isMobile = window.innerWidth <= 576;
          const thumbWidth = isMobile ? 14 : 18;
          const halfThumb = thumbWidth / 2;

          tooltip.style.left = `calc(${percent}% + (${halfThumb - percent * (thumbWidth / 100)}px))`;
          tooltip.textContent = `${val} ${unit}`;
        }

        // Cập nhật vị trí lúc khởi tạo
        updateTooltipPos();

        // Lắng nghe sự kiện để hiện/ẩn & cập nhật số thời gian thực
        slider.addEventListener("input", () => {
          updateTooltipPos();
          tooltip.classList.add("show");
        });

        slider.addEventListener("mousedown", () => {
          tooltip.classList.add("show");
        });

        slider.addEventListener("touchstart", () => {
          tooltip.classList.add("show");
        }, { passive: true });

        // Tự động mờ dần khi nhả chuột/tay hoặc chuột rời khỏi slider
        const hideTooltip = () => {
          setTimeout(() => {
            // Chỉ ẩn nếu không phải đang kéo (active)
            if (document.activeElement !== slider) {
              tooltip.classList.remove("show");
            }
          }, 300);
        };

        slider.addEventListener("mouseup", hideTooltip);
        slider.addEventListener("touchend", hideTooltip);
        slider.addEventListener("mouseleave", hideTooltip);
        slider.addEventListener("blur", () => {
          tooltip.classList.remove("show");
        });
      });
    } catch (err) {
      console.error("Lỗi khởi tạo TDEE Sliders Tooltip:", err);
    }
  }

  // --- 4. TDEE TARGET COPY CTA VỚI WEB AUDIO HAPTIC & TOAST ---
  // Lý do thiết kế: Cung cấp nút sao chép cực kỳ tiện lợi để người dùng lưu lại kết quả calo
  // và chế độ dinh dưỡng cá nhân hóa của mình, đi kèm âm thanh phản hồi haptic & Toast bay mượt mà.
  function initTdeeCopyInteractive() {
    try {
      const copyBtn = document.getElementById("tdeeCopyBtn");
      const toast = document.getElementById("tdeeCopyToast");

      if (!copyBtn) return;

      // Đảm bảo toast tồn tại trong body, nếu chưa có thì tự sinh
      if (!toast) {
        const newToast = document.createElement("div");
        newToast.id = "tdeeCopyToast";
        newToast.className = "tdee-copy-toast";
        newToast.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--brand-primary)" stroke-width="3" style="flex-shrink:0;"><polyline points="20 6 9 17 4 12"/></svg><span>Sao chép thành công! ✔</span>`;
        document.body.appendChild(newToast);
      }

      copyBtn.addEventListener("click", () => {
        // Thu thập thông tin dinh dưỡng TDEE thực tế trên màn hình để sao chép chuyên nghiệp
        const tdeeVal = document.getElementById("resultTdeeVal")?.textContent || "1800";
        const age = document.getElementById("tdee-age")?.value || "25";
        const height = document.getElementById("tdee-height")?.value || "170";
        const weight = document.getElementById("tdee-weight")?.value || "65";

        const activeTab = document.querySelector(".goal-tab-btn.active");
        const goalLabel = activeTab ? activeTab.querySelector("span")?.textContent : "Giữ cân";

        const pGrams = document.getElementById("resProteinGrams")?.textContent || "120";
        const cGrams = document.getElementById("resCarbsGrams")?.textContent || "180";
        const fGrams = document.getElementById("resFatGrams")?.textContent || "45";

        const copyText = `📊 BÁO CÁO THỂ TRẠNG & DINH DƯỠNG EATFIT AI 📊
------------------------------------------
• Thông số cơ thể: Tuổi ${age} | Cao ${height}cm | Nặng ${weight}kg
• Mục tiêu lựa chọn: ${goalLabel}
• Năng lượng tiêu thụ mục tiêu: ${tdeeVal} kcal / ngày
• Phân bổ dinh dưỡng đa lượng tối ưu (Macros):
  - 🍗 Chất đạm (Protein): ${pGrams}g
  - 🍚 Tinh bột (Carbs): ${cGrams}g
  - 🥑 Chất béo (Fat): ${fGrams}g

💡 Lời khuyên thiết thực từ AI: Hãy ưu tiên thực phẩm tươi sạch nguyên bản Việt Nam và theo dõi cân nặng hàng tuần để EatFit AI hiệu chỉnh kế hoạch thích ứng nhé!
------------------------------------------
Tải ứng dụng tại: https://eatfitai-vn.pages.dev`;

        navigator.clipboard.writeText(copyText).then(() => {
          // Phát âm thanh Pop cơ học cao cấp
          playHapticClick("pop");

          // Hiển thị toast neon bay lên mờ dần
          const toastEl = document.getElementById("tdeeCopyToast");
          if (toastEl) {
            toastEl.classList.add("show");
            setTimeout(() => {
              toastEl.classList.remove("show");
            }, 2000);
          }
        }).catch(err => {
          console.error("Không thể sao chép văn bản vào clipboard:", err);
        });
      });
    } catch (err) {
      console.error("Lỗi khởi tạo TDEE Copy Interaction:", err);
    }
  }

  // --- 5. BENTO CARD 7 INTERACTIVE MEAL CAROUSEL (MÓN VIỆT) ---
  // Lý do thiết kế: Cung cấp một bộ dữ liệu phong phú các món Việt lành mạnh có sẵn hình ảnh thực tế,
  // xoay vòng mượt mà bằng hiệu ứng Slide-Fade 2026, chứng minh trí tuệ gợi ý món ăn của EatFit AI.
  function initBentoRecipeCarouselInteractive() {
    try {
      const cycleBtn = document.getElementById("bentoRecipeCycleBtn");
      const recipeCard = document.querySelector("#bentoCardRecipe .recipe-card-mini");

      if (!cycleBtn || !recipeCard) return;

      // Danh sách các món ăn Việt Nam lành mạnh tương ứng với các ảnh chất lượng cao có sẵn trong assets
      const vietRecipes = [
        {
          name: "Cơm Tấm Sườn Lành Mạnh",
          time: "25 phút",
          calories: "520 kcal",
          img: "./assets/comtam-dish.png",
          ingredients: [
            { text: "Gạo lứt tấm (120g)", checked: true },
            { text: "Sườn heo nạc (100g)", checked: true },
            { text: "Dưa góp chua ngọt", checked: false }
          ]
        },
        {
          name: "Phở Bò Chín Ít Béo",
          time: "20 phút",
          calories: "480 kcal",
          img: "./assets/pho-bowl.jpg",
          ingredients: [
            { text: "Bánh phở lứt (100g)", checked: true },
            { text: "Thịt bò chín nạc (80g)", checked: true },
            { text: "Hành lá & Rau thơm", checked: false }
          ]
        },
        {
          name: "Bún Bò Huế Ăn Kiêng",
          time: "35 phút",
          calories: "540 kcal",
          img: "./assets/bunbo-bowl.png",
          ingredients: [
            { text: "Bún gạo lứt tươi (120g)", checked: true },
            { text: "Nạm bò sạch nạc (90g)", checked: true },
            { text: "Rau chuối, giá đỗ trần", checked: false }
          ]
        },
        {
          name: "Bánh Mì Kẹp Lành Mạnh",
          time: "12 phút",
          calories: "390 kcal",
          img: "./assets/banhmi-sandwich.png",
          ingredients: [
            { text: "Bánh mì nguyên cám", checked: true },
            { text: "Ức gà xé phay (80g)", checked: true },
            { text: "Dưa chuột, ngò, sốt bơ", checked: false }
          ]
        }
      ];

      let currentIndex = 0;
      let isTransitioning = false;

      cycleBtn.addEventListener("click", () => {
        if (isTransitioning) return;
        isTransitioning = true;

        // Phát âm thanh Click phản hồi cơ học
        playHapticClick("click");

        // Xoay vòng chỉ mục món ăn
        currentIndex = (currentIndex + 1) % vietRecipes.length;
        const nextRecipe = vietRecipes[currentIndex];

        // 1. Áp dụng hiệu ứng mờ dần & trượt ra (.slide-fade-out)
        recipeCard.classList.add("slide-fade-out");

        // 2. Chờ hiệu ứng trượt ra hoàn thành (250ms), thay thế nội dung dữ liệu rồi trượt vào
        setTimeout(() => {
          // Thay đổi ảnh món ăn
          const imgEl = recipeCard.querySelector(".recipe-img-placeholder");
          if (imgEl) {
            imgEl.style.backgroundImage = `url('${nextRecipe.img}')`;
          }

          // Thay đổi tên món ăn
          const nameEl = recipeCard.querySelector("h4");
          if (nameEl) {
            nameEl.innerHTML = `<svg class="recipe-icon-svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><path d="M12 2v2M12 20v2M2 12h202M20 12h2"/></svg> ${nextRecipe.name}`;
          }

          // Thay đổi thời gian & calo
          const metaEl = recipeCard.querySelector(".recipe-meta");
          if (metaEl) {
            metaEl.innerHTML = `
              <svg class="recipe-icon-svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              ${nextRecipe.time}
              &bull;
              <svg class="recipe-icon-svg flame-color" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>
              ${nextRecipe.calories}
            `;
          }

          // Thay đổi các nguyên liệu nấu ăn
          const ingEl = recipeCard.querySelector(".recipe-ingredients");
          if (ingEl) {
            ingEl.innerHTML = nextRecipe.ingredients.map(ing => `
              <label class="ing-check">
                <input type="checkbox" ${ing.checked ? "checked" : ""} disabled />
                <span>${ing.text}</span>
              </label>
            `).join("");
          }

          // Hủy bỏ class trượt ra, kích hoạt trượt vào (.slide-fade-in)
          recipeCard.classList.remove("slide-fade-out");
          recipeCard.classList.add("slide-fade-in");

          // Xoá class trượt vào sau khi hoàn thành animation
          setTimeout(() => {
            recipeCard.classList.remove("slide-fade-in");
            isTransitioning = false;
          }, 250);

        }, 250);
      });
    } catch (err) {
      console.error("Lỗi khởi tạo AI Recipe Suggestions Carousel:", err);
    }
  }

  // --- 6. DYNAMIC WATER GAS BUBBLES INTERACTIVE ---
  // Lý do thiết kế: Tạo cảm giác bọt khí ga sủi tăm ngẫu nhiên trồi lên sinh động
  // khi nhấn nút uống thêm nước ảo ở Card 5, gia tăng cảm xúc hài lòng khi ghi chép.
  function initWaterBubblesInteractive() {
    // Khai báo hàm toàn cục trong IIFE để listener nút +250ml phía trên có thể gọi trực tiếp
    window.spawnBubbles = function() {
      try {
        const bubblesContainer = document.querySelector(".water-bubbles");
        if (!bubblesContainer) return;

        // Sinh 6 bọt khí ga nhỏ lung linh trồi lên ngẫu nhiên
        for (let i = 0; i < 6; i++) {
          setTimeout(() => {
            const bubble = document.createElement("span");
            bubble.className = "bubble-sparkle";

            // Tọa độ xuất phát ngang ngẫu nhiên
            bubble.style.left = `${Math.random() * 100}%`;

            // Thời gian bay ngẫu nhiên 1.3s - 1.9s giúp phân tán tự nhiên
            bubble.style.setProperty("--duration", `${1.3 + Math.random() * 0.6}s`);

            // Biên độ lắc ngang ngẫu nhiên
            bubble.style.setProperty("--drift", `${(Math.random() - 0.5) * 35}px`);

            bubblesContainer.appendChild(bubble);

            // Tự động dọn dẹp bọt khí khỏi DOM sau khi bay xong để giải phóng bộ nhớ
            setTimeout(() => {
              bubble.remove();
            }, 2000);
          }, i * 140);
        }
      } catch (err) {
        console.error("Lỗi sủi bọt khí ga nước uống:", err);
      }
    };
  }

  // Init
  document.addEventListener("DOMContentLoaded", () => {
    hydratePage();
    handleNavigation(); // Initial routing on load
  });

})();
