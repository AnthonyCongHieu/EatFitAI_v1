(function () {
  "use strict";

  const RELEASE = {
    appName: "EatFitAI",
    version: "1.0.0",
    packageName: "com.eatfitai.app",
    releaseTag: "android-v1.0.0",
    fileName: "EatFitAI-android-v1.0.0.apk",
    fileSize: "124.90 MiB",
    sha256: "aec55be7ec2756eb615136fd1f2eb95be80e94bcb5476a56023cfddc1c6eca6e",
    downloadUrl:
      "https://github.com/AnthonyCongHieu/EatFitAI_v1/releases/download/android-v1.0.0/EatFitAI-android-v1.0.0.apk",
    releaseUrl: "https://github.com/AnthonyCongHieu/EatFitAI_v1/releases/tag/android-v1.0.0",
    repositoryUrl: "https://github.com/AnthonyCongHieu/EatFitAI_v1",
  };

  const SHA256_PATTERN = /^[a-f0-9]{64}$/i;
  const isChecksumReady = SHA256_PATTERN.test(RELEASE.sha256);

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

  function setQrImage() {
    const image = document.querySelector("[data-qr-image]");
    if (!image) {
      return;
    }

    const qrUrl = new URL("https://api.qrserver.com/v1/create-qr-code/");
    qrUrl.searchParams.set("size", "220x220");
    qrUrl.searchParams.set("format", "svg");
    qrUrl.searchParams.set("margin", "14");
    qrUrl.searchParams.set("data", RELEASE.downloadUrl);

    image.src = qrUrl.toString();
  }

  function updateReleaseState() {
    document.body.dataset.releaseReady = String(isChecksumReady);
    const status = isChecksumReady ? "Sẵn sàng tải xuống" : "Chờ upload APK và checksum";
    setText("[data-release-status]", status);

    const checksumButtons = document.querySelectorAll('[data-copy="sha256"]');
    checksumButtons.forEach((button) => {
      button.disabled = !isChecksumReady;
      button.title = isChecksumReady ? "" : "Cập nhật checksum sau khi có APK chính thức";
    });
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
    if (!value) {
      return false;
    }

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
    const feedback = document.querySelector("[data-copy-feedback]");

    document.querySelectorAll("[data-copy]").forEach((button) => {
      button.addEventListener("click", async () => {
        const value = getCopyValue(button.dataset.copy);
        const ok = await copyText(value).catch(() => false);

        if (feedback) {
          feedback.textContent = ok
            ? "Đã sao chép vào clipboard."
            : "Chưa thể sao chép. Hãy copy trực tiếp nội dung đang hiển thị.";
        }
      });
    });
  }

  function hydratePage() {
    document.title = `Tải ${RELEASE.appName} cho Android`;
    setText("[data-version]", RELEASE.version);
    setText("[data-package-name]", RELEASE.packageName);
    setText("[data-release-tag]", RELEASE.releaseTag);
    setText("[data-file-name]", RELEASE.fileName);
    setText("[data-file-size]", RELEASE.fileSize);
    setText("[data-download-url]", RELEASE.downloadUrl);
    setText("[data-sha256]", RELEASE.sha256);
    setHref("[data-download-link]", RELEASE.downloadUrl);
    setHref("[data-release-link]", RELEASE.releaseUrl);
    setHref("[data-repo-link]", RELEASE.repositoryUrl);
    setQrImage();
    updateReleaseState();
    wireCopyButtons();
  }

  hydratePage();
})();
