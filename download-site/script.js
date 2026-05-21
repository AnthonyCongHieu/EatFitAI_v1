(function () {
  "use strict";

  // Existing release contract data
  const RELEASE = {
    appName: "EatFitAI",
    version: "1.0.0",
    packageName: "com.eatfitai.app",
    releaseTag: "android-v1.0.0",
    fileName: "EatFitAI-android-v1.0.0.apk",
    fileSize: "153.13 MiB",
    sha256: "9644b4725aab595a2e46de9d6fb7bd96b503646f399c5314bd7f48d8febe35d5",
    downloadUrl:
      "https://github.com/anthonyconghieu/EatFitAI_v1/releases/download/android-v1.0.0/EatFitAI-android-v1.0.0.apk",
    releaseUrl: "",
    repositoryUrl: "",
  };

  const SHA256_PATTERN = /^[a-f0-9]{64}$/i;
  const isChecksumReady = SHA256_PATTERN.test(RELEASE.sha256);

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

  function switchPage(pageId) {
    if (!pageMap[pageId] || isPageTransitioning) return;

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
      updateActiveNavLinks(pageId);
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
      window.scrollTo({ top: 0, behavior: "instant" });

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
      widgetText.textContent = config.text;
      
      // Auto-open widget bubble with a nice delay so it transitions smoothly after page renders
      setTimeout(() => {
        widgetBubble.classList.add("active");
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

  // Handle local food photo upload
  const simUploadInput = document.getElementById("simUploadInput");
  if (simUploadInput) {
    simUploadInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        if (simFoodPhoto) {
          simFoodPhoto.src = event.target.result;
        }

        // Deselect active preset grid button
        foodButtons.forEach((b) => b.classList.remove("active"));

        // Generate clean simulated results for custom image
        const randomKcal = Math.floor(Math.random() * (680 - 450 + 1)) + 450;
        const randomProtein = Math.floor(Math.random() * (32 - 18 + 1)) + 18;
        const randomCarbs = Math.floor(Math.random() * (75 - 45 + 1)) + 45;
        const randomFat = Math.floor(Math.random() * (22 - 12 + 1)) + 12;

        const customData = {
          dishName: file.name.substring(0, 20) || "Món ăn tự chọn",
          weight: "Khẩu phần ước tính (~420g)",
          calories: randomKcal,
          protein: randomProtein,
          carbs: randomCarbs,
          fat: randomFat,
          confidence: "88% Tự Tin",
          advice: "Hệ thống đã nhận diện được cấu trúc món ăn tự chọn của bạn. Bữa ăn chứa lượng calories vừa phải, lượng đạm ở mức tốt. Bạn có thể lưu nhật ký món ăn này trực tiếp vào ứng dụng để tích lũy tiến độ mỗi ngày.",
          boxes: [
            { label: "Món ăn chính (91%)", t: 30, l: 20, w: 60, h: 50 },
            { label: "Gia vị & Rau thơm", t: 55, l: 35, w: 30, h: 20 }
          ]
        };

        triggerARScan(customData);
      };
      reader.readAsDataURL(file);
    });
  }

  // 3. TDEE & Target Nutrient Calculator
  const tdeeSubmitBtn = document.getElementById("calcSubmitBtn");
  const resultsPlaceholder = document.getElementById("resultsPlaceholder");
  const resultsContent = document.getElementById("resultsContent");

  const resultTdeeVal = document.getElementById("resultTdeeVal");
  const resultExplanation = document.getElementById("resultExplanation");
  const resProteinGrams = document.getElementById("resProteinGrams");
  const resProteinKcal = document.getElementById("resProteinKcal");
  const resCarbsGrams = document.getElementById("resCarbsGrams");
  const resCarbsKcal = document.getElementById("resCarbsKcal");
  const resFatGrams = document.getElementById("resFatGrams");
  const resFatKcal = document.getElementById("resFatKcal");

  if (tdeeSubmitBtn) {
    tdeeSubmitBtn.addEventListener("click", () => {
      // Inputs
      const age = parseInt(document.getElementById("calcAge").value);
      const height = parseInt(document.getElementById("calcHeight").value);
      const weight = parseInt(document.getElementById("calcWeight").value);
      const activity = parseFloat(document.getElementById("calcActivity").value);
      const goal = document.getElementById("calcGoal").value;
      const isMale = document.getElementById("genderMale").checked;

      if (!age || !height || !weight) return;

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

      // Animate TDEE Target
      animateValue(resultTdeeVal, 0, targetKcal, 800);
      if (resultExplanation) resultExplanation.textContent = goalText;

      // Animate Macro breakdowns
      animateValue(resProteinGrams, 0, proteinG, 800);
      animateValue(resCarbsGrams, 0, carbsG, 800);
      animateValue(resFatGrams, 0, fatG, 800);

      if (resProteinKcal) resProteinKcal.textContent = `${proteinK} kcal`;
      if (resCarbsKcal) resCarbsKcal.textContent = `${carbsK} kcal`;
      if (resFatKcal) resFatKcal.textContent = `${fatK} kcal`;

      // Update MoChi dynamic advice & avatar based on weight goals
      const tdeeAdviceText = document.getElementById("tdeeAdviceText");
      const tdeeMochiAvatar = document.getElementById("tdeeMochiAvatar");
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
    });
  }

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
        showcaseTooltip.textContent = "Di chuột qua các điểm nhấp nháy để khám phá";
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
        showcaseTooltip.textContent = "Di chuột qua các điểm nhấp nháy để khám phá";
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
          mochiWidgetText.textContent = randomTip;
          
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
        });
      }
    }
  }

  // Hydrate static details on loading
  function hydratePage() {
    document.title = `Tải ${RELEASE.appName} cho Android — Ứng dụng dinh dưỡng Việt`;
    
    setText("[data-version]", RELEASE.version);
    setText("[data-package-name]", RELEASE.packageName);
    setText("[data-release-tag]", RELEASE.releaseTag);
    setText("[data-file-name]", RELEASE.fileName);
    setText("[data-file-size]", RELEASE.fileSize);
    setText("[data-download-url]", RELEASE.downloadUrl);
    setText("[data-sha256]", RELEASE.sha256);
    
    setHref("[data-download-link]", RELEASE.downloadUrl);
    if (RELEASE.releaseUrl) {
      setHref("[data-release-link]", RELEASE.releaseUrl);
    } else {
      document.querySelectorAll("[data-release-link]").forEach((el) => {
        el.style.display = "none";
      });
    }
    if (RELEASE.repositoryUrl) {
      setHref("[data-repo-link]", RELEASE.repositoryUrl);
    } else {
      document.querySelectorAll("[data-repo-link]").forEach((el) => {
        el.style.display = "none";
      });
    }
    
    setQrImage();
    updateReleaseState();
    fetchDownloadCount();
    wireCopyButtons();

    // Setup interactive MoChi elements
    setupMochiInteractivity();
    
  }

  // Init
  document.addEventListener("DOMContentLoaded", () => {
    hydratePage();
    handleNavigation(); // Initial routing on load
  });

})();
